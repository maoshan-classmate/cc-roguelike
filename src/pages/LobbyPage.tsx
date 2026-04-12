import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useLobbyStore } from '../store/useLobbyStore'
import { networkClient } from '../network/socket'
import { motion, AnimatePresence } from 'framer-motion'
import { DungeonParticles } from '../components/DungeonParticles'
import { DungeonBackground } from '../components/DungeonBackground'
import { BlurText } from '../components/animations'
import { PixelCastle, PixelSword, PixelStar, PixelSkull, PixelCrown, PixelGem, PixelKey, PixelDragon } from '../components/PixelIcons'
import { PixelRoomCard } from '../components/pixel'

/* ── animation variants ── */
const headerVariant = {
  hidden: { opacity: 0, y: -30 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 140, damping: 20, delay: 0.2 } },
}
const panelVariant = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 120, damping: 22, delay: 0.5 } },
}
const modalVariant = {
  enter: { opacity: 0, scale: 0.88, rotateX: -10 },
  center: { opacity: 1, scale: 1, rotateX: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
}

export default function LobbyPage() {
  const { user, logout } = useAuthStore()
  const { rooms, setRooms } = useLobbyStore()
  const [showCreate, setShowCreate] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  /* ── network logic (unchanged) ── */
  useEffect(() => {
    if (!networkClient.isConnected()) networkClient.connect()

    const setup = () => {
      networkClient.emit('lobby:list')
      networkClient.on('lobby:list:result', (data: any) => setRooms(data.rooms))
      networkClient.on('room:create:result', (data: any) => {
        if (data.success) navigate(`/room/${data.room.id}`)
      })
    }

    if (networkClient.isConnected()) setup()
    else networkClient.getSocket()?.once('connect', setup)

    networkClient.on('room:error', (data: any) => {
      setErrorMsg(data.message || '操作失败')
      setTimeout(() => setErrorMsg(''), 3000)
    })

    return () => {
      networkClient.off('lobby:list:result')
      networkClient.off('room:create:result')
    }
  }, [])

  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 3000) }
  const handleCreateRoom = () => {
    if (!roomName.trim()) return
    if (!networkClient.isConnected()) { showError('正在连接服务器，请稍后...'); return }
    networkClient.emit('room:create', { name: roomName })
    setShowCreate(false); setRoomName('')
  }
  const handleJoinRoom = (roomId: string) => navigate(`/room/${roomId}`)
  const handleLogout = () => { networkClient.emit('auth:logout'); networkClient.disconnect(); logout(); navigate('/login') }
  const handleRefresh = () => networkClient.emit('lobby:list')

  /* ── shared inline helpers ── */
  const FONT_TITLE = '"Kenney Pixel", monospace'
  const FONT_UI = '"Kenney Mini Square Mono", monospace'

  return (
    <div style={{ width: '100vw', minHeight: '100vh', position: 'relative', overflowX: 'hidden' }}>
      {/* ── Background Stack (same as LoginPage) ── */}
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
      <div style={{ position: 'relative', zIndex: 10, minHeight: '100vh', padding: 'clamp(12px, 2vw, 24px)', display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2vh, 20px)' }}>

        {/* Error toast */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              style={{
                position: 'fixed', top: 'clamp(12px, 2vh, 24px)', left: '50%', transform: 'translateX(-50%)', zIndex: 200,
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                background: 'rgba(255,68,68,0.12)', border: '1.5px solid rgba(255,68,68,0.35)', borderRadius: 8,
                color: '#FF4444', fontWeight: 'bold', fontSize: 'clamp(11px, 1.4vw, 13px)',
                fontFamily: FONT_UI, backdropFilter: 'blur(12px)',
              }}
            >
              <PixelSkull size={14} color="#FF4444" />{errorMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ── */}
        <motion.header
          variants={headerVariant}
          initial="hidden"
          animate="visible"
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 'clamp(12px, 2vw, 20px) clamp(14px, 2.5vw, 28px)',
            background: 'linear-gradient(135deg, rgba(25,15,45,0.88) 0%, rgba(15,8,30,0.85) 100%)',
            backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1.5px solid rgba(255,215,0,0.18)', borderRadius: 'clamp(10px, 1.2vw, 14px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 40px rgba(255,215,0,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Top edge glow */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)' }}>
            <div style={{ filter: 'drop-shadow(0 0 12px rgba(255,215,0,0.5))' }}>
              <PixelSword size={32} color="#FFD700" />
            </div>
            <div>
              <h1 style={{
                fontSize: 'clamp(18px, 3vw, 28px)', color: '#FFD700',
                fontFamily: FONT_TITLE, letterSpacing: 2, textShadow: '0 2px 12px rgba(255,215,0,0.3)',
                margin: 0, lineHeight: 1.2,
              }}>
                <BlurText text="大厅" delay={50} />
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <span style={{ color: 'rgba(255,215,0,0.5)', fontSize: 'clamp(10px, 1.3vw, 12px)', fontFamily: FONT_UI }}>
                  欢迎, {user?.username}
                </span>
                <span style={{ color: 'rgba(255,215,0,0.2)' }}>|</span>
                <span style={{ color: '#4A9EFF', fontSize: 'clamp(10px, 1.3vw, 12px)', fontFamily: FONT_UI }}>
                  {user?.character?.name || '无角色'}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'clamp(6px, 1vw, 10px)', flexWrap: 'wrap' }}>
            {/* Refresh */}
            <motion.button onClick={handleRefresh} whileHover={{ scale: 1.05, boxShadow: '0 4px 16px rgba(255,215,0,0.15)' }} whileTap={{ scale: 0.95 }}
              style={{
                padding: 'clamp(6px, 1vw, 10px) clamp(10px, 1.5vw, 16px)',
                background: 'rgba(139,69,19,0.3)', border: '1.5px solid rgba(139,69,19,0.4)', borderRadius: 6,
                color: '#DAA520', fontSize: 'clamp(10px, 1.3vw, 12px)', fontFamily: FONT_UI, fontWeight: 'bold',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: 1,
              }}>
              <PixelStar size={12} color="#FFD700" /> 刷新
            </motion.button>

            {/* Create Room */}
            <motion.button onClick={() => setShowCreate(true)} whileHover={{ scale: 1.05, boxShadow: '0 4px 20px rgba(255,215,0,0.2)', borderColor: 'rgba(255,215,0,0.45)' }} whileTap={{ scale: 0.95 }}
              style={{
                padding: 'clamp(6px, 1vw, 10px) clamp(10px, 1.5vw, 16px)',
                background: 'linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(255,215,0,0.08) 100%)',
                border: '1.5px solid rgba(255,215,0,0.25)', borderRadius: 6,
                color: '#FFD700', fontSize: 'clamp(10px, 1.3vw, 12px)', fontFamily: FONT_TITLE, fontWeight: 'bold',
                cursor: 'pointer', letterSpacing: 1,
              }}>
              + 创建房间
            </motion.button>

            {/* Logout */}
            <motion.button onClick={handleLogout} whileHover={{ scale: 1.05, boxShadow: '0 4px 16px rgba(255,68,68,0.15)', borderColor: 'rgba(255,68,68,0.4)' }} whileTap={{ scale: 0.95 }}
              style={{
                padding: 'clamp(6px, 1vw, 10px) clamp(10px, 1.5vw, 16px)',
                background: 'rgba(255,68,68,0.1)', border: '1.5px solid rgba(255,68,68,0.25)', borderRadius: 6,
                color: '#FF6666', fontSize: 'clamp(10px, 1.3vw, 12px)', fontFamily: FONT_UI, fontWeight: 'bold',
                cursor: 'pointer', letterSpacing: 1,
              }}>
              登出
            </motion.button>
          </div>
        </motion.header>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }} animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            height: 1.5, background: 'linear-gradient(90deg, transparent, #B8860B, #FFD700, #B8860B, transparent)',
            transformOrigin: 'center',
          }}
        />

        {/* ── Room List Panel ── */}
        <motion.div
          variants={panelVariant}
          initial="hidden"
          animate="visible"
          style={{
            padding: 'clamp(16px, 3vw, 28px)',
            background: 'linear-gradient(135deg, rgba(25,15,45,0.88) 0%, rgba(15,8,30,0.85) 50%, rgba(20,12,38,0.88) 100%)',
            backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1.5px solid rgba(255,215,0,0.18)', borderRadius: 'clamp(10px, 1.5vw, 16px)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 60px rgba(255,215,0,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Top edge glow */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, zIndex: 2, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent)' }} />

          {/* Spinning border glow */}
          <div style={{
            position: 'absolute', inset: -1, borderRadius: 'clamp(11px, 1.5vw, 17px)',
            background: 'conic-gradient(from 0deg, transparent, rgba(255,215,0,0.12), transparent, rgba(255,215,0,0.08), transparent)',
            animation: 'borderSpin 6s linear infinite', zIndex: 0,
          }} />
          <div style={{
            position: 'absolute', inset: 1.5, borderRadius: 'clamp(8px, 1.2vw, 14px)',
            background: 'linear-gradient(135deg, rgba(20,12,38,0.95), rgba(15,8,28,0.92))', zIndex: 0,
          }} />

          {/* Panel header */}
          <h2 style={{
            marginBottom: 'clamp(14px, 2.5vh, 22px)', color: '#FFD700',
            fontSize: 'clamp(14px, 2.2vw, 20px)', fontFamily: FONT_TITLE, letterSpacing: 1.5,
            display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1,
          }}>
            <PixelCastle size={20} color="#DAA520" />
            <BlurText text="房间列表" delay={30} />
            <span style={{ fontSize: 'clamp(10px, 1.2vw, 12px)', color: 'rgba(255,215,0,0.4)', fontWeight: 'normal' }}>
              ({rooms.length})
            </span>
          </h2>

          {/* Empty state */}
          {rooms.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              style={{ textAlign: 'center', padding: 'clamp(30px, 5vh, 60px) 0', position: 'relative', zIndex: 1 }}
            >
              <div style={{ marginBottom: 16, opacity: 0.35, display: 'flex', justifyContent: 'center' }}>
                <PixelCastle size={48} color="#8B6914" />
              </div>
              <p style={{ fontSize: 'clamp(13px, 1.8vw, 16px)', color: 'rgba(255,215,0,0.4)', fontFamily: FONT_UI, marginBottom: 6 }}>暂无房间</p>
              <p style={{ fontSize: 'clamp(10px, 1.2vw, 12px)', color: 'rgba(255,215,0,0.25)', fontFamily: FONT_UI }}>
                创建一个房间开始冒险吧！
              </p>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>
              <AnimatePresence>
                {rooms.map((room, i) => (
                  <PixelRoomCard key={room.id} room={room} onJoin={handleJoinRoom} index={i} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* Bottom decoration */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 1.2 }}
          style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: 'clamp(10px, 2vh, 30px) 0' }}
        >
          <PixelDragon size={20} color="#FF4444" />
          <PixelSkull size={20} color="rgba(255,255,255,0.6)" />
          <PixelCrown size={20} color="#FFD700" />
          <PixelGem size={20} color="#4A9EFF" />
          <PixelKey size={20} color="#DAA520" />
        </motion.div>
      </div>

      {/* ── Create Room Modal ── */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(6,2,14,0.85)', backdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <motion.div
              variants={modalVariant} initial="enter" animate="center" exit="exit"
              style={{
                width: 'clamp(280px, 85vw, 400px)', padding: 'clamp(20px, 4vw, 36px) clamp(18px, 3vw, 30px)',
                background: 'linear-gradient(135deg, rgba(25,15,45,0.92) 0%, rgba(15,8,30,0.9) 100%)',
                backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1.5px solid rgba(255,215,0,0.22)', borderRadius: 'clamp(10px, 1.5vw, 16px)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 80px rgba(255,215,0,0.1), inset 0 1px 0 rgba(255,255,255,0.08)',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {/* Top edge */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent)' }} />

              <motion.h3
                animate={{ textShadow: ['0 0 8px rgba(255,215,0,0.2)', '0 0 16px rgba(255,215,0,0.4)', '0 0 8px rgba(255,215,0,0.2)'] }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                  textAlign: 'center', color: '#FFD700', marginBottom: 'clamp(16px, 3vw, 24px)',
                  fontSize: 'clamp(14px, 2.2vw, 18px)', letterSpacing: 2, fontFamily: FONT_TITLE,
                }}
              >
                创建房间
              </motion.h3>

              <div style={{ marginBottom: 'clamp(14px, 2.5vw, 20px)' }}>
                <label style={{
                  display: 'block', marginBottom: 8, color: 'rgba(255,215,0,0.45)',
                  fontSize: 'clamp(9px, 1.2vw, 11px)', fontFamily: FONT_UI, letterSpacing: 1.5, textTransform: 'uppercase',
                }}>
                  房间名称
                </label>
                <motion.input
                  type="text" value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                  autoFocus
                  whileFocus={{
                    boxShadow: '0 0 24px rgba(255,215,0,0.12), inset 0 0 12px rgba(255,215,0,0.04)',
                    borderColor: 'rgba(255,215,0,0.35)',
                  }}
                  placeholder="给你的房间起个名字"
                  style={{
                    width: '100%', padding: 'clamp(10px, 1.8vw, 14px) clamp(10px, 1.5vw, 14px)',
                    background: 'rgba(8,3,18,0.6)', border: '1.5px solid rgba(255,215,0,0.1)', borderRadius: 8,
                    color: '#e8e0d4', fontSize: 'clamp(11px, 1.5vw, 14px)', fontFamily: FONT_UI,
                    outline: 'none', transition: 'all 0.3s ease', boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <motion.button onClick={() => setShowCreate(false)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.95 }}
                  style={{
                    padding: 'clamp(8px, 1.5vw, 12px) clamp(14px, 2vw, 20px)',
                    background: 'rgba(139,69,19,0.25)', border: '1.5px solid rgba(139,69,19,0.35)', borderRadius: 6,
                    color: 'rgba(255,215,0,0.5)', fontSize: 'clamp(11px, 1.3vw, 13px)', fontFamily: FONT_UI,
                    cursor: 'pointer', letterSpacing: 1,
                  }}>
                  取消
                </motion.button>
                <motion.button onClick={handleCreateRoom} whileHover={{ scale: 1.04, boxShadow: '0 4px 20px rgba(255,215,0,0.2)' }} whileTap={{ scale: 0.95 }}
                  style={{
                    padding: 'clamp(8px, 1.5vw, 12px) clamp(14px, 2vw, 20px)',
                    background: 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,215,0,0.1) 100%)',
                    border: '1.5px solid rgba(255,215,0,0.3)', borderRadius: 6,
                    color: '#FFD700', fontSize: 'clamp(11px, 1.3vw, 13px)', fontFamily: FONT_TITLE, fontWeight: 'bold',
                    cursor: 'pointer', letterSpacing: 1,
                  }}>
                  创建房间
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Keyframes ── */}
      <style>{`
        @keyframes raysRotate { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes fogDrift { 0% { transform: translateX(-2%) } 100% { transform: translateX(2%) } }
        @keyframes borderSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
