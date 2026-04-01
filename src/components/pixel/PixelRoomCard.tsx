import React from 'react'
import { PixelCastle, PixelCrown, PixelSword } from '../PixelIcons'

interface PixelRoomCardProps {
  room: {
    id: string
    name: string
    hostName: string
    status: 'waiting' | 'playing' | 'ended'
    players: any[]
    maxPlayers: number
  }
  onJoin: (id: string) => void
}

export function PixelRoomCard({ room, onJoin }: PixelRoomCardProps) {
  const isWaiting = room.status === 'waiting'
  const isEnded = room.status === 'ended'

  return (
    <div
      className="room-card pixel-glow-gold"
      onClick={() => onJoin(room.id)}
      style={{ animation: 'pixel-fade-in 0.3s ease-out' }}
    >
      <div style={{ paddingLeft: 12 }}>
        <div
          style={{
            fontWeight: 'bold',
            marginBottom: 6,
            color: 'var(--pixel-gold)',
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <PixelCastle size={16} color="#8B4513" /> {room.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--pixel-brown)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <PixelCrown size={12} color="#FFD700" /> {room.hostName}
        </div>
      </div>

      {/* Player preview */}
      <div style={{ display: 'flex', gap: 4, marginRight: 16 }}>
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

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div
          style={{
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 'bold',
            background: isWaiting ? 'var(--pixel-green)' : isEnded ? 'var(--pixel-brown)' : 'var(--pixel-red)',
            color: isWaiting || isEnded ? 'var(--pixel-bg)' : 'white',
          }}
        >
          {isWaiting ? '等待中' : isEnded ? '已结束' : '游戏中'}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--pixel-brown)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <PixelSword size={10} color="#C0C0C0" /> {room.players.length}/{room.maxPlayers}
        </div>
      </div>
    </div>
  )
}

export default PixelRoomCard
