# 像素风格组件库封装设计方案

> 项目：cc-roguelike
> 日期：2026-04-01
> 状态：已批准
> 实施阶段：M1 → M2 → M3

---

## 1. 背景与目标

### 问题
- 各页面存在大量内联组件（`PixelDecoration`、`DecorativeLine`、`PlayerSlot`、`RoomCard`）
- 样式分散：CSS 类 + 内联 style 混用，维护成本高
- 缺乏统一封装体系，新增页面重复工作量大

### 目标
基于 pencil 三层架构（Tokens/Components/Pages），系统性封装像素风格组件库，保持项目主题风格统一。

### 技术方案
**CSS Classes 方案**：复用 `index.css` 已有类，React 组件封装变体控制。

---

## 2. 组件体系

### Layer 1：Design Tokens（已有，复用）

```css
/* 颜色 */
--pixel-bg: #2D1B2E;
--pixel-brown: #8B4513;
--pixel-gold: #FFD700;
--pixel-red: #DC143C;
--pixel-green: #32CD32;
--pixel-white: #EEEEEE;

/* 玩家色 */
--player-1: #4A9EFF;
--player-2: #51CF66;
--player-3: #FFA500;
--player-4: #9B59B6;
```

### Layer 2：Components

#### M1 - Atoms（原子组件）

| 组件 | 文件 | 说明 |
|------|------|------|
| `PixelButton` | `src/components/pixel/PixelButton.tsx` | 封装 `.btn-pixel` 系列变体 |
| `PixelInput` | `src/components/pixel/PixelInput.tsx` | 封装 `.input-pixel` |
| `PixelBadge` | `src/components/pixel/PixelBadge.tsx` | 状态徽章（waiting/ready/playing） |
| `PixelProgress` | `src/components/pixel/PixelProgress.tsx` | HP/SP/EXP 进度条 |

#### M2 - Molecules（分子组件）

| 组件 | 文件 | 说明 |
|------|------|------|
| `PixelCard` | `src/components/pixel/PixelCard.tsx` | 重构已有组件，支持 glow 变体 |
| `PixelPanel` | `src/components/pixel/PixelPanel.tsx` | 带边框装饰的面板 |
| `PixelPlayerSlot` | `src/components/pixel/PixelPlayerSlot.tsx` | 玩家槽位（头像+状态） |
| `PixelHeader` | `src/components/pixel/PixelHeader.tsx` | 页面顶栏 |

#### M3 - Organisms（有机组件）

| 组件 | 文件 | 说明 |
|------|------|------|
| `PixelRoomCard` | `src/components/pixel/PixelRoomCard.tsx` | 房间卡片 |
| `PixelPageContainer` | `src/components/pixel/PixelPageContainer.tsx` | 页面框架容器 |

---

## 3. 组件 API

### PixelButton
```tsx
interface PixelButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'gold'
  glow?: 'gold' | 'green' | 'none'
  disabled?: boolean
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}
```

### PixelInput
```tsx
interface PixelInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: 'text' | 'password'
  className?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent) => void
}
```

### PixelBadge
```tsx
interface PixelBadgeProps {
  children: React.ReactNode
  status?: 'waiting' | 'ready' | 'playing'
  className?: string
}
```

### PixelProgress
```tsx
interface PixelProgressProps {
  value: number
  max: number
  type?: 'hp' | 'mp' | 'exp'
  showText?: boolean
  className?: string
}
```

### PixelCard
```tsx
interface PixelCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  glow?: 'gold' | 'green' | 'none'
}
```

### PixelPanel
```tsx
interface PixelPanelProps {
  title?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}
```

### PixelPlayerSlot
```tsx
interface PixelPlayerSlotProps {
  index: number
  player?: { name: string; ready: boolean; id: string }
  isHost?: boolean
  isLocalPlayer?: boolean
}
```

### PixelHeader
```tsx
interface PixelHeaderProps {
  title: string
  subtitle?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
}
```

### PixelRoomCard
```tsx
interface PixelRoomCardProps {
  room: {
    id: string
    name: string
    hostName: string
    status: 'waiting' | 'playing'
    players: any[]
    maxPlayers: number
  }
  onJoin: (id: string) => void
}
```

### PixelPageContainer
```tsx
interface PixelPageContainerProps {
  children: React.ReactNode
  showGrid?: boolean
}
```

---

## 4. 实施计划

### M1：Atoms 组件
1. 创建 `src/components/pixel/` 目录
2. 实现 `PixelButton` — 5 种变体 + glow 效果
3. 实现 `PixelInput` — 聚焦样式
4. 实现 `PixelBadge` — 3 种状态徽章
5. 实现 `PixelProgress` — HP/SP/EXP 进度条

### M2：Molecules 组件
6. 重构 `PixelCard` — glow 变体
7. 实现 `PixelPanel` — 边框装饰面板
8. 实现 `PixelPlayerSlot` — 合并内联组件
9. 实现 `PixelHeader` — 页面顶栏

### M3：Organisms 组件
10. 实现 `PixelRoomCard` — 合并内联组件
11. 实现 `PixelPageContainer` — 背景网格框架

### 页面重构（渐进）
- LoginPage → PixelButton/PixelInput/PixelCard
- RoomPage → PixelPlayerSlot/PixelRoomCard/PixelPanel
- LobbyPage → PixelHeader/PixelRoomCard

---

## 5. 验证方案

1. **编译检查**：`npx tsc --noEmit` 零 error
2. **视觉验证**：页面渲染与重构前一致
3. **功能验证**：Login/建房/选职业/准备流程正常
4. **E2E 验证**：Playwright MCP 全流程

---

## 6. 关键文件

| 操作 | 文件 |
|------|------|
| 新增 | `src/components/pixel/` |
| 新增 | `src/components/pixel/index.ts` |
| 修改 | `src/pages/LoginPage.tsx` |
| 修改 | `src/pages/RoomPage.tsx` |
| 修改 | `src/pages/LobbyPage.tsx` |

---

## 7. 设计原则

- **复用优先**：直接使用 `index.css` 已有类
- **Props 控制变体**：通过 `variant`/`glow`/`status` 控制样式
- **保持兼容**：不破坏现有页面功能
- **渐进替换**：先封装，再重构页面
- **单一职责**：每个组件专注一件事
