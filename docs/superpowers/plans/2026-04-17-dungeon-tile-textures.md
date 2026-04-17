# Dungeon Tile Textures — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 游戏副本内地牢渲染从纯色 fillRect 升级为 0x72 精灵贴图 + 微装饰 + 离屏缓存，与登录页视觉一致。

**Architecture:** 新建 `src/utils/dungeonTileRenderer.ts` 共享模块，从 `DungeonBackground.tsx` 提取 drawTile 函数并扩展 collisionGrid 驱动的贴图渲染。`useGameRenderer.ts` 用离屏 Canvas 缓存贴图结果，每帧只做一次 drawImage。

**Tech Stack:** React 18, Canvas 2D API, 0x72 Dungeon Tileset II atlas (main_atlas.png), TypeScript

---

### Task 1: 创建 dungeonTileRenderer.ts — 基础 drawTile + 地板渲染

**Files:**
- Create: `src/utils/dungeonTileRenderer.ts`

- [ ] **Step 1: 创建 dungeonTileRenderer.ts 基础模块**

```typescript
// src/utils/dungeonTileRenderer.ts
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

      // 底层：wall_mid
      drawTile(ctx, atlas, 'wall_mid', c, r)

      // 边缘叠加
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
      if (seed >= 8) continue

      const x = c * TILE
      const y = r * TILE

      ctx.save()
      if (seed <= 1) {
        ctx.globalAlpha = 0.6
        drawTile(ctx, atlas, 'skull', c, r)
      } else if (seed <= 3) {
        ctx.globalAlpha = 0.7
        drawTile(ctx, atlas, 'hole', c, r)
      } else if (seed <= 5) {
        ctx.globalAlpha = 0.5
        drawTile(ctx, atlas, 'wall_goo', c, r)
      } else if (seed <= 7) {
        ctx.globalAlpha = 0.15
        ctx.fillStyle = '#8B0000'
        ctx.beginPath()
        ctx.ellipse(x + TILE / 2 + (seed * 3 - 18), y + TILE / 2 + (seed * 2 - 10), 10, 6, seed * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }
  }
}

function drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(10,5,21,0.4)')
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

  // 从 rooms 构建 grid
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
  drawVignette(ctx, canvasWidth, canvasHeight)
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

Run: `cd D:/work/cc-roguelike && npx tsc --noEmit 2>&1 | head -20`
Expected: 无与 `dungeonTileRenderer.ts` 相关的错误

---

### Task 2: 重构 DungeonBackground.tsx — 调用共享模块

**Files:**
- Modify: `src/components/DungeonBackground.tsx`

- [ ] **Step 1: 重写 DungeonBackground.tsx 使用共享 drawTile**

将整个文件替换为：

```typescript
import { useRef, useEffect, useCallback } from 'react'
import { drawTile } from '../utils/dungeonTileRenderer'
import { SPRITE_ATLAS } from '../assets/0x72/spriteIndex'

const TILE = 32
const ATLAS_PATH = '/src/assets/0x72/main_atlas.png'

