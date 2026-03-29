// Auto-generated from tile_list_v1.7 - DO NOT EDIT MANUALLY
/**
 * 0x72 Dungeon Tileset II — 分类注册表
 * License: Pay What You Want (Commercial use permitted)
 * Source: https://0x72.itch.io/dungeontileset-ii
 *
 * 分类维度：语义种类（角色/怪物/场景/道具/武器/UI）
 * 尺寸/帧数 作为 metadata，不作为分类依据
 */

export type SpriteCategory =
  | 'CHARACTER'   // 游戏角色（玩家/NPC）
  | 'MONSTER'     // 怪物
  | 'WEAPON'      // 武器
  | 'ITEM'        // 可拾取道具
  | 'SCENE'       // 场景装饰（墙/地板/门/机关）
  | 'UI'          // UI元素

export interface SpriteInfo {
  name: string
  x: number; y: number; w: number; h: number
  category: SpriteCategory
  animated: boolean
  frameCount: number   // 0 = 无动画
  animType?: string    // 'idle' | 'run' | 'hit' | 'open' | 'coin' | 'spikes' | 'fountain'
  /** 游戏中的实际用途（可选） */
  gameUse?: {
    entity?: string     // 'player:warrior' | 'enemy:basic' | 'item:health'
    fallback?: string    // 当 primary 不存在时的替代
  }
}

// ─── CHARACTER ─────────────────────────────────────────────────────────────────

const CHARACTER_IDLE_FRAMES = ['f0','f1','f2','f3'] as const
const CHARACTER_RUN_FRAMES  = ['f0','f1','f2','f3'] as const

function charIdle(key: string, x: number, y: number, w: number, h: number): Record<string, SpriteInfo> {
  const entries: Record<string, SpriteInfo> = {}
  for (const f of CHARACTER_IDLE_FRAMES) {
    entries[`${key}_idle_anim_${f}`] = { name: `${key}_idle_anim_${f}`, x, y, w, h, category: 'CHARACTER', animated: true, frameCount: 4, animType: 'idle' }
  }
  return entries
}
function charRun(key: string, x: number, y: number, w: number, h: number): Record<string, SpriteInfo> {
  const entries: Record<string, SpriteInfo> = {}
  for (const f of CHARACTER_RUN_FRAMES) {
    entries[`${key}_run_anim_${f}`] = { name: `${key}_run_anim_${f}`, x, y, w, h, category: 'CHARACTER', animated: true, frameCount: 4, animType: 'run' }
  }
  return entries
}
function charHit(key: string, x: number, y: number, w: number, h: number): Record<string, SpriteInfo> {
  return {
    [`${key}_hit_anim_f0`]: { name: `${key}_hit_anim_f0`, x, y, w, h, category: 'CHARACTER', animated: false, frameCount: 1, animType: 'hit' }
  }
}

// ─── MONSTER ──────────────────────────────────────────────────────────────────

const MONSTER_IDLE_FRAMES = ['f0','f1','f2','f3'] as const
const MONSTER_RUN_FRAMES  = ['f0','f1','f2','f3'] as const

function monsterIdle(key: string, x: number, y: number, w: number, h: number, gameId?: string): Record<string, SpriteInfo> {
  const entries: Record<string, SpriteInfo> = {}
  for (const f of MONSTER_IDLE_FRAMES) {
    entries[`${key}_idle_anim_${f}`] = { name: `${key}_idle_anim_${f}`, x, y, w, h, category: 'MONSTER', animated: true, frameCount: 4, animType: 'idle', gameUse: gameId ? { entity: `enemy:${gameId}` } : undefined }
  }
  return entries
}
function monsterRun(key: string, x: number, y: number, w: number, h: number): Record<string, SpriteInfo> {
  const entries: Record<string, SpriteInfo> = {}
  for (const f of MONSTER_RUN_FRAMES) {
    entries[`${key}_run_anim_${f}`] = { name: `${key}_run_anim_${f}`, x, y, w, h, category: 'MONSTER', animated: true, frameCount: 4, animType: 'run' }
  }
  return entries
}

