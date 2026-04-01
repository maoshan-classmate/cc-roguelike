# Pixel Component Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 系统性封装像素风格组件库，基于 pencil 三层架构，分 M1→M2→M3 阶段实施

**Architecture:** CSS Classes 方案 — 复用 `index.css` 已有样式类，React 组件封装 Props 变体控制。组件独立，不依赖内联样式。

**Tech Stack:** React 18, TypeScript, Tailwind CSS (via PostCSS), CSS Variables

---

## File Structure

```
src/components/pixel/
├── index.ts              # 统一导出入口
├── PixelButton.tsx       # 按钮组件
├── PixelInput.tsx        # 输入框组件
├── PixelBadge.tsx        # 状态徽章
├── PixelProgress.tsx     # 进度条
├── PixelCard.tsx         # 卡片组件（重构）
├── PixelPanel.tsx        # 面板组件
├── PixelPlayerSlot.tsx   # 玩家槽位
├── PixelHeader.tsx       # 页面顶栏
├── PixelRoomCard.tsx     # 房间卡片
└── PixelPageContainer.tsx # 页面容器
```

**参照文件：**
- `src/index.css` — 已有 `.btn-pixel`/`.input-pixel`/`.card-pixel` 等类
- `src/components/PixelIcons.tsx` — 像素图标库
- `src/pages/LoginPage.tsx` — 现有页面实现
- `src/pages/RoomPage.tsx` — 现有页面实现
- `src/pages/LobbyPage.tsx` — 现有页面实现

---

## Task 1: Create Directory Structure

**Files:**
- Create: `src/components/pixel/` directory

- [ ] **Step 1: Create pixel component directory**

```bash
mkdir -p src/components/pixel
```

---

## Task 2: PixelButton Component

**Files:**
- Create: `src/components/pixel/PixelButton.tsx`
- Test: 编译检查 + 页面渲染验证

- [ ] **Step 1: Write PixelButton component**

```tsx
import React from 'react'

interface PixelButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'gold'
  glow?: 'gold' | 'green' | 'none'
  disabled?: boolean
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

const variantClass = {
  primary: 'btn-pixel',
  secondary: 'btn-pixel btn-secondary',
  danger: 'btn-pixel btn-danger',
  success: 'btn-pixel btn-success',
  gold: 'btn-pixel',
}

const glowClass = {
  gold: 'pixel-glow-gold',
  green: 'pixel-glow-green',
  none: '',
}

export function PixelButton({
  children,
  variant = 'primary',
  glow = 'none',
  disabled = false,
  onClick,
  className = '',
  style,
}: PixelButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${variantClass[variant]} ${glow !== 'none' ? glowClass[glow] : ''} ${className}`}
      style={style}
    >
      {children}
    </button>
  )
}

export default PixelButton
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 3: PixelInput Component

**Files:**
- Create: `src/components/pixel/PixelInput.tsx`
- Test: 编译检查 + 页面渲染验证

- [ ] **Step 1: Write PixelInput component**

```tsx
import React from 'react'

interface PixelInputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  type?: 'text' | 'password'
  className?: string
  autoFocus?: boolean
  onKeyDown?: (e: React.KeyboardEvent) => void
}

export function PixelInput({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  className = '',
  autoFocus = false,
  onKeyDown,
}: PixelInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input-pixel ${className}`}
      autoFocus={autoFocus}
      onKeyDown={onKeyDown}
    />
  )
}

export default PixelInput
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 4: PixelBadge Component

**Files:**
- Create: `src/components/pixel/PixelBadge.tsx`
- Test: 编译检查

- [ ] **Step 1: Write PixelBadge component**

```tsx
import React from 'react'

interface PixelBadgeProps {
  children: React.ReactNode
  status?: 'waiting' | 'ready' | 'playing'
  className?: string
}

const statusClass = {
  waiting: 'status-badge status-badge-waiting',
  ready: 'status-badge status-badge-ready',
  playing: 'status-badge status-badge-playing',
}

export function PixelBadge({
  children,
  status = 'waiting',
  className = '',
}: PixelBadgeProps) {
  return (
    <span className={`${statusClass[status]} ${className}`}>
      {children}
    </span>
  )
}

export default PixelBadge
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 5: PixelProgress Component

**Files:**
- Create: `src/components/pixel/PixelProgress.tsx`
- Test: 编译检查

- [ ] **Step 1: Write PixelProgress component**

```tsx
import React from 'react'

interface PixelProgressProps {
  value: number
  max: number
  type?: 'hp' | 'mp' | 'exp'
  showText?: boolean
  className?: string
}

const typeClass = {
  hp: 'progress-bar-hp',
  mp: 'progress-bar-mp',
  exp: 'progress-bar-exp',
}

