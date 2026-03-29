/**
 * 0x72 Dungeon Tileset II Asset Module
 * License: Pay What You Want (Commercial use permitted)
 * Source: https://0x72.itch.io/dungeontileset-ii
 */

// Atlas images
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

/**
 * 角色精灵映射 (职业 → 0x72 sprite name)
 * 使用 idle_anim_f0 作为正面/背面静态帧
 */
export const CHARACTER_SPRITES = {
  warrior: {
    front: 'knight_m_idle_anim_f0',
    back: 'knight_m_idle_anim_f1',
  },
  ranger: {
    front: 'elf_m_idle_anim_f0',
    back: 'elf_m_idle_anim_f1',
  },
  mage: {
    front: 'wizzard_m_idle_anim_f0',
    back: 'wizzard_m_idle_anim_f1',
  },
  cleric: {
    front: 'orc_shaman_idle_anim_f0',
    back: 'orc_shaman_idle_anim_f1',
  },
} as const;

/**
 * 怪物精灵映射 (敌人类型 → 0x72 sprite name)
 */
export const ENEMY_SPRITES = {
  basic: 'slime_idle_anim_f0',        // 史莱姆
  fast: 'goblin_idle_anim_f0',        // 蝙蝠→哥布林(快速)
  tank: 'skelet_idle_anim_f0',         // 骷髅兵
  boss: 'big_demon_idle_anim_f0',      // 恶魔
} as const;

/**
 * 武器精灵映射
 */
export const WEAPON_SPRITES = {
  sword: 'weapon_knight_sword',
  pistol: 'weapon_arrow',
  staff: 'weapon_red_magic_staff',
} as const;

/**
 * 动画帧序列 (用于循环动画)
 */
export const ANIM_FRAMES = {
  idle: ['f0', 'f1', 'f2', 'f3'] as const,
  run: ['f0', 'f1', 'f2', 'f3'] as const,
};

/**
 * 根据精灵名获取帧序列
 */
export function getAnimationFrames(baseName: string, animType: 'idle' | 'run'): string[] {
  return ANIM_FRAMES[animType].map(f => `${baseName}_${animType}_anim_${f}`);
}
