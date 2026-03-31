/**
 * 统一 Sprite Registry + 精灵渲染工具
 *
 * 分类体系：CHARACTER / MONSTER / WEAPON / ITEM / SCENE / UI
 * 资源来源：kenney (索引式) + 0x72 (atlas 坐标式)
 */

import { TILE_SIZE, TILE_MARGIN } from '../assets/kenney'
import { SPRITE_ATLAS, type SpriteEntry } from '../assets/0x72/spriteIndex'

// ─── 统一类型定义 ────────────────────────────────────────────────────────────────

export type SpriteSource = 'kenney' | '0x72'

export type SpriteCategory =
  | 'CHARACTER'   // 游戏角色（玩家）
  | 'MONSTER'     // 怪物
  | 'WEAPON'      // 武器
  | 'ITEM'        // 可拾取道具
  | 'SCENE'       // 场景（墙/地板/门/机关）
  | 'UI'          // UI 元素

export interface UnifiedSpriteEntry {
  category: SpriteCategory
  source: SpriteSource
  /** kenney: spritesheet grid index (number); 0x72: atlas key (string) */
  atlasKey: string | number
  size: number         // 默认渲染尺寸 px
  animated: boolean
  frameCount: number    // 0 = 静态
}

// ─── 统一 Sprite Registry ─────────────────────────────────────────────────────

