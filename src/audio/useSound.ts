import { useCallback, useEffect } from 'react'
import { soundEngine } from './SoundEngine'
import { initSfx, playSfx, playAttackSfx, playEnemyDieSfx, playPickupSfx, SFX_IDS, SfxId } from './sfx'

export function useSound() {
  useEffect(() => {
    initSfx()
  }, [])

  const play = useCallback((id: SfxId) => {
    playSfx(id)
  }, [])

  const playAttack = useCallback((characterClass: string) => {
    playAttackSfx(characterClass)
  }, [])

  const playEnemyDie = useCallback((enemyType: string) => {
    playEnemyDieSfx(enemyType)
  }, [])

  const playPickup = useCallback((itemType: string) => {
    playPickupSfx(itemType)
  }, [])

  const playClick = useCallback(() => {
    playSfx(SFX_IDS.UI_CLICK)
  }, [])

  const playHover = useCallback(() => {
    playSfx(SFX_IDS.UI_HOVER)
  }, [])

  const playHurt = useCallback(() => {
    playSfx(SFX_IDS.PLAYER_HURT)
  }, [])

  const playHeal = useCallback(() => {
    playSfx(SFX_IDS.PLAYER_HEAL)
  }, [])

  const playDie = useCallback(() => {
    playSfx(SFX_IDS.PLAYER_DIE)
  }, [])

  const playDash = useCallback(() => {
    playSfx(SFX_IDS.SKILL_DASH)
  }, [])

  const playShield = useCallback(() => {
    playSfx(SFX_IDS.SKILL_SHIELD_ON)
  }, [])

  const playSpeed = useCallback(() => {
    playSfx(SFX_IDS.SKILL_SPEED_ON)
  }, [])

  const playFloorTransition = useCallback(() => {
    playSfx(SFX_IDS.FLOOR_TRANSITION)
  }, [])

  const playVictory = useCallback(() => {
    playSfx(SFX_IDS.VICTORY)
  }, [])

  const playGameOver = useCallback(() => {
    playSfx(SFX_IDS.GAME_OVER)
  }, [])

  const setMasterVolume = useCallback((volume: number) => {
    soundEngine.setMasterVolume(volume)
  }, [])

  const setSfxVolume = useCallback((volume: number) => {
    soundEngine.setSfxVolume(volume)
  }, [])

  const toggleMute = useCallback(() => {
    return soundEngine.toggleMute()
  }, [])

  const isMuted = useCallback(() => {
    return soundEngine.isMuted()
  }, [])

  return {
    play, playAttack, playEnemyDie, playPickup,
    playClick, playHover,
    playHurt, playHeal, playDie,
    playDash, playShield, playSpeed,
    playFloorTransition, playVictory, playGameOver,
    setMasterVolume, setSfxVolume, toggleMute, isMuted,
    SFX_IDS,
  }
}
