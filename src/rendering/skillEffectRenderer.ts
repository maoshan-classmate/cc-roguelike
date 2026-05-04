// ── Skill Cast Visual Effects ──
// Particles, layered rings, screen-shake-ready impact feedback.

const TWO_PI = Math.PI * 2

export interface SkillCastEffect {
  type: string
  x: number
  y: number
  startTime: number
  duration: number
  angle?: number
  color: string
  // particle state (initialized on create)
  particles: Particle[]
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  alpha: number
}

export function createSkillEffectStore() {
  return {
    effects: [] as SkillCastEffect[],

    add(type: string, x: number, y: number, angle?: number) {
      const template = EFFECT_TEMPLATES[type]
      if (!template) return
      this.effects.push({
        type,
        x,
        y,
        startTime: performance.now(),
        duration: template.duration,
        angle,
        color: template.color,
        particles: template.spawnParticles ? template.spawnParticles(x, y, angle) : [],
      })
    },

    update() {
      const now = performance.now()
      this.effects = this.effects.filter(fx => now - fx.startTime < fx.duration)
      // update particles
      for (const fx of this.effects) {
        for (const p of fx.particles) {
          p.x += p.vx
          p.y += p.vy
          p.life--
          p.vy += 0.05 // gravity
        }
        fx.particles = fx.particles.filter(p => p.life > 0)
      }
    },

    draw(ctx: CanvasRenderingContext2D) {
      const now = performance.now()
      for (const fx of this.effects) {
        const progress = (now - fx.startTime) / fx.duration
        const renderer = EFFECT_RENDERERS[fx.type]
        if (renderer) renderer(ctx, fx, progress)
      }
    },

    /** Returns screen shake {dx, dy} from all active effects combined */
    getShake(): { dx: number; dy: number } {
      const now = performance.now()
      let dx = 0, dy = 0
      for (const fx of this.effects) {
        const progress = (now - fx.startTime) / fx.duration
        const shake = SHAKE_CONFIGS[fx.type]
        if (shake && progress < shake.window) {
          const intensity = shake.intensity * (1 - progress / shake.window)
          dx += (Math.random() - 0.5) * intensity
          dy += (Math.random() - 0.5) * intensity
        }
      }
      return { dx, dy }
    }
  }
}

export type SkillEffectStore = ReturnType<typeof createSkillEffectStore>

// ── Shake configs per skill ──
const SHAKE_CONFIGS: Record<string, { intensity: number; window: number }> = {
  war_cry:     { intensity: 4, window: 0.3 },
  shield_bash: { intensity: 6, window: 0.4 },
  frost_nova:  { intensity: 5, window: 0.3 },
  meteor:      { intensity: 12, window: 0.6 },
  arrow_rain:  { intensity: 3, window: 0.8 },
}

// ── Particle spawners ──
function spawnRingParticles(x: number, y: number, count: number, speed: number, colors: string[], lifeRange: [number, number]): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * TWO_PI
    const spd = speed * (0.5 + Math.random() * 0.5)
    particles.push({
      x: x + Math.cos(angle) * (10 + Math.random() * 20),
      y: y + Math.sin(angle) * (10 + Math.random() * 20),
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]),
      maxLife: lifeRange[1],
      size: 1.5 + Math.random() * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.7 + Math.random() * 0.3,
    })
  }
  return particles
}

function spawnDirectionalParticles(x: number, y: number, angle: number, count: number, speed: number, spread: number, colors: string[], lifeRange: [number, number]): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const a = angle + (Math.random() - 0.5) * spread
    const spd = speed * (0.4 + Math.random() * 0.6)
    particles.push({
      x, y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: lifeRange[0] + Math.random() * (lifeRange[1] - lifeRange[0]),
      maxLife: lifeRange[1],
      size: 1 + Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.6 + Math.random() * 0.4,
    })
  }
  return particles
}

function spawnBurstParticles(x: number, y: number, count: number, speed: number, colors: string[], lifeRange: [number, number]): Particle[] {
  return spawnRingParticles(x, y, count, speed, colors, lifeRange)
}

// ── Templates ──
interface EffectTemplate {
  duration: number
  color: string
  spawnParticles?: (x: number, y: number, angle?: number) => Particle[]
}

