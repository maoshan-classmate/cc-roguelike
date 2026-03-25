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
    // Listen for room events FIRST (before emitting)
    const handleJoinPush = (data: any) => {
      if (data.room) {
        setRoom(roomId!, data.room, data.room.hostId === user?.id)
      }
    }

    const handleLeavePush = (data: any) => {
      removePlayer(data.playerId, data.newHostId)
    }

    const handleReadyPush = (data: any) => {
      setPlayerReady(data.playerId, data.ready)
    }

    const handleStartPush = (data: any) => {
      setGameStarted(true)
      navigate(`/game/${data.roomId}`)
    }

    const handleError = (data: any) => {
      alert(data.message)
      navigate('/lobby')
    }

    // Register listeners FIRST
    networkClient.on('room:join:push', handleJoinPush)
    networkClient.on('room:leave:push', handleLeavePush)
    networkClient.on('room:ready:push', handleReadyPush)
    networkClient.on('room:start:push', handleStartPush)
    networkClient.on('room:error', handleError)

    // THEN emit (after listeners are registered)
    if (networkClient.isConnected()) {
      networkClient.emit('room:join', { roomId })
    } else {
      networkClient.getSocket()?.once('connect', () => {
        networkClient.emit('room:join', { roomId })
      })
    }

    return () => {
      networkClient.off('room:join:push', handleJoinPush)
      networkClient.off('room:leave:push', handleLeavePush)
      networkClient.off('room:ready:push', handleReadyPush)
      networkClient.off('room:start:push', handleStartPush)
      networkClient.off('room:error', handleError)
      // Don't send room:leave here - it will be sent by handleLeave button
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
    // 同时更新 players 数组中自己的状态
    if (user?.id) {
      setPlayerReady(user.id, newReady)
    }
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
          {/* 所有玩家都需要准备 */}
          <button onClick={handleReady} style={{ minWidth: '150px' }}>
            {isReady ? '取消准备' : '准备'}
          </button>

          {/* 房主显示开始游戏按钮，需要所有人准备就绪 */}
          {isHost && (
            <button
              onClick={handleStart}
              disabled={!allReady}
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
