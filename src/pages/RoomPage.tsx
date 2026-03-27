import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useRoomStore } from '../store/useRoomStore'
import { networkClient } from '../network/socket'

const PLAYER_COLORS = {
  0: 'var(--player-1)',
  1: 'var(--player-2)',
  2: 'var(--player-3)',
  3: 'var(--player-4)'
}

const PLAYER_EMOJIS = {
  0: '🔵',
  1: '🟢',
  2: '🟠',
  3: '🟣'
}

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
    removePlayer,
    setPlayerReady,
    setGameStarted,
    clearRoom,
    setReady
  } = useRoomStore()
  const navigate = useNavigate()

  useEffect(() => {
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

    networkClient.on('room:join:push', handleJoinPush)
    networkClient.on('room:leave:push', handleLeavePush)
    networkClient.on('room:ready:push', handleReadyPush)
    networkClient.on('room:start:push', handleStartPush)
    networkClient.on('room:error', handleError)

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
    <div className="page" style={{ background: 'var(--pixel-bg)' }}>
      <div className="card-pixel" style={{ width: 500 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{
            color: 'var(--pixel-gold)',
            fontFamily: 'Courier New, monospace',
            textShadow: '2px 2px 0 rgba(0,0,0,0.5)'
          }}>
            [ {roomName || '房间'} ]
          </h2>
          <button onClick={handleLeave} className="btn-pixel btn-secondary">离开</button>
        </div>

        {/* Player List */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{
            marginBottom: 10,
            color: 'var(--pixel-brown)',
            fontFamily: 'Courier New, monospace',
            fontSize: 14
          }}>
            === 玩家列表 ===
          </h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {[0, 1, 2, 3].map((i) => {
              const player = players[i]
              const color = PLAYER_COLORS[i as keyof typeof PLAYER_COLORS]
              const emoji = PLAYER_EMOJIS[i as keyof typeof PLAYER_EMOJIS]
              const isLocalPlayer = player?.id === user?.id

              return (
                <div
                  key={i}
                  className="card-pixel"
                  style={{
                    padding: 12,
                    borderColor: player ? color : 'transparent',
                    borderWidth: player ? 3 : 0,
                    boxShadow: isLocalPlayer ? `0 0 15px ${color}` : undefined
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{player ? emoji : '❓'}</span>
                      <div>
                        <span style={{
                          color: player ? 'var(--text)' : '#555',
                          fontFamily: 'Courier New, monospace',
                          fontWeight: player ? 'bold' : 'normal'
                        }}>
                          {player?.name || '等待加入...'}
                        </span>
                        {player && player.id === hostId && (
                          <span style={{ marginLeft: 8, fontSize: 12 }}>👑</span>
                        )}
                      </div>
                    </div>
                    {player && (
                      <div style={{
                        padding: '3px 10px',
                        background: player.ready ? 'var(--success)' : '#555',
                        color: '#fff',
                        borderRadius: 0,
                        fontSize: 11,
                        fontFamily: 'Courier New, monospace',
                        border: '2px solid #fff',
                        textTransform: 'uppercase'
                      }}>
                        {player.ready ? '[ 已准备 ]' : '[ 未准备 ]'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={handleReady}
            className={`btn-pixel ${isReady ? 'btn-success' : ''}`}
            style={{ minWidth: 150 }}
          >
            {isReady ? '[ 取消准备 ]' : '[ 准备 ]'}
          </button>

          {isHost && (
            <button
              onClick={handleStart}
              disabled={!allReady}
              className="btn-pixel btn-success"
              style={{ minWidth: 150 }}
            >
              [ 开始游戏 ]
            </button>
          )}
        </div>

        {!isHost && !allReady && players.length > 1 && (
          <p style={{
            textAlign: 'center',
            marginTop: 10,
            color: 'var(--pixel-brown)',
            fontSize: 12,
            fontFamily: 'Courier New, monospace'
          }}>
            等待房主开始游戏...
          </p>
        )}
      </div>
    </div>
  )
}
