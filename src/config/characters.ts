/**
 * 角色职业配置表
 *
 * 资源审计结论：roguelikeChar 角色只有正面+背面两个精灵（成对排列），
 * 没有左右朝向精灵。左右朝向通过 Canvas 水平翻转正面精灵实现。
 */

export interface CharacterConfig {
  id: string
  name: string
  spriteIndex: {
    front: number  // 正面精灵索引
    back: number   // 背面精灵索引
  }
  color: string
  hp: number
  attack: number
  defense: number
  speed: number
  description: string
}

export const CHARACTERS: Record<string, CharacterConfig> = {
  warrior: {
    id: 'warrior',
    name: '战士',
    // 索引 0,1 = 行0 列0,1 (肤色战士 正面+背面)
    spriteIndex: { front: 0, back: 1 },
    color: '#4A9EFF',
    hp: 100,
    attack: 15,
    defense: 10,
    speed: 1,
    description: '近战战士，持剑攻击'
  },
  ranger: {
    id: 'ranger',
    name: '游侠',
    // 索引 162,163 = 行3 列0,1 (绿色角色 正面+背面)
    spriteIndex: { front: 162, back: 163 },
    color: '#51CF66',
    hp: 80,
    attack: 12,
    defense: 5,
    speed: 1.5,
    description: '远程弓箭手，机动性强'
  },
  mage: {
    id: 'mage',
    name: '法师',
    // 索引 108,109 = 行2 列0,1 (棕色盔甲角色 正面+背面)
    spriteIndex: { front: 108, back: 109 },
    color: '#FFA500',
    hp: 60,
    attack: 20,
    defense: 3,
    speed: 1,
    description: '魔法攻击，伤害高但防御弱'
  },
  healer: {
    id: 'healer',
    name: '牧师',
    // 索引 378,379 = 行7 列0,1 (肤色重装角色 正面+背面)
    spriteIndex: { front: 378, back: 379 },
    color: '#9B59B6',
    hp: 70,
    attack: 8,
    defense: 6,
    speed: 1,
    description: '治疗辅助，可为队友恢复'
  }
}

export const CHARACTER_LIST = Object.values(CHARACTERS)

export function getCharacterById(id: string): CharacterConfig | undefined {
  return CHARACTERS[id]
}
