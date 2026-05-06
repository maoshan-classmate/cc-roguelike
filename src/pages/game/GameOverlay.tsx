import { motion, AnimatePresence } from 'framer-motion'

// ── UI 动画 variants ──
const overlayVariant = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}
const overlayPanelVariant = {
  hidden: { opacity: 0, scale: 0.85, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 200, damping: 22, delay: 0.1 } },
  exit: { opacity: 0, scale: 0.9, transition: { duration: 0.12 } },
}

interface GameOverlayProps {
  isPaused: boolean
  isGameOver: boolean
  isVictory: boolean
  onResume: () => void
  onExit: () => void
  onReturnToRoom: () => void
}

export function GameOverlay({
  isPaused,
  isGameOver,
  isVictory,
  onResume,
  onExit,
  onReturnToRoom,
}: GameOverlayProps) {
  return (
    <>
      {/* Pause overlay */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            key="pause-overlay"
            variants={overlayVariant}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100
            }}
          >
            <motion.div variants={overlayPanelVariant} initial="hidden" animate="visible" exit="exit"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}
            >
              <h2 style={{ fontSize: 48, marginBottom: 20, color: 'var(--pixel-gold)', fontFamily: 'Courier New, monospace', textShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}>[ 暂停 ]</h2>
              <motion.button onClick={onResume} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-pixel btn-success" style={{ marginBottom: 10, minWidth: 200 }}>[ 继续游戏 ]</motion.button>
              <motion.button onClick={onExit} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-pixel btn-danger" style={{ minWidth: 200 }}>[ 退出游戏 ]</motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            key="gameover-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.9)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 100
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.15 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            >
              <motion.h2
                initial={{ scale: 0.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 150, damping: 12, delay: 0.25 }}
                style={{ fontSize: 48, marginBottom: 20, color: isVictory ? 'var(--pixel-gold)' : 'var(--danger)', fontFamily: 'Courier New, monospace', textShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
              >
                {isVictory ? '[ 胜利! ]' : '[ 失败 ]'}
              </motion.h2>
              <p style={{ marginBottom: 20, color: 'var(--pixel-brown)', fontFamily: 'Courier New, monospace' }}>
                {isVictory ? '恭喜你通关了地牢！' : '下次再接再厉！'}
              </p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.3 }}
                style={{ display: 'flex', gap: 16 }}
              >
                <motion.button onClick={onReturnToRoom} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} className="btn-pixel" style={{ background: 'var(--pixel-green)', minWidth: 160 }}>[ 返回房间 ]</motion.button>
                <motion.button onClick={onExit} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} className="btn-pixel" style={{ background: 'var(--pixel-brown)', minWidth: 160 }}>[ 返回大厅 ]</motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
