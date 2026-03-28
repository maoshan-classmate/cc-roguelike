/**
 * 统一精灵渲染器
 * 从Kenney spritesheet绘制精灵
 */

import { TILE_SIZE, TILE_MARGIN } from '../assets/kenney'

// 精灵图规格
const CHAR_SPRITESHEET_WIDTH = 918  // roguelikeChar: 918x203
const DUNGEON_SPRITESHEET_WIDTH = 492 // roguelikeDungeon: 492x305

/**
 * 计算精灵在spritesheet中的坐标
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
 * 绘制角色精灵
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
  ctx.drawImage(
    img,
    pos.x, pos.y, TILE_SIZE, TILE_SIZE,  // 源区域
    x - halfSize, y - halfSize, size, size  // 目标区域
  )
}

/**
 * 绘制地牢/道具精灵
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
  ctx.drawImage(
    img,
    pos.x, pos.y, TILE_SIZE, TILE_SIZE,
    x - halfSize, y - halfSize, size, size
  )
}

/**
 * 根据实体类型绘制精灵
 */
export function drawEntitySprite(
  ctx: CanvasRenderingContext2D,
  charImg: HTMLImageElement,
  dungeonImg: HTMLImageElement,
  type: 'character' | 'enemy' | 'item',
  spriteIndex: number,
  x: number,
  y: number,
  size: number = TILE_SIZE
): void {
  if (type === 'character' || type === 'enemy') {
    drawCharacterSprite(ctx, charImg, spriteIndex, x, y, size)
  } else {
    drawDungeonSprite(ctx, dungeonImg, spriteIndex, x, y, size)
  }
}

/**
 * 绘制像素边框矩形
 */
export function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  borderColor: string = '#8B4513',
  borderWidth: number = 2
): void {
  // 填充
  ctx.fillStyle = color
  ctx.fillRect(x, y, width, height)

  // 边框
  ctx.strokeStyle = borderColor
  ctx.lineWidth = borderWidth
  ctx.strokeRect(x, y, width, height)
}

/**
 * 绘制像素血条
 */
export function drawHPBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  current: number,
  max: number,
  color: string = '#32CD32',
  bgColor: string = '#1a0f1e'
): void {
  const percent = Math.min(1, Math.max(0, current / max))

  // 背景
  ctx.fillStyle = bgColor
  ctx.fillRect(x, y, width, height)

  // 血条填充
  ctx.fillStyle = color
  ctx.fillRect(x + 1, y + 1, (width - 2) * percent, height - 2)

  // 像素边框效果
  ctx.strokeStyle = '#8B4513'
  ctx.lineWidth = 2
  ctx.strokeRect(x, y, width, height)
}

/**
 * 绘制BOSS皇冠
 */
export function drawBossCrown(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 16
): void {
  ctx.fillStyle = '#FFD700'
  // 皇冠形状
  ctx.beginPath()
  ctx.moveTo(x - size/2, y + size/3)
  ctx.lineTo(x - size/3, y - size/3)
  ctx.lineTo(x, y)
  ctx.lineTo(x + size/3, y - size/3)
  ctx.lineTo(x + size/2, y + size/3)
  ctx.closePath()
  ctx.fill()
}

/**
 * 绘制方向指示器
 */
export function drawDirectionArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number = 8
): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.moveTo(size, 0)  // 箭头指向右（0度）
  ctx.lineTo(-size/2, -size/2)
  ctx.lineTo(-size/2, size/2)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

/**
 * 绘制名称标签
 */
export function drawNameTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  color: string = '#FFFFFF',
  fontSize: number = 10
): void {
  ctx.fillStyle = color
  ctx.font = `${fontSize}px "Courier New", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  // 文字阴影
  ctx.fillStyle = 'rgba(0,0,0,0.8)'
  ctx.fillText(name, x + 1, y + 1)

  ctx.fillStyle = color
  ctx.fillText(name, x, y)
}