const EFFECT_TEMPLATES: Record<string, EffectTemplate> = {
  war_cry: {
    duration: 600,
    color: '#FFD700',
    spawnParticles: (x, y) => spawnRingParticles(x, y, 24, 3.5, ['#FFD700', '#FFA500', '#FFE44D'], [20, 40]),
  },
  shield_bash: {
    duration: 450,
    color: '#FFaa33',
    spawnParticles: (x, y, angle) => spawnDirectionalParticles(x, y, angle ?? 0, 18, 4, Math.PI / 3, ['#FFaa33', '#FF8800', '#FFCC44'], [15, 30]),
  },
  dodge_roll: {
    duration: 500,
    color: '#44FFaa',
    spawnParticles: (x, y, angle) => {
      // Dust particles along the roll path
      const dir = angle ?? 0
      const particles: Particle[] = []
      for (let i = 0; i < 10; i++) {
        const t = Math.random()
        const dist = t * 60
        const px = x - Math.cos(dir) * dist + (Math.random() - 0.5) * 20
        const py = y - Math.sin(dir) * dist + (Math.random() - 0.5) * 20
        particles.push({
          x: px,
          y: py,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -Math.random() * 1.2,
          life: 15 + Math.random() * 20,
          maxLife: 35,
          size: 1.5 + Math.random() * 2,
          color: ['#8B7355', '#A08060', '#6B5B3A'][Math.floor(Math.random() * 3)],
          alpha: 0.4 + Math.random() * 0.3,
        })
      }
      return particles
    },
  },
  arrow_rain: {
    duration: 1800,
    color: '#44AA44',
    spawnParticles: (x, y, angle) => {
      const tx = x + Math.cos(angle ?? 0) * 150
      const ty = y + Math.sin(angle ?? 0) * 150
      return spawnRingParticles(tx, ty, 20, 2, ['#88AA44', '#AADD55', '#668833'], [25, 45])
    },
  },
  frost_nova: {
    duration: 500,
    color: '#88DDFF',
    spawnParticles: (x, y) => spawnRingParticles(x, y, 32, 4, ['#88DDFF', '#AAEEFF', '#66CCFF', '#FFFFFF'], [18, 35]),
  },
  meteor: {
    duration: 1800,
    color: '#FF4400',
    spawnParticles: (x, y, angle) => {
      const tx = x + Math.cos(angle ?? 0) * 300
      const ty = y + Math.sin(angle ?? 0) * 300
      return spawnBurstParticles(tx, ty, 40, 5, ['#FF4400', '#FF6600', '#FFaa00', '#FF2200', '#FFCC00'], [25, 50])
    },
  },
  holy_light: {
    duration: 600,
    color: '#FFDD44',
    spawnParticles: (x, y) => spawnRingParticles(x, y, 16, 2, ['#FFDD44', '#FFFFFF', '#FFE888'], [20, 40]),
  },
  sanctuary: {
    duration: 1200,
    color: '#FFD700',
    spawnParticles: (x, y) => spawnRingParticles(x, y, 20, 1.5, ['#FFD700', '#FFE44D', '#FFF8CC'], [30, 55]),
  },
}

// ── Renderers ──
const EFFECT_RENDERERS: Record<string, (ctx: CanvasRenderingContext2D, fx: SkillCastEffect, progress: number) => void> = {
  war_cry: drawWarCry,
  shield_bash: drawShieldBash,
  dodge_roll: drawDodgeRoll,
  arrow_rain: drawArrowRain,
  frost_nova: drawFrostNova,
  meteor: drawMeteor,
  holy_light: drawHolyLight,
  sanctuary: drawSanctuary,
}

// Helper: draw particles
function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    const lifeRatio = p.life / p.maxLife
    ctx.globalAlpha = p.alpha * lifeRatio
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * lifeRatio, 0, TWO_PI)
    ctx.fill()
  }
}

// Helper: draw glowing ring
function drawGlowRing(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number, lineWidth: number, glowRadius?: number) {
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, TWO_PI)
  ctx.stroke()

  if (glowRadius) {
    ctx.globalAlpha = alpha * 0.25
    const grad = ctx.createRadialGradient(x, y, radius * 0.7, x, y, glowRadius)
    grad.addColorStop(0, color)
    grad.addColorStop(1, 'transparent')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(x, y, glowRadius, 0, TWO_PI)
    ctx.fill()
  }
}

