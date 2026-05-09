import { SPRITE_ATLAS } from '../assets/0x72/spriteIndex'
import { TILE_SIZE as TILE } from '@shared/constants'
const FLOOR_VARIANTS = ['floor_1', 'floor_2', 'floor_3', 'floor_4', 'floor_5', 'floor_6', 'floor_7', 'floor_8']

export function drawTile(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLImageElement,
  spriteName: string,
  col: number,
  row: number,
) {
  const entry = SPRITE_ATLAS[spriteName]
  if (!entry) return
  ctx.drawImage(atlas, entry.x, entry.y, entry.w, entry.h, col * TILE, row * TILE, TILE, TILE)
}

function drawFloorTiles(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLImageElement,
  grid: boolean[][],
) {
  const rows = grid.length
  const cols = grid[0]?.length || 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) {
        const variant = FLOOR_VARIANTS[(r * 7 + c * 3) % FLOOR_VARIANTS.length]
        drawTile(ctx, atlas, variant, c, r)
      }
    }
  }
}

function drawWallTileCropped(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLImageElement,
  spriteName: string,
  col: number,
  row: number,
  cropTop: number,
) {
  const entry = SPRITE_ATLAS[spriteName]
  if (!entry) return
  // 裁掉顶部 cropTop 个源像素，目标 y 下移对应像素，高度减少
  const scale = TILE / entry.h
  const destCrop = cropTop * scale
  // 先用背景色填充裁掉的区域
  ctx.fillStyle = '#1A1210'
  ctx.fillRect(col * TILE, row * TILE, TILE, destCrop)
  ctx.drawImage(atlas, entry.x, entry.y + cropTop, entry.w, entry.h - cropTop,
    col * TILE, row * TILE + destCrop, TILE, TILE - destCrop)
}

function drawWallTiles(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLImageElement,
  grid: boolean[][],
) {
  const rows = grid.length
  const cols = grid[0]?.length || 0

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) continue

      const above = r > 0 && grid[r - 1][c]
      const below = r < rows - 1 && grid[r + 1][c]
      const left = c > 0 && grid[r][c - 1]
      const right = c < cols - 1 && grid[r][c + 1]
      const adjFloor = above || below || left || right

      if (!adjFloor) continue

      const leftIsFloor = c > 0 && grid[r][c - 1]
      const rightIsFloor = c < cols - 1 && grid[r][c + 1]
      let sprite: string
      if (leftIsFloor) {
        sprite = 'wall_left'
      } else if (rightIsFloor) {
        sprite = 'wall_right'
      } else {
        sprite = 'wall_mid'
      }

      // 朝向房间内部的面有亮边（地板上方/下方的墙壁），裁掉顶部2源像素的亮边
      if (above || below) {
        drawWallTileCropped(ctx, atlas, sprite, c, r, 2)
      } else {
        drawTile(ctx, atlas, sprite, c, r)
      }
    }
  }
}

function drawMicroDecorations(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLImageElement,
  grid: boolean[][],
  exitPoint?: { x: number; y: number },
  excludeRects?: Array<{ x: number; y: number; width: number; height: number }>,
) {
  const rows = grid.length
  const cols = grid[0]?.length || 0
  const exitCol = exitPoint ? Math.floor(exitPoint.x / TILE) : -1
  const exitRow = exitPoint ? Math.floor(exitPoint.y / TILE) : -1

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue
      if (r === exitRow && c === exitCol) continue
      // Skip tiles inside pillar exclude rects
      if (excludeRects) {
        const tx = c * TILE + TILE / 2, ty = r * TILE + TILE / 2
        let inExcluded = false
        for (const rect of excludeRects) {
          if (tx > rect.x - rect.width / 2 && tx < rect.x + rect.width / 2
            && ty > rect.y - rect.height / 2 && ty < rect.y + rect.height / 2) {
            inExcluded = true; break
          }
        }
        if (inExcluded) continue
      }

      const seed = (r * 31 + c * 17) % 100
      if (seed >= 15) continue

      const x = c * TILE
      const y = r * TILE

      ctx.save()
      if (seed <= 3) {
        ctx.globalAlpha = 0.85
        drawTile(ctx, atlas, 'skull', c, r)
      } else if (seed <= 6) {
        ctx.globalAlpha = 0.9
        drawTile(ctx, atlas, 'hole', c, r)
      } else if (seed <= 9) {
        ctx.globalAlpha = 0.8
        drawTile(ctx, atlas, 'wall_goo', c, r)
      } else if (seed <= 11) {
        ctx.globalAlpha = 0.7
        drawTile(ctx, atlas, 'wall_goo_base', c, r)
      } else {
        ctx.globalAlpha = 0.6
        drawTile(ctx, atlas, 'wall_hole_1', c, r)
      }
      ctx.restore()
    }
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(10,5,21,0.2)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
}

