import { useEffect } from 'react'
import { networkClient } from '../network/socket'
import { GameMessages } from '@shared/protocol'
import { SFX_IDS, type SfxId } from '../audio/sfx'

interface UseGameInputDeps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  keysRef: React.MutableRefObject<Set<string>>
  mouseRef: React.MutableRefObject<{ x: number; y: number; down: boolean }>
  isPaused: boolean
  setPaused: (v: boolean) => void
  setShowDebug: React.Dispatch<React.SetStateAction<boolean>>
  playDash: () => void
  playShield: () => void
  play: (id: SfxId) => void
  playSpeed: () => void
}

export function useGameInput(deps: UseGameInputDeps): void {
  const { canvasRef, keysRef, mouseRef, isPaused, setPaused, setShowDebug, playDash, playShield, play, playSpeed } = deps

  useEffect(() => {
    const skillKeysDown = new Set<string>()

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === 'Escape') setPaused(!isPaused)
      if (e.key === 'Home' && import.meta.env.DEV) {
        setShowDebug(prev => !prev)
      }
      const skillKey = e.key
      if (['1', '2', '3', '4'].includes(skillKey) && !skillKeysDown.has(skillKey)) {
        skillKeysDown.add(skillKey)
        networkClient.emit(GameMessages.INPUT, { skill: parseInt(skillKey) - 1 })
        switch (skillKey) {
          case '1': playDash(); break
          case '2': playShield(); break
          case '3': play(SFX_IDS.SKILL_HEAL); break
          case '4': playSpeed(); break
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
      if (['1', '2', '3', '4'].includes(e.key)) skillKeysDown.delete(e.key)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        mouseRef.current.x = e.clientX - rect.left
        mouseRef.current.y = e.clientY - rect.top
      }
    }

    const handleMouseDown = () => { mouseRef.current.down = true }
    const handleMouseUp = () => { mouseRef.current.down = false }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPaused])
}
