# Roguelike UI 翻新实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Roguelike 游戏创建像素复古风格的 UI 和图片资源

**Architecture:** 基于 React + Canvas 的前端项目，使用 CSS 变量管理设计系统，Canvas 绘制游戏画面。UI 组件翻新使用 CSS + 图片资源，游戏元素使用 Canvas 像素精灵图。

**Tech Stack:** React 18, TypeScript, Canvas API, CSS Variables, Pencil MCP (设计工具)

---

## 文件结构概览

```
src/
├── index.css                    # 全局样式（扩展 CSS 变量）
├── assets/
│   └── images/
│       ├── ui/                  # UI 资源目录
│       │   ├── logo.svg         # 游戏 Logo
│       │   ├── crown.svg        # 皇冠图标
│       │   ├── refresh.svg      # 刷新图标
│       │   ├── plus.svg         # 加号图标
│       │   ├── player-slot-bg.svg  # 玩家槽位背景
│       │   └── pixel-border.png # 像素边框瓦片
│       ├── characters/          # 角色精灵图
│       │   ├── player-blue.png  # 32x32 玩家1
│       │   ├── player-green.png # 32x32 玩家2
│       │   ├── player-orange.png # 32x32 玩家3
│       │   └── player-purple.png # 32x32 玩家4
│       ├── enemies/             # 敌人精灵图
│       │   ├── enemy-basic.png  # 32x32 普通敌人
│       │   ├── enemy-fast.png  # 32x32 快速敌人
│       │   ├── enemy-tank.png   # 32x32 坦克敌人
│       │   └── enemy-boss.png   # 48x48 Boss
│       ├── items/               # 道具图标
│       │   ├── health-pack.png  # 16x16 血包
│       │   ├── coin.png         # 16x16 金币
│       │   └── bullet-friendly.png # 8x8 玩家子弹
│       ├── tiles/               # 地牢瓦片
│       │   ├── floor.png        # 32x32 地板
│       │   └── wall.png         # 32x32 墙壁
│       └── skills/              # 技能图标
│           ├── skill-sword.png  # 16x16 近战
│           ├── skill-shield.png # 16x16 防御
│           ├── skill-arrow.png  # 16x16 远程
│           └── skill-potion.png # 16x16 治疗
├── pages/
│   ├── LoginPage.tsx            # 登录页（翻新）
│   ├── LobbyPage.tsx           # 大厅页（翻新）
│   ├── RoomPage.tsx            # 房间页（翻新）
│   └── GamePage.tsx            # 游戏页（翻新 HUD + Canvas）
└── components/                  # 公共组件目录（新建）
    └── PixelCard.tsx           # 像素风格卡片组件
```

---

## 任务分解

### Phase 1: UI 基础

#### Task 1: 扩展 CSS 变量和全局样式

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: 添加像素风格 CSS 变量**

在 `src/index.css` 的 `:root` 中添加：

```css
:root {
  /* 现有变量保持不变 */
  --primary: #4a9eff;
  --secondary: #ff6b6b;
  --success: #51cf66;
  --warning: #ffd43b;
  --danger: #ff6b6b;
  --bg-dark: #1a1a2e;
  --bg-darker: #16213e;
  --bg-card: #0f3460;
  --text: #eee;
  --text-muted: #888;

  /* 新增：像素风格变量 */
  --pixel-border: 4px;
  --pixel-corner: 0px; /* 像素风格使用尖角 */

  /* 像素调色板 */
  --pixel-bg: #2D1B2E;        /* 深紫黑背景 */
  --pixel-brown: #8B4513;     /* 棕色石墙 */
  --pixel-gold: #FFD700;      /* 金色宝藏 */
  --pixel-red: #DC143C;       /* 深红敌人 */
  --pixel-green: #32CD32;     /* 草绿生命 */

  /* 玩家标识色 */
  --player-1: #4A9EFF;
  --player-2: #51CF66;
  --player-3: #FFA500;
  --player-4: #9B59B6;
}
```

