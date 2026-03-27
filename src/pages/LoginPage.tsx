import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { networkClient } from '../network/socket'

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
    <div className="page" style={{ background: 'var(--pixel-bg)' }}>
      {/* Logo */}
      <div style={{
        width: 64,
        height: 64,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
        filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))'
      }}>
        ⚔️
      </div>

      <h1 className="page-title" style={{
        fontFamily: 'Courier New, monospace',
        textShadow: '4px 4px 0 rgba(0,0,0,0.5), 0 0 20px rgba(74, 158, 255, 0.5)'
      }}>
        ROGUELIKE
      </h1>

      <div className="card-pixel" style={{ width: 320 }}>
        <h2 style={{
          marginBottom: 20,
          textAlign: 'center',
          fontFamily: 'Courier New, monospace',
          color: 'var(--pixel-gold)'
        }}>
          {isRegister ? '[ 注册 ]' : '[ 登录 ]'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <label style={{
              display: 'block',
              marginBottom: 5,
              color: 'var(--pixel-brown)',
              fontWeight: 'bold',
              fontSize: 12,
              textTransform: 'uppercase'
            }}>
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              required
              minLength={3}
              maxLength={20}
              className="input-pixel"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 5,
              color: 'var(--pixel-brown)',
              fontWeight: 'bold',
              fontSize: 12,
              textTransform: 'uppercase'
            }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              minLength={6}
              className="input-pixel"
            />
          </div>

          {error && (
            <div style={{
              color: 'var(--danger)',
              marginBottom: 15,
              textAlign: 'center',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: 12
            }}>
              ! {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-pixel" style={{ width: '100%' }}>
            {loading ? '>>> 处理中 <<<' : (isRegister ? '>>> 注册 <<<' : '>>> 登录 <<<')}
          </button>
        </form>

        <div style={{ marginTop: 15, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="btn-pixel btn-secondary"
            style={{ background: 'transparent', color: 'var(--pixel-gold)' }}
          >
            {isRegister ? '>>> 已有账号？登录 <<<' : '>>> 没有账号？注册 <<<'}
          </button>
        </div>
      </div>
    </div>
  )
}
