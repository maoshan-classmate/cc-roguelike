import { useCallback, useRef } from 'react'
import { ITEMS } from '../config/items'
import type { PlayerState, EnemyState, BulletState, HealWaveState, ItemState, GameState as SharedGameState, DungeonData, DungeonRoom, EnvObjectState } from '@shared/types'
import { drawFallbackRect } from '../rendering/fallbackDraw'
import { drawBossEffects, type BossEffect } from '../rendering/bossEffectRenderer'
import { drawBullets, drawHealWaves } from '../rendering/projectileRenderer'
import { drawEnemies, drawPlayers, type AnimRefs } from '../rendering/entityRenderer'
import { drawStatusEffects } from '../rendering/statusEffectRenderer'
import type { SkillEffectStore } from '../rendering/skillEffectRenderer'
import { drawSkillPreview, type SkillPreviewState } from '../rendering/skillPreviewRenderer'
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

/** Context bag for environment object renderers */
type EnvRenderCtx = {
  ctx: CanvasRenderingContext2D
  atlasImg: HTMLImageElement
  customSprites: Record<string, HTMLImageElement>
  frame: number
  players?: PlayerState[]
  user?: { id: string } | null
}

const ENV_RENDERERS: Record<string, (obj: EnvObjectState, ec: EnvRenderCtx) => void> = {
  pillar(obj, ec) {
    const { ctx, atlasImg, customSprites } = ec
    if (!obj.alive) return
    // 2×2 tile base: cover wall tiles with floor, add boss-room tint
    const hw = obj.width / 2
    const hh = obj.height / 2
    const tileCount = Math.round(obj.width / 32)
    for (let dr = 0; dr < tileCount; dr++) {
      for (let dc = 0; dc < tileCount; dc++) {
        const tx = obj.x - hw + dc * 32 + 16
        const ty = obj.y - hh + dr * 32 + 16
        draw0x72Sprite(ctx, atlasImg, 'floor_1', tx, ty, 32)
      }
    }
    // Dark red tint for boss-room atmosphere
    ctx.fillStyle = 'rgba(42, 10, 10, 0.4)'
    ctx.fillRect(obj.x - hw, obj.y - hh, obj.width, obj.height)
    // Banner sprite planted in the center
    const bannerImg = customSprites['floor_banner']
    if (bannerImg) {
      const prevSmooth = ctx.imageSmoothingEnabled
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(bannerImg, obj.x - hw, obj.y - hh, obj.width, obj.height)
      ctx.imageSmoothingEnabled = prevSmooth
    } else {
      draw0x72Sprite(ctx, atlasImg, 'skull', obj.x, obj.y, 32)
    }
  },

  trap(obj, ec) {
    const { ctx, atlasImg } = ec
    const spriteName = obj.trapActive
      ? 'floor_spikes_anim_f3'
      : 'floor_spikes_anim_f0';
    if (is0x72Sprite(spriteName)) {
      draw0x72Sprite(ctx, atlasImg, spriteName, obj.x, obj.y, obj.width);
    }
  },

  door(obj, ec) {
    const { ctx, atlasImg } = ec
    if (obj.doorOpen) {
      // Open door — invisible (stairs drawn at exitPoint by renderDungeonTiles)
    } else {
      // Closed door
      const spriteName = 'doors_leaf_closed'
      if (is0x72Sprite(spriteName)) {
        draw0x72Sprite(ctx, atlasImg, spriteName, obj.x, obj.y, obj.width)
      } else {
        ctx.fillStyle = '#654321'
        ctx.fillRect(obj.x - obj.width / 2, obj.y - obj.height / 2, obj.width, obj.height)
      }
    }
  },

  decoration(obj, ec) {
    const { ctx, atlasImg, customSprites } = ec
    if (obj.spriteKey) {
      const customImg = customSprites[obj.spriteKey];
      if (customImg) {
        const drawSize = obj.width;
        const prevSmooth = ctx.imageSmoothingEnabled;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(customImg, obj.x - drawSize / 2, obj.y - drawSize / 2, drawSize, drawSize);
        ctx.imageSmoothingEnabled = prevSmooth;
      } else if (is0x72Sprite(obj.spriteKey)) {
        draw0x72Sprite(ctx, atlasImg, obj.spriteKey, obj.x, obj.y, obj.width)
      }
    }
  },

  chest(obj, ec) {
    const { ctx, atlasImg, players, user } = ec
    const spriteKey = obj.alive ? 'chest_full_open_anim_f0' : 'chest_full_open_anim_f1';
    if (is0x72Sprite(spriteKey)) {
      draw0x72Sprite(ctx, atlasImg, spriteKey, obj.x, obj.y, obj.width);
    }
    // Interaction hint: show "approach to open" when alive and player nearby
    if (obj.alive) {
      const localPlayer = players?.find((p: PlayerState) => p.id === user?.id);
      if (localPlayer) {
        const dist = Math.hypot(localPlayer.x - obj.x, localPlayer.y - obj.y);
        if (dist < 80) {
          ctx.save();
          ctx.globalAlpha = Math.min(1, Math.max(0, 1 - (dist - 30) / 50));
          ctx.fillStyle = '#FFD700';
          ctx.font = '10px Courier New';
          ctx.textAlign = 'center';
          ctx.fillText('靠近开启', obj.x, obj.y - obj.height / 2 - 6);
          ctx.restore();
        }
      }
    }
  },
}

