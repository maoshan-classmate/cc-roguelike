// ── Skill Range Preview ──
// Shows skill area/range indicator while holding the skill key.

const TWO_PI = Math.PI * 2

export interface SkillPreviewState {
  active: boolean
  skillType: string
  skillId: string
  x: number
  y: number
  angle: number
  startTime: number
}

interface PreviewDef {
  type: 'line' | 'shockwave' | 'cone' | 'arc_line' | 'target_grid' | 'ice_crystal' | 'target_fire' | 'reticle' | 'rune_circle'
  color: string
  radius?: number
  range?: number
  arc?: number
}

const PREVIEW_DEFS: Record<string, PreviewDef> = {
  dash:          { type: 'line', range: 200, color: '#C0C0C0' },
  war_cry:       { type: 'shockwave', radius: 200, color: '#FFD700' },
  shield_bash:   { type: 'cone', range: 80, arc: Math.PI / 4, color: '#FFaa33' },
  dodge_roll:    { type: 'arc_line', range: 150, color: '#44FFaa' },
  arrow_rain:    { type: 'target_grid', radius: 160, range: 150, color: '#FF4444' },
  frost_nova:    { type: 'ice_crystal', radius: 120, color: '#88DDFF' },
  meteor:        { type: 'target_fire', radius: 150, range: 300, color: '#FF4400' },
  holy_light:    { type: 'reticle', radius: 150, color: '#FFDD44' },
  sanctuary:     { type: 'rune_circle', radius: 150, color: '#FFD700' },
}

