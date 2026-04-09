import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useRoomStore } from '../store/useRoomStore'
import { networkClient } from '../network/socket'
import { motion, AnimatePresence } from 'framer-motion'
import { DungeonParticles } from '../components/DungeonParticles'
import { DungeonBackground } from '../components/DungeonBackground'
import { AnimatedSprite } from '../components/AnimatedSprite'
import { BlurText } from '../components/animations'
import { PixelCrown, PixelSkull, PixelDragon } from '../components/PixelIcons'
import { PixelPlayerSlot } from '../components/pixel'

/* ── Constants ── */
const CHARACTER_CLASSES = [
  { id: 'warrior', name: '战士', sprite: 'knight_m', color: '#4A9EFF', glow: '#4A9EFF44', desc: '近战，高防御' },
  { id: 'ranger', name: '游侠', sprite: 'elf_m', color: '#51CF66', glow: '#51CF6644', desc: '远程，高速度' },
  { id: 'mage', name: '法师', sprite: 'wizzard_m', color: '#FFA500', glow: '#FFA50044', desc: '魔法，高攻击' },
  { id: 'cleric', name: '牧师', sprite: 'dwarf_m', color: '#9B59B6', glow: '#9B59B644', desc: '治疗，辅助' },
]

const FONT_TITLE = '"Kenney Pixel", monospace'
const FONT_UI = '"Kenney Mini Square Mono", monospace'

/* ── animation variants ── */
const headerVariant = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 140, damping: 20, delay: 0.15 } },
}
const panelVariant = (delay: number) => ({
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 120, damping: 22, delay } },
})
const classVariant = (i: number) => ({
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 200, damping: 18, delay: 0.8 + i * 0.1 } },
})

