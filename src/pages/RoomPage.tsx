import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useRoomStore } from '../store/useRoomStore'
import { networkClient } from '../network/socket'

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user } = useAuthStore()
  const {
    roomName,
    players,
    hostId,
    isHost,
    isReady,
    gameStarted,
    setRoom,
    addPlayer,
    removePlayer,
    setPlayerReady,
    setGameStarted,
    clearRoom,
    setReady
  } = useRoomStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Join room
    networkClient.emit('room:join', { roomId })

    // Listen for room events
    networkClient.on('room:join:push', (data: any) => {
      if (data.room) {
        setRoom(roomId!, data.room, data.room.hostId === user?.id)
      }
    })

    networkClient.on('room:leave:push', (data: any) => {
      removePlayer(data.playerId, data.newHostId)
    })

    networkClient.on('room:ready:push', (data: any) => {
      setPlayerReady(data.playerId, data.ready)
    })

    networkClient.on('room:start:push', (data: any) => {
      setGameStarted(true)
      navigate(`/game/${data.roomId}`)
    })

    networkClient.on('room:error', (data: any) => {
      alert(data.message)
      navigate('/lobby')
    })

    return () => {
      networkClient.off('room:join:push')
      networkClient.off('room:leave:push')
      networkClient.off('room:ready:push')
      networkClient.off('room:start:push')
      networkClient.off('room:error')
      networkClient.emit('room:leave')
      clearRoom()
    }
  }, [roomId])

  const handleLeave = () => {
    networkClient.emit('room:leave')
    navigate('/lobby')
  }

  const handleReady = () => {
    const newReady = !isReady
    setReady(newReady)
    networkClient.emit('room:ready', { ready: newReady })
  }

  const handleStart = () => {
    networkClient.emit('room:start')
  }

  const allReady = players.length > 0 && players.every(p => p.ready)

  return (
    <div className="page">
      <div className="card" style={{ width: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>{roomName || '房间'}</h2>
          <button onClick={handleLeave} style={{ background: '#555' }}>离开房间</button>
        </div>

        {/* Player List */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '10px', color: '#888' }}>玩家列表</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {[0, 1, 2, 3].map((i) => {
              const player = players[i]
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: player ? 'var(--bg-darker)' : '#222',
                    borderRadius: '6px',
                    border: player?.id === user?.id ? '2px solid var(--primary)' : '2px solid transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>
                      {player ? (player.id === hostId ? '👑' : '🎮') : '❓'}
                    </span>
                    <span style={{ color: player ? 'var(--text)' : '#555' }}>
                      {player?.name || '等待加入...'}
                    </span>
                  </div>
                  {player && (
                    <span style={{
                      padding: '3px 10px',
                      background: player.ready ? 'var(--success)' : '#555',
                      borderRadius: '4px',
                      fontSize: '12px'
                    }}>
                      {player.ready ? '已准备' : '未准备'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {!isHost ? (
            <button onClick={handleReady} style={{ minWidth: '150px' }}>
              {isReady ? '取消准备' : '准备'}
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!allReady && players.length > 0}
              style={{ minWidth: '150px', background: 'var(--success)' }}
            >
              开始游戏
            </button>
          )}
        </div>

        {!isHost && !allReady && players.length > 1 && (
          <p style={{ textAlign: 'center', marginTop: '10px', color: '#888', fontSize: '12px' }}>
            等待房主开始游戏...
          </p>
        )}
      </div>
    </div>
  )
}
