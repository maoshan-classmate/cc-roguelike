# CLAUDE.md

## 项目概述

这是一个局域网多人联机 Roguelike 闯关游戏，使用 React + Canvas + Node.js + Socket.io + MySQL。

## 调试经验

### React StrictMode 问题
- useEffect 在开发环境会执行两次（setup + cleanup）
- Socket 连接和监听器注册要在 cleanup 中**不要**发送 disconnect/leave 消息
- 清理时只清理监听器，不要发送 leave 消息

### Socket.io 连接
- 客户端直接连接后端端口：`io('http://localhost:3001', { transports: ['websocket', 'polling'] })`
- 不要依赖 Vite proxy 转发 WebSocket（不稳定）

### Session 管理
- 创建房间后用户自动加入房间（session.currentRoom 已设置）
- 后续 join 同一房间时服务端应检查 `session.currentRoom === roomId`，避免重复 join
- 用户切换页面时不要清除 session，只在明确点击"离开"按钮时才发 `room:leave`

## 关键命令

```bash
# 重启服务器
taskkill //PID <pid> //F && sleep 2 && npm run dev

# 检查端口占用
netstat -ano | grep LISTENING | grep -E "300[01]"

# 检查服务端日志
tail -f logs or check task output
```

## 项目结构

```
src/
  pages/     # 页面组件 (LoginPage, LobbyPage, RoomPage, GamePage)
  store/     # Zustand 状态管理
  network/   # Socket.io 客户端
server/
  game/      # 游戏逻辑 (GameManager, GameRoom, Combat, DungeonGenerator)
  lobby/     # 大厅逻辑 (AuthManager, LobbyManager)
  network/   # SocketServer
```

## 架构图

![架构图](./architecture.drawio.png)

## 技术栈

- 前端：React 18 + TypeScript + Canvas + Zustand + Socket.io-client + Vite
- 后端：Node.js + Express + Socket.io + MySQL (mysql2)
- 端口：前端 3000，后端 3001
