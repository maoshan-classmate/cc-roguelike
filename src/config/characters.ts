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
    front: number  // 正面精灵索引 (Kenney spritesheet)
    back: number   // 背面精灵索引 (Kenney spritesheet)
  }
  /** 0x72 精灵名 (TilesetII) - 优先使用 */
  spriteName?: {
    front: string  // e.g. 'knight_m_idle_anim_f0'
    back: string   // e.g. 'knight_m_idle_anim_f1'
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
    // Kenney 索引 0,1 (保留兼容)
    spriteIndex: { front: 0, back: 1 },
    // 0x72 TilesetII - 骑士男性
    spriteName: { front: 'knight_m_idle_anim_f0', back: 'knight_m_idle_anim_f1' },
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
    // Kenney 索引 162,163
    spriteIndex: { front: 162, back: 163 },
    // 0x72 TilesetII - 精灵男性
    spriteName: { front: 'elf_m_idle_anim_f0', back: 'elf_m_idle_anim_f1' },
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
    // Kenney 索引 108,109
    spriteIndex: { front: 108, back: 109 },
    // 0x72 TilesetII - 男巫
    spriteName: { front: 'wizzard_m_idle_anim_f0', back: 'wizzard_m_idle_anim_f1' },
    color: '#FFA500',
    hp: 60,
    attack: 20,
    defense: 3,
    speed: 1,
    description: '魔法攻击，伤害高但防御弱'
  },
  cleric: {
    id: 'cleric',
    name: '牧师',
    // Kenney 索引 378,379
    spriteIndex: { front: 378, back: 379 },
    // 0x72 TilesetII - 女性法师（区别于男法师 wizzard_m，且不同于任何怪物）
    spriteName: { front: 'wizzard_f_idle_anim_f0', back: 'wizzard_f_idle_anim_f1' },
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
