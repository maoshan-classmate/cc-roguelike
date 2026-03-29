/**
 * 道具类型配置表
 * 支持扩展新道具
 */

export interface ItemConfig {
  id: string
  name: string
  spriteIndex: number
  sheet: 'char' | 'dungeon'
  /** 0x72 精灵名 (TilesetII) - 优先使用 */
  spriteName?: string
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
    spriteName: 'flask_big_red',  // 0x72 TilesetII
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
    spriteName: 'coin_anim_f0',  // 0x72 TilesetII (动画首帧)
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
    spriteName: 'flask_blue',  // 0x72 TilesetII
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
    spriteName: 'flask_big_blue',  // 0x72 TilesetII
    size: 16,
    color: '#4A9EFF',
    description: '恢复30点魔法值'
  },
  chest: {
    id: 'chest',
    name: '宝箱',
    spriteIndex: 21,
    sheet: 'dungeon',
    spriteName: 'chest_full_open_anim_f0',  // 0x72 TilesetII
    size: 16,
    color: '#8B4513',
    description: '打开可获得随机道具'
  }
}

export const ITEM_LIST = Object.values(ITEMS)

export function getItemById(id: string): ItemConfig | undefined {
  return ITEMS[id]
}

/**
 * 角色装备槽位配置（预留）
 * 后续装备系统使用 roguelikeDungeon 空闲槽位（36-120）存储装备图标
 * TODO: 实际装备精灵需从资源包中提取并放置到对应槽位
 *
 * 装备槽位规划：
 * - weapon:  武器图标槽位（索引 50）
 * - armor:  护甲图标槽位（索引 51）
 * - helmet: 头盔图标槽位（索引 52）
 * - boots:  鞋子图标槽位（索引 53）
 * - ring:   戒指图标槽位（索引 54）
 * - amulet: 护符图标槽位（索引 55）
 * - shield: 盾牌图标（已使用 dungeon 索引 34）
 *
 * 装备覆盖规则：
 * - 装备图标叠加在角色精灵上方（通过 drawEquipmentOverlay 实现）
 * - 不同装备槽位对应角色精灵不同偏移量
 */
export const EQUIPMENT_SLOTS = {
  weapon:  { spriteIndex: 50, name: '武器',  slot: 'weapon'  },
  armor:   { spriteIndex: 51, name: '护甲',  slot: 'armor'   },
  helmet:  { spriteIndex: 52, name: '头盔',  slot: 'helmet'  },
  boots:   { spriteIndex: 53, name: '鞋子',  slot: 'boots'   },
  ring:    { spriteIndex: 54, name: '戒指',  slot: 'ring'    },
  amulet:  { spriteIndex: 55, name: '护符',  slot: 'amulet'  },
} as const

export const EQUIPMENT_SHEET: 'dungeon' = 'dungeon'
