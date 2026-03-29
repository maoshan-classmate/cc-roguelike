/**
 * 0x72 Dungeon Tileset II Asset Module
 * License: Pay What You Want (Commercial use permitted)
 * Source: https://0x72.itch.io/dungeontileset-ii
 *
 * 所有 0x72 资源统一出口。
 * spriteRegistry.ts 提供完整分类注册表。
 */

import mainAtlasPath from './main_atlas.png';
import floorAtlasPath from './atlas_floor-16x16.png';
import wallsLowAtlasPath from './atlas_walls_low-16x16.png';
import wallsHighAtlasPath from './atlas_walls_high-16x32.png';

export {
  mainAtlasPath,
  floorAtlasPath,
  wallsLowAtlasPath,
  wallsHighAtlasPath,
};

// Sprite atlas entries (name → {x, y, w, h} in atlas pixels)
export { SPRITE_ATLAS, type SpriteEntry } from './spriteIndex';

// 分类注册表
export {
  SPRITE_REGISTRY,
  SPRITES_BY_CATEGORY,
  GAME_ENTITY_SPRITES,
  type SpriteInfo,
  type SpriteCategory,
} from './spriteRegistry';

/**
 * 角色精灵 — 游戏职业 → 0x72 sprite name
 */
export const CHARACTER_SPRITES = {
  warrior: { front: 'knight_m_idle_anim_f0', back: 'knight_m_idle_anim_f1' },
  ranger:  { front: 'elf_m_idle_anim_f0',    back: 'elf_m_idle_anim_f1' },
  mage:    { front: 'wizzard_m_idle_anim_f0', back: 'wizzard_m_idle_anim_f1' },
  cleric:  { front: 'orc_shaman_idle_anim_f0', back: 'orc_shaman_idle_anim_f1' },
} as const;

/**
 * 怪物精灵 — 敌人类型 → 0x72 sprite name
 * 注意: basic(史莱姆) 在 atlas 中不存在，用 goblin 代替
 */
export const ENEMY_SPRITES = {
  basic: 'goblin_idle_anim_f0',   // ⚠️ slime不在atlas，fallback到goblin
  fast:  'goblin_idle_anim_f0',
  tank:  'skelet_idle_anim_f0',
  boss:  'big_demon_idle_anim_f0',
} as const;

/**
 * 武器精灵 — 游戏武器类型 → 0x72 sprite name
 */
export const WEAPON_SPRITES = {
  sword:  'weapon_knight_sword',
  pistol: 'weapon_arrow',
  staff:  'weapon_red_magic_staff',
} as const;

/**
 * 动画帧序列
 */
export const ANIM_FRAMES = {
  idle: ['f0', 'f1', 'f2', 'f3'] as const,
  run:  ['f0', 'f1', 'f2', 'f3'] as const,
};

/**
 * 根据基础名和动画类型获取帧序列
 */
export function getAnimationFrames(baseName: string, animType: 'idle' | 'run'): string[] {
  return ANIM_FRAMES[animType].map(f => `${baseName}_${animType}_anim_${f}`);
}
