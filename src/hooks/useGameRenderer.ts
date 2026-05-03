import { useCallback, useRef } from 'react'
import { CHARACTERS } from '../config/characters'
import { ENEMIES } from '../config/enemies'
import { ITEMS } from '../config/items'
import { SPRITE_REGISTRY } from '../config/sprites'

interface BossEffect {
  type: 'aoe_shockwave' | 'ranged_flash'
  x: number
  y: number
  startTime: number
  duration: number
  maxRadius: number
}
import {
  draw0x72Sprite,
  drawHPBar,
  drawBossCrown,
  drawNameTag,
  drawWeaponSprite,
  drawBulletSprite,
  drawMagicOrb,
  getSpriteEntry,
  is0x72Sprite,
} from '../config/sprites'
import { isGeneratedSprite, drawGeneratedSprite } from '../config/generatedSprites'
import { spring } from '../utils/animation/spring'
import { interpolate } from '../utils/animation/interpolate'
import { Easing } from '../utils/animation/easing'
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

// 游侠箭矢贴图（战士近战无子弹，法师/牧师用Canvas生成效果）
const BULLET_SPRITE: Record<string, string> = {
  ranger: 'weapon_arrow',
}

const WEAPON_SPRITE: Record<string, string> = {
  warrior: 'weapon_knight_sword',
  ranger:  'weapon_bow',
  mage:    'weapon_red_magic_staff',
  cleric:  'weapon_green_magic_staff',
}

interface GameState {
  players: any[]
  enemies: any[]
  bullets: any[]
  healWaves: any[]
  items: any[]
  gold: number
  keys: number
  dungeon: any
}

interface RenderDeps {
  user: any
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
  particlesRef: { current: any[] }
  damageTextsRef: { current: any[] }
  bossEffectsRef: React.MutableRefObject<BossEffect[]>
  screenShakeRef: React.MutableRefObject<{ intensity: number; endTime: number }>
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
    const currentItemIds = new Set(items.map((it: any) => it.id))
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
      if (dungeon.exitPoint && enemies.filter((e: any) => e.alive !== false).length === 0) {
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

      // 出口引导：清怪后入口处淡蓝色光线（rooms 路径）
      if (dungeon.exitPoint && enemies.filter((e: any) => e.alive !== false).length === 0) {
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
        ctx.fillStyle = itemConfig.color
        ctx.fillRect(item.x - 14, item.y - 14, 28, 28)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(item.x - 14, item.y - 14, 28, 28)
      }
      ctx.restore()
    }