/** Render environment objects (pillars, traps, doors, decorations, chests) */
function drawEnvObjects(
  ctx: CanvasRenderingContext2D,
  envObjects: EnvObjectState[],
  atlasImg: HTMLImageElement,
  frame: number,
  customSprites: Record<string, HTMLImageElement>,
  players?: PlayerState[],
  user?: { id: string } | null,
): void {
  const ec: EnvRenderCtx = { ctx, atlasImg, customSprites, frame, players, user }
  for (const obj of envObjects) {
    const renderer = ENV_RENDERERS[obj.type]
    if (renderer) renderer(obj, ec)
  }
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
  phase?: string
  mazeFog?: { enabled?: boolean; visionRadius?: number; exploredTiles?: string[] }
}

interface RenderDeps {
  user: { id: string; username: string } | null
  spritesLoaded: boolean
  tileset2Atlas: HTMLImageElement
  generatedSheets: Record<string, HTMLImageElement>
  customSprites: Record<string, HTMLImageElement>
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
  skillEffectStore?: SkillEffectStore
  skillPreviewRef?: React.MutableRefObject<SkillPreviewState | null>
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
      customSprites,
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
      skillEffectStore,
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
      const roomsKey = dungeon.rooms?.map((r: DungeonRoom) => `${r.x},${r.y},${r.width},${r.height},${r.type || ''}`).join('|') || ''
      const gridKey = grid.map((row: boolean[]) => row.join('')).join('|') + '|' + exitKey + '|' + roomsKey

      // Build exclude rects from all envObjects for micro-decoration cleanup
      const pillarRects = (dungeon.envObjects || []).filter((o: EnvObjectState) => o.alive)

      if (!dungeonCacheRef.current || dungeonCacheRef.current.gridKey !== gridKey) {
        const offscreen = document.createElement('canvas')
        offscreen.width = (grid[0]?.length || 0) * 32
        offscreen.height = grid.length * 32
        const offCtx = offscreen.getContext('2d')!
        renderDungeonTiles(offCtx, grid, tileset2Atlas, dungeon.exitPoint, dungeon.rooms, pillarRects)
        dungeonCacheRef.current = { canvas: offscreen, gridKey }
      }
      ctx.drawImage(dungeonCacheRef.current.canvas, 0, 0)

      // Render environment objects (collisionGrid path)
      if (dungeon.envObjects) {
        drawEnvObjects(ctx, dungeon.envObjects, tileset2Atlas, frame, deps.customSprites, players, user)
      }

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
      const roomsKey = 'rooms-' + dungeon.rooms.map((r: DungeonRoom) => `${r.x},${r.y},${r.width},${r.height}`).join('|')

