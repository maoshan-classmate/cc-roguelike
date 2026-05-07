/**
 * 敌人类型配置表（从 ENEMY_DEFS 派生）
 *
 * 数值以 shared/enemy-definitions.ts ENEMY_DEFS 为唯一数据源。
 * 客户端不读 speed 做游戏逻辑（服务端权威），此处保留仅为接口兼容。
 */

import { ENEMY_DEFS } from '@shared/enemy-definitions'
import type { EnemyType } from '@shared/types'

export interface EnemyConfig {
  id: string
  name: string
  spriteIndex: number
  sheet: 'char' | 'dungeon' | 'sheet'
  spriteName?: string
  size: number
  hp: number
  attack: number
  speed: number
  color: string
  isBoss?: boolean
  dropTable?: { itemId: string; chance: number }[]
}

export const ENEMIES: Record<string, EnemyConfig> = Object.fromEntries(
  (Object.entries(ENEMY_DEFS) as [EnemyType, typeof ENEMY_DEFS[EnemyType]][]).map(([k, v]) => [k, {
    id: k,
    name: v.name,
    spriteIndex: v.spriteIndex,
    sheet: v.sheet,
    spriteName: v.spriteName,
    size: v.size,
    hp: v.hp,
    attack: v.attack,
    speed: v.speed,
    color: v.color,
    isBoss: v.isBoss,
    dropTable: v.dropTable,
  }])
)