function drawScene(ctx: CanvasRenderingContext2D, atlas: HTMLImageElement) {
  const dpr = window.devicePixelRatio || 1
  const w = window.innerWidth
  const h = window.innerHeight

  const canvas = ctx.canvas
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = w + 'px'
  canvas.style.height = h + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false

  const cols = Math.ceil(w / TILE) + 1
  const rows = Math.ceil(h / TILE) + 1
  const wallRows = 3
  const floorVariants = ['floor_1', 'floor_2', 'floor_3', 'floor_4', 'floor_5', 'floor_6', 'floor_7', 'floor_8']

  ctx.fillStyle = '#1A1210'
  ctx.fillRect(0, 0, w, h)

  for (let r = wallRows; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const variant = floorVariants[(r * 7 + c * 3) % floorVariants.length]
      drawTile(ctx, atlas, variant, c, r)
    }
  }

  for (let c = 0; c < cols; c++) {
    if (c === 0) drawTile(ctx, atlas, 'wall_top_left', c, 0)
    else if (c === cols - 1) drawTile(ctx, atlas, 'wall_top_right', c, 0)
    else drawTile(ctx, atlas, 'wall_top_mid', c, 0)
  }

  for (let r = 1; r < wallRows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c === 0) drawTile(ctx, atlas, 'wall_left', c, r)
      else if (c === cols - 1) drawTile(ctx, atlas, 'wall_right', c, r)
      else drawTile(ctx, atlas, 'wall_mid', c, r)
    }
  }

  const bannerColors = ['wall_banner_blue', 'wall_banner_red', 'wall_banner_green', 'wall_banner_yellow']
  for (let c = 3; c < cols - 3; c += 6) {
    drawTile(ctx, atlas, bannerColors[(c / 6) % bannerColors.length], c, 1)
  }

  const colPositions = [4, Math.floor(cols / 2) - 1, Math.floor(cols / 2) + 1, cols - 5]
  for (const cc of colPositions) {
    if (cc > 0 && cc < cols - 1) {
      const entry = SPRITE_ATLAS['column']
      if (entry) {
        ctx.drawImage(atlas, entry.x, entry.y, entry.w, entry.h, cc * TILE, 0, TILE, TILE * 3)
      }
    }
  }

  const centerCol = Math.floor(cols / 2)
  drawTile(ctx, atlas, 'chest_full_open_anim_f0', centerCol - 3, rows - 3)
  drawTile(ctx, atlas, 'chest_full_open_anim_f0', centerCol + 2, rows - 3)

  const skullEntry = SPRITE_ATLAS['skull']
  if (skullEntry) {
    ctx.drawImage(atlas, skullEntry.x, skullEntry.y, skullEntry.w, skullEntry.h,
      (centerCol - 5) * TILE, (rows - 2) * TILE, TILE, TILE)
    ctx.drawImage(atlas, skullEntry.x, skullEntry.y, skullEntry.w, skullEntry.h,
      (centerCol + 4) * TILE, (rows - 2) * TILE, TILE, TILE)
  }

  drawTile(ctx, atlas, 'floor_stairs', centerCol, rows - 2)

  const doorCol = Math.floor(cols / 2) - 1
  drawTile(ctx, atlas, 'doors_frame_top', doorCol, wallRows - 1)
  drawTile(ctx, atlas, 'doors_frame_left', doorCol, wallRows)
  drawTile(ctx, atlas, 'doors_leaf_closed', doorCol + 1, wallRows)
  drawTile(ctx, atlas, 'doors_frame_right', doorCol + 3, wallRows)

  const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75)
  gradient.addColorStop(0, 'rgba(0,0,0,0)')
  gradient.addColorStop(1, 'rgba(10,5,21,0.65)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
}

export function DungeonBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const atlasRef = useRef<HTMLImageElement | null>(null)

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !atlasRef.current) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawScene(ctx, atlasRef.current)
  }, [])

  useEffect(() => {
    const atlas = new Image()
    atlas.src = ATLAS_PATH
    atlas.onload = () => {
      atlasRef.current = atlas
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')!
      drawScene(ctx, atlas)
    }

    const handleResize = () => redraw()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [redraw])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        imageRendering: 'pixelated',
      }}
    />
  )
}
```

变更说明：
- 删除本地 `drawTile` 函数定义，改为 `import { drawTile } from '../utils/dungeonTileRenderer'`
- `drawScene` 内所有 `drawTile` 调用不变（函数签名完全兼容）
- 其余所有代码（atlas 加载、resize 监听、Canvas 样式）保持不变

- [ ] **Step 2: 验证编译**

Run: `cd D:/work/cc-roguelike && npx tsc --noEmit 2>&1 | head -20`
Expected: 零 error

---

### Task 3: 重构 useGameRenderer.ts — 离屏缓存 + 精灵贴图

**Files:**
- Modify: `src/hooks/useGameRenderer.ts:129-228`

- [ ] **Step 1: 添加 import 和缓存 ref**

在文件顶部 import 区添加：

```typescript
import { renderDungeonTiles, renderDungeonFromRooms } from '../utils/dungeonTileRenderer'
```

在 `useGameRenderer` 函数体内，`const render = useCallback(...)` 之前添加：

```typescript
  const dungeonCacheRef = useRef<{ canvas: HTMLCanvasElement; gridKey: string } | null>(null)