      if (!dungeonCacheRef.current || dungeonCacheRef.current.gridKey !== roomsKey) {
        const offscreen = document.createElement('canvas')
        offscreen.width = canvas.width
        offscreen.height = canvas.height
        const offCtx = offscreen.getContext('2d')!
        const pillarRects = (dungeon.envObjects || []).filter((o: EnvObjectState) => o.alive)
        renderDungeonFromRooms(offCtx, dungeon.rooms, dungeon.corridorTiles, tileset2Atlas, canvas.width, canvas.height, dungeon.exitPoint, pillarRects)
        dungeonCacheRef.current = { canvas: offscreen, gridKey: roomsKey }
      }
      ctx.drawImage(dungeonCacheRef.current.canvas, 0, 0)

      // Render environment objects (rooms path)
      if (dungeon.envObjects) {
        drawEnvObjects(ctx, dungeon.envObjects, tileset2Atlas, frame, deps.customSprites, players, user)
      }

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

    // ── 技能范围预览（按住时显示）──
    if (deps.skillPreviewRef?.current) {
      const preview = deps.skillPreviewRef.current
      // Update preview position to follow player
      const localPlayer = players.find(p => p.id === deps.user?.id)
      if (localPlayer) {
        preview.x = localPlayer.x
        preview.y = localPlayer.y
        if (localPlayer.angle !== undefined) preview.angle = localPlayer.angle
      }
      drawSkillPreview(ctx, preview)
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

    // 敌人状态效果渲染
    for (const enemy of enemies) {
      if (enemy.alive === false || !enemy.statusEffects?.length) continue
      const epos = getRenderPos(enemy.id, enemy.x, enemy.y)
      drawStatusEffects(ctx, epos.x, epos.y, enemy.statusEffects, frame)
    }

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

    // 玩家状态效果渲染
    for (const player of players) {
      if (!player.alive || !player.statusEffects?.length) continue
      const ppos = getRenderPos(player.id, player.x, player.y)
      drawStatusEffects(ctx, ppos.x, ppos.y, player.statusEffects, frame)
    }

    // 技能施放特效（客户端即时反馈）
    if (skillEffectStore) {
      skillEffectStore.update()
      skillEffectStore.draw(ctx)
    }

    // ── Fog of war for maze ──
    const mazeFog = gameStateRef.current.mazeFog
    if (gameStateRef.current.phase === 'MAZE_PLAYING' && mazeFog?.enabled !== false) {
      const localPlayer = players.find(p => p.id === user?.id)
      if (localPlayer) {
        const visionRadius = mazeFog?.visionRadius ?? 128
        ctx.save()
        // Solid black overlay with circular cutout
        ctx.fillStyle = '#000000'
        ctx.beginPath()
        ctx.rect(0, 0, canvas.width, canvas.height)
        ctx.arc(localPlayer.x, localPlayer.y, visionRadius, 0, Math.PI * 2, true)
        ctx.fill()
        // Soft edge gradient for natural falloff
        const fogGrad = ctx.createRadialGradient(
          localPlayer.x, localPlayer.y, visionRadius * 0.6,
          localPlayer.x, localPlayer.y, visionRadius,
        )
        fogGrad.addColorStop(0, 'rgba(0, 0, 0, 0)')
        fogGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)')
        ctx.fillStyle = fogGrad
        ctx.beginPath()
        ctx.arc(localPlayer.x, localPlayer.y, visionRadius, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()

        // Exit guide light pierces through fog (drawn after fog with additive blending)
        if (dungeon?.exitPoint && enemies.filter(e => e.alive !== false).length === 0) {
          const tileX = Math.floor(dungeon.exitPoint.x / 32) * 32
          const tileY = Math.floor(dungeon.exitPoint.y / 32) * 32
          const cx = tileX + 16
          const cy = tileY + 16
          const pulse = 0.5 + 0.5 * Math.sin(frame * 0.04)
          ctx.save()
          ctx.globalCompositeOperation = 'lighter'
          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + frame * 0.01
            const len = 20 + pulse * 12
            const grad = ctx.createLinearGradient(cx, cy,
              cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
            grad.addColorStop(0, `rgba(140, 200, 255, ${0.5 + pulse * 0.3})`)
            grad.addColorStop(1, 'rgba(100, 170, 240, 0)')
            ctx.strokeStyle = grad
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len)
            ctx.stroke()
          }
          ctx.restore()
        }
      }
    }
  }, [canvasRef, gameStateRef, deps])

  return { render }
}