    // 绘制敌人（弹簧受击 + 弹簧死亡）
    for (const enemy of enemies) {
      if (!enemy.alive) continue

      const enemyConfig = ENEMIES[enemy.type] || ENEMIES.basic
      const size = enemyConfig.size
      const epos = getRenderPos(enemy.id, enemy.x, enemy.y)

      const isDying = enemy.state === 'dying'
      if (isDying && !prevDyingRef.current.has(enemy.id)) {
        prevDyingRef.current.add(enemy.id)
        deathAnimRef.current.set(enemy.id, frame)
        spawnDeathParticles(enemy.x, enemy.y, enemyConfig.color)
      } else if (!isDying && prevDyingRef.current.has(enemy.id)) {
        prevDyingRef.current.delete(enemy.id)
        deathAnimRef.current.delete(enemy.id)
      }

      // ── 受击检测 ──
      const prevHp = prevHpRef.current.get(enemy.id)
      if (prevHp !== undefined && enemy.hp < prevHp && !isDying) {
        hitAnimRef.current.set(enemy.id, frame)
      }

      ctx.save()

      // ── 弹簧死亡动画 ──
      if (isDying) {
        const deathStart = deathAnimRef.current.get(enemy.id) ?? frame
        const deathFrame = frame - deathStart
        const deathScale = spring({
          frame: deathFrame,
          fps: FPS,
          from: 1.0,
          to: 0.3,
          config: { damping: 8, stiffness: 150, overshootClamping: true }
        })
        const deathOpacity = interpolate(deathFrame, [0, 15, 30], [1, 0.6, 0], {
          extrapolateRight: 'clamp'
        })
        ctx.globalAlpha = Math.max(0, deathOpacity)
        ctx.translate(epos.x, epos.y)
        ctx.scale(deathScale, deathScale)
        ctx.translate(-epos.x, -epos.y)
      }

      // ── 受击闪红+缩放 ──
      let redOverlay = 0
      const hitStart = hitAnimRef.current.get(enemy.id)
      if (hitStart !== undefined) {
        const hitFrame = frame - hitStart
        if (hitFrame > 20) {
          hitAnimRef.current.delete(enemy.id)
        } else {
          const hitScale = spring({
            frame: hitFrame,
            fps: FPS,
            from: 1.2,
            to: 1.0,
            config: { damping: 12, stiffness: 200, overshootClamping: true }
          })
          redOverlay = interpolate(hitFrame, [0, 5, 15], [0.5, 0.2, 0], {
            extrapolateRight: 'clamp'
          })
          if (!isDying) {
            ctx.translate(epos.x, epos.y)
            ctx.scale(hitScale, hitScale)
            ctx.translate(-epos.x, -epos.y)
          }
        }
      }

      if (spritesLoaded) {
        let sName = enemyConfig.spriteName ?? ''
        let bossDrawn = false

        // ── Boss 动作切换：idle/run/casting 使用不同精灵帧 ──
        if (enemyConfig.isBoss && tileset2Atlas.complete) {
          const bossState = enemy.state
          const bossCasting = (enemy as any).bossCasting
          const castProgress = (enemy as any).bossCastTimer || 0 // ms into cast
          const castWindup = bossCasting === 'ranged' ? 500 : bossCasting === 'aoe' ? 800 : 0
          const progress = castWindup > 0 ? Math.min(castProgress / castWindup, 1) : 0

          if (bossCasting === 'ranged' || bossCasting === 'aoe') {
            // 蓄力动画：快速帧循环(80ms间隔) + 缩放脉冲 + 能量光晕
            const fastFrame = Math.floor((performance.now() - lastAnimTime.current) / 80) % 4
            const frameName = `big_demon_run_anim_f${fastFrame}`

            // 缩放脉冲：从1.0→1.12，越接近释放越大
            const pulse = 1.0 + progress * 0.12 + Math.sin(performance.now() / 60) * 0.03 * progress

            // 颜色光晕：蓄力进度越接近完成越强
            const glowAlpha = progress * 0.45
            const glowColor = bossCasting === 'ranged'
              ? `rgba(255, 60, 30, ${glowAlpha})`
              : `rgba(255, 160, 30, ${glowAlpha})`

            ctx.save()
            ctx.translate(epos.x, epos.y)
            ctx.scale(pulse, pulse)
            draw0x72Sprite(ctx, tileset2Atlas, frameName, 0, 0, size)
            // 能量光晕：圆形渐变叠加
            const glowRadius = size * (0.6 + progress * 0.4)
            const grad = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, glowRadius)
            grad.addColorStop(0, glowColor)
            grad.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.fillStyle = grad
            ctx.fillRect(-glowRadius, -glowRadius, glowRadius * 2, glowRadius * 2)
            ctx.restore()

            // AoE 蓄力时显示伤害范围指示圈
            if (bossCasting === 'aoe') {
              const aoeRadius = 100 // 服务端 bossFireAoE 的 aoeRange
              const indicatorAlpha = 0.15 + progress * 0.25
              // 范围填充
              ctx.beginPath()
              ctx.arc(epos.x, epos.y, aoeRadius, 0, Math.PI * 2)
              ctx.fillStyle = `rgba(255, 80, 20, ${indicatorAlpha * 0.3})`
              ctx.fill()
              // 范围边框（闪烁）
              const blink = 0.5 + 0.5 * Math.sin(performance.now() / 80)
              ctx.strokeStyle = `rgba(255, 120, 40, ${(indicatorAlpha + blink * 0.2) * 0.8})`
              ctx.lineWidth = 2
              ctx.setLineDash([6, 4])
              ctx.stroke()
              ctx.setLineDash([])
            }

            bossDrawn = true
          } else if (bossState === 'chase' || bossState === 'attack') {
            // 追击/近战：run 动画循环
            sName = 'big_demon_run_anim_f0'
          }
          // idle 保持 big_demon_idle_anim_f0
        }

        if (!bossDrawn) {
          if (isGeneratedSprite(sName)) {
            const base = sName.replace(/_f\d+$/, '')
            const sheet = generatedSheets[base]
            if (sheet && sheet.complete) {
              drawGeneratedSprite(ctx, sheet, sName, epos.x, epos.y, size, performance.now() - lastAnimTime.current)
            } else {
              ctx.fillStyle = enemyConfig.color
              ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
            }
          } else if (tileset2Atlas.complete && is0x72Sprite(sName)) {
            const animSprite = getAnimSprite(sName, performance.now() - lastAnimTime.current)
            draw0x72Sprite(ctx, tileset2Atlas, animSprite, epos.x, epos.y, size)
          } else {
            ctx.fillStyle = enemyConfig.color
            ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 1
            ctx.strokeRect(epos.x - size/2, epos.y - size/2, size, size)
          }
        }
      } else {
        ctx.fillStyle = enemyConfig.color
        ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(epos.x - size/2, epos.y - size/2, size, size)
      }