```

- [ ] **Step 2: 替换 collisionGrid 渲染路径（第 129-185 行）**

将以下代码：

```typescript
    // 绘制地牢
    if (dungeon && dungeon.collisionGrid && spritesLoaded && tileset2Atlas.complete) {
      const tileSize = 32
      const grid = dungeon.collisionGrid
      const rows = grid.length
      const cols = grid[0]?.length || 0

      const FLOOR_BASE = '#3A2E2C'
      const FLOOR_GRID = '#504440'
      const WALL_FACE = '#5C4A3A'
      const WALL_EDGE = '#7A6652'
      const WALL_DARK = '#2A1E16'
      const BG_COLOR = '#1A1210'

      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * tileSize
          const y = row * tileSize

          if (grid[row][col]) {
            ctx.fillStyle = FLOOR_BASE
            ctx.fillRect(x, y, tileSize, tileSize)
            ctx.strokeStyle = FLOOR_GRID
            ctx.lineWidth = 1
            ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1)
          } else {
            const adjFloor =
              (row > 0 && grid[row - 1][col]) ||
              (row < rows - 1 && grid[row + 1][col]) ||
              (col > 0 && grid[row][col - 1]) ||
              (col < cols - 1 && grid[row][col + 1])

            if (adjFloor) {
              ctx.fillStyle = WALL_FACE
              ctx.fillRect(x, y, tileSize, tileSize)
              ctx.fillStyle = WALL_EDGE
              ctx.fillRect(x, y, tileSize, 2)
              ctx.fillStyle = WALL_DARK
              ctx.fillRect(x, y + tileSize - 2, tileSize, 2)
              ctx.fillStyle = WALL_DARK
              ctx.fillRect(x + tileSize - 2, y, 2, tileSize)
              ctx.fillStyle = WALL_EDGE
              ctx.fillRect(x, y, 2, tileSize)
            }
          }
        }
      }

      if (dungeon.exitPoint) {
        const exitSprite = getSpriteEntry('floor_stairs')
        if (exitSprite?.source === '0x72' && tileset2Atlas.complete) {
          draw0x72Sprite(ctx, tileset2Atlas, exitSprite.atlasKey as string, dungeon.exitPoint.x, dungeon.exitPoint.y, tileSize)
        }
        // 无 Kenney fallback：0x72 不可用时直接跳过（占位符）
      }
    }
```

替换为：

```typescript
    // 绘制地牢（离屏缓存 + 精灵贴图）
    if (dungeon && dungeon.collisionGrid && spritesLoaded && tileset2Atlas.complete) {
      const grid = dungeon.collisionGrid
      const gridKey = grid.map(row => row.join('')).join('|')

      if (!dungeonCacheRef.current || dungeonCacheRef.current.gridKey !== gridKey) {
        const offscreen = document.createElement('canvas')
        offscreen.width = (grid[0]?.length || 0) * 32
        offscreen.height = grid.length * 32
        const offCtx = offscreen.getContext('2d')!
        renderDungeonTiles(offCtx, grid, tileset2Atlas, dungeon.exitPoint)
        dungeonCacheRef.current = { canvas: offscreen, gridKey }
      }
      ctx.drawImage(dungeonCacheRef.current.canvas, 0, 0)

      // 出口楼梯在缓存内已渲染，此处无需额外绘制
    }
