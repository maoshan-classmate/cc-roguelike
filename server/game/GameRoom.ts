import { Database } from '../data/Database';
import { GAME_CONFIG, FLOOR_CONFIG, WEAPON_TEMPLATES } from '../config/constants';
import { DungeonGenerator } from './dungeon/DungeonGenerator';
import { Combat } from './combat/Combat';
import { Vec2 } from '../utils/Vec2';

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
  weapon: string;
  skills: string[];
  alive: boolean;
  invincible: number;
  angle: number;
}

export interface EnemyState {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  alive: boolean;
  state: string;
}

export interface BulletState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: string;
  damage: number;
  friendly: boolean;
  piercing: number;
  radius: number;
}

export interface GameState {
  tick: number;
  floor: number;
  players: PlayerState[];
  enemies: EnemyState[];
  bullets: BulletState[];
  items: { id: string; x: number; y: number; type: string }[];
  boss?: EnemyState;
  floorCompleted: boolean;
}

export class GameRoom {
  private roomId: string;
  private db: Database;
  private players: Map<string, PlayerState> = new Map();
  private enemies: Map<string, EnemyState> = new Map();
  private bullets: Map<string, BulletState> = new Map();
  private items: { id: string; x: number; y: number; type: string }[] = [];
  private dungeonGenerator: DungeonGenerator;
  private combat: Combat;

  private currentFloor: number = 1;
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
      speed: charData.speed || 5.0,
      weapon: charData.weapon || 'pistol',
      skills: JSON.parse(charData.skills || '["dash","shield"]'),
      alive: true,
      invincible: 0,
      angle: 0
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
    const tickMs = 1000 / GAME_CONFIG.TICK_RATE;
    this.tickInterval = setInterval(() => this.tick++, tickMs);
  }

  private startFloor(floor: number): void {
    this.currentFloor = floor;
    this.enemies.clear();
    this.bullets.clear();
    this.items = [];

    const seed = this.floorSeeds[floor - 1];
    const dungeon = this.dungeonGenerator.generate(floor, seed);
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
        const enemy = this.createEnemy(spawnData.type, spawnData.x, spawnData.y);
        this.enemies.set(enemy.id, enemy);
      }
    }

    // Spawn items
    for (const item of dungeon.items) {
      this.items.push(item);
    }
  }

  private createEnemy(type: string, x: number, y: number): EnemyState {
    const id = `enemy_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const baseHp = 50;

    return {
      id,
      type,
      x: x + Math.random() * 40 - 20,
      y: y + Math.random() * 40 - 20,
      hp: baseHp,
      hpMax: baseHp,
      alive: true,
      state: 'idle'
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

    player.dx = input.dx;
    player.dy = input.dy;
    player.angle = input.angle;

    if (input.attack) {
      this.combat.playerAttack(player);
    }

    if (input.skill !== undefined) {
      this.combat.useSkill(player, input.skill);
    }
  }

  update(dt: number): void {
    if (!this.running) return;

    // Update players
    for (const player of this.players.values()) {
      if (!player.alive) continue;

      // Movement
      const speed = player.speed * GAME_CONFIG.PLAYER_BASE.moveSpeed * dt;
      player.x += player.dx * speed;
      player.y += player.dy * speed;

      // Clamp to dungeon bounds
      player.x = Math.max(20, Math.min(780, player.x));
      player.y = Math.max(20, Math.min(580, player.y));

      // Energy regen
      if (player.energy < player.energyMax) {
        player.energy = Math.min(player.energyMax, player.energy + GAME_CONFIG.ENERGY_REGEN * dt);
      }

      // Invincibility timer
      if (player.invincible > 0) {
        player.invincible -= dt;
      }
    }

    // Update enemies
    for (const enemy of this.enemies.values()) {
      if (!enemy.alive) continue;
      this.updateEnemy(enemy, dt);
    }

    // Update bullets
    for (const [id, bullet] of this.bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;

      // Remove if out of bounds
      if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
        this.bullets.delete(id);
        continue;
      }

      // Check collisions
      this.combat.checkBulletCollision(bullet);
    }

    // Check floor completion
    this.checkFloorCompletion();
  }

  private updateEnemy(enemy: EnemyState, dt: number): void {
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

    // Simple AI: move toward player
    const dx = nearestPlayer.x - enemy.x;
    const dy = nearestPlayer.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 30) {
      const speed = 60 * dt;
      enemy.x += (dx / dist) * speed;
      enemy.y += (dy / dist) * speed;
      enemy.state = 'chase';
    } else {
      enemy.state = 'attack';
      // Attack player (simple damage)
      if (nearestPlayer.invincible <= 0) {
        nearestPlayer.hp -= 10;
        nearestPlayer.invincible = 0.5;
        if (nearestPlayer.hp <= 0) {
          nearestPlayer.alive = false;
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

    if (aliveEnemies === 0) {
      if (this.currentFloor >= GAME_CONFIG.FLOOR_COUNT) {
        // Game complete!
        this.running = false;
        if (this.tickInterval) {
          clearInterval(this.tickInterval);
          this.tickInterval = null;
        }
      } else {
        // Next floor
        this.startFloor(this.currentFloor + 1);
      }
    }
  }

  getState(): GameState {
    return {
      tick: this.tick,
      floor: this.currentFloor,
      players: Array.from(this.players.values()),
      enemies: Array.from(this.enemies.values()),
      bullets: Array.from(this.bullets.values()),
      items: this.items,
      floorCompleted: false
    };
  }

  spawnBullet(ownerId: string, x: number, y: number, angle: number, damage: number, friendly: boolean): void {
    const speed = GAME_CONFIG.BULLET_SPEED;
    const id = `bullet_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    this.bullets.set(id, {
      id,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      ownerId,
      damage,
      friendly,
      piercing: 1,
      radius: GAME_CONFIG.BULLET_RADIUS
    });
  }

  damageEnemy(enemyId: string, damage: number): void {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || !enemy.alive) return;

    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.alive = false;
      // Drop item
      if (Math.random() < 0.3) {
        this.items.push({
          id: `item_${Date.now()}`,
          x: enemy.x,
          y: enemy.y,
          type: 'health_pack'
        });
      }
    }
  }

  damagePlayer(playerId: string, damage: number): void {
    const player = this.players.get(playerId);
    if (!player || !player.alive || player.invincible > 0) return;

    player.hp -= damage;
    player.invincible = 0.5;

    if (player.hp <= 0) {
      player.alive = false;
    }
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

  destroy(): void {
    this.running = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.players.clear();
    this.enemies.clear();
    this.bullets.clear();
  }
}
