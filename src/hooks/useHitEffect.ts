import { useRef, useCallback } from 'react'

/**
 * 打击感 Hook - 顿帧 + 屏幕震动
 * 在命中时调用，增强打击反馈
 */
export function useHitEffect() {
  const hitlagRef = useRef(0) // 顿帧计数器
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0, duration: 0, startTime: 0 })

  /**
   * 触发顿帧
   * @param frames 顿帧持续帧数（默认 3 帧）
   */
  const triggerHitlag = useCallback((frames: number = 3) => {
    hitlagRef.current = frames
  }, [])

  /**
   * 触发屏幕震动
   * @param intensity 震动强度（像素，默认 3）
   * @param duration 震动持续时间（毫秒，默认 150）
   */
  const triggerShake = useCallback((intensity: number = 3, duration: number = 150) => {
    shakeRef.current = {
      x: 0,
      y: 0,
      intensity,
      duration,
      startTime: performance.now(),
    }
  }, [])

  /**
   * 同时触发顿帧和震动（打击感组合）
   * @param hitlagFrames 顿帧数
   * @param shakeIntensity 震动强度
   * @param shakeDuration 震动时长
   */
  const triggerHitEffect = useCallback((
    hitlagFrames: number = 3,
    shakeIntensity: number = 3,
    shakeDuration: number = 150
  ) => {
    triggerHitlag(hitlagFrames)
    triggerShake(shakeIntensity, shakeDuration)
  }, [triggerHitlag, triggerShake])

  /**
   * 更新震动状态（每帧调用）
   * @returns 当前震动偏移量 { x, y }
   */
  const updateShake = useCallback((): { x: number; y: number } => {
    const shake = shakeRef.current
    if (shake.duration === 0) return { x: 0, y: 0 }

    const elapsed = performance.now() - shake.startTime
    if (elapsed >= shake.duration) {
      shakeRef.current = { x: 0, y: 0, intensity: 0, duration: 0, startTime: 0 }
      return { x: 0, y: 0 }
    }

    // 震动衰减
    const progress = elapsed / shake.duration
    const currentIntensity = shake.intensity * (1 - progress)

    // 随机偏移
    const x = (Math.random() - 0.5) * 2 * currentIntensity
    const y = (Math.random() - 0.5) * 2 * currentIntensity

    return { x, y }
  }, [])

  /**
   * 检查是否在顿帧中
   */
  const isHitlagging = useCallback((): boolean => {
    return hitlagRef.current > 0
  }, [])

  /**
   * 减少顿帧计数器（每帧调用）
   */
  const updateHitlag = useCallback(() => {
    if (hitlagRef.current > 0) {
      hitlagRef.current--
    }
  }, [])

  return {
    triggerHitlag,
    triggerShake,
    triggerHitEffect,
    updateShake,
    isHitlagging,
    updateHitlag,
  }
}