      // 红色受击覆盖层
      if (redOverlay > 0) {
        ctx.globalAlpha = redOverlay
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
      }

      ctx.restore()
      ctx.globalAlpha = 1

      if (enemyConfig.isBoss && !isDying) {
        drawBossCrown(ctx, epos.x, epos.y - size/2 - 10, 16)
      }

      if (!isDying) {
        // ── 血条平滑过渡 ──
        const hpKey = `e_${enemy.id}`
        const displayHp = displayHpRef.current.get(hpKey) ?? enemy.hp
        const hpDiff = enemy.hp - displayHp
        const smoothHp = Math.abs(hpDiff) < 0.5 ? enemy.hp : displayHp + hpDiff * 0.15
        displayHpRef.current.set(hpKey, smoothHp)

        const hpBarWidth = enemyConfig.isBoss ? 64 : size * 1.5
        const hpBarHeight = enemyConfig.isBoss ? 8 : 6
        drawHPBar(
          ctx,
          epos.x - hpBarWidth/2,
          epos.y - size/2 - (enemyConfig.isBoss ? 20 : 14),
          hpBarWidth,
          hpBarHeight,
          smoothHp,
          enemy.hpMax,
          enemyConfig.isBoss ? '#FFD700' : '#DC143C'
        )
      }
    }

    // 绘制死亡粒子特效
    updateAndDrawParticles(ctx)

    // 绘制伤害飘字
    updateAndDrawDamageTexts(ctx)

    // ── Boss 技能特效（震地冲击波、弹幕闪光）──
    const now = performance.now()
    const effects = bossEffectsRef.current
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, 1024, 768)
    ctx.clip()
    for (let i = effects.length - 1; i >= 0; i--) {
      const fx = effects[i]
      const age = now - fx.startTime
      if (age > fx.duration) { effects.splice(i, 1); continue }
      const progress = age / fx.duration

      if (fx.type === 'aoe_shockwave') {
        ctx.save()
        const seed = Math.floor(fx.startTime)
        const prand = (i: number) => ((i * 2654435761 + seed) >>> 0) / 4294967296

        // ── 0. 弹坑暗洞 ──
        if (progress > 0.05) {
          const ca = Math.min((progress - 0.05) / 0.15, 1) * (progress < 0.8 ? 1 : (1 - progress) / 0.2)
          ctx.beginPath()
          ctx.arc(fx.x, fx.y, 38 + progress * 8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(30, 22, 16, ${ca * 0.8})`
          ctx.fill()
          ctx.beginPath()
          ctx.arc(fx.x, fx.y, 26 + progress * 4, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(10, 6, 4, ${ca * 0.95})`
          ctx.fill()
          const pg = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, 20)
          pg.addColorStop(0, `rgba(120, 30, 10, ${ca * 0.3})`)
          pg.addColorStop(1, 'rgba(10, 6, 4, 0)')
          ctx.fillStyle = pg
          ctx.fillRect(fx.x - 20, fx.y - 20, 40, 40)
        }

        // ── 1. 粗裂纹（发光+锯齿）──
        if (progress < 0.9) {
          const ca = progress < 0.12 ? progress / 0.12 : Math.max(0, (0.9 - progress) / 0.78)
          const crackCount = 8
          for (let c = 0; c < crackCount; c++) {
            const ba = (c / crackCount) * Math.PI * 2 + prand(c) * 0.3
            const len = (60 + prand(c + 10) * 80) * Math.min(progress * 4, 1)
            ctx.beginPath()
            ctx.moveTo(fx.x, fx.y)
            let px = fx.x, py = fx.y
            for (let s = 1; s <= 5; s++) {
              const sl = (len / 5) * s
              const jt = (prand(c * 7 + s) - 0.5) * 24
              px = fx.x + Math.cos(ba) * sl + Math.cos(ba + Math.PI / 2) * jt
              py = fx.y + Math.sin(ba) * sl + Math.sin(ba + Math.PI / 2) * jt
              ctx.lineTo(px, py)
            }
            ctx.strokeStyle = `rgba(255, 100, 20, ${ca * 0.35})`
            ctx.lineWidth = 6
            ctx.stroke()
            ctx.strokeStyle = `rgba(15, 8, 4, ${ca * 0.95})`
            ctx.lineWidth = 3
            ctx.stroke()
            if (prand(c + 50) > 0.35 && len > 30) {
              const bAngle = ba + (prand(c + 30) - 0.5) * 1.5
              const mi = 2 + Math.floor(prand(c + 60) * 2)
              const mx = fx.x + Math.cos(ba) * (len / 5) * mi
              const my = fx.y + Math.sin(ba) * (len / 5) * mi
              const bl = 15 + prand(c + 40) * 25
              ctx.beginPath()
              ctx.moveTo(mx, my)
              ctx.lineTo(mx + Math.cos(bAngle) * bl, my + Math.sin(bAngle) * bl)
              ctx.strokeStyle = `rgba(15, 8, 4, ${ca * 0.8})`
              ctx.lineWidth = 2
              ctx.stroke()
            }
          }
        }

        // ── 2. 大块瓦片翻飞（3D：顶面浅+底面深）──
        const topC = ['#8B7355', '#9C8560', '#A0896C', '#7A6845']
        const botC = ['#3A2820', '#2E1E16', '#44342A', '#2A1A12']
        for (let t = 0; t < 10; t++) {
          const h = prand(t)
          const a = (t / 10) * Math.PI * 2 + h * 0.5
          const sp = 60 + h * 140
          const dx = Math.cos(a) * sp * progress
          const dy = Math.sin(a) * sp * progress - 100 * progress * progress
          const al = Math.max(0, 1 - progress * 1.1)
          if (al <= 0) continue
          const w = 12 + h * 16, ht = 8 + h * 10
          const rot = progress * (3 + h * 5) * (h > 0.5 ? 1 : -1)
          ctx.save()
          ctx.translate(fx.x + dx, fx.y + dy)
          ctx.rotate(rot)
          ctx.globalAlpha = al
          ctx.fillStyle = botC[t % botC.length]
          ctx.fillRect(-w / 2 + 2, -ht / 2 + 2, w, ht)
          ctx.fillStyle = topC[t % topC.length]
          ctx.fillRect(-w / 2, -ht / 2, w, ht)
          ctx.fillStyle = `rgba(255, 240, 200, ${al * 0.15})`
          ctx.fillRect(-w / 2, -ht / 2, w, ht * 0.3)
          ctx.strokeStyle = `rgba(0, 0, 0, ${al * 0.4})`
          ctx.lineWidth = 1
          ctx.strokeRect(-w / 2, -ht / 2, w, ht)
          ctx.restore()
        }

        // ── 3. 碎石飞溅 ──
        for (let d = 0; d < 14; d++) {
          const h = prand(d + 50)
          const a = (d / 14) * Math.PI * 2 + h * 0.6
          const sp = 120 + h * 200
          const ddx = Math.cos(a) * sp * progress
          const ddy = Math.sin(a) * sp * progress - 70 * progress * progress
          const da = Math.max(0, 1 - progress * 1.3)
          if (da <= 0) continue
          ctx.globalAlpha = da
          ctx.fillStyle = botC[d % botC.length]
          ctx.fillRect(fx.x + ddx - 2, fx.y + ddy - 2, 4 + h * 4, 3 + h * 3)
        }
        ctx.globalAlpha = 1

        // ── 4. 三层冲击波环 ──
        for (let ring = 0; ring < 3; ring++) {
          const rd = ring * 0.1
          const rp = Math.max(0, (progress - rd) / (1 - rd))
          if (rp <= 0) continue
          const radius = fx.maxRadius * (0.4 + ring * 0.3) * rp
          const al = (1 - rp) * (0.7 - ring * 0.15)
          if (al <= 0) continue
          ctx.beginPath()
          ctx.arc(fx.x, fx.y, radius, 0, Math.PI * 2)
          const rc = [`rgba(255, 180, 60, ${al})`, `rgba(255, 100, 20, ${al * 0.7})`, `rgba(180, 60, 10, ${al * 0.5})`]
          ctx.strokeStyle = rc[ring]
          ctx.lineWidth = 5 - ring + (1 - rp) * 6
          ctx.stroke()
        }

        // ── 5. 灰尘云 ──
        for (let d = 0; d < 10; d++) {
          const h = prand(d + 200)
          const a = (d / 10) * Math.PI * 2
          const dist = 25 + progress * 100 + h * 20
          const da = Math.max(0, (1 - progress * 1.1) * 0.35)
          if (da <= 0) continue
          ctx.beginPath()
          ctx.arc(fx.x + Math.cos(a) * dist, fx.y + Math.sin(a) * dist, 10 + h * 12, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(140, 120, 95, ${da})`
          ctx.fill()
        }

        // ── 6. 火星 ──
        for (let s = 0; s < 12; s++) {
          const h = prand(s + 300)
          const a = h * Math.PI * 2
          const sp = 160 + h * 280
          const sx = fx.x + Math.cos(a) * sp * progress
          const sy = fx.y + Math.sin(a) * sp * progress - 60 * progress * progress
          const sa = Math.max(0, 1 - progress * 1.5)
          if (sa <= 0) continue
          ctx.globalAlpha = sa
          ctx.fillStyle = h > 0.5 ? '#FFB040' : '#FF6020'
          ctx.beginPath()
          ctx.arc(sx, sy, 2 + h * 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1

        // ── 7. 中心爆发闪光 ──
        if (progress < 0.2) {
          const fp = progress / 0.2
          const fa = (1 - fp) * 0.7
          const fr = 55 * (1 - fp * 0.4)
          const fg = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, fr)
          fg.addColorStop(0, `rgba(255, 245, 200, ${fa})`)
          fg.addColorStop(0.3, `rgba(255, 160, 50, ${fa * 0.6})`)
          fg.addColorStop(1, 'rgba(255, 80, 10, 0)')
          ctx.fillStyle = fg
          ctx.fillRect(fx.x - fr, fx.y - fr, fr * 2, fr * 2)
        }

        ctx.restore()
      } else if (fx.type === 'ranged_flash') {
        // 发射闪光
        const alpha = (1 - progress) * 0.5
        const flashRadius = 30 + progress * 20
        const grad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, flashRadius)
        grad.addColorStop(0, `rgba(255, 80, 40, ${alpha})`)
        grad.addColorStop(1, 'rgba(255, 80, 40, 0)')
        ctx.fillStyle = grad
        ctx.fillRect(fx.x - flashRadius, fx.y - flashRadius, flashRadius * 2, flashRadius * 2)
      }
    }
    ctx.restore()

    // 绘制子弹 — 每种职业/敌人完全独立的渲染路径
    for (const bullet of bullets) {
      const ownerType = bullet.ownerType || 'warrior'
      const bulletAngle = Math.atan2(bullet.vy, bullet.vx)
      const bulletSize = Math.max((bullet.radius || 4) * 3, 10)

      // ── 游侠：箭矢精灵贴图 ──
      if (bullet.friendly && ownerType === 'ranger') {
        if (tileset2Atlas.complete) {
          drawBulletSprite(ctx, tileset2Atlas, bullet.x, bullet.y, bulletAngle, bulletSize, 'weapon_arrow', '#4A9EFF')
        }
        continue
      }

      // ── 法师：紫色魔法能量弹（Canvas 生成） ──
      if (bullet.friendly && ownerType === 'mage') {
        drawMagicOrb(ctx, bullet.x, bullet.y, bulletSize * 1.2, '#9B59B6')
        continue
      }

      // ── 敌人子弹：红色能量弹（Canvas 生成） ──
      if (!bullet.friendly) {
        ctx.save()
        ctx.shadowColor = '#FF4444'
        ctx.shadowBlur = 8
        ctx.globalAlpha = 0.7
        ctx.fillStyle = '#FF4444'
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, bulletSize * 0.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.fillStyle = '#FF8888'
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, bulletSize * 0.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
        continue
      }

      // ── 未知友好子弹 fallback ──
      ctx.save()
      ctx.fillStyle = '#4A9EFF'
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, bullet.radius || 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // 绘制治疗波（弹簧扩散 + easing 淡出）
    for (const wave of (healWaves || [])) {
      const rawProgress = wave.age / 400
      const progress = Easing.out(Easing.cubic)(Math.min(rawProgress, 1))
      const r = wave.radius || progress * wave.maxRadius
      const alpha = interpolate(rawProgress, [0, 0.6, 1], [1, 0.7, 0], {
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.quad)
      })
      ctx.save()
      // 外层波纹
      ctx.globalAlpha = alpha * 0.6
      ctx.strokeStyle = '#32CD32'
      ctx.lineWidth = interpolate(progress, [0, 1], [6, 2], { extrapolateRight: 'clamp' })
      ctx.shadowColor = '#32CD32'
      ctx.shadowBlur = interpolate(progress, [0, 1], [16, 4], { extrapolateRight: 'clamp' })
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, r, 0, Math.PI * 2)
      ctx.stroke()
      // 内层波纹
      ctx.globalAlpha = alpha * 0.3
      ctx.lineWidth = 2
      ctx.shadowBlur = 6
      ctx.beginPath()
      ctx.arc(wave.x, wave.y, r * 0.6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // 绘制玩家（受击闪红+血条平滑）
    for (const player of players) {
      const isLocal = player.id === user?.id
      const charConfig = CHARACTERS[player.characterType] || CHARACTERS.warrior
      const ppos = getRenderPos(player.id, player.x, player.y)
      const idleFrame = (charConfig.spriteName?.front ?? [''])[0] ?? ''
      const idleBase = idleFrame.replace(/_f\d+$/, '')
      const size = getSpriteEntry(idleBase)?.size ?? 48

      if (!player.alive) {
        ctx.globalAlpha = 0.4
        if (spritesLoaded && tileset2Atlas.complete && is0x72Sprite(idleFrame)) {
          draw0x72Sprite(ctx, tileset2Atlas, idleFrame, ppos.x, ppos.y, size)
        } else {
          ctx.fillStyle = '#666'
          ctx.fillRect(ppos.x - size/2, ppos.y - size/2, size, size)
        }
        ctx.globalAlpha = 1.0

        ctx.fillStyle = '#FF4444'
        ctx.font = 'bold 11px "Courier New", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('☠ 已阵亡', ppos.x, ppos.y - 30)
        drawNameTag(ctx, ppos.x, ppos.y - 44, player.name, '#888')
        continue
      }

      // ── 玩家受击检测 ──
      const prevHp = prevHpRef.current.get(player.id)
      if (prevHp !== undefined && player.hp < prevHp) {
        hitAnimRef.current.set(player.id, frame)
      }

      // ── 受击缩放 ──
      const hitStart = hitAnimRef.current.get(player.id)
      let playerRedOverlay = 0
      if (hitStart !== undefined) {
        const hitFrame = frame - hitStart
        if (hitFrame > 20) {
          hitAnimRef.current.delete(player.id)
        } else {
          const hitScale = spring({
            frame: hitFrame,
            fps: FPS,
            from: 1.15,
            to: 1.0,
            config: { damping: 12, stiffness: 200, overshootClamping: true }
          })
          playerRedOverlay = interpolate(hitFrame, [0, 5, 15], [0.4, 0.15, 0], {
            extrapolateRight: 'clamp'
          })
          ctx.save()
          ctx.translate(ppos.x, ppos.y)
          ctx.scale(hitScale, hitScale)
          ctx.translate(-ppos.x, -ppos.y)
        }
      }

      let spriteIndex = charConfig.spriteIndex.front
      let spriteNameArr = charConfig.spriteName?.front ?? ['']
      let flipH = false
      if (player.angle !== undefined) {
        const angle = player.angle
        if (angle > Math.PI/4 && angle <= 3*Math.PI/4) {
          spriteIndex = charConfig.spriteIndex.back
          spriteNameArr = charConfig.spriteName?.back ?? ['']
        } else if (angle > 3*Math.PI/4 || angle <= -3*Math.PI/4) {
          spriteIndex = charConfig.spriteIndex.front
          spriteNameArr = charConfig.spriteName?.front ?? ['']
          flipH = true
        }
      }
      const firstFrame = spriteNameArr[0] ?? ''

      if (spritesLoaded && tileset2Atlas.complete && is0x72Sprite(firstFrame)) {
        const animSprite = getAnimSprite(firstFrame, performance.now() - lastAnimTime.current)
        if (flipH) {
          ctx.save()
          ctx.scale(-1, 1)
          draw0x72Sprite(ctx, tileset2Atlas, animSprite, -ppos.x, ppos.y, size)
          ctx.restore()
        } else {
          draw0x72Sprite(ctx, tileset2Atlas, animSprite, ppos.x, ppos.y, size)
        }
      } else {
        ctx.fillStyle = charConfig.color
        ctx.fillRect(ppos.x - size/2, ppos.y - size/2, size, size)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(ppos.x - size/2, ppos.y - size/2, size, size)
      }

      // 红色受击覆盖层
      if (playerRedOverlay > 0) {
        ctx.globalAlpha = playerRedOverlay
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(ppos.x - size/2, ppos.y - size/2, size, size)
        ctx.globalAlpha = 1
        ctx.restore()
      }

      const pAngle = player.angle ?? 0
      const facingRight = pAngle > -Math.PI / 2 && pAngle <= Math.PI / 2
      const wSprite = WEAPON_SPRITE[player.characterType] || 'weapon_knight_sword'
      const isMelee = player.characterType === 'warrior'
      const flashVal = isLocal ? (deps as any).attackFlashRef?.current || 0 : 0
      if (tileset2Atlas.complete) {
        if (!facingRight) {
          ctx.save()
          ctx.translate(ppos.x, ppos.y)
          ctx.scale(-1, 1)
          drawWeaponSprite(ctx, tileset2Atlas, wSprite, 0, 0, 0, 48, flashVal, isMelee)
          ctx.restore()
        } else {
          drawWeaponSprite(ctx, tileset2Atlas, wSprite, ppos.x, ppos.y, 0, 48, flashVal, isMelee)
        }
      }

      // ── 血条平滑过渡 ──
      const hpKey = `p_${player.id}`
      const displayHp = displayHpRef.current.get(hpKey) ?? player.hp
      const hpDiff = player.hp - displayHp
      const smoothHp = Math.abs(hpDiff) < 0.5 ? player.hp : displayHp + hpDiff * 0.15
      displayHpRef.current.set(hpKey, smoothHp)

      drawHPBar(ctx, ppos.x - 24, ppos.y - 34, 48, 6, smoothHp, player.hpMax, charConfig.color)
      drawNameTag(ctx, ppos.x, ppos.y - 40, player.name, charConfig.color)
    }
  }, [canvasRef, gameStateRef, deps])

  return { render }
}