// ── War Cry: concentric expanding rings + shockwave ──
function drawWarCry(ctx: CanvasRenderingContext2D, fx: SkillCastEffect, progress: number) {
  ctx.save()
  // Outer ring
  const r1 = progress * 200
  drawGlowRing(ctx, fx.x, fx.y, r1, '#FFD700', (1 - progress) * 0.6, 3 * (1 - progress), r1 * 1.2)

  // Inner ring (delayed)
  if (progress > 0.15) {
    const p2 = (progress - 0.15) / 0.85
    const r2 = p2 * 160
    drawGlowRing(ctx, fx.x, fx.y, r2, '#FFA500', (1 - p2) * 0.4, 2 * (1 - p2))
  }

  // Shockwave fill
  ctx.globalAlpha = (1 - progress) * 0.08
  ctx.fillStyle = '#FFD700'
  ctx.beginPath()
  ctx.arc(fx.x, fx.y, r1 * 0.9, 0, TWO_PI)
  ctx.fill()

  // Particles
  drawParticles(ctx, fx.particles)
  ctx.restore()
}

// ── Shield Bash: cone flash + impact sparks ──
function drawShieldBash(ctx: CanvasRenderingContext2D, fx: SkillCastEffect, progress: number) {
  const angle = fx.angle ?? 0
  const range = 80
  ctx.save()

  // Cone flash
  const flashAlpha = progress < 0.3 ? (progress / 0.3) * 0.7 : (1 - progress) * 0.5
  ctx.globalAlpha = flashAlpha
  ctx.fillStyle = '#FFaa33'
  ctx.beginPath()
  ctx.moveTo(fx.x, fx.y)
  const spread = Math.PI / 4
  const dist = range * (0.4 + progress * 0.6)
  ctx.arc(fx.x, fx.y, dist, angle - spread, angle + spread)
  ctx.closePath()
  ctx.fill()

  // Cone edge glow
  ctx.globalAlpha = flashAlpha * 0.6
  ctx.strokeStyle = '#FFCC44'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(fx.x, fx.y, dist, angle - spread, angle + spread)
  ctx.stroke()

  // Impact ring at tip
  if (progress > 0.3) {
    const tipProgress = (progress - 0.3) / 0.7
    const tipX = fx.x + Math.cos(angle) * dist
    const tipY = fx.y + Math.sin(angle) * dist
    drawGlowRing(ctx, tipX, tipY, tipProgress * 30, '#FFFFFF', (1 - tipProgress) * 0.5, 2 * (1 - tipProgress))
  }

  drawParticles(ctx, fx.particles)
  ctx.restore()
}

