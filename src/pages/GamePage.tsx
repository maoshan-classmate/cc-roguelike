import { useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useGameStore } from '../store/useGameStore'
import { networkClient } from '../network/socket'

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user } = useAuthStore()
  const {
    floor,
    players,
    enemies,
    bullets,
    items,
    isPaused,
    isGameOver,
    isVictory,
    setState,
    setFloor,
    setPaused,
    setGameOver,
    setLocalPlayerId,
    reset
  } = useGameStore()
  const navigate = useNavigate()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const mouseRef = useRef({ x: 0, y: 0, down: false })
  const animationRef = useRef<number>()

  // Set local player ID
  useEffect(() => {
    if (user) {
      setLocalPlayerId(user.id)
    }
  }, [user])

  // Game state listener
  useEffect(() => {
    networkClient.on('game:state', (state: any) => {
      if (state.floorCompleted) {
        setFloor(state.floor + 1)
      }
      setState(state)
    })

    networkClient.on('game:floor:start', (data: any) => {
      setFloor(data.floor)
    })

    networkClient.on('game:end', (data: any) => {
      setGameOver(true, data.win)
    })

    return () => {
      networkClient.off('game:state')
      networkClient.off('game:floor:start')
      networkClient.off('game:end')
    }
  }, [])

  // Input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())

      if (e.key === 'Escape') {
        setPaused(!isPaused)
      }

      // Skill keys
      if (e.key === '1') networkClient.emit('game:input', { skill: 0 })
      if (e.key === '2') networkClient.emit('game:input', { skill: 1 })
      if (e.key === '3') networkClient.emit('game:input', { skill: 2 })
      if (e.key === '4') networkClient.emit('game:input', { skill: 3 })
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
    }

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        mouseRef.current.x = e.clientX - rect.left
        mouseRef.current.y = e.clientY - rect.top
      }
    }

    const handleMouseDown = () => { mouseRef.current.down = true }
    const handleMouseUp = () => { mouseRef.current.down = false }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPaused])

  // Game loop
  useEffect(() => {
    if (isPaused || isGameOver) return

    const gameLoop = () => {
      // Send input to server
      const keys = keysRef.current
      let dx = 0, dy = 0

      if (keys.has('w') || keys.has('arrowup')) dy -= 1
      if (keys.has('s') || keys.has('arrowdown')) dy += 1
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1
      if (keys.has('d') || keys.has('arrowright')) dx += 1

      // Normalize diagonal movement
      if (dx !== 0 && dy !== 0) {
        dx *= 0.707
        dy *= 0.707
      }

      // Calculate angle to mouse
      const localPlayer = players.find(p => p.id === user?.id)
      console.log('[DEBUG] localPlayer:', localPlayer, 'userId:', user?.id, 'players IDs:', players.map(p => p.id))
      if (localPlayer) {
        const angle = Math.atan2(mouseRef.current.y - localPlayer.y, mouseRef.current.x - localPlayer.x)

        networkClient.emit('game:input', {
          dx,
          dy,
          angle,
          attack: mouseRef.current.down
        })
      }

      // Render
      render()

      animationRef.current = requestAnimationFrame(gameLoop)
    }

    animationRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPaused, isGameOver, players, user])

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid
    ctx.strokeStyle = '#252540'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Draw items
    for (const item of items) {
      ctx.fillStyle = item.type === 'health_pack' ? '#ff6b6b' : '#4a9eff'
      ctx.beginPath()
      ctx.arc(item.x, item.y, 8, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw enemies
    for (const enemy of enemies) {
      if (!enemy.alive) continue

      ctx.fillStyle = enemy.type.includes('boss') ? '#ff6b6b' : '#ffd43b'
      ctx.beginPath()
      ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2)
      ctx.fill()

      // HP bar
      ctx.fillStyle = '#333'
      ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 4)
      ctx.fillStyle = '#ff6b6b'
      ctx.fillRect(enemy.x - 15, enemy.y - 25, 30 * (enemy.hp / enemy.hpMax), 4)
    }

    // Draw bullets
    for (const bullet of bullets) {
      ctx.fillStyle = bullet.friendly ? '#4a9eff' : '#ff6b6b'
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw players
    for (const player of players) {
      if (!player.alive) continue

      const isLocal = player.id === user?.id

      // Player body
      ctx.fillStyle = isLocal ? '#4a9eff' : '#51cf66'
      ctx.beginPath()
      ctx.arc(player.x, player.y, 16, 0, Math.PI * 2)
      ctx.fill()

      // Direction indicator
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(player.x, player.y)
      ctx.lineTo(
        player.x + Math.cos(player.angle) * 25,
        player.y + Math.sin(player.angle) * 25
      )
      ctx.stroke()

      // HP bar
      ctx.fillStyle = '#333'
      ctx.fillRect(player.x - 16, player.y - 28, 32, 4)
      ctx.fillStyle = '#51cf66'
      ctx.fillRect(player.x - 16, player.y - 28, 32 * (player.hp / player.hpMax), 4)

      // Name
      ctx.fillStyle = '#fff'
      ctx.font = '10px Courier New'
      ctx.textAlign = 'center'
      ctx.fillText(player.name, player.x, player.y - 32)
    }
  }, [players, enemies, bullets, items, user])

  // Manual render on state change
  useEffect(() => {
    render()
  }, [players, enemies, bullets, items, render])

  const handleExit = () => {
    reset()
    navigate('/lobby')
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* HUD */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 10,
        display: 'flex',
        gap: '20px'
      }}>
        <div className="card" style={{ padding: '10px 15px' }}>
          <span style={{ color: '#888' }}>楼层: </span>
          <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{floor}/5</span>
        </div>
        <div className="card" style={{ padding: '10px 15px' }}>
          <span style={{ color: '#888' }}>玩家: </span>
          <span style={{ color: 'var(--success)' }}>{players.filter(p => p.alive).length}/{players.length}</span>
        </div>
        <div className="card" style={{ padding: '10px 15px' }}>
          <span style={{ color: '#888' }}>敌人: </span>
          <span style={{ color: 'var(--danger)' }}>{enemies.filter(e => e.alive).length}</span>
        </div>
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          border: '2px solid var(--bg-card)',
          borderRadius: '4px'
        }}
      />

      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: '#555',
        fontSize: '12px'
      }}>
        WASD移动 | 鼠标瞄准射击 | 1-4技能 | ESC暂停
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <h2 style={{ fontSize: '48px', marginBottom: '30px' }}>暂停</h2>
          <button onClick={() => setPaused(false)} style={{ marginBottom: '10px' }}>继续游戏</button>
          <button onClick={handleExit} style={{ background: 'var(--danger)' }}>退出游戏</button>
        </div>
      )}

      {/* Game over overlay */}
      {isGameOver && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <h2 style={{
            fontSize: '48px',
            color: isVictory ? 'var(--success)' : 'var(--danger)',
            marginBottom: '20px'
          }}>
            {isVictory ? '🎉 胜利！' : '💀 失败'}
          </h2>
          <p style={{ marginBottom: '30px', color: '#888' }}>
            {isVictory ? '恭喜你通关了地牢！' : '下次再接再厉！'}
          </p>
          <button onClick={handleExit} style={{ background: 'var(--primary)' }}>返回大厅</button>
        </div>
      )}
    </div>
  )
}
