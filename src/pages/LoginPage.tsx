import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { networkClient } from '../network/socket'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'
import { DungeonParticles } from '../components/DungeonParticles'
import { DungeonBackground } from '../components/DungeonBackground'
import { AnimatedSprite } from '../components/AnimatedSprite'
import { BlurText } from '../components/animations'
import GradientText from '../components/animations/GradientText'

const CLASSES = [
  { name: 'knight_m', label: 'WARRIOR', color: '#4A9EFF', glow: '#4A9EFF44' },
  { name: 'elf_m', label: 'RANGER', color: '#51CF66', glow: '#51CF6644' },
  { name: 'wizzard_m', label: 'MAGE', color: '#FFA500', glow: '#FFA50044' },
  { name: 'dwarf_m', label: 'CLERIC', color: '#9B59B6', glow: '#9B59B644' },
]

const charVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.6, rotateZ: -8 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1, rotateZ: 0,
    transition: { type: 'spring' as const, stiffness: 200, damping: 18, delay: 0.6 + i * 0.15 },
  }),
}

const cardEntrance = {
  hidden: { opacity: 0, y: 50, scale: 0.88, rotateX: -15 },
  visible: {
    opacity: 1, y: 0, scale: 1, rotateX: 0,
    transition: { type: 'spring' as const, stiffness: 120, damping: 20, delay: 1.2 },
  },
}

const formVariants = {
  enter: (dir: number) => ({ rotateY: dir > 0 ? 90 : -90, opacity: 0, scale: 0.92 }),
  center: {
    rotateY: 0, opacity: 1, scale: 1,
    transition: { type: 'spring' as const, stiffness: 150, damping: 22 },
  },
  exit: (dir: number) => ({
    rotateY: dir > 0 ? -90 : 90, opacity: 0, scale: 0.92,
    transition: { duration: 0.25 },
  }),
}