// ── Dodge Roll: arc afterimages + dust + landing impact ──
function drawDodgeRoll(ctx: CanvasRenderingContext2D, fx: SkillCastEffect, progress: number) {
  const angle = fx.angle ?? 0
  const rollDistance = 60
  const perpAngle = angle + Math.PI / 2
  const arcHeight = 20
  ctx.save()

  // 5 afterimages along an arc from start to end
  const afterimageCount = 5
  for (let i = 0; i < afterimageCount; i++) {
    const t = (i + 1) / (afterimageCount + 1)
    // Only show afterimages that the animation has "passed"
    if (t > progress) continue

    // Fade: older afterimages (lower t) fade out as progress advances
    const ageSincePass = progress - t
    const fadeAlpha = Math.max(0, 0.6 - ageSincePass * 2.0)
    if (fadeAlpha <= 0) continue

    // Position along arc: interpolate from start to end with perpendicular arc offset
    const startDist = rollDistance
    const endDist = 0
    const dist = startDist + (endDist - startDist) * t
    const arcOffset = -arcHeight * Math.sin(t * Math.PI) // parabolic arc perpendicular to direction

    const px = fx.x + Math.cos(angle) * dist + Math.cos(perpAngle) * arcOffset
    const py = fx.y + Math.sin(angle) * dist + Math.sin(perpAngle) * arcOffset

    // Radius shrinks: 12 → 8
    const radius = 12 - 4 * t

    // Rotation angle: 0 → 360 degrees (body flip simulation)
    const rotAngle = t * TWO_PI

    ctx.globalAlpha = fadeAlpha
    ctx.fillStyle = '#44FFaa'

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(rotAngle)

    // Draw an ellipse to represent the tumbling body
    ctx.beginPath()
    ctx.ellipse(0, 0, radius, radius * 0.5, 0, 0, TWO_PI)
    ctx.fill()

    // Small line across the ellipse to show rotation axis
    ctx.globalAlpha = fadeAlpha * 0.7
    ctx.strokeStyle = '#22DDaa'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-radius * 0.6, 0)
    ctx.lineTo(radius * 0.6, 0)
    ctx.stroke()

    ctx.restore()
  }

  // Landing impact ring at end position (fx.x, fx.y)
  // Appears in the last 30% of the animation
  if (progress > 0.7) {
    const impactProgress = (progress - 0.7) / 0.3
    const maxImpactRadius = 25
    const impactRadius = impactProgress * maxImpactRadius
    const impactAlpha = (1 - impactProgress) * 0.6

    ctx.globalAlpha = impactAlpha
    ctx.strokeStyle = '#44FFaa'
    ctx.lineWidth = 2 * (1 - impactProgress)
    ctx.beginPath()
    ctx.arc(fx.x, fx.y, impactRadius, 0, TWO_PI)
    ctx.stroke()

    // Inner glow of landing impact
    ctx.globalAlpha = impactAlpha * 0.3
    ctx.fillStyle = '#44FFaa'
    ctx.beginPath()
    ctx.arc(fx.x, fx.y, impactRadius * 0.5, 0, TWO_PI)
    ctx.fill()
  }

  drawParticles(ctx, fx.particles)
  ctx.restore()
}

// ── Arrow Rain: targeting reticle + falling arrows + ground impact ──
function drawArrowRain(ctx: CanvasRenderingContext2D, fx: SkillCastEffect, progress: number) {
  const targetX = fx.x + Math.cos(fx.angle ?? 0) * 150
  const targetY = fx.y + Math.sin(fx.angle ?? 0) * 150
  const radius = 160
  ctx.save()

  if (progress < 0.3) {
    // Targeting phase: pulsing reticle
    const pulse = 0.3 + Math.sin(progress * 40) * 0.2
    ctx.globalAlpha = pulse
    ctx.strokeStyle = '#FF4444'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 4])
    ctx.beginPath()
    ctx.arc(targetX, targetY, radius, 0, TWO_PI)
    ctx.stroke()
    ctx.setLineDash([])

    // Cross-hair
    ctx.globalAlpha = pulse * 0.6
    ctx.strokeStyle = '#FF6666'
    ctx.lineWidth = 1
    const cSize = 8
    ctx.beginPath()
    ctx.moveTo(targetX - cSize, targetY); ctx.lineTo(targetX + cSize, targetY)
    ctx.moveTo(targetX, targetY - cSize); ctx.lineTo(targetX, targetY + cSize)
    ctx.stroke()
  } else {
    // Rain phase
    const rainProgress = (progress - 0.3) / 0.7
    const wave = Math.floor(rainProgress * 3)

    // Falling arrows
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TWO_PI + wave * 1.5
      const r = (0.2 + Math.random() * 0.7) * radius * 0.85
      const px = targetX + Math.cos(a) * r
      const arrowFall = ((rainProgress * 3 + i * 0.1) % 1)
      const py = targetY + Math.sin(a) * r - (1 - arrowFall) * 50
      const alpha = (1 - rainProgress) * 0.7

      ctx.globalAlpha = alpha
      ctx.fillStyle = '#88AA44'
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(Math.PI / 2 + (Math.random() - 0.5) * 0.3)
      ctx.fillRect(-1, -6, 2, 12)
      ctx.fillRect(-3, -6, 6, 2)
      ctx.restore()
    }

    // Ground dust ring
    ctx.globalAlpha = (1 - rainProgress) * 0.15
    ctx.fillStyle = '#AA9966'
    ctx.beginPath()
    ctx.arc(targetX, targetY, radius * rainProgress, 0, TWO_PI)
    ctx.fill()
  }

  drawParticles(ctx, fx.particles)
  ctx.restore()
}