export function PixelProgress({
  value,
  max,
  type = 'hp',
  showText = true,
  className = '',
}: PixelProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className={`progress-bar ${className}`}>
      <div
        className={`progress-bar-fill ${typeClass[type]}`}
        style={{ width: `${percentage}%` }}
      />
      {showText && (
        <span className="progress-bar-text">
          {value}/{max}
        </span>
      )}
    </div>
  )
}

export default PixelProgress
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 6: PixelCard Component (Refactor)

**Files:**
- Modify: `src/components/pixel/PixelCard.tsx` (replace existing)
- Test: 编译检查

- [ ] **Step 1: Rewrite PixelCard with glow variant support**

```tsx
import React from 'react'

interface PixelCardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  glow?: 'gold' | 'green' | 'none'
}

const glowClass = {
  gold: 'pixel-glow-gold',
  green: 'pixel-glow-green',
  none: '',
}

export function PixelCard({
  children,
  className = '',
  style = {},
  glow = 'none',
}: PixelCardProps) {
  return (
    <div
      className={`card-pixel ${glow !== 'none' ? glowClass[glow] : ''} ${className}`}
      style={style}
    >
      {children}
    </div>
  )
}

export default PixelCard
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 6b: Add PixelPanel and PixelHeader CSS Classes

**Files:**
- Modify: `src/index.css`
- Test: 编译检查

- [ ] **Step 1: Add panel-pixel and header-pixel classes to index.css**

Add after existing `.panel` styles (around line 525):

```css
/* 像素风格面板 */
.panel-pixel {
  background: var(--pixel-bg);
  border: 4px solid var(--pixel-brown);
  padding: 20px;
  box-shadow: 6px 6px 0 rgba(0,0,0,0.5);
}

.panel-pixel-title {
  margin-bottom: 20px;
  color: var(--pixel-gold);
  font-size: 18px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 像素风格页面顶栏 */
.header-pixel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 16px 24px;
  background: var(--pixel-bg);
  border: 4px solid var(--pixel-brown);
  box-shadow: 6px 6px 0 rgba(0,0,0,0.5);
  position: relative;
}

.header-pixel-title {
  font-size: 24px;
  color: var(--pixel-gold);
  text-shadow: 3px 3px 0 rgba(0,0,0,0.8);
  letter-spacing: 2px;
}

.header-pixel-subtitle {
  color: var(--pixel-brown);
  font-size: 12px;
  margin-top: 6px;
}
```

- [ ] **Step 2: Verify CSS added correctly**

Run: `grep -c "panel-pixel\|header-pixel" src/index.css`
Expected: 4 (panel-pixel, panel-pixel-title, header-pixel, header-pixel-title)

---

## Task 7: PixelPanel Component

**Files:**
- Create: `src/components/pixel/PixelPanel.tsx`
- Test: 编译检查

- [ ] **Step 1: Write PixelPanel component using CSS classes**

```tsx
import React from 'react'