export const SPRITE_REGISTRY: Record<string, UnifiedSpriteEntry> = {

  // ── CHARACTER ────────────────────────────────────────────────────────────────
  // key = spriteName 值（与 config 保持一致），atlasKey = 0x72 atlas 键
  knight_m_idle_anim_f0:  { category: 'CHARACTER', source: '0x72', atlasKey: 'knight_m_idle_anim_f0',  size: 48, animated: true,  frameCount: 4 },
  knight_m_idle_anim_f1:  { category: 'CHARACTER', source: '0x72', atlasKey: 'knight_m_idle_anim_f1',  size: 48, animated: true,  frameCount: 4 },
  elf_m_idle_anim_f0:     { category: 'CHARACTER', source: '0x72', atlasKey: 'elf_m_idle_anim_f0',      size: 48, animated: true,  frameCount: 4 },
  elf_m_idle_anim_f1:     { category: 'CHARACTER', source: '0x72', atlasKey: 'elf_m_idle_anim_f1',      size: 48, animated: true,  frameCount: 4 },
  wizzard_m_idle_anim_f0: { category: 'CHARACTER', source: '0x72', atlasKey: 'wizzard_m_idle_anim_f0', size: 48, animated: true,  frameCount: 4 },
  wizzard_m_idle_anim_f1: { category: 'CHARACTER', source: '0x72', atlasKey: 'wizzard_m_idle_anim_f1', size: 48, animated: true,  frameCount: 4 },
  wizzard_f_idle_anim_f0: { category: 'CHARACTER', source: '0x72', atlasKey: 'wizzard_f_idle_anim_f0', size: 48, animated: true,  frameCount: 4 },
  wizzard_f_idle_anim_f1: { category: 'CHARACTER', source: '0x72', atlasKey: 'wizzard_f_idle_anim_f1', size: 48, animated: true,  frameCount: 4 },
  // wizzard_f_idle_anim_f2/f3: 存在于atlas但未被任何角色使用（cleric仅用f0/f1），不注册
  // orc_shaman_idle_anim_f0/f1: ⚠️ 已废弃，代码无引用，不注册

  // Kenney fallback CHARACTER
  warrior_kenney: { category: 'CHARACTER', source: 'kenney', atlasKey: 0,   size: 16, animated: false, frameCount: 1 },
  ranger_kenney: { category: 'CHARACTER', source: 'kenney', atlasKey: 162, size: 16, animated: false, frameCount: 1 },
  mage_kenney:   { category: 'CHARACTER', source: 'kenney', atlasKey: 108, size: 16, animated: false, frameCount: 1 },
  cleric_kenney: { category: 'CHARACTER', source: 'kenney', atlasKey: 378, size: 16, animated: false, frameCount: 1 },

  // ── MONSTER ────────────────────────────────────────────────────────────────
  goblin_idle_anim_f0:   { category: 'MONSTER', source: '0x72', atlasKey: 'goblin_idle_anim_f0',   size: 32, animated: true,  frameCount: 4 },
  skelet_idle_anim_f0:   { category: 'MONSTER', source: '0x72', atlasKey: 'skelet_idle_anim_f0',   size: 32, animated: true,  frameCount: 4 },
  big_demon_idle_anim_f0:{ category: 'MONSTER', source: '0x72', atlasKey: 'big_demon_idle_anim_f0',size: 64, animated: true,  frameCount: 4 },

  // Kenney fallback MONSTER
  slime_kenney: { category: 'MONSTER', source: 'kenney', atlasKey: 1671, size: 16, animated: false, frameCount: 1 },
  bat_kenney:   { category: 'MONSTER', source: 'kenney', atlasKey: 1665, size: 16, animated: false, frameCount: 1 },
  boss_kenney:  { category: 'MONSTER', source: 'kenney', atlasKey: 1668, size: 16, animated: false, frameCount: 1 },

  // ── WEAPON ────────────────────────────────────────────────────────────────
  weapon_knight_sword:    { category: 'WEAPON', source: '0x72', atlasKey: 'weapon_knight_sword',   size: 32, animated: false, frameCount: 1 },
  weapon_arrow:          { category: 'WEAPON', source: '0x72', atlasKey: 'weapon_arrow',          size: 32, animated: false, frameCount: 1 },
  weapon_red_magic_staff: { category: 'WEAPON', source: '0x72', atlasKey: 'weapon_red_magic_staff', size: 32, animated: false, frameCount: 1 },
  weapon_axe:             { category: 'WEAPON', source: '0x72', atlasKey: 'weapon_axe',             size: 32, animated: false, frameCount: 1 },
  weapon_katana:          { category: 'WEAPON', source: '0x72', atlasKey: 'weapon_katana',          size: 32, animated: false, frameCount: 1 },
  weapon_bow:             { category: 'WEAPON', source: '0x72', atlasKey: 'weapon_bow',             size: 32, animated: false, frameCount: 1 },

  // ── ITEM ─────────────────────────────────────────────────────────────────
  flask_big_red:      { category: 'ITEM', source: '0x72', atlasKey: 'flask_big_red',      size: 28, animated: false, frameCount: 1 },
  flask_big_blue:     { category: 'ITEM', source: '0x72', atlasKey: 'flask_big_blue',     size: 28, animated: false, frameCount: 1 },
  flask_blue:         { category: 'ITEM', source: '0x72', atlasKey: 'flask_blue',         size: 28, animated: false, frameCount: 1 },
  coin_anim_f0:        { category: 'ITEM', source: '0x72', atlasKey: 'coin_anim_f0',      size: 28, animated: true,  frameCount: 4 },
  skull:               { category: 'ITEM', source: '0x72', atlasKey: 'skull',             size: 28, animated: false, frameCount: 1 },
  crate:               { category: 'ITEM', source: '0x72', atlasKey: 'crate',             size: 28, animated: false, frameCount: 1 },
  chest_full_open_anim_f0:{ category:'ITEM',source:'0x72',atlasKey:'chest_full_open_anim_f0', size: 28, animated: true, frameCount: 3 },

  // Kenney fallback ITEM（bullet 使用 drawDungeonSprite(idx=35) 直接渲染，无需注册）
  health_kenney: { category: 'ITEM', source: 'kenney', atlasKey: 29, size: 16, animated: false, frameCount: 1 },
  energy_kenney: { category: 'ITEM', source: 'kenney', atlasKey: 30, size: 16, animated: false, frameCount: 1 },
  coin_kenney:   { category: 'ITEM', source: 'kenney', atlasKey: 31, size: 16, animated: false, frameCount: 1 },

  // ── SCENE ────────────────────────────────────────────────────────────────
  wall_left:        { category: 'SCENE', source: '0x72', atlasKey: 'wall_left',        size: 32, animated: false, frameCount: 1 },
  wall_mid:         { category: 'SCENE', source: '0x72', atlasKey: 'wall_mid',         size: 32, animated: false, frameCount: 1 },
  wall_right:       { category: 'SCENE', source: '0x72', atlasKey: 'wall_right',       size: 32, animated: false, frameCount: 1 },
  // floor_stairs: 游戏使用 Kenney roguelikeDungeon index=23（出口楼梯）
  // 注：0x72 atlas 也有 floor_stairs (x=80,y=192) 但与 Kenney idx=23 是不同 sprite，未被游戏使用
  floor_stairs:     { category: 'SCENE', source: 'kenney', atlasKey: 23,               size: 32, animated: false, frameCount: 1 },
  doors_leaf_closed: { category: 'SCENE', source: '0x72', atlasKey: 'doors_leaf_closed', size: 64, animated: false, frameCount: 1 },

  // ── UI ──────────────────────────────────────────────────────────────────
  ui_heart_full:   { category: 'UI', source: '0x72', atlasKey: 'ui_heart_full',   size: 26, animated: false, frameCount: 1 },
  ui_heart_empty:  { category: 'UI', source: '0x72', atlasKey: 'ui_heart_empty',  size: 26, animated: false, frameCount: 1 },
  ui_heart_half:   { category: 'UI', source: '0x72', atlasKey: 'ui_heart_half',   size: 26, animated: false, frameCount: 1 },
}

