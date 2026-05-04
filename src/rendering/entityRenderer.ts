import { CHARACTERS } from '../config/characters'
import { ENEMIES } from '../config/enemies'
import { drawFallbackRect } from './fallbackDraw'
import {
  draw0x72Sprite,
  drawHPBar,
  drawBossCrown,
  drawNameTag,
  drawWeaponSprite,
  getSpriteEntry,
  is0x72Sprite,
} from '../config/sprites'
import { isGeneratedSprite, drawGeneratedSprite } from '../config/generatedSprites'
import { spring } from '../utils/animation/spring'
import { interpolate } from '../utils/animation/interpolate'
import type { PlayerState, EnemyState } from '@shared/types'

const WEAPON_SPRITE: Record<string, string> = {
  warrior: 'weapon_knight_sword',
  ranger:  'weapon_bow',
  mage:    'weapon_red_magic_staff',
  cleric:  'weapon_green_magic_staff',
}

interface AnimRefs {
  frame: number
  fps: number
  elapsedMs: number
  hitAnimRef: Map<string, number>
  deathAnimRef: Map<string, number>
  displayHpRef: Map<string, number>
  prevDyingRef: Set<string>
  prevHpRef: Map<string, number>
}

const getEnemyAnimFrame = (spriteName: string, elapsedMs: number): string => {
  const frame = Math.floor(elapsedMs / 150) % 4
  if (/_anim_f\d+$/.test(spriteName)) return spriteName.replace(/_f\d+$/, `_f${frame}`)
  if (/_f\d+$/.test(spriteName)) return spriteName.replace(/_f\d+$/, `_f${frame % 3}`)
  return spriteName
}

