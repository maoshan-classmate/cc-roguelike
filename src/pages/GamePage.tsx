import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useGameStore } from '../store/useGameStore'
import { networkClient } from '../network/socket'
import {
  roguelikeCharSheetPath,
  roguelikeDungeonSheetPath,
  roguelikeSheetPath,
} from '../assets/kenney'
import { mainAtlasPath } from '../assets/0x72'
import { CHARACTERS } from '../config/characters'
import { ENEMIES } from '../config/enemies'
import { ITEMS } from '../config/items'
import {
  drawCharacterSprite,
  drawDungeonSprite,
  drawSheetSprite,
  draw0x72Sprite,
  drawHPBar,
  drawBossCrown,
  drawNameTag,
  drawWeaponSprite,
  drawBulletSprite,
  getSpriteEntry,
  is0x72Sprite,
} from '../config/sprites'
import {
  PixelCastle,
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
const sheetSpriteSheet = new Image()
sheetSpriteSheet.src = roguelikeSheetPath
// 0x72 TilesetII atlas
const tileset2Atlas = new Image()
tileset2Atlas.src = mainAtlasPath

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
  const animationRef = useRef<number | undefined>(undefined)

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

  // 粒子系统：死亡特效
  const particlesRef = useRef<Array<{
    id: string
    x: number
    y: number
    vx: number
    vy: number
    life: number
    maxLife: number
    color: string
    size: number
    type: 'death' | 'hit' | 'skill'
  }>>([])

  // 记录上一帧的 dying 状态，用于检测新进入死亡的敌人
  const prevDyingRef = useRef<Set<string>>(new Set())

  // 伤害飘字系统
  const damageTextsRef = useRef<Array<{
    id: string
    x: number
    y: number
    value: number
    life: number
    maxLife: number
    color: string
    isPlayer: boolean
  }>>([])

  // 记录上一帧的 hp，用于检测伤害
  const prevHpRef = useRef<Map<string, number>>(new Map())

  // 插值渲染：保存上一帧和目标位置
  const prevPositions = useRef<Map<string, { x: number; y: number }>>(new Map())
  const targetPositions = useRef<Map<string, { x: number; y: number }>>(new Map())
  const lastStateTime = useRef(performance.now())

  function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
  }

  // 粒子生成函数：敌人死亡特效
  function spawnDeathParticles(x: number, y: number, color: string) {
    const particleCount = 12
    const particles = particlesRef.current
    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.5
      const speed = 80 + Math.random() * 60
      const life = 0.4 + Math.random() * 0.3 // 0.4-0.7秒
      particles.push({
        id: `death_${Date.now()}_${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color,
        size: 3 + Math.random() * 3,
        type: 'death'
      })
    }
    // 添加一些额外的红色小粒子增加血腥感
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 50 + Math.random() * 40
      const life = 0.3 + Math.random() * 0.2
      particles.push({
        id: `death_${Date.now()}_extra_${i}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        color: '#FF4444',
        size: 2 + Math.random() * 2,
        type: 'death'
      })
    }
  }

  // 粒子更新和渲染
  function updateAndDrawParticles(ctx: CanvasRenderingContext2D) {
    const particles = particlesRef.current
    const dt = 1 / 60 // 假设 60fps

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]

      // 更新位置
      p.x += p.vx * dt
      p.y += p.vy * dt
      // 重力效果（让粒子下落）
      p.vy += 120 * dt
      // 阻尼（逐渐减速）
      p.vx *= 0.98
      p.vy *= 0.98
      // 生命衰减
      p.life -= dt

      // 移除死亡粒子
      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }

      // 渲染粒子
      const alpha = p.life / p.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = p.color

      // 根据粒子类型绘制不同形状
      if (p.type === 'death') {
        // 死亡粒子：菱形/方形碎片
        const s = p.size * alpha
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
      } else if (p.type === 'hit') {
        // 击中粒子：圆形
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // 技能粒子：三角形
        const s = p.size * alpha
        ctx.beginPath()
        ctx.moveTo(p.x, p.y - s)
        ctx.lineTo(p.x - s * 0.866, p.y + s * 0.5)
        ctx.lineTo(p.x + s * 0.866, p.y + s * 0.5)
        ctx.closePath()
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  // 伤害飘字生成函数
  function spawnDamageText(x: number, y: number, value: number, isPlayer: boolean) {
    const damageTexts = damageTextsRef.current
    damageTexts.push({
      id: `dmg_${Date.now()}_${Math.random()}`,
      x,
      y,
      value,
      life: 1.0, // 1秒持续时间
      maxLife: 1.0,
      color: isPlayer ? '#FF6B6B' : '#FFD700', // 玩家受伤红色，敌人受伤金色
      isPlayer
    })
  }

  // 更新和渲染伤害飘字
  function updateAndDrawDamageTexts(ctx: CanvasRenderingContext2D) {
    const damageTexts = damageTextsRef.current
    const dt = 1 / 60 // 假设 60fps

    for (let i = damageTexts.length - 1; i >= 0; i--) {
      const t = damageTexts[i]

      // 向上飘动
      t.y -= 60 * dt // 每秒上升60像素
      // 左右轻微晃动
      t.x += Math.sin(t.life * 10) * 0.5
      // 生命衰减
      t.life -= dt

      // 移除死亡飘字
      if (t.life <= 0) {
        damageTexts.splice(i, 1)
        continue
      }

      // 渲染飘字
      const alpha = Math.min(1, t.life / 0.3) // 最后30%开始淡出
      const scale = 0.8 + 0.4 * (1 - t.life / t.maxLife) // 从小到大

      ctx.save()
      ctx.globalAlpha = alpha
      ctx.font = `bold ${Math.floor(18 * scale)}px "Courier New", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // 黑色描边
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.strokeText(`-${t.value}`, t.x, t.y)

      // 彩色填充
      ctx.fillStyle = t.color
      ctx.fillText(`-${t.value}`, t.x, t.y)

      ctx.restore()
    }
  }

  // 动画帧辅助：每~150ms切换一帧 (0→1→2→3→0 循环)
  const animInterval = 150 // ms per frame
  const lastAnimTime = useRef(performance.now())
  const lastSentAngleRef = useRef<number | null>(null)
  // 武器攻击闪光：点击时触发，逐渐衰减
  const attackFlashRef = useRef(0)
  const prevAttackRef = useRef(false)
  // 当前 floor session，用于过滤跨 floor 的 stale state
  const floorSessionRef = useRef<number>(0)
  // 游戏 session 计数器：区分不同游戏实例，服务器递增，客户端过滤 stale session
  const gameSessionRef = useRef<number>(0)

  function getAnimSprite(spriteName: string, elapsedMs: number): string {
    const frame = Math.floor(elapsedMs / animInterval) % 4

    // 情况1: 有 _anim_fX 后缀 → 替换帧号 (knight_m_idle_anim_f0, coin_anim_f0)
    if (/_anim_f\d+$/.test(spriteName)) {
      return spriteName.replace(/_f\d+$/, `_f${frame}`)
    }

    // 情况2: 有 _fX 但无 _anim（如 bomb_f0）→ 替换帧号，bomb 只有 3 帧
    if (/_f\d+$/.test(spriteName)) {
      return spriteName.replace(/_f\d+$/, `_f${frame % 3}`)
    }

    // 情况3: 静态项（flask_big_blue, skull, weapon_* 等）→ 不追加帧号
    return spriteName
  }

  // Set local player ID
  useEffect(() => {
    if (user) {
      setLocalPlayerId(user.id)
    }
  }, [user])

  // 预加载精灵图
  useEffect(() => {
    const loadChar = new Promise<void>((resolve, reject) => {
      if (charSpriteSheet.complete && charSpriteSheet.naturalWidth > 0) {
        resolve()
      } else {
        charSpriteSheet.onload = () => {
          if (charSpriteSheet.naturalWidth > 0) resolve()
          else reject(new Error('Char sheet loaded but naturalWidth=0'))
        }
        charSpriteSheet.onerror = () => reject(new Error('Failed to load char spritesheet'))
      }
    })
    const loadDungeon = new Promise<void>((resolve, reject) => {
      if (dungeonSpriteSheet.complete && dungeonSpriteSheet.naturalWidth > 0) {
        resolve()
      } else {
        dungeonSpriteSheet.onload = () => {
          if (dungeonSpriteSheet.naturalWidth > 0) resolve()
          else reject(new Error('Dungeon sheet loaded but naturalWidth=0'))
        }
        dungeonSpriteSheet.onerror = () => reject(new Error('Failed to load dungeon spritesheet'))
      }
    })
    const loadSheet = new Promise<void>((resolve, reject) => {
      if (sheetSpriteSheet.complete && sheetSpriteSheet.naturalWidth > 0) {
        resolve()
      } else {
        sheetSpriteSheet.onload = () => {
          if (sheetSpriteSheet.naturalWidth > 0) resolve()
          else reject(new Error('Sheet loaded but naturalWidth=0'))
        }
        sheetSpriteSheet.onerror = () => reject(new Error('Failed to load roguelikeSheet'))
      }
    })
    const loadTileset2 = new Promise<void>((resolve, reject) => {
      if (tileset2Atlas.complete && tileset2Atlas.naturalWidth > 0) {
        resolve()
      } else {
        tileset2Atlas.onload = () => {
          if (tileset2Atlas.naturalWidth > 0) resolve()
          else reject(new Error('Tileset2 atlas loaded but naturalWidth=0'))
        }
        tileset2Atlas.onerror = () => reject(new Error('Failed to load 0x72 tileset2 atlas'))
      }
    })

    Promise.all([loadChar, loadDungeon, loadSheet, loadTileset2]).then(() => {
      setSpritesLoaded(true)
    })
  }, [])

  // Game state listener
  useEffect(() => {
    networkClient.on('game:state', (state: any) => {
      // 过滤 stale state：
      // - gameSessionRef === 0 表示"尚未确立 session"（刚进入或刚退出），接受第一帧建立基准
      // - gameSessionRef !== 0 时，只接受匹配 session 的状态，丢弃旧游戏实例的残留消息
      if (gameSessionRef.current !== 0 && state.gameSession !== gameSessionRef.current) return

      if (state.floorCompleted) {
        setFloor(state.floor + 1)
      }
      // 插值：保存旧目标作为上一帧，记录新目标
      const prev = prevPositions.current
      const target = targetPositions.current
      const entities = [...(state.players || []), ...(state.enemies || [])]
      for (const e of entities) {
        const key = e.id
        const oldTarget = target.get(key)
        if (oldTarget) {
          prev.set(key, { x: oldTarget.x, y: oldTarget.y })
        } else {
          prev.set(key, { x: e.x, y: e.y })
        }
        target.set(key, { x: e.x, y: e.y })

        // 伤害检测：比较 hp 变化
        const prevHp = prevHpRef.current.get(key)
        if (prevHp !== undefined && e.hp < prevHp) {
          const damage = prevHp - e.hp
          const isPlayer = state.players?.some((p: any) => p.id === key)
          spawnDamageText(e.x, e.y - 20, damage, isPlayer)
        }
        prevHpRef.current.set(key, e.hp)
      }
      lastStateTime.current = performance.now()

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
      // 清除插值状态，防止残留导致下次进入游戏时瞬跳
      prevPositions.current.clear()
      targetPositions.current.clear()
      // 清除 gameStateRef.current 防止旧游戏数据污染
      gameStateRef.current = {
        players: [],
        enemies: [],
        bullets: [],
        items: [],
        gold: 0,
        keys: 0,
        dungeon: null
      }
      // 更新 floor session 和 game session
      floorSessionRef.current = data.floor
      gameSessionRef.current = data.gameSession
      lastStateTime.current = performance.now()
      setFloor(data.floor)
    })

    networkClient.on('game:end', (data: any) => {
      setGameOver(true, data.win)
    })

    return () => {
      networkClient.off('game:state')
      networkClient.off('game:floor:start')
      networkClient.off('game:end')
      // 重置 session 计数器，防止残留的旧游戏实例状态污染下次进入
      floorSessionRef.current = 0
      gameSessionRef.current = 0
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

    // 计算插值 t (0~1)
    const stateInterval = 100 // 10Hz = 100ms
    const elapsed = performance.now() - lastStateTime.current
    const t = Math.min(elapsed / stateInterval, 1)

    // 获取插值位置
    function getRenderPos(id: string, targetX: number, targetY: number) {
      const prev = prevPositions.current.get(id)
      if (!prev) return { x: targetX, y: targetY }
      return {
        x: lerp(prev.x, targetX, t),
        y: lerp(prev.y, targetY, t)
      }
    }

    // 清除背景（与地牢暗区颜色一致）
    ctx.fillStyle = '#1A1210'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 绘制地牢（基于碰撞网格 tile-by-tile 渲染，视觉=物理）
    if (dungeon && dungeon.collisionGrid && spritesLoaded && dungeonSpriteSheet.complete) {
      const tileSize = 32
      const grid = dungeon.collisionGrid
      const rows = grid.length
      const cols = grid[0]?.length || 0

      // 颜色方案（暗色石质地牢）
      const FLOOR_BASE = '#3A2E2C'     // 暗石褐色地板
      const FLOOR_GRID = '#504440'      // 地板网格线（与底色有明显对比）
      const WALL_FACE = '#5C4A3A'       // 墙面（与地板相邻的墙）
      const WALL_EDGE = '#7A6652'       // 墙边缘高光
      const WALL_DARK = '#2A1E16'       // 墙暗面
      const BG_COLOR = '#1A1210'        // 背景（非可见墙区域）

      // 先用背景色清空
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // 逐 tile 渲染
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * tileSize
          const y = row * tileSize

          if (grid[row][col]) {
            // === 可行走 tile = 地板 ===
            ctx.fillStyle = FLOOR_BASE
            ctx.fillRect(x, y, tileSize, tileSize)
            // 网格线（明显可见）
            ctx.strokeStyle = FLOOR_GRID
            ctx.lineWidth = 1
            ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1)
          } else {
            // === 墙 tile ===
            // 检查是否与地板相邻（可见墙面）
            const adjFloor =
              (row > 0 && grid[row - 1][col]) ||
              (row < rows - 1 && grid[row + 1][col]) ||
              (col > 0 && grid[row][col - 1]) ||
              (col < cols - 1 && grid[row][col + 1])

            if (adjFloor) {
              // 可见墙面（与地板直接相邻）
              ctx.fillStyle = WALL_FACE
              ctx.fillRect(x, y, tileSize, tileSize)
              // 立体感：顶部高光 + 底部暗影
              ctx.fillStyle = WALL_EDGE
              ctx.fillRect(x, y, tileSize, 2)
              ctx.fillStyle = WALL_DARK
              ctx.fillRect(x, y + tileSize - 2, tileSize, 2)
              ctx.fillStyle = WALL_DARK
              ctx.fillRect(x + tileSize - 2, y, 2, tileSize)
              ctx.fillStyle = WALL_EDGE
              ctx.fillRect(x, y, 2, tileSize)
            }
            // 非 adjacentFloor 的墙 = 背景暗区，不绘制（节省性能）
          }
        }
      }

      // 出口楼梯
      if (dungeon.exitPoint) {
        drawDungeonSprite(ctx, dungeonSpriteSheet, 23, dungeon.exitPoint.x, dungeon.exitPoint.y, tileSize)
      }
    } else if (dungeon && dungeon.rooms) {
      // Fallback：无碰撞网格时用房间矩形渲染
      const tileSize = 32
      const FLOOR_COLOR = '#3A2E2C'
      const FLOOR_GRID = '#504440'

      for (const room of dungeon.rooms) {
        ctx.fillStyle = FLOOR_COLOR
        ctx.fillRect(room.x, room.y, room.width, room.height)
        ctx.strokeStyle = FLOOR_GRID
        ctx.lineWidth = 1
        for (let x = room.x; x <= room.x + room.width; x += tileSize) {
          ctx.beginPath(); ctx.moveTo(x, room.y); ctx.lineTo(x, room.y + room.height); ctx.stroke()
        }
        for (let y = room.y; y <= room.y + room.height; y += tileSize) {
          ctx.beginPath(); ctx.moveTo(room.x, y); ctx.lineTo(room.x + room.width, y); ctx.stroke()
        }
      }
      if (dungeon.corridorTiles) {
        for (const tile of dungeon.corridorTiles) {
          ctx.fillStyle = FLOOR_COLOR
          ctx.fillRect(tile.x - tileSize / 2, tile.y - tileSize / 2, tileSize, tileSize)
          ctx.strokeStyle = FLOOR_GRID
          ctx.lineWidth = 1
          ctx.strokeRect(tile.x - tileSize / 2, tile.y - tileSize / 2, tileSize, tileSize)
        }
      }
      if (dungeon.exitPoint) {
        drawDungeonSprite(ctx, dungeonSpriteSheet, 23, dungeon.exitPoint.x, dungeon.exitPoint.y, tileSize)
      }
    } else {
      // 备用：简单网格（无地牢数据时）
      ctx.strokeStyle = '#3D2B3E'
      ctx.lineWidth = 1
      for (let x = 0; x < canvas.width; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke()
      }
      for (let y = 0; y < canvas.height; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke()
      }
    }

    // 绘制道具
    for (const item of items) {
      const itemConfig = ITEMS[item.type] || ITEMS.health
      // 优先使用0x72精灵，否则使用Kenney
      const itemSize = getSpriteEntry(itemConfig.spriteName ?? '')?.size ?? 28
      if (spritesLoaded && tileset2Atlas.complete && is0x72Sprite(itemConfig.spriteName ?? '')) {
        const animSprite = getAnimSprite(itemConfig.spriteName ?? '', performance.now() - lastAnimTime.current)
        draw0x72Sprite(ctx, tileset2Atlas, animSprite, item.x, item.y, itemSize)
      } else if (spritesLoaded && dungeonSpriteSheet.complete) {
        drawDungeonSprite(ctx, dungeonSpriteSheet, itemConfig.spriteIndex, item.x, item.y, itemSize)
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
      const epos = getRenderPos(enemy.id, enemy.x, enemy.y)

      // 检测新进入死亡状态的敌人，生成粒子
      const isDying = enemy.state === 'dying'
      if (isDying && !prevDyingRef.current.has(enemy.id)) {
        // 新进入死亡状态，生成粒子
        prevDyingRef.current.add(enemy.id)
        spawnDeathParticles(enemy.x, enemy.y, enemyConfig.color)
      } else if (!isDying && prevDyingRef.current.has(enemy.id)) {
        // 敌人复活或完全死亡，清除记录
        prevDyingRef.current.delete(enemy.id)
      }

      // 死亡动画：闪烁 + 淡出效果
      if (isDying) {
        const deathProgress = 1 - (enemy.deathTimer || 0) / 500 // 0~1，1是完全透明
        const flash = Math.sin(performance.now() / 50) * 0.3 + 0.7 // 闪烁效果
        ctx.globalAlpha = Math.max(0, 1 - deathProgress) * flash
      }

      if (spritesLoaded) {
        // 优先使用0x72精灵，否则回退到Kenney
        if (tileset2Atlas.complete && is0x72Sprite(enemyConfig.spriteName ?? '')) {
          const animSprite = getAnimSprite(enemyConfig.spriteName ?? '', performance.now() - lastAnimTime.current)
          draw0x72Sprite(ctx, tileset2Atlas, animSprite, epos.x, epos.y, size)
        } else if (enemyConfig.sheet === 'sheet' && sheetSpriteSheet.complete) {
          drawSheetSprite(ctx, sheetSpriteSheet, enemyConfig.spriteIndex, epos.x, epos.y, size)
        } else if (enemyConfig.sheet === 'dungeon' && dungeonSpriteSheet.complete) {
          drawDungeonSprite(ctx, dungeonSpriteSheet, enemyConfig.spriteIndex, epos.x, epos.y, size)
        } else if (charSpriteSheet.complete) {
          drawCharacterSprite(ctx, charSpriteSheet, enemyConfig.spriteIndex, epos.x, epos.y, size)
        } else {
          ctx.fillStyle = enemyConfig.color
          ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
          ctx.strokeStyle = '#fff'
          ctx.lineWidth = 1
          ctx.strokeRect(epos.x - size/2, epos.y - size/2, size, size)
        }
      } else {
        ctx.fillStyle = enemyConfig.color
        ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(epos.x - size/2, epos.y - size/2, size, size)
      }

      // 死亡时红色滤镜
      if (isDying) {
        ctx.globalAlpha = 0.3
        ctx.fillStyle = '#FF0000'
        ctx.fillRect(epos.x - size/2, epos.y - size/2, size, size)
      }

      ctx.globalAlpha = 1

      // BOSS皇冠
      if (enemyConfig.isBoss) {
        drawBossCrown(ctx, epos.x, epos.y - size/2 - 10, 16)
      }

      // HP条（死亡状态不显示）
      if (!isDying) {
        const hpBarWidth = enemyConfig.isBoss ? 64 : size * 1.5
        const hpBarHeight = enemyConfig.isBoss ? 8 : 6
        drawHPBar(
        ctx,
        epos.x - hpBarWidth/2,
        epos.y - size/2 - (enemyConfig.isBoss ? 20 : 14),
        hpBarWidth,
        hpBarHeight,
        enemy.hp,
        enemy.hpMax,
        enemyConfig.isBoss ? '#FFD700' : '#DC143C'
      )
      }
    }

    // 绘制死亡粒子特效
    updateAndDrawParticles(ctx)

    // 绘制伤害飘字
    updateAndDrawDamageTexts(ctx)

    // 绘制子弹
    const BULLET_COLORS: Record<string, string> = {
      warrior: '#FFD700',
      ranger:  '#4A9EFF',
      mage:    '#9B59B6',
      cleric:  '#32CD32'
    }

    // 职业武器配置（用于可视化）
    const WEAPON_SPRITE: Record<string, string> = {
      warrior: 'weapon_knight_sword',   // 骑士长剑
      ranger:  'weapon_bow',            // 弓（修正：不用arrow）
      mage:    'weapon_red_magic_staff', // 红色魔杖
      cleric:  'weapon_red_magic_staff', // 牧师魔法杖
    }

    for (const bullet of bullets) {
      // 发光效果（底色光晕）
      const color = bullet.friendly
        ? (BULLET_COLORS[bullet.ownerType] || '#4A9EFF')
        : '#FF6B6B'
      ctx.save()
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, bullet.radius || 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.restore()
      // 子弹精灵（0x72 weapon_arrow 旋转至飞行方向）
      if (tileset2Atlas.complete) {
        const bulletAngle = Math.atan2(bullet.vy, bullet.vx)
        const bulletSize = Math.max((bullet.radius || 4) * 3, 10)
        drawBulletSprite(ctx, tileset2Atlas, bullet.x, bullet.y, bulletAngle, bulletSize)
      }
    }

    // 绘制玩家
    for (const player of players) {
      const isLocal = player.id === user?.id
      const charConfig = CHARACTERS[player.characterType] || CHARACTERS.warrior
      const ppos = getRenderPos(player.id, player.x, player.y)
      const size = getSpriteEntry(charConfig.spriteName?.front ?? '')?.size ?? 48

      if (!player.alive) {
        // 死亡角色：灰色半透明精灵 + 坟墓标记
        ctx.globalAlpha = 0.4
        // 优先使用0x72精灵，否则使用Kenney
        if (spritesLoaded && tileset2Atlas.complete && is0x72Sprite(charConfig.spriteName?.front ?? '')) {
          draw0x72Sprite(ctx, tileset2Atlas, charConfig.spriteName?.front ?? '', ppos.x, ppos.y, size)
        } else if (spritesLoaded && charSpriteSheet.complete) {
          drawCharacterSprite(ctx, charSpriteSheet, charConfig.spriteIndex.front, ppos.x, ppos.y, size)
        } else {
          ctx.fillStyle = '#666'
          ctx.fillRect(ppos.x - size/2, ppos.y - size/2, size, size)
        }
        ctx.globalAlpha = 1.0

        // "已阵亡" 标记
        ctx.fillStyle = '#FF4444'
        ctx.font = 'bold 11px "Courier New", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('☠ 已阵亡', ppos.x, ppos.y - 30)
        drawNameTag(ctx, ppos.x, ppos.y - 44, player.name, '#888')
        continue
      }

      // 根据朝向选择精灵（角色只有正面+背面，左右通过翻转实现）
      let spriteIndex = charConfig.spriteIndex.front
      let spriteName = charConfig.spriteName?.front
      let flipH = false
      if (player.angle !== undefined) {
        const angle = player.angle
        if (angle > Math.PI/4 && angle <= 3*Math.PI/4) {
          // 朝上 → 背面
          spriteIndex = charConfig.spriteIndex.back
          spriteName = charConfig.spriteName?.back
        } else if (angle > -Math.PI/4 && angle <= Math.PI/4) {
          // 朝右 → 正面 + 翻转
          spriteIndex = charConfig.spriteIndex.front
          spriteName = charConfig.spriteName?.front
          flipH = true
        } else if (angle > 3*Math.PI/4 || angle <= -3*Math.PI/4) {
          // 朝左 → 正面
          spriteIndex = charConfig.spriteIndex.front
          spriteName = charConfig.spriteName?.front
        } else {
          // 朝下 → 正面
          spriteIndex = charConfig.spriteIndex.front
          spriteName = charConfig.spriteName?.front
        }
      }

      // 优先使用0x72精灵，否则使用Kenney
      if (spritesLoaded && tileset2Atlas.complete && is0x72Sprite(spriteName ?? '')) {
        const animSprite = getAnimSprite(spriteName ?? '', performance.now() - lastAnimTime.current)
        if (flipH) {
          ctx.save()
          ctx.scale(-1, 1)
          draw0x72Sprite(ctx, tileset2Atlas, animSprite, -ppos.x, ppos.y, size)
          ctx.restore()
        } else {
          draw0x72Sprite(ctx, tileset2Atlas, animSprite, ppos.x, ppos.y, size)
        }
      } else if (spritesLoaded && charSpriteSheet.complete) {
        if (flipH) {
          ctx.save()
          ctx.scale(-1, 1)
          drawCharacterSprite(ctx, charSpriteSheet, spriteIndex, -ppos.x, ppos.y, size)
          ctx.restore()
        } else {
          drawCharacterSprite(ctx, charSpriteSheet, spriteIndex, ppos.x, ppos.y, size)
        }
      } else {
        ctx.fillStyle = charConfig.color
        ctx.fillRect(ppos.x - size/2, ppos.y - size/2, size, size)
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1
        ctx.strokeRect(ppos.x - size/2, ppos.y - size/2, size, size)
      }

      // 武器可视化（0x72 真实贴图，旋转至鼠标方向，攻击时闪光+前伸）
      const pAngle = player.angle ?? 0
      const wSprite = WEAPON_SPRITE[player.characterType] || 'weapon_knight_sword'
      if (tileset2Atlas.complete) {
        drawWeaponSprite(ctx, tileset2Atlas, wSprite, ppos.x, ppos.y, pAngle, 48, isLocal ? attackFlashRef.current : 0)
      }

      // HP条
      drawHPBar(ctx, ppos.x - 24, ppos.y - 34, 48, 6, player.hp, player.hpMax, charConfig.color)

      // 名称
      drawNameTag(ctx, ppos.x, ppos.y - 40, player.name, charConfig.color)
    }
  }, [user, spritesLoaded])

  // Game loop
  useEffect(() => {
    if (isPaused || isGameOver) return

    let lastInputTime = 0
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

      // atan2(0,0) = 0，会导致角色固定朝右；始终使用 Math.atan2 不做回退
      const rawDx = mouseRef.current.x - localPlayer.x
      const rawDy = mouseRef.current.y - localPlayer.y
      const angle = Math.atan2(rawDy, rawDx)

      // 每帧都发送 input，节流 ~30fps；angle 只在变化超过 5° 时更新（避免微小抖动）
      const now = performance.now()
      if (now - lastInputTime >= 33) {
        const angleChanged = lastSentAngleRef.current === null || Math.abs(angle - lastSentAngleRef.current) > 0.087
        if (angleChanged) lastSentAngleRef.current = angle
        lastInputTime = now
        networkClient.emit('game:input', { dx, dy, angle, attack: mouseRef.current.down })
      }

      // 攻击闪光：检测攻击按下（rising edge），激活闪光并逐渐衰减
      const isAttacking = mouseRef.current.down
      if (isAttacking && !prevAttackRef.current) {
        attackFlashRef.current = 1.0  // 攻击瞬间设为满闪光
      }
      prevAttackRef.current = isAttacking
      // 攻击持续期间保持一定闪光，松开后快速衰减
      if (isAttacking) {
        attackFlashRef.current = Math.max(attackFlashRef.current, 0.5)
      } else {
        attackFlashRef.current = Math.max(0, attackFlashRef.current - 0.08)
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
    // 通知服务器离开房间，停止旧游戏实例的 tick 广播
    networkClient.emit('room:leave')
    // 重置 session 计数器，确保下次进入游戏时第一帧建立新基准
    floorSessionRef.current = 0
    gameSessionRef.current = 0
    prevPositions.current.clear()
    targetPositions.current.clear()
    reset()
    navigate('/lobby')
  }

  const handleReturnToRoom = () => {
    // 返回房间页面（不通知服务器离开房间，游戏已结束）
    floorSessionRef.current = 0
    gameSessionRef.current = 0
    prevPositions.current.clear()
    targetPositions.current.clear()
    reset()
    navigate(`/room/${roomId}`)
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
        width={1024}
        height={768}
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
          <div style={{ display: 'flex', gap: 16 }}>
            <button onClick={handleReturnToRoom} className="btn-pixel" style={{ background: 'var(--pixel-green)', minWidth: 160 }}>
              [ 返回房间 ]
            </button>
            <button onClick={handleExit} className="btn-pixel" style={{ background: 'var(--pixel-brown)', minWidth: 160 }}>
              [ 返回大厅 ]
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