// ─── Registry 工具函数 ─────────────────────────────────────────────────────────

/**
 * 按 spriteName 查找 Registry 条目（registry key = spriteName）
 */
export function getSpriteEntry(spriteName: string): UnifiedSpriteEntry | undefined {
  return SPRITE_REGISTRY[spriteName]
}

/**
 * 按分类查找所有条目
 */
export function getSpritesByCategory(category: SpriteCategory): UnifiedSpriteEntry[] {
  return Object.values(SPRITE_REGISTRY).filter(e => e.category === category)
}

/**
 * 判断某条目是否使用 0x72 资源
 */
export function is0x72Sprite(id: string): boolean {
  return SPRITE_REGISTRY[id]?.source === '0x72'
}

// ─── 以下为原有绘图工具（保持不变）───────────────────────────────────────────

// 精灵图规格
const CHAR_SPRITESHEET_WIDTH = 918
const DUNGEON_SPRITESHEET_WIDTH = 492
const SHEET_SPRITESHEET_WIDTH = 968

/**
 * 计算精灵在 spritesheet 中的坐标 (Kenney 索引式)
 */
export function getSpritePosition(
  index: number,
  sheetWidth: number,
  tileSize: number = TILE_SIZE,
  margin: number = TILE_MARGIN
): { x: number; y: number } {
  const spritesPerRow = Math.floor(sheetWidth / (tileSize + margin))
  const row = Math.floor(index / spritesPerRow)
  const col = index % spritesPerRow
  return {
    x: col * (tileSize + margin),
    y: row * (tileSize + margin)
  }
}

/**
 * 绘制 0x72 TilesetII 精灵 (atlas x/y/w/h 坐标)
 */
export function draw0x72Sprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  spriteName: string,
  x: number,
  y: number,
  size: number = 32
): void {
  const entry: SpriteEntry | undefined = SPRITE_ATLAS[spriteName]
  if (!entry) {
    console.warn(`[0x72] Sprite not found: ${spriteName}`)
    return
  }
  const scale = size / Math.max(entry.w, entry.h)
  const drawW = entry.w * scale
  const drawH = entry.h * scale
  ctx.drawImage(img, entry.x, entry.y, entry.w, entry.h, x - drawW / 2, y - drawH / 2, drawW, drawH)
}

/**
 * 绘制角色精灵 (Kenney roguelikeChar)
 */
export function drawCharacterSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  index: number,
  x: number,
  y: number,
  size: number = TILE_SIZE
): void {
  const pos = getSpritePosition(index, CHAR_SPRITESHEET_WIDTH)
  const halfSize = size / 2
  ctx.drawImage(img, pos.x, pos.y, TILE_SIZE, TILE_SIZE, x - halfSize, y - halfSize, size, size)
}

