import { motion } from 'framer-motion'
import { PixelCastle, PixelCrown, PixelSword } from '../PixelIcons'

const FONT_UI = '"Kenney Mini Square Mono", monospace'

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
  index?: number
}

export function PixelRoomCard({ room, onJoin, index = 0 }: PixelRoomCardProps) {
  const isWaiting = room.status === 'waiting'
  const isEnded = room.status === 'ended'

  const statusColors = isWaiting
    ? { bg: 'rgba(80,200,120,0.15)', border: 'rgba(80,200,120,0.4)', text: '#50C878' }
    : isEnded
      ? { bg: 'rgba(139,69,19,0.15)', border: 'rgba(139,69,19,0.3)', text: '#8B6914' }
      : { bg: 'rgba(255,68,68,0.12)', border: 'rgba(255,68,68,0.3)', text: '#FF6666' }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.6 + index * 0.08 }}
      whileHover={{
        scale: 1.015,
        boxShadow: '0 4px 24px rgba(255,215,0,0.1), 0 0 40px rgba(255,215,0,0.04)',
        borderColor: 'rgba(255,215,0,0.35)',
      }}
      whileTap={{ scale: 0.98 }}
      onClick={() => isWaiting && onJoin(room.id)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'clamp(12px, 2vw, 18px) clamp(14px, 2vw, 20px)',
        background: 'linear-gradient(135deg, rgba(20,12,38,0.7) 0%, rgba(15,8,28,0.65) 100%)',
        border: '1.5px solid rgba(255,215,0,0.12)', borderRadius: 10,
        cursor: isWaiting ? 'pointer' : 'default',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.3s ease',
      }}
    >
      {/* Top edge accent */}
      <div style={{
        position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.15), transparent)',
      }} />

      {/* Room info */}
      <div style={{ paddingLeft: 4, flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 'bold', marginBottom: 4, color: '#FFD700',
          fontSize: 'clamp(12px, 1.6vw, 15px)', fontFamily: FONT_UI,
          display: 'flex', alignItems: 'center', gap: 8, letterSpacing: 0.5,
        }}>
          <PixelCastle size={14} color="#DAA520" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.name}</span>
        </div>
        <div style={{
          fontSize: 'clamp(10px, 1.2vw, 12px)', color: 'rgba(255,215,0,0.4)',
          fontFamily: FONT_UI, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <PixelCrown size={10} color="#B8860B" /> {room.hostName}
        </div>
      </div>

      {/* Player dots */}
      <div style={{ display: 'flex', gap: 4, margin: '0 clamp(8px, 1.5vw, 16px)' }}>
        {Array.from({ length: room.maxPlayers }).map((_, i) => (
          <div key={i} style={{
            width: 7, height: 7, borderRadius: 2,
            background: i < room.players.length
              ? (['#4A9EFF', '#51CF66', '#FFA500', '#9B59B6'][i])
              : 'rgba(255,215,0,0.08)',
            border: `1px solid ${i < room.players.length ? 'rgba(255,255,255,0.15)' : 'rgba(255,215,0,0.1)'}`,
          }} />
        ))}
      </div>

      {/* Status + count */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
        <div style={{
          padding: '3px 8px', fontSize: 'clamp(9px, 1.1vw, 11px)', fontWeight: 'bold', fontFamily: FONT_UI, letterSpacing: 0.5,
          background: statusColors.bg, border: `1px solid ${statusColors.border}`, borderRadius: 4,
          color: statusColors.text,
        }}>
          {isWaiting ? '等待中' : isEnded ? '已结束' : '游戏中'}
        </div>
        <div style={{
          fontSize: 'clamp(9px, 1.1vw, 11px)', color: 'rgba(255,215,0,0.35)',
          fontFamily: FONT_UI, display: 'flex', alignItems: 'center', gap: 3,
        }}>
          <PixelSword size={9} color="rgba(192,192,192,0.5)" /> {room.players.length}/{room.maxPlayers}
        </div>
      </div>
    </motion.div>
  )
}

export default PixelRoomCard
