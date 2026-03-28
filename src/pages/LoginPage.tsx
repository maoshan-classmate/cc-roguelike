import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { networkClient } from '../network/socket'

// 像素装饰图标组件
function PixelDecoration({ icon, color }: { icon: string; color?: string }) {
  return (
    <div style={{
      width: 48,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 28,
      filter: `drop-shadow(0 0 10px ${color || 'rgba(255, 215, 0, 0.5)'})`,
      animation: 'pixel-bounce 2s ease-in-out infinite',
    }}>
      {icon}
    </div>
  )
}

// 装饰线组件
function DecorativeLine() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      margin: '16px 0',
    }}>
      <span style={{ color: 'var(--pixel-brown)', fontSize: 12 }}>━━━</span>
      <span style={{ color: 'var(--pixel-gold)', fontSize: 16 }}>◆</span>
      <span style={{ color: 'var(--pixel-brown)', fontSize: 12 }}>━━━</span>
    </div>
  )
}

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const event = isRegister ? 'auth:register' : 'auth:login'

      if (!networkClient.isConnected()) {
        networkClient.connect()
        await new Promise<void>((resolve) => {
          const socket = networkClient.getSocket()
          if (socket?.connected) {
            resolve()
          } else {
            socket?.once('connect', () => resolve())
          }
        })
      }

      const result = await new Promise<any>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Timeout' })
        }, 5000)

        const handler = (data: any) => {
          clearTimeout(timeout)
          networkClient.off('auth:result', handler)
          resolve(data)
        }

        networkClient.on('auth:result', handler)
        networkClient.emit(event, { username, password })
      })

      if (result.success) {
        setAuth(result.user, result.token)
        navigate('/lobby')
      } else {
        setError(result.error === 'USERNAME_EXISTS' ? '用户名已存在' : '登录失败')
      }
    } catch (err) {
      setError('连接失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{
      background: 'var(--pixel-bg)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 20%, rgba(139, 69, 19, 0.1) 0%, transparent 40%),
          radial-gradient(circle at 80% 80%, rgba(220, 20, 60, 0.05) 0%, transparent 40%)
        `,
        pointerEvents: 'none',
      }} />

      {/* 像素网格背景 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(139, 69, 19, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(139, 69, 19, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      {/* 顶部装饰 */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        gap: 40,
        opacity: 0.4,
      }}>
        <span>⚔️</span>
        <span>🛡️</span>
        <span>💎</span>
        <span>🗝️</span>
        <span>🏆</span>
      </div>

      {/* Logo区域 */}
      <div style={{
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        animation: 'pixel-fade-in 0.5s ease-out',
      }}>
        <PixelDecoration icon="⚔️" color="rgba(255, 215, 0, 0.8)" />

        <h1 className="page-header-title" style={{ fontSize: 36 }}>
          地下城突袭
        </h1>

        <p style={{
          color: 'var(--pixel-brown)',
          fontSize: 14,
          marginTop: 8,
          fontFamily: 'Courier New, monospace',
          letterSpacing: 2,
        }}>
          DUNGEON RAID
        </p>
      </div>

      <DecorativeLine />

      {/* 登录卡片 */}
      <div
        className="card-pixel pixel-glow-gold"
        style={{
          width: 360,
          animation: 'pixel-fade-in 0.5s ease-out 0.2s both',
          position: 'relative',
        }}
      >
        {/* 卡片角落装饰 */}
        <div style={{
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          border: '2px solid var(--pixel-gold)',
          opacity: 0.3,
          pointerEvents: 'none',
        }} />

        <h2 style={{
          marginBottom: 20,
          textAlign: 'center',
          fontFamily: 'Courier New, monospace',
          color: 'var(--pixel-gold)',
          fontSize: 20,
          textTransform: 'uppercase',
          letterSpacing: 2,
        }}>
          {isRegister ? '[ ◆ 注册 ◆ ]' : '[ ◆ 登录 ◆ ]'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              color: 'var(--pixel-brown)',
              fontWeight: 'bold',
              fontSize: 12,
              textTransform: 'uppercase',
              fontFamily: 'Courier New, monospace',
            }}>
              ◆ 用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入你的冒险者名号"
              required
              minLength={3}
              maxLength={20}
              className="input-pixel"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 8,
              color: 'var(--pixel-brown)',
              fontWeight: 'bold',
              fontSize: 12,
              textTransform: 'uppercase',
              fontFamily: 'Courier New, monospace',
            }}>
              ◆ 密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入秘密密钥"
              required
              minLength={6}
              className="input-pixel"
            />
          </div>

          {error && (
            <div style={{
              color: 'var(--pixel-red)',
              marginBottom: 16,
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: 12,
              fontFamily: 'Courier New, monospace',
              animation: 'pixel-shake 0.3s ease-in-out',
              padding: '8px',
              border: '2px solid var(--pixel-red)',
              background: 'rgba(220, 20, 60, 0.1)',
            }}>
              ⚠ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-pixel pixel-glow-gold"
            style={{
              width: '100%',
              fontSize: 16,
              padding: '14px 24px',
              background: loading ? 'var(--pixel-brown)' : 'var(--pixel-gold)',
              color: 'var(--pixel-bg)',
            }}
          >
            {loading ? '>>> 处理中 <<<' : (isRegister ? '>>> 创建冒险者 <<<' : '>>> 进入冒险 <<<')}
          </button>
        </form>

        <DecorativeLine />

        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--pixel-gold)',
              fontFamily: 'Courier New, monospace',
              fontSize: 12,
              cursor: 'pointer',
              padding: '8px 16px',
              transition: 'all 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.textShadow = '0 0 10px rgba(255, 215, 0, 0.5)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.textShadow = 'none'
            }}
          >
            {isRegister ? '<<< 已有账号？登录 >>>' : '<<< 没有账号？注册 >>>'}
          </button>
        </div>
      </div>

      {/* 底部提示 */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        textAlign: 'center',
        color: 'var(--pixel-brown)',
        fontSize: 11,
        fontFamily: 'Courier New, monospace',
        opacity: 0.6,
      }}>
        多人联机 Roguelike 闯关游戏
      </div>

      {/* 底部装饰 */}
      <div style={{
        position: 'absolute',
        bottom: 50,
        display: 'flex',
        gap: 30,
        opacity: 0.3,
      }}>
        <span>🏰</span>
        <span>🐉</span>
        <span>💀</span>
        <span>👑</span>
        <span>🌟</span>
      </div>
    </div>
  )
}