// ── Frost Nova: ice ring + crystals + freeze field ──
function drawFrostNova(ctx: CanvasRenderingContext2D, fx: SkillCastEffect, progress: number) {
  const maxRadius = 120
  const radius = progress * maxRadius
  ctx.save()

  // Outer ice ring
  drawGlowRing(ctx, fx.x, fx.y, radius, '#88DDFF', (1 - progress) * 0.7, 4 * (1 - progress), radius * 1.15)

  // Inner freeze field
  ctx.globalAlpha = (1 - progress) * 0.12
  const fieldGrad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, radius)
  fieldGrad.addColorStop(0, '#AAEEFF')
  fieldGrad.addColorStop(0.6, '#66CCFF')
  fieldGrad.addColorStop(1, 'transparent')
  ctx.fillStyle = fieldGrad
  ctx.beginPath()
  ctx.arc(fx.x, fx.y, radius, 0, TWO_PI)
  ctx.fill()

  // Crystalline shards radiating outward
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TWO_PI + progress * 0.5
    const shardDist = radius * (0.6 + progress * 0.4)
    const cx = fx.x + Math.cos(a) * shardDist
    const cy = fx.y + Math.sin(a) * shardDist
    const shardAlpha = (1 - progress) * 0.7
    const shardSize = 3 * (1 - progress * 0.5)

    ctx.globalAlpha = shardAlpha
    ctx.fillStyle = i % 2 === 0 ? '#AAEEFF' : '#FFFFFF'
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(a + progress * 2)
    // Diamond shard shape
    ctx.beginPath()
    ctx.moveTo(0, -shardSize)
    ctx.lineTo(shardSize * 0.5, 0)
    ctx.moveTo(0, shardSize)
    ctx.lineTo(-shardSize * 0.5, 0)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  // Frost mist (radial gradient at center)
  if (progress < 0.6) {
    ctx.globalAlpha = (1 - progress / 0.6) * 0.15
    ctx.fillStyle = '#CCF0FF'
    ctx.beginPath()
    ctx.arc(fx.x, fx.y, 30, 0, TWO_PI)
    ctx.fill()
  }

  drawParticles(ctx, fx.particles)
  ctx.restore()
}

