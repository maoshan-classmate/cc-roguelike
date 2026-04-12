import { useCallback, useRef } from 'react'
import { CHARACTERS } from '../config/characters'
import { ENEMIES } from '../config/enemies'
import { ITEMS } from '../config/items'
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
import { spring } from '../utils/animation/spring'
import { interpolate } from '../utils/animation/interpolate'
import { Easing } from '../utils/animation/easing'

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

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const {
      user,
      spritesLoaded,
      tileset2Atlas,
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
        if (tileset2Atlas.complete && is0x72Sprite(enemyConfig.spriteName ?? '')) {
          const animSprite = getAnimSprite(enemyConfig.spriteName ?? '', performance.now() - lastAnimTime.current)
          draw0x72Sprite(ctx, tileset2Atlas, animSprite, epos.x, epos.y, size)
        } else {
          ctx.fillStyle = enemyConfig.color
          ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1
          ctx.strokeRect(epos.x - size/2, epos.y - size/2, size, size)
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
