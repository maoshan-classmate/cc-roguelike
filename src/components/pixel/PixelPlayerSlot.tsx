import React from 'react'
import { PixelSword, PixelShield, PixelGem, PixelCrown, PixelStar } from '../PixelIcons'

const PLAYER_COLORS = {
  0: 'var(--player-1)',
  1: 'var(--player-2)',
  2: 'var(--player-3)',
  3: 'var(--player-4)',
}

const CLASS_AVATARS: Record<string, string> = {
  warrior: 'PixelSword',
  ranger: 'PixelShield',
  mage: 'PixelStar',
  cleric: 'PixelGem',
}

interface PixelPlayerSlotProps {
  index: number
  player?: { name: string; ready: boolean; id: string; characterType?: string }
  isHost?: boolean
  isLocalPlayer?: boolean
}

const avatarComponents: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  PixelSword,
  PixelShield,
  PixelGem,
  PixelCrown,
}

export function PixelPlayerSlot({
  index,
  player,
  isHost = false,
  isLocalPlayer = false,
}: PixelPlayerSlotProps) {
  const color = PLAYER_COLORS[index as keyof typeof PLAYER_COLORS]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: player ? 'var(--pixel-bg)' : 'transparent',
        border: player ? `4px solid ${color}` : '2px dashed var(--pixel-brown)',
        boxShadow: isLocalPlayer ? `0 0 20px ${color}50` : 'none',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      {/* Avatar placeholder */}
      <div
        style={{
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
        }}
      >
        {player && (
          <>
            {React.createElement(avatarComponents[CLASS_AVATARS[player.characterType || 'warrior']] || PixelSword, { size: 48, color })}
            {player.ready && (
              <div
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'var(--pixel-green)',
                  border: '2px solid var(--pixel-bg)',
                }}
              />
            )}
          </>
        )}
        {!player && (
          <span style={{ fontSize: 24, color: 'var(--pixel-brown)', fontWeight: 'bold' }}>?</span>
        )}
      </div>

      {/* Player info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              color: player ? 'var(--pixel-white)' : 'var(--pixel-brown)',
              fontFamily: 'Courier New, monospace',
              fontSize: 16,
              fontWeight: 'bold',
              opacity: player ? 1 : 0.5,
            }}
          >
            {player?.name || `玩家 ${index + 1}`}
          </span>
          {isHost && (
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--pixel-gold)',
                color: 'var(--pixel-bg)',
                fontSize: 10,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <PixelCrown size={12} color="#8B4513" /> 房主
            </span>
          )}
          {isLocalPlayer && (
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--pixel-green)',
                color: 'var(--pixel-bg)',
                fontSize: 10,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <PixelStar size={10} color="#8B4513" /> 你
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--pixel-brown)',
            fontFamily: 'Courier New, monospace',
            opacity: player ? 0.7 : 0.5,
          }}
        >
          {player ? '冒险等级 1' : '等待加入...'}
        </div>
      </div>

      {/* Status badge */}
      {player && (
        <div
          style={{
            padding: '6px 14px',
            background: player.ready ? 'var(--pixel-green)' : 'var(--pixel-brown)',
            color: player.ready ? 'var(--pixel-bg)' : 'var(--pixel-white)',
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: 'Courier New, monospace',
            boxShadow: player.ready ? '0 0 10px var(--pixel-green)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {player.ready ? (
            <PixelStar size={14} color="#8B4513" />
          ) : (
            <PixelGem size={14} color="#666" />
          )}
          {player.ready ? '已准备' : '未准备'}
        </div>
      )}

      {!player && (
        <div style={{ fontSize: 24, color: 'var(--pixel-brown)', opacity: 0.3 }}>
          <PixelStar size={16} color="var(--pixel-brown)" />
        </div>
      )}
    </div>
  )
}

export default PixelPlayerSlot
