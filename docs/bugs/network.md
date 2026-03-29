# BUG — 网络/Socket

## Session 管理
- 创建房间后用户自动加入房间（`session.currentRoom` 已设置）
- 后续 join 同一房间时服务端应检查 `session.currentRoom === roomId`
- 用户切换页面时不要清除 session，只在明确点击"离开"按钮时才发 `room:leave`

## Socket.io 连接
- 客户端直接连接后端端口：`io('http://localhost:3001', { transports: ['websocket', 'polling'] })`
- 不要依赖 Vite proxy 转发 WebSocket（不稳定）

## React StrictMode 问题
- useEffect 在开发环境会执行两次（setup + cleanup）
- Socket 连接和监听器注册在 cleanup 中**不要**发送 disconnect/leave 消息
