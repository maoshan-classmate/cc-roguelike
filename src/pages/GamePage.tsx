import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useGameStore } from '../store/useGameStore'
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
import {
  PixelCastle,
  PixelGem,
  PixelKey,
  PixelSword,
  PixelShield,
  PixelSkull,
  PixelBow,
  PixelStar,
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

// 技能图标
const SKILL_ICONS = [
  { name: '技能1', color: '#C0C0C0' },
  { name: '技能2', color: '#4A9EFF' },
  { name: '技能3', color: '#8B4513' },
  { name: '技能4', color: '#9B59B6' },
]
const SkillIconComponents = [PixelSword, PixelShield, PixelBow, PixelStar]

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
  isInvincible
}: {
  onTeleport: (floor: number) => void
  onKillAll: () => void
  onToggleInvincible: () => void
  isInvincible: boolean
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
        style={{ background: 'var(--pixel-red)', fontSize: 11, padding: '4px 8px', width: '100%' }}
      >
        [ 一键清怪 ]
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
  const { play, playAttack, playHurt, playEnemyDie, playPickup, playFloorTransition, playVictory, playGameOver, playDash, playShield, playSpeed, playDie } = useSound()
  const { triggerHitEffect, updateShake, isHitlagging, updateHitlag } = useHitEffect()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const mouseRef = useRef({ x: 0, y: 0, down: false })
  const animationRef = useRef<number | undefined>(undefined)
  const [spritesLoaded, setSpritesLoaded] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [isInvincible, setIsInvincible] = useState(false)

  const gameStateRef = useRef({
    players: [] as any[],
    enemies: [] as any[],
    bullets: [] as any[],
    healWaves: [] as any[],
    items: [] as any[],
    gold: 0,
    keys: 0,
    dungeon: null as any
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
  const prevAttackRef = useRef(false)
  const floorSessionRef = useRef<number>(0)
  const gameSessionRef = useRef<number>(0)

  // Hooks
  const { particlesRef, spawnDeathParticles, updateAndDrawParticles } = useParticleSystem()
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
    attackFlashRef
  }

  const { render } = useGameRenderer(canvasRef, gameStateRef, renderDeps)

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
    networkClient.on('game:state', (state: any) => {
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
          const isPlayer = state.players?.some((p: any) => p.id === key)
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
        if (!state.players?.some((p: any) => p.id === key) && e.hp <= 0 && prevHp !== undefined && prevHp > 0) {
          playEnemyDie(e.type || 'basic')
          // 打击感：敌人死亡（顿帧 5 帧 + 震动 5px）
          triggerHitEffect(5, 5, 200)
        }

        // 音效：玩家死亡
        const prevAlive = prevAliveRef.current.get(key)
        if (prevAlive !== undefined && e.alive === false && prevAlive === true) {
          const isPlayer = state.players?.some((p: any) => p.id === key)
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
        const removedItems = prevItems.filter((item: any) => !newItems.some((newItem: any) => newItem.id === item.id))
        for (const item of removedItems) {
          // 检查是否是本地玩家拾取的（通过距离判断）
          const localPlayer = state.players?.find((p: any) => p.id === user?.id)
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
        gold: state.gold || 0,
        keys: state.keys || 0,
        dungeon: state.dungeon || null
      }
      setState(state)
    })

    networkClient.on('game:floor:start', (data: any) => {
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

    networkClient.on('game:end', (data: any) => {
      setGameOver(true, data.win)

      // 音效：游戏结束/胜利
      if (data.win) {
        playVictory()
      } else {
        playGameOver()
      }
    })

    return () => {
      networkClient.off('game:state')
      networkClient.off('game:floor:start')
      networkClient.off('game:end')
      floorSessionRef.current = 0
      gameSessionRef.current = 0
    }
  }, [])

  // Input handling
  useEffect(() => {
    const skillKeysDown = new Set<string>()

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === 'Escape') setPaused(!isPaused)
      // 调试菜单快捷键 (Home)
      if (e.key === 'Home' && import.meta.env.DEV) {
        setShowDebug(prev => !prev)
      }
      const skillKey = e.key
      if (['1', '2', '3', '4'].includes(skillKey) && !skillKeysDown.has(skillKey)) {
        skillKeysDown.add(skillKey)
        networkClient.emit('game:input', { skill: parseInt(skillKey) - 1 })

        // 播放技能音效
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

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', () => { mouseRef.current.down = true })
    window.addEventListener('mouseup', () => { mouseRef.current.down = false })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', () => { mouseRef.current.down = true })
      window.removeEventListener('mouseup', () => { mouseRef.current.down = false })
    }
  }, [isPaused])

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
      const localPlayer = players.find((p: any) => p.id === user?.id)

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
        networkClient.emit('game:input', { dx, dy, angle, attack: mouseRef.current.down })
      }

      const isAttacking = mouseRef.current.down
      if (isAttacking && !prevAttackRef.current) {
        attackFlashRef.current = 1.0
        // 播放攻击音效
        const localPlayer = gameStateRef.current.players.find((p: any) => p.id === user?.id)
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

      // 打击感：屏幕震动
      const shake = updateShake()
      const canvas = canvasRef.current
      if (canvas && (shake.x !== 0 || shake.y !== 0)) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.save()
          ctx.translate(shake.x, shake.y)
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
    networkClient.emit('room:leave')
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
    networkClient.emit('game:debug', { action: 'teleport', floor: targetFloor })
  }

  const handleDebugKillAll = () => {
    networkClient.emit('game:debug', { action: 'killAll' })
  }

  const handleDebugToggleInvincible = () => {
    networkClient.emit('game:debug', { action: 'setInvincible', invincible: !isInvincible })
    setIsInvincible(!isInvincible)
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

      {/* 技能栏 — 交错入场 + 弹簧交互 */}
      <div style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10,
      }}>
        {SKILL_ICONS.map((skill, i) => (
          <motion.div
            key={i}
            variants={skillVariant(i)}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.15, boxShadow: `0 0 16px ${skill.color}66` }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 48, height: 48,
              background: `linear-gradient(135deg, ${skill.color} 0%, ${skill.color}88 100%)`,
              border: '3px solid #FFFFFF', borderRadius: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, boxShadow: '2px 2px 0 rgba(0,0,0,0.5)', cursor: 'pointer',
            }}
          >
            {(() => { const Icon = SkillIconComponents[i]; return <Icon size={24} color={skill.color} />; })()}
          </motion.div>
        ))}
      </div>

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
        [ WASD移动 | 鼠标瞄准 | 左键射击 | 1-4技能 | ESC暂停 ]
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
        />
      )}
    </div>
  )
}
