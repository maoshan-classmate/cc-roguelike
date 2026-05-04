import { useEffect } from 'react'
import { networkClient } from '../network/socket'
import { GameMessages } from '@shared/protocol'
import { SFX_IDS, type SfxId } from '../audio/sfx'

export interface SkillPreviewState {
  active: boolean
  skillType: string
  skillId: string
  x: number
  y: number
  angle: number
  startTime: number
}

interface UseGameInputDeps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  keysRef: React.MutableRefObject<Set<string>>
  mouseRef: React.MutableRefObject<{ x: number; y: number; down: boolean }>
  isPaused: boolean
  setPaused: (v: boolean) => void
  setShowDebug: React.Dispatch<React.SetStateAction<boolean>>
  playDash: () => void
  play: (id: SfxId) => void
  onSkillCast?: (skillIndex: number) => void
  onSkillPreview?: (preview: SkillPreviewState | null) => void
  getLocalPlayer?: () => { x: number; y: number; angle: number; skills: string[] } | undefined
}

export function useGameInput(deps: UseGameInputDeps): void {
  const { canvasRef, keysRef, mouseRef, isPaused, setPaused, setShowDebug, playDash, play, onSkillCast, onSkillPreview, getLocalPlayer } = deps

  useEffect(() => {
    const skillKeysDown = new Set<string>()

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === 'Escape') setPaused(!isPaused)
      if (e.key === 'Home' && import.meta.env.DEV) {
        setShowDebug(prev => !prev)
      }
      const skillKey = e.key
      if (['1', '2', '3'].includes(skillKey) && !skillKeysDown.has(skillKey)) {
        skillKeysDown.add(skillKey)
        // Show preview on keydown (don't fire yet)
        const player = getLocalPlayer?.()
        if (player) {
          const skillIndex = parseInt(skillKey) - 1
          const skillId = player.skills[skillIndex]
          if (skillId) {
            onSkillPreview?.({
              active: true,
              skillType: skillKey,
              skillId,
              x: player.x,
              y: player.y,
              angle: player.angle,
              startTime: performance.now(),
            })
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
      const skillKey = e.key
      if (['1', '2', '3'].includes(skillKey) && skillKeysDown.has(skillKey)) {
        skillKeysDown.delete(skillKey)
        // Fire skill on key release
        const skillIndex = parseInt(skillKey) - 1
        networkClient.emit(GameMessages.INPUT, { skill: skillIndex })
        onSkillCast?.(skillIndex)
        onSkillPreview?.(null) // clear preview
        switch (skillKey) {
          case '1': playDash(); break
          case '2': play(SFX_IDS.SKILL_SHIELD_ON); break
          case '3': play(SFX_IDS.SKILL_HEAL); break
        }
      }
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
