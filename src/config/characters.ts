/**
 * 角色职业配置表
 * 支持扩展新职业
 */

export interface CharacterConfig {
  id: string
  name: string
  spriteIndex: {
    front: number
    back: number
    left: number
    right: number
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
    spriteIndex: { front: 0, back: 1, left: 2, right: 3 },
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
    spriteIndex: { front: 4, back: 5, left: 6, right: 7 },
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
    spriteIndex: { front: 8, back: 9, left: 10, right: 11 },
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
    spriteIndex: { front: 12, back: 13, left: 14, right: 15 },
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

export function getCharacterSpriteIndex(id: string, direction: 'front' | 'back' | 'left' | 'right'): number {
  const char = CHARACTERS[id]
  return char?.spriteIndex[direction] ?? 0
}
