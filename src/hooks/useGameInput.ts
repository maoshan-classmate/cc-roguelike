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

// AoE skills: key-down preview + key-up fire
const AOE_SKILLS = new Set(['arrow_rain', 'meteor', 'sanctuary'])

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
  getLocalPlayer?: () => { x: number; y: number; aimAngle: number; skills: string[] } | undefined
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
        const player = getLocalPlayer?.()
        if (!player) return

        const skillIndex = parseInt(skillKey) - 1
        const skillId = player.skills[skillIndex]
        if (!skillId) return

        if (AOE_SKILLS.has(skillId)) {
          // AoE skill: show preview on key-down, fire on key-up
          onSkillPreview?.({
            active: true,
            skillType: skillKey,
            skillId,
            x: player.x,
            y: player.y,
            angle: player.aimAngle,
            startTime: performance.now(),
          })
        } else {
          // Instant skill: fire immediately on key-down
          networkClient.emit(GameMessages.INPUT, { skill: skillIndex })
          onSkillCast?.(skillIndex)
          switch (skillId) {
            case 'dash': playDash(); break
            case 'war_cry': play(SFX_IDS.SKILL_SHIELD_ON); break
            case 'shield_bash': play(SFX_IDS.SKILL_SHIELD_ON); break
            case 'dodge_roll': playDash(); break
            case 'holy_light': play(SFX_IDS.SKILL_HEAL); break
            default: play(SFX_IDS.SKILL_HEAL); break
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
      const skillKey = e.key
      if (['1', '2', '3'].includes(skillKey) && skillKeysDown.has(skillKey)) {
        skillKeysDown.delete(skillKey)
        const player = getLocalPlayer?.()
        if (!player) return

        const skillIndex = parseInt(skillKey) - 1
        const skillId = player.skills[skillIndex]
        if (!skillId) return

        if (AOE_SKILLS.has(skillId)) {
          // AoE skill: fire on key-up with target position from aimAngle
          networkClient.emit(GameMessages.INPUT, { skill: skillIndex })
          onSkillCast?.(skillIndex)
          onSkillPreview?.(null)
          play(SFX_IDS.SKILL_HEAL)
        } else {
          // Instant skill: clear preview on key-up (already fired on key-down)
          onSkillPreview?.(null)
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
