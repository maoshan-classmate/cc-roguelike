# 调试经验 + Bug 模式警告

## 调试经验

### React StrictMode
- useEffect 在开发环境会执行两次（setup + cleanup）
- Socket 连接和监听器注册在 cleanup 中**不要**发送 disconnect/leave 消息
- 清理时只清理监听器，不要发送 leave 消息

### Socket.io
- 客户端直接连接后端端口：`io('http://localhost:3001', { transports: ['websocket', 'polling'] })`
- 不要依赖 Vite proxy 转发 WebSocket（不稳定）

### Session 管理
- 创建房间后用户自动加入房间（`session.currentRoom` 已设置）
- 后续 join 同一房间时服务端应检查 `session.currentRoom === roomId`，避免重复 join
- 用户切换页面时不要清除 session，只在明确点击"离开"按钮时才发 `room:leave`

---

## Bug 模式警告

### 1. 地牢生成尺寸单位
- `ROOM_MIN_SIZE` / `ROOM_MAX_SIZE` 单位是**像素**，不是 tile（32px = 1 tile，最小96px = 3 tiles）
- BSP 最小叶子尺寸必须 >= ROOM_MIN_SIZE + padding，否则生成的房间为 0px
- 走廊是 1px 宽的线段，碰撞网格必须加 `corridorPadding`（至少1 tile）才能让 48px 精灵通过
- 出生/出口点必须强制清除周围 3x3 tile 区域

### 2. 精灵尺寸规范（800x600 Canvas）
- 玩家：48px，敌人 basic=48 / fast=44 / tank=56 / boss=64
- 道具：28px，子弹：16px
- HP条/名称标签偏移量随精灵 size 调整

### 3. getState() 返回副本
- `GameRoom.getState()` 返回的是内部状态的**副本**
- 修改副本（如 `splice`、`push`）不会影响实际数据
- 修复：在 GameRoom 中添加专用方法（如 `removeBullet()`）直接修改 Map

### 4. 服务端/客户端类型必须匹配
- `FLOOR_CONFIG.enemyTypes` 用 `'slime'/'bat'`，但 `ENEMIES` 用 `'basic'/'fast'/'tank'`
- `DungeonGenerator` 生成 `'health_pack'`，但 `ITEMS` 配置是 `'health'`
- 修复：确保服务端 `constants.ts` 和客户端 config 文件使用相同的 ID

### 5. Switch case 用 skill.type 的陷阱
- `shield` 和 `speed_boost` 的 type 都是 `'active'`
- 用 `skill.type` 做 switch case 会导致多个 skill 走到同一个分支
- 修复：用 `skillId` 替代 `skill.type` 做 switch 匹配

### 6. Input Guard 反模式
- `if (dx !== 0 || dy !== 0)` 这类 guard 会阻止 dx=0/dy=0 的静止包发送
- 结果：松开方向键后玩家仍然持续移动
- 正确做法：移除 guard，用节流（33ms）代替

### 7. Per-Player 数据全链路模式
新增角色属性需要同时修改：
1. `Database.ts` — CREATE/ALTER TABLE
2. `AuthManager` — Character 接口
3. `GameRoom` — PlayerState 接口
4. `SocketServer` — 事件处理
5. 客户端 — game:state 同步后渲染

### 8. ALTER TABLE 向后兼容
- 新增列时必须同时写 CREATE TABLE 和 ALTER TABLE
- ALTER TABLE 用 try/catch 包裹，检查 `error.message.includes('Duplicate column')`

### 9. 技能键 keydown 防重复
- 直接监听 keydown 会因为键盘重复输入产生大量事件（按住1秒 = 30+ 事件）
- 修复：用 Set 记录已按下的键，首次按下才发送，keyup 时移除

### 10. 碰撞网格空数组危险 Fallback
- `isWalkable()` 在 `collisionGrid.length === 0` 时返回 `true`（允许穿墙）
- 修复：空网格时返回 `false`