/* ── Glass Card wrapper style ── */
const glassCard = {
  background: 'linear-gradient(135deg, rgba(25,15,45,0.88) 0%, rgba(15,8,30,0.85) 50%, rgba(20,12,38,0.88) 100%)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '1.5px solid rgba(255,215,0,0.18)',
  borderRadius: 'clamp(10px, 1.5vw, 16px)',
  boxShadow: '0 12px 40px rgba(0,0,0,0.65), 0 0 50px rgba(255,215,0,0.05), inset 0 1px 0 rgba(255,255,255,0.06)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user } = useAuthStore()
  const {
    roomName, players, hostId, isHost, isReady, gameStarted,
    setRoom, removePlayer, setPlayerReady, setGameStarted, clearRoom, setReady, setPlayerCharacterType,
  } = useRoomStore()
  const navigate = useNavigate()
  const [selectedClass, setSelectedClass] = useState<string>('warrior')

  /* ── network logic (unchanged) ── */
  useEffect(() => {
    const handleJoinPush = (data: any) => { if (data.room) setRoom(roomId!, data.room, data.room.hostId === user?.id) }
    const handleLeavePush = (data: any) => removePlayer(data.playerId, data.newHostId)
    const handleReadyPush = (data: any) => setPlayerReady(data.playerId, data.ready)
    const handlePlayerUpdate = (data: any) => { if (data.characterType) setPlayerCharacterType(data.playerId, data.characterType) }
    const handleStartPush = (data: any) => { setGameStarted(true); navigate(`/game/${data.roomId}`) }
    const handleError = () => navigate('/lobby')

    networkClient.on('room:join:push', handleJoinPush)
    networkClient.on('room:leave:push', handleLeavePush)
    networkClient.on('room:ready:push', handleReadyPush)
    networkClient.on('room:player:update', handlePlayerUpdate)
    networkClient.on('room:start:push', handleStartPush)
    networkClient.on('room:error', handleError)

    if (networkClient.isConnected()) networkClient.emit('room:join', { roomId })
    else { networkClient.connect(); networkClient.getSocket()?.once('connect', () => networkClient.emit('room:join', { roomId })) }

    return () => {
      networkClient.off('room:join:push', handleJoinPush)
      networkClient.off('room:leave:push', handleLeavePush)
      networkClient.off('room:ready:push', handleReadyPush)
      networkClient.off('room:player:update', handlePlayerUpdate)
      networkClient.off('room:start:push', handleStartPush)
      networkClient.off('room:error', handleError)
      clearRoom()
    }
  }, [roomId])

  const handleLeave = () => { networkClient.emit('room:leave'); navigate('/lobby') }
  const handleSelectClass = (classId: string) => {
    setSelectedClass(classId)
    if (user?.id) setPlayerCharacterType(user.id, classId)
    networkClient.emit('room:selectClass', { characterType: classId })
  }
  const handleReady = () => {
    const newReady = !isReady; setReady(newReady)
    if (user?.id) setPlayerReady(user.id, newReady)
    networkClient.emit('room:ready', { ready: newReady })
  }
  const handleStart = () => networkClient.emit('room:start')

  const allReady = players.length > 0 && players.every(p => p.ready)
  const spriteCSS = 'clamp(40px, 7vw, 64px)'

  return (
    <div style={{ width: '100vw', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* ── Background Stack ── */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}><DungeonBackground /></div>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1,
        background: 'conic-gradient(from 180deg at 50% -10%, transparent 35%, rgba(255,215,0,0.05) 40%, transparent 45%, transparent 55%, rgba(255,180,50,0.04) 60%, transparent 65%)',
        animation: 'raysRotate 20s linear infinite', mixBlendMode: 'screen', opacity: 0.9, pointerEvents: 'none',
      }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 5, pointerEvents: 'none' }}><DungeonParticles /></div>
      <div style={{
        position: 'fixed', bottom: 0, left: '-10%', right: '-10%', height: '30%', zIndex: 6,
        background: 'linear-gradient(0deg, rgba(10,5,20,0.8) 0%, rgba(20,12,35,0.3) 40%, transparent 100%)',
        animation: 'fogDrift 12s ease-in-out infinite alternate', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', inset: 0, zIndex: 7,
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(6,2,14,0.4) 75%, rgba(6,2,14,0.65) 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── UI Layer ── */}
      <div style={{
        position: 'relative', zIndex: 10, minHeight: '100vh',
        padding: 'clamp(12px, 2vw, 24px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 'clamp(12px, 2vh, 20px)',
      }}>
        <div style={{ width: '100%', maxWidth: 'clamp(340px, 90vw, 640px)' }}>

          {/* ── Header ── */}
          <motion.div
            variants={headerVariant} initial="hidden" animate="visible"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'clamp(8px, 1.5vh, 16px)' }}
          >
            <h1 style={{
              fontSize: 'clamp(20px, 3.5vw, 30px)', color: '#FFD700',
              fontFamily: FONT_TITLE, letterSpacing: 2,
              textShadow: '0 2px 12px rgba(255,215,0,0.3)', margin: 0, lineHeight: 1.2,
            }}>
              <BlurText text={roomName || '房间'} delay={40} />
            </h1>
            <motion.button onClick={handleLeave} whileHover={{ scale: 1.05, boxShadow: '0 4px 16px rgba(255,68,68,0.15)' }} whileTap={{ scale: 0.95 }}
              style={{
                padding: 'clamp(6px, 1vw, 10px) clamp(10px, 1.5vw, 16px)',
                background: 'rgba(255,68,68,0.1)', border: '1.5px solid rgba(255,68,68,0.25)', borderRadius: 6,
                color: '#FF6666', fontSize: 'clamp(10px, 1.2vw, 12px)', fontFamily: FONT_UI, fontWeight: 'bold',
                cursor: 'pointer', letterSpacing: 1,
              }}>
              ← 离开房间
            </motion.button>
          </motion.div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              height: 1.5, marginBottom: 'clamp(12px, 2vh, 20px)',
              background: 'linear-gradient(90deg, transparent, #B8860B, #FFD700, #B8860B, transparent)',
              transformOrigin: 'center',
            }}
          />

          {/* ── Player List Panel ── */}
          <motion.div variants={panelVariant(0.35)} initial="hidden" animate="visible"
            style={{ ...glassCard, padding: 'clamp(16px, 3vw, 24px)', marginBottom: 'clamp(12px, 2vh, 20px)' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)', zIndex: 2 }} />
            <h2 style={{
              marginBottom: 'clamp(12px, 2vh, 18px)', color: '#FFD700',
              fontSize: 'clamp(13px, 2vw, 18px)', fontFamily: FONT_TITLE, letterSpacing: 1.5,
              display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1,
            }}>
              <BlurText text="冒险者列表" delay={25} />
              <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)', color: 'rgba(255,215,0,0.35)', fontWeight: 'normal' }}>
                ({players.length}/4)
              </span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative', zIndex: 1 }}>
              {[0, 1, 2, 3].map((i) => {
                const player = players[i]
                const isLocalPlayer = player?.id === user?.id
                return (
                  <PixelPlayerSlot
                    key={i} index={i} player={player}
                    isHost={player?.id === hostId} isLocalPlayer={isLocalPlayer}
                    selectedClass={isLocalPlayer ? selectedClass : undefined}
                  />
                )
              })}
            </div>
          </motion.div>

          {/* ── Class Selection Panel ── */}
          <motion.div variants={panelVariant(0.55)} initial="hidden" animate="visible"
            style={{ ...glassCard, padding: 'clamp(16px, 3vw, 24px)', marginBottom: 'clamp(12px, 2vh, 20px)' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)', zIndex: 2 }} />
            <h2 style={{
              marginBottom: 'clamp(12px, 2vh, 16px)', color: '#FFD700',
              fontSize: 'clamp(13px, 2vw, 18px)', fontFamily: FONT_TITLE, letterSpacing: 1.5,
              display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1,
            }}>
              <PixelCrown size={18} color="#DAA520" />
              <BlurText text="选择职业" delay={25} />
            </h2>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'clamp(6px, 1.2vw, 12px)', position: 'relative', zIndex: 1,
            }}>
              {CHARACTER_CLASSES.map((cls, i) => {
                const isSelected = selectedClass === cls.id
                return (
                  <motion.button
                    key={cls.id}
                    variants={classVariant(i)}
                    initial="hidden"
                    animate="visible"
                    onClick={() => handleSelectClass(cls.id)}
                    whileHover={{
                      y: -4,
                      boxShadow: isSelected
                        ? `0 8px 24px ${cls.glow}, 0 0 40px ${cls.glow}`
                        : `0 4px 16px ${cls.glow}`,
                      borderColor: `${cls.color}88`,
                    }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: isSelected
                        ? `linear-gradient(135deg, ${cls.color}18, ${cls.color}08)`
                        : 'linear-gradient(135deg, rgba(20,12,38,0.7), rgba(15,8,28,0.6))',
                      border: `1.5px solid ${isSelected ? `${cls.color}55` : 'rgba(255,215,0,0.08)'}`,
                      borderRadius: 8, padding: 'clamp(10px, 1.5vw, 14px) clamp(4px, 0.8vw, 8px)',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: 'clamp(4px, 0.6vw, 8px)',
                      boxShadow: isSelected ? `0 0 20px ${cls.glow}` : 'none',
                      transition: 'border-color 0.3s ease',
                    }}
                  >
                    {/* Animated sprite */}
                    <div style={{
                      width: spriteCSS, height: spriteCSS,
                      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                      filter: isSelected ? `drop-shadow(0 4px 12px ${cls.glow})` : 'none',
                      animation: `heroFloat 4s cubic-bezier(0.45,0.05,0.55,0.95) infinite ${i * 0.6}s`,
                    }}>
                      <AnimatedSprite name={cls.sprite} anim="idle_anim" size={spriteCSS} interval={170 + i * 15} />
                    </div>
                    <span style={{
                      fontFamily: FONT_TITLE, fontSize: 'clamp(10px, 1.3vw, 13px)', fontWeight: 'bold',
                      color: isSelected ? cls.color : 'rgba(255,215,0,0.35)', letterSpacing: 0.5,
                    }}>
                      {cls.name}
                    </span>
                    <span style={{
                      fontFamily: FONT_UI, fontSize: 'clamp(8px, 0.9vw, 10px)',
                      color: 'rgba(255,215,0,0.25)', letterSpacing: 0.3,
                    }}>
                      {cls.desc}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </motion.div>

          {/* ── Action Buttons ── */}
          <motion.div
            variants={panelVariant(0.75)} initial="hidden" animate="visible"
            style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}
          >
            <div style={{ display: 'flex', gap: 'clamp(8px, 1.5vw, 14px)', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Ready button */}
              <motion.button
                onClick={handleReady}
                whileHover={{
                  scale: 1.04,
                  boxShadow: isReady
                    ? '0 6px 24px rgba(80,200,120,0.2), 0 0 40px rgba(80,200,120,0.08)'
                    : '0 6px 24px rgba(255,215,0,0.2), 0 0 40px rgba(255,215,0,0.08)',
                  borderColor: isReady ? 'rgba(80,200,120,0.5)' : 'rgba(255,215,0,0.45)',
                }}
                whileTap={{ scale: 0.96 }}
                style={{
                  padding: 'clamp(10px, 1.8vw, 16px) clamp(20px, 3.5vw, 36px)',
                  background: isReady
                    ? 'linear-gradient(135deg, rgba(80,200,120,0.18) 0%, rgba(80,200,120,0.08) 100%)'
                    : 'linear-gradient(135deg, rgba(255,215,0,0.18) 0%, rgba(255,215,0,0.08) 100%)',
                  border: `1.5px solid ${isReady ? 'rgba(80,200,120,0.3)' : 'rgba(255,215,0,0.25)'}`,
                  borderRadius: 8, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                  color: isReady ? '#50C878' : '#FFD700',
                  fontSize: 'clamp(12px, 1.8vw, 16px)', fontWeight: 'bold', letterSpacing: 1.5,
                  fontFamily: FONT_TITLE,
                }}
              >
                {!isReady && (
                  <motion.div
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute', top: 0, bottom: 0, width: '45%',
                      background: 'linear-gradient(-45deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
                {isReady ? '[ 取消准备 ]' : '[ 点击准备 ]'}
              </motion.button>

              {/* Start button (host only) */}
              {isHost && (
                <motion.button
                  onClick={handleStart}
                  disabled={!allReady}
                  whileHover={allReady ? {
                    scale: 1.04,
                    boxShadow: '0 6px 28px rgba(255,215,0,0.3), 0 0 50px rgba(255,215,0,0.12)',
                    borderColor: 'rgba(255,215,0,0.5)',
                  } : {}}
                  whileTap={allReady ? { scale: 0.96 } : {}}
                  style={{
                    padding: 'clamp(10px, 1.8vw, 16px) clamp(20px, 3.5vw, 36px)',
                    background: allReady
                      ? 'linear-gradient(135deg, rgba(255,215,0,0.25) 0%, rgba(255,215,0,0.12) 100%)'
                      : 'rgba(20,12,38,0.5)',
                    border: `1.5px solid ${allReady ? 'rgba(255,215,0,0.35)' : 'rgba(255,215,0,0.08)'}`,
                    borderRadius: 8,
                    cursor: allReady ? 'pointer' : 'not-allowed',
                    color: allReady ? '#FFD700' : 'rgba(255,215,0,0.2)',
                    fontSize: 'clamp(12px, 1.8vw, 16px)', fontWeight: 'bold', letterSpacing: 1.5,
                    fontFamily: FONT_TITLE,
                  }}
                >
                  [ 开始冒险 ]
                </motion.button>
              )}
            </div>

            {/* Status messages */}
            <AnimatePresence mode="wait">
              {!isHost && !allReady && players.length > 1 && (
                <motion.div
                  key="waiting-host" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    padding: 'clamp(8px, 1.2vw, 12px) clamp(14px, 2vw, 20px)',
                    background: 'rgba(255,215,0,0.05)', border: '1px solid rgba(255,215,0,0.12)', borderRadius: 6,
                    color: 'rgba(255,215,0,0.35)', fontSize: 'clamp(10px, 1.2vw, 12px)', fontFamily: FONT_UI,
                    textAlign: 'center',
                  }}>
                  等待房主开始游戏...
                </motion.div>
              )}

              {allReady && !isHost && (
                <motion.div
                  key="all-ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  style={{
                    padding: 'clamp(8px, 1.2vw, 12px) clamp(14px, 2vw, 20px)',
                    background: 'rgba(80,200,120,0.08)', border: '1px solid rgba(80,200,120,0.2)', borderRadius: 6,
                    color: '#50C878', fontSize: 'clamp(10px, 1.2vw, 12px)', fontFamily: FONT_UI,
                    textAlign: 'center',
                    animation: 'readyPulse 2s ease-in-out infinite',
                  }}>
                  所有玩家已准备！等待开始...
                </motion.div>
              )}

              {!allReady && players.length > 1 && isHost && (
                <motion.div
                  key="hint" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{
                    padding: 'clamp(8px, 1.2vw, 12px) clamp(14px, 2vw, 20px)',
                    background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: 6,
                    color: 'rgba(255,215,0,0.3)', fontSize: 'clamp(10px, 1.2vw, 12px)', fontFamily: FONT_UI,
                    textAlign: 'center',
                  }}>
                  提示：所有玩家准备后即可开始游戏
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Bottom decoration */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 0.25 }} transition={{ delay: 1.5 }}
            style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 'clamp(20px, 3vh, 40px)' }}
          >
            <PixelDragon size={20} color="#FF4444" />
            <PixelSkull size={20} color="rgba(255,255,255,0.5)" />
            <PixelCrown size={20} color="#FFD700" />
          </motion.div>
        </div>
      </div>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes raysRotate { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fogDrift { 0% { transform: translateX(-2%) } 100% { transform: translateX(2%) } }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0) }
          30% { transform: translateY(-6px) }
          60% { transform: translateY(-2px) }
        }
        @keyframes readyPulse {
          0%, 100% { opacity: 0.8; } 50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
