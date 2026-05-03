import { Database } from '../data/Database';
import { GAME_CONFIG, FLOOR_CONFIG, WEAPON_TEMPLATES } from '../config/constants';
import { DungeonGenerator } from './dungeon/DungeonGenerator';
import { Combat } from './combat/Combat';
import { Vec2 } from '../utils/Vec2';
import type { PlayerState, EnemyState, BulletState, GameState, HealWaveState, BossEvent, ItemState, DungeonData } from '../../shared/types';
import { ENEMY_BASE_HP, ENEMY_BASE_ATTACK, ENEMY_RADIUS, CLASS_SPEED } from '../../shared/constants';
import { EnemyAI, type EnemyAIDeps } from './enemy/EnemyAI';

export type { PlayerState, EnemyState, BulletState, GameState, HealWaveState, BossEvent, ItemState, DungeonData };

export class GameRoom {
  private roomId: string;
  private db: Database;
  private players: Map<string, PlayerState> = new Map();
  private enemies: Map<string, EnemyState> = new Map();
  private bullets: Map<string, BulletState> = new Map();
  private healWaves: HealWaveState[] = [];
  private bossEvents: BossEvent[] = [];
  private items: { id: string; x: number; y: number; type: string }[] = [];
  private dungeonGenerator: DungeonGenerator;
  private combat: Combat;
  private enemyAI: EnemyAI;
  private currentDungeon: DungeonData | null = null;
  private _gameOver: boolean = false;
  private _victory: boolean = false;
  private _floorChanged: boolean = false;
  private collisionGrid: boolean[][] = [];  // true = walkable

  private currentFloor: number = 1;
  // Use timestamp for game session — guarantees uniqueness even across server restarts
  private gameSession: number = Date.now();
  private tick: number = 0;
  private tickInterval: NodeJS.Timeout | null = null;
  private running: boolean = false;
  private floorSeeds: number[] = [];

  constructor(roomId: string, db: Database) {
    this.roomId = roomId;
    this.db = db;
    this.dungeonGenerator = new DungeonGenerator();
    this.combat = new Combat(this);
    this.enemyAI = new EnemyAI(this);
  }

  addPlayer(accountId: string, name: string, charData: { hp: number; hp_max: number; energy: number; energy_max: number; attack: number; defense: number; speed: number; weapon: string; character_type: string; skills: string }): void {
    const player: PlayerState = {
      id: accountId,
      accountId,
      name,
      x: 0,
      y: 0,
      dx: 0,
      dy: 0,
      hp: charData.hp || 100,
      hpMax: charData.hp_max || 100,
      energy: charData.energy || 50,
      energyMax: charData.energy_max || 50,
      attack: charData.attack || 10,
      defense: charData.defense || 5,
      speed: charData.speed || 5.0,  // DB值，仅用于参考
      speedBuff: 1.0,
      speedBuffTimer: 0,
      weapon: charData.weapon || 'pistol',
      characterType: charData.character_type || 'warrior',
      skills: (() => {
        const parsed: string[] = JSON.parse(charData.skills || '["dash","shield"]');
        // 旧角色只有2技能，补齐为4技能
        if (parsed.length < 4) return ['dash', 'shield', 'heal', 'speed_boost'];
        return parsed;
      })(),
      alive: true,
      invincible: 0,
      angle: 0,
      gold: 0,
      keys: 0
    };
    this.players.set(accountId, player);
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
  }

