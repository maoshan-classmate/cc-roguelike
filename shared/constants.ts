// 客户端/服务端共享常量（唯一数据源）

export const TILE_SIZE = 32;

// 敌人基础属性
export const ENEMY_BASE_HP: Record<string, number> = {
  basic: 30,
  fast: 20,
  ghost: 40,
  tank: 80,
  boss: 800
};

export const ENEMY_BASE_ATTACK: Record<string, number> = {
  basic: 8,
  fast: 10,
  ghost: 12,
  tank: 15,
  boss: 25
};

export const ENEMY_SPEED: Record<string, number> = {
  basic: 60,
  fast: 120,
  ghost: 70,
  tank: 40,
  boss: 50
};

export const ENEMY_RADIUS: Record<string, number> = {
  basic: 16,
  fast: 14,
  ghost: 16,
  tank: 20,
  boss: 28
};

export const ENEMY_AGGRO_RANGE: Record<string, number> = {
  basic: 200,
  fast: 250,
  ghost: 300,
  tank: 150,
  boss: 400
};

export const ENEMY_ATTACK_COOLDOWN: Record<string, number> = {
  basic: 1000,
  fast: 800,
  ghost: 600,
  tank: 1500,
  boss: 500
};

// 职业速度
export const CLASS_SPEED: Record<string, number> = {
  warrior: 180,
  ranger: 220,
  mage: 180,
  cleric: 190
};

// ── 陷阱配置 ──
export const TRAP_TYPES: Record<string, { damage: number; onDuration: number; offDuration: number }> = {
  spike: { damage: 15, onDuration: 2000, offDuration: 3000 },
  fire:  { damage: 10, onDuration: 1500, offDuration: 2500 },
  slow:  { damage: 0,  onDuration: 3000, offDuration: 2000 },
};

export const TRAP_DETECTION_RADIUS = 28;
export const TRAP_WARNING_MS = 500;

// ── 柱子配置 ──
export const PILLAR_HP = 120;
export const PILLAR_SIZE = 32;

// ── 竞技关配置（同心双层） ──
export const ARENA_CENTRAL_WIDTH = 512;
export const ARENA_CENTRAL_HEIGHT = 320;
export const ARENA_CENTRAL_COL = 8;
export const ARENA_CENTRAL_ROW = 7;
export const ARENA_RING_WIDTH = 64;
export const ARENA_RING_OUTER_COL_MIN = 6;
export const ARENA_RING_OUTER_COL_MAX = 25;
export const ARENA_RING_OUTER_ROW_MIN = 5;
export const ARENA_RING_OUTER_ROW_MAX = 18;
export const ARENA_HP_MULTIPLIER = 1.2;
export const ARENA_ATK_MULTIPLIER = 1.1;
export const ARENA_TRIGGER_CHANCE = 0.1;
export const ARENA_WAVE_INTER_DELAY = 2000;
export const ARENA_WAVE_HP_RECOVERY = 0.25;
export const ARENA_DORMANT_SPEED_MULTIPLIER = 0.3;

// ── 迷宫关配置 ──
export const MAZE_CELLS_X = 16;
export const MAZE_CELLS_Y = 12;
export const MAZE_VISION_RADIUS = 128;
export const MAZE_EXTRA_LOOPS_MIN = 8;
export const MAZE_EXTRA_LOOPS_MAX = 12;
export const MAZE_COMBAT_POCKETS_MIN = 3;
export const MAZE_COMBAT_POCKETS_MAX = 4;
export const MAZE_PATROL_ENEMIES_MIN = 3;
export const MAZE_PATROL_ENEMIES_MAX = 5;
export const MAZE_TRIGGER_CHANCE = 0.2;

// ── Boss 房间配置 ──
export const BOSS_ROOM_MIN_SIZE = 224;
