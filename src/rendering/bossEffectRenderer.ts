export interface BossEffect {
  type: 'aoe_shockwave' | 'ranged_flash'
  x: number
  y: number
  startTime: number
  duration: number
  maxRadius: number
}

export function drawBossEffects(
  ctx: CanvasRenderingContext2D,
  effects: BossEffect[],
  now: number
): void {
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
      drawAoeShockwave(ctx, fx, progress, i)
    } else if (fx.type === 'ranged_flash') {
      drawRangedFlash(ctx, fx, progress)
    }
  }
  ctx.restore()
}

function prand(seed: number, offset: number): number {
  return (((offset + 1) * 2654435761 + Math.floor(seed)) >>> 0) / 4294967296
}

function drawAoeShockwave(ctx: CanvasRenderingContext2D, fx: BossEffect, progress: number, index: number): void {
  ctx.save()
  const seed = Math.floor(fx.startTime)
  const p = (i: number) => prand(seed, i)

  // 弹坑暗洞
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

  // 粗裂纹（发光+锯齿）
  if (progress < 0.9) {
    const ca = progress < 0.12 ? progress / 0.12 : Math.max(0, (0.9 - progress) / 0.78)
    for (let c = 0; c < 8; c++) {
      const ba = (c / 8) * Math.PI * 2 + p(c) * 0.3
      const len = (60 + p(c + 10) * 80) * Math.min(progress * 4, 1)
      ctx.beginPath()
      ctx.moveTo(fx.x, fx.y)
      let px = fx.x, py = fx.y
      for (let s = 1; s <= 5; s++) {
        const sl = (len / 5) * s
        const jt = (p(c * 7 + s) - 0.5) * 24
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
      if (p(c + 50) > 0.35 && len > 30) {
        const bAngle = ba + (p(c + 30) - 0.5) * 1.5
        const mi = 2 + Math.floor(p(c + 60) * 2)
        const mx = fx.x + Math.cos(ba) * (len / 5) * mi
        const my = fx.y + Math.sin(ba) * (len / 5) * mi
        const bl = 15 + p(c + 40) * 25
        ctx.beginPath()
        ctx.moveTo(mx, my)
        ctx.lineTo(mx + Math.cos(bAngle) * bl, my + Math.sin(bAngle) * bl)
        ctx.strokeStyle = `rgba(15, 8, 4, ${ca * 0.8})`
        ctx.lineWidth = 2
        ctx.stroke()
      }
    }
  }

  // 大块瓦片翻飞
  const topC = ['#8B7355', '#9C8560', '#A0896C', '#7A6845']
  const botC = ['#3A2820', '#2E1E16', '#44342A', '#2A1A12']
  for (let t = 0; t < 10; t++) {
    const h = p(t)
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

  // 碎石飞溅
  for (let d = 0; d < 14; d++) {
    const h = p(d + 50)
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

  // 三层冲击波环
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

  // 灰尘云
  for (let d = 0; d < 10; d++) {
    const h = p(d + 200)
    const a = (d / 10) * Math.PI * 2
    const dist = 25 + progress * 100 + h * 20
    const da = Math.max(0, (1 - progress * 1.1) * 0.35)
    if (da <= 0) continue
    ctx.beginPath()
    ctx.arc(fx.x + Math.cos(a) * dist, fx.y + Math.sin(a) * dist, 10 + h * 12, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(140, 120, 95, ${da})`
    ctx.fill()
  }

  // 火星
  for (let s = 0; s < 12; s++) {
    const h = p(s + 300)
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

  // 中心爆发闪光
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
}

function drawRangedFlash(ctx: CanvasRenderingContext2D, fx: BossEffect, progress: number): void {
  const alpha = (1 - progress) * 0.5
  const flashRadius = 30 + progress * 20
  const grad = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, flashRadius)
  grad.addColorStop(0, `rgba(255, 80, 40, ${alpha})`)
  grad.addColorStop(1, 'rgba(255, 80, 40, 0)')
  ctx.fillStyle = grad
  ctx.fillRect(fx.x - flashRadius, fx.y - flashRadius, flashRadius * 2, flashRadius * 2)
}