- [ ] **Step 2: 添加像素风格按钮样式**

在 `index.css` 末尾添加：

```css
/* 像素风格按钮 */
.btn-pixel {
  background: var(--primary);
  color: white;
  border: var(--pixel-border) solid #fff;
  padding: 12px 24px;
  font-family: 'Courier New', monospace;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.1s;
  box-shadow:
    4px 4px 0 rgba(0,0,0,0.5),
    inset -2px -2px 0 rgba(0,0,0,0.2),
    inset 2px 2px 0 rgba(255,255,255,0.1);
}

.btn-pixel:hover {
  transform: translate(-2px, -2px);
  box-shadow:
    6px 6px 0 rgba(0,0,0,0.5),
    inset -2px -2px 0 rgba(0,0,0,0.2),
    inset 2px 2px 0 rgba(255,255,255,0.1);
}

.btn-pixel:active {
  transform: translate(2px, 2px);
  box-shadow:
    2px 2px 0 rgba(0,0,0,0.5),
    inset -2px -2px 0 rgba(0,0,0,0.2),
    inset 2px 2px 0 rgba(255,255,255,0.1);
}

.btn-pixel.btn-secondary {
  background: var(--pixel-brown);
}

.btn-pixel.btn-danger {
  background: var(--danger);
}

.btn-pixel.btn-success {
  background: var(--success);
}
```

- [ ] **Step 3: 添加像素风格卡片样式**

在 `index.css` 末尾添加：

```css
/* 像素风格卡片 */
.card-pixel {
  background: var(--bg-card);
  border: var(--pixel-border) solid #fff;
  padding: 20px;
  box-shadow:
    6px 6px 0 rgba(0,0,0,0.5),
    inset 0 0 20px rgba(0,0,0,0.3);
  image-rendering: pixelated;
}
```

- [ ] **Step 4: 添加像素边框输入框样式**

在 `index.css` 末尾添加：

```css
/* 像素风格输入框 */
.input-pixel {
  background: var(--bg-darker);
  border: var(--pixel-border) solid var(--pixel-brown);
  color: var(--text);
  padding: 12px 16px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  width: 100%;
  box-shadow: inset 2px 2px 0 rgba(0,0,0,0.3);
}

.input-pixel:focus {
  outline: none;
  border-color: var(--pixel-gold);
  box-shadow:
    inset 2px 2px 0 rgba(0,0,0,0.3),
    0 0 10px rgba(255, 215, 0, 0.3);
}
```

- [ ] **Step 5: 提交 CSS 基础样式**

```bash
git add src/index.css
git commit -m "feat(ui): add pixel art CSS variables and styles"
```

---

#### Task 2: 创建像素风格图片资源

**Files:**
- Create: `src/assets/images/ui/` (目录)
- Create: `src/assets/images/characters/` (目录)
- Create: `src/assets/images/enemies/` (目录)
- Create: `src/assets/images/items/` (目录)
- Create: `src/assets/images/tiles/` (目录)
- Create: `src/assets/images/skills/` (目录)

- [ ] **Step 1: 使用 Pencil MCP 创建设计稿**

在 Pencil 中创建像素设计稿：

1. **UI 资源** (32x32)
   - logo-icon - 剑与盾图标
   - crown-icon (16x16) - 皇冠图标
   - refresh-icon (16x16) - 刷新图标
   - plus-icon (16x16) - 加号图标
   - player-slot-bg (32x32) - 玩家槽位背景

2. **角色** (32x32)
   - player-blue, player-green, player-orange, player-purple

3. **敌人** (32x32 / 48x48 boss)
   - enemy-basic, enemy-fast, enemy-tank, enemy-boss

4. **道具** (16x16 / 8x8)
   - health-pack, coin, bullet-friendly

5. **瓦片** (32x32)
   - floor, wall

