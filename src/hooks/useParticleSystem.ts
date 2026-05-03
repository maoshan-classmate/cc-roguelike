import { useRef, useCallback } from 'react'

export interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
  size: number
  type: 'death' | 'hit' | 'skill' | 'debris' | 'dust' | 'spark'
}

export function useParticleSystem() {
  const particlesRef = useRef<Particle[]>([])

  // 粒子生成函数：敌人死亡特效
  const spawnDeathParticles = useCallback((x: number, y: number, color: string) => {
    const particleCount = 12
    const particles = particlesRef.current
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const speed = 80 + Math.random() * 60
      const life = 0.4 + Math.random() * 0.3
      particles.push({
        id: `death_${Date.now()}_${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color,
        size: 3 + Math.random() * 3,
        type: 'death'
      })
    }
    // 添加一些额外的红色小粒子增加血腥感
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 50 + Math.random() * 40
      const life = 0.3 + Math.random() * 0.2
      particles.push({
        id: `death_${Date.now()}_extra_${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color: '#FF4444',
        size: 2 + Math.random() * 2,
        type: 'death'
      })
    }
  }, [])

  // 震地碎裂特效：地砖碎片 + 灰尘 + 火星
  const spawnGroundSlamParticles = useCallback((x: number, y: number) => {
    const particles = particlesRef.current
    const now = Date.now()

    // 地砖碎片（大块，重力，旋转感）
    const debrisColors = ['#8B7355', '#A0896C', '#6B5B3E', '#9C8560', '#7A6845', '#5C4A3A']
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.3
      const speed = 100 + Math.random() * 220
      const life = 0.7 + Math.random() * 0.6
      particles.push({
        id: `debris_${now}_${i}`,
        x: x + (Math.random() - 0.5) * 24,
        y: y + (Math.random() - 0.5) * 24,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 120 - Math.random() * 100,
        life,
        maxLife: life,
        color: debrisColors[i % debrisColors.length],
        size: 6 + Math.random() * 12,
        type: 'debris'
      })
    }

    // 灰尘（半透明，慢速扩散）
    for (let i = 0; i < 14; i++) {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.3
      const speed = 30 + Math.random() * 70
      const life = 0.9 + Math.random() * 0.7
      particles.push({
        id: `dust_${now}_${i}`,
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life,
        maxLife: life,
        color: '#B8A88A',
        size: 10 + Math.random() * 14,
        type: 'dust'
      })
    }

    // 火星（小快亮）
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 180 + Math.random() * 250
      const life = 0.25 + Math.random() * 0.35
      particles.push({
        id: `spark_${now}_${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life,
        maxLife: life,
        color: Math.random() > 0.5 ? '#FFB040' : '#FF6020',
        size: 2 + Math.random() * 3,
        type: 'spark'
      })
    }
  }, [])

  // 粒子更新和渲染
  const updateAndDrawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    const particles = particlesRef.current
    const dt = 1 / 60

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]

      // 更新位置
      p.x += p.vx * dt
      p.y += p.vy * dt
      // 重力效果（让粒子下落）
      p.vy += 120 * dt
      // 阻尼（逐渐减速）
      p.vx *= 0.98
      p.vy *= 0.98
      // 生命衰减
      p.life -= dt

      // 移除死亡粒子
      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }

      // 渲染粒子
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color

      // 根据粒子类型绘制不同形状
      if (p.type === 'death') {
        // 死亡粒子：菱形/方形碎片
        const s = p.size * alpha
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
      } else if (p.type === 'hit') {
        // 击中粒子：圆形
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'debris') {
        // 震地碎片：不规则矩形
        const s = p.size * alpha
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.life * 8)
        ctx.fillRect(-s / 2, -s * 0.3, s, s * 0.6)
        ctx.restore()
      } else if (p.type === 'dust') {
        // 灰尘：半透明大圆
        ctx.globalAlpha = alpha * 0.35
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (0.5 + (1 - alpha) * 0.5), 0, Math.PI * 2)
        ctx.fill()
      } else if (p.type === 'spark') {
        // 火星：小亮点
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // 技能粒子：三角形
        const s = p.size * alpha
        ctx.beginPath()
        ctx.moveTo(p.x, p.y - s)
        ctx.lineTo(p.x - s * 0.866, p.y + s * 0.5)
        ctx.lineTo(p.x + s * 0.866, p.y + s * 0.5)
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }, [])

  return {
    particlesRef,
    spawnDeathParticles,
    spawnGroundSlamParticles,
    updateAndDrawParticles
  }
}
