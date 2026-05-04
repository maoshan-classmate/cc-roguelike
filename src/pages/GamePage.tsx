import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useGameStore } from '../store/useGameStore'
import type { PlayerState, EnemyState, BulletState, HealWaveState, ItemState, DungeonData, GameState as SharedGameState } from '@shared/types'
import { SKILL_INFO, type SkillInfo } from '../config/skills'

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
}
import { networkClient } from '../network/socket'
import { mainAtlasPath } from '../assets/0x72'
import { motion, AnimatePresence } from 'framer-motion'
import { useParticleSystem } from '../hooks/useParticleSystem'
import { useDamageTexts } from '../hooks/useDamageTexts'
import { useGameRenderer, getAnimSprite } from '../hooks/useGameRenderer'
import { GENERATED_SPRITES } from '../config/generatedSprites'
import { useSound } from '../audio/useSound'
import { SFX_IDS } from '../audio/sfx'
import { useHitEffect } from '../hooks/useHitEffect'
import { useGameInput } from '../hooks/useGameInput'
import { createSkillEffectStore, type SkillEffectStore } from '../rendering/skillEffectRenderer'
import { drawSkillPreview, type SkillPreviewState } from '../rendering/skillPreviewRenderer'
import {
  PixelCastle,
  PixelGem,
  PixelKey,
  PixelSword,
  PixelSkull,
} from '../components/PixelIcons'

// 加载精灵图（仅 0x72 TilesetII，Kenney 已废弃）
const tileset2Atlas = new Image()
tileset2Atlas.src = mainAtlasPath

// 加载 AI 生成精灵 sheet
const generatedSheets: Record<string, HTMLImageElement> = {}
for (const [name, def] of Object.entries(GENERATED_SPRITES)) {
  const img = new Image()
  img.src = def.sheetPath
  generatedSheets[name] = img
}

// 技能图标通过 SKILL_INFO 动态加载

// ── UI 动画 variants ──
const hudItemVariant = (i: number) => ({
  hidden: { opacity: 0, y: -20, scale: 0.85 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 20, delay: 0.3 + i * 0.08 } },
})
const skillVariant = (i: number) => ({
  hidden: { opacity: 0, x: 40, scale: 0.7 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 18, delay: 0.5 + i * 0.1 } },
})
const overlayVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}
const overlayPanelVariant = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22, delay: 0.1 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
}

