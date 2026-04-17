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