/**
 * 绘制地牢/道具精灵 (Kenney roguelikeDungeon)
 */
export function drawDungeonSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  index: number,
  x: number,
  y: number,
  size: number = TILE_SIZE
): void {
  const pos = getSpritePosition(index, DUNGEON_SPRITESHEET_WIDTH)
  const halfSize = size / 2
  ctx.drawImage(img, pos.x, pos.y, TILE_SIZE, TILE_SIZE, x - halfSize, y - halfSize, size, size)
}

/**
 * 绘制综合表精灵 (Kenney roguelikeSheet — 怪物)
 */
export function drawSheetSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  index: number,
  x: number,
  y: number,
  size: number = TILE_SIZE
): void {
  const pos = getSpritePosition(index, SHEET_SPRITESHEET_WIDTH)
  const halfSize = size / 2
  ctx.drawImage(img, pos.x, pos.y, TILE_SIZE, TILE_SIZE, x - halfSize, y - halfSize, size, size)
}

/**
 * 绘制像素边框矩形
 */
export function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number,
  color: string,
  borderColor: string = '#8B4513',
  borderWidth: number = 2
): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, width, height)
  ctx.strokeStyle = borderColor
  ctx.lineWidth = borderWidth
  ctx.strokeRect(x, y, width, height)
}

/**
 * 绘制像素血条
 */
export function drawHPBar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number,
  current: number, max: number,
  color: string = '#32CD32',
  bgColor: string = '#1a0f1e'
): void {
  const percent = Math.min(1, Math.max(0, current / max))
  ctx.fillStyle = bgColor
  ctx.fillRect(x, y, width, height)
  const fillWidth = (width - 2) * percent
  if (fillWidth > 0) {
    ctx.fillStyle = color
    ctx.fillRect(x + 1, y + 1, fillWidth, height - 2)
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(x + 1, y + 1, fillWidth, Math.floor((height - 2) / 2))
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(x + 1, y + height - 2, fillWidth, 1)
  }
  ctx.fillStyle = 'rgba(139,69,19,0.8)'
  ctx.fillRect(x, y, width, 1)
  ctx.fillRect(x, y, 1, height)
  ctx.fillStyle = 'rgba(50,20,5,0.9)'
  ctx.fillRect(x, y + height - 1, width, 1)
  ctx.fillRect(x + width - 1, y, 1, height)
}

/**
 * 绘制 BOSS 皇冠
 */
export function drawBossCrown(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number = 16
): void {
  const s = Math.round(size / 8)
  const cx = Math.round(x)
  ctx.fillStyle = '#FFD700'
  ctx.fillRect(cx - 4 * s, y + 2 * s, 8 * s, 2 * s)
  ctx.fillRect(cx - 4 * s, y, 2 * s, 4 * s)
  ctx.fillRect(cx - 1 * s, y - 1 * s, 2 * s, 5 * s)
  ctx.fillRect(cx + 2 * s, y, 2 * s, 4 * s)
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(cx - 4 * s, y + 2 * s, 8 * s, 1 * s)
  ctx.fillRect(cx - 4 * s, y, 2 * s, 1 * s)
  ctx.fillRect(cx - 1 * s, y - 1 * s, 2 * s, 1 * s)
  ctx.fillRect(cx + 2 * s, y, 2 * s, 1 * s)
  ctx.fillStyle = '#DC143C'
  ctx.fillRect(cx - 3 * s, y + 2 * s, 1 * s, 1 * s)
  ctx.fillStyle = '#4A9EFF'
  ctx.fillRect(cx, y + 2 * s, 1 * s, 1 * s)
  ctx.fillStyle = '#32CD32'
  ctx.fillRect(cx + 3 * s, y + 2 * s, 1 * s, 1 * s)
}

/**
 * 绘制方向指示器
 */
export function drawDirectionArrow(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, angle: number, size: number = 8
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const p = Math.max(1, Math.round(size / 4))
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(1 * p, -1 * p + 1, 4 * p, 2 * p)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(3 * p, -1 * p, 2 * p, 2 * p)
  ctx.fillRect(-1 * p, 0, 4 * p, p)
  ctx.restore()
}

