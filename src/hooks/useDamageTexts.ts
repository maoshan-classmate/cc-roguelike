import { useRef, useCallback } from 'react'

export interface DamageText {
  id: string
  x: number
  y: number
  value: number
  life: number
  maxLife: number
  color: string
  isPlayer: boolean
}

export function useDamageTexts() {
  const damageTextsRef = useRef<DamageText[]>([])

  // 伤害飘字生成函数
  const spawnDamageText = useCallback((x: number, y: number, value: number, isPlayer: boolean) => {
    const damageTexts = damageTextsRef.current
    damageTexts.push({
      id: `dmg_${Date.now()}_${Math.random()}`,
      x,
      y,
      value,
      life: 1.0,
      maxLife: 1.0,
      color: isPlayer ? '#FF6B6B' : '#FFD700',
      isPlayer
    })
  }, [])

  // 更新和渲染伤害飘字
  const updateAndDrawDamageTexts = useCallback((ctx: CanvasRenderingContext2D) => {
    const damageTexts = damageTextsRef.current
    const dt = 1 / 60

    for (let i = damageTexts.length - 1; i >= 0; i--) {
      const t = damageTexts[i]

      // 向上飘动
      t.y -= 60 * dt
      // 左右轻微晃动
      t.x += Math.sin(t.life * 10) * 0.5
      // 生命衰减
      t.life -= dt

      // 移除死亡飘字
      if (t.life <= 0) {
        damageTexts.splice(i, 1)
        continue
      }

      // 渲染飘字
      const alpha = Math.min(1, t.life / 0.3)
      const scale = 0.8 + 0.4 * (1 - t.life / t.maxLife)

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = `bold ${Math.floor(18 * scale)}px "Courier New", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // 黑色描边
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.strokeText(`-${t.value}`, t.x, t.y)

      // 彩色填充
      ctx.fillStyle = t.color
      ctx.fillText(`-${t.value}`, t.x, t.y)

      ctx.restore()
    }
  }, [])

  return {
    damageTextsRef,
    spawnDamageText,
    updateAndDrawDamageTexts
  }
}
