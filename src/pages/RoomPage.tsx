import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useRoomStore } from '../store/useRoomStore'
import { networkClient } from '../network/socket'
import {
  PixelSword, PixelShield, PixelGem, PixelCrown, PixelStar, PixelSkull, PixelDragon,
  PixelAvatarWarrior, PixelAvatarRanger, PixelAvatarMage, PixelAvatarHealer
} from '../components/PixelIcons'

const PLAYER_COLORS = {
  0: 'var(--player-1)',
  1: 'var(--player-2)',
  2: 'var(--player-3)',
  3: 'var(--player-4)'
}

const PLAYER_AVATARS = [PixelAvatarWarrior, PixelAvatarRanger, PixelAvatarMage, PixelAvatarHealer]

const CHARACTER_CLASSES = [
  { id: 'warrior', name: '战士', icon: PixelSword, color: '#4A9EFF', desc: '近战，高防御' },
  { id: 'ranger', name: '游侠', icon: PixelShield, color: '#51CF66', desc: '远程，高速度' },
  { id: 'mage', name: '法师', icon: PixelStar, color: '#FFA500', desc: '魔法，高攻击' },
  { id: 'healer', name: '牧师', icon: PixelGem, color: '#9B59B6', desc: '治疗，辅助' },
]

// 玩家槽位组件
function PlayerSlot({
  index,
  player,
  isHost,
  isLocalPlayer,
}: {
  index: number
  player: any
  isHost: string
  isLocalPlayer: boolean
}) {
  const color = PLAYER_COLORS[index as keyof typeof PLAYER_COLORS]
  const isReady = player?.ready
  const AvatarComponent = PLAYER_AVATARS[index]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: player ? 'var(--pixel-bg)' : 'transparent',
        border: player ? `4px solid ${color}` : '2px dashed var(--pixel-brown)',
        boxShadow: isLocalPlayer ? `0 0 20px ${color}50, inset 0 0 15px ${color}20` : 'none',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      {/* 玩家像素头像 */}
      {player && AvatarComponent && (
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 4,
          border: `3px solid ${color}`,
          background: 'var(--pixel-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 10px ${color}40`,
          position: 'relative',
        }}>
          <AvatarComponent size={48} color={color} />
          {isReady && (
            <div style={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: 'var(--pixel-green)',
              border: '2px solid var(--pixel-bg)',
            }} />
          )}
        </div>
      )}
      {!player && (
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 4,
          border: `2px dashed var(--pixel-brown)`,
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.4,
        }}>
          <span style={{ fontSize: 24, color: 'var(--pixel-brown)', fontWeight: 'bold' }}>?</span>
        </div>
      )}

      {/* 玩家信息 */}
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 4,
        }}>
          <span style={{
            color: player ? 'var(--pixel-white)' : 'var(--pixel-brown)',
            fontFamily: 'Courier New, monospace',
            fontSize: 16,
            fontWeight: 'bold',
            opacity: player ? 1 : 0.5,
          }}>
            {player?.name || `玩家 ${index + 1}`}
          </span>
          {player?.id === isHost && (
            <span style={{
              padding: '2px 8px',
              background: 'var(--pixel-gold)',
              color: 'var(--pixel-bg)',
              fontSize: 10,
              fontWeight: 'bold',
              fontFamily: 'Courier New, monospace',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <PixelCrown size={12} color="#8B4513" /> 房主
            </span>
          )}
          {isLocalPlayer && (
            <span style={{
              padding: '2px 8px',
              background: 'var(--pixel-green)',
              color: 'var(--pixel-bg)',
              fontSize: 10,
              fontWeight: 'bold',
              fontFamily: 'Courier New, monospace',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}>
              <PixelStar size={10} color="#8B4513" /> 你
            </span>
          )}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--pixel-brown)',
          fontFamily: 'Courier New, monospace',
          opacity: player ? 0.7 : 0.5,
        }}>
          {player ? '冒险等级 1' : '等待加入...'}
        </div>
      </div>

      {/* 状态 */}
      {player && (
        <div style={{
          padding: '6px 14px',
          background: isReady ? 'var(--pixel-green)' : 'var(--pixel-brown)',
          color: isReady ? 'var(--pixel-bg)' : 'var(--pixel-white)',
          fontSize: 12,
          fontWeight: 'bold',
          fontFamily: 'Courier New, monospace',
          boxShadow: isReady ? `0 0 10px var(--pixel-green)` : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          {isReady ? (
            <PixelStar size={14} color="#8B4513" />
          ) : (
            <PixelGem size={14} color="#666" />
          )}
          {isReady ? '已准备' : '未准备'}
        </div>
      )}

      {/* 空槽位标记 */}
      {!player && (
        <div style={{
          fontSize: 24,
          color: 'var(--pixel-brown)',
          opacity: 0.3,
        }}>
          <PixelStar size={16} color="var(--pixel-brown)" />
        </div>
      )}
    </div>
  )
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
  const [selectedClass, setSelectedClass] = useState<string>('warrior')

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
      // 直接跳转回大厅，错误信息显示在大厅页面
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

  const handleSelectClass = (classId: string) => {
    setSelectedClass(classId)
    networkClient.emit('room:selectClass', { characterType: classId })
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
    <div style={{
      minHeight: '100vh',
      padding: 20,
      background: 'var(--pixel-bg)',
      position: 'relative',
      overflowY: 'auto',
    }}>
      {/* 背景装饰 */}
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

      <div style={{
        maxWidth: 600,
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <h1 style={{
            fontSize: 28,
            color: 'var(--pixel-gold)',
            fontFamily: 'Courier New, monospace',
            textShadow: '4px 4px 0 rgba(0,0,0,0.8)',
            letterSpacing: 2,
          }}>
            {roomName || '房间'}
          </h1>
          <button
            onClick={handleLeave}
            className="btn-pixel"
            style={{ background: 'var(--pixel-red)' }}
          >
            ← 离开房间
          </button>
        </div>

        {/* 装饰线 */}
        <div style={{
          height: 4,
          background: 'linear-gradient(90deg, transparent, var(--pixel-brown), var(--pixel-gold), var(--pixel-brown), transparent)',
          marginBottom: 24,
        }} />

        {/* 玩家列表卡片 */}
        <div style={{
          background: 'var(--pixel-bg)',
          border: '4px solid var(--pixel-brown)',
          padding: 20,
          boxShadow: '6px 6px 0 rgba(0,0,0,0.5)',
          marginBottom: 24,
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
            <PixelSword size={20} color="#FFD700" /> 冒险者列表
            <span style={{
              fontSize: 12,
              color: 'var(--pixel-brown)',
              fontWeight: 'normal',
            }}>
              ({players.length}/4)
            </span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2, 3].map((i) => {
              const player = players[i]
              const isLocalPlayer = player?.id === user?.id

              return (
                <PlayerSlot
                  key={i}
                  index={i}
                  player={player}
                  isHost={hostId || ''}
                  isLocalPlayer={isLocalPlayer}
                />
              )
            })}
          </div>
        </div>

        {/* 职业选择 */}
        <div style={{
          background: 'var(--pixel-bg)',
          border: '4px solid var(--pixel-brown)',
          padding: 20,
          boxShadow: '6px 6px 0 rgba(0,0,0,0.5)',
          marginBottom: 24,
        }}>
          <h2 style={{
            marginBottom: 16,
            color: 'var(--pixel-gold)',
            fontFamily: 'Courier New, monospace',
            fontSize: 18,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <PixelCrown size={20} color="#FFD700" /> 选择职业
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}>
            {CHARACTER_CLASSES.map((cls) => {
              const isSelected = selectedClass === cls.id
              const IconComponent = cls.icon
              return (
                <button
                  key={cls.id}
                  onClick={() => handleSelectClass(cls.id)}
                  style={{
                    background: isSelected ? `${cls.color}20` : 'var(--pixel-bg)',
                    border: isSelected ? `3px solid ${cls.color}` : '3px solid var(--pixel-brown)',
                    padding: '12px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: isSelected ? `0 0 12px ${cls.color}40` : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <IconComponent size={28} color={isSelected ? cls.color : '#8B4513'} />
                  <span style={{
                    fontFamily: 'Courier New, monospace',
                    fontSize: 13,
                    fontWeight: 'bold',
                    color: isSelected ? cls.color : 'var(--pixel-brown)',
                  }}>
                    {cls.name}
                  </span>
                  <span style={{
                    fontFamily: 'Courier New, monospace',
                    fontSize: 10,
                    color: 'var(--pixel-brown)',
                    opacity: 0.7,
                  }}>
                    {cls.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 操作按钮 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignItems: 'center',
        }}>
          <div style={{
            display: 'flex',
            gap: 16,
            justifyContent: 'center',
          }}>
            <button
              onClick={handleReady}
              className={`btn-pixel pixel-glow-${isReady ? 'green' : 'gold'}`}
              style={{
                minWidth: 180,
                padding: '14px 28px',
                fontSize: 16,
                background: isReady ? 'var(--pixel-green)' : 'var(--pixel-brown)',
              }}
            >
              {isReady ? '[ 取消准备 ]' : '[ 点击准备 ]'}
            </button>

            {isHost && (
              <button
                onClick={handleStart}
                disabled={!allReady}
                className="btn-pixel pixel-glow-gold"
                style={{
                  minWidth: 180,
                  padding: '14px 28px',
                  fontSize: 16,
                  background: allReady ? 'var(--pixel-gold)' : 'var(--pixel-dark)',
                  cursor: allReady ? 'pointer' : 'not-allowed',
                }}
              >
                [ 开始冒险 ]
              </button>
            )}
          </div>

          {/* 状态提示 */}
          {!isHost && !allReady && players.length > 1 && (
            <div style={{
              padding: '10px 20px',
              background: 'rgba(139, 69, 19, 0.1)',
              border: '2px solid var(--pixel-brown)',
              color: 'var(--pixel-brown)',
              fontSize: 12,
              fontFamily: 'Courier New, monospace',
              textAlign: 'center',
            }}>
              等待房主开始游戏...
            </div>
          )}

          {allReady && !isHost && (
            <div style={{
              padding: '10px 20px',
              background: 'rgba(50, 205, 50, 0.1)',
              border: '2px solid var(--pixel-green)',
              color: 'var(--pixel-green)',
              fontSize: 12,
              fontFamily: 'Courier New, monospace',
              animation: 'pixel-flash 1s ease-in-out infinite',
            }}>
              所有玩家已准备！等待开始...
            </div>
          )}

          {!allReady && players.length > 1 && isHost && (
            <div style={{
              padding: '10px 20px',
              background: 'rgba(139, 69, 19, 0.1)',
              border: '2px solid var(--pixel-brown)',
              color: 'var(--pixel-brown)',
              fontSize: 12,
              fontFamily: 'Courier New, monospace',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <PixelStar size={16} color="#8B4513" />
              提示：所有玩家准备后即可开始游戏
            </div>
          )}
        </div>

        {/* 底部装饰 */}
        <div style={{
          marginTop: 40,
          display: 'flex',
          justifyContent: 'center',
          gap: 20,
          opacity: 0.3,
        }}>
          <PixelDragon size={24} color="#DC143C" />
          <PixelSkull size={24} color="#FFFFFF" />
          <PixelCrown size={24} color="#FFD700" />
        </div>
      </div>
    </div>
  )
}
