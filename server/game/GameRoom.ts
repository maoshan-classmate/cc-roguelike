import { Database } from '../data/Database';
import { GAME_CONFIG, FLOOR_CONFIG } from '../config/constants';
import { DungeonGenerator } from './dungeon/DungeonGenerator';
import { generateColosseum, colosseumGenerator, type ArenaData } from './dungeon/ColosseumGenerator';
import { generateBossArena, bossArenaGenerator } from './dungeon/BossArenaGenerator';
import { generateMaze, mazeGenerator } from './dungeon/MazeGenerator';
import { type TerrainData } from './dungeon/types';
import { Combat } from './combat/Combat';
import { CollisionGrid } from './collision/CollisionGrid';
import type { PlayerState, EnemyState, BulletState, GameState, HealWaveState, BossEvent, DungeonData, GamePhase, EnvObjectState, EnemyType, ItemState, ItemPickupType } from '../../shared/types';
import { ENEMY_BASE_HP, ENEMY_BASE_ATTACK, ENEMY_DEFS, ITEM_DEFS, CLASS_SPEED, ARENA_HP_MULTIPLIER, ARENA_ATK_MULTIPLIER, ARENA_TRIGGER_CHANCE, ARENA_WAVE_INTER_DELAY, ARENA_WAVE_HP_RECOVERY, ARENA_DORMANT_SPEED_MULTIPLIER, ARENA_RING_OUTER_COL_MIN, ARENA_RING_OUTER_ROW_MIN, ARENA_RING_OUTER_COL_MAX, ARENA_RING_OUTER_ROW_MAX, MAZE_TRIGGER_CHANCE, TRAP_TYPES, TRAP_DETECTION_RADIUS, PILLAR_HP, TILE_SIZE } from '../../shared/constants';
import { EnemyAI, type EnemyAIDeps } from './enemy/EnemyAI';
import { StatusManager, type TickContext } from './status/StatusManager';

export type { PlayerState, EnemyState, BulletState, GameState, HealWaveState, BossEvent, DungeonData, GamePhase, EnvObjectState };

export class GameRoom {
  private roomId: string;
  private db: Database;
  private players: Map<string, PlayerState> = new Map();
  private enemies: Map<string, EnemyState> = new Map();
  private bullets: Map<string, BulletState> = new Map();
  private healWaves: HealWaveState[] = [];
  private bossEvents: BossEvent[] = [];
  private items: ItemState[] = [];
  private dungeonGenerator: DungeonGenerator;
  private combat: Combat;
  private enemyAI: EnemyAI;
  private currentDungeon: DungeonData | null = null;
  private _gameOver: boolean = false;
  private _victory: boolean = false;
  private _floorChanged: boolean = false;
  private collisionGrid: CollisionGrid = new CollisionGrid();
  private playerStatus: Map<string, StatusManager> = new Map();
  private enemyStatus: Map<string, StatusManager> = new Map();

