// 敌人模板注册表（唯一数据源）
// 合并原 shared/constants.ts ENEMY_DEFS（服务端权威）+ src/config/enemies.ts ENEMIES（客户端渲染）
// 数值以服务端为准

import type { EnemyType } from './types';

// ── 敌人定义接口 ──
export interface EnemyDef {
  // 战斗属性
  hp: number;
  attack: number;
  speed: number;        // px/s
  radius: number;
  aggroRange: number;
  attackCooldown: number; // ms
  size: number;
  damageReduction?: number;
  dodgeChance?: number;
  spriteSource?: string;
  // 视觉/显示
  name: string;
  color: string;
  isBoss?: boolean;
  // 精灵
  spriteIndex: number;
  sheet: 'char' | 'dungeon' | 'sheet';
  spriteName?: string;
  // 掉落
  dropTable?: { itemId: string; chance: number }[];
}

// ── 敌人注册表 ──
export const ENEMY_DEFS: Record<EnemyType, EnemyDef> = {
  basic: {
    hp: 30, attack: 8, speed: 60, radius: 16, aggroRange: 200, attackCooldown: 1000, size: 40,
    name: '史莱姆', color: '#40B0B0',
    spriteIndex: 1671, sheet: 'sheet', spriteName: 'slime_idle',
    dropTable: [{ itemId: 'coin', chance: 0.3 }],
  },
  fast: {
    hp: 20, attack: 10, speed: 120, radius: 14, aggroRange: 250, attackCooldown: 800, size: 36,
    dodgeChance: 0.2,
    name: '蝙蝠', color: '#80C040',
    spriteIndex: 1665, sheet: 'sheet', spriteName: 'bat_idle',
    dropTable: [{ itemId: 'coin', chance: 0.4 }],
  },
  ghost: {
    hp: 40, attack: 12, speed: 70, radius: 16, aggroRange: 300, attackCooldown: 600, size: 42,
    name: '幽灵', color: '#8060C0',
    spriteIndex: 1648, sheet: 'sheet', spriteName: 'ghost_idle',
    dropTable: [{ itemId: 'coin', chance: 0.4 }, { itemId: 'health', chance: 0.3 }],
  },
  tank: {
    hp: 80, attack: 15, speed: 40, radius: 20, aggroRange: 150, attackCooldown: 1500, size: 48,
    damageReduction: 0.4, spriteSource: '0x72',
    name: '骷髅兵', color: '#C0C0C0',
    spriteIndex: 1648, sheet: 'sheet', spriteName: 'skelet_idle_anim_f0',
    dropTable: [{ itemId: 'health', chance: 0.5 }, { itemId: 'shield', chance: 0.2 }],
  },
  boss: {
    hp: 800, attack: 25, speed: 50, radius: 28, aggroRange: 400, attackCooldown: 500, size: 64,
    spriteSource: '0x72',
    name: '恶魔', color: '#E08040', isBoss: true,
    spriteIndex: 1668, sheet: 'sheet', spriteName: 'big_demon_idle_anim_f0',
    dropTable: [{ itemId: 'key', chance: 1.0 }, { itemId: 'coin', chance: 1.0 }, { itemId: 'health', chance: 0.8 }],
  },
};