// ─── WEAPON ───────────────────────────────────────────────────────────────────

function weapon(key: string, x: number, y: number, w: number, h: number): Record<string, SpriteInfo> {
  return {
    [key]: { name: key, x, y, w, h, category: 'WEAPON', animated: false, frameCount: 1 }
  }
}

// ─── ITEM ─────────────────────────────────────────────────────────────────────

function item(key: string, x: number, y: number, w: number, h: number, gameId?: string): Record<string, SpriteInfo> {
  return {
    [key]: { name: key, x, y, w, h, category: 'ITEM', animated: false, frameCount: 1, gameUse: gameId ? { entity: `item:${gameId}` } : undefined }
  }
}
function itemAnim(key: string, x: number, y: number, w: number, h: number, frames: number, gameId?: string): Record<string, SpriteInfo> {
  const entries: Record<string, SpriteInfo> = {}
  for (let i = 0; i < frames; i++) {
    const fKey = `${key}_f${i}`
    entries[fKey] = { name: fKey, x, y, w, h, category: 'ITEM', animated: true, frameCount: frames, animType: 'coin', gameUse: gameId ? { entity: `item:${gameId}` } : undefined }
  }
  return entries
}

// ─── SCENE ────────────────────────────────────────────────────────────────────

function scene(key: string, x: number, y: number, w: number, h: number): Record<string, SpriteInfo> {
  return {
    [key]: { name: key, x, y, w, h, category: 'SCENE', animated: false, frameCount: 1 }
  }
}
function sceneAnim(key: string, x: number, y: number, w: number, h: number, frames: number, animType = 'open'): Record<string, SpriteInfo> {
  const entries: Record<string, SpriteInfo> = {}
  for (let i = 0; i < frames; i++) {
    const fKey = `${key}_f${i}`
    entries[fKey] = { name: fKey, x, y, w, h, category: 'SCENE', animated: true, frameCount: frames, animType }
  }
  return entries
}

// ─── UI ───────────────────────────────────────────────────────────────────────

function ui(key: string, x: number, y: number, w: number, h: number): Record<string, SpriteInfo> {
  return {
    [key]: { name: key, x, y, w, h, category: 'UI', animated: false, frameCount: 1 }
  }
}

// ─── SPRITE REGISTRY ─────────────────────────────────────────────────────────

