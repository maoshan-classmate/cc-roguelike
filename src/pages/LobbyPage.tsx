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
    // Connect to server
    networkClient.connect()

    // Request room list
    networkClient.emit('lobby:list')

    // Listen for room updates
    networkClient.on('lobby:list:result', (data: any) => {
      setRooms(data.rooms)
    })

    networkClient.on('room:create:result', (data: any) => {
      if (data.success) {
        navigate(`/room/${data.room.id}`)
      }
    })

    return () => {
      networkClient.off('lobby:list:result')
      networkClient.off('room:create:result')
    }
  }, [])

  const handleCreateRoom = () => {
    if (!roomName.trim()) return
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
    <div style={{ minHeight: '100vh', padding: '20px' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        padding: '15px 20px',
        background: 'var(--bg-card)',
        borderRadius: '8px'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', color: 'var(--primary)' }}>⚔️ 大厅</h1>
          <p style={{ color: '#888', marginTop: '5px' }}>
            欢迎, {user?.username} | {user?.character?.name || '无角色'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleRefresh}>刷新房间</button>
          <button onClick={() => setShowCreate(true)}>创建房间</button>
          <button onClick={handleLogout} style={{ background: 'var(--danger)' }}>登出</button>
        </div>
      </header>

      {/* Create Room Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="card" style={{ width: '350px' }}>
            <h3 style={{ marginBottom: '20px' }}>创建房间</h3>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="房间名称"
              style={{ marginBottom: '15px' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{ background: '#555' }}
              >取消</button>
              <button onClick={handleCreateRoom}>创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Room List */}
      <div className="card">
        <h2 style={{ marginBottom: '20px' }}>房间列表</h2>

        {rooms.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
            暂无房间，创建一个开始游戏吧！
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '10px' }}>
            {rooms.map((room) => (
              <div
                key={room.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  background: 'var(--bg-darker)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onClick={() => handleJoinRoom(room.id)}
              >
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {room.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#888' }}>
                    房主: {room.hostName} | {room.players.length}/{room.maxPlayers} 人
                  </div>
                </div>
                <div style={{
                  padding: '5px 15px',
                  background: room.status === 'waiting' ? 'var(--success)' : 'var(--warning)',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  {room.status === 'waiting' ? '等待中' : '游戏中'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
