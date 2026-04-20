---
description: Bug 反模式黑名单 — 19 个已验证的常见错误，开发时禁止违反
alwaysApply: true
---

# Bug 反模式黑名单（禁止违反）

> 来源：docs/debugging.md 的 19 个 Bug 模式，每个都是真实踩过的坑。

## Canvas 渲染
- 禁止 `ctx.rotate(π)` 做水平翻转 → 用 `ctx.scale(-1,1)`
- 竖向精灵旋转用 `angle + π/2`（不是 `-π/2`）
- `imageRendering: 'pixelated'` 所有游戏内绘制

## Socket/网络
- 禁止 `if (socket?.connected) return` → 用 `if (socket) return`
- connecting 态事件不能丢弃 → 用 `.once('connect', () => emit(...))` 缓冲
- reconnect 恢复必须同步（不能放 `.then()`）
- `accountSessions` 必须在 login/register 全覆盖

## 游戏逻辑
- 碰撞网格空时 `isWalkable()` 必须返回 `false`
- 客户端/服务端 ID 必须匹配（`slime`≠`basic`, `health_pack`≠`health`）
- 用 `skillId` 不用 `skill.type` 做 switch
- `dx=0/dy=0` 的静止包不能被 guard 拦截
- 子弹渲染五条独立路径，互不影响

## 地牢生成
- `ROOM_MIN_SIZE` 单位是像素不是 tile
- 走廊必须加 `corridorPadding`
- 出生/出口点必须清除 3×3 tile 区域

## 状态管理
- `GameRoom.getState()` 返回副本，`splice`/`push` 无效
- 新增角色属性需改 5 处（DB→Auth→GameRoom→Socket→客户端）
- `ALTER TABLE` 用 try/catch + `Duplicate column` 检查
