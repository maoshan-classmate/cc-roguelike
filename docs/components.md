# 像素风格组件库

> 入口文件：`src/components/pixel/index.ts`
> 设计稿：`docs/superpowers/specs/2026-04-01-pixel-component-library-design.md`

## 组件索引

### Atoms（原子组件）

| 组件 | 文件 | 说明 |
|------|------|------|
| `PixelButton` | `PixelButton.tsx` | 5 种变体 + glow 效果 |
| `PixelInput` | `PixelInput.tsx` | 像素风格输入框 |
| `PixelBadge` | `PixelBadge.tsx` | 状态徽章（waiting/ready/playing） |
| `PixelProgress` | `PixelProgress.tsx` | HP/SP/EXP 进度条 |

### Molecules（分子组件）

| 组件 | 文件 | 说明 |
|------|------|------|
| `PixelCard` | `PixelCard.tsx` | 带 glow 变体的卡片容器 |
| `PixelPanel` | `PixelPanel.tsx` | 带边框装饰的面板 |
| `PixelPlayerSlot` | `PixelPlayerSlot.tsx` | 玩家槽位（头像+状态） |
| `PixelHeader` | `PixelHeader.tsx` | 页面顶栏 |

### Organisms（有机组件）

| 组件 | 文件 | 说明 |
|------|------|------|
| `PixelRoomCard` | `PixelRoomCard.tsx` | 房间卡片 |
| `PixelPageContainer` | `PixelPageContainer.tsx` | 页面框架容器 |

## 核心 API

### PixelButton

```tsx
import { PixelButton } from '../components/pixel'

<PixelButton
  variant="primary" | "secondary" | "danger" | "success" | "gold"
  glow="gold" | "green" | "none"
  disabled?
  onClick?
  type="button" | "submit" | "reset"
/>
```

**CSS 类映射**（必须正确）：
- `variant="gold"` → `className="btn-pixel btn-gold"`（金色背景 `var(--pixel-gold)`，深紫文字）
- `variant="primary"` → `className="btn-pixel"`（蓝色背景 `var(--primary)`）

**⚠️ 常发 Bug**：`variantClass['gold']` 必须是 `'btn-pixel btn-gold'`，不是只写 `'btn-pixel'`

### PixelCard

```tsx
import { PixelCard } from '../components/pixel'

<PixelCard glow="gold" | "green" | "none">
  {children}
</PixelCard>
```

**背景色**：`var(--pixel-bg)` 深紫黑 (#2D1B2E)

### PixelInput

```tsx
import { PixelInput } from '../components/pixel'

<PixelInput
  value={string}
  onChange={(e) => ...}
  placeholder?
  type="text" | "password"
  autoFocus?
  onKeyDown?
/>
```

### PixelBadge

```tsx
import { PixelBadge } from '../components/pixel'

<PixelBadge status="waiting" | "ready" | "playing">
  {children}
</PixelBadge>
```

### PixelProgress

```tsx
import { PixelProgress } from '../components/pixel'

<PixelProgress
  value={number}
  max={number}
  type="hp" | "mp" | "exp"
  showText?
/>
```

### PixelPlayerSlot

```tsx
import { PixelPlayerSlot } from '../components/pixel'

<PixelPlayerSlot
  index={number}  // 0-3，对应 --player-1 ~ --player-4
  player?: { name: string; ready: boolean; id: string }
  isHost?
  isLocalPlayer?
/>
```

### PixelRoomCard

```tsx
import { PixelRoomCard } from '../components/pixel'

<PixelRoomCard
  room={{
    id: string
    name: string
    hostName: string
    status: 'waiting' | 'playing' | 'ended'
    players: any[]
    maxPlayers: number
  }}
  onJoin={(id: string) => void}
/>
```

## CSS 设计令牌

```css
/* 像素调色板 */
--pixel-bg: #2D1B2E;      /* 深紫黑背景 */
--pixel-brown: #8B4513;   /* 棕色石墙 */
--pixel-gold: #FFD700;    /* 金色宝藏 */
--pixel-red: #DC143C;     /* 深红敌人 */
--pixel-green: #32CD32;    /* 草绿生命 */
--pixel-white: #EEEEEE;    /* 像素白 */

/* 玩家标识色 */
--player-1: #4A9EFF;
--player-2: #51CF66;
--player-3: #FFA500;
--player-4: #9B59B6;
```

## 使用页面

- `LoginPage.tsx` → PixelButton / PixelInput / PixelCard
- `LobbyPage.tsx` → PixelRoomCard / PixelHeader
- `RoomPage.tsx` → PixelPlayerSlot / PixelPanel
