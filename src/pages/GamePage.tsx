import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useGameStore } from '../store/useGameStore'
import { networkClient } from '../network/socket'
import {
  TILE_SIZE,
  TILE_MARGIN,
  CHAR_SPRITESHEET_WIDTH,
  roguelikeCharSheetPath,
  roguelikeDungeonSheetPath,
} from '../assets/kenney'
import { CHARACTERS, getCharacterSpriteIndex } from '../config/characters'
import { ENEMIES } from '../config/enemies'
import { ITEMS } from '../config/items'
import {
  drawCharacterSprite,
  drawDungeonSprite,
  drawHPBar,
  drawBossCrown,
  drawDirectionArrow,
  drawNameTag
} from '../config/sprites'
import {
  PixelCastle,
  PixelDragon,
  PixelCrown,
  PixelGem,
  PixelKey,
  PixelSword,
  PixelShield,
  PixelSkull,
  PixelBow,
  PixelStar,
} from '../components/PixelIcons'

// 加载精灵图
const charSpriteSheet = new Image()
charSpriteSheet.src = roguelikeCharSheetPath
const dungeonSpriteSheet = new Image()
dungeonSpriteSheet.src = roguelikeDungeonSheetPath

// 技能图标SVG组件数据
const SKILL_ICONS = [
  { name: '技能1', color: '#C0C0C0' },
  { name: '技能2', color: '#4A9EFF' },
  { name: '技能3', color: '#8B4513' },
  { name: '技能4', color: '#9B59B6' },
]

// 技能图标组件映射
const SkillIconComponents = [PixelSword, PixelShield, PixelBow, PixelStar]

