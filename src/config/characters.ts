/**
 * 角色职业配置表（从 CHARACTER_DEFS 派生）
 *
 * speed 字段是动画倍率（1/1.5），不是移动速度（CHARACTER_DEFS.speed 是 px/s）。
 * 其余字段（hp/attack/defense/spriteName/spriteRun/spriteHit/color）均来自 CHARACTER_DEFS。
 */

import { CHARACTER_DEFS } from '@shared/character-definitions'
import type { CharacterType } from '@shared/types'

export interface CharacterConfig {
  id: string
  name: string
  spriteIndex: {
    front: number
    back: number
  }
  spriteName?: {
    front: string[]
    back: string[]
  }
  spriteRun?: {
    front: string[]
    back: string[]
  }
  spriteHit?: {
    front: string
    back: string
  }
  color: string
  hp: number
  attack: number
  defense: number
  speed: number
  description: string
}

export const CHARACTERS: Record<string, CharacterConfig> = Object.fromEntries(
  (Object.entries(CHARACTER_DEFS) as [CharacterType, typeof CHARACTER_DEFS[CharacterType]][]).map(([k, v]) => [k, {
    id: k,
    name: v.name,
    spriteIndex: v.spriteIndex,
    spriteName: v.spriteName,
    spriteRun: v.spriteRun,
    spriteHit: v.spriteHit,
    color: v.color,
    hp: v.hp,
    attack: v.attack,
    defense: v.defense,
    speed: k === 'ranger' ? 1.5 : 1,
    description: v.description,
  }])
)

export const CHARACTER_LIST = Object.values(CHARACTERS)

export function getCharacterById(id: string): CharacterConfig | undefined {
  return CHARACTERS[id]
}
