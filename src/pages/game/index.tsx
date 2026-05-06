import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/useAuthStore'
import { useGameStore } from '../../store/useGameStore'
import type { PlayerState, EnemyState, BulletState, HealWaveState, ItemState, DungeonData, GameState as SharedGameState } from '@shared/types'
import { SKILL_INFO } from '../../config/skills'

interface BossVisualEffect {
  type: 'aoe_shockwave' | 'ranged_flash'
  x: number
  y: number
  startTime: number
  duration: number
  maxRadius: number
}
import { GameMessages, RoomMessages } from '@shared/protocol'

interface ClientGameState {
  players: PlayerState[]
  enemies: EnemyState[]
  bullets: BulletState[]
  healWaves: HealWaveState[]
  items: ItemState[]
  gold: number
  keys: number
  dungeon: DungeonData | null
  phase?: string
  mazeFog?: { enabled?: boolean; visionRadius?: number; exploredTiles?: string[] }
}
import { networkClient } from '../../network/socket'
import { useParticleSystem } from '../../hooks/useParticleSystem'
import { useDamageTexts } from '../../hooks/useDamageTexts'
import { useGameRenderer } from '../../hooks/useGameRenderer'
import { GENERATED_SPRITES } from '../../config/generatedSprites'
import { useSound } from '../../audio/useSound'
import { SFX_IDS } from '../../audio/sfx'
import { useHitEffect } from '../../hooks/useHitEffect'
import { useGameInput } from '../../hooks/useGameInput'
import { createSkillEffectStore, type SkillEffectStore } from '../../rendering/skillEffectRenderer'
import type { SkillPreviewState } from '../../rendering/skillPreviewRenderer'

import { GameCanvas } from './GameCanvas'
import { GameHUD } from './GameHUD'
import { GameOverlay } from './GameOverlay'
import { DebugMenu } from './DebugMenu'

// 加载精灵图
const tileset2Atlas = new Image()
tileset2Atlas.src = '/src/assets/0x72/main_atlas.png'

// 加载 AI 生成精灵 sheet
const generatedSheets: Record<string, HTMLImageElement> = {}
for (const [name, def] of Object.entries(GENERATED_SPRITES)) {
  const img = new Image()
  img.src = def.sheetPath
  generatedSheets[name] = img
}

