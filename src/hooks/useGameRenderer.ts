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
  getSpriteEntry,
  is0x72Sprite,
} from '../config/sprites'

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

// 职业武器配置
const BULLET_COLORS: Record<string, string> = {
  warrior: '#FFD700',
  ranger:  '#4A9EFF',
  mage:    '#9B59B6',
  cleric:  '#32CD32'
}

const BULLET_SPRITE: Record<string, string> = {
  warrior: 'weapon_arrow',
  ranger:  'weapon_arrow',
  mage:    'weapon_green_magic_staff',
  cleric:  'weapon_mace',
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

    const { players, enemies, bullets, items, dungeon } = gameStateRef.current

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

    // 绘制道具
    for (const item of items) {
      const itemConfig = ITEMS[item.type] || ITEMS.health
      const itemSize = getSpriteEntry(itemConfig.spriteName ?? '')?.size ?? 28
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
    }

    // 绘制敌人
    for (const enemy of enemies) {
      if (!enemy.alive) continue

      const enemyConfig = ENEMIES[enemy.type] || ENEMIES.basic
      const size = enemyConfig.size
      const epos = getRenderPos(enemy.id, enemy.x, enemy.y)

      const isDying = enemy.state === 'dying'
      if (isDying && !prevDyingRef.current.has(enemy.id)) {
        prevDyingRef.current.add(enemy.id)
        spawnDeathParticles(enemy.x, enemy.y, enemyConfig.color)
      } else if (!isDying && prevDyingRef.current.has(enemy.id)) {
        prevDyingRef.current.delete(enemy.id)
      }

      if (isDying) {
        const deathProgress = 1 - (enemy.deathTimer || 0) / 500
        const flash = Math.sin(performance.now() / 50) * 0.3 + 0.7
        ctx.globalAlpha = Math.max(0, 1 - deathProgress) * flash
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

      if (isDying) {
        ctx.globalAlpha = 0.3
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
      }

      ctx.globalAlpha = 1

      if (enemyConfig.isBoss) {
        drawBossCrown(ctx, epos.x, epos.y - size/2 - 10, 16)
      }

      if (!isDying) {
        const hpBarWidth = enemyConfig.isBoss ? 64 : size * 1.5
        const hpBarHeight = enemyConfig.isBoss ? 8 : 6
        drawHPBar(
          ctx,
          epos.x - hpBarWidth/2,
          epos.y - size/2 - (enemyConfig.isBoss ? 20 : 14),
          hpBarWidth,
          hpBarHeight,
          enemy.hp,
          enemy.hpMax,
          enemyConfig.isBoss ? '#FFD700' : '#DC143C'
        )
      }
    }

    // 绘制死亡粒子特效
    updateAndDrawParticles(ctx)

    // 绘制伤害飘字
    updateAndDrawDamageTexts(ctx)

    // 绘制子弹
    for (const bullet of bullets) {
      const color = bullet.friendly
        ? (BULLET_COLORS[bullet.ownerType] || '#4A9EFF')
        : '#FF6B6B'
      ctx.save()
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, bullet.radius || 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.restore()
      if (tileset2Atlas.complete) {
        const bulletAngle = Math.atan2(bullet.vy, bullet.vx)
        const bulletSize = Math.max((bullet.radius || 4) * 3, 10)
        const bulletSprite = bullet.friendly ? (BULLET_SPRITE[bullet.ownerType] || 'weapon_arrow') : 'weapon_arrow'
        drawBulletSprite(ctx, tileset2Atlas, bullet.x, bullet.y, bulletAngle, bulletSize, bulletSprite)
      }
    }

    // 绘制玩家
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

      let spriteIndex = charConfig.spriteIndex.front
      let spriteNameArr = charConfig.spriteName?.front ?? ['']
      let flipH = false
      if (player.angle !== undefined) {
        const angle = player.angle
        if (angle > Math.PI/4 && angle <= 3*Math.PI/4) {
          spriteIndex = charConfig.spriteIndex.back
          spriteNameArr = charConfig.spriteName?.back ?? ['']
        } else if (angle > 3*Math.PI/4 || angle <= -3*Math.PI/4) {
          // 朝左移动 → 翻转精灵（默认朝右）
          spriteIndex = charConfig.spriteIndex.front
          spriteNameArr = charConfig.spriteName?.front ?? ['']
          flipH = true
        }
        // 其他角度（含朝右）→ 默认朝右，不翻转
      }
      // 从帧数组提取第一帧（完整帧名，用于查表和动画）
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

      const pAngle = player.angle ?? 0
      const facingRight = pAngle > -Math.PI / 2 && pAngle <= Math.PI / 2
      const wSprite = WEAPON_SPRITE[player.characterType] || 'weapon_knight_sword'
      const isMelee = player.characterType === 'warrior'
      const flashVal = isLocal ? (deps as any).attackFlashRef?.current || 0 : 0
      if (tileset2Atlas.complete) {
        if (!facingRight) {
          // 朝左：先平移到角色位置，水平翻转，再绘制武器（angle=0，位置0,0）
          ctx.save()
          ctx.translate(ppos.x, ppos.y)
          ctx.scale(-1, 1)
          drawWeaponSprite(ctx, tileset2Atlas, wSprite, 0, 0, 0, 48, flashVal, isMelee)
          ctx.restore()
        } else {
          // 朝右：正常绘制
          drawWeaponSprite(ctx, tileset2Atlas, wSprite, ppos.x, ppos.y, 0, 48, flashVal, isMelee)
        }
      }

      drawHPBar(ctx, ppos.x - 24, ppos.y - 34, 48, 6, player.hp, player.hpMax, charConfig.color)
      drawNameTag(ctx, ppos.x, ppos.y - 40, player.name, charConfig.color)
    }
  }, [canvasRef, gameStateRef, deps])

  return { render }
}