function FloatingInput({ label, type = 'text', value, onChange, autoFocus }: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const active = focused || value.length > 0

  return (
    <div style={{ position: 'relative', marginBottom: 'clamp(12px, 2.5vh, 20px)' }}>
      <motion.label
        animate={{
          y: active ? -24 : 0,
          scale: active ? 0.72 : 1,
          color: focused ? '#FFD700' : 'rgba(255,215,0,0.45)',
          letterSpacing: active ? 2 : 1,
        }}
        transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
        style={{
          position: 'absolute', left: 'clamp(10px, 2vw, 14px)', top: 'clamp(10px, 2vw, 14px)',
          pointerEvents: 'none', transformOrigin: 'left',
          fontFamily: '"Kenney Mini Square Mono", monospace',
          fontSize: 'clamp(10px, 1.5vw, 12px)',
        }}
      >
        {label}
      </motion.label>
      <motion.input
        type={type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        whileFocus={{
          boxShadow: '0 0 24px rgba(255,215,0,0.12), inset 0 0 12px rgba(255,215,0,0.04)',
          borderColor: 'rgba(255,215,0,0.35)',
        }}
        style={{
          width: '100%',
          padding: 'clamp(10px, 2vw, 15px) clamp(10px, 2vw, 14px) clamp(6px, 1vw, 10px)',
          background: 'rgba(8,3,18,0.6)',
          border: '1.5px solid rgba(255,215,0,0.08)',
          borderRadius: 8,
          color: '#e8e0d4',
          fontSize: 'clamp(11px, 1.6vw, 14px)',
          fontFamily: '"Kenney Mini Square Mono", monospace',
          outline: 'none', transition: 'all 0.3s ease',
          boxSizing: 'border-box',
        }}
      />
      <motion.div
        animate={{ scaleX: focused ? 1 : 0, opacity: focused ? 1 : 0 }}
        transition={{ type: 'spring' as const, stiffness: 400, damping: 30 }}
        style={{
          height: 2, marginTop: -1,
          background: 'linear-gradient(90deg, transparent, #FFD700, #DAA520, transparent)',
          transformOrigin: 'center',
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [direction, setDirection] = useState(0)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  // Card 3D tilt
  const cardRef = useRef<HTMLDivElement>(null)
  const rawMX = useMotionValue(0.5)
  const rawMY = useMotionValue(0.5)
  const tiltRY = useSpring(0, { stiffness: 200, damping: 25 })
  const tiltRX = useSpring(0, { stiffness: 200, damping: 25 })

  useEffect(() => {
    const ux = rawMX.on('change', (v) => tiltRY.set((v - 0.5) * 14))
    const uy = rawMY.on('change', (v) => tiltRX.set((0.5 - v) * 10))
    return () => { ux(); uy() }
  }, [rawMX, rawMY, tiltRY, tiltRX])

  const onCardMove = useCallback((e: React.MouseEvent) => {
    const r = cardRef.current?.getBoundingClientRect()
    if (!r) return
    rawMX.set((e.clientX - r.left) / r.width)
    rawMY.set((e.clientY - r.top) / r.height)
  }, [rawMX, rawMY])

  const onCardLeave = useCallback(() => { rawMX.set(0.5); rawMY.set(0.5) }, [rawMX, rawMY])

  const spotX = rawMX.get() * 100
  const spotY = rawMY.get() * 100

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const event = isRegister ? 'auth:register' : 'auth:login'
      if (!networkClient.isConnected()) {
        networkClient.connect()
        await new Promise<void>((resolve) => {
          const s = networkClient.getSocket()
          if (s?.connected) resolve()
          else s?.once('connect', () => resolve())
        })
      }
      const result = await new Promise<any>((resolve) => {
        const t = setTimeout(() => resolve({ success: false, error: 'Timeout' }), 5000)
        const h = (data: any) => { clearTimeout(t); networkClient.off('auth:result', h); resolve(data) }
        networkClient.on('auth:result', h)
        networkClient.emit(event, { username, password })
      })
      if (result.success) { setAuth(result.user, result.token); navigate('/lobby') }
      else setError(result.error === 'USERNAME_EXISTS' ? '用户名已存在' : '登录失败')
    } catch { setError('连接失败') }
    finally { setLoading(false) }
  }

  const toggleMode = () => {
    setDirection(isRegister ? -1 : 1)
    setIsRegister(!isRegister)
    setError('')
  }

  // Responsive sprite size: CSS string passed to width/height
  const spriteCSS = 'clamp(56px, 10vw, 96px)'

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <DungeonBackground />

      {/* God rays */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'conic-gradient(from 180deg at 50% -10%, transparent 35%, rgba(255,215,0,0.05) 40%, transparent 45%, transparent 55%, rgba(255,180,50,0.04) 60%, transparent 65%)',
        animation: 'raysRotate 20s linear infinite', mixBlendMode: 'screen', opacity: 0.9, pointerEvents: 'none',
      }} />

      <DungeonParticles />

      {/* Fog */}
      <div style={{
        position: 'absolute', bottom: 0, left: '-10%', right: '-10%', height: '30%', zIndex: 6,
        background: 'linear-gradient(0deg, rgba(10,5,20,0.8) 0%, rgba(20,12,35,0.3) 40%, transparent 100%)',
        animation: 'fogDrift 12s ease-in-out infinite alternate', pointerEvents: 'none',
      }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 7,
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(6,2,14,0.4) 75%, rgba(6,2,14,0.65) 100%)',
        pointerEvents: 'none',
      }} />

      {/* UI Layer */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 'clamp(4px, 1.2vh, 10px)',
        padding: 'clamp(6px, 2vw, 20px)',
        pointerEvents: 'none',
      }}>
        {/* Title */}
        <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>
          <BlurText
            text="地下城突袭"
            delay={80}
            animateBy="letters"
            direction="top"
            className="login-title"
            stepDuration={0.4}
            animationFrom={{ opacity: 0, y: 50, filter: 'blur(10px)', scale: 0.8 }}
            animationTo={[
              { opacity: 0.5, y: -8, filter: 'blur(3px)', scale: 1.05 },
              { opacity: 1, y: 0, filter: 'blur(0px)', scale: 1 },
            ]}
          />
          <style>{`
            .login-title {
              font-size: clamp(24px, 5.5vw, 48px);
              font-weight: 800;
              letter-spacing: clamp(3px, 1.5vw, 14px);
              background: linear-gradient(135deg, #FFD700 0%, #FFF8DC 25%, #FFD700 50%, #DAA520 75%, #FFD700 100%);
              background-size: 300% 300%;
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              animation: goldShimmer 4s ease-in-out infinite;
              font-family: "Kenney Pixel", monospace;
              filter: drop-shadow(0 3px 14px rgba(255,215,0,0.55));
              display: flex;
              justify-content: center;
            }
          `}</style>
          <GradientText
            colors={['#8B6914', '#FFD700', '#DAA520', '#FFD700', '#B8860B']}
            animationSpeed={5}
            direction="horizontal"
          >
            <span style={{
              fontSize: 'clamp(8px, 1.2vw, 12px)',
              letterSpacing: 'clamp(4px, 1.5vw, 14px)',
              fontFamily: '"Kenney Mini Square Mono", monospace',
              display: 'inline-block', padding: '2px 8px',
            }}>
              DUNGEON RAID
            </span>
          </GradientText>
        </div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          style={{
            width: 'clamp(100px, 15vw, 160px)', height: 1.5,
            background: 'linear-gradient(90deg, transparent, #B8860B, #FFD700, #B8860B, transparent)',
          }}
        />

        {/* Characters — fully responsive via CSS */}
        <div style={{
          display: 'flex', flexWrap: 'wrap',
          alignItems: 'flex-end', justifyContent: 'center',
          gap: 'clamp(6px, 1.8vw, 18px)',
          pointerEvents: 'auto',
          maxWidth: 'clamp(240px, 55vw, 560px)',
        }}>
          {CLASSES.map((cls, i) => (
            <motion.div
              key={cls.name}
              custom={i}
              variants={charVariants}
              initial="hidden"
              animate="visible"
              whileHover={{
                y: -16, scale: 1.15,
                filter: `drop-shadow(0 8px 24px ${cls.glow}) brightness(1.2)`,
                transition: { type: 'spring' as const, stiffness: 400, damping: 15 },
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, cursor: 'default',
              }}
            >
              <div style={{
                position: 'relative',
                width: spriteCSS, height: spriteCSS,
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                animation: `heroFloat 4s cubic-bezier(0.45,0.05,0.55,0.95) infinite ${i * 0.8}s`,
                filter: `drop-shadow(0 6px 16px ${cls.glow})`,
              }}>
                <AnimatedSprite name={cls.name} anim="idle_anim" size={spriteCSS} interval={170 + i * 15} />
              </div>
              <div style={{
                width: 'clamp(30px, 5vw, 56px)', height: 8, borderRadius: '50%',
                background: `radial-gradient(ellipse, ${cls.color}99, transparent)`,
                filter: 'blur(3px)',
                animation: `discPulse 3s ease-in-out infinite ${i * 0.5}s`,
              }} />
              <span style={{
                fontSize: 'clamp(6px, 1vw, 9px)',
                letterSpacing: 2, color: cls.color,
                fontFamily: '"Kenney Mini Square Mono", monospace',
                textShadow: `0 0 8px ${cls.color}77`, fontWeight: 700,
              }}>
                {cls.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Glass Card — all dimensions responsive */}
        <motion.div
          ref={cardRef}
          variants={cardEntrance}
          initial="hidden"
          animate="visible"
          onMouseMove={onCardMove}
          onMouseLeave={onCardLeave}
          style={{
            width: 'clamp(280px, 85vw, 360px)',
            padding: 'clamp(16px, 3.5vw, 30px) clamp(14px, 3vw, 26px)',
            background: `
              radial-gradient(circle 200px at ${spotX}% ${spotY}%, rgba(255,215,0,0.1), transparent),
              linear-gradient(135deg, rgba(25,15,45,0.88) 0%, rgba(15,8,30,0.85) 50%, rgba(20,12,38,0.88) 100%)
            `,
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1.5px solid rgba(255,215,0,0.2)',
            borderRadius: 'clamp(10px, 1.5vw, 16px)',
            boxShadow: `
              0 16px 48px rgba(0,0,0,0.7),
              0 0 80px rgba(255,215,0,0.08),
              inset 0 1px 0 rgba(255,255,255,0.08),
              inset 0 -1px 0 rgba(0,0,0,0.3)
            `,
            position: 'relative', overflow: 'hidden',
            pointerEvents: 'auto',
            transformStyle: 'preserve-3d',
            rotateX: tiltRX,
            rotateY: tiltRY,
            animation: 'cardBreathe 4s ease-in-out infinite',
          }}
        >
          {/* Animated border glow ring */}
          <div style={{
            position: 'absolute', inset: -1, borderRadius: 'clamp(11px, 1.5vw, 17px)',
            background: 'conic-gradient(from 0deg, transparent, rgba(255,215,0,0.15), transparent, rgba(255,215,0,0.1), transparent)',
            animation: 'borderSpin 6s linear infinite', zIndex: 0,
          }} />
          <div style={{
            position: 'absolute', inset: 1.5, borderRadius: 'clamp(8px, 1.2vw, 14px)',
            background: 'linear-gradient(135deg, rgba(20,12,38,0.95), rgba(15,8,28,0.92))',
            zIndex: 0,
          }} />

          {/* Noise */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            borderRadius: 'clamp(10px, 1.5vw, 16px)', zIndex: 1,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          }} />

          {/* Light sweep */}
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute', top: '-60%', left: '-60%', width: '220%', height: '220%',
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(255,215,0,0.05) 8%, transparent 16%)',
              pointerEvents: 'none', zIndex: 1,
            }}
          />

          {/* Top edge */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1.5, zIndex: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.5), transparent)',
          }} />

          {/* Bottom edge */}
          <div style={{
            position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 1, zIndex: 2,
            background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.12), transparent)',
          }} />

          {/* Form */}
          <div style={{ perspective: 1200, position: 'relative', zIndex: 3 }}>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={isRegister ? 'register' : 'login'}
                custom={direction}
                variants={formVariants}
                initial="enter"
                animate="center"
                exit="exit"
              >
                <motion.h2
                  animate={{ textShadow: ['0 0 8px rgba(255,215,0,0.2)', '0 0 16px rgba(255,215,0,0.4)', '0 0 8px rgba(255,215,0,0.2)'] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  style={{
                    textAlign: 'center', color: '#FFD700',
                    fontSize: 'clamp(11px, 2vw, 15px)', letterSpacing: 'clamp(2px, 0.5vw, 5px)',
                    marginBottom: 'clamp(12px, 2.5vw, 24px)',
                    fontFamily: '"Kenney Pixel", monospace',
                  }}
                >
                  {isRegister ? '注册新冒险者' : '冒险者登录'}
                </motion.h2>

                <form onSubmit={handleSubmit} style={{ position: 'relative', zIndex: 1 }}>
                  <FloatingInput label="冒险者名号" value={username} onChange={setUsername} autoFocus />
                  <FloatingInput label="秘密密钥" type="password" value={password} onChange={setPassword} />

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 10 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        style={{
                          color: '#FF4444', textAlign: 'center', fontSize: 11,
                          padding: '6px 8px', border: '1px solid rgba(255,68,68,0.3)',
                          background: 'rgba(255,68,68,0.06)', borderRadius: 6,
                          fontFamily: '"Kenney Mini Square Mono", monospace',
                        }}
                      >
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileHover={{
                      scale: 1.03,
                      boxShadow: '0 8px 32px rgba(255,215,0,0.25), 0 0 60px rgba(255,215,0,0.1)',
                      borderColor: 'rgba(255,215,0,0.5)',
                    }}
                    whileTap={{ scale: 0.97 }}
                    style={{
                      width: '100%',
                      padding: 'clamp(10px, 2vw, 14px) 20px',
                      background: loading
                        ? 'linear-gradient(135deg, #3a2e2c, #2a2220)'
                        : 'linear-gradient(135deg, rgba(255,215,0,0.22) 0%, rgba(255,215,0,0.1) 100%)',
                      border: '1.5px solid rgba(255,215,0,0.25)',
                      borderRadius: 8,
                      color: loading ? '#8B4513' : '#FFD700',
                      fontSize: 'clamp(11px, 1.8vw, 14px)',
                      fontWeight: 700, letterSpacing: 'clamp(2px, 0.4vw, 4px)',
                      cursor: loading ? 'wait' : 'pointer',
                      fontFamily: '"Kenney Pixel", monospace',
                      textTransform: 'uppercase',
                      transition: 'all 0.3s ease',
                      position: 'relative', zIndex: 1, overflow: 'hidden',
                    }}
                  >
                    {!loading && (
                      <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
                        style={{
                          position: 'absolute', top: 0, bottom: 0, width: '45%',
                          background: 'linear-gradient(-45deg, transparent 30%, rgba(255,255,255,0.12) 50%, transparent 70%)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          style={{ display: 'inline-block', width: 16, height: 16 }}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M12 2a10 10 0 0 1 10 10" />
                          </svg>
                        </motion.span>
                        处理中...
                      </span>
                    ) : isRegister ? '创建冒险者' : '进入冒险'}
                  </motion.button>
                </form>

                <div style={{
                  width: '100%', height: 1,
                  marginTop: 'clamp(10px, 2vw, 16px)',
                  marginBottom: 'clamp(6px, 1.2vw, 12px)',
                  background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.12), transparent)',
                }} />

                <motion.button
                  type="button"
                  onClick={toggleMode}
                  whileHover={{ color: '#FFD700', textShadow: '0 0 8px rgba(255,215,0,0.3)' }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'center',
                    background: 'transparent', border: 'none',
                    color: 'rgba(255,215,0,0.4)', fontSize: 'clamp(9px, 1.3vw, 11px)',
                    cursor: 'pointer', letterSpacing: 1,
                    fontFamily: '"Kenney Mini Square Mono", monospace',
                    transition: 'all 0.3s',
                  }}
                >
                  {isRegister ? '已有账号？登录' : '没有账号？注册'}
                </motion.button>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.5 }}
          style={{
            fontSize: 'clamp(7px, 1vw, 9px)',
            color: 'rgba(255,215,0,0.22)',
            letterSpacing: 'clamp(3px, 0.6vw, 5px)',
            fontFamily: '"Kenney Mini Square Mono", monospace',
          }}
        >
          MULTIPLAYER ROGUELIKE
        </motion.div>
      </div>

      <style>{`
        @keyframes goldShimmer {
          0% { background-position: 0% 50% }
          50% { background-position: 100% 50% }
          100% { background-position: 0% 50% }
        }
        @keyframes raysRotate {
          from { transform: rotate(0deg) }
          to { transform: rotate(360deg) }
        }
        @keyframes fogDrift {
          0% { transform: translateX(-2%) }
          100% { transform: translateX(2%) }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(0) }
          30% { transform: translateY(-6px) }
          60% { transform: translateY(-2px) }
        }
        @keyframes discPulse {
          0%, 100% { opacity: 0.4; transform: scaleX(0.85) }
          50% { opacity: 1; transform: scaleX(1.2) }
        }
        @keyframes cardBreathe {
          0%, 100% { box-shadow: 0 16px 48px rgba(0,0,0,0.7), 0 0 60px rgba(255,215,0,0.06), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3); }
          50% { box-shadow: 0 16px 48px rgba(0,0,0,0.7), 0 0 100px rgba(255,215,0,0.12), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.3); }
        }
        @keyframes borderSpin {
          from { transform: rotate(0deg) }
          to { transform: rotate(360deg) }
        }
      `}</style>
    </div>
  )
}
