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

## UI 设计规范

### 像素复古风格颜色
- 背景：`#2D1B2E` (深紫黑)
- 墙壁：`#8B4513` (棕色)
- 金色：`#FFD700` (强调色)
- 敌人红：`#DC143C`
- 生命绿：`#32CD32`
- 玩家色：玩家1 `#4A9EFF`、玩家2 `#51CF66`、玩家3 `#FFA500`、玩家4 `#9B59B6`

### SVG 资源
- 放置在 `src/assets/images/` 目录
- 使用 ES6 import：`import x from './x.svg'`（不要用 require）
- 资源组件：`src/components/GameAssets.tsx`、`src/components/PixelSprites.tsx`

### Penpot MCP
- `export_shape` 工具可能有 http error，可使用 `generateMarkup` 生成 SVG 代码代替
- 创建图片资源后用 `generateMarkup` 提取坐标和颜色信息，在代码中重建 SVG

## Git 经验

- 遇到 "diverged branch" 冲突时：先 `git stash`，再 `git pull --rebase`，最后 `git stash pop`
- 推送前先解决本地冲突再 push
