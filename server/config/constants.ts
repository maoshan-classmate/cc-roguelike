// 游戏常量配置

export const GAME_CONFIG = {
  // 游戏循环
  TICK_RATE: 20,           // 服务端每秒tick数
  STATE_SYNC_RATE: 10,     // 状态同步频率
  INPUT_RATE: 30,          // 客户端输入频率

  // 房间设置
  MAX_PLAYERS_PER_ROOM: 4,
  MIN_PLAYERS_TO_START: 1,
  ROOM_TIMEOUT: 10 * 60 * 1000,  // 10分钟无操作解散

  // 地牢配置
  FLOOR_COUNT: 5,
  DUNGEON_WIDTH: 1024,
  DUNGEON_HEIGHT: 768,
  ROOM_MIN_SIZE: 96,    // 最小房间尺寸(像素) = 3 tiles
  ROOM_MAX_SIZE: 350,   // 最大房间尺寸(像素) = ~11 tiles

  // 玩家属性
  PLAYER_BASE: {
    maxHealth: 100,
    maxEnergy: 50,
    armor: 0,
    pickupRange: 50,
    radius: 20
  },

  // 战斗
  BULLET_SPEED: 400,
  BULLET_RADIUS: 4,
  MELEE_RANGE: 50,
  MELEE_ARC: Math.PI / 2,  // 90度

  // 能量恢复
  ENERGY_REGEN: 5,          // 每秒恢复能量
  ENERGY_REGEN_DELAY: 2000  // 2秒不攻击后开始恢复
};

// 楼层配置
export const FLOOR_CONFIG: Record<number, {
  enemyCount: [number, number];  // 最小-最大
  eliteChance: number;
  bossType: string;
  enemyTypes: string[];
}> = {
  1: { enemyCount: [3, 5], eliteChance: 0.1, bossType: 'boss', enemyTypes: ['basic', 'basic'] },
  2: { enemyCount: [4, 7], eliteChance: 0.15, bossType: 'boss', enemyTypes: ['basic', 'fast'] },
  3: { enemyCount: [5, 8], eliteChance: 0.2, bossType: 'boss', enemyTypes: ['fast', 'ghost', 'tank'] },
  4: { enemyCount: [6, 10], eliteChance: 0.25, bossType: 'boss', enemyTypes: ['fast', 'ghost', 'tank', 'tank'] },
  5: { enemyCount: [8, 12], eliteChance: 0.3, bossType: 'boss', enemyTypes: ['ghost', 'tank', 'tank', 'tank'] }
};

// 武器模板
export interface WeaponTemplate {
  name: string;
  type: 'gun' | 'melee';
  damage: number;
  cooldown: number;
  energyCost: number;
  bulletCount?: number;
  spread?: number;
  range?: number;
  arc?: number;
}

export const WEAPON_TEMPLATES: Record<string, WeaponTemplate> = {
  pistol: { name: '手枪', type: 'gun', damage: 12, cooldown: 300, energyCost: 5 },
  shotgun: { name: '霰弹枪', type: 'gun', damage: 8, cooldown: 800, energyCost: 15, bulletCount: 5, spread: 30 },
  rifle: { name: '步枪', type: 'gun', damage: 20, cooldown: 500, energyCost: 10 },
  sword: { name: '剑', type: 'melee', damage: 30, cooldown: 400, energyCost: 10, range: 50, arc: Math.PI / 2 },
  axe: { name: '斧', type: 'melee', damage: 45, cooldown: 600, energyCost: 15, range: 55, arc: Math.PI / 2 },
  staff: { name: '法杖', type: 'melee', damage: 22, cooldown: 450, energyCost: 10, range: 55, arc: Math.PI / 3 }
};

// 技能模板
export const SKILL_TEMPLATES: Record<string, {
  name: string;
  type: 'active' | 'passive' | 'dash' | 'heal' | 'shield' | 'speed_boost';
  cooldown: number;
  energyCost: number;
  duration?: number;
  value?: number;
}> = {
  dash: { name: '冲刺', type: 'dash', cooldown: 2000, energyCost: 20, value: 200 },
  shield: { name: '护盾', type: 'active', cooldown: 5000, energyCost: 30, duration: 3000, value: 50 },
  heal: { name: '治疗', type: 'heal', cooldown: 8000, energyCost: 40, value: 40 },
  speed_boost: { name: '加速', type: 'active', cooldown: 10000, energyCost: 25, duration: 5000, value: 1.5 }
};
