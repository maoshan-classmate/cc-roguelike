# BUG — 游戏核心

## 1. 房主无法准备和开始游戏 ✅ 已修复
- **问题**：房主创建房间后，显示"开始游戏"按钮但被禁用
- **修复**：让所有玩家都能准备，房主准备后可以开始游戏

## 2. 游戏无法移动和攻击 ✅ 已修复 (2026-03-28)
- **问题**：游戏开始后玩家无法移动和攻击
- **根因**：
  - 服务器端：`GameRoom.start()` 中 tick 计数器递增但从未调用 `update(dt)`
  - 客户端：React 闭包问题，游戏循环使用 `players` state 是旧值
- **修复**：服务器端添加 `this.update(dt)` 调用；客户端使用 `gameStateRef` 确保读取最新状态

## 3. 子弹碰撞删除逻辑错误 ✅ 已修复
- **问题**：`checkBulletCollision` 用 `splice` 从 `getState()` 副本删除子弹
- **修复**：在 GameRoom 添加 `removeBullet()` 方法直接修改 Map

## 4. 敌人穿墙 ✅ 已修复 (2026-03-29)
- **问题**：`isWalkable()` 在空网格时返回 `true`
- **修复**：空网格时返回 `false` 并输出 `console.warn`
- **关联**：`DungeonGenerator` 添加碰撞网格健康验证日志

## 5. 其他待发现...
