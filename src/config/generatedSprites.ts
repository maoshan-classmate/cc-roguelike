/**
 * AI 生成精灵加载与渲染
 * 从 sprite sheet (4x4 grid, 16 frames) 中裁帧绘制
 */

export interface GeneratedSpriteDef {
  sheetPath: string
  cols: number
  rows: number
  totalFrames: number
  frameDuration: number
}

export const GENERATED_SPRITES: Record<string, GeneratedSpriteDef> = {
  slime_idle: {
    sheetPath: '/src/assets/generated/slime_sheet.png',
    cols: 4,
    rows: 4,
    totalFrames: 16,
    frameDuration: 150,
  },
  bat_idle: {
    sheetPath: '/src/assets/generated/bat_sheet.png',
    cols: 4,
    rows: 4,
    totalFrames: 16,
    frameDuration: 150,
  },
  ghost_idle: {
    sheetPath: '/src/assets/generated/ghost_sheet.png',
    cols: 4,
    rows: 4,
    totalFrames: 16,
    frameDuration: 150,
  },
}

export function isGeneratedSprite(spriteName: string): boolean {
  const base = spriteName.replace(/_f\d+$/, '')
  return base in GENERATED_SPRITES
}

export function drawGeneratedSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  spriteName: string,
  x: number,
  y: number,
  size: number,
  elapsedMs: number
): void {
  const base = spriteName.replace(/_f\d+$/, '')
  const def = GENERATED_SPRITES[base]
  if (!def) return

  const frame = Math.floor(elapsedMs / def.frameDuration) % def.totalFrames
  const col = frame % def.cols
  const row = Math.floor(frame / def.cols)
  const cellW = img.naturalWidth / def.cols
  const cellH = img.naturalHeight / def.rows

  ctx.drawImage(
    img,
    col * cellW, row * cellH, cellW, cellH,
    x - size / 2, y - size / 2, size, size
  )
}