// ── Meteor: falling fireball + trail + explosion + scorch ──
function drawMeteor(ctx: CanvasRenderingContext2D, fx: SkillCastEffect, progress: number) {
  const targetX = fx.x + Math.cos(fx.angle ?? 0) * 300
  const targetY = fx.y + Math.sin(fx.angle ?? 0) * 300
  const radius = 150
  ctx.save()

  if (progress < 0.5) {
    // ── Targeting phase ──
    const pulse = 0.3 + Math.sin(progress * 30) * 0.2
    // Warning circle
    ctx.globalAlpha = pulse
    ctx.strokeStyle = '#FF3300'
    ctx.lineWidth = 2.5
    ctx.setLineDash([10, 5])
    ctx.beginPath()
    ctx.arc(targetX, targetY, radius, 0, TWO_PI)
    ctx.stroke()
    ctx.setLineDash([])

    // Inner warning
    ctx.globalAlpha = pulse * 0.3
    ctx.fillStyle = '#FF220022'
    ctx.beginPath()
    ctx.arc(targetX, targetY, radius, 0, TWO_PI)
    ctx.fill()

    // ── Falling meteor ──
    const fallProgress = progress / 0.5
    const meteorX = targetX + (1 - fallProgress) * 40 * Math.sin(fallProgress * 8)
    const meteorY = targetY - 250 * (1 - fallProgress)
    const meteorSize = 6 + fallProgress * 8

    // Fire trail
    for (let i = 0; i < 6; i++) {
      const trailT = i / 6
      const tx = meteorX - trailT * 20 * Math.cos(fx.angle ?? 0)
      const ty = meteorY - trailT * 30 * (1 - fallProgress * 0.5)
      ctx.globalAlpha = (1 - trailT) * 0.5
      ctx.fillStyle = i < 2 ? '#FFaa00' : '#FF6600'
      ctx.beginPath()
      ctx.arc(tx, ty, meteorSize * (1 - trailT * 0.6), 0, TWO_PI)
      ctx.fill()
    }

    // Meteor body
    ctx.globalAlpha = 0.95
    ctx.fillStyle = '#FF4400'
    ctx.beginPath()
    ctx.arc(meteorX, meteorY, meteorSize, 0, TWO_PI)
    ctx.fill()

    // Hot core
    ctx.globalAlpha = 1
    ctx.fillStyle = '#FFCC00'
    ctx.beginPath()
    ctx.arc(meteorX, meteorY, meteorSize * 0.4, 0, TWO_PI)
    ctx.fill()

    // Glow
    ctx.globalAlpha = 0.3
    const glowGrad = ctx.createRadialGradient(meteorX, meteorY, 0, meteorX, meteorY, meteorSize * 3)
    glowGrad.addColorStop(0, '#FF8800')
    glowGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = glowGrad
    ctx.beginPath()
    ctx.arc(meteorX, meteorY, meteorSize * 3, 0, TWO_PI)
    ctx.fill()

  } else {
    // ── Impact phase ──
    const impactProgress = (progress - 0.5) / 0.5

    // Explosion flash (brief white)
    if (impactProgress < 0.15) {
      ctx.globalAlpha = (1 - impactProgress / 0.15) * 0.4
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(targetX, targetY, radius * 1.2, 0, TWO_PI)
      ctx.fill()
    }

    // Explosion ring
    const explosionRadius = radius * Math.min(impactProgress * 1.5, 1)
    drawGlowRing(ctx, targetX, targetY, explosionRadius, '#FF4400', (1 - impactProgress) * 0.6, 5 * (1 - impactProgress), explosionRadius * 1.1)

    // Inner explosion
    ctx.globalAlpha = (1 - impactProgress) * 0.25
    const innerGrad = ctx.createRadialGradient(targetX, targetY, 0, targetX, targetY, explosionRadius * 0.7)
    innerGrad.addColorStop(0, '#FFCC00')
    innerGrad.addColorStop(0.5, '#FF6600')
    innerGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = innerGrad
    ctx.beginPath()
    ctx.arc(targetX, targetY, explosionRadius * 0.7, 0, TWO_PI)
    ctx.fill()

    // Scorch mark (persistent dark circle)
    if (impactProgress > 0.3) {
      const scorchAlpha = Math.min((impactProgress - 0.3) * 0.5, 0.15) * (1 - (impactProgress - 0.3) / 0.7)
      ctx.globalAlpha = scorchAlpha
      ctx.fillStyle = '#1a0a00'
      ctx.beginPath()
      ctx.arc(targetX, targetY, radius * 0.5, 0, TWO_PI)
      ctx.fill()
    }

    // Debris ring
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI
      const debrisDist = explosionRadius * 0.6 * impactProgress
      const dx = targetX + Math.cos(a) * debrisDist
      const dy = targetY + Math.sin(a) * debrisDist - impactProgress * 15
      ctx.globalAlpha = (1 - impactProgress) * 0.6
      ctx.fillStyle = '#8B4513'
      ctx.fillRect(dx - 2, dy - 2, 4, 4)
    }
  }

  drawParticles(ctx, fx.particles)
  ctx.restore()
}

