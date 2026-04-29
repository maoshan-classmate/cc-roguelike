import { useCallback, useEffect } from 'react'
import { soundEngine } from './SoundEngine'
import { initSfx, playSfx, playAttackSfx, playEnemyDieSfx, playPickupSfx, SFX_IDS, SfxId } from './sfx'

/**
 * 音效 Hook
 * 提供音效播放功能和便捷方法
 */
export function useSound() {
  // 初始化音效系统
  useEffect(() => {
    initSfx()
  }, [])

  // 播放指定音效
  const play = useCallback((id: SfxId) => {
    playSfx(id)
  }, [])

  // 播放攻击音效（按职业）
  const playAttack = useCallback((characterClass: string) => {
    playAttackSfx(characterClass)
  }, [])

  // 播放敌人死亡音效
  const playEnemyDie = useCallback((enemyType: string) => {
    playEnemyDieSfx(enemyType)
  }, [])

  // 播放拾取音效
  const playPickup = useCallback((itemType: string) => {
    playPickupSfx(itemType)
  }, [])

  // 播放 UI 音效
  const playClick = useCallback(() => {
    playSfx(SFX_IDS.UI_CLICK)
  }, [])

  const playHover = useCallback(() => {
    playSfx(SFX_IDS.UI_HOVER)
  }, [])

  // 播放玩家状态音效
  const playHurt = useCallback(() => {
    playSfx(SFX_IDS.PLAYER_HURT)
  }, [])

  const playHeal = useCallback(() => {
    playSfx(SFX_IDS.PLAYER_HEAL)
  }, [])

  const playDie = useCallback(() => {
    playSfx(SFX_IDS.PLAYER_DIE)
  }, [])

  // 播放技能音效
  const playDash = useCallback(() => {
    playSfx(SFX_IDS.SKILL_DASH)
  }, [])

  const playShield = useCallback(() => {
    playSfx(SFX_IDS.SKILL_SHIELD_ON)
  }, [])

  const playSpeed = useCallback(() => {
    playSfx(SFX_IDS.SKILL_SPEED_ON)
  }, [])

  // 播放游戏事件音效
  const playFloorTransition = useCallback(() => {
    playSfx(SFX_IDS.FLOOR_TRANSITION)
  }, [])

  const playVictory = useCallback(() => {
    playSfx(SFX_IDS.VICTORY)
  }, [])

  const playGameOver = useCallback(() => {
    playSfx(SFX_IDS.GAME_OVER)
  }, [])

  // 音量控制
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
    // 基础播放
    play,
    playAttack,
    playEnemyDie,
    playPickup,

    // UI 音效
    playClick,
    playHover,

    // 玩家状态
    playHurt,
    playHeal,
    playDie,

    // 技能音效
    playDash,
    playShield,
    playSpeed,

    // 游戏事件
    playFloorTransition,
    playVictory,
    playGameOver,

    // 音量控制
    setMasterVolume,
    setSfxVolume,
    toggleMute,
    isMuted,

    // 常量导出
    SFX_IDS,
  }
}