```

- [ ] **Step 3: 替换 rooms 渲染路径（第 186-218 行）**

将以下代码：

```typescript
    } else if (dungeon && dungeon.rooms) {
      const tileSize = 32
      const FLOOR_COLOR = '#3A2E2C'
      const FLOOR_GRID = '#504440'

      for (const room of dungeon.rooms) {
        ctx.fillStyle = FLOOR_COLOR
        ctx.fillRect(room.x, room.y, room.width, room.height)
        ctx.strokeStyle = FLOOR_GRID
        ctx.lineWidth = 1
        for (let x = room.x; x <= room.x + room.width; x += tileSize) {
          ctx.beginPath(); ctx.moveTo(x, room.y); ctx.lineTo(x, room.y + room.height); ctx.stroke()
        }
        for (let y = room.y; y <= room.y + room.height; y += tileSize) {
          ctx.beginPath(); ctx.moveTo(room.x, y); ctx.lineTo(room.x + room.width, y); ctx.stroke()
        }
      }
      if (dungeon.corridorTiles) {
        for (const tile of dungeon.corridorTiles) {
          ctx.fillStyle = FLOOR_COLOR
          ctx.fillRect(tile.x - tileSize / 2, tile.y - tileSize / 2, tileSize, tileSize)
          ctx.strokeStyle = FLOOR_GRID
          ctx.lineWidth = 1
          ctx.strokeRect(tile.x - tileSize / 2, tile.y - tileSize / 2, tileSize, tileSize)
        }
      }
      if (dungeon.exitPoint) {
        const exitSprite = getSpriteEntry('floor_stairs')
        if (exitSprite?.source === '0x72' && tileset2Atlas.complete) {
          draw0x72Sprite(ctx, tileset2Atlas, exitSprite.atlasKey as string, dungeon.exitPoint.x, dungeon.exitPoint.y, tileSize)
        }
        // 无 Kenney fallback：0x72 不可用时直接跳过（占位符）
      }
```

替换为：

```typescript
    } else if (dungeon && dungeon.rooms) {
      const roomsKey = 'rooms-' + dungeon.rooms.map((r: any) => `${r.x},${r.y},${r.width},${r.height}`).join('|')

      if (!dungeonCacheRef.current || dungeonCacheRef.current.gridKey !== roomsKey) {
        const offscreen = document.createElement('canvas')
        offscreen.width = canvas.width
        offscreen.height = canvas.height
        const offCtx = offscreen.getContext('2d')!
        renderDungeonFromRooms(offCtx, dungeon.rooms, dungeon.corridorTiles, tileset2Atlas, canvas.width, canvas.height, dungeon.exitPoint)
        dungeonCacheRef.current = { canvas: offscreen, gridKey: roomsKey }
      }
      ctx.drawImage(dungeonCacheRef.current.canvas, 0, 0)
```

- [ ] **Step 4: 验证编译**

Run: `cd D:/work/cc-roguelike && npx tsc --noEmit 2>&1 | head -20`
Expected: 零 error

---

### Task 4: E2E 验证 — 编译 + 登录页回归 + 游戏内贴图确认

**Files:** 无变更

- [ ] **Step 1: 完整 TypeScript 编译检查**

Run: `cd D:/work/cc-roguelike && npx tsc --noEmit`
Expected: 零 error

- [ ] **Step 2: 启动开发服务器**

Run: `cd D:/work/cc-roguelike && npm run dev`
验证：
1. 打开 http://localhost:3000 — 登录页瓷砖贴图与之前一致（无回归）
2. 登录 → 创建房间 → 选职业 → 开始冒险
3. 游戏内副本：地板显示 `floor_1`~`floor_8` 纹理变体
4. 墙壁显示 `wall_mid` + `wall_edge_*` 精灵贴图
5. 随机位置可见微装饰（骷髅头/裂缝/黏液/血迹）
6. 暗角效果（径向渐变）
7. 浏览器控制台无 `[0x72] Sprite not found` 警告
8. 帧率流畅（60fps）

- [ ] **Step 3: 截图存档验证**

使用 Playwright MCP 或浏览器截图，确认：
- 登录页正常
- 游戏内贴图渲染正常
