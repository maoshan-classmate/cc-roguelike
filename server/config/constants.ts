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
  DUNGEON_WIDTH: 800,
  DUNGEON_HEIGHT: 600,
  ROOM_MIN_SIZE: 6,
  ROOM_MAX_SIZE: 12,

  // 玩家属性
  PLAYER_BASE: {
    maxHealth: 100,
    maxEnergy: 50,
    armor: 0,
    moveSpeed: 200,
    pickupRange: 50,
    radius: 16
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
  1: { enemyCount: [6, 10], eliteChance: 0.1, bossType: 'boss', enemyTypes: ['basic', 'basic'] },
  2: { enemyCount: [8, 14], eliteChance: 0.15, bossType: 'boss', enemyTypes: ['basic', 'fast'] },
  3: { enemyCount: [10, 16], eliteChance: 0.2, bossType: 'boss', enemyTypes: ['fast', 'tank'] },
  4: { enemyCount: [12, 18], eliteChance: 0.25, bossType: 'boss', enemyTypes: ['fast', 'tank', 'tank'] },
  5: { enemyCount: [15, 22], eliteChance: 0.3, bossType: 'boss', enemyTypes: ['tank', 'tank', 'tank'] }
};

// 敌人基础属性
export const ENEMY_BASE: Record<string, {
  health: number;
  damage: number;
  speed: number;
  expValue: number;
  radius: number;
}> = {
  slime: { health: 30, damage: 8, speed: 60, expValue: 10, radius: 20 },
  bat: { health: 20, damage: 10, speed: 150, expValue: 8, radius: 14 },
  skeleton: { health: 50, damage: 15, speed: 80, expValue: 20, radius: 18 },
  orc: { health: 100, damage: 25, speed: 70, expValue: 40, radius: 24 },
  archer: { health: 40, damage: 18, speed: 90, expValue: 25, radius: 16 },
  wizard: { health: 60, damage: 30, speed: 60, expValue: 35, radius: 18 },
  elite_orc: { health: 200, damage: 35, speed: 80, expValue: 80, radius: 28 },
  elite_wizard: { health: 150, damage: 45, speed: 70, expValue: 70, radius: 22 },
  boss: { health: 500, damage: 40, speed: 50, expValue: 200, radius: 40 }
};

// Boss模板
export const BOSS_TEMPLATES: Record<string, {
  healthMultiplier: number;
  phases: number;
  patterns: string[];
}> = {
  slime_king: { healthMultiplier: 50, phases: 2, patterns: ['splash', 'summon'] },
  skeleton_lord: { healthMultiplier: 60, phases: 3, patterns: ['bone_projectile', 'curse', 'resurrect'] },
  demon_mage: { healthMultiplier: 70, phases: 3, patterns: ['fireball', 'meteor', 'teleport'] },
  dragon: { healthMultiplier: 100, phases: 4, patterns: ['fire_breath', 'tail_swipe', 'fly'] },
  final_boss: { healthMultiplier: 150, phases: 5, patterns: ['combo', 'phase_shift', 'enrage'] }
};

// 武器模板
export const WEAPON_TEMPLATES: Record<string, {
  name: string;
  type: 'gun' | 'melee';
  damage: number;
  cooldown: number;
  energyCost: number;
  bulletCount?: number;
  spread?: number;
  range?: number;
  arc?: number;
}> = {
  pistol: { name: '手枪', type: 'gun', damage: 12, cooldown: 300, energyCost: 5 },
  shotgun: { name: '霰弹枪', type: 'gun', damage: 8, cooldown: 800, energyCost: 15, bulletCount: 5, spread: 30 },
  rifle: { name: '步枪', type: 'gun', damage: 20, cooldown: 500, energyCost: 10 },
  sword: { name: '剑', type: 'melee', damage: 30, cooldown: 400, energyCost: 10, range: 50, arc: Math.PI / 2 },
  axe: { name: '斧', type: 'melee', damage: 45, cooldown: 600, energyCost: 15, range: 55, arc: Math.PI / 2 }
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