interface PixelPanelProps {
  title?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PixelPanel({
  title,
  icon,
  children,
  className = '',
}: PixelPanelProps) {
  return (
    <div className={`panel-pixel ${className}`}>
      {title && (
        <h2 className="panel-pixel-title">
          {icon}
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}

export default PixelPanel
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 8: PixelPlayerSlot Component

**Files:**
- Create: `src/components/pixel/PixelPlayerSlot.tsx`
- Test: 编译检查

- [ ] **Step 1: Write PixelPlayerSlot component**

```tsx
import React from 'react'
import { PixelSword, PixelShield, PixelGem, PixelCrown, PixelStar } from '../PixelIcons'

const PLAYER_COLORS = {
  0: 'var(--player-1)',
  1: 'var(--player-2)',
  2: 'var(--player-3)',
  3: 'var(--player-4)',
}

const PLAYER_AVATARS = ['PixelSword', 'PixelShield', 'PixelGem', 'PixelCrown']

interface PixelPlayerSlotProps {
  index: number
  player?: { name: string; ready: boolean; id: string }
  isHost?: boolean
  isLocalPlayer?: boolean
}

const avatarComponents: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  PixelSword,
  PixelShield,
  PixelGem,
  PixelCrown,
}

export function PixelPlayerSlot({
  index,
  player,
  isHost = false,
  isLocalPlayer = false,
}: PixelPlayerSlotProps) {
  const color = PLAYER_COLORS[index as keyof typeof PLAYER_COLORS]

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 16,
        background: player ? 'var(--pixel-bg)' : 'transparent',
        border: player ? `4px solid ${color}` : '2px dashed var(--pixel-brown)',
        boxShadow: isLocalPlayer ? `0 0 20px ${color}50` : 'none',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      {/* Avatar placeholder */}
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 4,
          border: `3px solid ${color}`,
          background: 'var(--pixel-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 10px ${color}40`,
          position: 'relative',
        }}
      >
        {player && (
          <>
            {React.createElement(avatarComponents[PLAYER_AVATARS[index]] || PixelSword, { size: 48, color })}
            {player.ready && (
              <div
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: 'var(--pixel-green)',
                  border: '2px solid var(--pixel-bg)',
                }}
              />
            )}
          </>
        )}
        {!player && (
          <span style={{ fontSize: 24, color: 'var(--pixel-brown)', fontWeight: 'bold' }}>?</span>
        )}
      </div>

      {/* Player info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span
            style={{
              color: player ? 'var(--pixel-white)' : 'var(--pixel-brown)',
              fontFamily: 'Courier New, monospace',
              fontSize: 16,
              fontWeight: 'bold',
              opacity: player ? 1 : 0.5,
            }}
          >
            {player?.name || `玩家 ${index + 1}`}
          </span>
          {isHost && (
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--pixel-gold)',
                color: 'var(--pixel-bg)',
                fontSize: 10,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <PixelCrown size={12} color="#8B4513" /> 房主
            </span>
          )}
          {isLocalPlayer && (
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--pixel-green)',
                color: 'var(--pixel-bg)',
                fontSize: 10,
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <PixelStar size={10} color="#8B4513" /> 你
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--pixel-brown)',
            fontFamily: 'Courier New, monospace',
            opacity: player ? 0.7 : 0.5,
          }}
        >
          {player ? '冒险等级 1' : '等待加入...'}
        </div>
      </div>

      {/* Status badge */}
      {player && (
        <div
          style={{
            padding: '6px 14px',
            background: player.ready ? 'var(--pixel-green)' : 'var(--pixel-brown)',
            color: player.ready ? 'var(--pixel-bg)' : 'var(--pixel-white)',
            fontSize: 12,
            fontWeight: 'bold',
            fontFamily: 'Courier New, monospace',
            boxShadow: player.ready ? '0 0 10px var(--pixel-green)' : 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {player.ready ? (
            <PixelStar size={14} color="#8B4513" />
          ) : (
            <PixelGem size={14} color="#666" />
          )}
          {player.ready ? '已准备' : '未准备'}
        </div>
      )}

      {!player && (
        <div style={{ fontSize: 24, color: 'var(--pixel-brown)', opacity: 0.3 }}>
          <PixelStar size={16} color="var(--pixel-brown)" />
        </div>
      )}
    </div>
  )
}

export default PixelPlayerSlot
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 9: PixelHeader Component

**Files:**
- Create: `src/components/pixel/PixelHeader.tsx`
- Test: 编译检查

- [ ] **Step 1: Write PixelHeader component using CSS classes**

```tsx
import React from 'react'

interface PixelHeaderProps {
  title: string
  subtitle?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
}

export function PixelHeader({
  title,
  subtitle,
  leftContent,
  rightContent,
}: PixelHeaderProps) {
  return (
    <header className="header-pixel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {leftContent}
        <div>
          <h1 className="header-pixel-title">
            {title}
          </h1>
          {subtitle && (
            <div className="header-pixel-subtitle">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {rightContent && (
        <div style={{ display: 'flex', gap: 10 }}>
          {rightContent}
        </div>
      )}
    </header>
  )
}

export default PixelHeader
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 10: PixelRoomCard Component

**Files:**
- Create: `src/components/pixel/PixelRoomCard.tsx`
- Test: 编译检查

- [ ] **Step 1: Write PixelRoomCard component**

```tsx
import React from 'react'
import { PixelCastle, PixelCrown, PixelSword } from '../PixelIcons'

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

