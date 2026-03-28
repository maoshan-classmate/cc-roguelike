# 修复角色贴图与移动 Bug Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复三个游戏核心 Bug：(1) 角色贴图与职业不符、(2) 静止时贴图消失、(3) 按一下方向键持续移动

**Architecture:** 分三层修复：数据库+服务端添加 characterType 字段传递链，客户端移除 input guard 发送零速度包，客户端渲染逻辑确保静止时也显示贴图。

**Tech Stack:** MySQL, Node.js, Socket.io, React + Canvas

---

## File Structure

| File | Responsibility | Change |
|------|---------------|--------|
| `server/data/Database.ts` | 数据库 schema | 添加 `character_type` 列 |
| `server/lobby/AuthManager.ts` | 角色数据接口 | Character 接口 + register 添加 type |
| `server/game/GameRoom.ts` | 游戏房间状态 | PlayerState + addPlayer 添加 characterType |
| `server/network/SocketServer.ts` | 网络消息 | handleRoomStart 传递 characterType |
| `src/pages/GamePage.tsx` | 游戏渲染 + 输入 | 移除 input guard + 静止渲染修复 |
| `src/pages/RoomPage.tsx` | 房间页面 | 添加职业选择 UI |

---

## Bug Analysis

### Bug 1: 角色贴图与职业不符
**根因:** 数据库无 `character_type` 列 → 服务端 `PlayerState` 无 `characterType` 字段 → 客户端 `player.characterType` 始终 `undefined` → 回退到 `CHARACTERS.warrior`。
**修复链:** DB 加列 → AuthManager 读写 → SocketServer 传递 → GameRoom 存储 → State 同步到客户端

### Bug 2: 静止时贴图消失
**根因:** 客户端只在 `dx !== 0 || dy !== 0 || mouseRef.current.down` 时才发送 input，服务器永远收不到静止玩家的 angle 更新。但更关键的是：如果服务端 state 中没有该玩家的最新位置数据，客户端可能渲染到错误位置。实际上贴图本身不会消失（render 逻辑无隐藏条件），用户描述的"消失"可能是因为 **角色贴图在精灵图上位置不对** 导致渲染了空白区域。
**修复:** 确保客户端在每帧都发送 input（包括 dx=0, dy=0 的静止状态），这样服务器始终有最新的 angle 数据。

### Bug 3: 按一下方向键持续移动
**根因:** 客户端 `if (dx !== 0 || dy !== 0 || mouseRef.current.down)` guard 阻止了零速度包的发送。松开按键时 dx=0, dy=0，条件为 false，不发送 input。服务端保留上一次的 dx/dy 非零值，持续应用移动。
**修复:** 移除 input guard，每帧都发送 input 数据。为避免过多无效网络包，可以改为：只在状态变化时发送（按下/松开按键时），或每帧都发但节流。

---

## Task 1: 数据库 + 服务端添加 characterType

**Files:**
- Modify: `server/data/Database.ts:39-64`
- Modify: `server/lobby/AuthManager.ts:14-35`
- Modify: `server/game/GameRoom.ts:15-39,110-137`

- [ ] **Step 1: 数据库添加 character_type 列**

在 `server/data/Database.ts` 的 `createCharactersTable` SQL 中添加 `character_type` 列：

```sql
character_type VARCHAR(20) DEFAULT 'warrior',
```

放在 `weapon` 列之后。

同时在 `Database.ts` 的 `init()` 方法末尾添加 ALTER TABLE 兼容已有数据库：

```typescript
// 兼容已有数据库：添加 character_type 列
try {
  await this.pool.execute('ALTER TABLE characters ADD COLUMN character_type VARCHAR(20) DEFAULT \'warrior\' AFTER weapon');
} catch (e: any) {
  if (!e.message.includes('Duplicate column')) throw e;
}
```

- [ ] **Step 2: AuthManager Character 接口添加 character_type**

在 `server/lobby/AuthManager.ts` 的 `Character` 接口添加：

```typescript
character_type: string;  // 'warrior' | 'ranger' | 'mage' | 'healer'
```

在 `register()` 方法中，INSERT 语句添加 `character_type`：

```typescript
await this.db.execute(
  `INSERT INTO characters (id, account_id, name, weapon, character_type, skills)
   VALUES (?, ?, ?, 'pistol', 'warrior', ?)`,
  [characterId, accountId, username, defaultSkills]
);
```

在 register 返回的 character 对象中也添加 `character_type: 'warrior'`。

- [ ] **Step 3: GameRoom PlayerState 添加 characterType**

在 `server/game/GameRoom.ts` 的 `PlayerState` 接口添加：

```typescript
characterType: string;
```

在 `addPlayer()` 方法中：

```typescript
characterType: charData.character_type || 'warrior',
```

确保 `getState()` 返回的 players 数组自动包含 `characterType` 字段（因为 `Array.from(this.players.values())` 会序列化所有字段）。

- [ ] **Step 4: 验证数据链路**

启动服务端，确认：
- 数据库创建成功（含 character_type 列）
- 注册新用户时默认 character_type = 'warrior'
- GameRoom addPlayer 正确传递 characterType 到 PlayerState

- [ ] **Step 5: Commit**

```bash
git add server/data/Database.ts server/lobby/AuthManager.ts server/game/GameRoom.ts
git commit -m "feat: 添加 character_type 到数据库和服务端 PlayerState"
```

---

## Task 2: 客户端添加职业选择 UI

**Files:**
- Modify: `src/pages/RoomPage.tsx`

- [ ] **Step 1: RoomPage 添加职业选择**