export function drawSkillPreview(ctx: CanvasRenderingContext2D, preview: SkillPreviewState) {
  if (!preview.active) return

  const def = PREVIEW_DEFS[preview.skillId]
  if (!def) return

  const elapsed = performance.now() - preview.startTime
  const breathe = 0.8 + Math.sin(elapsed * 0.004) * 0.2
  const spin = elapsed * 0.001

  ctx.save()

  switch (def.type) {
    case 'line': {
      // Dash direction line
      const range = def.range!
      const endX = preview.x + Math.cos(preview.angle) * range
      const endY = preview.y + Math.sin(preview.angle) * range

      ctx.globalAlpha = 0.3 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 3
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      ctx.moveTo(preview.x, preview.y)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      ctx.setLineDash([])

      ctx.globalAlpha = 0.2 * breathe
      ctx.fillStyle = def.color
      ctx.beginPath()
      ctx.arc(endX, endY, 16, 0, TWO_PI)
      ctx.fill()

      ctx.globalAlpha = 0.4 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(endX, endY, 16, 0, TWO_PI)
      ctx.stroke()

      // Arrow head
      ctx.globalAlpha = 0.4 * breathe
      ctx.fillStyle = def.color
      ctx.save()
      ctx.translate(endX, endY)
      ctx.rotate(preview.angle)
      ctx.beginPath()
      ctx.moveTo(6, 0)
      ctx.lineTo(-6, -4)
      ctx.lineTo(-6, 4)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      break
    }

    case 'shockwave': {
      // War cry: 3 concentric rings + rotating arcs
      const r = def.radius!
      for (let ring = 0; ring < 3; ring++) {
        const ringR = r * (0.5 + ring * 0.25)
        const alpha = (0.4 - ring * 0.1) * breathe
        ctx.globalAlpha = alpha
        ctx.strokeStyle = def.color
        ctx.lineWidth = 3 - ring
        ctx.setLineDash(ring === 0 ? [8, 4] : [])
        ctx.beginPath()
        ctx.arc(preview.x, preview.y, ringR, 0, TWO_PI)
        ctx.stroke()
      }
      ctx.setLineDash([])

      // 8 rotating arc segments
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TWO_PI + spin
        const arcLen = 0.3
        ctx.globalAlpha = 0.3 * breathe
        ctx.strokeStyle = def.color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(preview.x, preview.y, r * 0.85, a, a + arcLen)
        ctx.stroke()
      }

      // Center "!" taunt marker
      ctx.globalAlpha = 0.5 * breathe
      ctx.fillStyle = def.color
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('!', preview.x, preview.y)
      break
    }

    case 'cone': {
      // Shield bash cone with edge texture
      const range = def.range!
      const arc = def.arc!

      ctx.globalAlpha = 0.1 * breathe
      ctx.fillStyle = def.color
      ctx.beginPath()
      ctx.moveTo(preview.x, preview.y)
      ctx.arc(preview.x, preview.y, range, preview.angle - arc, preview.angle + arc)
      ctx.closePath()
      ctx.fill()

      // Cone edge with short dash texture
      ctx.globalAlpha = 0.4 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 2
      ctx.setLineDash([5, 3])
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, range, preview.angle - arc, preview.angle + arc)
      ctx.stroke()
      ctx.setLineDash([])

      // Side lines
      ctx.globalAlpha = 0.25 * breathe
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(preview.x, preview.y)
      ctx.lineTo(preview.x + Math.cos(preview.angle - arc) * range, preview.y + Math.sin(preview.angle - arc) * range)
      ctx.moveTo(preview.x, preview.y)
      ctx.lineTo(preview.x + Math.cos(preview.angle + arc) * range, preview.y + Math.sin(preview.angle + arc) * range)
      ctx.stroke()

      // Edge hash marks
      for (let i = 0; i < 5; i++) {
        const a = preview.angle - arc + (2 * arc * i) / 4
        const x1 = preview.x + Math.cos(a) * (range - 6)
        const y1 = preview.y + Math.sin(a) * (range - 6)
        const x2 = preview.x + Math.cos(a) * (range + 2)
        const y2 = preview.y + Math.sin(a) * (range + 2)
        ctx.globalAlpha = 0.3 * breathe
        ctx.strokeStyle = def.color
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }
      break
    }

    case 'arc_line': {
      // Dodge roll: curved arc path with trail dots
      const range = def.range!
      const perpAngle = preview.angle + Math.PI / 2
      const arcBulge = 30

      // Control point for bezier (perpendicular to direction)
      const midX = (preview.x + preview.x + Math.cos(preview.angle) * range) / 2 + Math.cos(perpAngle) * arcBulge
      const midY = (preview.y + preview.y + Math.sin(preview.angle) * range) / 2 + Math.sin(perpAngle) * arcBulge
      const endX = preview.x + Math.cos(preview.angle) * range
      const endY = preview.y + Math.sin(preview.angle) * range

      // Draw curved path
      ctx.globalAlpha = 0.3 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(preview.x, preview.y)
      ctx.quadraticCurveTo(midX, midY, endX, endY)
      ctx.stroke()
      ctx.setLineDash([])

      // 5 trail dots along arc
      for (let i = 0; i <= 4; i++) {
        const t = i / 4
        const invT = 1 - t
        const px = invT * invT * preview.x + 2 * invT * t * midX + t * t * endX
        const py = invT * invT * preview.y + 2 * invT * t * midY + t * t * endY
        ctx.globalAlpha = (0.15 + t * 0.3) * breathe
        ctx.fillStyle = def.color
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, TWO_PI)
        ctx.fill()
      }

      // Landing marker
      ctx.globalAlpha = 0.3 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(endX, endY, 10, 0, TWO_PI)
      ctx.stroke()

      // Landing cross
      ctx.globalAlpha = 0.2 * breathe
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(endX - 5, endY); ctx.lineTo(endX + 5, endY)
      ctx.moveTo(endX, endY - 5); ctx.lineTo(endX, endY + 5)
      ctx.stroke()
      break
    }

    case 'target_grid': {
      // Arrow rain: target circle with internal grid + falling arrows
      const r = def.radius!
      const range = def.range!
      const tx = preview.x + Math.cos(preview.angle) * range
      const ty = preview.y + Math.sin(preview.angle) * range

      // Distance line
      ctx.globalAlpha = 0.12 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1
      ctx.setLineDash([4, 6])
      ctx.beginPath()
      ctx.moveTo(preview.x, preview.y)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      ctx.setLineDash([])

      // Target fill
      ctx.globalAlpha = 0.08 * breathe
      ctx.fillStyle = def.color
      ctx.beginPath()
      ctx.arc(tx, ty, r, 0, TWO_PI)
      ctx.fill()

      // Target ring
      ctx.globalAlpha = 0.35 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 2
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      ctx.arc(tx, ty, r, 0, TWO_PI)
      ctx.stroke()
      ctx.setLineDash([])

      // Internal grid lines
      ctx.globalAlpha = 0.15 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(tx - r, ty); ctx.lineTo(tx + r, ty)
      ctx.moveTo(tx, ty - r); ctx.lineTo(tx, ty + r)
      // Diagonal lines
      const d = r * 0.707
      ctx.moveTo(tx - d, ty - d); ctx.lineTo(tx + d, ty + d)
      ctx.moveTo(tx + d, ty - d); ctx.lineTo(tx - d, ty + d)
      ctx.stroke()

      // 4 downward arrow indicators on ring edge
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TWO_PI + spin * 0.5
        const mx = tx + Math.cos(a) * r
        const my = ty + Math.sin(a) * r
        ctx.globalAlpha = 0.4 * breathe
        ctx.fillStyle = def.color
        ctx.save()
        ctx.translate(mx, my)
        ctx.rotate(Math.PI / 2)
        ctx.beginPath()
        ctx.moveTo(0, -4)
        ctx.lineTo(-3, 2)
        ctx.lineTo(3, 2)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      break
    }

    case 'ice_crystal': {
      // Frost nova: 12 radial lines + 6 diamond shards + center snowflake
      const r = def.radius!

      // 12 radial lines (alternating long/short)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TWO_PI + spin * 0.3
        const len = i % 2 === 0 ? r : r * 0.6
        ctx.globalAlpha = (i % 2 === 0 ? 0.3 : 0.15) * breathe
        ctx.strokeStyle = def.color
        ctx.lineWidth = i % 2 === 0 ? 1.5 : 1
        ctx.beginPath()
        ctx.moveTo(preview.x, preview.y)
        ctx.lineTo(preview.x + Math.cos(a) * len, preview.y + Math.sin(a) * len)
        ctx.stroke()
      }

      // 6 diamond shards at radius
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TWO_PI + spin * 0.5
        const sx = preview.x + Math.cos(a) * r * 0.75
        const sy = preview.y + Math.sin(a) * r * 0.75
        ctx.globalAlpha = 0.4 * breathe
        ctx.fillStyle = '#FFFFFF'
        ctx.save()
        ctx.translate(sx, sy)
        ctx.rotate(a)
        ctx.beginPath()
        ctx.moveTo(0, -4)
        ctx.lineTo(2, 0)
        ctx.lineTo(0, 4)
        ctx.lineTo(-2, 0)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }

      // Outer ring
      ctx.globalAlpha = 0.25 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, r, 0, TWO_PI)
      ctx.stroke()
      ctx.setLineDash([])

      // Center snowflake (6 short lines)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TWO_PI
        ctx.globalAlpha = 0.5 * breathe
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(preview.x + Math.cos(a) * 4, preview.y + Math.sin(a) * 4)
        ctx.lineTo(preview.x + Math.cos(a) * 12, preview.y + Math.sin(a) * 12)
        ctx.stroke()
      }
      break
    }

    case 'target_fire': {
      // Meteor: target circle + falling trajectory + crosshair
      const r = def.radius!
      const range = def.range!
      const tx = preview.x + Math.cos(preview.angle) * range
      const ty = preview.y + Math.sin(preview.angle) * range

      // Trajectory line (dotted arc from above)
      ctx.globalAlpha = 0.1 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1
      ctx.setLineDash([3, 6])
      ctx.beginPath()
      ctx.moveTo(preview.x, preview.y)
      ctx.lineTo(tx, ty)
      ctx.stroke()
      ctx.setLineDash([])

      // Target fill
      ctx.globalAlpha = 0.08 * breathe
      ctx.fillStyle = def.color
      ctx.beginPath()
      ctx.arc(tx, ty, r, 0, TWO_PI)
      ctx.fill()

      // Target ring
      ctx.globalAlpha = 0.35 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 2.5
      ctx.setLineDash([10, 5])
      ctx.beginPath()
      ctx.arc(tx, ty, r, 0, TWO_PI)
      ctx.stroke()
      ctx.setLineDash([])

      // Cross-hair
      const cSize = 8
      ctx.globalAlpha = 0.5 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(tx - cSize, ty); ctx.lineTo(tx + cSize, ty)
      ctx.moveTo(tx, ty - cSize); ctx.lineTo(tx, ty + cSize)
      ctx.stroke()

      // Falling arrow indicator above target
      ctx.globalAlpha = 0.5 * breathe
      ctx.fillStyle = def.color
      const arrowY = ty - r - 15 - Math.sin(elapsed * 0.005) * 5
      ctx.save()
      ctx.translate(tx, arrowY)
      ctx.rotate(Math.PI / 2)
      ctx.beginPath()
      ctx.moveTo(0, -6)
      ctx.lineTo(-4, 4)
      ctx.lineTo(4, 4)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      // Spinning markers
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TWO_PI + spin
        ctx.globalAlpha = 0.5 * breathe
        ctx.fillStyle = def.color
        ctx.beginPath()
        ctx.arc(tx + Math.cos(a) * r, ty + Math.sin(a) * r, 2, 0, TWO_PI)
        ctx.fill()
      }
      break
    }

    case 'reticle': {
      // Holy light: single-target crosshair + outer range circle (NOT AoE)
      const range = def.radius! // 150px target search range

      // Outer range circle (very subtle — just shows max range)
      ctx.globalAlpha = 0.08 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1
      ctx.setLineDash([3, 6])
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, range, 0, TWO_PI)
      ctx.stroke()
      ctx.setLineDash([])

      // Rotating highlight arc on outer circle
      ctx.globalAlpha = 0.3 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, range, spin, spin + Math.PI / 3)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, range, spin + Math.PI, spin + Math.PI + Math.PI / 3)
      ctx.stroke()

      // Center crosshair (the actual target indicator)
      const cSize = 10
      ctx.globalAlpha = 0.6 * breathe
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(preview.x - cSize, preview.y); ctx.lineTo(preview.x - 3, preview.y)
      ctx.moveTo(preview.x + 3, preview.y); ctx.lineTo(preview.x + cSize, preview.y)
      ctx.moveTo(preview.x, preview.y - cSize); ctx.lineTo(preview.x, preview.y - 3)
      ctx.moveTo(preview.x, preview.y + 3); ctx.lineTo(preview.x, preview.y + cSize)
      ctx.stroke()

      // Center dot
      ctx.globalAlpha = 0.8 * breathe
      ctx.fillStyle = def.color
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, 2, 0, TWO_PI)
      ctx.fill()

      // "Single target" indicator: 4 small arrows pointing inward
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TWO_PI + spin * 0.5
        const dist = 20
        const ax = preview.x + Math.cos(a) * dist
        const ay = preview.y + Math.sin(a) * dist
        ctx.globalAlpha = 0.3 * breathe
        ctx.fillStyle = def.color
        ctx.save()
        ctx.translate(ax, ay)
        ctx.rotate(a + Math.PI)
        ctx.beginPath()
        ctx.moveTo(0, -3)
        ctx.lineTo(-2, 2)
        ctx.lineTo(2, 2)
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      }
      break
    }

    case 'rune_circle': {
      // Sanctuary: double ring + rotating triangle + center cross marks
      const r = def.radius!

      // Outer ring (dashed)
      ctx.globalAlpha = 0.25 * breathe
      ctx.strokeStyle = def.color
      ctx.lineWidth = 1.5
      ctx.setLineDash([8, 4])
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, r, 0, TWO_PI)
      ctx.stroke()
      ctx.setLineDash([])

      // Inner ring (solid)
      ctx.globalAlpha = 0.3 * breathe
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, r * 0.6, 0, TWO_PI)
      ctx.stroke()

      // Fill between rings
      ctx.globalAlpha = 0.06 * breathe
      ctx.fillStyle = def.color
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, r, 0, TWO_PI)
      ctx.fill()

      // 4 cross marks at cardinal points on inner ring
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TWO_PI
        const cx = preview.x + Math.cos(a) * r * 0.6
        const cy = preview.y + Math.sin(a) * r * 0.6
        ctx.globalAlpha = 0.4 * breathe
        ctx.strokeStyle = def.color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(cx - 3, cy); ctx.lineTo(cx + 3, cy)
        ctx.moveTo(cx, cy - 3); ctx.lineTo(cx, cy + 3)
        ctx.stroke()
      }

      // Rotating triangle (rune seal)
      ctx.globalAlpha = 0.2 * breathe
      ctx.strokeStyle = '#44FF88'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TWO_PI + spin * 0.3 - Math.PI / 2
        const px = preview.x + Math.cos(a) * r * 0.35
        const py = preview.y + Math.sin(a) * r * 0.35
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()

      // Center heal symbol
      ctx.globalAlpha = 0.5 * breathe
      ctx.fillStyle = '#44FF88'
      ctx.beginPath()
      ctx.arc(preview.x, preview.y, 3, 0, TWO_PI)
      ctx.fill()
      break
    }
  }

  ctx.restore()
}
