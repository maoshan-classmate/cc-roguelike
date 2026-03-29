# 二次进游戏瞬移 Bug 修复实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复"第一次进游戏正常，ESC退出后重建房间进入游戏角色开始瞬移"的 bug

**Architecture:**

**根因分析**（完整链路）：

```
第一次进游戏:
  GamePage mount → game:state(floor=1) → floorSessionRef=1 ✅ 正常

ESC退出 → navigate('/lobby') → GamePage unmount:
  cleanup: networkClient.off('game:state')
           cancelAnimationFrame ✅

重建房间第二次进游戏:
  GamePage mount → floorSessionRef=0（新的组件实例，ref 重置为0）
  旧的 game:state 事件（floor=1）可能被服务器仍在发送
  floorSessionRef !== 0 (false) && state.floor !== floorSessionRef (1 !== 0 = true) → TRUE → 被过滤掉 ❌
  新 room 的 game:state 也被拦截 → dungeon=null → 只有网格

或者另一条路径：
  game:floor:start 先到达 → floorSessionRef=1, Maps cleared
  然后旧 room 的 game:state(floor=1) 到达 → 1 !== 0 && 1 !== 1 = FALSE → 通过过滤
  → prevPositions 被旧 room 的位置污染 → 瞬跳
```

**关键发现**：`floorSessionRef` 是组件实例级别的 ref，每次 mount 重置为 0，但 `prevPositions` / `targetPositions` 是**模块级别**（共享内存）的 Map。第一次游戏的位置数据在第二次游戏的 Maps 中仍然存在。

**三层修复策略**：

1. **清除 Maps**：在 `game:floor:start` handler 中清除 `prevPositions` / `targetPositions`（已有，但加了条件判断）
2. **用 game session counter 替代 floorSessionRef**：确保不同游戏 session 之间完全隔离
3. **清除 `game:end` 残留**：退出时不依赖 `game:floor:start`，直接在任何新的 `game:state` 到达时验证 session

**Tech Stack:** React, Canvas, Socket.io, TypeScript

---

## Task 1: 用 gameSessionCounter 替代 floorSessionRef

**Files:**
- Modify: `src/pages/GamePage.tsx:120-121`（ref 定义）
- Modify: `src/pages/GamePage.tsx:203-204`（过滤条件）
- Modify: `src/pages/GamePage.tsx:236-255`（floor:start handler）

- [ ] **Step 1: 将 `floorSessionRef` 替换为 `gameSessionCounter`**

```typescript
// 旧代码 (line ~120):
const floorSessionRef = useRef<number>(0)

// 新代码:
const gameSessionCounter = useRef<number>(0)
```

- [ ] **Step 2: 修改过滤条件 — 始终验证 session，不依赖 floor 值**

```typescript
// 旧代码 (line ~203):
if (floorSessionRef.current !== 0 && state.floor !== floorSessionRef.current) return

// 新代码:
if (state.gameSession !== gameSessionCounter.current) return
```

- [ ] **Step 3: 修改 floor:start handler — 设置 session counter**

```typescript
// 旧代码 (line ~252):
floorSessionRef.current = data.floor

// 新代码:
gameSessionCounter.current = (gameSessionCounter.current + 1) % 1000000
// 注意：服务器需要在 game:state 和 game:floor:start 中同时发送 gameSession
```

- [ ] **Step 4: 服务端 — 在 game:state 中添加 gameSession 字段**

修改 `server/game/GameRoom.ts` `getState()` 和 `game:floor:start` 事件，在其中加入 `gameSession` 字段（从 GameRoom 实例的 `gameSession` 计数器累加）。

**验证**：`npx tsc --noEmit` 零 error ✅

---

## Task 2: 在 GameRoom 服务端添加 gameSession 计数器

**Files:**
- Modify: `server/game/GameRoom.ts:88`（添加 gameSession 字段）
- Modify: `server/game/GameRoom.ts:getState()`（返回 gameSession）
- Modify: `server/network/SocketServer.ts:351-352`（game:floor:start 事件加 gameSession）

- [ ] **Step 1: GameRoom 添加 gameSession 实例变量**

```typescript
// server/game/GameRoom.ts line ~88，在现有字段附近添加：
private gameSession: number = 0
```

- [ ] **Step 2: GameRoom.start() 初始化 session**

```typescript
// 在 start() 方法开头（line ~153附近）:
this.gameSession = (this.gameSession + 1) % 1000000
```

- [ ] **Step 3: getState() 返回 gameSession**

```typescript
// server/game/GameRoom.ts getState() 方法中（line ~532附近）:
return {
  tick: this.tick,
  floor: this.currentFloor,
  gameSession: this.gameSession,  // ← 新增
  players: Array.from(this.players.values()),
  ...
}
```

- [ ] **Step 4: game:floor:start 事件携带 gameSession**

```typescript
// server/network/SocketServer.ts line ~351:
this.io.to(`room:${roomId}`).emit('game:floor:start', {
  floor: state.floor,
  gameSession: (gameRoom as any).gameSession  // ← 新增
})
```

**验证**：`npx tsc --noEmit` 零 error ✅

---

## Task 3: 完整 E2E 测试 — 二次进游戏

**Test:** Playwright E2E 完整流程：
1. 登录 → 建房间 → 选战士 → 准备 → 开始冒险 ✅
2. ESC → 退出游戏 → 返回大厅
3. 建第二个房间 → 选战士 → 准备 → 开始冒险
4. 确认角色**没有瞬移**，地牢地板正常显示

- [ ] **Step 1: 运行 E2E 测试**

```bash
# 启动测试流程（Playwright MCP）
登录 → 创建房间 "Test1" → 选择战士 → 准备 → 开始冒险
等待 2 秒（让游戏完全加载）
按 ESC → 点击 "退出游戏"
等待大厅加载
创建房间 "Test2" → 选择战士 → 准备 → 开始冒险
等待 2 秒
截图存档
```

**预期结果**：
- 截图显示地牢地板正常渲染（棕色地砖+网格线）✅
- 角色没有从随机位置瞬移过来 ✅
- `npx tsc --noEmit` 零 error ✅

---

## 验证清单

- [ ] `npx tsc --noEmit` — 零 error（服务端+客户端）
- [ ] 第一次进游戏 — 地牢地板正常 ✅（已知正常）
- [ ] 第二次进游戏 — 地牢地板正常，无瞬移 ✅
- [ ] 截图存档：`game-second-entry.png`
