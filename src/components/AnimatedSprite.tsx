import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface AnimatedSpriteProps {
  /** sprite name prefix, e.g. 'knight_m' */
  name: string
  /** animation type: 'idle' | 'run' | 'hit' */
  anim?: string
  /** frame count (default 4 for idle/run, 1 for hit) */
  frameCount?: number
  /** display size in px or CSS value like 'clamp(56px,10vw,96px)' (default 96) */
  size?: number | string
  /** frame interval in ms (default 150) */
  interval?: number
  /** CSS class */
  className?: string
  /** framer-motion style props */
  motionStyle?: React.CSSProperties
  /** additional motion props */
  motionProps?: Record<string, any>
}

const SPRITE_BASE = '/src/assets/0x72/frames/CHARACTER'

export function AnimatedSprite({
  name,
  anim = 'idle_anim',
  frameCount,
  size = 96,
  interval = 150,
  className,
  motionStyle,
  motionProps,
}: AnimatedSpriteProps) {
  const frames = frameCount ?? (anim === 'hit_anim' ? 1 : 4)
  const [frame, setFrame] = useState(0)
  const elapsedRef = useRef(0)
  const lastTimeRef = useRef(performance.now())

  useEffect(() => {
    if (frames <= 1) return
    let raf: number
    const tick = (now: number) => {
      const dt = now - lastTimeRef.current
      lastTimeRef.current = now
      elapsedRef.current += dt
      if (elapsedRef.current >= interval) {
        elapsedRef.current = 0
        setFrame(f => (f + 1) % frames)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [frames, interval])

  const src = `${SPRITE_BASE}/${name}_${anim}_f${frame}.png`

  return (
    <motion.img
      src={src}
      alt={name}
      className={className}
      style={{
        imageRendering: 'pixelated',
        width: size,
        height: size,
        objectFit: 'contain',
        ...motionStyle,
      }}
      {...motionProps}
    />
  )
}