export function drawEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: EnemyState[],
  deps: {
    getRenderPos: (id: string, tx: number, ty: number) => { x: number; y: number }
    spritesLoaded: boolean
    tileset2Atlas: HTMLImageElement
    generatedSheets: Record<string, HTMLImageElement>
    lastAnimTime: number
    spawnDeathParticles: (x: number, y: number, color: string) => void
    animRefs: AnimRefs
  }
): void {
  const { getRenderPos, spritesLoaded, tileset2Atlas, generatedSheets, lastAnimTime, spawnDeathParticles, animRefs } = deps
  const { frame, fps, elapsedMs, hitAnimRef, deathAnimRef, displayHpRef, prevDyingRef, prevHpRef } = animRefs

  for (const enemy of enemies) {
    if (!enemy.alive) continue

    const enemyConfig = ENEMIES[enemy.type] || ENEMIES.basic
    const size = enemyConfig.size
    const epos = getRenderPos(enemy.id, enemy.x, enemy.y)

    const isDying = enemy.state === 'dying'
    if (isDying && !prevDyingRef.has(enemy.id)) {
      prevDyingRef.add(enemy.id)
      deathAnimRef.set(enemy.id, frame)
      spawnDeathParticles(enemy.x, enemy.y, enemyConfig.color)
    } else if (!isDying && prevDyingRef.has(enemy.id)) {
      prevDyingRef.delete(enemy.id)
      deathAnimRef.delete(enemy.id)
    }

    const prevHp = prevHpRef.get(enemy.id)
    if (prevHp !== undefined && enemy.hp < prevHp && !isDying) {
      hitAnimRef.set(enemy.id, frame)
    }

    ctx.save()

    // Death animation
    if (isDying) {
      const deathStart = deathAnimRef.get(enemy.id) ?? frame
      const deathFrame = frame - deathStart
      const deathScale = spring({
        frame: deathFrame, fps,
        from: 1.0, to: 0.3,
        config: { damping: 8, stiffness: 150, overshootClamping: true }
      })
      const deathOpacity = interpolate(deathFrame, [0, 15, 30], [1, 0.6, 0], { extrapolateRight: 'clamp' })
      ctx.globalAlpha = Math.max(0, deathOpacity)
      ctx.translate(epos.x, epos.y)
      ctx.scale(deathScale, deathScale)
      ctx.translate(-epos.x, -epos.y)
    }

    // Hit flash + scale
    let redOverlay = 0
    const hitStart = hitAnimRef.get(enemy.id)
    if (hitStart !== undefined) {
      const hitFrame = frame - hitStart
      if (hitFrame > 20) {
        hitAnimRef.delete(enemy.id)
      } else {
        const hitScale = spring({
          frame: hitFrame, fps,
          from: 1.2, to: 1.0,
          config: { damping: 12, stiffness: 200, overshootClamping: true }
        })
        redOverlay = interpolate(hitFrame, [0, 5, 15], [0.5, 0.2, 0], { extrapolateRight: 'clamp' })
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

      if (enemyConfig.isBoss && tileset2Atlas.complete) {
        const bossState = enemy.state
        const bossCasting = enemy.bossCasting
        const castProgress = enemy.bossCastTimer || 0
        const castWindup = bossCasting === 'ranged' ? 500 : bossCasting === 'aoe' ? 800 : 0
        const progress = castWindup > 0 ? Math.min(castProgress / castWindup, 1) : 0

        if (bossCasting === 'ranged' || bossCasting === 'aoe') {
          const fastFrame = Math.floor((performance.now() - lastAnimTime) / 80) % 4
          const frameName = `big_demon_run_anim_f${fastFrame}`
          const pulse = 1.0 + progress * 0.12 + Math.sin(performance.now() / 60) * 0.03 * progress
          const glowAlpha = progress * 0.45
          const glowColor = bossCasting === 'ranged'
            ? `rgba(255, 60, 30, ${glowAlpha})`
            : `rgba(255, 160, 30, ${glowAlpha})`

          ctx.save()
          ctx.translate(epos.x, epos.y)
          ctx.scale(pulse, pulse)
          draw0x72Sprite(ctx, tileset2Atlas, frameName, 0, 0, size)
          const glowRadius = size * (0.6 + progress * 0.4)
          const grad = ctx.createRadialGradient(0, 0, size * 0.2, 0, 0, glowRadius)
          grad.addColorStop(0, glowColor)
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = grad
          ctx.fillRect(-glowRadius, -glowRadius, glowRadius * 2, glowRadius * 2)
          ctx.restore()

          if (bossCasting === 'aoe') {
            const aoeRadius = 100
            const indicatorAlpha = 0.15 + progress * 0.25
            ctx.beginPath()
            ctx.arc(epos.x, epos.y, aoeRadius, 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255, 80, 20, ${indicatorAlpha * 0.3})`
            ctx.fill()
            const blink = 0.5 + 0.5 * Math.sin(performance.now() / 80)
            ctx.strokeStyle = `rgba(255, 120, 40, ${(indicatorAlpha + blink * 0.2) * 0.8})`
            ctx.lineWidth = 2
            ctx.setLineDash([6, 4])
            ctx.stroke()
            ctx.setLineDash([])
          }

          bossDrawn = true
        } else if (bossState === 'chase' || bossState === 'attack') {
          sName = 'big_demon_run_anim_f0'
        }
      }

      if (!bossDrawn) {
        if (isGeneratedSprite(sName)) {
          const base = sName.replace(/_f\d+$/, '')
          const sheet = generatedSheets[base]
          if (sheet && sheet.complete) {
            drawGeneratedSprite(ctx, sheet, sName, epos.x, epos.y, size, animRefs.elapsedMs)
          } else {
            ctx.fillStyle = enemyConfig.color
            ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
          }
        } else if (tileset2Atlas.complete && is0x72Sprite(sName)) {
          const animSprite = getEnemyAnimFrame(sName, animRefs.elapsedMs)
          draw0x72Sprite(ctx, tileset2Atlas, animSprite, epos.x, epos.y, size)
        } else {
          drawFallbackRect(ctx, epos.x, epos.y, size, enemyConfig.color)
        }
      }
    } else {
      drawFallbackRect(ctx, epos.x, epos.y, size, enemyConfig.color)
    }

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
      const hpKey = `e_${enemy.id}`
      const displayHp = displayHpRef.get(hpKey) ?? enemy.hp
      const hpDiff = enemy.hp - displayHp
      const smoothHp = Math.abs(hpDiff) < 0.5 ? enemy.hp : displayHp + hpDiff * 0.15
      displayHpRef.set(hpKey, smoothHp)

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
}

export function drawPlayers(
  ctx: CanvasRenderingContext2D,
  players: PlayerState[],
  deps: {
    user: { id: string } | null
    getRenderPos: (id: string, tx: number, ty: number) => { x: number; y: number }
    spritesLoaded: boolean
    tileset2Atlas: HTMLImageElement
    elapsedMs: number
    animRefs: AnimRefs
    attackFlashRef?: { current: number }
    getAnimSprite: (name: string, ms: number) => string
  }
): void {
  const { user, getRenderPos, spritesLoaded, tileset2Atlas, elapsedMs, animRefs, attackFlashRef, getAnimSprite } = deps
  const { frame, fps, hitAnimRef, displayHpRef, prevHpRef } = animRefs

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

    const prevHp = prevHpRef.get(player.id)
    if (prevHp !== undefined && player.hp < prevHp) {
      hitAnimRef.set(player.id, frame)
    }

    const hitStart = hitAnimRef.get(player.id)
    let playerRedOverlay = 0
    if (hitStart !== undefined) {
      const hitFrame = frame - hitStart
      if (hitFrame > 20) {
        hitAnimRef.delete(player.id)
      } else {
        const hitScale = spring({
          frame: hitFrame, fps,
          from: 1.15, to: 1.0,
          config: { damping: 12, stiffness: 200, overshootClamping: true }
        })
        playerRedOverlay = interpolate(hitFrame, [0, 5, 15], [0.4, 0.15, 0], { extrapolateRight: 'clamp' })
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
      const animSprite = getAnimSprite(firstFrame, elapsedMs)
      if (flipH) {
        ctx.save()
        ctx.scale(-1, 1)
        draw0x72Sprite(ctx, tileset2Atlas, animSprite, -ppos.x, ppos.y, size)
        ctx.restore()
      } else {
        draw0x72Sprite(ctx, tileset2Atlas, animSprite, ppos.x, ppos.y, size)
      }
    } else {
      drawFallbackRect(ctx, ppos.x, ppos.y, size, charConfig.color)
    }

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
    const flashVal = isLocal ? attackFlashRef?.current || 0 : 0
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

    const hpKey = `p_${player.id}`
    const displayHp = displayHpRef.get(hpKey) ?? player.hp
    const hpDiff = player.hp - displayHp
    const smoothHp = Math.abs(hpDiff) < 0.5 ? player.hp : displayHp + hpDiff * 0.15
    displayHpRef.set(hpKey, smoothHp)

    drawHPBar(ctx, ppos.x - 24, ppos.y - 34, 48, 6, smoothHp, player.hpMax, charConfig.color)
    drawNameTag(ctx, ppos.x, ppos.y - 40, player.name, charConfig.color)
  }
}

export type { AnimRefs }
