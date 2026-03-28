import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useLobbyStore } from '../store/useLobbyStore'
import { networkClient } from '../network/socket'
import { PixelCastle, PixelDragon, PixelCrown, PixelGem, PixelKey, PixelSword, PixelShield, PixelStar, PixelSkull } from '../components/PixelIcons'

// 玩家槽位组件
function PlayerSlot({ index, username }: { index: number; username?: string }) {
  const colors = ['var(--player-1)', 'var(--player-2)', 'var(--player-3)', 'var(--player-4)']
  const color = colors[index] || colors[0]
  const playerIcons = [<PixelSword key="s" size={28} />, <PixelShield key="s" size={28} />, <PixelGem key="g" size={28} />, <PixelCrown key="c" size={28} />]
  const playerIconsEmpty = [<span key="?" style={{ opacity: 0.3 }}>?</span>]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
    }}>
      <div style={{
        width: 56,
        height: 56,
        border: `3px solid ${color}`,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: username ? 'var(--pixel-bg)' : 'transparent',
        boxShadow: username ? `0 0 15px ${color}40, inset 0 0 10px ${color}20` : 'none',
        transition: 'all 0.2s',
      }}>
        {username ? playerIcons[index] : playerIconsEmpty}
      </div>
      <span style={{
        fontSize: 10,
        color: username ? color : 'var(--pixel-brown)',
        fontFamily: 'Courier New, monospace',
        opacity: username ? 1 : 0.5,
      }}>
        {username || `玩家 ${index + 1}`}
      </span>
    </div>
  )
}