在 RoomPage 中添加职业选择功能。玩家可以在准备前选择职业（warrior/ranger/mage/healer）。选择后通过 socket 发送到服务端。

在 RoomPage 组件中添加：

```typescript
const [selectedClass, setSelectedClass] = useState<string>('warrior')
```

在准备按钮上方添加职业选择 UI（4个像素风格按钮），选择后：

```typescript
networkClient.emit('room:selectClass', { characterType: selectedClass })
```

- [ ] **Step 2: SocketServer 处理 class 选择**

在 `server/network/SocketServer.ts` 添加 `room:selectClass` 事件处理：

```typescript
socket.on('room:selectClass', (data: { characterType: string }) => {
  this.requireAuth(socket, async (session) => {
    const validTypes = ['warrior', 'ranger', 'mage', 'healer'];
    if (!validTypes.includes(data.characterType)) return;
    // 更新数据库
    const character = await this.authManager.getCharacter(session.accountId);
    if (character) {
      await this.db.execute(
        'UPDATE characters SET character_type = ? WHERE id = ?',
        [data.characterType, character.id]
      );
    }
  });
});
```

注意：需要给 SocketServer 添加 `db` 引用，或者给 AuthManager 添加 updateCharacterType 方法。

- [ ] **Step 3: 验证职业选择**

通过 Playwright 测试：进入房间 → 选择职业 → 开始游戏 → 验证贴图正确。

- [ ] **Step 4: Commit**

```bash
git add src/pages/RoomPage.tsx server/network/SocketServer.ts
git commit -m "feat: 添加房间内职业选择 UI"
```

---

## Task 3: 修复持续移动 Bug（input guard）

**Files:**
- Modify: `src/pages/GamePage.tsx:398-429`

- [ ] **Step 1: 移除 input guard，改为每帧发送**

在 `src/pages/GamePage.tsx` 的 game loop 中，当前代码（约 line 423）：

```typescript
if (dx !== 0 || dy !== 0 || mouseRef.current.down) {
  networkClient.emit('game:input', { dx, dy, angle, attack: mouseRef.current.down })
}
```

改为每帧都发送，但使用节流（~30fps，与 INPUT_RATE 匹配）：

```typescript
// 节流：每 33ms 发送一次 input（~30fps）
const now = performance.now()
if (!lastInputTime || now - lastInputTime >= 33) {
  lastInputTime = now
  networkClient.emit('game:input', { dx, dy, angle, attack: mouseRef.current.down })
}
```

在 gameLoop 函数顶部添加 `lastInputTime` 变量：

```typescript
let lastInputTime = 0
```

这样：
- 按住方向键：持续发送 dx=1, dy=0 → 服务器持续移动
- 松开方向键：发送 dx=0, dy=0 → 服务器停止移动
- 静止时：也发送 angle 更新 → 服务器始终有最新朝向

- [ ] **Step 2: 验证移动修复**

Playwright 测试：按 W 键移动 → 松开 → 角色停止。按一下就动一下。

- [ ] **Step 3: Commit**

```bash
git add src/pages/GamePage.tsx
git commit -m "fix: 移除 input guard，修复持续移动 bug"
```

---

## Task 4: 修复静止时贴图消失

**Files:**
- Modify: `src/pages/GamePage.tsx`

- [ ] **Step 1: 分析贴图消失原因**

当前渲染代码（line 371-379）无条件绘制玩家精灵，理论上不会消失。需要验证：
1. 是否是精灵索引错误导致渲染了空白区域
2. 是否是 spritesLoaded 为 false 时精灵图未加载
3. 是否是服务端 state 中玩家数据在某帧丢失

检查 `drawCharacterSprite` 函数确保 source rect 在精灵图范围内。

如果 `charConfig.spriteIndex.front` 值为 0-15（characters.ts 中定义的），而精灵图第一行只有 16 个精灵（每个 16x16 + 1px margin），那么 source rect 计算应该正确。

**最可能的原因：** Task 3 的修复（每帧发送 input）会同时解决此问题，因为服务器始终收到 angle 更新，客户端也始终收到完整 state。

- [ ] **Step 2: 确保 render 函数在静止时也正确绘制**

在 render 函数中，玩家绘制代码块确保：
- 即使 `player.angle` 为 0 或 undefined，也使用默认 front 精灵
- 当 spritesLoaded=false 时，fallback 纯色方块仍然绘制

当前代码逻辑已经正确（有 fallback），不需要修改。但需要确认 Task 3 修复后此问题是否解决。

- [ ] **Step 3: Playwright 验证**

进入游戏 → 不按键 → 截图确认角色可见 → 按方向键移动 → 松开 → 截图确认角色仍然可见。

- [ ] **Step 4: Commit（如有修改）**

---

## Task 5: Playwright 全流程验证

**Files:** None (verification only)

- [ ] **Step 1: 启动 dev server**

```bash
taskkill //PID <pid> //F 2>/dev/null; npm run dev
```

- [ ] **Step 2: 完整流程测试**

Playwright 自动化：
1. 登录 (admin/123456)
2. 大厅 → 创建房间
3. 选择职业（如法师 mage）
4. 准备 → 开始游戏
5. 截图验证：法师贴图显示正确（橙色法师精灵，非蓝色战士）
6. WASD 测试：按一下 W → 松开 → 角色停止
7. 静止 3 秒 → 截图确认角色仍然可见
8. 测试技能 1-4 不卡死
9. 删除截图

- [ ] **Step 3: 更新 TODO.md**

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
git commit -m "fix: 修复角色贴图与职业不符、持续移动、静止消失三个核心 bug"
```
