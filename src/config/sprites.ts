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
 * 绘制像素血条 - 带高光和阴影的立体效果
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
  const fillWidth = (width - 2) * percent
  if (fillWidth > 0) {
    ctx.fillStyle = color
    ctx.fillRect(x + 1, y + 1, fillWidth, height - 2)

    // 高光（上半部分更亮）
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.fillRect(x + 1, y + 1, fillWidth, Math.floor((height - 2) / 2))

    // 底部阴影线
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.fillRect(x + 1, y + height - 2, fillWidth, 1)
  }

  // 像素边框 - 上/左亮色，下/右暗色（3D 效果）
  ctx.fillStyle = 'rgba(139,69,19,0.8)'
  ctx.fillRect(x, y, width, 1)  // 上边
  ctx.fillRect(x, y, 1, height)  // 左边
  ctx.fillStyle = 'rgba(50,20,5,0.9)'
  ctx.fillRect(x, y + height - 1, width, 1)  // 下边
  ctx.fillRect(x + width - 1, y, 1, height)  // 右边
}

/**
 * 绘制BOSS皇冠 - 像素块风格
 */
export function drawBossCrown(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number = 16
): void {
  const s = Math.round(size / 8)  // 像素单元大小
  const cx = Math.round(x)

  // 金色皇冠主体
  ctx.fillStyle = '#FFD700'

  // 底部横条
  ctx.fillRect(cx - 4 * s, y + 2 * s, 8 * s, 2 * s)

  // 左塔
  ctx.fillRect(cx - 4 * s, y, 2 * s, 4 * s)
  // 中塔
  ctx.fillRect(cx - 1 * s, y - 1 * s, 2 * s, 5 * s)
  // 右塔
  ctx.fillRect(cx + 2 * s, y, 2 * s, 4 * s)

  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillRect(cx - 4 * s, y + 2 * s, 8 * s, 1 * s)  // 底条高光
  ctx.fillRect(cx - 4 * s, y, 2 * s, 1 * s)  // 左塔顶高光
  ctx.fillRect(cx - 1 * s, y - 1 * s, 2 * s, 1 * s)  // 中塔顶高光
  ctx.fillRect(cx + 2 * s, y, 2 * s, 1 * s)  // 右塔顶高光

  // 宝石
  ctx.fillStyle = '#DC143C'
  ctx.fillRect(cx - 3 * s, y + 2 * s, 1 * s, 1 * s)
  ctx.fillStyle = '#4A9EFF'
  ctx.fillRect(cx, y + 2 * s, 1 * s, 1 * s)
  ctx.fillStyle = '#32CD32'
  ctx.fillRect(cx + 3 * s, y + 2 * s, 1 * s, 1 * s)
}

/**
 * 绘制方向指示器 - 像素块箭头
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

  const p = Math.max(1, Math.round(size / 4))  // 像素单元

  // 阴影
  ctx.fillStyle = 'rgba(0,0,0,0.4)'
  ctx.fillRect(1 * p, -1 * p + 1, 4 * p, 2 * p)

  // 箭头主体 - 简洁像素风
  ctx.fillStyle = '#FFFFFF'
  // 箭头尖
  ctx.fillRect(3 * p, -1 * p, 2 * p, 2 * p)
  // 箭头杆
  ctx.fillRect(-1 * p, 0, 4 * p, p)

  ctx.restore()
}

/**
 * 绘制名称标签 - 带暗色背景面板
 */
export function drawNameTag(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  name: string,
  color: string = '#FFFFFF',
  fontSize: number = 10
): void {
  ctx.font = `${fontSize}px "Kenney Mini Square Mono", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'

  // 测量文字宽度
  const metrics = ctx.measureText(name)
  const textWidth = metrics.width
  const padding = 3

  // 暗色背景面板
  ctx.fillStyle = 'rgba(26,15,30,0.75)'
  ctx.fillRect(
    x - textWidth / 2 - padding,
    y - fontSize - 1,
    textWidth + padding * 2,
    fontSize + 3
  )

  // 文字
  ctx.fillStyle = color
  ctx.fillText(name, x, y)
}