export default function GamePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user } = useAuthStore()
  const {
    floor,
    players,
    enemies,
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

  // 精灵加载状态
  const [spritesLoaded, setSpritesLoaded] = useState(false)

  // Use refs to always get latest state in game loop
  const gameStateRef = useRef({
    players: [] as any[],
    enemies: [] as any[],
    bullets: [] as any[],
    items: [] as any[],
    gold: 0,
    keys: 0,
    dungeon: null as any
  })

  // Set local player ID
  useEffect(() => {
    if (user) {
      setLocalPlayerId(user.id)
    }
  }, [user])

  // 预加载精灵图
  useEffect(() => {
    const loadChar = new Promise<void>((resolve) => {
      if (charSpriteSheet.complete && charSpriteSheet.naturalWidth > 0) {
        resolve()
      } else {
        charSpriteSheet.onload = () => resolve()
        charSpriteSheet.onerror = () => resolve()
      }
    })
    const loadDungeon = new Promise<void>((resolve) => {
      if (dungeonSpriteSheet.complete && dungeonSpriteSheet.naturalWidth > 0) {
        resolve()
      } else {
        dungeonSpriteSheet.onload = () => resolve()
        dungeonSpriteSheet.onerror = () => resolve()
      }
    })

    Promise.all([loadChar, loadDungeon]).then(() => {
      setSpritesLoaded(true)
    })
  }, [])

  // Game state listener
  useEffect(() => {
    networkClient.on('game:state', (state: any) => {
      if (state.floorCompleted) {
        setFloor(state.floor + 1)
      }
      gameStateRef.current = {
        players: state.players || [],
        enemies: state.enemies || [],
        bullets: state.bullets || [],
        items: state.items || [],
        gold: state.gold || 0,
        keys: state.keys || 0,
        dungeon: state.dungeon || null
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
    const skillKeysDown = new Set<string>()

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())

      if (e.key === 'Escape') {
        setPaused(!isPaused)
      }

      // Skill keys - prevent repeat on hold
      const skillKey = e.key
      if (['1', '2', '3', '4'].includes(skillKey) && !skillKeysDown.has(skillKey)) {
        skillKeysDown.add(skillKey)
        networkClient.emit('game:input', { skill: parseInt(skillKey) - 1 })
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase())
      if (['1', '2', '3', '4'].includes(e.key)) {
        skillKeysDown.delete(e.key)
      }
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

  // Render function
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { players, enemies, bullets, items, dungeon } = gameStateRef.current

    // 清除背景
    ctx.fillStyle = '#2D1B2E'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制地牢瓦片
    if (dungeon && dungeon.rooms && spritesLoaded && dungeonSpriteSheet.complete) {
      const tileSize = 32
      for (const room of dungeon.rooms) {
        // 绘制房间内的地板
        for (let x = room.x; x < room.x + room.width; x += tileSize) {
          for (let y = room.y; y < room.y + room.height; y += tileSize) {
            drawDungeonSprite(ctx, dungeonSpriteSheet, 4, x + tileSize/2, y + tileSize/2, tileSize)
          }
        }
        // 绘制房间墙壁（上边）
        for (let x = room.x - tileSize; x < room.x + room.width + tileSize; x += tileSize) {
          // 上墙
          if (x >= 0 && x < canvas.width) {
            drawDungeonSprite(ctx, dungeonSpriteSheet, 10, x + tileSize/2, room.y - tileSize/2, tileSize)
          }
          // 下墙
          if (x >= 0 && x < canvas.width && room.y + room.height + tileSize <= canvas.height) {
            drawDungeonSprite(ctx, dungeonSpriteSheet, 15, x + tileSize/2, room.y + room.height + tileSize/2, tileSize)
          }
        }
        // 绘制房间墙壁（左边和右边）
        for (let y = room.y; y < room.y + room.height; y += tileSize) {
          // 左墙
          if (room.y >= 0 && room.y < canvas.height) {
            drawDungeonSprite(ctx, dungeonSpriteSheet, 12, room.x - tileSize/2, y + tileSize/2, tileSize)
          }
          // 右墙
          if (room.x + room.width + tileSize <= canvas.width) {
            drawDungeonSprite(ctx, dungeonSpriteSheet, 13, room.x + room.width + tileSize/2, y + tileSize/2, tileSize)
          }
        }
        // 角落
        drawDungeonSprite(ctx, dungeonSpriteSheet, 9, room.x - tileSize/2, room.y - tileSize/2, tileSize)
        drawDungeonSprite(ctx, dungeonSpriteSheet, 11, room.x + room.width + tileSize/2, room.y - tileSize/2, tileSize)
        drawDungeonSprite(ctx, dungeonSpriteSheet, 14, room.x - tileSize/2, room.y + room.height + tileSize/2, tileSize)
        drawDungeonSprite(ctx, dungeonSpriteSheet, 16, room.x + room.width + tileSize/2, room.y + room.height + tileSize/2, tileSize)
      }
      // 绘制出口楼梯
      if (dungeon.exitPoint) {
        drawDungeonSprite(ctx, dungeonSpriteSheet, 23, dungeon.exitPoint.x, dungeon.exitPoint.y, tileSize)
      }
    } else {
      // 备用：简单网格
      ctx.strokeStyle = '#3D2B3E'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 32) {
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
    }

    // 绘制道具
    for (const item of items) {
      const itemConfig = ITEMS[item.type] || ITEMS.health
      if (spritesLoaded && dungeonSpriteSheet.complete) {
        drawDungeonSprite(ctx, dungeonSpriteSheet, itemConfig.spriteIndex, item.x, item.y, 28)
      } else {
        // 备用：纯色
        ctx.fillStyle = itemConfig.color
        ctx.fillRect(item.x - 14, item.y - 14, 28, 28)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(item.x - 14, item.y - 14, 28, 28)
      }
    }

    // 绘制敌人
    for (const enemy of enemies) {
      if (!enemy.alive) continue

      const enemyConfig = ENEMIES[enemy.type] || ENEMIES.basic
      const size = enemyConfig.size

      if (spritesLoaded && charSpriteSheet.complete) {
        drawCharacterSprite(ctx, charSpriteSheet, enemyConfig.spriteIndex, enemy.x, enemy.y, size)
      } else {
        ctx.fillStyle = enemyConfig.color
        ctx.fillRect(enemy.x - size/2, enemy.y - size/2, size, size)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(enemy.x - size/2, enemy.y - size/2, size, size)
      }

      // BOSS皇冠
      if (enemyConfig.isBoss) {
        drawBossCrown(ctx, enemy.x, enemy.y - size/2 - 10, 16)
      }

      // HP条
      const hpBarWidth = enemyConfig.isBoss ? 64 : size * 1.5
      const hpBarHeight = enemyConfig.isBoss ? 8 : 6
      drawHPBar(
        ctx,
        enemy.x - hpBarWidth/2,
        enemy.y - size/2 - (enemyConfig.isBoss ? 20 : 14),
        hpBarWidth,
        hpBarHeight,
        enemy.hp,
        enemy.hpMax,
        enemyConfig.isBoss ? '#FFD700' : '#DC143C'
      )
    }

    // 绘制子弹
    for (const bullet of bullets) {
      const spriteIndex = 35 // bullet sprite
      if (spritesLoaded && dungeonSpriteSheet.complete) {
        drawDungeonSprite(ctx, dungeonSpriteSheet, spriteIndex, bullet.x, bullet.y, 16)
      } else {
        ctx.fillStyle = bullet.friendly ? '#4A9EFF' : '#FF6B6B'
        ctx.beginPath()
        ctx.arc(bullet.x, bullet.y, bullet.radius || 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 绘制玩家
    for (const player of players) {
      if (!player.alive) continue

      const isLocal = player.id === user?.id
      const charConfig = CHARACTERS[player.characterType] || CHARACTERS.warrior
      const size = 48

      // 根据朝向选择精灵
      let spriteIndex = charConfig.spriteIndex.front
      if (player.angle !== undefined) {
        const angle = player.angle
        if (angle > -Math.PI/4 && angle <= Math.PI/4) {
          spriteIndex = charConfig.spriteIndex.right
        } else if (angle > Math.PI/4 && angle <= 3*Math.PI/4) {
          spriteIndex = charConfig.spriteIndex.back
        } else if (angle > 3*Math.PI/4 || angle <= -3*Math.PI/4) {
          spriteIndex = charConfig.spriteIndex.left
        } else {
          spriteIndex = charConfig.spriteIndex.front
        }
      }

      if (spritesLoaded && charSpriteSheet.complete) {
        drawCharacterSprite(ctx, charSpriteSheet, spriteIndex, player.x, player.y, size)
      } else {
        ctx.fillStyle = charConfig.color
        ctx.fillRect(player.x - size/2, player.y - size/2, size, size)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(player.x - size/2, player.y - size/2, size, size)
      }

      // 本地玩家方向指示器
      if (isLocal && player.angle !== undefined) {
        drawDirectionArrow(ctx, player.x, player.y, player.angle, 12)
      }

      // HP条
      drawHPBar(ctx, player.x - 24, player.y - 34, 48, 6, player.hp, player.hpMax, charConfig.color)

      // 名称
      drawNameTag(ctx, player.x, player.y - 40, player.name, charConfig.color)
    }
  }, [user, spritesLoaded])

  // Game loop
  useEffect(() => {
    if (isPaused || isGameOver) return

    const gameLoop = () => {
      const keys = keysRef.current
      let dx = 0, dy = 0

      if (keys.has('w') || keys.has('arrowup')) dy -= 1
      if (keys.has('s') || keys.has('arrowdown')) dy += 1
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1
      if (keys.has('d') || keys.has('arrowright')) dx += 1

      if (dx !== 0 && dy !== 0) {
        dx *= 0.707
        dy *= 0.707
      }

      const { players } = gameStateRef.current
      const localPlayer = players.find(p => p.id === user?.id)

      if (!localPlayer) {
        render()
        animationRef.current = requestAnimationFrame(gameLoop)
        return
      }

      const angle = Math.atan2(mouseRef.current.y - localPlayer.y, mouseRef.current.x - localPlayer.x)

      if (dx !== 0 || dy !== 0 || mouseRef.current.down) {
        networkClient.emit('game:input', { dx, dy, angle, attack: mouseRef.current.down })
      }

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

  useEffect(() => {
    render()
  }, [render])

  const handleExit = () => {
    reset()
    navigate('/lobby')
  }

  const { gold, keys } = gameStateRef.current

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      {/* HUD - 顶部 */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        zIndex: 10,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        {/* 左侧状态 */}
        <div style={{ display: 'flex', gap: 8 }}>
          {/* 楼层 */}
          <div className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelCastle size={16} color="#8B4513" />
            <span style={{ color: 'var(--pixel-gold)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>
              {floor}/5
            </span>
          </div>

          {/* 玩家 */}
          <div className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--player-1)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelSword size={16} color="#C0C0C0" />
            <span style={{ color: 'var(--success)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>
              {players.filter(p => p.alive).length}/{players.length}
            </span>
          </div>

          {/* 敌人 */}
          <div className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-red)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelSkull size={16} color="#FFFFFF" />
            <span style={{ color: 'var(--danger)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>
              {enemies.filter(e => e.alive).length}
            </span>
          </div>
        </div>

        {/* 右侧资源 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelGem size={16} color="#FFD700" />
            <span style={{ color: 'var(--pixel-gold)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>
              {gold}
            </span>
          </div>
          <div className="card-pixel" style={{ padding: '6px 12px', borderColor: 'var(--pixel-gold)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <PixelKey size={16} color="#FFD700" />
            <span style={{ color: 'var(--pixel-gold)', fontFamily: 'Courier New', fontSize: 14, fontWeight: 'bold' }}>
              {keys}
            </span>
          </div>
        </div>
      </div>

      {/* 技能栏 - 右侧 */}
      <div style={{
        position: 'absolute',
        right: 10,
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        zIndex: 10,
      }}>
        {SKILL_ICONS.map((skill, i) => (
          <div
            key={i}
            style={{
              width: 48,
              height: 48,
              background: `linear-gradient(135deg, ${skill.color} 0%, ${skill.color}88 100%)`,
              border: '3px solid #FFFFFF',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
              cursor: 'pointer',
              transition: 'transform 0.1s',
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {React.createElement(SkillIconComponents[i], { size: 24, color: skill.color })}
          </div>
        ))}
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
        background: 'rgba(0,0,0,0.5)',
        zIndex: 10,
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
