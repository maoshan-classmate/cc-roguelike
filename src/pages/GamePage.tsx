import { useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useGameStore } from '../store/useGameStore'
import { networkClient } from '../network/socket'

// 导入像素精灵图（后续资源就位后启用）
// import playerBlueImg from '../assets/images/characters/player-blue.png'
// import enemyBasicImg from '../assets/images/enemies/enemy-basic.png'
// import healthPackImg from '../assets/images/items/health-pack.png'

// 暂时使用纯色圆形绘制，后续替换为精灵图

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user } = useAuthStore()
  const {
    floor,
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

  // Use refs to always get latest state in game loop
  const gameStateRef = useRef({ players: [] as any[], enemies: [] as any[], bullets: [] as any[], items: [] as any[] })

  // Set local player ID
  useEffect(() => {
    if (user) {
      setLocalPlayerId(user.id)
    }
  }, [user])

  // Game state listener - update ref immediately
  useEffect(() => {
    networkClient.on('game:state', (state: any) => {
      console.log('[GamePage] Received game:state:', state.players?.length, 'players')
      if (state.floorCompleted) {
        setFloor(state.floor + 1)
      }
      // Update ref immediately for game loop
      gameStateRef.current = {
        players: state.players || [],
        enemies: state.enemies || [],
        bullets: state.bullets || [],
        items: state.items || []
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

  // Render function that reads from refs
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { players, enemies, bullets, items } = gameStateRef.current

    // 清除并填充背景
    ctx.fillStyle = '#2D1B2E'  // 深紫黑
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制像素风格网格
    ctx.strokeStyle = '#3D2B3E'
    ctx.lineWidth = 1
    for (let x = 0; x < canvas.width; x += 32) {  // 32px 网格
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // 绘制道具
    for (const item of items) {
      // 像素风格绘制
      ctx.fillStyle = item.type === 'health_pack' ? '#32CD32' : '#FFD700'
      ctx.fillRect(item.x - 8, item.y - 8, 16, 16)
      // 像素边框
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(item.x - 8, item.y - 8, 16, 16)
    }

    // 绘制敌人
    for (const enemy of enemies) {
      if (!enemy.alive) continue

      const isBoss = enemy.type?.includes('boss')
      const size = isBoss ? 24 : 16
      ctx.fillStyle = isBoss ? '#DC143C' : '#FF6B6B'

      // 像素风格正方形敌人
      ctx.fillRect(enemy.x - size/2, enemy.y - size/2, size, size)

      // 像素边框
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(enemy.x - size/2, enemy.y - size/2, size, size)

      // HP 条
      const hpBarWidth = size * 2
      ctx.fillStyle = '#333'
      ctx.fillRect(enemy.x - hpBarWidth/2, enemy.y - size/2 - 12, hpBarWidth, 6)
      ctx.fillStyle = '#DC143C'
      ctx.fillRect(
        enemy.x - hpBarWidth/2,
        enemy.y - size/2 - 12,
        hpBarWidth * (enemy.hp / enemy.hpMax),
        6
      )
    }

    // 绘制子弹（像素风格小方块）
    for (const bullet of bullets) {
      ctx.fillStyle = bullet.friendly ? '#4A9EFF' : '#FF6B6B'
      ctx.fillRect(
        bullet.x - bullet.radius,
        bullet.y - bullet.radius,
        bullet.radius * 2,
        bullet.radius * 2
      )
    }

    // 绘制玩家（像素风格）
    for (const player of players) {
      if (!player.alive) continue

      const isLocal = player.id === user?.id
      const size = 16

      // 玩家颜色
      ctx.fillStyle = isLocal ? '#4A9EFF' : '#51CF66'
      ctx.fillRect(player.x - size/2, player.y - size/2, size, size)

      // 像素边框
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.strokeRect(player.x - size/2, player.y - size/2, size, size)

      // 方向指示器（像素箭头）
      ctx.fillStyle = '#fff'
      const arrowX = player.x + Math.cos(player.angle) * 20
      const arrowY = player.y + Math.sin(player.angle) * 20
      ctx.fillRect(arrowX - 3, arrowY - 3, 6, 6)

      // HP 条
      ctx.fillStyle = '#333'
      ctx.fillRect(player.x - 16, player.y - 24, 32, 6)
      ctx.fillStyle = '#32CD32'
      ctx.fillRect(
        player.x - 16,
        player.y - 24,
        32 * (player.hp / player.hpMax),
        6
      )

      // 名称
      ctx.fillStyle = '#fff'
      ctx.font = '10px Courier New'
      ctx.textAlign = 'center'
      ctx.fillText(player.name, player.x, player.y - 28)
    }
  }, [user])

  // Game loop - reads from refs
  useEffect(() => {
    if (isPaused || isGameOver) return

    const gameLoop = () => {
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

      // Read from ref for latest state
      const { players } = gameStateRef.current
      const localPlayer = players.find(p => p.id === user?.id)

      if (!localPlayer) {
        // Just render and continue - might not have state yet
        render()
        animationRef.current = requestAnimationFrame(gameLoop)
        return
      }

      const angle = Math.atan2(mouseRef.current.y - localPlayer.y, mouseRef.current.x - localPlayer.x)

      // Send input
      if (dx !== 0 || dy !== 0 || mouseRef.current.down) {
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
  }, [isPaused, isGameOver, user, render])

  // Manual render on state change
  useEffect(() => {
    render()
  }, [render])

  const handleExit = () => {
    reset()
    navigate('/lobby')
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* HUD */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        zIndex: 10,
        display: 'flex',
        gap: 10
      }}>
        {/* 楼层 */}
        <div className="card-pixel" style={{
          padding: '8px 15px',
          borderColor: 'var(--pixel-gold)'
        }}>
          <span style={{ color: 'var(--pixel-brown)', fontFamily: 'Courier New, monospace', fontSize: 12 }}>
            楼层
          </span>
          <span style={{
            color: 'var(--pixel-gold)',
            fontWeight: 'bold',
            fontFamily: 'Courier New, monospace',
            marginLeft: 8
          }}>
            {floor}/5
          </span>
        </div>

        {/* 玩家 */}
        <div className="card-pixel" style={{
          padding: '8px 15px',
          borderColor: 'var(--player-1)'
        }}>
          <span style={{ color: 'var(--pixel-brown)', fontFamily: 'Courier New, monospace', fontSize: 12 }}>
            玩家
          </span>
          <span style={{
            color: 'var(--success)',
            fontWeight: 'bold',
            fontFamily: 'Courier New, monospace',
            marginLeft: 8
          }}>
            {gameStateRef.current.players.filter(p => p.alive).length}/{gameStateRef.current.players.length}
          </span>
        </div>

        {/* 敌人 */}
        <div className="card-pixel" style={{
          padding: '8px 15px',
          borderColor: 'var(--pixel-red)'
        }}>
          <span style={{ color: 'var(--pixel-brown)', fontFamily: 'Courier New, monospace', fontSize: 12 }}>
            敌人
          </span>
          <span style={{
            color: 'var(--danger)',
            fontWeight: 'bold',
            fontFamily: 'Courier New, monospace',
            marginLeft: 8
          }}>
            {gameStateRef.current.enemies.filter(e => e.alive).length}
          </span>
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
          border: '4px solid var(--pixel-brown)',
          boxShadow: '6px 6px 0 rgba(0,0,0,0.5)',
          imageRendering: 'pixelated'
        }}
      />

      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'var(--pixel-brown)',
        fontSize: 11,
        fontFamily: 'Courier New, monospace',
        textShadow: '2px 2px 0 rgba(0,0,0,0.5)',
        padding: '5px 15px',
        background: 'rgba(0,0,0,0.5)'
      }}>
        [ WASD移动 | 鼠标瞄准 | 左键射击 | 1-4技能 | ESC暂停 ]
      </div>

      {/* Pause overlay */}
      {isPaused && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <h2 style={{
            fontSize: 48,
            marginBottom: 30,
            color: 'var(--pixel-gold)',
            fontFamily: 'Courier New, monospace',
            textShadow: '4px 4px 0 rgba(0,0,0,0.5)'
          }}>
            [ 暂停 ]
          </h2>
          <button onClick={() => setPaused(false)} className="btn-pixel btn-success" style={{ marginBottom: 10, minWidth: 200 }}>
            [ 继续游戏 ]
          </button>
          <button onClick={handleExit} className="btn-pixel btn-danger" style={{ minWidth: 200 }}>
            [ 退出游戏 ]
          </button>
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
            fontSize: 48,
            marginBottom: 20,
            color: isVictory ? 'var(--pixel-gold)' : 'var(--danger)',
            fontFamily: 'Courier New, monospace',
            textShadow: '4px 4px 0 rgba(0,0,0,0.5)'
          }}>
            {isVictory ? '[ 胜利! ]' : '[ 失败 ]'}
          </h2>
          <p style={{
            marginBottom: 30,
            color: 'var(--pixel-brown)',
            fontFamily: 'Courier New, monospace'
          }}>
            {isVictory ? '恭喜你通关了地牢！' : '下次再接再厉！'}
          </p>
          <button onClick={handleExit} className="btn-pixel" style={{ background: 'var(--primary)', minWidth: 200 }}>
            [ 返回大厅 ]
          </button>
        </div>
      )}
    </div>
  )
}
