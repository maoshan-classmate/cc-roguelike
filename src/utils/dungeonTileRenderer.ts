import { SPRITE_ATLAS } from '../assets/0x72/spriteIndex'

const TILE = 32
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

      drawTile(ctx, atlas, 'wall_mid', c, r)

      if (above) {
        if (left && !right) drawTile(ctx, atlas, 'wall_edge_bottom_left', c, r)
        else if (right && !left) drawTile(ctx, atlas, 'wall_edge_bottom_right', c, r)
        else drawTile(ctx, atlas, 'wall_edge_bottom_left', c, r)
      }
      if (below) {
        if (left && !right) drawTile(ctx, atlas, 'wall_edge_top_left', c, r)
        else if (right && !left) drawTile(ctx, atlas, 'wall_edge_top_right', c, r)
        else drawTile(ctx, atlas, 'wall_edge_top_left', c, r)
      }
      if (left) drawTile(ctx, atlas, 'wall_edge_left', c, r)
      if (right) drawTile(ctx, atlas, 'wall_edge_right', c, r)
    }
  }
}

function drawMicroDecorations(
  ctx: CanvasRenderingContext2D,
  atlas: HTMLImageElement,
  grid: boolean[][],
  exitPoint?: { x: number; y: number },
) {
  const rows = grid.length
  const cols = grid[0]?.length || 0
  const exitCol = exitPoint ? Math.floor(exitPoint.x / TILE) : -1
  const exitRow = exitPoint ? Math.floor(exitPoint.y / TILE) : -1

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c]) continue
      if (r === exitRow && c === exitCol) continue

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
        ctx.globalAlpha = 0.35
        ctx.fillStyle = '#8B0000'
        ctx.beginPath()
        ctx.ellipse(x + TILE / 2 + (seed * 3 - 18), y + TILE / 2 + (seed * 2 - 10), 12, 8, seed * 0.3, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.globalAlpha = 0.4
        ctx.fillStyle = '#2D5A1E'
        ctx.beginPath()
        ctx.ellipse(x + TILE * 0.3, y + TILE * 0.6, 6, 4, 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(x + TILE * 0.6, y + TILE * 0.4, 5, 3, -0.3, 0, Math.PI * 2)
        ctx.fill()
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
) {
  const rows = grid.length
  const cols = grid[0]?.length || 0
  const w = cols * TILE
  const h = rows * TILE

  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#1A1210'
  ctx.fillRect(0, 0, w, h)

  drawFloorTiles(ctx, atlas, grid)
  drawWallTiles(ctx, atlas, grid)
  drawMicroDecorations(ctx, atlas, grid, exitPoint)

  if (exitPoint) {
    const exitCol = Math.floor(exitPoint.x / TILE)
    const exitRow = Math.floor(exitPoint.y / TILE)
    drawTile(ctx, atlas, 'floor_stairs', exitCol, exitRow)
  }

  drawVignette(ctx, w, h)
}

export function renderDungeonFromRooms(
  ctx: CanvasRenderingContext2D,
  rooms: Array<{ x: number; y: number; width: number; height: number }>,
  corridorTiles: Array<{ x: number; y: number }> | undefined,
  atlas: HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number,
  exitPoint?: { x: number; y: number },
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

  drawFloorTiles(ctx, atlas, grid)
  drawWallTiles(ctx, atlas, grid)
  drawMicroDecorations(ctx, atlas, grid, exitPoint)

  if (exitPoint) {
    const exitCol = Math.floor(exitPoint.x / TILE)
    const exitRow = Math.floor(exitPoint.y / TILE)
    drawTile(ctx, atlas, 'floor_stairs', exitCol, exitRow)
  }

  drawVignette(ctx, canvasWidth, canvasHeight)
}
