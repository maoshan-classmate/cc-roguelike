import { useState } from 'react'

interface DebugMenuProps {
  onTeleport: (floor: number) => void
  onKillAll: () => void
  onToggleInvincible: () => void
  isInvincible: boolean
  onBossSlam: () => void
  onBossRanged: () => void
  onForceArena: () => void
  onForceTrapFloor: () => void
  onToggleFog: () => void
  isFogOff: boolean
}

export function DebugMenu({
  onTeleport,
  onKillAll,
  onToggleInvincible,
  isInvincible,
  onBossSlam,
  onBossRanged,
  onForceArena,
  onForceTrapFloor,
  onToggleFog,
  isFogOff,
}: DebugMenuProps) {
  const [floorInput, setFloorInput] = useState('')

  const handleTeleport = () => {
    const floor = parseInt(floorInput)
    if (floor >= 1 && floor <= 5) {
      onTeleport(floor)
    }
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: 60,
      left: 10,
      zIndex: 20,
      background: 'rgba(0,0,0,0.9)',
      border: '2px solid var(--pixel-gold)',
      padding: 12,
      fontFamily: 'Courier New, monospace',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--pixel-gold)', marginBottom: 8, fontWeight: 'bold' }}>[ 调试菜单 ]</div>

      {/* 跳关 */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <input
          type="number"
          min="1"
          max="5"
          value={floorInput}
          onChange={(e) => setFloorInput(e.target.value)}
          placeholder="1-5"
          style={{
            width: 50,
            background: 'var(--pixel-bg)',
            border: '1px solid var(--pixel-brown)',
            color: 'var(--pixel-gold)',
            padding: '2px 4px',
            fontFamily: 'Courier New',
            fontSize: 11,
          }}
        />
        <button
          onClick={handleTeleport}
          className="btn-pixel"
          style={{ background: 'var(--pixel-brown)', fontSize: 11, padding: '2px 8px' }}
        >
          跳关
        </button>
      </div>

      {/* 无敌开关 */}
      <button
        onClick={onToggleInvincible}
        className="btn-pixel"
        style={{
          background: isInvincible ? 'var(--pixel-green)' : 'var(--pixel-dark)',
          fontSize: 11,
          padding: '4px 8px',
          marginBottom: 8,
          width: '100%',
        }}
      >
        {isInvincible ? '[ 无敌 ON ]' : '[ 无敌 OFF ]'}
      </button>

      {/* 一键清怪 */}
      <button
        onClick={onKillAll}
        className="btn-pixel"
        style={{ background: 'var(--pixel-red)', fontSize: 11, padding: '4px 8px', width: '100%', marginBottom: 8 }}
      >
        [ 一键清怪 ]
      </button>

      {/* Boss 技能测试 */}
      <div style={{ color: 'var(--pixel-gold)', marginBottom: 4, fontSize: 10 }}>Boss 技能</div>
      <button
        onClick={onBossSlam}
        className="btn-pixel"
        style={{ background: '#8B4513', fontSize: 11, padding: '4px 8px', width: '100%', marginBottom: 4 }}
      >
        [ 震地 AOE ]
      </button>
      <button
        onClick={onBossRanged}
        className="btn-pixel"
        style={{ background: '#8B0000', fontSize: 11, padding: '4px 8px', width: '100%' }}
      >
        [ 弹幕 Ranged ]
      </button>

      {/* 竞技关/陷阱调试 */}
      <div style={{ color: 'var(--pixel-gold)', marginBottom: 4, marginTop: 8, fontSize: 10 }}>房间多样化</div>
      <button
        onClick={onForceArena}
        className="btn-pixel"
        style={{ background: '#2A4494', fontSize: 11, padding: '4px 8px', width: '100%', marginBottom: 4 }}
      >
        [ 进入竞技关 ]
      </button>
      <button
        onClick={onForceTrapFloor}
        className="btn-pixel"
        style={{ background: '#6B3A2A', fontSize: 11, padding: '4px 8px', width: '100%', marginBottom: 4 }}
      >
        [ 进入迷宫关 ]
      </button>
      <button
        onClick={onToggleFog}
        className="btn-pixel"
        style={{
          background: isFogOff ? '#4A9EFF' : '#333',
          fontSize: 11,
          padding: '4px 8px',
          width: '100%',
        }}
      >
        {isFogOff ? '[ 迷雾 OFF ]' : '[ 去迷雾 ON/OFF ]'}
      </button>
    </div>
  )
}