  // State machine
  private phase: GamePhase = 'LOBBY';
  private arenaTriggered: boolean = false;
  private arenaFloor: number = 0;
  private mazeTriggered: boolean = false;
  private mazeFogEnabled: boolean = true;
  private mazeFloor: number = 0;
  private currentWave: number = 0;
  private waveDelayTimer: number = 0;
  private envObjects: EnvObjectState[] = [];
  private arenaDoorId: string = '';

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
        // Migrate old 4-skill format to new 3-skill per-class format
        if (parsed.length === 4 || parsed.some(s => ['shield', 'heal', 'speed_boost'].includes(s))) {
          const classConfig = {
            warrior: ['dash', 'war_cry', 'shield_bash'],
            ranger: ['dash', 'dodge_roll', 'arrow_rain'],
            mage: ['dash', 'frost_nova', 'meteor'],
            cleric: ['dash', 'holy_light', 'sanctuary'],
          };
          return classConfig[(charData.character_type || 'warrior') as keyof typeof classConfig] || classConfig.warrior;
        }
        return parsed;
      })(),
      alive: true,
      invincible: 0,
      angle: 0,
      gold: 0,
      keys: 0,
      statusEffects: [],
    };
    this.players.set(accountId, player);
    this.playerStatus.set(accountId, new StatusManager());
  }

  removePlayer(playerId: string): void {
    this.players.delete(playerId);
    this.playerStatus.delete(playerId);
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.phase = 'FLOOR_TRANSITION';

    // Generate seeds for all floors
    for (let i = 0; i < GAME_CONFIG.FLOOR_COUNT; i++) {
      this.floorSeeds.push(Math.floor(Math.random() * 0x7fffffff));
    }

    this.startFloor(1);
    this.phase = 'PLAYING';

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

  private resetGameState(): void {
    this.enemies.clear();
    this.enemyStatus.clear();
    this.bullets.clear();
    this.healWaves = [];
    this.bossEvents = [];
    this.items = [];
    this.envObjects = [];
    this.currentWave = 0;
    this.waveDelayTimer = 0;
  }

  private placePlayersAt(spawn: { x: number; y: number }): void {
    let i = 0;
    for (const player of this.players.values()) {
      player.x = spawn.x + (i * 30);
      player.y = spawn.y;
      player.hp = player.hpMax;
      player.energy = player.energyMax;
      player.alive = true;
      i++;
    }
  }

  private spawnEnemy(type: EnemyType | string, x: number, y: number, floor: number): EnemyState {
    const enemy = this.createEnemy(type, x, y, floor);
    this.enemies.set(enemy.id, enemy);
    this.enemyStatus.set(enemy.id, new StatusManager());
    return enemy;
  }

  private spawnArenaEnemy(type: EnemyType | string, x: number, y: number, floor: number): EnemyState {
    const enemy = this.createArenaEnemy(type, x, y, floor);
    this.enemies.set(enemy.id, enemy);
    this.enemyStatus.set(enemy.id, new StatusManager());
    return enemy;
  }

  private applyTerrainData(terrain: TerrainData): void {
    this.currentDungeon = {
      rooms: terrain.rooms ?? [],
      corridorTiles: terrain.corridorTiles ?? [],
      spawnPoint: terrain.spawnPoint,
      exitPoint: terrain.exitPoint,
      collisionGrid: terrain.collisionGrid,
      envObjects: terrain.envObjects,
      enemies: terrain.enemySpawns,
      items: terrain.itemSpawns,
    };
    this.collisionGrid.setGrid(terrain.collisionGrid);
    this.envObjects = terrain.envObjects;
  }

  private initTerrain(config: {
    generator: { generate(floor: number, seed: number): TerrainData };
    floor: number;
    seed: number;
    phase: GamePhase;
    beforeInit?: () => void;
    afterInit?: (terrain: TerrainData) => void;
  }): void {
    config.beforeInit?.();
    this.resetGameState();

    const terrain = config.generator.generate(config.floor, config.seed);
    this.applyTerrainData(terrain);
    this.placePlayersAt(terrain.spawnPoint);

    // Default enemy spawning from terrain data
    for (const spawnData of terrain.enemySpawns) {
      for (let j = 0; j < spawnData.count; j++) {
        this.spawnEnemy(spawnData.type, spawnData.x, spawnData.y, config.floor);
      }
    }

    // Default item spawning from terrain data
    for (const item of terrain.itemSpawns) {
      this.items.push(item);
    }

    config.afterInit?.(terrain);
    this.phase = config.phase;
  }

  private startFloor(floor: number): void {
    this.currentFloor = floor;
    const generator = floor === 5
      ? bossArenaGenerator
      : this.dungeonGenerator;
    this.initTerrain({
      generator,
      floor,
      seed: this.floorSeeds[floor - 1],
      phase: 'PLAYING',
    });
    const _config = FLOOR_CONFIG[floor];
  }

  private createEnemy(type: string, x: number, y: number, floor: number = 1): EnemyState {
    const id = `enemy_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const def = ENEMY_DEFS[type as keyof typeof ENEMY_DEFS];
    const baseHp = def?.hp ?? ENEMY_BASE_HP[type] ?? 30;

    // Boss: fixed HP (no floor scaling), ATK scales with floor
    let scaledHp: number;
    let scaledAttack: number;
    let isElite = false;

    if (type === 'boss') {
      scaledHp = 800;
      const floorAtkMultiplier = 1 + (floor - 1) * 0.1;
      scaledAttack = Math.round((def?.attack ?? ENEMY_BASE_ATTACK[type] ?? 25) * floorAtkMultiplier);
    } else {
      const floorMultiplier = 1 + (floor - 1) * 0.15;
      const floorAtkMultiplier = 1 + (floor - 1) * 0.1;
      scaledHp = Math.round(baseHp * floorMultiplier);
      scaledAttack = Math.round((def?.attack ?? ENEMY_BASE_ATTACK[type] ?? 10) * floorAtkMultiplier);

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
      statusEffects: [],
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
    if (this.phase !== 'PLAYING' && this.phase !== 'ARENA_PLAYING' && this.phase !== 'MAZE_PLAYING') return;
    this.bossEvents = [];

    // Update players
    for (const player of this.players.values()) {
      if (!player.alive) continue;

      // StatusManager tick
      const sm = this.playerStatus.get(player.id);
      if (sm) {
        const ctx: TickContext = {
          entityId: player.id,
          dealDamage: (_id: string, amount: number) => { this.damagePlayer(player.id, amount); },
          healTarget: (_id: string, amount: number) => { this.healPlayer(player.id, amount); },
          restoreEnergy: (_id: string, amount: number) => { player.energy = Math.min(player.energyMax, player.energy + amount); },
        };
        sm.tick(dt * 1000, ctx);
        // Dual-write: sync invulnerable flag to old invincible field
        player.invincible = sm.getAggregatedFlags().invulnerable ? 999 : Math.max(0, player.invincible - dt);
      }

      // Movement — use StatusManager speedMultiplier
      const flags = sm?.getAggregatedFlags();
      const speedMultiplier = flags?.speedMultiplier ?? (player.speedBuff || 1.0);
      const baseSpeed = CLASS_SPEED[player.characterType] || 180;

      // Skip movement if blocksMovement flag is set
      if (!flags?.blocksMovement) {
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
        player.x = Math.max(16, Math.min(W - 16, player.x));
        player.y = Math.max(16, Math.min(H - 16, player.y));

        // Pillar collision: push player out of alive pillar rects
        for (const obj of this.envObjects) {
          if (obj.type !== 'pillar' || !obj.alive) continue;
          const hw = obj.width / 2, hh = obj.height / 2;
          const px = obj.x - hw, py = obj.y - hh;
          // Check if player center is inside pillar rect (with player radius)
          if (player.x + PLAYER_RADIUS > px && player.x - PLAYER_RADIUS < px + obj.width
            && player.y + PLAYER_RADIUS > py && player.y - PLAYER_RADIUS < py + obj.height) {
            // Push out on the axis with least overlap
            const overlapL = (player.x + PLAYER_RADIUS) - px;
            const overlapR = (px + obj.width) - (player.x - PLAYER_RADIUS);
            const overlapT = (player.y + PLAYER_RADIUS) - py;
            const overlapB = (py + obj.height) - (player.y - PLAYER_RADIUS);
            const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB);
            if (minOverlap === overlapL) player.x = px - PLAYER_RADIUS;
            else if (minOverlap === overlapR) player.x = px + obj.width + PLAYER_RADIUS;
            else if (minOverlap === overlapT) player.y = py - PLAYER_RADIUS;
            else player.y = py + obj.height + PLAYER_RADIUS;
          }
        }
      }

      // Energy regen (respect energyRegenMultiplier from status)
      const energyRegenMult = flags?.energyRegenMultiplier ?? 1.0;
      if (player.energy < player.energyMax) {
        player.energy = Math.min(player.energyMax, player.energy + GAME_CONFIG.ENERGY_REGEN * dt * energyRegenMult);
      }

      // Invincibility timer (legacy, dual-write transition)
      if (player.invincible > 0 && !sm?.getAggregatedFlags().invulnerable) {
        player.invincible -= dt;
      }

      // Speed buff timer (legacy, dual-write transition)
      if (player.speedBuffTimer > 0 && !sm?.has('speed_boost')) {
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

      // StatusManager tick for enemies
      const esm = this.enemyStatus.get(enemy.id);
      if (esm) {
        const ctx: TickContext = {
          entityId: enemy.id,
          dealDamage: (_id: string, amount: number) => { this.damageEnemy(enemy.id, amount); },
          healTarget: (_id: string, amount: number) => { enemy.hp = Math.min(enemy.hpMax, enemy.hp + amount); },
          restoreEnergy: () => {},
        };
        esm.tick(dt * 1000, ctx);
      }

      this.enemyAI.update(enemy, dt, esm);
    }

    // Separate overlapping enemies
    this.separateEnemies();

    // Tick environment objects (traps, etc.)
    this.tickEnvObjects(dt);

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

    // Chest interaction
    this.checkChestInteraction();

    // Check floor completion
    this.checkFloorCompletion();

    // Arena state check
    if (this.phase === 'ARENA_PLAYING') {
      this.checkArenaState(dt);
    }

    // Check for game over (all players dead)
    let alivePlayers = 0;
    for (const p of this.players.values()) {
      if (p.alive) alivePlayers++;
    }
    if (alivePlayers === 0 && this.running) {
      this.phase = 'GAME_OVER';
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
    const alive = Array.from(this.enemies.values()).filter(e => e.alive);
    this.collisionGrid.separateEnemies(alive);
  }

  private checkItemPickup(): void {
    const pickupRange = GAME_CONFIG.PLAYER_BASE.pickupRange || 50;
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      for (let i = this.items.length - 1; i >= 0; i--) {
        const item = this.items[i];
        const dist = Math.hypot(player.x - item.x, player.y - item.y);
        if (dist < pickupRange) {
          const def = ITEM_DEFS[item.type];
          if (def) {
            switch (def.effect) {
              case 'heal':
                player.hp = Math.min(player.hpMax, player.hp + def.value);
                break;
              case 'energy':
                player.energy = Math.min(player.energyMax, player.energy + def.value);
                break;
              case 'gold':
                player.gold += def.value;
                break;
              case 'key':
                player.keys += def.value;
                break;
              case 'buff': {
                const sm = this.playerStatus.get(player.id);
                if (def.stat === 'defense' && def.duration) {
                  player.defense += def.value;
                  setTimeout(() => { player.defense = Math.max(0, player.defense - def.value); }, def.duration);
                } else if (def.stat === 'hpMax' && sm && !sm.has('vitality_crystal_effect')) {
                  sm.apply('vitality_crystal_effect', 'item', 0, 999000);
                  player.hpMax += def.value;
                  player.hp += def.value;
                } else if (def.stat === 'attack' && sm) {
                  sm.apply('power_essence_effect', 'item', 1.15, 999000);
                } else if (def.stat === 'defense' && sm) {
                  sm.apply('iron_rune_effect', 'item', 0.5, 999000);
                }
                break;
              }
            }
          }
          this.items.splice(i, 1);
        }
      }
    }
  }

  private checkChestInteraction(): void {
    const interactRange = 50;
    const chestLootTable = ['health', 'energy', 'coin', 'potion'];
    for (const obj of this.envObjects) {
      if (obj.type !== 'chest' || !obj.alive) continue;
      for (const player of this.players.values()) {
        if (!player.alive) continue;
        const dist = Math.hypot(player.x - obj.x, player.y - obj.y);
        if (dist < interactRange) {
          obj.alive = false;
          // Drop 2-3 random items around chest
          const dropCount = 2 + Math.floor(Math.random() * 2);
          for (let i = 0; i < dropCount; i++) {
            const lootType = chestLootTable[Math.floor(Math.random() * chestLootTable.length)];
            const angle = (Math.PI * 2 / dropCount) * i;
            const offset = 24;
            this.items.push({
              id: `item_chest_${Date.now()}_${i}`,
              x: obj.x + Math.cos(angle) * offset,
              y: obj.y + Math.sin(angle) * offset,
              type: lootType,
            });
          }
          break;
        }
      }
    }
  }

  private checkFloorCompletion(): void {
    if (this.phase === 'MAZE_PLAYING') {
      this.checkMazeCompletion();
      return;
    }
    if (this.phase !== 'PLAYING') return;

    // Check if all enemies are dead
    let aliveEnemies = 0;
    for (const enemy of this.enemies.values()) {
      if (enemy.alive) aliveEnemies++;
    }

    if (aliveEnemies > 0) return;

    if (!this.currentDungeon?.exitPoint) {
      console.error('[GameRoom] exitPoint is null, cannot check floor completion');
      return;
    }

    // Floor 5: all enemies dead → VICTORY directly
    if (this.currentFloor >= GAME_CONFIG.FLOOR_COUNT) {
      this.phase = 'VICTORY';
      this.running = false;
      if (this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
      }
      this._gameOver = true;
      this._victory = true;
      return;
    }

    // Floor < 5: check if player is at exit
    const exitX = this.currentDungeon.exitPoint.x;
    const exitY = this.currentDungeon.exitPoint.y;
    const exitRange = 40;

    let playerAtExit = false;
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      const dist = Math.hypot(player.x - exitX, player.y - exitY);
      if (dist < exitRange) {
        playerAtExit = true;
        break;
      }
    }

    if (!playerAtExit) return;

    // Transition: decide arena or next floor
    this.phase = 'FLOOR_TRANSITION';
    this.decideArenaOrNextFloor();
  }

  private decideArenaOrNextFloor(): void {
    if (!this.mazeTriggered && this.currentFloor >= 1 && this.currentFloor <= 3 && Math.random() < MAZE_TRIGGER_CHANCE) {
      this.mazeTriggered = true;
      this.startMaze();
    } else if (!this.arenaTriggered && this.currentFloor >= 1 && this.currentFloor <= 3 && Math.random() < ARENA_TRIGGER_CHANCE) {
      this.arenaTriggered = true;
      this.startArena();
    } else {
      this.startFloor(this.currentFloor + 1);
      this._floorChanged = true;
      this.phase = 'PLAYING';
    }
  }

  private startArena(): void {
    this.arenaFloor = this.currentFloor;
    const arenaFloorNum = this.currentFloor + 1;
    const seed = Math.floor(Math.random() * 0x7fffffff);

    this.initTerrain({
      generator: colosseumGenerator,
      floor: arenaFloorNum,
      seed,
      phase: 'ARENA_PLAYING',
      beforeInit: () => {
        this.arenaFloor = this.currentFloor;
      },
      afterInit: (terrain) => {
        // Store arena door ID
        const arena = generateColosseum(arenaFloorNum, seed);
        this.arenaDoorId = arena.exitDoorId;

        // Override currentDungeon with arena-specific rooms
        this.currentDungeon = {
          rooms: [{ x: terrain.rooms?.[0]?.x ?? 0, y: terrain.rooms?.[0]?.y ?? 0, width: terrain.rooms?.[0]?.width ?? 0, height: terrain.rooms?.[0]?.height ?? 0, type: 'arena' }],
          corridorTiles: [],
          spawnPoint: terrain.spawnPoint,
          exitPoint: terrain.exitPoint,
          collisionGrid: terrain.collisionGrid,
          envObjects: terrain.envObjects,
        };

        // Spawn wave 1 dormant enemies (arena-specific)
        const wave1Count = arenaFloorNum * 2 + 2;
        const basicCount = Math.ceil(wave1Count * 0.6);
        const fastCount = wave1Count - basicCount;
        const room = arena.room;
        const cx = room.x + room.width / 2;
        const cy = room.y + room.height / 2;

        for (let j = 0; j < basicCount; j++) {
          const angle = (j / basicCount) * Math.PI * 2;
          const dist = 64 + Math.random() * 128;
          this.spawnArenaEnemy('basic', cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, arenaFloorNum);
        }
        for (let j = 0; j < fastCount; j++) {
          const angle = (j / fastCount) * Math.PI * 2 + 0.5;
          const dist = 80 + Math.random() * 120;
          this.spawnArenaEnemy('fast', cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, arenaFloorNum);
        }

        console.log(`[GameRoom] Arena started at floor ${arenaFloorNum}, ${wave1Count} dormant enemies`);
      },
    });
  }

  private createArenaEnemy(type: string, x: number, y: number, floor: number): EnemyState {
    const id = `arena_enemy_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const def = ENEMY_DEFS[type as keyof typeof ENEMY_DEFS];
    const baseHp = def?.hp ?? ENEMY_BASE_HP[type] ?? 30;
    const baseAtk = def?.attack ?? ENEMY_BASE_ATTACK[type] ?? 8;

    const hp = Math.round(baseHp * (1 + (floor - 1) * 0.15) * ARENA_HP_MULTIPLIER);
    const atk = Math.round(baseAtk * (1 + (floor - 1) * 0.1) * ARENA_ATK_MULTIPLIER);

    // Clamp spawn to arena bounds (central arena area)
    const arenaMinX = ARENA_RING_OUTER_COL_MIN * TILE_SIZE + 32;
    const arenaMaxX = (ARENA_RING_OUTER_COL_MAX + 1) * TILE_SIZE - 32;
    const arenaMinY = ARENA_RING_OUTER_ROW_MIN * TILE_SIZE + 32;
    const arenaMaxY = (ARENA_RING_OUTER_ROW_MAX + 1) * TILE_SIZE - 32;
    const spawnX = Math.max(arenaMinX, Math.min(arenaMaxX, x));
    const spawnY = Math.max(arenaMinY, Math.min(arenaMaxY, y));

    return {
      id,
      type,
      x: spawnX,
      y: spawnY,
      hp,
      hpMax: hp,
      attack: atk,
      alive: true,
      state: 'idle',
      dormant: true,
      statusEffects: [],
    };
  }

  private checkArenaState(dt: number): void {
    // Rule: stairs (exitPoint) only activates when ALL enemies are cleared
    let aliveEnemies = 0;
    for (const enemy of this.enemies.values()) {
      if (enemy.alive) aliveEnemies++;
    }

    if (aliveEnemies > 0) return;

    const exitPoint = this.currentDungeon?.exitPoint;

    // Wave 0 (dormant enemies not yet attacked — alive count > 0, won't reach here)
    // Waves 1-2 cleared → next wave
    if (this.currentWave >= 1 && this.currentWave < 3) {
      this.waveDelayTimer += dt * 1000;
      if (this.waveDelayTimer < ARENA_WAVE_INTER_DELAY) return;
      this.waveDelayTimer = 0;

      for (const player of this.players.values()) {
        if (player.alive) {
          player.hp = Math.min(player.hpMax, player.hp + Math.round(player.hpMax * ARENA_WAVE_HP_RECOVERY));
        }
      }

      this.currentWave++;
      this.spawnArenaWave(this.currentWave, this.arenaFloor + 1);
      return;
    }

    // Wave 3 just cleared → open door, spawn rewards
    if (this.currentWave === 3) {
      const door = this.envObjects.find(o => o.type === 'door');
      if (door && !door.doorOpen) {
        door.doorOpen = true;
        const col = Math.floor(door.x / TILE_SIZE);
        const row = Math.floor(door.y / TILE_SIZE);
        this.collisionGrid.setTile(col, row, true);
      }

      this.spawnArenaRewards(this.arenaFloor + 1);
      this.currentWave = 4;
      return;
    }

    // Arena fully cleared (wave 4): player walks to stairs → next floor
    if (this.currentWave >= 4 && exitPoint) {
      for (const player of this.players.values()) {
        if (!player.alive) continue;
        const dist = Math.hypot(player.x - exitPoint.x, player.y - exitPoint.y);
        if (dist < 40) {
          this.phase = 'FLOOR_TRANSITION';
          this.startFloor(this.arenaFloor + 1);
          this._floorChanged = true;
          this.phase = 'PLAYING';
          return;
        }
      }
    }
  }

  private spawnArenaWave(wave: number, floor: number): void {
    const room = this.currentDungeon?.rooms[0];
    if (!room) return;
    const cx = room.x + room.width / 2;
    const cy = room.y + room.height / 2;

    if (wave === 2) {
      const count = floor + 1;
      const tankCount = Math.ceil(count * 0.5);
      const ghostCount = count - tankCount;
      for (let i = 0; i < tankCount; i++) {
        const angle = (i / tankCount) * Math.PI * 2;
        const dist = 64 + Math.random() * 128;
        const enemy = this.createArenaEnemy('tank', cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, floor);
        enemy.dormant = false;
        this.enemies.set(enemy.id, enemy);
        this.enemyStatus.set(enemy.id, new StatusManager());
      }
      for (let i = 0; i < ghostCount; i++) {
        const angle = (i / ghostCount) * Math.PI * 2 + 0.5;
        const dist = 80 + Math.random() * 120;
        const enemy = this.createArenaEnemy('ghost', cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, floor);
        enemy.dormant = false;
        this.enemies.set(enemy.id, enemy);
        this.enemyStatus.set(enemy.id, new StatusManager());
      }
    } else if (wave === 3) {
      const count = floor + 2;
      const isOddFloor = floor % 2 === 1;
      const eliteType = isOddFloor ? 'ghost' : 'tank';
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const dist = 64 + Math.random() * 128;
        const enemy = this.createArenaEnemy(eliteType, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, floor);
        enemy.dormant = false;
        enemy.hp *= 2;
        enemy.hpMax = enemy.hp;
        enemy.attack = Math.round(enemy.attack * 1.5);
        enemy.isElite = true;
        this.enemies.set(enemy.id, enemy);
        this.enemyStatus.set(enemy.id, new StatusManager());
      }
    }
  }

  private spawnArenaRewards(floor: number): void {
    const room = this.currentDungeon?.rooms[0];
    if (!room) return;
    const cx = room.x + room.width / 2;
    const cy = room.y + room.height / 2;

    // Guaranteed 1 arena exclusive item
    const exclusives = ['vitality_crystal', 'power_essence', 'iron_rune'];
    const exclusiveType = exclusives[Math.floor(Math.random() * exclusives.length)];
    this.items.push({ id: `item_arena_excl_${Date.now()}`, x: cx, y: cy, type: exclusiveType });

    // Additional items
    const itemCount = 2 + Math.floor(Math.random() * 2) + floor - 1;
    const normalPool = ['potion', 'shield', 'energy'];
    for (let i = 0; i < itemCount - 1; i++) {
      const t = normalPool[Math.floor(Math.random() * normalPool.length)];
      const ox = (Math.random() - 0.5) * 80;
      const oy = (Math.random() - 0.5) * 80;
      this.items.push({ id: `item_arena_${Date.now()}_${i}`, x: cx + ox, y: cy + oy, type: t });
    }

    // Gold coins
    const coinCount = 3 + Math.floor(Math.random() * 3) + floor;
    for (let i = 0; i < coinCount; i++) {
      const ox = (Math.random() - 0.5) * 80;
      const oy = (Math.random() - 0.5) * 80;
      this.items.push({ id: `item_arena_coin_${Date.now()}_${i}`, x: cx + ox, y: cy + oy, type: 'coin' });
    }
  }

  private startMaze(): void {
    this.mazeFloor = this.currentFloor;
    const mazeFloorNum = this.currentFloor + 1;
    const seed = Math.floor(Math.random() * 0x7fffffff);

    this.initTerrain({
      generator: mazeGenerator,
      floor: mazeFloorNum,
      seed,
      phase: 'MAZE_PLAYING',
      beforeInit: () => {
        this.mazeFloor = this.currentFloor;
      },
      afterInit: (terrain) => {
        // Spawn enemies from combat pocket rooms and patrol points
        for (const room of (terrain.rooms ?? [])) {
          if (room.type === 'combat_pocket') {
            const enemyCount = 2 + Math.floor(Math.random() * 2);
            for (let j = 0; j < enemyCount; j++) {
              const angle = (j / enemyCount) * Math.PI * 2;
              const dist = 32 + Math.random() * 32;
              const ex = room.x + room.width / 2 + Math.cos(angle) * dist;
              const ey = room.y + room.height / 2 + Math.sin(angle) * dist;
              const types: EnemyType[] = ['basic', 'fast', 'ghost'];
              const type = types[Math.floor(Math.random() * types.length)];
              this.spawnEnemy(type, ex, ey, mazeFloorNum);
            }
          } else if (room.type === 'maze_patrol') {
            const types: EnemyType[] = ['basic', 'fast'];
            const type = types[Math.floor(Math.random() * types.length)];
            this.spawnEnemy(type, room.x, room.y, mazeFloorNum);
          }
        }
        console.log(`[GameRoom] Maze started at floor ${mazeFloorNum}, ${this.enemies.size} enemies`);
      },
    });
  }

  private checkMazeCompletion(): void {
    // All enemies must be dead
    let aliveEnemies = 0;
    for (const enemy of this.enemies.values()) {
      if (enemy.alive) aliveEnemies++;
    }
    if (aliveEnemies > 0) return;

    if (!this.currentDungeon?.exitPoint) return;

    const exitX = this.currentDungeon.exitPoint.x;
    const exitY = this.currentDungeon.exitPoint.y;

    let playerAtExit = false;
    for (const player of this.players.values()) {
      if (!player.alive) continue;
      const dist = Math.hypot(player.x - exitX, player.y - exitY);
      if (dist < 40) {
        playerAtExit = true;
        break;
      }
    }

    if (!playerAtExit) return;

    // Maze cleared → resume normal flow from next floor
    this.phase = 'FLOOR_TRANSITION';
    this.startFloor(this.mazeFloor + 1);
    this._floorChanged = true;
    this.phase = 'PLAYING';
    console.log(`[GameRoom] Maze cleared, resuming at floor ${this.mazeFloor + 1}`);
  }

  private triggerArenaCombat(): void {
    // Close door
    const door = this.envObjects.find(o => o.type === 'door');
    if (door) {
      door.doorOpen = false;
      const col = Math.floor(door.x / TILE_SIZE);
      const row = Math.floor(door.y / TILE_SIZE);
      this.collisionGrid.setTile(col, row, false);
    }

    // Activate all dormant enemies
    for (const enemy of this.enemies.values()) {
      if (enemy.dormant) {
        enemy.dormant = false;
      }
    }

    this.currentWave = 1;
    console.log('[GameRoom] Arena combat triggered! Wave 1 begins.');
  }

  private tickEnvObjects(dt: number): void {
    for (const obj of this.envObjects) {
      if (!obj.alive) continue;
      if (obj.type !== 'trap') continue;

      // Update trap cycle timer
      obj.trapCycleTimer = (obj.trapCycleTimer || 0) - dt * 1000;
      if (obj.trapCycleTimer! <= 0) {
        obj.trapActive = !obj.trapActive;
        obj.trapCycleTimer = obj.trapActive ? obj.trapOnDuration : obj.trapOffDuration;
        if (!obj.trapActive) {
          obj.triggeredEntityIds = [];
        }
      }

      // Check entities in radius when active
      if (!obj.trapActive) continue;

      const checkEntities = (entities: Iterable<{ id: string; x: number; y: number; alive: boolean; hp?: number; hpMax?: number }>) => {
        for (const entity of entities) {
          if (!entity.alive) continue;
          const triggered = obj.triggeredEntityIds || [];
          if (triggered.includes(entity.id)) continue;

          const dist = Math.hypot(entity.x - obj.x, entity.y - obj.y);
          if (dist < TRAP_DETECTION_RADIUS) {
            triggered.push(entity.id);
            obj.triggeredEntityIds = triggered;

            const trapType = obj.trapType || 'spike';
            const trapConfig = TRAP_TYPES[trapType];
            if (!trapConfig) continue;

            // Check trapResistance for players
            let damage = trapConfig.damage;
            if (trapConfig.damage > 0) {
              const player = this.players.get(entity.id);
              if (player) {
                const sm = this.playerStatus.get(entity.id);
                if (sm?.getAggregatedFlags().trapResistance) {
                  damage = Math.round(damage * 0.5);
                }
                this.damagePlayer(entity.id, damage);
              } else {
                // Enemy — direct damage
                this.damageEnemy(entity.id, damage);
              }
            }

            // Apply status effects
            if (trapType === 'fire') {
              const sm = this.playerStatus.get(entity.id) || this.enemyStatus.get(entity.id);
              if (sm) sm.apply('burn', 'trap', 5, 3000);
            } else if (trapType === 'slow') {
              const sm = this.playerStatus.get(entity.id) || this.enemyStatus.get(entity.id);
              if (sm) sm.apply('slow_trap', 'trap', 0.3, 2000);
            }
          }
        }
      };

      checkEntities(this.players.values());
      checkEntities(this.enemies.values());
    }
  }

  getEnvObjects(): EnvObjectState[] {
    return this.envObjects;
  }

  damageEnvObject(id: string, damage: number, attackerId?: string): void {
    const obj = this.envObjects.find(o => o.id === id);
    if (!obj || !obj.alive) return;

    obj.hp = (obj.hp || 0) - damage;
    if (obj.hp! <= 0) {
      obj.alive = false;
      // Restore collision grid tile
      const col = Math.floor(obj.x / TILE_SIZE);
      const row = Math.floor(obj.y / TILE_SIZE);
      this.collisionGrid.setTile(col, row, true);
      // 20% coin drop
      if (Math.random() < 0.2) {
        this.items.push({ id: `item_pillar_${Date.now()}`, x: obj.x, y: obj.y, type: 'coin' });
      }
    }
  }

  /**
   * 检查坐标 (x, y) 是否可行走 (public，Combat.ts 也需要调用)
   */
  isWalkable(x: number, y: number): boolean {
    return this.collisionGrid.isWalkable(x, y);
  }

  isWalkableRadius(x: number, y: number, radius: number): boolean {
    return this.collisionGrid.isWalkableRadius(x, y, radius);
  }

  getState(): GameState {
    // Serialize player status effects
    const players = Array.from(this.players.values()).map(p => {
      const sm = this.playerStatus.get(p.id);
      return { ...p, statusEffects: sm?.serialize() ?? [] };
    });

    // Serialize enemy status effects
    const enemies = Array.from(this.enemies.values()).map(e => {
      const sm = this.enemyStatus.get(e.id);
      return { ...e, statusEffects: sm?.serialize() ?? [] };
    });

    return {
      tick: this.tick,
      floor: this.currentFloor,
      gameSession: this.gameSession,
      players,
      enemies,
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
        collisionGrid: this.collisionGrid.getGrid(),
        envObjects: this.envObjects,
      } : undefined,
      phase: this.phase,
      isArenaFloor: this.phase === 'ARENA_PLAYING',
      isMazeFloor: this.phase === 'MAZE_PLAYING',
      arenaWave: this.currentWave,
      arenaTriggered: this.arenaTriggered,
      mazeTriggered: this.mazeTriggered,
      mazeFog: this.phase === 'MAZE_PLAYING' ? {
        enabled: this.mazeFogEnabled,
        visionRadius: 128,
        exploredTiles: [],
      } : undefined,
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

  getPlayerStatus(playerId: string): StatusManager | undefined {
    return this.playerStatus.get(playerId);
  }

  getEnemyStatus(enemyId: string): StatusManager | undefined {
    return this.enemyStatus.get(enemyId);
  }

  damageEnemy(enemyId: string, damage: number, attackerId?: string): void {
    const enemy = this.enemies.get(enemyId);
    if (!enemy || !enemy.alive) return;

    // Arena: dormant enemy attacked → trigger combat
    if (enemy.dormant && this.phase === 'ARENA_PLAYING') {
      this.triggerArenaCombat();
    }

    // Track last attacker for trap kill attribution
    if (attackerId) {
      enemy.lastAttackerId = attackerId;
    }

    // Check invulnerable via StatusManager
    const esm = this.enemyStatus.get(enemyId);
    if (esm?.getAggregatedFlags().invulnerable) return;

    // Enemy special properties from ENEMY_DEFS
    const def = ENEMY_DEFS[enemy.type];
    if (def?.dodgeChance && Math.random() < def.dodgeChance) return;

    let effectiveDamage = damage;
    if (def?.damageReduction) effectiveDamage = Math.round(damage * (1 - def.damageReduction));

    // Apply damageMultiplier from StatusManager (vulnerable/shield)
    const dmgMult = esm?.getAggregatedFlags().damageMultiplier ?? 1.0;
    effectiveDamage = Math.round(effectiveDamage * dmgMult);

    enemy.hp -= effectiveDamage;
    if (enemy.hp <= 0) {
      enemy.hp = 0;
      enemy.state = 'dying';
      enemy.deathTimer = 500; // 500ms death animation before removal

      // Energy on kill (+8) for attacker
      if (attackerId) {
        const attacker = this.players.get(attackerId);
        if (attacker && attacker.alive) {
          attacker.energy = Math.min(attacker.energyMax, attacker.energy + 8);
        }
      }

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
    if (!player || !player.alive) return;

    // Check invulnerable via StatusManager
    const sm = this.playerStatus.get(playerId);
    if (sm?.getAggregatedFlags().invulnerable) return;
    // Legacy fallback
    if (player.invincible > 0) return;

    // GDD DEF formula: damage = max(1, raw_damage - target.def * 0.5)
    let finalDamage = Math.max(1, damage - player.defense * 0.5);

    // Apply damageMultiplier from StatusManager (vulnerable/shield)
    const dmgMult = sm?.getAggregatedFlags().damageMultiplier ?? 1.0;
    finalDamage = Math.round(finalDamage * dmgMult);

    player.hp -= finalDamage;
    player.invincible = 0.5;

    // Energy on hit (+3)
    if (player.energy < player.energyMax) {
      player.energy = Math.min(player.energyMax, player.energy + 3);
    }

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
      case 'setInvincible': {
        // Toggle via StatusManager
        const psm = this.playerStatus.get(playerId);
        if (psm) {
          if (psm.has('invulnerable')) {
            psm.clearAll();
            player.invincible = 0;
          } else {
            psm.apply('invulnerable', 'debug', 0, 999999);
            player.invincible = 999;
          }
        } else {
          // Legacy fallback
          player.invincible = player.invincible > 0 ? 0 : 999;
        }
        break;
      }
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
      case 'forceArena': {
        this.arenaTriggered = false;
        this.startArena();
        break;
      }
      case 'forceTrapFloor': {
        // Force start maze
        this.mazeTriggered = false;
        this.startMaze();
        break;
      }
      case 'toggleFog': {
        this.mazeFogEnabled = !this.mazeFogEnabled;
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
    this.playerStatus.clear();
    this.enemyStatus.clear();
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
