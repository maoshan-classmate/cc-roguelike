/**
 * 敌人类型配置表
 * 支持扩展新敌人
 */

export interface EnemyConfig {
  id: string
  name: string
  spriteIndex: number
  sheet: 'char' | 'dungeon' | 'sheet'
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
    spriteIndex: 1671,     // roguelikeSheet: 青绿史莱姆 (74% fill, rgb(64,176,176))
    sheet: 'sheet',
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
    spriteIndex: 1665,     // roguelikeSheet row29 col41: 绿色蝙蝠 (74.2%, rgb(128,192,64))
    sheet: 'sheet',
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
    spriteIndex: 1648,     // roguelikeSheet: 灰白骷髅 (74% fill, rgb(192,192,192))
    sheet: 'sheet',
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
    spriteIndex: 1668,     // roguelikeSheet row29 col44: 橙色恶魔 (74.2%, rgb(224,128,64))
    sheet: 'sheet',
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