export function renderDungeonTiles(
  ctx: CanvasRenderingContext2D,
  grid: boolean[][],
  atlas: HTMLImageElement,
  exitPoint?: { x: number; y: number },
  rooms?: { x: number; y: number; width: number; height: number; type: string }[],
  excludeRects?: Array<{ x: number; y: number; width: number; height: number }>,
) {
  const rows = grid.length
  const cols = grid[0]?.length || 0
  const w = cols * TILE
  const h = rows * TILE

  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1A1210'
  ctx.fillRect(0, 0, w, h)

  drawFloorTiles(ctx, atlas, grid)

  // Room type floor overlays
  if (rooms) {
    for (const room of rooms) {
      if (!room.type || room.type === 'normal') continue
      const startCol = Math.floor(room.x / TILE)
      const startRow = Math.floor(room.y / TILE)
      const endCol = Math.ceil((room.x + room.width) / TILE)
      const endRow = Math.ceil((room.y + room.height) / TILE)

      if (room.type === 'boss') {
        for (let r = startRow; r < endRow && r < rows; r++) {
          for (let c = startCol; c < endCol && c < cols; c++) {
            if (!grid[r][c]) continue
            const centerCol = Math.floor((startCol + endCol) / 2)
            if (Math.abs(c - centerCol) <= 1) {
              ctx.fillStyle = 'rgba(42, 10, 10, 0.35)'
            } else {
              ctx.fillStyle = 'rgba(53, 26, 26, 0.25)'
            }
            ctx.fillRect(c * TILE, r * TILE, TILE, TILE)
          }
        }
      } else if (room.type === 'arena') {
        for (let r = startRow; r < endRow && r < rows; r++) {
          for (let c = startCol; c < endCol && c < cols; c++) {
            if (!grid[r][c]) continue
            ctx.fillStyle = 'rgba(30, 40, 48, 0.3)'
            ctx.fillRect(c * TILE, r * TILE, TILE, TILE)
          }
        }
      }
    }
  }

  drawWallTiles(ctx, atlas, grid)
  drawMicroDecorations(ctx, atlas, grid, exitPoint, excludeRects)

  if (exitPoint) {
    const exitCol = Math.floor(exitPoint.x / TILE)
    const exitRow = Math.floor(exitPoint.y / TILE)
    drawTile(ctx, atlas, 'floor_stairs', exitCol, exitRow)
  }

  drawVignette(ctx, w, h)
}

export function renderDungeonFromRooms(
  ctx: CanvasRenderingContext2D,
  rooms: Array<{ x: number; y: number; width: number; height: number; type?: string }>,
  corridorTiles: Array<{ x: number; y: number }> | undefined,
  atlas: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  exitPoint?: { x: number; y: number },
  excludeRects?: Array<{ x: number; y: number; width: number; height: number }>,
) {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1A1210'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  const cols = Math.ceil(canvasWidth / TILE)
  const rows = Math.ceil(canvasHeight / TILE)
  const grid: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false))

  for (const room of rooms) {
    const startCol = Math.floor(room.x / TILE)
    const startRow = Math.floor(room.y / TILE)
    const endCol = Math.ceil((room.x + room.width) / TILE)
    const endRow = Math.ceil((room.y + room.height) / TILE)
    for (let r = startRow; r < endRow && r < rows; r++) {
      for (let c = startCol; c < endCol && c < cols; c++) {
        grid[r][c] = true
      }
    }
  }

  if (corridorTiles) {
    for (const tile of corridorTiles) {
      const c = Math.floor(tile.x / TILE)
      const r = Math.floor(tile.y / TILE)
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        grid[r][c] = true
      }
    }
  }

  // Exclude pillar/envObject areas from walkable grid
  if (excludeRects) {
    for (const rect of excludeRects) {
      const startCol = Math.floor((rect.x - rect.width / 2) / TILE)
      const startRow = Math.floor((rect.y - rect.height / 2) / TILE)
      const endCol = Math.ceil((rect.x + rect.width / 2) / TILE)
      const endRow = Math.ceil((rect.y + rect.height / 2) / TILE)
      for (let r = startRow; r < endRow && r < rows; r++) {
        for (let c = startCol; c < endCol && c < cols; c++) {
          if (r >= 0 && c >= 0) grid[r][c] = false
        }
      }
    }
  }

  drawFloorTiles(ctx, atlas, grid)

  // Room type floor overlays
  for (const room of rooms) {
    if (!room.type || room.type === 'normal') continue

    const startCol = Math.floor(room.x / TILE)
    const startRow = Math.floor(room.y / TILE)
    const endCol = Math.ceil((room.x + room.width) / TILE)
    const endRow = Math.ceil((room.y + room.height) / TILE)

    if (room.type === 'boss') {
      // Boss room: dark red floor with center column highlight
      for (let r = startRow; r < endRow && r < rows; r++) {
        for (let c = startCol; c < endCol && c < cols; c++) {
          if (!grid[r][c]) continue
          const centerCol = Math.floor((startCol + endCol) / 2)
          if (Math.abs(c - centerCol) <= 1) {
            ctx.fillStyle = 'rgba(42, 10, 10, 0.35)'
          } else {
            ctx.fillStyle = 'rgba(53, 26, 26, 0.25)'
          }
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE)
        }
      }
    } else if (room.type === 'arena') {
      // Arena room: blue-tinted floor
      for (let r = startRow; r < endRow && r < rows; r++) {
        for (let c = startCol; c < endCol && c < cols; c++) {
          if (!grid[r][c]) continue
          ctx.fillStyle = 'rgba(30, 40, 48, 0.3)'
          ctx.fillRect(c * TILE, r * TILE, TILE, TILE)
        }
      }
    }
  }

  drawWallTiles(ctx, atlas, grid)
  drawMicroDecorations(ctx, atlas, grid, exitPoint, excludeRects)

  if (exitPoint) {
    const exitCol = Math.floor(exitPoint.x / TILE)
    const exitRow = Math.floor(exitPoint.y / TILE)
    drawTile(ctx, atlas, 'floor_stairs', exitCol, exitRow)
  }

  drawVignette(ctx, canvasWidth, canvasHeight)
}
