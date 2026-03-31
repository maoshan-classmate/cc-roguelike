import { useCallback, useRef } from 'react'
import { CHARACTERS } from '../config/characters'
import { ENEMIES } from '../config/enemies'
import { ITEMS } from '../config/items'
import {
  drawCharacterSprite,
  drawDungeonSprite,
  drawSheetSprite,
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

const WEAPON_SPRITE: Record<string, string> = {
  warrior: 'weapon_knight_sword',
  ranger:  'weapon_bow',
  mage:    'weapon_red_magic_staff',
  cleric:  'weapon_red_magic_staff',
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
  charSpriteSheet: HTMLImageElement
  dungeonSpriteSheet: HTMLImageElement
  sheetSpriteSheet: HTMLImageElement
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
      charSpriteSheet,
      dungeonSpriteSheet,
      sheetSpriteSheet,
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
    if (dungeon && dungeon.collisionGrid && spritesLoaded && dungeonSpriteSheet.complete) {
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
        drawDungeonSprite(ctx, dungeonSpriteSheet, 23, dungeon.exitPoint.x, dungeon.exitPoint.y, tileSize)
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
        drawDungeonSprite(ctx, dungeonSpriteSheet, 23, dungeon.exitPoint.x, dungeon.exitPoint.y, tileSize)
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
      } else if (spritesLoaded && dungeonSpriteSheet.complete) {
        drawDungeonSprite(ctx, dungeonSpriteSheet, itemConfig.spriteIndex, item.x, item.y, itemSize)
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
        } else if (enemyConfig.sheet === 'sheet' && sheetSpriteSheet.complete) {
          drawSheetSprite(ctx, sheetSpriteSheet, enemyConfig.spriteIndex, epos.x, epos.y, size)
        } else if (enemyConfig.sheet === 'dungeon' && dungeonSpriteSheet.complete) {
          drawDungeonSprite(ctx, dungeonSpriteSheet, enemyConfig.spriteIndex, epos.x, epos.y, size)
        } else if (charSpriteSheet.complete) {
          drawCharacterSprite(ctx, charSpriteSheet, enemyConfig.spriteIndex, epos.x, epos.y, size)
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
        drawBulletSprite(ctx, tileset2Atlas, bullet.x, bullet.y, bulletAngle, bulletSize)
      }
    }

    // 绘制玩家
    for (const player of players) {
      const isLocal = player.id === user?.id
      const charConfig = CHARACTERS[player.characterType] || CHARACTERS.warrior
      const ppos = getRenderPos(player.id, player.x, player.y)
      const size = getSpriteEntry(charConfig.spriteName?.front ?? '')?.size ?? 48

      if (!player.alive) {
        ctx.globalAlpha = 0.4
        if (spritesLoaded && tileset2Atlas.complete && is0x72Sprite(charConfig.spriteName?.front ?? '')) {
          draw0x72Sprite(ctx, tileset2Atlas, charConfig.spriteName?.front ?? '', ppos.x, ppos.y, size)
        } else if (spritesLoaded && charSpriteSheet.complete) {
          drawCharacterSprite(ctx, charSpriteSheet, charConfig.spriteIndex.front, ppos.x, ppos.y, size)
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
      let spriteName = charConfig.spriteName?.front
      let flipH = false
      if (player.angle !== undefined) {
        const angle = player.angle
        if (angle > Math.PI/4 && angle <= 3*Math.PI/4) {
          spriteIndex = charConfig.spriteIndex.back
          spriteName = charConfig.spriteName?.back
        } else if (angle > -Math.PI/4 && angle <= Math.PI/4) {
          spriteIndex = charConfig.spriteIndex.front
          spriteName = charConfig.spriteName?.front
          flipH = true
        } else if (angle > 3*Math.PI/4 || angle <= -3*Math.PI/4) {
          spriteIndex = charConfig.spriteIndex.front
          spriteName = charConfig.spriteName?.front
        } else {
          spriteIndex = charConfig.spriteIndex.front
          spriteName = charConfig.spriteName?.front
        }
      }

      if (spritesLoaded && tileset2Atlas.complete && is0x72Sprite(spriteName ?? '')) {
        const animSprite = getAnimSprite(spriteName ?? '', performance.now() - lastAnimTime.current)
        if (flipH) {
          ctx.save()
          ctx.scale(-1, 1)
          draw0x72Sprite(ctx, tileset2Atlas, animSprite, -ppos.x, ppos.y, size)
          ctx.restore()
        } else {
          draw0x72Sprite(ctx, tileset2Atlas, animSprite, ppos.x, ppos.y, size)
        }
      } else if (spritesLoaded && charSpriteSheet.complete) {
        if (flipH) {
          ctx.save()
          ctx.scale(-1, 1)
          drawCharacterSprite(ctx, charSpriteSheet, spriteIndex, -ppos.x, ppos.y, size)
          ctx.restore()
        } else {
          drawCharacterSprite(ctx, charSpriteSheet, spriteIndex, ppos.x, ppos.y, size)
        }
      } else {
        ctx.fillStyle = charConfig.color
        ctx.fillRect(ppos.x - size/2, ppos.y - size/2, size, size)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(ppos.x - size/2, ppos.y - size/2, size, size)
      }

      const pAngle = player.angle ?? 0
      const wSprite = WEAPON_SPRITE[player.characterType] || 'weapon_knight_sword'
      if (tileset2Atlas.complete) {
        drawWeaponSprite(ctx, tileset2Atlas, wSprite, ppos.x, ppos.y, pAngle, 48, isLocal ? (deps as any).attackFlashRef?.current || 0 : 0)
      }

      drawHPBar(ctx, ppos.x - 24, ppos.y - 34, 48, 6, player.hp, player.hpMax, charConfig.color)
      drawNameTag(ctx, ppos.x, ppos.y - 40, player.name, charConfig.color)
    }
  }, [canvasRef, gameStateRef, deps])

  return { render }
}