// 调试菜单组件
function DebugMenu({
  onTeleport,
  onKillAll,
  onToggleInvincible,
  isInvincible,
  onBossSlam,
  onBossRanged
}: {
  onTeleport: (floor: number) => void
  onKillAll: () => void
  onToggleInvincible: () => void
  isInvincible: boolean
  onBossSlam: () => void
  onBossRanged: () => void
}) {
  const [floorInput, setFloorInput] = useState('')

  const handleTeleport = () => {
    const floor = parseInt(floorInput)
    if (floor >= 1 && floor <= 5) {
      onTeleport(floor)
    }
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 60,
      left: 10,
      zIndex: 20,
      background: 'rgba(0,0,0,0.9)',
      border: '2px solid var(--pixel-gold)',
      padding: 12,
      fontFamily: 'Courier New, monospace',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--pixel-gold)', marginBottom: 8, fontWeight: 'bold' }}>[ 调试菜单 ]</div>

      {/* 跳关 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <input
          type="number"
          min="1"
          max="5"
          value={floorInput}
          onChange={(e) => setFloorInput(e.target.value)}
          placeholder="1-5"
          style={{
            width: 50,
            background: 'var(--pixel-bg)',
            border: '1px solid var(--pixel-brown)',
            color: 'var(--pixel-gold)',
            padding: '2px 4px',
            fontFamily: 'Courier New',
            fontSize: 11,
          }}
        />
        <button
          onClick={handleTeleport}
          className="btn-pixel"
          style={{ background: 'var(--pixel-brown)', fontSize: 11, padding: '2px 8px' }}
        >
          跳关
        </button>
      </div>

      {/* 无敌开关 */}
      <button
        onClick={onToggleInvincible}
        className="btn-pixel"
        style={{
          background: isInvincible ? 'var(--pixel-green)' : 'var(--pixel-dark)',
          fontSize: 11,
          padding: '4px 8px',
          marginBottom: 8,
          width: '100%',
        }}
      >
        {isInvincible ? '[ 无敌 ON ]' : '[ 无敌 OFF ]'}
      </button>

      {/* 一键清怪 */}
      <button
        onClick={onKillAll}
        className="btn-pixel"
        style={{ background: 'var(--pixel-red)', fontSize: 11, padding: '4px 8px', width: '100%', marginBottom: 8 }}
      >
        [ 一键清怪 ]
      </button>

      {/* Boss 技能测试 */}
      <div style={{ color: 'var(--pixel-gold)', marginBottom: 4, fontSize: 10 }}>Boss 技能</div>
      <button
        onClick={onBossSlam}
        className="btn-pixel"
        style={{ background: '#8B4513', fontSize: 11, padding: '4px 8px', width: '100%', marginBottom: 4 }}
      >
        [ 震地 AOE ]
      </button>
      <button
        onClick={onBossRanged}
        className="btn-pixel"
        style={{ background: '#8B0000', fontSize: 11, padding: '4px 8px', width: '100%' }}
      >
        [ 弹幕 Ranged ]
      </button>
    </div>
  )
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
    setState,
    setFloor,
    setPaused,
    setGameOver,
    setLocalPlayerId,
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
    dungeon: null
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
        dungeon: state.dungeon ?? null
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
          }
        }
      }
      setState(state)
    })

    networkClient.on(GameMessages.FLOOR_START, (data: { floor: number; gameSession: number }) => {
      prevPositions.current.clear()
      targetPositions.current.clear()
      gameStateRef.current = { players: [], enemies: [], bullets: [], healWaves: [], items: [], gold: 0, keys: 0, dungeon: null }
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
        const localPlayer = gameStateRef.current.players.find(p => p.id === user?.id)
        if (localPlayer) {
          playAttack(localPlayer.characterType || 'warrior')
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

  const { gold, keys } = gameStateRef.current

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* HUD — 交错入场 */}
      <div style={{
        position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.div variants={hudItemVariant(0)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelCastle size={16} color="#8B4513" />
            <span style={{ color: 'var(--pixel-gold)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{floor}/5</span>
          </motion.div>
          <motion.div variants={hudItemVariant(1)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--player-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelSword size={16} color="#C0C0C0" />
            <span style={{ color: 'var(--success)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{players.filter(p => p.alive).length}/{players.length}</span>
          </motion.div>
          <motion.div variants={hudItemVariant(2)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-red)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelSkull size={16} color="#FFFFFF" />
            <span style={{ color: 'var(--danger)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{enemies.filter(e => e.alive).length}</span>
          </motion.div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.div variants={hudItemVariant(3)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelGem size={16} color="#FFD700" />
            <span style={{ color: 'var(--pixel-gold)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{gold}</span>
          </motion.div>
          <motion.div variants={hudItemVariant(4)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelKey size={16} color="#FFD700" />
            <span style={{ color: 'var(--pixel-gold)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{keys}</span>
          </motion.div>
        </div>
      </div>

      {/* 技能栏 — 动态图标 + 冷却遮罩 + tooltip */}
      {(() => {
        const localPlayer = gameStateRef.current.players.find(p => p.id === user?.id)
        const skills = localPlayer?.skills ?? []
        const now = Date.now()

        return (
          <div style={{
            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10,
          }}>
            {skills.map((skillId: string, i: number) => {
              const info = SKILL_INFO[skillId]
              if (!info) return null
              const cdEnd = cooldownEndRef.current.get(i) ?? 0
              const remaining = Math.max(0, cdEnd - now)
              const cdRatio = info.cooldown > 0 ? remaining / (info.cooldown * 1000) : 0

              return (
                <motion.div
                  key={skillId + i}
                  variants={skillVariant(i)}
                  initial="hidden"
                  animate="visible"
                  onHoverStart={() => setHoveredSkill(i)}
                  onHoverEnd={() => setHoveredSkill(null)}
                  style={{ position: 'relative' }}
                >
                  <div style={{
                    width: 56, height: 56,
                    background: '#1A1210',
                    border: `2px solid ${info.color}`,
                    borderRadius: 4,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    boxShadow: `2px 2px 0 rgba(0,0,0,0.5), inset 0 0 8px ${info.color}22`,
                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  }}>
                    {/* Icon */}
                    <img
                      src={info.icon}
                      alt={info.name}
                      style={{
                        width: 32, height: 32, objectFit: 'contain',
                        imageRendering: 'pixelated',
                        opacity: cdRatio > 0 ? 0.4 : 1,
                      }}
                    />
                    {/* Skill name */}
                    <div style={{
                      fontSize: 8, color: info.color, fontFamily: 'monospace',
                      lineHeight: '10px', marginTop: 1, whiteSpace: 'nowrap',
                    }}>
                      {info.name}
                    </div>
                    {/* Key hint */}
                    <div style={{
                      position: 'absolute', top: 2, left: 3,
                      fontSize: 9, color: '#666', fontFamily: 'monospace',
                    }}>
                      {i + 1}
                    </div>
                    {/* Energy cost */}
                    <div style={{
                      position: 'absolute', bottom: 2, right: 3,
                      fontSize: 8, color: '#88AACC', fontFamily: 'monospace',
                    }}>
                      {info.energyCost}
                    </div>
                    {/* Cooldown overlay */}
                    {cdRatio > 0 && (
                      <>
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0,
                          height: `${cdRatio * 100}%`,
                          background: 'rgba(0,0,0,0.7)',
                          pointerEvents: 'none',
                        }} />
                        <div style={{
                          position: 'absolute', top: '50%', left: '50%',
                          transform: 'translate(-50%, -50%)',
                          fontSize: 14, color: '#FFF', fontFamily: 'monospace',
                          fontWeight: 'bold', textShadow: '1px 1px 2px #000',
                        }}>
                          {(remaining / 1000).toFixed(1)}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tooltip */}
                  {hoveredSkill === i && (
                    <div style={{
                      position: 'absolute', right: 64, top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(0,0,0,0.92)',
                      border: `1px solid ${info.color}`,
                      borderRadius: 4, padding: '6px 8px',
                      minWidth: 140, maxWidth: 180, zIndex: 20,
                      pointerEvents: 'none',
                    }}>
                      <div style={{ fontSize: 11, color: info.color, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 3 }}>
                        {info.name}
                      </div>
                      <div style={{ fontSize: 9, color: '#CCC', fontFamily: 'monospace', lineHeight: '13px', marginBottom: 4 }}>
                        {info.description}
                      </div>
                      <div style={{ fontSize: 9, color: '#888', fontFamily: 'monospace' }}>
                        能量 {info.energyCost} | 冷却 {info.cooldown}s
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )
      })()}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1024}
        height={768}
        style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          border: '4px solid var(--pixel-brown)', boxShadow: '6px 6px 0 rgba(0,0,0,0.5)',
          imageRendering: 'pixelated'
        }}
      />

      {/* Controls hint — 淡入 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
        style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          color: 'var(--pixel-brown)', fontSize: 11, fontFamily: 'Courier New, monospace',
          textShadow: '2px 2px 0 rgba(0,0,0,0.5)', padding: '5px 15px',
          background: 'rgba(0,0,0,0.5)', zIndex: 10,
        }}
      >
        [ WASD移动 | 鼠标瞄准 | 左键射击 | 1-3技能(按住预览) | ESC暂停 ]
      </motion.div>

      {/* Pause overlay — 弹簧缩放进出 */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            key="pause-overlay"
            variants={overlayVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100
            }}
          >
            <motion.div variants={overlayPanelVariant} initial="hidden" animate="visible" exit="exit"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
            >
              <h2 style={{ fontSize: 48, marginBottom: 20, color: 'var(--pixel-gold)', fontFamily: 'Courier New, monospace', textShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}>[ 暂停 ]</h2>
              <motion.button onClick={() => setPaused(false)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-pixel btn-success" style={{ marginBottom: 10, minWidth: 200 }}>[ 继续游戏 ]</motion.button>
              <motion.button onClick={handleExit} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-pixel btn-danger" style={{ minWidth: 200 }}>[ 退出游戏 ]</motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over overlay — 戏剧性弹簧动画 */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            key="gameover-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            >
              <motion.h2
                initial={{ scale: 0.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.25 }}
                style={{ fontSize: 48, marginBottom: 20, color: isVictory ? 'var(--pixel-gold)' : 'var(--danger)', fontFamily: 'Courier New, monospace', textShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
              >
                {isVictory ? '[ 胜利! ]' : '[ 失败 ]'}
              </motion.h2>
              <p style={{ marginBottom: 20, color: 'var(--pixel-brown)', fontFamily: 'Courier New, monospace' }}>
                {isVictory ? '恭喜你通关了地牢！' : '下次再接再厉！'}
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                style={{ display: 'flex', gap: 16 }}
              >
                <motion.button onClick={handleReturnToRoom} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} className="btn-pixel" style={{ background: 'var(--pixel-green)', minWidth: 160 }}>[ 返回房间 ]</motion.button>
                <motion.button onClick={handleExit} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} className="btn-pixel" style={{ background: 'var(--pixel-brown)', minWidth: 160 }}>[ 返回大厅 ]</motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 调试菜单 (仅 DEV 模式) */}
      {import.meta.env.DEV && showDebug && (
        <DebugMenu
          onTeleport={handleDebugTeleport}
          onKillAll={handleDebugKillAll}
          onToggleInvincible={handleDebugToggleInvincible}
          isInvincible={isInvincible}
          onBossSlam={handleDebugBossSlam}
          onBossRanged={handleDebugBossRanged}
        />
      )}
    </div>
  )
}
