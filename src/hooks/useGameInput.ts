import { useEffect } from 'react'
import { networkClient } from '../network/socket'
import { GameMessages } from '@shared/protocol'
import { SFX_IDS, type SfxId } from '../audio/sfx'
import { SKILL_INFO } from '../config/skills'

export interface SkillPreviewState {
  active: boolean
  skillType: string
  skillId: string
  x: number
  y: number
  angle: number
  startTime: number
  followMouse?: boolean
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
  onSkillCast?: (skillIndex: number, targetPos?: { x: number; y: number }) => void
  onSkillPreview?: (preview: SkillPreviewState | null) => void
  getLocalPlayer?: () => { x: number; y: number; aimAngle: number; skills: string[]; energy: number } | undefined
  isSkillOnCooldown?: (skillIndex: number) => boolean
}

export function useGameInput(deps: UseGameInputDeps): void {
  const { canvasRef, keysRef, mouseRef, isPaused, setPaused, setShowDebug, playDash, play, onSkillCast, onSkillPreview, getLocalPlayer, isSkillOnCooldown } = deps

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
            followMouse: true,
          })
        } else {
          // Instant skill: fire immediately on key-down
          if (isSkillOnCooldown?.(skillIndex)) return
          // Local energy pre-check: don't fire if insufficient energy
          const skillInfo = SKILL_INFO[skillId]
          if (skillInfo && player.energy < skillInfo.energyCost) return
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
          if (isSkillOnCooldown?.(skillIndex)) {
            onSkillPreview?.(null)
            return
          }
          // Local energy pre-check
          const skillInfo = SKILL_INFO[skillId]
          if (skillInfo && player.energy < skillInfo.energyCost) {
            onSkillPreview?.(null)
            return
          }
          // 鼠标 canvas 坐标即世界坐标（无相机变换）
          let targetPos: { x: number; y: number } | undefined
          const canvas = canvasRef.current
          if (canvas && player) {
            targetPos = {
              x: mouseRef.current.x,
              y: mouseRef.current.y,
            }
          }
          networkClient.emit(GameMessages.INPUT, { skill: skillIndex, targetPos })
          onSkillCast?.(skillIndex, targetPos)
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
        // rect 包含 border，需减去 border 宽度才能得到 canvas 内部坐标
        mouseRef.current.x = e.clientX - rect.left - canvas.clientLeft
        mouseRef.current.y = e.clientY - rect.top - canvas.clientTop
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
