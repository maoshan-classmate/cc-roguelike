/**
 * 道具类型配置表
 * 支持扩展新道具
 */

export interface ItemConfig {
  id: string
  name: string
  spriteIndex: number
  sheet: 'char' | 'dungeon'
  size: number
  color: string
  description: string
  effect?: {
    type: 'heal' | 'damage' | 'buff' | 'key'
    value: number
  }
}

export const ITEMS: Record<string, ItemConfig> = {
  health: {
    id: 'health',
    name: '医疗包',
    spriteIndex: 29,
    sheet: 'dungeon',
    size: 16,
    color: '#32CD32',
    description: '恢复30点生命值',
    effect: { type: 'heal', value: 30 }
  },
  coin: {
    id: 'coin',
    name: '金币',
    spriteIndex: 31,
    sheet: 'dungeon',
    size: 16,
    color: '#FFD700',
    description: '收集金币获得分数'
  },
  key: {
    id: 'key',
    name: '钥匙',
    spriteIndex: 32,
    sheet: 'dungeon',
    size: 16,
    color: '#FFD700',
    description: '用于开启宝箱或门',
    effect: { type: 'key', value: 1 }
  },
  potion: {
    id: 'potion',
    name: '药水',
    spriteIndex: 33,
    sheet: 'dungeon',
    size: 16,
    color: '#9B59B6',
    description: '恢复50点生命值',
    effect: { type: 'heal', value: 50 }
  },
  shield: {
    id: 'shield',
    name: '护盾',
    spriteIndex: 34,
    sheet: 'dungeon',
    size: 16,
    color: '#4A9EFF',
    description: '临时增加防御力',
    effect: { type: 'buff', value: 10 }
  },
  bullet: {
    id: 'bullet',
    name: '能量弹',
    spriteIndex: 35,
    sheet: 'dungeon',
    size: 16,
    color: '#FFA500',
    description: '远程攻击弹药'
  },
  energy: {
    id: 'energy',
    name: '能量包',
    spriteIndex: 30,
    sheet: 'dungeon',
    size: 16,
    color: '#4A9EFF',
    description: '恢复30点魔法值'
  },
  chest: {
    id: 'chest',
    name: '宝箱',
    spriteIndex: 21,
    sheet: 'dungeon',
    size: 16,
    color: '#8B4513',
    description: '打开可获得随机道具'
  }
}

export const ITEM_LIST = Object.values(ITEMS)

export function getItemById(id: string): ItemConfig | undefined {
  return ITEMS[id]
}