export function PixelRoomCard({ room, onJoin }: PixelRoomCardProps) {
  const isWaiting = room.status === 'waiting'

  return (
    <div
      className="room-card pixel-glow-gold"
      onClick={() => onJoin(room.id)}
      style={{ animation: 'pixel-fade-in 0.3s ease-out' }}
    >
      <div style={{ paddingLeft: 12 }}>
        <div
          style={{
            fontWeight: 'bold',
            marginBottom: 6,
            color: 'var(--pixel-gold)',
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <PixelCastle size={16} color="#8B4513" /> {room.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--pixel-brown)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <PixelCrown size={12} color="#FFD700" /> {room.hostName}
        </div>
      </div>

      {/* Player preview */}
      <div style={{ display: 'flex', gap: 4, marginRight: 16 }}>
        {Array.from({ length: room.maxPlayers }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: i < room.players.length
                ? (['var(--player-1)', 'var(--player-2)', 'var(--player-3)', 'var(--player-4)'][i])
                : 'var(--pixel-bg-dark, #1a0f1e)',
              border: '1px solid var(--pixel-brown)',
            }}
          />
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div
          style={{
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 'bold',
            background: isWaiting ? 'var(--pixel-green)' : 'var(--pixel-red)',
            color: isWaiting ? 'var(--pixel-bg)' : 'white',
          }}
        >
          {isWaiting ? '等待中' : '游戏中'}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--pixel-brown)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <PixelSword size={10} color="#C0C0C0" /> {room.players.length}/{room.maxPlayers}
        </div>
      </div>
    </div>
  )
}

export default PixelRoomCard
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 11: PixelPageContainer Component

**Files:**
- Create: `src/components/pixel/PixelPageContainer.tsx`
- Test: 编译检查

- [ ] **Step 1: Write PixelPageContainer component**

```tsx
import React from 'react'

interface PixelPageContainerProps {
  children: React.ReactNode
  showGrid?: boolean
  style?: React.CSSProperties
}

export function PixelPageContainer({
  children,
  showGrid = true,
  style = {},
}: PixelPageContainerProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        padding: 20,
        background: 'var(--pixel-bg)',
        position: 'relative',
        overflowY: 'auto',
        ...style,
      }}
    >
      {/* Pixel grid background */}
      {showGrid && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(rgba(139, 69, 19, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 69, 19, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            pointerEvents: 'none',
          }}
        />
      )}
      {children}
    </div>
  )
}

export default PixelPageContainer
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 12: Create Pixel Component Index

**Files:**
- Create: `src/components/pixel/index.ts`

- [ ] **Step 1: Write pixel component barrel export**

```ts
export { PixelButton } from './PixelButton'
export { PixelInput } from './PixelInput'
export { PixelBadge } from './PixelBadge'
export { PixelProgress } from './PixelProgress'
export { PixelCard } from './PixelCard'
export { PixelPanel } from './PixelPanel'
export { PixelPlayerSlot } from './PixelPlayerSlot'
export { PixelHeader } from './PixelHeader'
export { PixelRoomCard } from './PixelRoomCard'
export { PixelPageContainer } from './PixelPageContainer'
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 13: Refactor LoginPage

**Files:**
- Modify: `src/pages/LoginPage.tsx`

- [ ] **Step 1: Replace inline components with pixel library**

Import additions:
```tsx
import { PixelButton, PixelInput, PixelCard } from '../components/pixel'
```

Replace inline components:
- `PixelDecoration` → 直接删除，逻辑移至 JSX
- `DecorativeLine` → 使用 CSS class `decorative-line`

Replace components:
```tsx
// Replace
<button type="submit" className="btn-pixel pixel-glow-gold" ...>
// With
<PixelButton variant="gold" glow="gold" ...>

// Replace
<input className="input-pixel" ...>
// With
<PixelInput ...>

// Replace
<div className="card-pixel pixel-glow-gold" ...>
// With
<PixelCard glow="gold" ...>
```

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 14: Refactor RoomPage

**Files:**
- Modify: `src/pages/RoomPage.tsx`

- [ ] **Step 1: Replace inline PlayerSlot with pixel library**

Import additions:
```tsx
import { PixelPanel, PixelPlayerSlot, PixelButton, PixelCard } from '../components/pixel'
```

Replace inline `PlayerSlot` → use `PixelPlayerSlot`

Replace inline `RoomCard` → use `PixelRoomCard`

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 15: Refactor LobbyPage

**Files:**
- Modify: `src/pages/LobbyPage.tsx`

- [ ] **Step 1: Replace inline components with pixel library**

Import additions:
```tsx
import { PixelHeader, PixelRoomCard, PixelButton, PixelCard, PixelPanel } from '../components/pixel'
```

Replace inline `PlayerSlot` → use `PixelPlayerSlot`

Replace inline `RoomCard` → use `PixelRoomCard`

Replace header → use `PixelHeader`

- [ ] **Step 2: Verify compilation**

Run: `npx tsc --noEmit`
Expected: No errors

---

## Task 16: Final Verification

- [ ] **Step 1: Full TypeScript compilation check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 2: E2E verification with Playwright**

Run Playwright MCP: Login → Lobby → Room → Game
Expected: All flows work correctly

---

## Verification Commands

```bash
# TypeScript compilation
npx tsc --noEmit

# If errors found, fix before proceeding
```

---

## Commit Strategy

After each component is verified:
```bash
git add src/components/pixel/ src/pages/LoginPage.tsx
git commit -m "feat: add PixelButton, PixelInput, PixelBadge, PixelProgress components"
```

After page refactors:
```bash
git add src/pages/LoginPage.tsx
git commit -m "refactor: use pixel component library in LoginPage"
```
