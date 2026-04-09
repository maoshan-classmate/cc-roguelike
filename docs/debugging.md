# 调试经验 + Bug 模式警告

## 调试经验

### React StrictMode
- useEffect 在开发环境会执行两次（setup + cleanup）
- Socket 连接和监听器注册在 cleanup 中**不要**发送 disconnect/leave 消息
- 清理时只清理监听器，不要发送 leave 消息

### Socket.io
- 客户端直接连接后端端口：`io('http://localhost:3001', { transports: ['websocket', 'polling'] })`
- 不要依赖 Vite proxy 转发 WebSocket（不稳定）
- **连接复用**：同一 socket 在页面导航间复用，不会自动断开；navigate('/lobby') 不触发 disconnect，需显式发 `room:leave` 通知服务器

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
> 贴图规格详见 [`sprite-viewer.html`](sprite-viewer.html) 和 [`sprite-inventory.md`](sprite-inventory.md)
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

### 11. Canvas 水平翻转陷阱（Bug #54）
- **错误**：`ctx.rotate(π)` 是 180° 旋转，会让横向精灵上下颠倒，不是水平镜像
- **正确**：`ctx.save() + ctx.scale(-1, 1) + 绘制 + ctx.restore()`
- 翻转后坐标需取负：`draw0x72Sprite(ctx, atlas, sprite, -ppos.x, ppos.y, size)`
- **根因**：rotate 变换围绕原点旋转整个坐标系，scale(-1,1) 才是 X 轴镜像

### 12. Socket.io 防重连守卫（Bug #55）
- **错误**：`if (this.socket?.connected) return` — 允许 connecting 态创建第二个 socket
- **正确**：`if (this.socket) return` — 只要 socket 对象存在就阻止新建
- **触发场景**：React StrictMode 双渲染，第一次 render 创建 socket（connecting），第二次 render 时第一个还在 connecting，`?.connected` 为 false 于是再创建一个

### 13. 服务端断线重连同步恢复（Bug #55）
- **错误**：reconnect 路径的 session 恢复放在 `.then()` 异步回调里
- **正确**：reconnect 必须同步恢复（立即 `this.sessions.set(socket.id, session)`）
- **根因**：客户端 connect 后立刻发 `room:join` 等事件，异步 `.then()` 来不及执行，`requireAuth` 找不到 session
- 新连接（无 disconnectTimer）可以用异步（没有后续事件急迫性）

### 14. emit() 连接中缓冲（Bug #55）
- **错误**：`if (!this.socket?.connected) return` — connecting 态事件被静默丢弃
- **正确**：connecting 态用 `.once('connect', () => this.socket?.emit(...))` 缓冲
- 页面刷新后 RoomPage 挂载时立刻发 `room:join`，此时 socket 可能还在 connecting

### 15. accountSessions 必须全覆盖（Bug #55）
- `handleLogin` / `handleRegister` 必须同时设置 `accountSessions` Map
- 否则 disconnect handler 找不到 entry → 30s 宽限期失效 → 页面刷新直接被踢
- `handleDisconnect` 依赖 `accountSessions.get(accountId)` 设置定时器

### 16. 子弹渲染独立性（Bug #58-59）
- 四个职业+敌人是五条**完全独立**的渲染路径，用 `continue` 隔离
- 改一个职业的子弹时**不允许**影响其他职业的 if 分支
- 子弹渲染循环结构：ranger(mage(cleric(enemy(fallback，每条路径独立结束
- **warrior 不产生子弹**（服务端 sword 近战），循环中无需 warrior 分支

### 17. 机制变更≠视觉调参
- 用户说"改XXX效果"时，先确认是**视觉调整**还是**游戏机制变更**
- 视觉调整：只改客户端渲染代码（如颜色、大小、发光）
- 机制变更：需要改服务端+客户端（如治疗弹→治疗波，需要改 Combat.ts + GameRoom.ts + 渲染）
- **典型错误**：治疗波从"飞行子弹"改成"AoE脉冲"，只在渲染层画波纹，没改服务端机制→5轮失败

### 18. 端口残留排查（Dev Server 多次启动）
- 多次 `npm run dev` 会留下孤儿进程占用 3000/3001 端口，导致后端启动失败（EADDRINUSE）
- 排查：`netstat -ano | grep -E ":300[01].*LISTENING"` 查 PID → `taskkill //PID <pid> //F` 杀进程
- 症状：前端正常加载但登录失败（后端未启动 → Socket.io 连不上 3001）
- **每次重启前先杀端口**，不要假设上次进程已退出

### 19. 竖向精灵旋转补偿方向
- 0x72 竖向贴图（h>w，如 weapon_arrow 7×21）默认朝上
- `ctx.rotate(angle + π/2)` 使其朝向飞行方向（+π/2 = 顺时针90° = UP→RIGHT）
- **注意是 `+π/2` 不是 `-π/2`**，`-π/2` 会导致所有竖向子弹方向反转180°
