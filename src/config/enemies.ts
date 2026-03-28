/**
 * 敌人类型配置表
 * 支持扩展新敌人
 */

export interface EnemyConfig {
  id: string
  name: string
  spriteIndex: number
  sheet: 'char' | 'dungeon'
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
    name: '小怪',
    spriteIndex: 25,
    sheet: 'char',
    size: 32,
    hp: 30,
    attack: 5,
    speed: 1,
    color: '#DC143C',
    dropTable: [
      { itemId: 'coin', chance: 0.3 }
    ]
  },
  fast: {
    id: 'fast',
    name: '快兵',
    spriteIndex: 26,
    sheet: 'char',
    size: 32,
    hp: 20,
    attack: 8,
    speed: 2,
    color: '#FF4500',
    dropTable: [
      { itemId: 'coin', chance: 0.4 }
    ]
  },
  tank: {
    id: 'tank',
    name: '坦克',
    spriteIndex: 27,
    sheet: 'char',
    size: 40,
    hp: 80,
    attack: 10,
    speed: 0.5,
    color: '#8B0000',
    dropTable: [
      { itemId: 'health', chance: 0.5 },
      { itemId: 'shield', chance: 0.2 }
    ]
  },
  boss: {
    id: 'boss',
    name: 'BOSS',
    spriteIndex: 28,
    sheet: 'char',
    size: 48,
    hp: 200,
    attack: 20,
    speed: 0.8,
    color: '#FF0000',
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
