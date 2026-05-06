// 客户端/服务端共享常量（唯一数据源）

import type { EnemyType, CharacterType, SkillId, ItemPickupType } from './types';

export const TILE_SIZE = 32;
export const TWO_PI = Math.PI * 2;

// ── 敌人属性注册表（合并 ENEMY_BASE_HP/ATTACK/SPEED/RADIUS/AGGRO/COOLDOWN） ──

export const ENEMY_DEFS: Record<EnemyType, {
  hp: number; attack: number; speed: number; radius: number;
  aggroRange: number; attackCooldown: number; size: number;
  damageReduction?: number; dodgeChance?: number; spriteSource?: string;
}> = {
  basic: { hp: 30, attack: 8, speed: 60, radius: 16, aggroRange: 200, attackCooldown: 1000, size: 40 },
  fast:  { hp: 20, attack: 10, speed: 120, radius: 14, aggroRange: 250, attackCooldown: 800, size: 36, dodgeChance: 0.2 },
  ghost: { hp: 40, attack: 12, speed: 70, radius: 16, aggroRange: 300, attackCooldown: 600, size: 42 },
  tank:  { hp: 80, attack: 15, speed: 40, radius: 20, aggroRange: 150, attackCooldown: 1500, size: 48, damageReduction: 0.4, spriteSource: '0x72' },
  boss:  { hp: 800, attack: 25, speed: 50, radius: 28, aggroRange: 400, attackCooldown: 500, size: 64, spriteSource: '0x72' },
};

// 旧名兼容（逐步迁移后删除）
export const ENEMY_BASE_HP: Record<string, number> = Object.fromEntries(Object.entries(ENEMY_DEFS).map(([k, v]) => [k, v.hp]));
export const ENEMY_BASE_ATTACK: Record<string, number> = Object.fromEntries(Object.entries(ENEMY_DEFS).map(([k, v]) => [k, v.attack]));
export const ENEMY_SPEED: Record<string, number> = Object.fromEntries(Object.entries(ENEMY_DEFS).map(([k, v]) => [k, v.speed]));
export const ENEMY_RADIUS: Record<string, number> = Object.fromEntries(Object.entries(ENEMY_DEFS).map(([k, v]) => [k, v.radius]));
export const ENEMY_AGGRO_RANGE: Record<string, number> = Object.fromEntries(Object.entries(ENEMY_DEFS).map(([k, v]) => [k, v.aggroRange]));
export const ENEMY_ATTACK_COOLDOWN: Record<string, number> = Object.fromEntries(Object.entries(ENEMY_DEFS).map(([k, v]) => [k, v.attackCooldown]));

// ── 职业配置注册表 ──

export const CLASS_SPEED: Record<CharacterType, number> = {
  warrior: 180,
  ranger: 220,
  mage: 180,
  cleric: 190
};

export const CLASS_SKILLS: Record<CharacterType, SkillId[]> = {
  warrior: ['dash', 'war_cry', 'shield_bash'],
  ranger: ['dash', 'dodge_roll', 'arrow_rain'],
  mage: ['dash', 'frost_nova', 'meteor'],
  cleric: ['dash', 'holy_light', 'sanctuary'],
};

// ── 道具效果注册表 ──

export const ITEM_DEFS: Record<ItemPickupType, {
  effect: 'heal' | 'energy' | 'gold' | 'key' | 'buff';
  value: number;
  duration?: number;
  stat?: string;
}> = {
  health:           { effect: 'heal', value: 30 },
  energy:           { effect: 'energy', value: 30 },
  coin:             { effect: 'gold', value: 1 },
  key:              { effect: 'key', value: 1 },
  potion:           { effect: 'heal', value: 50 },
  shield:           { effect: 'buff', value: 10, duration: 10000, stat: 'defense' },
  vitality_crystal: { effect: 'buff', value: 20, stat: 'hpMax' },
  power_essence:    { effect: 'buff', value: 5, stat: 'attack' },
  iron_rune:        { effect: 'buff', value: 5, stat: 'defense' },
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