export const SPRITE_REGISTRY: Record<string, SpriteInfo> = {
  // ── CHARACTER (16×28) ──────────────────────────────────────────────────
  // knight_m (warrior)
  ...charIdle('knight_m', 128, 100, 16, 28),
  ...charRun('knight_m', 192, 100, 16, 28),
  ...charHit('knight_m', 256, 100, 16, 28),
  // knight_f
  ...charIdle('knight_f', 128, 68, 16, 28),
  ...charRun('knight_f', 192, 68, 16, 28),
  ...charHit('knight_f', 256, 68, 16, 28),
  // elf_m (ranger)
  ...charIdle('elf_m', 128, 36, 16, 28),
  ...charRun('elf_m', 192, 36, 16, 28),
  ...charHit('elf_m', 256, 36, 16, 28),
  // elf_f
  ...charIdle('elf_f', 128, 4, 16, 28),
  ...charRun('elf_f', 192, 4, 16, 28),
  ...charHit('elf_f', 256, 4, 16, 28),
  // wizzard_m (mage)
  ...charIdle('wizzard_m', 128, 164, 16, 28),
  ...charRun('wizzard_m', 192, 164, 16, 28),
  ...charHit('wizzard_m', 256, 164, 16, 28),
  // wizzard_f
  ...charIdle('wizzard_f', 128, 132, 16, 28),
  ...charRun('wizzard_f', 192, 132, 16, 28),
  ...charHit('wizzard_f', 256, 132, 16, 28),
  // dwarf_m
  ...charIdle('dwarf_m', 128, 292, 16, 28),
  ...charRun('dwarf_m', 192, 292, 16, 28),
  ...charHit('dwarf_m', 256, 292, 16, 28),
  // dwarf_f
  ...charIdle('dwarf_f', 128, 260, 16, 28),
  ...charRun('dwarf_f', 192, 260, 16, 28),
  ...charHit('dwarf_f', 256, 260, 16, 28),
  // lizard_m
  ...charIdle('lizard_m', 128, 228, 16, 28),
  ...charRun('lizard_m', 192, 228, 16, 28),
  ...charHit('lizard_m', 256, 228, 16, 28),
  // lizard_f
  ...charIdle('lizard_f', 128, 196, 16, 28),
  ...charRun('lizard_f', 192, 196, 16, 28),
  ...charHit('lizard_f', 256, 196, 16, 28),

  // ── MONSTER ─────────────────────────────────────────────────────────────
  // goblin (fast enemy, 16×16)
  ...monsterIdle('goblin', 368, 40, 16, 16, 'fast'),
  ...monsterRun('goblin', 432, 40, 16, 16),
  // skelet (tank enemy, 16×16)
  ...monsterIdle('skelet', 368, 88, 16, 16, 'tank'),
  ...monsterRun('skelet', 432, 88, 16, 16),
  // imp (16×16)
  ...monsterIdle('imp', 368, 64, 16, 16),
  ...monsterRun('imp', 432, 64, 16, 16),
  // angel (16×16)
  ...monsterIdle('angel', 368, 304, 16, 16),
  ...monsterRun('angel', 432, 304, 16, 16),
  // tiny_zombie (16×16)
  ...monsterIdle('tiny_zombie', 368, 16, 16, 16),
  ...monsterRun('tiny_zombie', 432, 16, 16, 16),
  // chort (16×23)
  ...monsterIdle('chort', 368, 273, 16, 23),
  ...monsterRun('chort', 432, 273, 16, 23),
  // necromancer (16×23)
  ...monsterIdle('necromancer', 368, 225, 16, 23),
  // masked_orc (16×23)
  ...monsterIdle('masked_orc', 368, 153, 16, 23),
  ...monsterRun('masked_orc', 432, 153, 16, 23),
  // orc_warrior (16×23)
  ...monsterIdle('orc_warrior', 368, 177, 16, 23),
  ...monsterRun('orc_warrior', 432, 177, 16, 23),
  // orc_shaman (cleric, 16×23)
  ...monsterIdle('orc_shaman', 368, 201, 16, 23, 'cleric'),
  ...monsterRun('orc_shaman', 432, 201, 16, 23),
  // wogol (16×23)
  ...monsterIdle('wogol', 368, 249, 16, 23),
  ...monsterRun('wogol', 432, 249, 16, 23),
  // doc (16×23)
  ...monsterIdle('doc', 368, 345, 16, 23),
  ...monsterRun('doc', 432, 345, 16, 23),
  // pumpkin_dude (16×23)
  ...monsterIdle('pumpkin_dude', 368, 321, 16, 23),
  ...monsterRun('pumpkin_dude', 432, 321, 16, 23),
  // swampy (16×16)
  ...monsterIdle('swampy', 432, 112, 16, 16),
  // muddy (16×16)
  ...monsterIdle('muddy', 368, 112, 16, 16),
  // slug (16×23)
  ...monsterIdle('slug', 368, 369, 16, 23),
  // tiny_slug (16×16)
  ...monsterIdle('tiny_slug', 432, 376, 16, 16),
  // ice_zombie (16×16)
  ...monsterIdle('ice_zombie', 432, 136, 16, 16),
  // zombie (f10 typo — treated as f0/f1/f2/f3)
  ...monsterIdle('zombie', 368, 136, 16, 16),
  // big_demon (boss, 32×36)
  ...monsterIdle('big_demon', 16, 428, 32, 36, 'boss'),
  ...monsterRun('big_demon', 144, 428, 32, 36),
  // big_zombie (32×36)
  ...monsterIdle('big_zombie', 16, 332, 32, 36),
  ...monsterRun('big_zombie', 144, 332, 32, 36),
  // ogre (32×36)
  ...monsterIdle('ogre', 16, 380, 32, 36),
  ...monsterRun('ogre', 144, 380, 32, 36),

  // ── WEAPON ──────────────────────────────────────────────────────────────
  ...weapon('weapon_anime_sword',    322, 65, 12, 30),
  ...weapon('weapon_arrow',          324, 202, 7, 21),
  ...weapon('weapon_axe',            341, 74, 9, 21),
  ...weapon('weapon_baton_with_spikes', 323, 41, 10, 22),
  ...weapon('weapon_big_hammer',     291, 26, 10, 37),
  ...weapon('weapon_bow',            289, 195, 14, 26),
  ...weapon('weapon_bow_2',         305, 195, 14, 26),
  ...weapon('weapon_cleaver',        310, 108, 9, 19),
  ...weapon('weapon_double_axe',     288, 167, 16, 24),
  ...weapon('weapon_duel_sword',     325, 97, 9, 30),
  ...weapon('weapon_golden_sword',   291, 137, 10, 22),
  ...weapon('weapon_green_magic_staff', 340, 129, 8, 30),
  ...weapon('weapon_hammer',         307, 39, 10, 24),
  ...weapon('weapon_katana',         293, 66, 6, 29),
  ...weapon('weapon_knife',          293, 10, 6, 13),
  ...weapon('weapon_knight_sword',   339, 98, 10, 29),
  ...weapon('weapon_lavish_sword',   307, 129, 10, 30),
  ...weapon('weapon_mace',           339, 39, 10, 24),
  ...weapon('weapon_machete',        294, 105, 5, 22),
  ...weapon('weapon_red_gem_sword',  339, 10, 10, 21),
  ...weapon('weapon_red_magic_staff', 324, 129, 8, 30),
  ...weapon('weapon_regular_sword',  323, 10, 10, 21),
  ...weapon('weapon_rusty_sword',    307, 10, 10, 21),
  ...weapon('weapon_saw_sword',      307, 70, 10, 25),
  ...weapon('weapon_spear',          309, 161, 6, 30),
  ...weapon('weapon_waraxe',         324, 168, 12, 23),
  ...weapon('weapon_throwing_axe',   340, 161, 10, 14),

  // ── ITEM ────────────────────────────────────────────────────────────────
  // 医疗/能量瓶（无动画）
  ...item('flask_big_red',   288, 336, 16, 16, 'health'),
  ...item('flask_big_blue',  304, 336, 16, 16, 'energy'),
  ...item('flask_big_green', 320, 336, 16, 16),
  ...item('flask_big_yellow', 336, 336, 16, 16),
  ...item('flask_blue',      304, 352, 16, 16, 'potion'),
  ...item('flask_red',       288, 352, 16, 16),
  ...item('flask_green',     320, 352, 16, 16),
  ...item('flask_yellow',    336, 352, 16, 16),
  // coin (4帧动画)
  ...itemAnim('coin_anim', 289, 385, 6, 7, 4, 'coin'),
  // chest (3帧开门动画)
  ...itemAnim('chest_full_open_anim',  304, 416, 16, 16, 3, 'chest'),
  ...itemAnim('chest_empty_open_anim',  304, 400, 16, 16, 3),
  ...itemAnim('chest_mimic_open_anim',  304, 432, 16, 16, 3),
  // bomb (3帧动画)
  ...itemAnim('bomb', 288, 320, 16, 16, 3),
  // 静态道具
  ...item('crate', 288, 408, 16, 24, 'shield'),
  ...item('skull', 288, 432, 16, 16, 'key'),

  // ── SCENE ──────────────────────────────────────────────────────────────
  // 地板
  ...scene('floor_1',  16, 64, 16, 16),
  ...scene('floor_2',  32, 64, 16, 16),
  ...scene('floor_3',  48, 64, 16, 16),
  ...scene('floor_4',  16, 80, 16, 16),
  ...scene('floor_5',  32, 80, 16, 16),
  ...scene('floor_6',  48, 80, 16, 16),
  ...scene('floor_7',  16, 96, 16, 16),
  ...scene('floor_8',  32, 96, 16, 16),
  ...scene('floor_stairs', 80, 192, 16, 16),
  ...scene('floor_ladder',  48, 96, 16, 16),
  ...scene('hole',  96, 144, 16, 16),
  // 地板陷阱（4帧动画）
  ...sceneAnim('floor_spikes_anim', 16, 192, 16, 16, 4, 'spikes'),
  // 墙壁
  ...scene('wall_left',     16, 16, 16, 16),
  ...scene('wall_mid',      32, 16, 16, 16),
  ...scene('wall_right',    48, 16, 16, 16),
  ...scene('wall_top_left',  16, 0, 16, 16),
  ...scene('wall_top_mid',   32, 0, 16, 16),
  ...scene('wall_top_right', 48, 0, 16, 16),
  // 门
  ...scene('doors_frame_left',   16, 240, 16, 32),
  ...scene('doors_frame_right',  64, 240, 16, 32),
  ...scene('doors_frame_top',    32, 224, 32, 16),
  ...scene('doors_leaf_closed',  32, 240, 32, 32),
  ...scene('doors_leaf_open',    80, 240, 32, 32),
  // 装饰
  ...scene('column',      80, 80, 16, 48),
  ...scene('column_wall', 96, 80, 16, 48),
  ...scene('crate',      288, 408, 16, 24),
  ...scene('edge_down',  96, 128, 16, 16),
  // 墙装饰
  ...scene('wall_goo_base', 64, 96, 16, 16),
  ...scene('wall_goo',     64, 80, 16, 16),
  ...scene('wall_hole_1',  48, 32, 16, 16),
  ...scene('wall_hole_2',  48, 48, 16, 16),
  ...scene('wall_banner_blue',   32, 32, 16, 16),
  ...scene('wall_banner_red',    16, 32, 16, 16),
  ...scene('wall_banner_green',  16, 48, 16, 16),
  ...scene('wall_banner_yellow', 32, 48, 16, 16),
  // 墙边缘
  ...scene('wall_edge_bottom_left',    32, 168, 16, 16),
  ...scene('wall_edge_bottom_right',   48, 168, 16, 16),
  ...scene('wall_edge_mid_left',       32, 152, 16, 16),
  ...scene('wall_edge_top_left',       31, 120, 16, 16),
  ...scene('wall_edge_left',           32, 136, 16, 16),
  ...scene('wall_edge_top_right',      48, 120, 16, 16),
  ...scene('wall_edge_right',          48, 136, 16, 16),
  ...scene('wall_edge_mid_right',      48, 152, 16, 16),
  ...scene('wall_edge_tshape_bottom_right', 64, 152, 16, 16),
  ...scene('wall_edge_tshape_bottom_left',  80, 152, 16, 16),
  ...scene('wall_edge_tshape_right',       64, 168, 16, 16),
  ...scene('wall_edge_tshape_left',        80, 168, 16, 16),
  // 外墙
  ...scene('wall_outer_front_right',  16, 168, 16, 16),
  ...scene('wall_outer_front_left',    0, 168, 16, 16),
  ...scene('wall_outer_mid_left',      0, 152, 16, 16),
  ...scene('wall_outer_top_left',      0, 136, 16, 16),
  ...scene('wall_outer_top_right',    16, 136, 16, 16),
  ...scene('wall_outer_mid_right',    16, 152, 16, 16),
  // 喷泉（3帧动画）
  ...sceneAnim('wall_fountain_mid_blue_anim', 64, 48, 16, 16, 3, 'fountain'),
  ...sceneAnim('wall_fountain_mid_red_anim',  64, 16, 16, 16, 3, 'fountain'),
  ...sceneAnim('wall_fountain_basin_red_anim',  64, 32, 16, 16, 3, 'fountain'),
  ...sceneAnim('wall_fountain_basin_blue_anim', 64, 64, 16, 16, 3, 'fountain'),
  // 喷泉顶
  ...scene('wall_fountain_top_1', 64, 0, 16, 16),
  ...scene('wall_fountain_top_2', 80, 0, 16, 16),
  ...scene('wall_fountain_top_3', 96, 0, 16, 16),
  // 机关
  ...scene('button_red_up',   16, 208, 16, 16),
  ...scene('button_red_down', 32, 208, 16, 16),
  ...scene('button_blue_up',  48, 208, 16, 16),
  ...scene('button_blue_down', 64, 208, 16, 16),
  ...scene('lever_left',  80, 208, 16, 16),
  ...scene('lever_right', 96, 208, 16, 16),

  // ── UI ─────────────────────────────────────────────────────────────────
  ...ui('ui_heart_full',  289, 370, 13, 12),
  ...ui('ui_heart_empty', 321, 370, 13, 12),
  ...ui('ui_heart_half',  305, 370, 13, 12),
}

