// 客户端/服务端共享类型定义（唯一数据源）

// ── Type Aliases (联合类型约束) ──

export type EnemyType = 'basic' | 'fast' | 'ghost' | 'tank' | 'boss';
export type CharacterType = 'warrior' | 'ranger' | 'mage' | 'cleric';
export type SkillId = 'dash' | 'war_cry' | 'shield_bash' | 'dodge_roll' | 'arrow_rain' | 'frost_nova' | 'meteor' | 'holy_light' | 'sanctuary';
export type SkillType = 'dash' | 'taunt' | 'knockback' | 'dodge_roll' | 'aoe_delayed' | 'cc_aoe' | 'meteor' | 'heal_single' | 'zone_buff';
export type ItemPickupType = 'health' | 'energy' | 'coin' | 'key' | 'potion' | 'shield' | 'vitality_crystal' | 'power_essence' | 'iron_rune';
export type StatusEffectId = 'stun' | 'freeze' | 'root' | 'burn' | 'poison' | 'slow' | 'speed_boost' | 'invulnerable' | 'iframes' | 'taunt';
export type TerrainType = 'dungeon' | 'colosseum' | 'boss_arena' | 'maze';
export type EnemyAIState = 'idle' | 'chase' | 'attack' | 'dying';

// ── Status Effect System ──

export interface EffectFlags {
  blocksMovement: boolean;
  blocksAttack: boolean;
  blocksSkill: boolean;
  speedMultiplier: number;
  damageMultiplier: number;
  outgoingDamageMultiplier: number;
  invulnerable: boolean;
  forcedTarget: boolean;
  forcedTargetSource: string;
  knockbackImmune: boolean;
  energyRegenMultiplier: number;
  cooldownMultiplier: number;
  ccImmune: boolean;
  trapResistance: boolean;
}

export interface StatusEffectInstance {
  id: string;
  typeId: string;
  sourceId: string;
  remainingMs: number;
  stacks: number;
  value: number;
  tickAccumulator: number;
}

export interface SerializedStatusEffect {
  t: string;   // typeId
  r: number;   // remainingMs
  s: number;   // stacks
  v: number;   // value
}

// ── Game Phase ──

export type GamePhase = 'LOBBY' | 'FLOOR_TRANSITION' | 'PLAYING' | 'MAZE_PLAYING' | 'ARENA_PLAYING' | 'VICTORY' | 'GAME_OVER';

// ── Maze Fog ──

export interface MazeFogState {
  enabled: boolean;
  visionRadius: number;
  exploredTiles: string[];
}

// ── Environment Objects ──

export type EnvObjectType = 'pillar' | 'trap' | 'door' | 'decoration' | 'chest';
export type TrapType = 'spike' | 'fire' | 'slow';

export interface EnvObjectState {
  id: string;
  type: EnvObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  hp?: number;
  hpMax?: number;
  trapType?: TrapType;
  trapActive?: boolean;
  triggeredEntityIds?: string[];
  trapCycleTimer?: number;
  trapOnDuration?: number;
  trapOffDuration?: number;
  doorOpen?: boolean;
  spriteKey?: string;
}

// ── Entity States ──

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
  speedBuff: number;
  speedBuffTimer: number;
  weapon: string;
  characterType: CharacterType;
  skills: SkillId[];
  alive: boolean;
  invincible: number;
  angle: number;           // 兼容保留：Combat/SkillHandlers 仍依赖，与 aimAngle 双写
  aimAngle: number;        // 鼠标瞄准角度（弧度，替代原 angle）
  velocity: { x: number; y: number };  // 当前速度向量（加减速惯性模型）
  cooldowns: number[];     // 各技能冷却剩余时间（ms），索引对应 skills 数组
  inputBuffer?: { skillIndex: number; timestamp: number };  // 输入缓冲（服务端权威）
  gold: number;
  keys: number;
  statusEffects: SerializedStatusEffect[];
}

export interface EnemyState {
  id: string;
  type: EnemyType;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  attack: number;
  alive: boolean;
  state: EnemyAIState;
  deathTimer?: number;
  lastAttackTime?: number;
  isElite?: boolean;
  dormant?: boolean;
  lastAttackerId?: string;
  bossPhase?: number;
  bossRangedTimer?: number;
  bossAoETimer?: number;
  bossCasting?: string | null;
  bossPostCastCooldown?: number;
  bossCastTimer?: number;
  bossTargetAngle?: number;
  statusEffects: SerializedStatusEffect[];
  aggroTargetId?: string;
  lastAggroTime: number;
  targetLockUntil: number;
  threatTable?: Record<string, number>;
  contactDamageCooldown?: number;
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

export interface HealWaveState {
  id: string;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;
  ownerId: string;
}

export interface ItemState {
  id: string;
  x: number;
  y: number;
  type: ItemPickupType;
}

export interface BossEvent {
  type: 'ranged' | 'aoe' | 'ranged_windup' | 'aoe_windup';
  x: number;
  y: number;
}

export interface DungeonRoom {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  template?: string;
}

export interface DungeonData {
  rooms: DungeonRoom[];
  corridorTiles: { x: number; y: number }[];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
  collisionGrid: boolean[][];
  envObjects?: EnvObjectState[];
  enemies?: { type: EnemyType; x: number; y: number; count: number }[];
  items?: ItemState[];
  roomTemplates?: string[];
}

export interface GameState {
  tick: number;
  floor: number;
  gameSession: number;
  players: PlayerState[];
  enemies: EnemyState[];
  bullets: BulletState[];
  healWaves: HealWaveState[];
  items: ItemState[];
  boss?: EnemyState;
  bossEvents?: BossEvent[];
  floorCompleted: boolean;
  dungeon?: DungeonData;
  phase?: GamePhase;
  isArenaFloor?: boolean;
  isMazeFloor?: boolean;
  arenaWave?: number;
  arenaTriggered?: boolean;
  mazeTriggered?: boolean;
  mazeFog?: MazeFogState;
}
