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

## 5. 敌人死亡无动画 ✅ 已修复
- **发现时间**: 2026-03-31
- **问题**: 敌人死亡时直接消失，没有动画
- **根因**: 敌人死亡时直接设置 `alive = false`，没有过渡状态和动画
- **修复**:
  1. 服务器：敌人死亡时进入 `dying` 状态，设置 500ms 倒计时
  2. 客户端：渲染 `dying` 状态敌人时显示闪烁 + 红色滤镜 + 淡出效果
- **修复记录**:
  - [x] 2026-03-31: 服务器 EnemyState 添加 `state` 和 `deathTimer` 字段
  - [x] 2026-03-31: `damageEnemy()` 设置 `state='dying'` 和 500ms 倒计时
  - [x] 2026-03-31: `updateEnemy()` 循环处理死亡倒计时
  - [x] 2026-03-31: 客户端 EnemyState 接口添加 `state` 和 `deathTimer`
  - [x] 2026-03-31: 客户端渲染 `dying` 敌人时闪烁+红色滤镜+淡出
  - [x] 2026-03-31: `npx tsc --noEmit` 编译通过

## 6. 怪物生成堆叠 ✅ 已修复
- **发现时间**: 2026-03-31
- **问题**: 多个怪物堆叠在相同位置生成
- **根因**: 原实现每房间只生成一个坐标点 + count，GameRoom 循环创建时所有 enemy 堆叠在同一点（仅 +-20px 随机偏移）
- **文件**: `server/game/dungeon/DungeonGenerator.ts` 第 250-271 行
- **修复**:
  ```typescript
  // 修复前：count 个敌人共用一个坐标
  enemies.push({ type, x, y, count });  // count=6 时全部堆在一起

  // 修复后：每个 enemy 独立坐标，分散在房间内
  for (let i = 0; i < count; i++) {
    const x = room.x + room.width / 2 + (this.random() - 0.5) * maxOffsetX;
    const y = room.y + room.height / 2 + (this.random() - 0.5) * maxOffsetY;
    enemies.push({ type, x, y, count: 1 });
  }
  ```
- **修复记录**:
  - [x] 2026-03-31: 重构 spawnEnemies()，每 enemy 独立生成坐标
  - [x] 2026-03-31: 添加敌人-敌人碰撞分离逻辑 `separateEnemies()`
  - [x] 2026-03-31: 减少敌人生成数量（FLOOR_CONFIG 降低约40%）
  - [x] 2026-03-31: `npx tsc --noEmit` 编译通过

## 7. 房间页面无法滚动 ✅ 已修复
- **发现时间**: 2026-03-31
- **问题**: 创建房间后页面无法往下滑动
- **根因**: 外层容器 `div` 设置了 `minHeight: '100vh'` 但没有设置滚动属性 `overflow-y: auto`
- **文件**: `src/pages/RoomPage.tsx` 第 292-298 行
- **修复**:
  ```tsx
  // 修复前
  <div style={{ minHeight: '100vh', padding: 20, ... }}>

  // 修复后
  <div style={{ minHeight: '100vh', padding: 20, overflowY: 'auto', ... }}>
  ```
- **修复记录**:
  - [x] 2026-03-31: 添加 `overflow-y: auto` 样式
  - [x] 2026-03-31: `npx tsc --noEmit` 编译通过

## 8. 其他待发现...
