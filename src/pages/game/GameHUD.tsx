import { motion } from 'framer-motion'
import { SKILL_INFO } from '../../config/skills'
import {
  PixelCastle,
  PixelGem,
  PixelKey,
  PixelSword,
  PixelSkull,
} from '../../components/PixelIcons'
import type { PlayerState, EnemyState } from '@shared/types'

// ── UI 动画 variants ──
const hudItemVariant = (i: number) => ({
  hidden: { opacity: 0, y: -20, scale: 0.85 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 20, delay: 0.3 + i * 0.08 } },
})
const skillVariant = (i: number) => ({
  hidden: { opacity: 0, x: 40, scale: 0.7 },
  visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 18, delay: 0.5 + i * 0.1 } },
})

interface GameHUDProps {
  floor: number
  isArena: boolean
  isMaze: boolean
  arenaWave: number
  players: PlayerState[]
  enemies: EnemyState[]
  gold: number
  keys: number
  localPlayerSkills: string[]
  cooldownEndMap: Map<number, number>
  hoveredSkill: number | null
  onHoverSkill: (index: number | null) => void
}

export function GameHUD({
  floor,
  isArena,
  isMaze,
  arenaWave,
  players,
  enemies,
  gold,
  keys,
  localPlayerSkills,
  cooldownEndMap,
  hoveredSkill,
  onHoverSkill,
}: GameHUDProps) {
  return (
    <>
      {/* HUD — 交错入场 */}
      <div style={{
        position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10,
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.div variants={hudItemVariant(0)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelCastle size={16} color="#8B4513" />
            <span style={{ color: 'var(--pixel-gold)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{isArena ? '竞技关' : isMaze ? '迷宫关' : `Floor ${floor}/5`}</span>
          </motion.div>
          {isArena && arenaWave > 0 && (
            <motion.div variants={hudItemVariant(1)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: '#4A9EFF', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#4A9EFF', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>Wave {arenaWave}/3</span>
            </motion.div>
          )}
          <motion.div variants={hudItemVariant(1)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--player-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelSword size={16} color="#C0C0C0" />
            <span style={{ color: 'var(--success)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{players.filter(p => p.alive).length}/{players.length}</span>
          </motion.div>
          <motion.div variants={hudItemVariant(2)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-red)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelSkull size={16} color="#FFFFFF" />
            <span style={{ color: 'var(--danger)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{enemies.filter(e => e.alive).length}</span>
          </motion.div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.div variants={hudItemVariant(3)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelGem size={16} color="#FFD700" />
            <span style={{ color: 'var(--pixel-gold)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{gold}</span>
          </motion.div>
          <motion.div variants={hudItemVariant(4)} initial="hidden" animate="visible" className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelKey size={16} color="#FFD700" />
            <span style={{ color: 'var(--pixel-gold)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>{keys}</span>
          </motion.div>
        </div>
      </div>

      {/* 技能栏 — 动态图标 + 冷却遮罩 + tooltip */}
      <div style={{
        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10,
      }}>
        {localPlayerSkills.map((skillId: string, i: number) => {
          const info = SKILL_INFO[skillId]
          if (!info) return null
          const cdEnd = cooldownEndMap.get(i) ?? 0
          const now = Date.now()
          const remaining = Math.max(0, cdEnd - now)
          const cdRatio = info.cooldown > 0 ? remaining / (info.cooldown * 1000) : 0

          return (
            <motion.div
              key={skillId + i}
              variants={skillVariant(i)}
              initial="hidden"
              animate="visible"
              onHoverStart={() => onHoverSkill(i)}
              onHoverEnd={() => onHoverSkill(null)}
              style={{ position: 'relative' }}
            >
              <div style={{
                width: 56, height: 56,
                background: '#1A1210',
                border: `2px solid ${info.color}`,
                borderRadius: 4,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: `2px 2px 0 rgba(0,0,0,0.5), inset 0 0 8px ${info.color}22`,
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
              }}>
                {/* Icon */}
                <img
                  src={info.icon}
                  alt={info.name}
                  style={{
                    width: 32, height: 32, objectFit: 'contain',
                    imageRendering: 'pixelated',
                    opacity: cdRatio > 0 ? 0.4 : 1,
                  }}
                />
                {/* Skill name */}
                <div style={{
                  fontSize: 8, color: info.color, fontFamily: 'monospace',
                  lineHeight: '10px', marginTop: 1, whiteSpace: 'nowrap',
                }}>
                  {info.name}
                </div>
                {/* Key hint */}
                <div style={{
                  position: 'absolute', top: 2, left: 3,
                  fontSize: 9, color: '#666', fontFamily: 'monospace',
                }}>
                  {i + 1}
                </div>
                {/* Energy cost */}
                <div style={{
                  position: 'absolute', bottom: 2, right: 3,
                  fontSize: 8, color: '#88AACC', fontFamily: 'monospace',
                }}>
                  {info.energyCost}
                </div>
                {/* Cooldown overlay */}
                {cdRatio > 0 && (
                  <>
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      height: `${cdRatio * 100}%`,
                      background: 'rgba(0,0,0,0.7)',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'absolute', top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      fontSize: 14, color: '#FFF', fontFamily: 'monospace',
                      fontWeight: 'bold', textShadow: '1px 1px 2px #000',
                    }}>
                      {(remaining / 1000).toFixed(1)}
                    </div>
                  </>
                )}
              </div>

              {/* Tooltip */}
              {hoveredSkill === i && (
                <div style={{
                  position: 'absolute', right: 64, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.92)',
                  border: `1px solid ${info.color}`,
                  borderRadius: 4, padding: '6px 8px',
                  minWidth: 140, maxWidth: 180, zIndex: 20,
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 11, color: info.color, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 3 }}>
                    {info.name}
                  </div>
                  <div style={{ fontSize: 9, color: '#CCC', fontFamily: 'monospace', lineHeight: '13px', marginBottom: 4 }}>
                    {info.description}
                  </div>
                  <div style={{ fontSize: 9, color: '#888', fontFamily: 'monospace' }}>
                    能量 {info.energyCost} | 冷却 {info.cooldown}s
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Controls hint — 淡入 */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
        style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          color: 'var(--pixel-brown)', fontSize: 11, fontFamily: 'Courier New, monospace',
          textShadow: '2px 2px 0 rgba(0,0,0,0.5)', padding: '5px 15px',
          background: 'rgba(0,0,0,0.5)', zIndex: 10,
        }}
      >
        [ WASD移动 | 鼠标瞄准 | 左键射击 | 1-3技能(按住预览) | ESC暂停 ]
      </motion.div>
    </>
  )
}
