import { useEffect, useMemo, useState } from 'react'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import type { ISourceOptions } from '@tsparticles/engine'

export function DungeonParticles() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setReady(true))
  }, [])

  const options = useMemo<ISourceOptions>(() => ({
    fullScreen: false,
    fpsLimit: 60,
    particles: {
      number: { value: 120, density: { enable: true, area: 400 } },
      color: { value: ['#FF6600', '#FFD700', '#FF4400', '#FFAA33', '#CC5500', '#FF8C00', '#FF0000'] },
      shape: { type: 'circle' },
      opacity: {
        value: { min: 0.25, max: 0.85 },
        animation: { enable: true, speed: 1.5, minimumValue: 0.1, sync: false },
      },
      size: {
        value: { min: 1, max: 5 },
        animation: { enable: true, speed: 3, minimumValue: 0.5, sync: false },
      },
      move: {
        enable: true,
        speed: { min: 0.5, max: 2.2 },
        direction: 'top' as const,
        random: true,
        straight: false,
        outModes: { default: 'destroy' as const },
      },
      life: {
        duration: { value: { min: 3, max: 7 } },
      },
      twinkle: {
        particles: { enable: true, opacity: 0.5 },
      },
    },
    detectRetina: true,
  }), [])

  if (!ready) return null

  return (
    <Particles
      id="dungeon-embers"
      options={options}
      style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' } as React.CSSProperties}
    />
  )
}
