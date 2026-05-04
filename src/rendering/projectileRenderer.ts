import type { BulletState, HealWaveState } from '@shared/types'
import { drawBulletSprite, drawMagicOrb } from '../config/sprites'
import { interpolate } from '../utils/animation/interpolate'
import { Easing } from '../utils/animation/easing'

export function drawBullets(
  ctx: CanvasRenderingContext2D,
  bullets: BulletState[],
  tileset2Atlas: HTMLImageElement
): void {
  for (const bullet of bullets) {
    const ownerType = bullet.ownerType || 'warrior'
    const bulletAngle = Math.atan2(bullet.vy, bullet.vx)
    const bulletSize = Math.max((bullet.radius || 4) * 3, 10)

    // 游侠：箭矢精灵贴图
    if (bullet.friendly && ownerType === 'ranger') {
      if (tileset2Atlas.complete) {
        drawBulletSprite(ctx, tileset2Atlas, bullet.x, bullet.y, bulletAngle, bulletSize, 'weapon_arrow', '#4A9EFF')
      }
      continue
    }

    // 法师：紫色魔法能量弹
    if (bullet.friendly && ownerType === 'mage') {
      drawMagicOrb(ctx, bullet.x, bullet.y, bulletSize * 1.2, '#9B59B6')
      continue
    }

    // 敌人子弹：红色能量弹
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

    // 未知友好子弹 fallback
    ctx.save()
    ctx.fillStyle = '#4A9EFF'
    ctx.beginPath()
    ctx.arc(bullet.x, bullet.y, bullet.radius || 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

export function drawHealWaves(
  ctx: CanvasRenderingContext2D,
  healWaves: HealWaveState[]
): void {
  for (const wave of (healWaves || [])) {
    const rawProgress = wave.age / 400
    const progress = Easing.out(Easing.cubic)(Math.min(rawProgress, 1))
    const r = wave.radius || progress * wave.maxRadius
    const alpha = interpolate(rawProgress, [0, 0.6, 1], [1, 0.7, 0], {
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.quad)
    })
    ctx.save()
    ctx.globalAlpha = alpha * 0.6
    ctx.strokeStyle = '#32CD32'
    ctx.lineWidth = interpolate(progress, [0, 1], [6, 2], { extrapolateRight: 'clamp' })
    ctx.shadowColor = '#32CD32'
    ctx.shadowBlur = interpolate(progress, [0, 1], [16, 4], { extrapolateRight: 'clamp' })
    ctx.beginPath()
    ctx.arc(wave.x, wave.y, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalAlpha = alpha * 0.3
    ctx.lineWidth = 2
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(wave.x, wave.y, r * 0.6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}