6. **技能** (16x16)
   - skill-sword, skill-shield, skill-arrow, skill-potion

- [ ] **Step 2: 导出 PNG 资源**

使用 Pencil 导出为 PNG：

```
导出设置：
- 格式：PNG
- 缩放：1x (保持原始像素尺寸)
- 背景：透明
```

- [ ] **Step 3: 保存到 assets 目录**

将导出的图片保存到对应的 `src/assets/images/` 子目录

- [ ] **Step 4: 提交资源文件**

```bash
git add src/assets/
git commit -m "feat(assets): add pixel art image resources"
```

---

#### Task 3: 翻新登录页面 (LoginPage)

**Files:**
- Modify: `src/pages/LoginPage.tsx`

- [ ] **Step 1: 更新 LoginPage.tsx 使用新样式**

替换现有的 `src/pages/LoginPage.tsx` 内容：

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { networkClient } from '../network/socket'

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const event = isRegister ? 'auth:register' : 'auth:login'

      if (!networkClient.isConnected()) {
        networkClient.connect()
        await new Promise<void>((resolve) => {
          const socket = networkClient.getSocket()
          if (socket?.connected) {
            resolve()
          } else {
            socket?.once('connect', () => resolve())
          }
        })
      }

      const result = await new Promise<any>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ success: false, error: 'Timeout' })
        }, 5000)

        const handler = (data: any) => {
          clearTimeout(timeout)
          networkClient.off('auth:result', handler)
          resolve(data)
        }

        networkClient.on('auth:result', handler)
        networkClient.emit(event, { username, password })
      })

      if (result.success) {
        setAuth(result.user, result.token)
        navigate('/lobby')
      } else {
        setError(result.error === 'USERNAME_EXISTS' ? '用户名已存在' : '登录失败')
      }
    } catch (err) {
      setError('连接失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page" style={{ background: 'var(--pixel-bg)' }}>
      {/* Logo */}
      <div style={{
        width: 64,
        height: 64,
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 48,
        filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))'
      }}>
        ⚔️
      </div>

      <h1 className="page-title" style={{
        fontFamily: 'Courier New, monospace',
        textShadow: '4px 4px 0 rgba(0,0,0,0.5), 0 0 20px rgba(74, 158, 255, 0.5)'
      }}>
        ROGUELIKE
      </h1>

      <div className="card-pixel" style={{ width: 320 }}>
        <h2 style={{
          marginBottom: 20,
          textAlign: 'center',
          fontFamily: 'Courier New, monospace',
          color: 'var(--pixel-gold)'
        }}>
          {isRegister ? '[ 注册 ]' : '[ 登录 ]'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 15 }}>
            <label style={{
              display: 'block',
              marginBottom: 5,
              color: 'var(--pixel-brown)',
              fontWeight: 'bold',
              fontSize: 12,
              textTransform: 'uppercase'
            }}>
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入用户名"
              required
              minLength={3}
              maxLength={20}
              className="input-pixel"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              marginBottom: 5,
              color: 'var(--pixel-brown)',
              fontWeight: 'bold',
              fontSize: 12,
              textTransform: 'uppercase'
            }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入密码"
              required
              minLength={6}
              className="input-pixel"
            />
          </div>

          {error && (
            <div style={{
              color: 'var(--danger)',
              marginBottom: 15,
              textAlign: 'center',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              fontSize: 12
            }}>
              ! {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-pixel" style={{ width: '100%' }}>
            {loading ? '>>> 处理中 <<<' : (isRegister ? '>>> 注册 <<<' : '>>> 登录 <<<')}
          </button>
        </form>

        <div style={{ marginTop: 15, textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="btn-pixel btn-secondary"
            style={{ background: 'transparent', color: 'var(--pixel-gold)' }}
          >
            {isRegister ? '>>> 已有账号？登录 <<<' : '>>> 没有账号？注册 <<<'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 更新 .page 样式背景**

在 `index.css` 中更新 `.page` 样式：

```css
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 20px;
}
```

- [ ] **Step 3: 提交登录页面翻新**

```bash
git add src/pages/LoginPage.tsx
git commit -m "feat(ui): revamp LoginPage with pixel art style"
```

---

#### Task 4: 翻新大厅页面 (LobbyPage)

**Files:**
- Modify: `src/pages/LobbyPage.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: 更新 LobbyPage.tsx 使用新样式**

替换现有的 `src/pages/LobbyPage.tsx` 内容：

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useLobbyStore } from '../store/useLobbyStore'
import { networkClient } from '../network/socket'

export default function LobbyPage() {
  const { user, logout } = useAuthStore()
  const { rooms, setRooms, addRoom, updateRoom, removeRoom } = useLobbyStore()
  const [showCreate, setShowCreate] = useState(false)
  const [roomName, setRoomName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!networkClient.isConnected()) {
      networkClient.connect()
    }

    const setup = () => {
      networkClient.emit('lobby:list')

      networkClient.on('lobby:list:result', (data: any) => {
        setRooms(data.rooms)
      })

      networkClient.on('room:create:result', (data: any) => {
        if (data.success) {
          navigate(`/room/${data.room.id}`)
        }
      })
    }

    if (networkClient.isConnected()) {
      setup()
    } else {
      networkClient.getSocket()?.once('connect', setup)
    }

    return () => {
      networkClient.off('lobby:list:result')
      networkClient.off('room:create:result')
    }
  }, [])

  const handleCreateRoom = () => {
    if (!roomName.trim()) return
    if (!networkClient.isConnected()) {
      alert('正在连接服务器，请稍后...')
      return
    }
    networkClient.emit('room:create', { name: roomName })
    setShowCreate(false)
    setRoomName('')
  }

  const handleJoinRoom = (roomId: string) => {
    navigate(`/room/${roomId}`)
  }

  const handleLogout = () => {
    networkClient.emit('auth:logout')
    networkClient.disconnect()
    logout()
    navigate('/login')
  }

  const handleRefresh = () => {
    networkClient.emit('lobby:list')
  }

  return (
    <div style={{
      minHeight: '100vh',
      padding: 20,
      background: 'var(--pixel-bg)'
    }}>
      {/* Header */}
      <header className="card-pixel" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <span style={{ fontSize: 32, filter: 'drop-shadow(0 0 10px rgba(255, 215, 0, 0.5))' }}>⚔️</span>
          <div>
            <h1 style={{
              fontSize: 24,
              color: 'var(--pixel-gold)',
              fontFamily: 'Courier New, monospace',
              textShadow: '2px 2px 0 rgba(0,0,0,0.5)'
            }}>
              [ 大厅 ]
            </h1>
            <p style={{ color: 'var(--pixel-brown)', marginTop: 5, fontSize: 12 }}>
              欢迎, {user?.username} | {user?.character?.name || '无角色'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleRefresh} className="btn-pixel btn-secondary">🔄 刷新</button>
          <button onClick={() => setShowCreate(true)} className="btn-pixel">+ 创建</button>
          <button onClick={handleLogout} className="btn-pixel btn-danger">登出</button>
        </div>
      </header>

      {/* Create Room Modal */}
      {showCreate && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="card-pixel" style={{ width: 350 }}>
            <h3 style={{
              marginBottom: 20,
              color: 'var(--pixel-gold)',
              fontFamily: 'Courier New, monospace'
            }}>
              [ 创建房间 ]
            </h3>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="房间名称"
              className="input-pixel"
              style={{ marginBottom: 15 }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                className="btn-pixel btn-secondary"
              >取消</button>
              <button onClick={handleCreateRoom} className="btn-pixel">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Room List */}
      <div className="card-pixel">
        <h2 style={{
          marginBottom: 20,
          color: 'var(--text)',
          fontFamily: 'Courier New, monospace'
        }}>
          房间列表
        </h2>

        {rooms.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 40,
            color: 'var(--pixel-brown)',
            fontFamily: 'Courier New, monospace'
          }}>
            <p style={{ fontSize: 24, marginBottom: 10 }}>🏰</p>
            <p>暂无房间，创建一个开始冒险吧！</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {rooms.map((room) => (
              <div
                key={room.id}
                className="card-pixel"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.1s',
                  borderColor: room.status === 'waiting' ? 'var(--success)' : 'var(--warning)'
                }}
                onClick={() => handleJoinRoom(room.id)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translate(-2px, -2px)'
                  e.currentTarget.style.boxShadow = '8px 8px 0 rgba(0,0,0,0.5)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'none'
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{
                      fontWeight: 'bold',
                      marginBottom: 5,
                      color: 'var(--text)',
                      fontFamily: 'Courier New, monospace'
                    }}>
                      {room.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--pixel-brown)' }}>
                      👑 {room.hostName} | 👥 {room.players.length}/{room.maxPlayers}
                    </div>
                  </div>
                  <div style={{
                    padding: '5px 15px',
                    background: room.status === 'waiting' ? 'var(--success)' : 'var(--warning)',
                    color: '#000',
                    borderRadius: 0,
                    fontSize: 12,
                    fontWeight: 'bold',
                    fontFamily: 'Courier New, monospace',
                    border: '2px solid #fff'
                  }}>
                    {room.status === 'waiting' ? '[ 等待中 ]' : '[ 游戏中 ]'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交大厅页面翻新**

```bash
git add src/pages/LobbyPage.tsx
git commit -m "feat(ui): revamp LobbyPage with pixel art style"
```

---

#### Task 5: 翻新房间页面 (RoomPage)

**Files:**
- Modify: `src/pages/RoomPage.tsx`

- [ ] **Step 1: 更新 RoomPage.tsx 使用新样式**

替换现有的 `src/pages/RoomPage.tsx` 内容：

```tsx
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useRoomStore } from '../store/useRoomStore'
import { networkClient } from '../network/socket'

const PLAYER_COLORS = {
  0: 'var(--player-1)',
  1: 'var(--player-2)',
  2: 'var(--player-3)',
  3: 'var(--player-4)'
}

const PLAYER_EMOJIS = {
  0: '🔵',
  1: '🟢',
  2: '🟠',
  3: '🟣'
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const { user } = useAuthStore()
  const {
    roomName,
    players,
    hostId,
    isHost,
    isReady,
    gameStarted,
    setRoom,
    removePlayer,
    setPlayerReady,
    setGameStarted,
    clearRoom,
    setReady
  } = useRoomStore()
  const navigate = useNavigate()

  useEffect(() => {
    const handleJoinPush = (data: any) => {
      if (data.room) {
        setRoom(roomId!, data.room, data.room.hostId === user?.id)
      }
    }

    const handleLeavePush = (data: any) => {
      removePlayer(data.playerId, data.newHostId)
    }

    const handleReadyPush = (data: any) => {
      setPlayerReady(data.playerId, data.ready)
    }

    const handleStartPush = (data: any) => {
      setGameStarted(true)
      navigate(`/game/${data.roomId}`)
    }

    const handleError = (data: any) => {
      alert(data.message)
      navigate('/lobby')
    }

    networkClient.on('room:join:push', handleJoinPush)
    networkClient.on('room:leave:push', handleLeavePush)
    networkClient.on('room:ready:push', handleReadyPush)
    networkClient.on('room:start:push', handleStartPush)
    networkClient.on('room:error', handleError)

    if (networkClient.isConnected()) {
      networkClient.emit('room:join', { roomId })
    } else {
      networkClient.getSocket()?.once('connect', () => {
        networkClient.emit('room:join', { roomId })
      })
    }

    return () => {
      networkClient.off('room:join:push', handleJoinPush)
      networkClient.off('room:leave:push', handleLeavePush)
      networkClient.off('room:ready:push', handleReadyPush)
      networkClient.off('room:start:push', handleStartPush)
      networkClient.off('room:error', handleError)
      clearRoom()
    }
  }, [roomId])

  const handleLeave = () => {
    networkClient.emit('room:leave')
    navigate('/lobby')
  }

  const handleReady = () => {
    const newReady = !isReady
    setReady(newReady)
    networkClient.emit('room:ready', { ready: newReady })
  }

  const handleStart = () => {
    networkClient.emit('room:start')
  }

  const allReady = players.length > 0 && players.every(p => p.ready)

  return (
    <div className="page" style={{ background: 'var(--pixel-bg)' }}>
      <div className="card-pixel" style={{ width: 500 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{
            color: 'var(--pixel-gold)',
            fontFamily: 'Courier New, monospace',
            textShadow: '2px 2px 0 rgba(0,0,0,0.5)'
          }}>
            [ {roomName || '房间'} ]
          </h2>
          <button onClick={handleLeave} className="btn-pixel btn-secondary">离开</button>
        </div>

        {/* Player List */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{
            marginBottom: 10,
            color: 'var(--pixel-brown)',
            fontFamily: 'Courier New, monospace',
            fontSize: 14
          }}>
            === 玩家列表 ===
          </h3>
          <div style={{ display: 'grid', gap: 10 }}>
            {[0, 1, 2, 3].map((i) => {
              const player = players[i]
              const color = PLAYER_COLORS[i as keyof typeof PLAYER_COLORS]
              const emoji = PLAYER_EMOJIS[i as keyof typeof PLAYER_EMOJIS]
              const isLocalPlayer = player?.id === user?.id

              return (
                <div
                  key={i}
                  className="card-pixel"
                  style={{
                    padding: 12,
                    borderColor: player ? color : 'transparent',
                    borderWidth: player ? 3 : 0,
                    boxShadow: isLocalPlayer ? `0 0 15px ${color}` : undefined
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{player ? emoji : '❓'}</span>
                      <div>
                        <span style={{
                          color: player ? 'var(--text)' : '#555',
                          fontFamily: 'Courier New, monospace',
                          fontWeight: player ? 'bold' : 'normal'
                        }}>
                          {player?.name || '等待加入...'}
                        </span>
                        {player && player.id === hostId && (
                          <span style={{ marginLeft: 8, fontSize: 12 }}>👑</span>
                        )}
                      </div>
                    </div>
                    {player && (
                      <div style={{
                        padding: '3px 10px',
                        background: player.ready ? 'var(--success)' : '#555',
                        color: '#fff',
                        borderRadius: 0,
                        fontSize: 11,
                        fontFamily: 'Courier New, monospace',
                        border: '2px solid #fff',
                        textTransform: 'uppercase'
                      }}>
                        {player.ready ? '[ 已准备 ]' : '[ 未准备 ]'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={handleReady}
            className={`btn-pixel ${isReady ? 'btn-success' : ''}`}
            style={{ minWidth: 150 }}
          >
            {isReady ? '[ 取消准备 ]' : '[ 准备 ]'}
          </button>

          {isHost && (
            <button
              onClick={handleStart}
              disabled={!allReady}
              className="btn-pixel btn-success"
              style={{ minWidth: 150 }}
            >
              [ 开始游戏 ]
            </button>
          )}
        </div>

        {!isHost && !allReady && players.length > 1 && (
          <p style={{
            textAlign: 'center',
            marginTop: 10,
            color: 'var(--pixel-brown)',
            fontSize: 12,
            fontFamily: 'Courier New, monospace'
          }}>
            等待房主开始游戏...
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 提交房间页面翻新**

```bash
git add src/pages/RoomPage.tsx
git commit -m "feat(ui): revamp RoomPage with pixel art style"
```

---

### Phase 2: 游戏视觉

#### Task 6: 翻新游戏页面 HUD (GamePage)

**Files:**
- Modify: `src/pages/GamePage.tsx`

- [ ] **Step 1: 更新 GamePage.tsx 的 HUD 样式**

更新 `GamePage.tsx` 中的 HUD 部分样式：

```tsx
// 在 GamePage.tsx 的 return 部分，找到 HUD 相关代码并替换：

// HUD 容器更新
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
```

- [ ] **Step 2: 更新 Canvas 边框样式**

更新 canvas 的 style：

```tsx
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
```

- [ ] **Step 3: 更新控制提示样式**

```tsx
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
```

- [ ] **Step 4: 更新暂停和结束界面样式**

更新暂停覆盖层：

```tsx
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
```

更新游戏结束覆盖层：

```tsx
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
```

- [ ] **Step 5: 提交游戏页面翻新**

```bash
git add src/pages/GamePage.tsx
git commit -m "feat(ui): revamp GamePage HUD with pixel art style"
```

---

#### Task 7: 创建像素风格卡片组件

**Files:**
- Create: `src/components/PixelCard.tsx`

- [ ] **Step 1: 创建 PixelCard 组件**

```tsx
import React from 'react'

interface PixelCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  borderColor?: string
}

export default function PixelCard({
  children,
  className = '',
  style = {},
  borderColor = '#fff'
}: PixelCardProps) {
  return (
    <div
      className={`card-pixel ${className}`}
      style={{
        borderColor: borderColor,
        ...style
      }}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 2: 提交组件**

```bash
git add src/components/PixelCard.tsx
git commit -m "feat(ui): add PixelCard component"
```

---

### Phase 3: 完善

#### Task 8: 更新 Canvas 渲染使用像素精灵图

**Files:**
- Modify: `src/pages/GamePage.tsx`

- [ ] **Step 1: 导入图片资源**

在 `GamePage.tsx` 顶部添加：

```tsx
// 导入像素精灵图（后续资源就位后启用）
// import playerBlueImg from '../assets/images/characters/player-blue.png'
// import enemyBasicImg from '../assets/images/enemies/enemy-basic.png'
// import healthPackImg from '../assets/images/items/health-pack.png'

// 暂时使用纯色圆形绘制，后续替换为精灵图
```

- [ ] **Step 2: 创建图片对象（待资源就位）**

在组件内添加：

```tsx
// 图片缓存
const imagesRef = useRef<{ [key: string]: HTMLImageElement }>({})

useEffect(() => {
  // 预加载图片（资源就位后启用）
  // const loadImage = (src: string, key: string) => {
  //   const img = new Image()
  //   img.src = src
  //   img.onload = () => {
  //     imagesRef.current[key] = img
  //   }
  // }
  // loadImage(playerBlueImg, 'player-blue')
}, [])
```

- [ ] **Step 3: 更新渲染函数绘制像素风格**

更新 render 函数中的绘制代码：

```tsx
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
```

- [ ] **Step 2: 提交 Canvas 渲染更新**

```bash
git add src/pages/GamePage.tsx
git commit -m "feat(game): update canvas rendering with pixel art style"
```

---

## 验证清单

完成所有任务后，执行以下验证：

- [ ] 登录页面显示正确，卡片有像素边框
- [ ] 大厅页面显示房间列表，状态标签颜色正确
- [ ] 房间页面显示4个玩家槽位，颜色区分正确
- [ ] 游戏页面 Canvas 背景变为深紫黑色，网格为32px
- [ ] 游戏内敌人显示为像素方块
- [ ] HUD 显示楼层、玩家数、敌人数量
- [ ] 暂停和结束界面显示像素风格按钮
- [ ] 所有按钮有悬停效果

---

## 相关文档

- 设计规范: `docs/superpowers/specs/2026-03-27-roguelike-ui-design.md`

---

*创建时间：2026-03-27*
*状态：待实施*
