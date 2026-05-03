import { Database } from '../data/Database';
import { GAME_CONFIG, FLOOR_CONFIG, WEAPON_TEMPLATES } from '../config/constants';
import { DungeonGenerator } from './dungeon/DungeonGenerator';
import { Combat } from './combat/Combat';
import { Vec2 } from '../utils/Vec2';

// 敌人基础属性映射
const ENEMY_BASE_HP: Record<string, number> = {
  basic: 30,
  fast: 20,
  ghost: 40,
  tank: 80,
  boss: 200
};

export interface PlayerState {
  id: string;
  accountId: string;
  name: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  hp: number;
  hpMax: number;
  energy: number;
  energyMax: number;
  attack: number;
  defense: number;
  speed: number;
  speedBuff: number;  // 速度倍率（1.0=正常）
  speedBuffTimer: number;  // 速度增益剩余时间（秒）
  weapon: string;
  characterType: string;
  skills: string[];
  alive: boolean;
  invincible: number;
  angle: number;
  gold: number;
  keys: number;
}

export interface EnemyState {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  attack: number;
  alive: boolean;
  state: string;  // 'idle' | 'chase' | 'attack' | 'dying'
  deathTimer?: number;
  lastAttackTime?: number;
  isElite?: boolean;
  bossPhase?: number;        // 1 or 2
  bossRangedTimer?: number;  // ms since last ranged attack
  bossAoETimer?: number;     // ms since last AoE attack
  bossCasting?: string | null; // 'ranged' | 'aoe' | null — 蓄力状态
  bossPostCastCooldown?: number; // 技能释放后冷却（ms），防止技能视觉重叠
  bossCastTimer?: number;     // ms into current cast
  bossTargetAngle?: number;   // 蓄力时锁定的朝向角度
}

export interface BulletState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  ownerType: string;
  damage: number;
  friendly: boolean;
  piercing: number;
  radius: number;
}

export interface GameState {
  tick: number;
  floor: number;
  gameSession: number;
  players: PlayerState[];
  enemies: EnemyState[];
  bullets: BulletState[];
  healWaves: HealWaveState[];
  items: { id: string; x: number; y: number; type: string }[];
  boss?: EnemyState;
  bossEvents?: { type: 'ranged' | 'aoe'; x: number; y: number }[];
  floorCompleted: boolean;
  dungeon?: {
    rooms: { x: number; y: number; width: number; height: number; type: string }[];
    corridorTiles: { x: number; y: number }[];
    spawnPoint: { x: number; y: number };
    exitPoint: { x: number; y: number };
    collisionGrid: boolean[][];
  };
}

// 牧师治疗波（AoE 脉冲，从牧师位置扩散）
export interface HealWaveState {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;       // ms
  ownerId: string;
}

