import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useLobbyStore } from '../store/useLobbyStore'
import { networkClient } from '../network/socket'

export default function LobbyPage() {
  const { user, logout } = useAuthStore()
  const { rooms, setRooms, addRoom, updateRoom, removeRoom } = useLobbyStore()
  const [showCreate, setShowCreate] = useState(false)
  const [roomName, setRoomName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!networkClient.isConnected()) {
      networkClient.connect()
    }

    const setup = () => {
      networkClient.emit('lobby:list')

      networkClient.on('lobby:list:result', (data: any) => {
        setRooms(data.rooms)
      })

      networkClient.on('room:create:result', (data: any) => {
        if (data.success) {
          navigate(`/room/${data.room.id}`)
        }
      })
    }

    if (networkClient.isConnected()) {
      setup()
    } else {
      networkClient.getSocket()?.once('connect', setup)
    }

    return () => {
      networkClient.off('lobby:list:result')
      networkClient.off('room:create:result')
    }
  }, [])

  const handleCreateRoom = () => {
    if (!roomName.trim()) return
    if (!networkClient.isConnected()) {
      alert('正在连接服务器，请稍后...')
      return
    }
    networkClient.emit('room:create', { name: roomName })
    setShowCreate(false)
    setRoomName('')
  }

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`)
  }

  const handleLogout = () => {
    networkClient.emit('auth:logout')
    networkClient.disconnect()
    logout()
    navigate('/login')
  }

  const handleRefresh = () => {
    networkClient.emit('lobby:list')
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: 20,
      background: 'var(--pixel-bg)'
    }}>
      {/* Header */}
      <header className="card-pixel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <span style={{ fontSize: 32, filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))' }}>⚔️</span>
          <div>
            <h1 style={{
              fontSize: 24,
              color: 'var(--pixel-gold)',
              fontFamily: 'Courier New, monospace',
              textShadow: '2px 2px 0 rgba(0,0,0,0.5)'
            }}>
              [ 大厅 ]
            </h1>
            <p style={{ color: 'var(--pixel-brown)', marginTop: 5, fontSize: 12 }}>
              欢迎, {user?.username} | {user?.character?.name || '无角色'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleRefresh} className="btn-pixel btn-secondary">🔄 刷新</button>
          <button onClick={() => setShowCreate(true)} className="btn-pixel">+ 创建</button>
          <button onClick={handleLogout} className="btn-pixel btn-danger">登出</button>
        </div>
      </header>

      {/* Create Room Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="card-pixel" style={{ width: 350 }}>
            <h3 style={{
              marginBottom: 20,
              color: 'var(--pixel-gold)',
              fontFamily: 'Courier New, monospace'
            }}>
              [ 创建房间 ]
            </h3>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="房间名称"
              className="input-pixel"
              style={{ marginBottom: 15 }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-pixel btn-secondary"
              >取消</button>
              <button onClick={handleCreateRoom} className="btn-pixel">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Room List */}
      <div className="card-pixel">
        <h2 style={{
          marginBottom: 20,
          color: 'var(--text)',
          fontFamily: 'Courier New, monospace'
        }}>
          房间列表
        </h2>

        {rooms.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: 'var(--pixel-brown)',
            fontFamily: 'Courier New, monospace'
          }}>
            <p style={{ fontSize: 24, marginBottom: 10 }}>🏰</p>
            <p>暂无房间，创建一个开始冒险吧！</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {rooms.map((room) => (
              <div
                key={room.id}
                className="card-pixel"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                  borderColor: room.status === 'waiting' ? 'var(--success)' : 'var(--warning)'
                }}
                onClick={() => handleJoinRoom(room.id)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translate(-2px, -2px)'
                  e.currentTarget.style.boxShadow = '8px 8px 0 rgba(0,0,0,0.5)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{
                      fontWeight: 'bold',
                      marginBottom: 5,
                      color: 'var(--text)',
                      fontFamily: 'Courier New, monospace'
                    }}>
                      {room.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--pixel-brown)' }}>
                      👑 {room.hostName} | 👥 {room.players.length}/{room.maxPlayers}
                    </div>
                  </div>
                  <div style={{
                    padding: '5px 15px',
                    background: room.status === 'waiting' ? 'var(--success)' : 'var(--warning)',
                    color: '#000',
                    borderRadius: 0,
                    fontSize: 12,
                    fontWeight: 'bold',
                    fontFamily: 'Courier New, monospace',
                    border: '2px solid #fff'
                  }}>
                    {room.status === 'waiting' ? '[ 等待中 ]' : '[ 游戏中 ]'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