  start(): void {
    if (this.running) return;
    this.running = true;

    // Generate seeds for all floors
    for (let i = 0; i < GAME_CONFIG.FLOOR_COUNT; i++) {
      this.floorSeeds.push(Math.floor(Math.random() * 0x7fffffff));
    }

    this.startFloor(1);

    // Start game loop
    let lastTime = performance.now();
    const tickMs = 1000 / GAME_CONFIG.TICK_RATE;

    this.tickInterval = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000; // Convert to seconds
      lastTime = now;
      this.tick++;
      this.update(dt); // Actually call update!
    }, tickMs);
  }

  private startFloor(floor: number): void {
    this.currentFloor = floor;
    this.enemies.clear();
    this.bullets.clear();
    this.healWaves = [];
    this.bossEvents = [];
    this.items = [];

    const seed = this.floorSeeds[floor - 1];
    const dungeon = this.dungeonGenerator.generate(floor, seed);
    this.currentDungeon = dungeon;
    this.collisionGrid = dungeon.collisionGrid || [];
    const config = FLOOR_CONFIG[floor];

    // Place players at spawn
    const spawn = dungeon.spawnPoint;
    let i = 0;
    for (const player of this.players.values()) {
      player.x = spawn.x + (i * 30);
      player.y = spawn.y;
      player.hp = player.hpMax;
      player.energy = player.energyMax;
      player.alive = true;
      i++;
    }

    // Spawn enemies
    for (const spawnData of dungeon.enemies) {
      for (let j = 0; j < spawnData.count; j++) {
        const enemy = this.createEnemy(spawnData.type, spawnData.x, spawnData.y, floor);
        this.enemies.set(enemy.id, enemy);
      }
    }

    // Spawn items
    for (const item of dungeon.items) {
      this.items.push(item);
    }
  }

  private createEnemy(type: string, x: number, y: number, floor: number = 1): EnemyState {
    const id = `enemy_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const baseHp = ENEMY_BASE_HP[type] || 30;

    // Boss: fixed HP (no floor scaling), ATK scales with floor
    let scaledHp: number;
    let scaledAttack: number;
    let isElite = false;

    if (type === 'boss') {
      scaledHp = 800;
      const floorAtkMultiplier = 1 + (floor - 1) * 0.1;
      scaledAttack = Math.round((ENEMY_BASE_ATTACK[type] || 25) * floorAtkMultiplier);
    } else {
      const floorMultiplier = 1 + (floor - 1) * 0.15;
      const floorAtkMultiplier = 1 + (floor - 1) * 0.1;
      scaledHp = Math.round(baseHp * floorMultiplier);
      scaledAttack = Math.round((ENEMY_BASE_ATTACK[type] || 10) * floorAtkMultiplier);

      // Elite chance
      const eliteChance = FLOOR_CONFIG[floor]?.eliteChance || 0;
      if (Math.random() < eliteChance) {
        isElite = true;
        scaledHp *= 2;
        scaledAttack = Math.round(scaledAttack * 1.5);
      }
    }

    // Random offset, then verify position is walkable
    let spawnX = x + Math.random() * 40 - 20;
    let spawnY = y + Math.random() * 40 - 20;
    if (!this.isWalkable(spawnX, spawnY)) {
      // Fallback to original position (room center)
      spawnX = x;
      spawnY = y;
    }

    return {
      id,
      type,
      x: spawnX,
      y: spawnY,
      hp: scaledHp,
      hpMax: scaledHp,
      attack: scaledAttack,
      alive: true,
      state: 'idle',
      isElite: isElite || undefined,
      bossPhase: type === 'boss' ? 1 : undefined,
      bossRangedTimer: type === 'boss' ? 0 : undefined,
      bossAoETimer: type === 'boss' ? 0 : undefined,
      bossCasting: type === 'boss' ? null : undefined,
      bossCastTimer: type === 'boss' ? 0 : undefined,
      bossTargetAngle: type === 'boss' ? 0 : undefined,
    };
  }

  handlePlayerInput(playerId: string, input: {
    dx: number;
    dy: number;
    angle: number;
    attack?: boolean;
    skill?: number;
    mouseX?: number;
    mouseY?: number;
  }): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;

    if (input.dx !== undefined) player.dx = input.dx;
    if (input.dy !== undefined) player.dy = input.dy;
    if (input.angle !== undefined) player.angle = input.angle;

    if (input.attack) {
      this.combat.playerAttack(player);
    }

    if (input.skill !== undefined) {
      this.combat.useSkill(player, input.skill);
    }
  }

  update(dt: number): void {
    if (!this.running) return;
    this.bossEvents = [];

    // Update players
    for (const player of this.players.values()) {
      if (!player.alive) continue;

      // Movement — 使用职业速度而非 DB 的 5.0
      const speedMultiplier = player.speedBuff || 1.0;
      const baseSpeed = CLASS_SPEED[player.characterType] || 180;
      const speed = baseSpeed * speedMultiplier * dt;
      const newX = player.x + player.dx * speed;
      const newY = player.y + player.dy * speed;

      // 玩家碰撞半径 16px，用 5 点检测防止穿墙（中心+4角）
      const PLAYER_RADIUS = 16;
      if (this.isWalkableRadius(newX, newY, PLAYER_RADIUS)) {
        player.x = newX;
        player.y = newY;
      } else if (this.isWalkableRadius(newX, player.y, PLAYER_RADIUS)) {
        // Slide along X
        player.x = newX;
      } else if (this.isWalkableRadius(player.x, newY, PLAYER_RADIUS)) {
        // Slide along Y
        player.y = newY;
      }

      // Clamp to dungeon bounds
      const W = GAME_CONFIG.DUNGEON_WIDTH;
      const H = GAME_CONFIG.DUNGEON_HEIGHT;
      player.x = Math.max(20, Math.min(W - 20, player.x));
      player.y = Math.max(20, Math.min(H - 20, player.y));

      // Energy regen
      if (player.energy < player.energyMax) {
        player.energy = Math.min(player.energyMax, player.energy + GAME_CONFIG.ENERGY_REGEN * dt);
      }

      // Invincibility timer
      if (player.invincible > 0) {
        player.invincible -= dt;
      }

      // Speed buff timer
      if (player.speedBuffTimer > 0) {
        player.speedBuffTimer -= dt;
        if (player.speedBuffTimer <= 0) {
          player.speedBuff = 1.0;
          player.speedBuffTimer = 0;
        }
      }
    }

    // Update enemies
    for (const enemy of this.enemies.values()) {
      if (!enemy.alive) continue;
      if (enemy.state === 'dying') {
        // Death animation timer
        enemy.deathTimer = (enemy.deathTimer || 0) - dt * 1000;
        if (enemy.deathTimer <= 0) {
          enemy.alive = false;
        }
        continue;
      }
      this.enemyAI.update(enemy, dt);
    }

    // Separate overlapping enemies
    this.separateEnemies();

    // Update bullets
    for (const [id, bullet] of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      // Remove if out of bounds
      if (bullet.x < 0 || bullet.x > GAME_CONFIG.DUNGEON_WIDTH || bullet.y < 0 || bullet.y > GAME_CONFIG.DUNGEON_HEIGHT) {
        this.bullets.delete(id);
        continue;
      }

      // Remove if hit wall
      if (!this.isWalkable(bullet.x, bullet.y)) {
        this.bullets.delete(id);
        continue;
      }

      // Check collisions
      this.combat.checkBulletCollision(bullet);
    }

    // Update heal waves (expand radius, remove expired)
    this.healWaves = this.healWaves.filter(w => {
      w.age += dt * 1000;
      w.radius = (w.age / 400) * w.maxRadius; // 400ms expand to max
      return w.age < 400;
    });

    // Item pickup
    this.checkItemPickup();

    // Check floor completion
    this.checkFloorCompletion();

    // Check for game over (all players dead)
    let alivePlayers = 0;
    for (const p of this.players.values()) {
      if (p.alive) alivePlayers++;
    }
    if (alivePlayers === 0 && this.running) {
      this.running = false;
      if (this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
      }
      this._gameOver = true;
      this._victory = false;
    }
  }

  private separateEnemies(): void {
    const enemies = Array.from(this.enemies.values()).filter(e => e.alive);
    const separationForce = 0.5;
    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const e1 = enemies[i], e2 = enemies[j];
        const r1 = ENEMY_RADIUS[e1.type] || 16, r2 = ENEMY_RADIUS[e2.type] || 16;
        const minDist = r1 + r2;
        const dx = e2.x - e1.x, dy = e2.y - e1.y;
        const dist = Math.hypot(dx, dy);
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const dirX = dx / dist, dirY = dy / dist;
          const totalR = r1 + r2;
          const push1 = overlap * (r2 / totalR) * separationForce;
          const push2 = overlap * (r1 / totalR) * separationForce;
          const nx1 = e1.x - dirX * push1, ny1 = e1.y - dirY * push1;
          const nx2 = e2.x + dirX * push2, ny2 = e2.y + dirY * push2;
          if (this.isWalkableRadius(nx1, ny1, r1)) { e1.x = nx1; e1.y = ny1; }
          if (this.isWalkableRadius(nx2, ny2, r2)) { e2.x = nx2; e2.y = ny2; }
        }
      }
    }
  }

  private checkItemPickup(): void {
    const pickupRange = GAME_CONFIG.PLAYER_BASE.pickupRange || 50;
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < pickupRange) {
          // Apply item effect
          switch (item.type) {
            case 'health':
              player.hp = Math.min(player.hpMax, player.hp + 30);
              break;
            case 'energy':
              player.energy = Math.min(player.energyMax, player.energy + 30);
              break;
            case 'coin':
              player.gold += 1;
              break;
            case 'key':
              player.keys += 1;
              break;
            case 'potion':
              player.hp = Math.min(player.hpMax, player.hp + 50);
              break;
            case 'shield':
              player.defense += 10;
              setTimeout(() => { player.defense = Math.max(0, player.defense - 10); }, 10000);
              break;
          }
          this.items.splice(i, 1);
        }
      }
    }
  }

  private checkFloorCompletion(): void {
    // Check if all enemies are dead
    let aliveEnemies = 0;
    for (const enemy of this.enemies.values()) {
      if (enemy.alive) aliveEnemies++;
    }

    if (aliveEnemies === 0 && this.currentDungeon?.exitPoint) {
      // Check if any player is touching the floor_stairs (exitPoint)
      const exitX = this.currentDungeon.exitPoint.x;
      const exitY = this.currentDungeon.exitPoint.y;
      const exitRange = 40; // 碰撞检测范围

      let playerAtExit = false;
      for (const player of this.players.values()) {
        if (!player.alive) continue;
        const dist = Math.hypot(player.x - exitX, player.y - exitY);
        if (dist < exitRange) {
          playerAtExit = true;
          break;
        }
      }

      if (!playerAtExit) return; // 玩家还没到楼梯，不触发

      if (this.currentFloor >= GAME_CONFIG.FLOOR_COUNT) {
        // Game complete!
        this.running = false;
        if (this.tickInterval) {
          clearInterval(this.tickInterval);
          this.tickInterval = null;
        }
        // Store victory state for next getState call
        this._gameOver = true;
        this._victory = true;
      } else {
        // Next floor
        this.startFloor(this.currentFloor + 1);
        this._floorChanged = true;
      }
    }
  }

  /**
   * 检查坐标 (x, y) 是否可行走 (public，Combat.ts 也需要调用)
   */
  isWalkable(x: number, y: number): boolean {
    // 空网格时禁止通行，防止敌人穿墙
    if (!this.collisionGrid || this.collisionGrid.length === 0) {
      console.warn('[CollisionGrid] Grid empty, blocking movement');
      return false;
    }
    const tileSize = 32;
    const col = Math.floor(x / tileSize);
    const row = Math.floor(y / tileSize);
    const rows = this.collisionGrid.length;
    const cols = this.collisionGrid[0]?.length || 0;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return false;
    return this.collisionGrid[row][col];
  }

  /**
   * 检查实体半径内所有角点是否可行走
   */
  isWalkableRadius(x: number, y: number, radius: number): boolean {
    return this.isWalkable(x, y)
      && this.isWalkable(x - radius, y - radius)
      && this.isWalkable(x + radius, y - radius)
      && this.isWalkable(x - radius, y + radius)
      && this.isWalkable(x + radius, y + radius);
  }

  getState(): GameState {
    return {
      tick: this.tick,
      floor: this.currentFloor,
      gameSession: this.gameSession,
      players: Array.from(this.players.values()),
      enemies: Array.from(this.enemies.values()),
      bullets: Array.from(this.bullets.values()),
      healWaves: this.healWaves,
      items: this.items,
      floorCompleted: false,
      bossEvents: this.bossEvents.length > 0 ? [...this.bossEvents] : undefined,
      dungeon: this.currentDungeon ? {
        rooms: this.currentDungeon.rooms,
        corridorTiles: this.currentDungeon.corridorTiles,
        spawnPoint: this.currentDungeon.spawnPoint,
        exitPoint: this.currentDungeon.exitPoint,
        collisionGrid: this.currentDungeon.collisionGrid
      } : undefined
    };
  }

  spawnBullet(ownerId: string, x: number, y: number, angle: number, damage: number, friendly: boolean, ownerType: string = 'warrior'): void {
    const speed = GAME_CONFIG.BULLET_SPEED;
    const id = `bullet_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    this.bullets.set(id, {
      id,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ownerId,
      ownerType,
      damage,
      friendly,
      piercing: 1,
      radius: GAME_CONFIG.BULLET_RADIUS,
    });
  }

  addBullet(bullet: BulletState): void {
    this.bullets.set(bullet.id, bullet);
  }

  pushBossEvent(event: BossEvent): void {
    this.bossEvents.push(event);
  }

  getPlayers(): PlayerState[] {
    return Array.from(this.players.values());
  }

  damageEnemy(enemyId: string, damage: number): void {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || !enemy.alive) return;

    // Fast: 20% dodge chance
    if (enemy.type === 'fast' && Math.random() < 0.2) return;

    // Tank: 40% damage reduction
    let effectiveDamage = damage;
    if (enemy.type === 'tank') effectiveDamage = Math.round(damage * 0.6);

    enemy.hp -= effectiveDamage;
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.state = 'dying';
      enemy.deathTimer = 500; // 500ms death animation before removal
      // Drop item
      if (Math.random() < 0.3) {
        const dropTypes = ['health', 'coin', 'coin'];
        const dropType = dropTypes[Math.floor(Math.random() * dropTypes.length)];
        this.items.push({
          id: `item_${Date.now()}`,
          x: enemy.x,
          y: enemy.y,
          type: dropType
        });
      }
    }
  }

  damagePlayer(playerId: string, damage: number): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive || player.invincible > 0) return;

    // GDD DEF formula: damage = max(1, raw_damage - target.def * 0.5)
    const finalDamage = Math.max(1, damage - player.defense * 0.5);
    player.hp -= finalDamage;
    player.invincible = 0.5;

    if (player.hp <= 0) {
      player.alive = false;
    }
  }

  healPlayer(playerId: string, amount: number): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive) return;
    player.hp = Math.min(player.hpMax, player.hp + amount);
  }

  spawnHealWave(ownerId: string, x: number, y: number, healAmount: number): void {
    const maxRadius = 80;
    // Instant AoE heal
    for (const [id, player] of this.players) {
      if (!player.alive) continue;
      if (player.hp >= player.hpMax) continue;
      const dist = Math.hypot(player.x - x, player.y - y);
      if (dist <= maxRadius) {
        this.healPlayer(id, healAmount);
      }
    }
    // Spawn visual wave
    this.healWaves.push({
      id: `wave_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      x, y,
      radius: 0,
      maxRadius,
      age: 0,
      ownerId,
    });
  }

  removeBullet(bulletId: string): void {
    this.bullets.delete(bulletId);
  }

  isRunning(): boolean {
    return this.running;
  }

  getCurrentFloor(): number {
    return this.currentFloor;
  }

  getPlayerCount(): number {
    return this.players.size;
  }

  // 调试命令处理
  handleDebugCommand(playerId: string, action: string, params?: Record<string, unknown>): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // Support both {floor:5} and {params:{floor:5}} formats
    const raw = params ?? {};
    const p = (raw.params as Record<string, unknown> | undefined) ?? raw;

    switch (action) {
      case 'teleport': {
        const floor = p.floor as number | undefined;
        if (floor && floor >= 1 && floor <= 5) {
          this.startFloor(floor);
        }
        break;
      }
      case 'killAll':
        for (const enemy of this.enemies.values()) {
          enemy.state = 'dying';
          enemy.deathTimer = 0;
          enemy.alive = false;
        }
        break;
      case 'setInvincible':
        // Toggle: if invincible > 0, turn off; otherwise set high value
        player.invincible = player.invincible > 0 ? 0 : 999;
        break;
      case 'moveTo':
        if (typeof p?.x === 'number' && typeof p?.y === 'number') {
          player.x = p.x;
          player.y = p.y;
        }
        break;
      case 'bossSlam': {
        const boss = [...this.enemies.values()].find(e => e.type === 'boss' && e.alive);
        if (boss && !boss.bossCasting) {
          boss.bossCasting = 'aoe';
          boss.bossCastTimer = 0;
          this.bossEvents.push({ type: 'aoe_windup', x: boss.x, y: boss.y });
        }
        break;
      }
      case 'bossRanged': {
        const boss2 = [...this.enemies.values()].find(e => e.type === 'boss' && e.alive);
        if (boss2 && !boss2.bossCasting) {
          const dx = player.x - boss2.x;
          const dy = player.y - boss2.y;
          boss2.bossTargetAngle = Math.atan2(dy, dx);
          const angleToPlayer = boss2.bossTargetAngle;
          const spreadAngle = 30 * Math.PI / 180;
          for (let i = 0; i < 5; i++) {
            const angle = angleToPlayer + (i - 2) * (spreadAngle / 4);
            this.pushBossEvent({ type: 'ranged', x: boss2.x, y: boss2.y });
            const bulletSpeed = 250;
            const id = `bullet_boss_debug_${Date.now()}_${Math.random().toString(36).slice(2)}_${i}`;
            this.addBullet({
              id, x: boss2.x + Math.cos(angle) * 20, y: boss2.y + Math.sin(angle) * 20,
              vx: Math.cos(angle) * bulletSpeed, vy: Math.sin(angle) * bulletSpeed,
              ownerId: boss2.id, ownerType: 'boss', damage: Math.round((boss2.attack || 25) * 0.6),
              friendly: false, piercing: 1, radius: 6,
            });
          }
        }
        break;
      }
    }
  }

  destroy(): void {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.players.clear();
    this.enemies.clear();
    this.bullets.clear();
    this.healWaves = [];
  }

  consumeFloorChanged(): boolean {
    if (this._floorChanged) {
      this._floorChanged = false;
      return true;
    }
    return false;
  }

  consumeGameOver(): boolean {
    if (this._gameOver) {
      this._gameOver = false;
      return true;
    }
    return false;
  }

  consumeVictory(): boolean {
    return this._victory;
  }

  getGameSession(): number {
    return this.gameSession;
  }
}
