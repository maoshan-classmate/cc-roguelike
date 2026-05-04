// 客户端/服务端共享类型定义（唯一数据源）

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
  knockbackImmune: boolean;
  energyRegenMultiplier: number;
  cooldownMultiplier: number;
  ccImmune: boolean;
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
  characterType: string;
  skills: string[];
  alive: boolean;
  invincible: number;
  angle: number;
  gold: number;
  keys: number;
  statusEffects: SerializedStatusEffect[];
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
  state: string;
  deathTimer?: number;
  lastAttackTime?: number;
  isElite?: boolean;
  bossPhase?: number;
  bossRangedTimer?: number;
  bossAoETimer?: number;
  bossCasting?: string | null;
  bossPostCastCooldown?: number;
  bossCastTimer?: number;
  bossTargetAngle?: number;
  statusEffects: SerializedStatusEffect[];
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
  type: string;
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
}

export interface DungeonData {
  rooms: DungeonRoom[];
  corridorTiles: { x: number; y: number }[];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
  collisionGrid: boolean[][];
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
}
