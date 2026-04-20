---
description: Socket/会话管理规则 — 连接管理、事件缓冲、重连恢复、状态同步
globs:
  - "server/**/*.ts"
  - "src/hooks/**"
  - "src/pages/RoomPage.tsx"
  - "src/pages/LobbyPage.tsx"
---

# Socket/会话管理规则

## 连接管理

- 禁止 `if (socket?.connected) return` → 用 `if (socket) return`
- 客户端直连后端 `io('http://localhost:3001')`，不依赖 Vite proxy
- 连接复用：页面导航间 socket 不断开，需显式 `room:leave`

## 事件缓冲

- connecting 态事件不能丢弃
- 用 `.once('connect', () => socket?.emit(...))` 缓冲
- 禁止 `if (!socket?.connected) return` 丢弃事件

## 重连恢复

- reconnect 必须同步恢复 `sessions.set()`（禁止 `.then()`）
- `accountSessions` 在 login/register/disconnect 三处必须全覆盖
- disconnect handler 依赖 `accountSessions.get()` 设置定时器

## 客户端状态

- 组件 unmount 时必须重置 `gameSessionRef`
- React StrictMode 会双执行 useEffect，cleanup 只清监听器不发 leave
- 客户端插值 `lerp(prev, target, t)` 平滑 10Hz 同步

## Session 管理

- 创建房间后 `session.currentRoom` 已设置
- 后续 join 同一房间需检查 `session.currentRoom === roomId`
- 只在明确"离开"时发 `room:leave`，页面切换不发
