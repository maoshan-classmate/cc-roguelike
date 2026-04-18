/**
 * 敌人类型配置表
 * 支持扩展新敌人
 */

export interface EnemyConfig {
  id: string
  name: string
  spriteIndex: number
  sheet: 'char' | 'dungeon' | 'sheet'
  /** 0x72 精灵名 (TilesetII) - 优先使用 */
  spriteName?: string
  size: number
  hp: number
  attack: number
  speed: number
  color: string
  isBoss?: boolean
  dropTable?: { itemId: string; chance: number }[]
}

export const ENEMIES: Record<string, EnemyConfig> = {
  basic: {
    id: 'basic',
    name: '史莱姆',
    spriteIndex: 1671,     // Kenney roguelikeSheet fallback
    sheet: 'sheet',
    spriteName: 'slime_idle',  // AI 生成精灵 (Gemini sprite-animator)
    size: 40,
    hp: 30,
    attack: 5,
    speed: 1,
    color: '#40B0B0',
    dropTable: [
      { itemId: 'coin', chance: 0.3 }
    ]
  },
  fast: {
    id: 'fast',
    name: '蝙蝠',
    spriteIndex: 1665,     // Kenney roguelikeSheet fallback
    sheet: 'sheet',
    spriteName: 'bat_idle',  // AI 生成精灵 (Gemini sprite-animator)
    size: 36,
    hp: 20,
    attack: 8,
    speed: 2,
    color: '#80C040',
    dropTable: [
      { itemId: 'coin', chance: 0.4 }
    ]
  },
  tank: {
    id: 'tank',
    name: '骷髅兵',
    spriteIndex: 1648,     // Kenney roguelikeSheet fallback
    sheet: 'sheet',
    spriteName: 'skelet_idle_anim_f0',  // 0x72 TilesetII
    size: 48,
    hp: 80,
    attack: 10,
    speed: 0.5,
    color: '#C0C0C0',
    dropTable: [
      { itemId: 'health', chance: 0.5 },
      { itemId: 'shield', chance: 0.2 }
    ]
  },
  boss: {
    id: 'boss',
    name: '恶魔',
    spriteIndex: 1668,     // Kenney roguelikeSheet fallback
    sheet: 'sheet',
    spriteName: 'big_demon_idle_anim_f0',  // 0x72 TilesetII
    size: 64,
    hp: 200,
    attack: 20,
    speed: 0.8,
    color: '#E08040',
    isBoss: true,
    dropTable: [
      { itemId: 'key', chance: 1.0 },
      { itemId: 'coin', chance: 1.0 },
      { itemId: 'health', chance: 0.8 }
    ]
  }
}

export const ENEMY_LIST = Object.values(ENEMIES)

export function getEnemyById(id: string): EnemyConfig | undefined {
  return ENEMIES[id]
}