/**
 * 绘制名称标签
 */
export function drawNameTag(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, name: string,
  color: string = '#FFFFFF', fontSize: number = 10
): void {
  ctx.font = `${fontSize}px "Kenney Mini Square Mono", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  const metrics = ctx.measureText(name)
  const textWidth = metrics.width
  const padding = 3
  ctx.fillStyle = 'rgba(26,15,30,0.75)'
  ctx.fillRect(x - textWidth / 2 - padding, y - fontSize - 1, textWidth + padding * 2, fontSize + 3)
  ctx.fillStyle = color
  ctx.fillText(name, x, y)
}

/**
 * 绘制近战武器扇形攻击范围（视觉指示器）
 * 在玩家朝向方向绘制一个扇形区域
 */
export function drawMeleeArc(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,       // 玩家朝向角度
  range: number,      // 武器范围 (px)
  arc: number,        // 扇形弧度 (rad)
  color: string,
  alpha: number = 0.25
): void {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.arc(x, y, range, angle - arc / 2, angle + arc / 2)
  ctx.closePath()
  ctx.fill()

  // 扇形边缘高亮
  ctx.globalAlpha = alpha * 1.5
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + Math.cos(angle - arc / 2) * range, y + Math.sin(angle - arc / 2) * range)
  ctx.moveTo(x, y)
  ctx.lineTo(x + Math.cos(angle + arc / 2) * range, y + Math.sin(angle + arc / 2) * range)
  ctx.stroke()
  ctx.restore()
}

/**
 * 绘制远程武器指示器（手枪/法杖末端小矩形）
 */
export function drawRangedWeapon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  angle: number,
  weaponLength: number = 20,
  weaponColor: string = '#C0C0C0'
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  // 武器是一个小矩形，从角色中心向外延伸
  ctx.fillStyle = weaponColor
  ctx.fillRect(0, -3, weaponLength, 6)
  // 武器顶端高光
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillRect(0, -3, weaponLength, 2)
  ctx.restore()
}

/**
 * 绘制武器精灵（0x72 atlas 真实贴图，旋转至鼠标方向）
 * 武器从玩家中心向外延伸，限制最大宽高使贴图不变形
 * @param flash 攻击闪光强度 0-1，攻击时为正，渲染更亮+武器前伸
 */
export function drawWeaponSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  spriteName: string,
  x: number, y: number,
  angle: number,
  maxSize: number = 28,  // 最大宽/高（px），防止细小sprite被过度放大
  flash: number = 0      // 攻击闪光 0-1
): void {
  const entry = SPRITE_ATLAS[spriteName]
  if (!entry) return
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  // 按宽度比例缩放，限制最大尺寸
  const targetW = Math.min(entry.w, maxSize)
  const scale = targetW / entry.w
  const drawW = entry.w * scale
  const drawH = entry.h * scale

  // 攻击闪光：武器前伸 + 发光
  const attackOffset = flash * 12  // 最多前移12px

  // 发光层
  if (flash > 0) {
    ctx.shadowColor = '#FFD700'
    ctx.shadowBlur = 20 * flash
  }

  // 武器从玩家中心向右（angle方向）延伸；y偏移使武器视觉上居中于玩家
  ctx.drawImage(img, entry.x, entry.y, entry.w, entry.h, drawW * 0.2 + attackOffset, -drawH / 2, drawW, drawH)

  ctx.shadowBlur = 0
  ctx.restore()
}

/**
 * 绘制子弹精灵（0x72 weapon_arrow，旋转至飞行方向）
 */
export function drawBulletSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number, y: number,
  angle: number,
  size: number = 12  // 子弹渲染大小
): void {
  const entry = SPRITE_ATLAS['weapon_arrow']
  if (!entry) {
    // Fallback: 纯色小圆
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  const scale = size / Math.max(entry.w, entry.h)
  const drawW = entry.w * scale
  const drawH = entry.h * scale
  ctx.drawImage(img, entry.x, entry.y, entry.w, entry.h, -drawW / 2, -drawH / 2, drawW, drawH)
  ctx.restore()
}