// 加载自定义精灵（Boss 房装饰等，已用 sharp 预处理背景透明化）
const customSprites: Record<string, HTMLImageElement> = {}
const CUSTOM_SPRITE_PATHS: Record<string, string> = {
  throne: '/src/assets/custom/throne.png',
  floor_banner: '/src/assets/custom/floor_banner.png',
}
for (const [name, path] of Object.entries(CUSTOM_SPRITE_PATHS)) {
  const img = new Image()
  img.src = path
  customSprites[name] = img
}

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user } = useAuthStore()
  const {
    floor,
    players,
    enemies,
    isPaused,
    isGameOver,
    isVictory,
    isArena,
    isMaze,
    arenaWave,
    arenaTriggered,
    phase,
    setState,
    setFloor,
    setPaused,
    setGameOver,
    setLocalPlayerId,
    setArenaState,
    setPhase,
    reset
  } = useGameStore()
  const navigate = useNavigate()
  const { play, playAttack, playHurt, playEnemyDie, playPickup, playFloorTransition, playVictory, playGameOver, playDash, playDie } = useSound()
  const { triggerHitEffect, updateShake, isHitlagging, updateHitlag } = useHitEffect()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const mouseRef = useRef({ x: 0, y: 0, down: false })
  const animationRef = useRef<number | undefined>(undefined)
  const [spritesLoaded, setSpritesLoaded] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [isInvincible, setIsInvincible] = useState(false)
  const [isFogOff, setIsFogOff] = useState(false)
  const [hoveredSkill, setHoveredSkill] = useState<number | null>(null)
  const cooldownEndRef = useRef<Map<number, number>>(new Map()) // skillIndex → end timestamp
  const [, setCooldownTick] = useState(0) // triggers re-render for cooldown display

  const gameStateRef = useRef<ClientGameState>({
    players: [],
    enemies: [],
    bullets: [],
    healWaves: [],
    items: [],
    gold: 0,
    keys: 0,
    dungeon: null,
    phase: 'LOBBY',
  })

  const prevDyingRef = useRef<Set<string>>(new Set())
  const prevHpRef = useRef<Map<string, number>>(new Map())
  const prevAliveRef = useRef<Map<string, boolean>>(new Map())
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(new Map())
  const targetPositions = useRef<Map<string, { x: number; y: number }>>(new Map())
  const lastStateTime = useRef(performance.now())
  const lastAnimTime = useRef(performance.now())
  const lastSentAngleRef = useRef<number | null>(null)
  const facingAngleRef = useRef<number | null>(null)
  const attackFlashRef = useRef(0)
  const bossEffectsRef = useRef<BossVisualEffect[]>([])
  const screenShakeRef = useRef({ intensity: 0, endTime: 0 })
  const prevAttackRef = useRef(false)
  const floorSessionRef = useRef<number>(0)
  const gameSessionRef = useRef<number>(0)
  const skillEffectStoreRef = useRef<SkillEffectStore>(createSkillEffectStore())
  const skillPreviewRef = useRef<SkillPreviewState | null>(null)

  // Hooks
  const { particlesRef, spawnDeathParticles, spawnGroundSlamParticles, updateAndDrawParticles } = useParticleSystem()
  const { damageTextsRef, spawnDamageText, updateAndDrawDamageTexts } = useDamageTexts()

  const renderDeps = {
    user,
    spritesLoaded,
    tileset2Atlas,
    generatedSheets,
    customSprites,
    lastAnimTime,
    prevPositions,
    targetPositions,
    lastStateTime,
    prevDyingRef,
    prevHpRef,
    spawnDeathParticles,
    spawnDamageText,
    updateAndDrawParticles,
    updateAndDrawDamageTexts,
    particlesRef,
    damageTextsRef,
    attackFlashRef,
    bossEffectsRef,
    screenShakeRef,
    skillEffectStore: skillEffectStoreRef.current,
    skillPreviewRef,
  }

  const { render } = useGameRenderer(canvasRef, gameStateRef, renderDeps)

  // Cooldown tick timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldownTick(t => t + 1)
    }, 100)
    return () => clearInterval(timer)
  }, [])

  // Set local player ID
  useEffect(() => {
    if (user) setLocalPlayerId(user.id)
  }, [user])

  // Ensure network connection on mount (handles page refresh)
  useEffect(() => {
    if (!networkClient.isConnected()) {
      networkClient.connect()
    }
  }, [])

  // 预加载精灵图
  useEffect(() => {
    const loadSprite = (img: HTMLImageElement, name: string) =>
      new Promise<void>((resolve, reject) => {
        if (img.complete && img.naturalWidth > 0) resolve()
        else {
          img.onload = () => (img.naturalWidth > 0 ? resolve() : reject(new Error(`${name} loaded but naturalWidth=0`)))
          img.onerror = () => reject(new Error(`Failed to load ${name}`))
        }
      })

    Promise.all([
      loadSprite(tileset2Atlas, 'tileset2'),
    ]).then(() => setSpritesLoaded(true))
  }, [])

  // Game state listener
  useEffect(() => {
    networkClient.on(GameMessages.STATE, (state: SharedGameState & Record<string, unknown>) => {
      if (gameSessionRef.current !== 0 && state.gameSession !== gameSessionRef.current) return

      if (state.floorCompleted) setFloor(state.floor + 1)

      const prev = prevPositions.current
      const target = targetPositions.current
      const entities = [...(state.players || []), ...(state.enemies || [])]
      for (const e of entities) {
        const key = e.id
        const oldTarget = target.get(key)
        prev.set(key, oldTarget ? { x: oldTarget.x, y: oldTarget.y } : { x: e.x, y: e.y })
        target.set(key, { x: e.x, y: e.y })

        const prevHp = prevHpRef.current.get(key)
        if (prevHp !== undefined && e.hp < prevHp) {
          const damage = prevHp - e.hp
          const isPlayer = state.players?.some(p => p.id === key)
          spawnDamageText(e.x, e.y - 20, damage, isPlayer)

          // 音效：受伤
          if (isPlayer && e.id === user?.id) {
            playHurt()
            // 打击感：玩家受伤（顿帧 2 帧 + 震动 2px）
            triggerHitEffect(2, 2, 100)
          } else if (!isPlayer) {
            play(SFX_IDS.ENEMY_HIT)
            // 打击感：敌人受击（顿帧 3 帧 + 震动 3px）
            triggerHitEffect(3, 3, 150)
          }
        }

        // 音效：敌人死亡
        if (!state.players?.some(p => p.id === key) && e.hp <= 0 && prevHp !== undefined && prevHp > 0) {
          playEnemyDie('type' in e ? e.type : 'basic')
          // 打击感：敌人死亡（顿帧 5 帧 + 震动 5px）
          triggerHitEffect(5, 5, 200)
        }

        // 音效：玩家死亡
        const prevAlive = prevAliveRef.current.get(key)
        if (prevAlive !== undefined && e.alive === false && prevAlive === true) {
          const isPlayer = state.players?.some(p => p.id === key)
          if (isPlayer && e.id === user?.id) {
            playDie()
            // 打击感：玩家死亡（顿帧 8 帧 + 震动 6px）
            triggerHitEffect(8, 6, 300)
          }
        }
        prevAliveRef.current.set(key, e.alive)

        prevHpRef.current.set(key, e.hp)
      }
      lastStateTime.current = performance.now()

      // 音效：道具拾取
      const prevItems = gameStateRef.current.items || []
      const newItems = state.items || []
      if (newItems.length < prevItems.length) {
        // 检测到道具被拾取（数量减少）
        const removedItems = prevItems.filter(item => !newItems.some(newItem => newItem.id === item.id))
        for (const item of removedItems) {
          // 检查是否是本地玩家拾取的（通过距离判断）
          const localPlayer = state.players?.find(p => p.id === user?.id)
          if (localPlayer) {
            const dist = Math.sqrt((localPlayer.x - item.x) ** 2 + (localPlayer.y - item.y) ** 2)
            if (dist < 50) { // 50px 内认为是本地玩家拾取
              playPickup(item.type || 'gold')
            }
          }
        }
      }

      gameStateRef.current = {
        players: state.players || [],
        enemies: state.enemies || [],
        bullets: state.bullets || [],
        healWaves: state.healWaves || [],
        items: state.items || [],
        gold: state.players?.find((p: PlayerState) => p.id === user?.id)?.gold || 0,
        keys: state.players?.find((p: PlayerState) => p.id === user?.id)?.keys || 0,
        dungeon: state.dungeon ?? null,
        phase: state.phase || 'PLAYING',
        mazeFog: state.mazeFog ?? undefined,
      }

      // Update envObjects from dungeon data
      if (state.dungeon?.envObjects && gameStateRef.current.dungeon) {
        gameStateRef.current.dungeon = {
          ...gameStateRef.current.dungeon,
          envObjects: state.dungeon.envObjects,
        }
      }

      // Boss event audio + visual effects
      if (state.bossEvents?.length) {
        for (const evt of state.bossEvents) {
          if (evt.type === 'ranged') {
            play(SFX_IDS.ENEMY_BOSS_ATTACK)
            bossEffectsRef.current.push({
              type: 'ranged_flash', x: evt.x, y: evt.y,
              startTime: performance.now(), duration: 300, maxRadius: 50
            })
          } else if (evt.type === 'aoe') {
            play(SFX_IDS.ENEMY_BOSS_SPECIAL)
            bossEffectsRef.current.push({
              type: 'aoe_shockwave', x: evt.x, y: evt.y,
              startTime: performance.now(), duration: 1200, maxRadius: 140
            })
            spawnGroundSlamParticles(evt.x, evt.y)
          }
        }
      }
      setState(state)
    })

    networkClient.on(GameMessages.FLOOR_START, (data: { floor: number; gameSession: number }) => {
      prevPositions.current.clear()
      targetPositions.current.clear()
      gameStateRef.current = { players: [], enemies: [], bullets: [], healWaves: [], items: [], gold: 0, keys: 0, dungeon: null, phase: 'LOBBY', mazeFog: undefined }
      floorSessionRef.current = data.floor
      gameSessionRef.current = data.gameSession
      lastStateTime.current = performance.now()
      setFloor(data.floor)

      // 音效：楼层切换
      playFloorTransition()
    })

    networkClient.on(GameMessages.END, (data: { win: boolean }) => {
      setGameOver(true, data.win)

      // 音效：游戏结束/胜利
      if (data.win) {
        playVictory()
      } else {
        playGameOver()
      }
    })

    return () => {
      networkClient.off(GameMessages.STATE)
      networkClient.off(GameMessages.FLOOR_START)
      networkClient.off(GameMessages.END)
      floorSessionRef.current = 0
      gameSessionRef.current = 0
    }
  }, [])

  // Input handling
  const handleSkillCast = useCallback((skillIndex: number) => {
    const localPlayer = gameStateRef.current.players.find(p => p.id === user?.id)
    if (!localPlayer) return
    const skillId = localPlayer.skills[skillIndex]
    if (!skillId) return
    skillEffectStoreRef.current.add(skillId, localPlayer.x, localPlayer.y, localPlayer.angle)
    // Record cooldown end time
    const info = SKILL_INFO[skillId]
    if (info) {
      cooldownEndRef.current.set(skillIndex, Date.now() + info.cooldown * 1000)
    }
  }, [user])

  const getLocalPlayer = useCallback(() => {
    const p = gameStateRef.current.players.find(p => p.id === user?.id)
    return p ? { x: p.x, y: p.y, angle: p.angle, skills: p.skills } : undefined
  }, [user])

  useGameInput({
    canvasRef, keysRef, mouseRef, isPaused, setPaused, setShowDebug,
    playDash, play, onSkillCast: handleSkillCast,
    onSkillPreview: (preview) => { skillPreviewRef.current = preview },
    getLocalPlayer,
  })

  // Game loop
  useEffect(() => {
    if (isPaused || isGameOver) return

    let lastInputTime = 0
    const gameLoop = () => {
      const keys = keysRef.current
      let dx = 0, dy = 0
      if (keys.has('w') || keys.has('arrowup')) dy -= 1
      if (keys.has('s') || keys.has('arrowdown')) dy += 1
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1
      if (keys.has('d') || keys.has('arrowright')) dx += 1
      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707 }

      const { players } = gameStateRef.current
      const localPlayer = players.find(p => p.id === user?.id)

      if (!localPlayer) {
        render()
        animationRef.current = requestAnimationFrame(gameLoop)
        return
      }

      // 角色朝向跟随移动方向，而非鼠标位置
      const isMoving = dx !== 0 || dy !== 0
      let angle: number
      if (isMoving) {
        angle = Math.atan2(dy, dx)
        facingAngleRef.current = angle
      } else {
        angle = facingAngleRef.current ?? Math.atan2(mouseRef.current.y - localPlayer.y, mouseRef.current.x - localPlayer.x)
      }

      const now = performance.now()
      if (now - lastInputTime >= 33) {
        const angleChanged = lastSentAngleRef.current === null || Math.abs(angle - lastSentAngleRef.current) > 0.087
        if (angleChanged) lastSentAngleRef.current = angle
        lastInputTime = now
        networkClient.emit(GameMessages.INPUT, { dx, dy, angle, attack: mouseRef.current.down })
      }

      const isAttacking = mouseRef.current.down
      if (isAttacking && !prevAttackRef.current) {
        attackFlashRef.current = 1.0
        // 播放攻击音效
        const lp = gameStateRef.current.players.find(p => p.id === user?.id)
        if (lp) {
          playAttack(lp.characterType || 'warrior')
        }
      }
      prevAttackRef.current = isAttacking
      attackFlashRef.current = isAttacking ? Math.max(attackFlashRef.current, 0.5) : Math.max(0, attackFlashRef.current - 0.08)

      // 打击感：顿帧处理
      updateHitlag()
      if (isHitlagging()) {
        // 顿帧中，跳过渲染但继续请求下一帧
        animationRef.current = requestAnimationFrame(gameLoop)
        return
      }

      // 打击感：屏幕震动 (combining hit shake + skill shake)
      const shake = updateShake()
      const skillShake = skillEffectStoreRef.current.getShake()
      const totalShakeX = shake.x + skillShake.dx
      const totalShakeY = shake.y + skillShake.dy
      const canvas = canvasRef.current
      if (canvas && (totalShakeX !== 0 || totalShakeY !== 0)) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.save()
          ctx.translate(totalShakeX, totalShakeY)
          render()
          ctx.restore()
        }
      } else {
        render()
      }

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)
    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current) }
  }, [isPaused, isGameOver, user, render])

  useEffect(() => { render() }, [render])

  const handleExit = () => {
    networkClient.emit(RoomMessages.LEAVE)
    floorSessionRef.current = 0
    gameSessionRef.current = 0
    prevPositions.current.clear()
    targetPositions.current.clear()
    reset()
    navigate('/lobby')
  }

  const handleReturnToRoom = () => {
    floorSessionRef.current = 0
    gameSessionRef.current = 0
    prevPositions.current.clear()
    targetPositions.current.clear()
    reset()
    navigate(`/room/${roomId}`)
  }

  // 调试功能处理函数
  const handleDebugTeleport = (targetFloor: number) => {
    networkClient.emit(GameMessages.DEBUG, { action: 'teleport', floor: targetFloor })
  }

  const handleDebugKillAll = () => {
    networkClient.emit(GameMessages.DEBUG, { action: 'killAll' })
  }

  const handleDebugToggleInvincible = () => {
    networkClient.emit(GameMessages.DEBUG, { action: 'setInvincible', invincible: !isInvincible })
    setIsInvincible(!isInvincible)
  }

  const handleDebugBossSlam = () => {
    networkClient.emit(GameMessages.DEBUG, { action: 'bossSlam' })
  }

  const handleDebugBossRanged = () => {
    networkClient.emit(GameMessages.DEBUG, { action: 'bossRanged' })
  }

  const handleDebugForceArena = () => {
    networkClient.emit(GameMessages.DEBUG, { action: 'forceArena' })
  }

  const handleDebugForceTrapFloor = () => {
    networkClient.emit(GameMessages.DEBUG, { action: 'forceTrapFloor' })
  }

  const handleDebugToggleFog = () => {
    networkClient.emit(GameMessages.DEBUG, { action: 'toggleFog' })
    setIsFogOff(!isFogOff)
  }

  // Derive local player skills for HUD
  const localPlayerForSkills = gameStateRef.current.players.find(p => p.id === user?.id)
  const localPlayerSkills = localPlayerForSkills?.skills ?? []

  const { gold, keys } = gameStateRef.current

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <GameHUD
        floor={floor}
        isArena={isArena}
        isMaze={isMaze}
        arenaWave={arenaWave}
        players={players}
        enemies={enemies}
        gold={gold}
        keys={keys}
        localPlayerSkills={localPlayerSkills}
        cooldownEndMap={cooldownEndRef.current}
        hoveredSkill={hoveredSkill}
        onHoverSkill={setHoveredSkill}
      />

      <GameCanvas canvasRef={canvasRef} />

      <GameOverlay
        isPaused={isPaused}
        isGameOver={isGameOver}
        isVictory={isVictory}
        onResume={() => setPaused(false)}
        onExit={handleExit}
        onReturnToRoom={handleReturnToRoom}
      />

      {/* 调试菜单 (仅 DEV 模式) */}
      {import.meta.env.DEV && showDebug && (
        <DebugMenu
          onTeleport={handleDebugTeleport}
          onKillAll={handleDebugKillAll}
          onToggleInvincible={handleDebugToggleInvincible}
          isInvincible={isInvincible}
          onBossSlam={handleDebugBossSlam}
          onBossRanged={handleDebugBossRanged}
          onForceArena={handleDebugForceArena}
          onForceTrapFloor={handleDebugForceTrapFloor}
          onToggleFog={handleDebugToggleFog}
          isFogOff={isFogOff}
        />
      )}
    </div>
  )
}
