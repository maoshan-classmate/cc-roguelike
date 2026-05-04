import { useCallback, useRef } from 'react'
import { ITEMS } from '../config/items'
import type { PlayerState, EnemyState, BulletState, HealWaveState, ItemState, GameState as SharedGameState, DungeonData } from '@shared/types'
import { drawFallbackRect } from '../rendering/fallbackDraw'
import { drawBossEffects, type BossEffect } from '../rendering/bossEffectRenderer'
import { drawBullets, drawHealWaves } from '../rendering/projectileRenderer'
import { drawEnemies, drawPlayers, type AnimRefs } from '../rendering/entityRenderer'
import {
  draw0x72Sprite,
  getSpriteEntry,
  is0x72Sprite,
} from '../config/sprites'
import { spring } from '../utils/animation/spring'
import { renderDungeonTiles, renderDungeonFromRooms } from '../utils/dungeonTileRenderer'

// 动画帧辅助：每~150ms切换一帧
const ANIM_INTERVAL = 150

export function getAnimSprite(spriteName: string, elapsedMs: number): string {
  const frame = Math.floor(elapsedMs / ANIM_INTERVAL) % 4

  if (/_anim_f\d+$/.test(spriteName)) {
    return spriteName.replace(/_f\d+$/, `_f${frame}`)
  }

  if (/_f\d+$/.test(spriteName)) {
    return spriteName.replace(/_f\d+$/, `_f${frame % 3}`)
  }

  return spriteName
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

interface GameState {
  players: PlayerState[]
  enemies: EnemyState[]
  bullets: BulletState[]
  healWaves: HealWaveState[]
  items: ItemState[]
  gold: number
  keys: number
  dungeon: DungeonData | null
}

interface RenderDeps {
  user: { id: string; username: string } | null
  spritesLoaded: boolean
  tileset2Atlas: HTMLImageElement
  generatedSheets: Record<string, HTMLImageElement>
  lastAnimTime: React.MutableRefObject<number>
  prevPositions: React.MutableRefObject<Map<string, { x: number; y: number }>>
  targetPositions: React.MutableRefObject<Map<string, { x: number; y: number }>>
  lastStateTime: React.MutableRefObject<number>
  prevDyingRef: React.MutableRefObject<Set<string>>
  prevHpRef: React.MutableRefObject<Map<string, number>>
  spawnDeathParticles: (x: number, y: number, color: string) => void
  spawnDamageText: (x: number, y: number, value: number, isPlayer: boolean) => void
  updateAndDrawParticles: (ctx: CanvasRenderingContext2D) => void
  updateAndDrawDamageTexts: (ctx: CanvasRenderingContext2D) => void
  particlesRef: { current: Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }> }
  damageTextsRef: { current: Array<{ x: number; y: number; value: number; isPlayer: boolean; life: number; maxLife: number }> }
  bossEffectsRef: React.MutableRefObject<BossEffect[]>
  screenShakeRef: React.MutableRefObject<{ intensity: number; endTime: number }>
  attackFlashRef?: React.MutableRefObject<number>
}