export class GameRoom {
  private roomId: string;
  private db: Database;
  private players: Map<string, PlayerState> = new Map();
  private enemies: Map<string, EnemyState> = new Map();
  private bullets: Map<string, BulletState> = new Map();
  private healWaves: HealWaveState[] = [];
  private bossEvents: { type: 'ranged' | 'aoe'; x: number; y: number }[] = [];
  private items: { id: string; x: number; y: number; type: string }[] = [];
  private dungeonGenerator: DungeonGenerator;
  private combat: Combat;
  private currentDungeon: any = null;
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
  }

  addPlayer(accountId: string, name: string, charData: any): void {
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
    const ENEMY_BASE_ATTACK: Record<string, number> = {
      basic: 8,
      fast: 10,
      ghost: 12,
      tank: 15,
      boss: 25
    };

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

    // 职业移动速度（px/s）
    const CLASS_SPEED: Record<string, number> = {
      warrior: 180, ranger: 220, mage: 180, cleric: 190
    };

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
      this.updateEnemy(enemy, dt);
    }

    // Separate overlapping enemies (enemy-enemy collision)
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

  private static readonly ENEMY_AGGRO_RANGE: Record<string, number> = {
    basic: 200, fast: 250, ghost: 300, tank: 150, boss: 400
  };
  private static readonly ENEMY_ATTACK_COOLDOWN: Record<string, number> = {
    basic: 1000, fast: 800, ghost: 600, tank: 1500, boss: 500
  };
  private static readonly ENEMY_SPEED: Record<string, number> = {
    basic: 60, fast: 100, ghost: 70, tank: 40, boss: 50
  };
  private static readonly ENEMY_RADIUS: Record<string, number> = {
    basic: 16, fast: 14, ghost: 16, tank: 20, boss: 28
  };

  private updateEnemy(enemy: EnemyState, dt: number): void {
    // Boss has its own AI
    if (enemy.type === 'boss') {
      this.updateBossEnemy(enemy, dt);
      return;
    }

    const aggroRange = GameRoom.ENEMY_AGGRO_RANGE[enemy.type] || 200;
    const attackCooldown = GameRoom.ENEMY_ATTACK_COOLDOWN[enemy.type] || 1000;
    const speed = (GameRoom.ENEMY_SPEED[enemy.type] || 60) * dt;
    const radius = GameRoom.ENEMY_RADIUS[enemy.type] || 16;
    const isGhost = enemy.type === 'ghost';

    // Find nearest player within aggro range
    let nearestPlayer: PlayerState | null = null;
    let nearestDist = Infinity;

    for (const player of this.players.values()) {
      if (!player.alive) continue;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }

    if (!nearestPlayer) return;

    // Out of aggro range → idle
    if (nearestDist > aggroRange) {
      enemy.state = 'idle';
      return;
    }

    const dx = nearestPlayer.x - enemy.x;
    const dy = nearestPlayer.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 30) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const newEX = enemy.x + dirX * speed;
      const newEY = enemy.y + dirY * speed;

      if (isGhost) {
        // Ghost: skip wall collision, only check map bounds
        const W = GAME_CONFIG.DUNGEON_WIDTH;
        const H = GAME_CONFIG.DUNGEON_HEIGHT;
        enemy.x = Math.max(radius, Math.min(W - radius, newEX));
        enemy.y = Math.max(radius, Math.min(H - radius, newEY));
      } else if (this.isWalkableRadius(newEX, newEY, radius)) {
        enemy.x = newEX;
        enemy.y = newEY;
      } else if (this.isWalkableRadius(newEX, enemy.y, radius)) {
        enemy.x = newEX;
      } else if (this.isWalkableRadius(enemy.x, newEY, radius)) {
        enemy.y = newEY;
      } else {
        const baseAngle = Math.atan2(dirY, dirX);
        const escapeOffsets = [-Math.PI / 2, Math.PI / 2, -Math.PI / 4, Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4, Math.PI, 0];
        for (const offset of escapeOffsets) {
          const escapeAngle = baseAngle + offset;
          const tryX = enemy.x + Math.cos(escapeAngle) * speed;
          const tryY = enemy.y + Math.sin(escapeAngle) * speed;
          if (this.isWalkableRadius(tryX, tryY, radius)) {
            enemy.x = tryX;
            enemy.y = tryY;
            break;
          }
        }
      }

      enemy.state = 'chase';
    } else {
      enemy.state = 'attack';
      // Attack with per-type cooldown
      const now = Date.now();
      const lastAttack = enemy.lastAttackTime || 0;
      if (now - lastAttack >= attackCooldown && nearestPlayer.invincible <= 0) {
        const finalDamage = Math.max(1, (enemy.attack || 10) - nearestPlayer.defense * 0.5);
        nearestPlayer.hp -= finalDamage;
        nearestPlayer.invincible = 0.5;
        enemy.lastAttackTime = now;
        if (nearestPlayer.hp <= 0) {
          nearestPlayer.alive = false;
        }
      }
    }
  }

  private updateBossEnemy(enemy: EnemyState, dt: number): void {
    const speed = GameRoom.ENEMY_SPEED.boss * dt; // 50 px/s
    const radius = GameRoom.ENEMY_RADIUS.boss;    // 28
    const phase = enemy.bossPhase || 1;
    const rangedCooldown = phase === 2 ? 2000 : 4000;
    const aoeCooldown = phase === 2 ? 7000 : 10000;
    const aoeDamage = phase === 2 ? 40 : 30;
    const aoeRange = 100;
    const aggroRange = GameRoom.ENEMY_AGGRO_RANGE.boss; // 400
    const RANGED_WINDUP = 500;  // 弹幕前摇 500ms
    const AOE_WINDUP = 800;     // 震地前摇 800ms

    // Find nearest player
    let nearestPlayer: PlayerState | null = null;
    let nearestDist = Infinity;
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }
    if (!nearestPlayer) return;

    // 脱战：超出 aggroRange 后 idle，重置技能计时器（蓄力中不中断）
    if (nearestDist > aggroRange && !enemy.bossCasting) {
      enemy.state = 'idle';
      enemy.bossRangedTimer = 0;
      enemy.bossAoETimer = 0;
      return;
    }

    // Phase 2 trigger
    if (phase === 1 && enemy.hp <= enemy.hpMax * 0.5) {
      enemy.bossPhase = 2;
      enemy.hp = Math.min(enemy.hpMax, enemy.hp + Math.round(enemy.hpMax * 0.2));
    }

    // ── 蓄力阶段：不动，等待前摇结束 ──
    if (enemy.bossCasting) {
      enemy.bossCastTimer = (enemy.bossCastTimer || 0) + dt * 1000;
      const windup = enemy.bossCasting === 'ranged' ? RANGED_WINDUP : AOE_WINDUP;
      enemy.state = 'attack';

      if (enemy.bossCastTimer >= windup) {
        // 蓄力完成，释放技能
        if (enemy.bossCasting === 'ranged') {
          this.bossFireRanged(enemy);
        } else {
          this.bossFireAoE(enemy, aoeRange, aoeDamage);
        }
        enemy.bossCasting = null;
        enemy.bossCastTimer = 0;
        enemy.bossPostCastCooldown = 1000; // 1s 后摇，让视觉特效播完再放下一个技能
      }
      return; // 蓄力期间不移动
    }

    // ── 移动 + 避障 ──
    const dx = nearestPlayer.x - enemy.x;
    const dy = nearestPlayer.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 40) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const newEX = enemy.x + dirX * speed;
      const newEY = enemy.y + dirY * speed;
      if (this.isWalkableRadius(newEX, newEY, radius)) {
        enemy.x = newEX;
        enemy.y = newEY;
      } else if (this.isWalkableRadius(newEX, enemy.y, radius)) {
        enemy.x = newEX;
      } else if (this.isWalkableRadius(enemy.x, newEY, radius)) {
        enemy.y = newEY;
      } else {
        // 卡墙：尝试 8 个偏移角度逃逸
        const baseAngle = Math.atan2(dy, dx);
        const escapeOffsets = [-Math.PI/2, Math.PI/2, -Math.PI/4, Math.PI/4, -Math.PI*3/4, Math.PI*3/4];
        for (const offset of escapeOffsets) {
          const tryX = enemy.x + Math.cos(baseAngle + offset) * speed;
          const tryY = enemy.y + Math.sin(baseAngle + offset) * speed;
          if (this.isWalkableRadius(tryX, tryY, radius)) {
            enemy.x = tryX;
            enemy.y = tryY;
            break;
          }
        }
      }
      enemy.state = 'chase';
    } else {
      enemy.state = 'attack';
    }

    // ── 近战攻击 ──
    const now = Date.now();
    const lastAttack = enemy.lastAttackTime || 0;
    if (dist <= 40 && now - lastAttack >= 500 && nearestPlayer.invincible <= 0) {
      const finalDamage = Math.max(1, (enemy.attack || 25) - nearestPlayer.defense * 0.5);
      nearestPlayer.hp -= finalDamage;
      nearestPlayer.invincible = 0.5;
      enemy.lastAttackTime = now;
      if (nearestPlayer.hp <= 0) nearestPlayer.alive = false;
    }

    // ── 技能计时器持续走（蓄力期间也累加，但不触发）──
    enemy.bossRangedTimer = (enemy.bossRangedTimer || 0) + dt * 1000;
    enemy.bossAoETimer = (enemy.bossAoETimer || 0) + dt * 1000;

    // ── 后摇冷却递减 ──
    if (enemy.bossPostCastCooldown && enemy.bossPostCastCooldown > 0) {
      enemy.bossPostCastCooldown -= dt * 1000;
    }

    // ── 当前无蓄力且后摇结束时，检查冷却触发下一个技能 ──
    if (!enemy.bossCasting && (!enemy.bossPostCastCooldown || enemy.bossPostCastCooldown <= 0)) {
      // 弹幕优先判定
      if (enemy.bossRangedTimer >= rangedCooldown && dist > 40) {
        enemy.bossRangedTimer = 0;
        enemy.bossCasting = 'ranged';
        enemy.bossCastTimer = 0;
        enemy.bossTargetAngle = Math.atan2(dy, dx);
        this.bossEvents.push({ type: 'ranged_windup', x: enemy.x, y: enemy.y });
      }
      // 弹幕未触发时才判定震地（避免同一 tick 双触发）
      else if (enemy.bossAoETimer >= aoeCooldown) {
        enemy.bossAoETimer = 0;
        enemy.bossCasting = 'aoe';
        enemy.bossCastTimer = 0;
        this.bossEvents.push({ type: 'aoe_windup', x: enemy.x, y: enemy.y });
      }
    }
  }

  private bossFireRanged(enemy: EnemyState): void {
    const angleToPlayer = enemy.bossTargetAngle || 0;
    const spreadAngle = 30 * Math.PI / 180;
    for (let i = 0; i < 5; i++) {
      const angle = angleToPlayer + (i - 2) * (spreadAngle / 4);
      this.bossEvents.push({ type: 'ranged', x: enemy.x, y: enemy.y });
      const bulletSpeed = 250;
      const id = `bullet_boss_${Date.now()}_${Math.random().toString(36).slice(2)}_${i}`;
      this.bullets.set(id, {
        id,
        x: enemy.x + Math.cos(angle) * 20,
        y: enemy.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
        ownerId: enemy.id,
        ownerType: 'boss',
        damage: Math.round((enemy.attack || 25) * 0.6),
        friendly: false,
        piercing: 1,
        radius: 6,
      });
    }
  }

  private bossFireAoE(enemy: EnemyState, aoeRange: number, aoeDamage: number): void {
    this.bossEvents.push({ type: 'aoe', x: enemy.x, y: enemy.y });
    for (const player of this.players.values()) {
      if (!player.alive || player.invincible > 0) continue;
      const pDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (pDist <= aoeRange) {
        const finalDamage = Math.max(1, aoeDamage - player.defense * 0.5);
        player.hp -= finalDamage;
        player.invincible = 0.5;
        if (player.hp <= 0) player.alive = false;
      }
    }
  }

  /**
   * 敌人-敌人碰撞分离
   * 防止敌人重叠在一起，推动它们分开
   */
  private separateEnemies(): void {
    const enemies = Array.from(this.enemies.values()).filter(e => e.alive);
    const separationForce = 0.5;

    for (let i = 0; i < enemies.length; i++) {
      for (let j = i + 1; j < enemies.length; j++) {
        const e1 = enemies[i];
        const e2 = enemies[j];

        const r1 = GameRoom.ENEMY_RADIUS[e1.type] || 16;
        const r2 = GameRoom.ENEMY_RADIUS[e2.type] || 16;
        const minDist = r1 + r2; // 两个敌人碰撞半径之和

        const dx = e2.x - e1.x;
        const dy = e2.y - e1.y;
        const dist = Math.hypot(dx, dy);

        if (dist < minDist && dist > 0) {
          // 重叠了，需要分离
          const overlap = minDist - dist;
          const dirX = dx / dist;
          const dirY = dy / dist;

          // 按半径比例分配分离距离
          const totalRadius = r1 + r2;
          const push1 = overlap * (r2 / totalRadius) * separationForce;
          const push2 = overlap * (r1 / totalRadius) * separationForce;

          const newX1 = e1.x - dirX * push1;
          const newY1 = e1.y - dirY * push1;
          const newX2 = e2.x + dirX * push2;
          const newY2 = e2.y + dirY * push2;

          // 验证分离后位置可行走
          if (this.isWalkableRadius(newX1, newY1, r1)) {
            e1.x = newX1;
            e1.y = newY1;
          }
          if (this.isWalkableRadius(newX2, newY2, r2)) {
            e2.x = newX2;
            e2.y = newY2;
          }
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
  handleDebugCommand(playerId: string, action: string, params?: any): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // Support both {floor:5} and {params:{floor:5}} formats
    const p = params?.params || params;

    switch (action) {
      case 'teleport':
        if (p?.floor && p.floor >= 1 && p.floor <= 5) {
          this.startFloor(p.floor);
        }
        break;
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
          this.bossFireRanged(boss2);
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
}