// ─── 辅助：按 category 索引 ────────────────────────────────────────────────

export const SPRITES_BY_CATEGORY: Record<SpriteCategory, string[]> = {
  CHARACTER:  [],
  MONSTER:   [],
  WEAPON:    [],
  ITEM:      [],
  SCENE:     [],
  UI:        [],
}

for (const [name, info] of Object.entries(SPRITE_REGISTRY)) {
  SPRITES_BY_CATEGORY[info.category].push(name)
}

// ─── 辅助：游戏实体快速查找表 ────────────────────────────────────────────────

export const GAME_ENTITY_SPRITES: Record<string, { idle: string; run?: string; category: SpriteCategory }> = {
  // 角色
  'player:warrior': { idle: 'knight_m_idle_anim_f0', category: 'CHARACTER' },
  'player:ranger':  { idle: 'elf_m_idle_anim_f0',    category: 'CHARACTER' },
  'player:mage':    { idle: 'wizzard_m_idle_anim_f0', category: 'CHARACTER' },
  'player:cleric':  { idle: 'orc_shaman_idle_anim_f0', category: 'CHARACTER' },
  // 怪物
  'enemy:basic': { idle: 'goblin_idle_anim_f0', category: 'MONSTER' },
  'enemy:fast':  { idle: 'goblin_idle_anim_f0', category: 'MONSTER' },
  'enemy:tank':  { idle: 'skelet_idle_anim_f0', category: 'MONSTER' },
  'enemy:boss':  { idle: 'big_demon_idle_anim_f0', category: 'MONSTER' },
  // 道具
  'item:health':  { idle: 'flask_big_red',    category: 'ITEM' },
  'item:energy':  { idle: 'flask_big_blue',   category: 'ITEM' },
  'item:coin':    { idle: 'coin_anim_f0',      category: 'ITEM' },
  'item:key':     { idle: 'skull',             category: 'ITEM' },
  'item:potion':  { idle: 'flask_blue',        category: 'ITEM' },
  'item:shield':  { idle: 'crate',              category: 'ITEM' },
  'item:chest':   { idle: 'chest_full_open_anim_f0', category: 'ITEM' },
  // 武器
  'weapon:sword':  { idle: 'weapon_knight_sword',  category: 'WEAPON' },
  'weapon:pistol': { idle: 'weapon_arrow',         category: 'WEAPON' },
  'weapon:staff':  { idle: 'weapon_red_magic_staff', category: 'WEAPON' },
}