// ── Holy Light: ascending healing column + sparkles ──
function drawHolyLight(ctx: CanvasRenderingContext2D, fx: SkillCastEffect, progress: number) {
  ctx.save()

  // Healing column
  const columnAlpha = progress < 0.3 ? (progress / 0.3) : (1 - progress) * 0.8
  const grad = ctx.createLinearGradient(fx.x, fx.y - 80, fx.x, fx.y + 15)
  grad.addColorStop(0, 'rgba(255,221,68,0)')
  grad.addColorStop(0.2, `rgba(255,221,68,${columnAlpha * 0.4})`)
  grad.addColorStop(0.5, `rgba(255,248,200,${columnAlpha * 0.6})`)
  grad.addColorStop(0.8, `rgba(255,221,68,${columnAlpha * 0.4})`)
  grad.addColorStop(1, 'rgba(255,221,68,0)')
  ctx.globalAlpha = 1
  ctx.fillStyle = grad
  ctx.fillRect(fx.x - 18, fx.y - 80, 36, 95)

  // Column edge glow
  ctx.globalAlpha = columnAlpha * 0.3
  ctx.strokeStyle = '#FFE888'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(fx.x - 18, fx.y - 80)
  ctx.lineTo(fx.x - 18, fx.y + 15)
  ctx.moveTo(fx.x + 18, fx.y - 80)
  ctx.lineTo(fx.x + 18, fx.y + 15)
  ctx.stroke()

  // Ascending sparkles
  for (let i = 0; i < 8; i++) {
    const t = (progress * 4 + i * 0.125) % 1
    const sy = fx.y + 15 - t * 90
    const sx = fx.x + Math.sin(t * 8 + i * 2) * 12
    const sparkleAlpha = columnAlpha * (t < 0.5 ? t * 2 : (1 - t) * 2)
    ctx.globalAlpha = sparkleAlpha * 0.8
    ctx.fillStyle = '#FFFFFF'
    // 4-point star
    ctx.save()
    ctx.translate(sx, sy)
    ctx.rotate(progress * 3 + i)
    ctx.beginPath()
    ctx.moveTo(0, -2.5)
    ctx.lineTo(0.8, 0)
    ctx.moveTo(0, 2.5)
    ctx.lineTo(-0.8, 0)
    ctx.moveTo(-2.5, 0)
    ctx.lineTo(0, 0.8)
    ctx.moveTo(2.5, 0)
    ctx.lineTo(0, -0.8)
    ctx.stroke()
    ctx.restore()
  }

  // Heal target glow ring
  if (progress < 0.5) {
    drawGlowRing(ctx, fx.x, fx.y, 20 + progress * 15, '#FFDD44', (1 - progress * 2) * 0.3, 2)
  }

  drawParticles(ctx, fx.particles)
  ctx.restore()
}

// ── Sanctuary: expanding golden zone + rune marks ──
function drawSanctuary(ctx: CanvasRenderingContext2D, fx: SkillCastEffect, progress: number) {
  const maxRadius = 150
  const expandProgress = Math.min(progress * 2.5, 1)
  const radius = expandProgress * maxRadius
  ctx.save()

  // Zone fill
  const zoneAlpha = progress < 0.2 ? expandProgress * 0.15 : 0.15 * (1 - (progress - 0.2) / 0.8)
  const zoneGrad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, radius)
  zoneGrad.addColorStop(0, 'rgba(255,215,0,0.2)')
  zoneGrad.addColorStop(0.7, 'rgba(255,215,0,0.08)')
  zoneGrad.addColorStop(1, 'transparent')
  ctx.globalAlpha = zoneAlpha * 2
  ctx.fillStyle = zoneGrad
  ctx.beginPath()
  ctx.arc(fx.x, fx.y, radius, 0, TWO_PI)
  ctx.fill()

  // Pulsing ring edge
  const ringPulse = 0.8 + Math.sin(progress * 12) * 0.2
  drawGlowRing(ctx, fx.x, fx.y, radius, '#FFE44D', zoneAlpha * 2.5 * ringPulse, 1.5, radius * 1.05)

  // Rune marks at cardinal points
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TWO_PI + progress * 0.8
    const rx = fx.x + Math.cos(a) * radius * 0.7
    const ry = fx.y + Math.sin(a) * radius * 0.7
    ctx.globalAlpha = zoneAlpha * 3
    ctx.fillStyle = '#FFD700'
    ctx.save()
    ctx.translate(rx, ry)
    ctx.rotate(a + progress * 2)
    ctx.fillRect(-2, -4, 4, 8)
    ctx.fillRect(-4, -2, 8, 4)
    ctx.restore()
  }

  // Inner healing glow pulse
  if (progress < 0.8) {
    const healPulse = Math.sin(progress * 15) * 0.5 + 0.5
    ctx.globalAlpha = zoneAlpha * healPulse * 0.5
    ctx.fillStyle = '#88FF88'
    ctx.beginPath()
    ctx.arc(fx.x, fx.y, 25, 0, TWO_PI)
    ctx.fill()
  }

  drawParticles(ctx, fx.particles)
  ctx.restore()
}