export function useGameRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  gameStateRef: React.MutableRefObject<GameState>,
  deps: RenderDeps
) {
  // ── 动画状态（帧驱动）──
  const frameCountRef = useRef(0)
  const hitAnimRef = useRef<Map<string, number>>(new Map())    // entityId → hit start frame
  const deathAnimRef = useRef<Map<string, number>>(new Map())  // entityId → death start frame
  const displayHpRef = useRef<Map<string, number>>(new Map())  // entityId → displayed HP
  const itemSpawnRef = useRef<Map<string, number>>(new Map())  // itemId → spawn frame
  const prevItemIdsRef = useRef<Set<string>>(new Set())         // 上一帧的道具ID集合
  const dungeonCacheRef = useRef<{ canvas: HTMLCanvasElement; gridKey: string } | null>(null)

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const {
      user,
      spritesLoaded,
      tileset2Atlas,
      generatedSheets,
      lastAnimTime,
      prevPositions,
      targetPositions,
      lastStateTime,
      prevDyingRef,
      prevHpRef,
      spawnDeathParticles,
      spawnDamageText,
      updateAndDrawParticles,
      updateAndDrawDamageTexts,
      bossEffectsRef,
      screenShakeRef,
    } = deps

    const { players, enemies, bullets, healWaves, items, dungeon } = gameStateRef.current

    // ── 帧计数 ──
    frameCountRef.current++
    const frame = frameCountRef.current
    const FPS = 60

    // ── 检测新道具出现 ──
    const currentItemIds = new Set(items.map(it => it.id))
    for (const item of items) {
      if (!prevItemIdsRef.current.has(item.id)) {
        itemSpawnRef.current.set(item.id, frame)
      }
    }
    // 清理已消失道具的状态
    for (const id of itemSpawnRef.current.keys()) {
      if (!currentItemIds.has(id)) itemSpawnRef.current.delete(id)
    }
    prevItemIdsRef.current = currentItemIds

    // 计算插值 t (0~1)
    const stateInterval = 100
    const elapsed = performance.now() - lastStateTime.current
    const t = Math.min(elapsed / stateInterval, 1)

    // 获取插值位置
    function getRenderPos(id: string, targetX: number, targetY: number) {
      const prev = prevPositions.current.get(id)
      if (!prev) return { x: targetX, y: targetY }
      return {
        x: lerp(prev.x, targetX, t),
        y: lerp(prev.y, targetY, t)
      }
    }

    // 清除背景
    ctx.fillStyle = '#1A1210'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制地牢（离屏缓存 + 精灵贴图）
    if (dungeon && dungeon.collisionGrid && spritesLoaded && tileset2Atlas.complete) {
      const grid = dungeon.collisionGrid
      const exitKey = dungeon.exitPoint ? `${dungeon.exitPoint.x},${dungeon.exitPoint.y}` : 'noExit'
      const gridKey = grid.map((row: boolean[]) => row.join('')).join('|') + '|' + exitKey

      if (!dungeonCacheRef.current || dungeonCacheRef.current.gridKey !== gridKey) {
        const offscreen = document.createElement('canvas')
        offscreen.width = (grid[0]?.length || 0) * 32
        offscreen.height = grid.length * 32
        const offCtx = offscreen.getContext('2d')!
        renderDungeonTiles(offCtx, grid, tileset2Atlas, dungeon.exitPoint)
        dungeonCacheRef.current = { canvas: offscreen, gridKey }
      }
      ctx.drawImage(dungeonCacheRef.current.canvas, 0, 0)

      // 出口引导：清怪后入口处淡蓝色光线
      if (dungeon.exitPoint && enemies.filter(e => e.alive !== false).length === 0) {
        const tileX = Math.floor(dungeon.exitPoint.x / 32) * 32
        const tileY = Math.floor(dungeon.exitPoint.y / 32) * 32
        const cx = tileX + 16
        const cy = tileY + 16
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.04)

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        // 8条放射光线
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i + frame * 0.01
          const len = 14 + pulse * 8
          const grad = ctx.createLinearGradient(cx, cy,
            cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
          grad.addColorStop(0, `rgba(140, 200, 255, ${0.4 + pulse * 0.2})`)
          grad.addColorStop(1, 'rgba(100, 170, 240, 0)')
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
          ctx.stroke()
        }
        ctx.restore()
      }
    } else if (dungeon && dungeon.rooms) {
      const roomsKey = 'rooms-' + dungeon.rooms.map(r => `${r.x},${r.y},${r.width},${r.height}`).join('|')

      if (!dungeonCacheRef.current || dungeonCacheRef.current.gridKey !== roomsKey) {
        const offscreen = document.createElement('canvas')
        offscreen.width = canvas.width
        offscreen.height = canvas.height
        const offCtx = offscreen.getContext('2d')!
        renderDungeonFromRooms(offCtx, dungeon.rooms, dungeon.corridorTiles, tileset2Atlas, canvas.width, canvas.height, dungeon.exitPoint)
        dungeonCacheRef.current = { canvas: offscreen, gridKey: roomsKey }
      }
      ctx.drawImage(dungeonCacheRef.current.canvas, 0, 0)

      // 出口引导：清怪后入口处淡蓝色光线（rooms 路径）
      if (dungeon.exitPoint && enemies.filter(e => e.alive !== false).length === 0) {
        const tileX = Math.floor(dungeon.exitPoint.x / 32) * 32
        const tileY = Math.floor(dungeon.exitPoint.y / 32) * 32
        const cx = tileX + 16
        const cy = tileY + 16
        const pulse = 0.5 + 0.5 * Math.sin(frame * 0.04)

        ctx.save()
        ctx.globalCompositeOperation = 'lighter'
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 / 8) * i + frame * 0.01
          const len = 14 + pulse * 8
          const grad = ctx.createLinearGradient(cx, cy,
            cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
          grad.addColorStop(0, `rgba(140, 200, 255, ${0.4 + pulse * 0.2})`)
          grad.addColorStop(1, 'rgba(100, 170, 240, 0)')
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
          ctx.stroke()
        }
        ctx.restore()
      }
    } else {
      ctx.strokeStyle = '#3D2B3E'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }
    }

    // 绘制道具（弹簧出现动画）
    for (const item of items) {
      const itemConfig = ITEMS[item.type] || ITEMS.health
      const itemSize = getSpriteEntry(itemConfig.spriteName ?? '')?.size ?? 28

      // 道具出现弹簧缩放
      const spawnFrame = itemSpawnRef.current.get(item.id) ?? 0
      const itemScale = spring({
        frame: frame - spawnFrame,
        fps: FPS,
        from: 0,
        to: 1,
        config: { damping: 10, stiffness: 300, overshootClamping: false }
      })

      ctx.save()
      ctx.translate(item.x, item.y)
      ctx.scale(itemScale, itemScale)
      ctx.translate(-item.x, -item.y)

      if (spritesLoaded && tileset2Atlas.complete && is0x72Sprite(itemConfig.spriteName ?? '')) {
        const animSprite = getAnimSprite(itemConfig.spriteName ?? '', performance.now() - lastAnimTime.current)
        draw0x72Sprite(ctx, tileset2Atlas, animSprite, item.x, item.y, itemSize)
      } else {
        drawFallbackRect(ctx, item.x, item.y, 28, itemConfig.color)
      }
      ctx.restore()
    }

    // 绘制敌人
    drawEnemies(ctx, enemies, {
      getRenderPos,
      spritesLoaded,
      tileset2Atlas,
      generatedSheets,
      lastAnimTime: lastAnimTime.current,
      spawnDeathParticles,
      animRefs: { frame, fps: FPS, elapsedMs: performance.now() - lastAnimTime.current, hitAnimRef: hitAnimRef.current, deathAnimRef: deathAnimRef.current, displayHpRef: displayHpRef.current, prevDyingRef: prevDyingRef.current, prevHpRef: prevHpRef.current },
    })

    // 绘制死亡粒子特效
    updateAndDrawParticles(ctx)

    // 绘制伤害飘字
    updateAndDrawDamageTexts(ctx)

    // ── Boss 技能特效（震地冲击波、弹幕闪光）──
    drawBossEffects(ctx, bossEffectsRef.current, performance.now())

    // 绘制子弹
    drawBullets(ctx, bullets, tileset2Atlas)

    // 绘制治疗波
    drawHealWaves(ctx, healWaves)

    // 绘制玩家
    drawPlayers(ctx, players, {
      user,
      getRenderPos,
      spritesLoaded,
      tileset2Atlas,
      elapsedMs: performance.now() - lastAnimTime.current,
      animRefs: { frame, fps: FPS, elapsedMs: performance.now() - lastAnimTime.current, hitAnimRef: hitAnimRef.current, deathAnimRef: deathAnimRef.current, displayHpRef: displayHpRef.current, prevDyingRef: prevDyingRef.current, prevHpRef: prevHpRef.current },
      attackFlashRef: deps.attackFlashRef,
      getAnimSprite,
    })
  }, [canvasRef, gameStateRef, deps])

  return { render }
}
