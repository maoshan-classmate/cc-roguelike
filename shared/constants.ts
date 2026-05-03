// 客户端/服务端共享常量（唯一数据源）

export const TILE_SIZE = 32;

// 敌人基础属性
export const ENEMY_BASE_HP: Record<string, number> = {
  basic: 30,
  fast: 20,
  ghost: 40,
  tank: 80,
  boss: 200
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