// 房间卡片组件
function RoomCard({
  room,
  onJoin
}: {
  room: any
  onJoin: (id: string) => void
}) {
  const isWaiting = room.status === 'waiting'

  return (
    <div
      className="room-card pixel-glow-gold"
      onClick={() => onJoin(room.id)}
      style={{ animation: 'pixel-fade-in 0.3s ease-out' }}
    >
      <div style={{ paddingLeft: 12 }}>
        <div style={{
          fontWeight: 'bold',
          marginBottom: 6,
          color: 'var(--pixel-gold)',
          fontFamily: 'Courier New, monospace',
          fontSize: 15,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <PixelCastle size={16} color="#8B4513" /> {room.name}
        </div>
        <div style={{
          fontSize: 12,
          color: 'var(--pixel-brown)',
          fontFamily: 'Courier New, monospace',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <PixelCrown size={12} color="#FFD700" /> {room.hostName}
        </div>
      </div>

      {/* 玩家预览 */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginRight: 16,
      }}>
        {Array.from({ length: room.maxPlayers }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: i < room.players.length
                ? (['var(--player-1)', 'var(--player-2)', 'var(--player-3)', 'var(--player-4)'][i])
                : 'var(--pixel-bg-dark)',
              border: '1px solid var(--pixel-brown)',
            }}
          />
        ))}
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 6,
      }}>
        <div style={{
          padding: '4px 10px',
          fontSize: 11,
          fontWeight: 'bold',
          fontFamily: 'Courier New, monospace',
          background: isWaiting ? 'var(--pixel-green)' : 'var(--pixel-red)',
          color: isWaiting ? 'var(--pixel-bg)' : 'white',
        }}>
          {isWaiting ? '[ 等待中 ]' : '[ 游戏中 ]'}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--pixel-brown)',
          fontFamily: 'Courier New, monospace',
        }}>
          ⚔ {room.players.length}/{room.maxPlayers}
        </div>
      </div>
    </div>
  )
}

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
        console.log('[DEBUG] room:create:result received:', data)
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

    // Listen for errors
    networkClient.on('room:error', (data: any) => {
      console.log('[DEBUG] room:error received:', data)
    })

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
    console.log('[DEBUG] Emitting room:create with name:', roomName)
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
      background: 'var(--pixel-bg)',
      position: 'relative',
    }}>
      {/* 背景网格 */}
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

      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        padding: '16px 24px',
        background: 'var(--pixel-bg)',
        border: '4px solid var(--pixel-brown)',
        boxShadow: '6px 6px 0 rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            filter: 'drop-shadow(0 0 15px rgba(255, 215, 0, 0.6))',
          }}>
            <PixelSword size={36} color="#FFD700" />
          </div>
          <div>
            <h1 style={{
              fontSize: 24,
              color: 'var(--pixel-gold)',
              fontFamily: 'Courier New, monospace',
              textShadow: '3px 3px 0 rgba(0,0,0,0.8)',
              letterSpacing: 2,
            }}>
              [ ◆ 大厅 ◆ ]
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginTop: 6,
            }}>
              <span style={{
                color: 'var(--pixel-brown)',
                fontSize: 12,
                fontFamily: 'Courier New, monospace',
              }}>
                欢迎, {user?.username}
              </span>
              <span style={{ color: 'var(--pixel-brown)' }}>|</span>
              <span style={{
                color: 'var(--player-1)',
                fontSize: 12,
                fontFamily: 'Courier New, monospace',
              }}>
                {user?.character?.name || '无角色'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleRefresh}
            className="btn-pixel"
            style={{ background: 'var(--pixel-brown)', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <PixelStar size={14} color="#FFD700" /> 刷新
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-pixel pixel-glow-gold"
          >
            + 创建房间
          </button>
          <button
            onClick={handleLogout}
            className="btn-pixel"
            style={{ background: 'var(--pixel-red)' }}
          >
            登出
          </button>
        </div>
      </header>

      {/* 装饰线 */}
      <div style={{
        height: 4,
        background: 'linear-gradient(90deg, transparent, var(--pixel-brown), var(--pixel-gold), var(--pixel-brown), transparent)',
        marginBottom: 24,
      }} />

      {/* 房间列表 */}
      <div style={{
        background: 'var(--pixel-bg)',
        border: '4px solid var(--pixel-brown)',
        padding: 20,
        boxShadow: '6px 6px 0 rgba(0,0,0,0.5)',
      }}>
        <h2 style={{
          marginBottom: 20,
          color: 'var(--pixel-gold)',
          fontFamily: 'Courier New, monospace',
          fontSize: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <PixelCastle size={20} color="#8B4513" /> 房间列表
          <span style={{
            fontSize: 12,
            color: 'var(--pixel-brown)',
            fontWeight: 'normal',
          }}>
            ({rooms.length})
          </span>
        </h2>

        {rooms.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 60,
            color: 'var(--pixel-brown)',
            fontFamily: 'Courier New, monospace',
          }}>
            <div style={{ marginBottom: 16, opacity: 0.5, display: 'flex', justifyContent: 'center' }}>
              <PixelCastle size={64} color="#8B4513" />
            </div>
            <p style={{ fontSize: 16, marginBottom: 8 }}>暂无房间</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>
              创建一个房间开始冒险吧！
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onJoin={handleJoinRoom}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部装饰 */}
      <div style={{
        marginTop: 30,
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        opacity: 0.4,
      }}>
        <PixelDragon size={24} color="#DC143C" />
        <PixelSkull size={24} color="#FFFFFF" />
        <PixelCrown size={24} color="#FFD700" />
        <PixelGem size={24} color="#4A9EFF" />
        <PixelKey size={24} color="#FFD700" />
      </div>

      {/* 创建房间弹窗 */}
      {showCreate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div
            className="card-pixel pixel-glow-gold"
            style={{
              width: 400,
              animation: 'pixel-fade-in 0.2s ease-out',
            }}
          >
            <h3 style={{
              marginBottom: 20,
              color: 'var(--pixel-gold)',
              fontFamily: 'Courier New, monospace',
              fontSize: 18,
              textAlign: 'center',
            }}>
              [ ◆ 创建房间 ◆ ]
            </h3>

            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                marginBottom: 8,
                color: 'var(--pixel-brown)',
                fontSize: 12,
                fontFamily: 'Courier New, monospace',
                textTransform: 'uppercase',
              }}>
                房间名称
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="给你的房间起个名字"
                className="input-pixel"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-pixel"
                style={{ background: 'var(--pixel-brown)' }}
              >
                取消
              </button>
              <button
                onClick={handleCreateRoom}
                className="btn-pixel pixel-glow-gold"
              >
                创建房间
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
