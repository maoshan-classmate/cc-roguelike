import { motion } from 'framer-motion'
import { PixelSword, PixelShield, PixelGem, PixelCrown, PixelStar } from '../PixelIcons'

const FONT_UI = '"Kenney Mini Square Mono", monospace'
const FONT_TITLE = '"Kenney Pixel", monospace'

const PLAYER_COLORS: Record<number, string> = {
  0: '#4A9EFF',
  1: '#51CF66',
  2: '#FFA500',
  3: '#9B59B6',
}

const CLASS_AVATARS: Record<string, string> = {
  warrior: 'PixelSword',
  ranger: 'PixelShield',
  mage: 'PixelStar',
  cleric: 'PixelGem',
}

const avatarComponents: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  PixelSword, PixelShield, PixelGem, PixelCrown, PixelStar,
}

interface PixelPlayerSlotProps {
  index: number
  player?: { name: string; ready: boolean; id: string; characterType?: string }
  isHost?: boolean
  isLocalPlayer?: boolean
  selectedClass?: string
}

export function PixelPlayerSlot({
  index, player, isHost = false, isLocalPlayer = false, selectedClass,
}: PixelPlayerSlotProps) {
  const color = PLAYER_COLORS[index] || '#FFD700'
  const avatarClass = isLocalPlayer ? (selectedClass || player?.characterType || 'warrior') : (player?.characterType || 'warrior')

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.5 + index * 0.08 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.5vw, 16px)',
        padding: player ? 'clamp(10px, 1.5vw, 14px)' : 'clamp(8px, 1vw, 12px)',
        background: player ? 'rgba(20,12,38,0.5)' : 'transparent',
        border: player ? `1.5px solid ${color}30` : `1px dashed rgba(255,215,0,0.1)`,
        borderRadius: 8,
        boxShadow: isLocalPlayer ? `0 0 16px ${color}20` : 'none',
        transition: 'all 0.2s', position: 'relative',
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 'clamp(40px, 6vw, 52px)', height: 'clamp(40px, 6vw, 52px)',
        borderRadius: 6, border: `2px solid ${player ? color : 'rgba(255,215,0,0.1)'}`,
        background: 'rgba(8,3,18,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: player ? `0 0 8px ${color}25` : 'none', position: 'relative',
      }}>
        {player && (
          <>
            {(() => {
              const AvatarComp = avatarComponents[CLASS_AVATARS[avatarClass]] || PixelSword
              return <AvatarComp size={32} color={color} />
            })()}
            {player.ready && (
              <div style={{
                position: 'absolute', top: -3, right: -3,
                width: 10, height: 10, borderRadius: '50%',
                background: '#50C878', border: '1.5px solid rgba(8,3,18,0.8)',
                boxShadow: '0 0 6px rgba(80,200,120,0.4)',
              }} />
            )}
          </>
        )}
        {!player && <span style={{ fontSize: 20, color: 'rgba(255,215,0,0.15)', fontWeight: 'bold' }}>?</span>}
      </div>

      {/* Player info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{
            color: player ? 'rgba(255,215,0,0.8)' : 'rgba(255,215,0,0.2)',
            fontFamily: FONT_TITLE, fontSize: 'clamp(12px, 1.5vw, 15px)', fontWeight: 'bold',
          }}>
            {player?.name || `玩家 ${index + 1}`}
          </span>
          {isHost && (
            <span style={{
              padding: '1px 6px', background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.25)',
              borderRadius: 3, color: '#FFD700', fontSize: 'clamp(8px, 0.9vw, 10px)', fontWeight: 'bold',
              fontFamily: FONT_UI, display: 'flex', alignItems: 'center', gap: 3, letterSpacing: 0.5,
            }}>
              <PixelCrown size={9} color="#DAA520" /> 房主
            </span>
          )}
          {isLocalPlayer && (
            <span style={{
              padding: '1px 6px', background: 'rgba(80,200,120,0.12)', border: '1px solid rgba(80,200,120,0.25)',
              borderRadius: 3, color: '#50C878', fontSize: 'clamp(8px, 0.9vw, 10px)', fontWeight: 'bold',
              fontFamily: FONT_UI, display: 'flex', alignItems: 'center', gap: 3, letterSpacing: 0.5,
            }}>
              <PixelStar size={8} color="#50C878" /> 你
            </span>
          )}
        </div>
        <div style={{
          fontSize: 'clamp(9px, 1vw, 11px)', color: 'rgba(255,215,0,0.25)',
          fontFamily: FONT_UI,
        }}>
          {player ? '冒险等级 1' : '等待加入...'}
        </div>
      </div>

      {/* Status badge */}
      {player && (
        <div style={{
          padding: 'clamp(4px, 0.6vw, 6px) clamp(8px, 1.2vw, 12px)',
          background: player.ready ? 'rgba(80,200,120,0.12)' : 'rgba(139,69,19,0.15)',
          border: `1px solid ${player.ready ? 'rgba(80,200,120,0.25)' : 'rgba(139,69,19,0.25)'}`,
          borderRadius: 4,
          color: player.ready ? '#50C878' : 'rgba(255,215,0,0.35)',
          fontSize: 'clamp(9px, 1vw, 11px)', fontWeight: 'bold', fontFamily: FONT_UI,
          boxShadow: player.ready ? '0 0 8px rgba(80,200,120,0.15)' : 'none',
          display: 'flex', alignItems: 'center', gap: 4, letterSpacing: 0.5,
        }}>
          {player.ready ? <PixelStar size={10} color="#50C878" /> : <PixelGem size={10} color="rgba(139,69,19,0.5)" />}
          {player.ready ? '已准备' : '未准备'}
        </div>
      )}

      {!player && (
        <div style={{ opacity: 0.15 }}>
          <PixelStar size={14} color="#FFD700" />
        </div>
      )}
    </motion.div>
  )
}

export default PixelPlayerSlot
