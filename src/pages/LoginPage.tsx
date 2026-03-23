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
      networkClient.connect()

      const event = isRegister ? 'auth:register' : 'auth:login'

      // Use promise-based approach
      const result = await new Promise<any>((resolve) => {
        networkClient.emit(event, { username, password })

        const timeout = setTimeout(() => {
          networkClient.off(event)
          resolve({ success: false, error: 'Timeout' })
        }, 5000)

        networkClient.on(event, (data: any) => {
          clearTimeout(timeout)
          networkClient.off(event)
          resolve(data)
        })
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
    <div className="page">
      <h1 className="page-title">⚔️ Roguelike ⚔️</h1>

      <div className="card" style={{ width: '320px' }}>
        <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>
          {isRegister ? '注册账号' : '登录'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#888' }}>
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
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', color: '#888' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{ color: 'var(--danger)', marginBottom: '15px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>

        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{ background: 'transparent', color: 'var(--primary)' }}
          >
            {isRegister ? '已有账号？登录' : '没有账号？注册'}
          </button>
        </div>
      </div>
    </div>
  )
}
