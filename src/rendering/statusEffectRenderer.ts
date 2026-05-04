import type { SerializedStatusEffect } from '@shared/types'

// ── Status Effect Visual Renderer ──
// Draws visual indicators on entities with active status effects.

const TWO_PI = Math.PI * 2

// Effect type → color/visual mapping
const EFFECT_STYLES: Record<string, { color: string; glow?: string; priority: number }> = {
  stun:      { color: '#FFD700', glow: 'rgba(255,215,0,0.3)', priority: 10 },
  freeze:    { color: '#88DDFF', glow: 'rgba(136,221,255,0.4)', priority: 9 },
  root:      { color: '#8B6914', glow: 'rgba(139,105,20,0.3)', priority: 8 },
  slow:      { color: '#4488FF', glow: 'rgba(68,136,255,0.2)', priority: 5 },
  burn:      { color: '#FF6600', glow: 'rgba(255,102,0,0.3)', priority: 6 },
  taunt:     { color: '#FF3333', priority: 7 },
  vulnerable: { color: '#CC44FF', glow: 'rgba(204,68,255,0.2)', priority: 4 },
  weaken:    { color: '#9966CC', priority: 3 },
  silence:   { color: '#888888', priority: 4 },
  shield:    { color: '#4488FF', glow: 'rgba(68,136,255,0.25)', priority: 2 },
  invulnerable: { color: '#FFD700', glow: 'rgba(255,215,0,0.3)', priority: 10 },
  iframes:   { color: '#FFD700', glow: 'rgba(255,215,0,0.3)', priority: 10 },
  heal_over_time: { color: '#44FF44', priority: 1 },
  cc_immune: { color: '#FFFFFF', glow: 'rgba(255,255,255,0.2)', priority: 7 },
  speed_boost: { color: '#44FFAA', priority: 1 },
  energy_regen_boost: { color: '#AADDFF', priority: 1 },
}

export function drawStatusEffects(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  effects: SerializedStatusEffect[],
  frame: number,
  entityRadius: number = 16
): void {
  if (!effects || effects.length === 0) return

  // Sort by priority (highest first) to draw most important effects on top
  const sorted = [...effects].sort((a, b) => {
    const pa = EFFECT_STYLES[a.t]?.priority ?? 0
    const pb = EFFECT_STYLES[b.t]?.priority ?? 0
    return pb - pa
  })

  for (const effect of sorted) {
    const style = EFFECT_STYLES[effect.t]
    if (!style) continue

    switch (effect.t) {
      case 'stun':
        drawStunStars(ctx, x, y - entityRadius - 12, frame)
        break
      case 'freeze':
        drawFreezeOverlay(ctx, x, y, entityRadius)
        break
      case 'root':
        drawRootChains(ctx, x, y, entityRadius, frame)
        break
      case 'slow':
        drawSlowIndicator(ctx, x, y, entityRadius)
        break
      case 'burn':
        drawBurnParticles(ctx, x, y, entityRadius, frame)
        break
      case 'taunt':
        drawTauntMark(ctx, x, y - entityRadius - 16, frame)
        break
      case 'invulnerable':
      case 'iframes':
        drawInvulnGlow(ctx, x, y, entityRadius, frame, style.color)
        break
      case 'shield':
        drawShieldBubble(ctx, x, y, entityRadius, frame)
        break
      case 'heal_over_time':
        drawHealParticles(ctx, x, y, entityRadius, frame)
        break
      case 'vulnerable':
        drawDebuffArrow(ctx, x, y - entityRadius - 10, frame, style.color)
        break
      case 'silence':
        drawSilenceIndicator(ctx, x, y - entityRadius - 8)
        break
      case 'cc_immune':
        drawCcImmuneAura(ctx, x, y, entityRadius, frame)
        break
    }
  }
}

// ── Individual effect renderers ──

function drawStunStars(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
  ctx.save()
  const rotation = (frame * 0.05) % TWO_PI
  const count = 3
  for (let i = 0; i < count; i++) {
    const angle = rotation + (i * TWO_PI) / count
    const sx = x + Math.cos(angle) * 10
    const sy = y + Math.sin(angle) * 5
    drawStar(ctx, sx, sy, 4, '#FFD700')
  }
  ctx.restore()
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2
    const px = x + Math.cos(a) * size
    const py = y + Math.sin(a) * size
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
    const ia = a + Math.PI / 4
    const ix = x + Math.cos(ia) * (size * 0.4)
    const iy = y + Math.sin(ia) * (size * 0.4)
    ctx.lineTo(ix, iy)
  }
  ctx.closePath()
  ctx.fill()
}

function drawFreezeOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save()
  ctx.globalAlpha = 0.35
  ctx.fillStyle = '#88DDFF'
  ctx.beginPath()
  ctx.arc(x, y, r + 4, 0, TWO_PI)
  ctx.fill()

  // Ice crystals
  ctx.globalAlpha = 0.6
  ctx.strokeStyle = '#AAEEFF'
  ctx.lineWidth = 1.5
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    const cx = x + Math.cos(a) * (r - 2)
    const cy = y + Math.sin(a) * (r - 2)
    ctx.beginPath()
    ctx.moveTo(cx - 3, cy)
    ctx.lineTo(cx + 3, cy)
    ctx.moveTo(cx, cy - 3)
    ctx.lineTo(cx, cy + 3)
    ctx.stroke()
  }
  ctx.restore()
}

function drawRootChains(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frame: number): void {
  ctx.save()
  ctx.strokeStyle = '#8B6914'
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.6
  const wobble = Math.sin(frame * 0.1) * 2
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + frame * 0.02
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    ctx.lineTo(x + Math.cos(a) * (r + 8 + wobble), y + Math.sin(a) * (r + 8 + wobble))
    ctx.stroke()
  }
  ctx.restore()
}

function drawSlowIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.save()
  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#4488FF'
  ctx.beginPath()
  ctx.arc(x, y, r + 2, 0, TWO_PI)
  ctx.fill()
  ctx.restore()
}

function drawBurnParticles(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frame: number): void {
  ctx.save()
  const count = 5
  for (let i = 0; i < count; i++) {
    const seed = i * 137.508
    const t = ((frame * 3 + seed) % 60) / 60
    const px = x + Math.cos(seed + frame * 0.08) * r * (0.3 + t * 0.7)
    const py = y - r - t * 20
    const alpha = 1 - t
    const size = 2 + (1 - t) * 3
    ctx.globalAlpha = alpha * 0.8
    ctx.fillStyle = t < 0.5 ? '#FF6600' : '#FFaa00'
    ctx.beginPath()
    ctx.arc(px, py, size, 0, TWO_PI)
    ctx.fill()
  }
  ctx.restore()
}

function drawTauntMark(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
  ctx.save()
  // Pulsing red exclamation mark
  const pulse = 0.8 + Math.sin(frame * 0.15) * 0.2
  ctx.globalAlpha = pulse
  ctx.fillStyle = '#FF3333'
  ctx.font = 'bold 14px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('!', x, y)
  ctx.restore()
}

function drawInvulnGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frame: number, color: string): void {
  ctx.save()
  const alpha = 0.2 + Math.sin(frame * 0.12) * 0.1
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(x, y, r + 5, 0, TWO_PI)
  ctx.stroke()

  // Inner glow
  ctx.globalAlpha = alpha * 0.5
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r + 2, 0, TWO_PI)
  ctx.fill()
  ctx.restore()
}

function drawShieldBubble(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frame: number): void {
  ctx.save()
  const alpha = 0.15 + Math.sin(frame * 0.08) * 0.05
  ctx.globalAlpha = alpha
  ctx.fillStyle = '#4488FF'
  ctx.beginPath()
  ctx.arc(x, y, r + 6, 0, TWO_PI)
  ctx.fill()
  ctx.strokeStyle = '#6699FF'
  ctx.lineWidth = 1.5
  ctx.globalAlpha = alpha * 2
  ctx.stroke()
  ctx.restore()
}

function drawHealParticles(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frame: number): void {
  ctx.save()
  for (let i = 0; i < 3; i++) {
    const seed = i * 80
    const t = ((frame * 2 + seed) % 40) / 40
    const px = x + Math.cos(seed) * 8
    const py = y - r - t * 25
    ctx.globalAlpha = (1 - t) * 0.7
    ctx.fillStyle = '#44FF44'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('+', px, py)
  }
  ctx.restore()
}

function drawDebuffArrow(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, color: string): void {
  ctx.save()
  const bob = Math.sin(frame * 0.1) * 2
  ctx.globalAlpha = 0.7
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x, y + 6 + bob)
  ctx.lineTo(x - 5, y - 2 + bob)
  ctx.lineTo(x + 5, y - 2 + bob)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function drawSilenceIndicator(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save()
  ctx.globalAlpha = 0.6
  ctx.strokeStyle = '#888888'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(x, y + 2, 5, 0, TWO_PI)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 3, y + 5)
  ctx.lineTo(x + 3, y - 1)
  ctx.stroke()
  ctx.restore()
}

function drawCcImmuneAura(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, frame: number): void {
  ctx.save()
  const alpha = 0.15 + Math.sin(frame * 0.1) * 0.05
  ctx.globalAlpha = alpha
  ctx.strokeStyle = '#FFFFFF'
  ctx.lineWidth = 2
  ctx.setLineDash([4, 4])
  ctx.lineDashOffset = frame * 0.5
  ctx.beginPath()
  ctx.arc(x, y, r + 8, 0, TWO_PI)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}
