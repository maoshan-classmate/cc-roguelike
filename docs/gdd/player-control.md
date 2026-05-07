# Player Control System — 角色控制/移动/施法

> **Status**: In Design
> **Author**: 用户 + agents
> **Last Updated**: 2026-05-07 (revised: review-round-5 — cross-document sync: Skills GDD cooldown clock + Dodge Roll direction + melee arc center)
> **Implements Pillar**: 操控感（即时反馈 + 精准操作 + 移动质感）

## Overview

Player Control System 是游戏的**输入到响应全链路**，涵盖三个子系统：移动（WASD + 加减速惯性）、瞄准（鼠标独立朝向）、施法（按键即时触发 + 输入缓冲）。它是玩家与游戏世界交互的唯一入口——每一次按键、每一次鼠标移动都经过这个系统转化为游戏内的动作。

技术上，它是一个跨越客户端/服务端的管道：客户端捕获原始输入（键盘 + 鼠标），计算移动方向和瞄准角度，通过 Socket.io 发送到服务端；服务端以 **20Hz（50ms tick）** 执行权威的移动模拟（加速度模型 + 碰撞检测）、施法判定（冷却 + 能量 + 状态检查）、伤害计算，再以 **10Hz（100ms）** 广播 `game:state` 到客户端渲染。当前实现存在 7 个核心体验问题（瞬间启停、施法延迟、无法独立瞄准等），需要全面重写。

没有这个系统，玩家无法控制角色——它是所有战斗、探索、技能交互的前提条件。

## Player Fantasy

玩家应感受到**操控响应而有质感**——按键即有反馈、松手渐停、鼠标指向哪里角色就面向哪里。控制的最高境界是"透明的重量"：玩家感受到角色的身体感（启停有惯性），但操作意图传达零延迟——按键到角色开始移动的感知延迟 < 100ms，施法到释放的感知延迟 < 50ms。

**核心情感目标：**
- **即时反馈**：客户端动画切换 < 1 帧（16ms）内启动（按键瞬间切换到 run 动画），位置变化 < 1 个 server tick（~50ms 平均）。注：无客户端位置预测，实际位置变化延迟 = 1 个 server tick；客户端通过即时动画启动掩盖此延迟，使感知延迟 < 100ms
- **精准瞄准**：鼠标指向敌人，角色面向敌人——即使正在横向移动。远程职业（ranger/mage/cleric）可以边退边打，kite 操作自然流畅
- **施法果断**：按下技能键的瞬间技能就释放，不需要等松手。快速连按不会丢失输入（150ms 输入缓冲窗口）
- **移动有质感**：启停有加速/减速过程（客户端 ~5 帧 @60fps 到 95% 满速；服务端 20Hz 下 1 tick 内收敛），让角色有"重量感"但不迟钝。注：加减速的"重量感"仅对本地玩家可见，其他玩家看到的是 10Hz 插值后的位置。这是有意识的设计选择——优先本地操控质感，而非多人视觉一致性

**参考游戏：**
- **Hades** — 快节奏施法 + dash 操控的标杆（注：本地单机，零网络延迟；本项目 10Hz 服务端同步下无法复制其 sub-frame 响应，但加减速曲线和输入缓冲可复现其手感）
- **Enter the Gungeon** — 双摇杆式独立瞄准 + 移动的完美实现（注：本地单机；鼠标独立瞄准子系统可完全复现）
- **Wizard of Legend** — 技能连招的流畅输入体验（注：本地合作；输入缓冲机制可复现其连招流畅度）

**目标 MDA 美学：Sensation**（操控本身带来快感）、**Challenge**（精准操作带来深度）、**Expression**（走位+瞄准的组合表达个人风格）

## Detailed Design

### Core Rules

#### 子系统一：移动（加减速惯性模型）

**加速度模型**（指数趋近：按键即动 + 渐进满速，按职业区分）：

| 职业 | 到 95% 满速帧数 | 到停止帧数 | 手感描述 |
|------|-----------|-----------|---------|
| warrior | ~5 帧（83ms） | ~5 帧 | 重甲，略慢但稳 |
| ranger | ~4 帧（67ms） | ~4 帧 | 轻甲，最灵活 |
| mage | ~5 帧（83ms） | ~5 帧 | 布甲，中等 |
| cleric | ~5 帧（83ms） | ~5 帧 | 布甲，中等 |

> 指数趋近模型：按键后帧 0 即获得 ~55% 满速（可感知的即时响应），之后每帧指数趋近 100%（客户端 60fps 下 ~5 帧达到 95%；服务端 20Hz 下 1 tick 收敛）。减速对称：松手后同样 ~5 帧归零（客户端）。加速/减速使用相同速率（ACCEL_RATE = DECEL_RATE），手感一致。注：加减速的"重量感"仅对本地玩家可见，其他玩家通过 10Hz 插值看到的是近乎即时启停。

**服务端移动逻辑**（替换当前的直接赋值 `player.dx = input.dx`）：

```
// 输入处理（handlePlayerInput）：
player.inputDx = input.dx   // 目标方向 X
player.inputDy = input.dy   // 目标方向 Y
player.aimAngle = input.aimAngle  // 鼠标瞄准角度

// 移动模拟（update，服务端 20Hz = 50ms/tick）：
dt = min(dt, 0.05)  // dt 上限 50ms（1 个 server tick）— 硬约束，同时防止延迟尖峰和碰撞绕过

targetSpeed = CHARACTER_DEFS[type].speed * speedMultiplier
// 速度边界：clamp 到 [base*0.1, base*2.0]，blocksMovement 时直接归零（跳过此计算）
rate = ACCEL_RATE[type]   // 加速和减速共用同一速率
factor = 1 - exp(-dt * rate)  // 指数趋近因子（20Hz 下 factor≈0.917，1 tick 收敛；60fps 下 factor≈0.617，~5 帧收敛）

// 对角线归一化（防止 W+A = 141% 速度）
inputLen = sqrt(inputDx² + inputDy²)
if (inputLen > 1.0):
  inputDx /= inputLen
  inputDy /= inputLen

if (inputDx !== 0 || inputDy !== 0):
  // 加速：指数趋近目标速度
  targetVelocityX = inputDx * targetSpeed
  targetVelocityY = inputDy * targetSpeed
  velocity.x = lerp(velocity.x, targetVelocityX, factor)
  velocity.y = lerp(velocity.y, targetVelocityY, factor)
else:
  // 减速：指数趋近零（与加速对称）
  velocity.x = lerp(velocity.x, 0, factor)
  velocity.y = lerp(velocity.y, 0, factor)
  if (|velocity| < 1.0) velocity = {0, 0}

// 碰撞检测 + 位置更新（保持现有 5 点采样 + 墙壁滑行）
newX = player.x + velocity.x * dt
newY = player.y + velocity.y * dt
```

**关键设计决策**：
- 指数趋近模型：客户端帧 0 即获 ~55% 满速 → "按键即动"；~5 帧到 95% → "重量感"（仅客户端 60fps；服务端 20Hz 下 1 tick 收敛）
- 加速/减速共用同一 ACCEL_RATE → 手感对称，参数减半
- 输入方向（`inputDx/dy`）即时应用 → 方向改变零延迟
- 对角线归一化 → 防止 141% 速度漏洞
- dt 上限 50ms → 硬约束：碰撞安全（对角线位移 31px < 32px tile）+ 防延迟尖峰退化
- `blocksMovement` flag 时速度归零（stun/freeze 状态效果），绕过速度边界 clamp
- 缓冲逐出：last-write-wins（新输入覆盖旧条目）
- 技能拒绝回滚：客户端预测执行 + 服务端拒绝时回滚冷却/能量

#### 子系统二：瞄准（鼠标独立朝向）

**鼠标独立瞄准**：
- 朝向始终跟随鼠标位置，与 WASD 移动方向完全解耦
- 客户端每帧计算：`aimAngle = atan2(mouseY - canvas.height/2, mouseX - canvas.width/2)`
  - 玩家始终在屏幕中心（摄像机跟随），所以 canvas 中心 = 玩家屏幕位置
- 该角度随 `game:input` 协议发送到服务端
- 服务端存储 `player.aimAngle`，用于所有方向相关计算：
  - 近战攻击方向（warrior sword 弧形检测）
  - 远程弹丸发射方向（ranger/mage/cleric 子弹轨迹）
  - 技能目标方向（Dash、Arrow Rain、Meteor 等）

**协议变更**：
```typescript
// shared/protocol.ts
interface GameInput {
  dx: number;        // 移动方向 X（-1 to 1）
  dy: number;        // 移动方向 Y（-1 to 1）
  aimAngle: number;  // 瞄准角度（弧度，来自鼠标位置）
  attack: boolean;   // 攻击状态
  skill?: number;    // 技能索引
}
// 废弃原 angle 字段（跟随移动方向），由 aimAngle 替代
```

**新增服务端事件**：
```typescript
// 服务端 → 客户端：技能执行被拒绝
interface SkillRejected {
  skillIndex: number;      // 被拒绝的技能槽
  reason: 'cooldown' | 'energy' | 'stunned' | 'silenced' | 'dead' | 'invalid' | 'blocked';  // 拒绝原因
}
// 客户端收到后：回滚冷却遮罩、恢复能量显示、技能图标红色闪烁 250ms + 文字提示 500ms

// 服务端 → 客户端：技能执行成功确认
interface SkillAccepted {
  skillIndex: number;      // 执行的技能槽
  serverTimestamp: number; // 服务端时间戳（用于冷却同步，见 F4）
}
// 客户端收到后：确认预测状态，开始冷却计时
```

**近战方向适配**：
- warrior 的 melee 检测从"移动方向"改为"aimAngle 方向"
- 弧形检测中心线 = `player.aimAngle`
- 这让 warrior 可以在移动时精确选择挥砍方向

#### 子系统三：施法（分技能触发模式 + 输入缓冲）

**施法触发模式（混合方案）**：

| 技能类型 | 触发方式 | 技能列表 | 说明 |
|---------|---------|---------|------|
| 即时技能 | key-down 直接施法 | Dash、Shield Bash、War Cry、Holy Light、Dodge Roll | 不需要瞄准确认，按键即释放 |
| AoE/范围技能 | 按住预览 + 松手施法 | Arrow Rain、Meteor、Frost Nova、Sanctuary | 按住显示落点/范围预览指示器，松手释放 |

**即时技能流程**：key-down → 检查条件 → 立即发送 `{ skill: index }` → 服务端执行

**AoE 技能流程**：key-down → 检查条件 → 显示范围/落点预览指示器（跟随鼠标 aimAngle 方向）→ key-up → 发送 `{ skill: index, targetPos? }` → 服务端执行。预览期间（按住状态）不消耗能量、不触发冷却。若条件不满足（冷却中/能量不足），key-down 时立即拒绝（不进入预览）

**吟唱技能预留**：未来新增吟唱技能时，在施法状态机中新增 `casting` 状态——key-down 进入吟唱（显示吟唱进度条），吟唱完成释放，松手中断。吟唱技能走独立状态路径，不影响即时/AoE 技能逻辑

**预览指示器**：
- AoE 技能冷却完毕且能量足够时，按住技能键显示范围指示器（半透明圆/扇形，跟随鼠标方向移动位置）
- 按住 Shift 时显示所有可用 AoE 技能范围（辅助规划）
- 即时技能不显示预览指示器（无意义）

**输入缓冲（150ms 窗口）**：
- 当技能因冷却/能量不足/blocksSkill 被拒绝时，输入存入缓冲队列
- 缓冲窗口：150ms（9 帧 @ 60fps）— 人类预期输入时间方差 ~120ms，150ms 覆盖常见情况
- 每帧检查缓冲队列：条件满足时自动执行最早的缓冲输入
- 缓冲队列最多 1 条（防止技能连发堆积）
- **逐出策略**：新缓冲输入覆盖旧条目（last-write-wins）。玩家快速切换技能意图时，最后按下的技能优先
- silence 状态下不缓冲任何输入（输入直接丢弃）
- 实现位置：客户端和**服务端**双端缓冲 — 客户端用于即时视觉反馈，服务端用于权威判定

**技能拒绝回滚协议**：
- 客户端在 key-down 发送后立即预测执行（设置冷却遮罩、播放动画、扣除能量显示）
- 服务端拒绝时（冷却未到/能量不足/被 stun/被 silence/dead/invalid），通过 `skill:rejected` 事件通知客户端
- 服务端成功时，通过 `skill:accepted` 事件确认（含 serverTimestamp 用于冷却同步）
- 客户端收到拒绝后：回滚冷却遮罩、恢复能量显示、技能图标红色闪烁 250ms + 文字提示（"冷却中"/"被沉默"等）500ms
- **预测超时**：客户端在发送 `game:input` 后 100ms（2 × serverTickRate）内未收到 `skill:accepted` 或 `skill:rejected` → 自动回滚预测状态（假设拒绝）。下一个 `game:state` 会校正实际状态
- 回滚窗口：服务端在收到 `game:input` 后 1 个 tick（50ms）内返回 `skill:accepted` 或 `skill:rejected`，客户端在收到前维持预测状态

**冷却同步（本地优先 + 服务端校正）**：
- 客户端在 key-down 发送成功后**立即**设置本地冷却遮罩（基于已知技能冷却时长）— 消除"幻影就绪"盲区
- 服务端在技能执行成功后，通过 `game:state` 推送 `player.cooldowns[]` 数组
- 客户端收到服务端数据后**校正**本地冷却（服务端权威，取 max(本地, 服务端)）
- 丢包兜底：500ms 内未收到服务端更新 → 维持本地预测（已是主路径，非兜底）

### States and Transitions

玩家控制状态由移动速度和施法状态两个维度描述：

**移动状态：**

| 状态 | 转换条件 | 说明 |
|------|---------|------|
| idle | velocity ≈ 0 且无输入 | 站立，播放 idle 动画 |
| accelerating | 有输入 且 velocity < maxSpeed × 0.9 | 播放 run 动画，速度逐渐增加 |
| moving | velocity ≥ maxSpeed × 0.9 | 播放 run 动画，满速移动 |
| decelerating | 无输入 且 velocity > 1.0 | 播放 run 动画（减速中），速度逐渐降低 |
| blocked | blocksMovement = true | 无法移动（stun/freeze），速度归零 |

**施法状态：**

| 状态 | 转换条件 | 说明 |
|------|---------|------|
| ready | 技能可用（冷却完毕 + 能量足够 + 无 blocksSkill） | 等待输入 |
| casting | key-down 触发技能 | 发送到服务端执行 |
| cooldown | 技能进入冷却 | HUD 显示冷却遮罩 |
| buffered | 技能被拒绝但输入已缓存 | 等待 150ms 窗口内条件满足 |
| silenced | blocksSkill = true | 无法施法，输入被丢弃（不缓冲） |

### Interactions with Other Systems

| 系统 | 接口 | 数据流 |
|------|------|--------|
| Combat | `player.aimAngle` | 瞄准方向 → 近战弧形/远程弹丸方向 |
| Skills | `combat.useSkill(player, skillIndex)` | 施法触发（key-down）→ 技能执行 |
| StatusEffects | `statusManager.getAggregatedFlags()` | speedMultiplier/blocksMovement/blocksSkill |
| Collision | `isWalkableRadius(x, y, r)` | 移动碰撞检测（5 点采样） |
| EnemyAI | `player.aimAngle` (间接) | 敌人不直接使用，但玩家朝向影响攻击方向 |
| ClientRenderer | `player.velocity` (新增) | 客户端用于动画帧选择（idle/run）和移动粒子效果 |
| Protocol | `GameInput.aimAngle`, `skill:rejected` | 新增字段替代原 `angle`；新增服务端拒绝事件 |
| Energy | `player.energy` | 施法能量检查 |

## Formulas

### F1. 移动加速度公式（指数趋近模型）

```
factor = 1 - exp(-dt * ACCEL_RATE)   // 加速和减速共用

// 加速：指数趋近目标速度
velocity.x = lerp(velocity.x, inputDx * targetSpeed, factor)

// 减速：指数趋近零（与加速对称）
velocity.x = lerp(velocity.x, 0, factor)
```

**变量：**

| 变量 | 符号 | 类型 | 范围 | 描述 |
|------|------|------|------|------|
| dt | dt | float | 0.016s (60fps), 上限 0.05s | 帧间隔时间（延迟尖峰时 clamp 到 50ms） |
| ACCEL_RATE | — | float | 30.0–80.0 | 趋近速率（加速和减速共用） |

**按职业 ACCEL_RATE 映射：**

| 职业 | ACCEL_RATE | 帧 0 速度（从静止） | 到 95% 帧数 | 到停止帧数 |
|------|-----------|-----------------|-----------|-----------|
| warrior | 50.0 | 55% maxSpeed | ~5 帧 | ~5 帧 |
| ranger | 60.0 | 62% maxSpeed | ~4 帧 | ~4 帧 |
| mage | 50.0 | 55% maxSpeed | ~5 帧 | ~5 帧 |
| cleric | 50.0 | 55% maxSpeed | ~5 帧 | ~5 帧 |

**输出范围：** velocity 在 0 到 maxSpeed 之间连续变化
**示例（ranger @60fps，按住 W，从静止启动）：**
- factor = 1 - exp(-0.016 × 60) = 1 - 0.383 = 0.617
- 帧 0：lerp(0, 220, 0.617) = 135.7 px/s（62%）
- 帧 1：lerp(135.7, 220, 0.617) = 188.0 px/s（85%）
- 帧 2：lerp(188.0, 220, 0.617) = 207.8 px/s（94%）
- 帧 3：lerp(207.8, 220, 0.617) = 215.3 px/s（98%，基本满速）

**示例（ranger @60fps，松手停止，从满速）：**
- 帧 0：lerp(220, 0, 0.617) = 84.3 px/s
- 帧 1：lerp(84.3, 0, 0.617) = 32.3 px/s
- 帧 2：lerp(32.3, 0, 0.617) = 12.4 px/s
- 帧 3：lerp(12.4, 0, 0.617) = 4.7 px/s
- 帧 4：lerp(4.7, 0, 0.617) = 1.8 px/s
- 帧 5：< 1.0 px/s，触发 idle（~83ms）

### F2. 瞄准角度计算

```
aimAngle = atan2(mouseY - canvas.height/2, mouseX - canvas.width/2)
```

**变量：**

| 变量 | 符号 | 类型 | 范围 | 描述 |
|------|------|------|------|------|
| mouseX | — | int | 0–canvas.width | 鼠标 X 坐标 |
| mouseY | — | int | 0–canvas.height | 鼠标 Y 坐标 |
| canvas.width | — | int | 1024 | 画布宽度 |
| canvas.height | — | int | 768 | 画布高度 |

**输出范围：** -π to π（弧度）
**示例：** 鼠标在 (700, 300) → aimAngle = atan2(300-384, 700-512) = atan2(-84, 182) = -0.433 rad ≈ -24.8°（右上方）

### F3. 输入缓冲公式

```
// 客户端缓冲（本地时钟）：
clientBufferExpiry = performance.now() + BUFFER_WINDOW_MS
isClientBuffered = (performance.now() <= clientBufferExpiry) && (buffer.skillIndex === skillIndex)

// 服务端缓冲（服务端时钟，不使用客户端 timestamp）：
serverBufferExpiry = serverReceivedAt + BUFFER_WINDOW_MS
isServerBuffered = (Date.now() <= serverBufferExpiry) && (buffer.skillIndex === skillIndex)
```

**时钟同步说明**：服务端使用自己的 `receivedAt` 时间戳管理缓冲窗口，**不使用客户端 timestamp**。客户端和服务端的 `Date.now()` 不保证同步（Windows LAN 可有 1-2s 偏差），使用客户端 timestamp 会导致 >150ms 时钟偏差时服务端立即丢弃所有缓冲输入。客户端使用 `performance.now()`（单调时钟，不受系统时间调整影响）。

**变量：**

| 变量 | 符号 | 类型 | 范围 | 描述 |
|------|------|------|------|------|
| BUFFER_WINDOW_MS | — | int | 150ms | 缓冲窗口时间（人类预期输入方差 ~120ms） |
| serverReceivedAt | — | number | Date.now() | 服务端收到输入的时间戳（服务端权威） |
| skillIndex | — | int | 0–2 | 技能槽索引 |

**输出范围：** 缓冲输入在 150ms 内有效，超时自动丢弃
**示例：** 玩家在冷却剩余 80ms 时按技能键 → 输入缓冲 → 80ms 后冷却完毕 → 自动执行

### F4. 冷却同步公式

```
// 服务端：技能执行时（发送剩余时间，非绝对时间戳）
player.cooldowns[skillIndex] = effectiveCooldown  // 冷却时长（ms），非 Date.now() + cooldown
// skill:accepted 推送时携带 serverTimestamp，客户端用于校准

// 客户端：收到 skill:accepted 时（转换为本地时钟）
localCooldownEnd[skillIndex] = performance.now() + accepted.effectiveCooldown

// 客户端：收到 game:state 时（使用相对时间）
for each cooldown in playerState.cooldowns:
  if cooldown > 0:
    localCooldownEnd[skillIndex] = performance.now() + cooldown  // cooldown 是剩余时间
  else:
    localCooldownEnd[skillIndex] = 0  // 冷却完毕
displayReady[skillIndex] = performance.now() >= localCooldownEnd[skillIndex]

// 丢包兜底（500ms 超时，使用 monotonic clock）
if (performance.now() - lastCooldownUpdate > 500):
  use local prediction (localCooldownEnd from last key-down)
```

**时钟同步说明**：服务端发送**冷却剩余时间**（ms），客户端收到后转换为本地 `performance.now()` 绝对时间。这消除了客户端/服务端 `Date.now()` 时钟偏差问题——客户端始终使用自己的单调时钟比较。`performance.now()` 不受系统时间调整（NTP 同步、夏令时等）影响。

**变量：**

| 变量 | 符号 | 类型 | 范围 | 描述 |
|------|------|------|------|------|
| effectiveCooldown | — | number | 2–12s | 技能冷却 × cooldownMultiplier |
| lastCooldownUpdate | — | number | timestamp | 最近一次收到服务端冷却数据的时间 |

### F5. 速度倍率聚合（与 StatusEffects 系统对接）

```
targetSpeed = CHARACTER_DEFS[type].speed * product(all speedMultiplier flags)
// 注意：不含 * dt。dt 仅在位置更新步骤中乘一次（newX = x + velocity.x * dt）
```

- 与 `status-effects.md` D1 章节对齐（已更新：D1 不含 `* dt`，速度单位为 px/s）
- `blocksMovement = true` 时速度直接归零（不经过加减速，不经过速度边界 clamp）。解除后使用当前（非 stun 前）speedMultiplier 重新加速
- 速度上下限：`[baseSpeed * 0.1, baseSpeed * 2.0]`（在 product 之后、blocksMovement 检查之前 clamp）
- 执行顺序：`product(multipliers)` → `clamp(0.1, 2.0)` → `× base` → `blocksMovement ? 0 : result`
- 速度上限 2.0 × base — **硬约束，不可调**。推导：`maxSpeed × dt_max < tileWidth / √2` → `2.0 × 220 × 0.05 = 22px/轴`，对角线 `22 × √2 = 31.1px < 32px tile`。安全余量 0.89px（2.8%）——薄但足够（浮点误差 < 0.01px/tick）。注意：玩家碰撞半径 16px 不影响此计算（半径影响的是实体与墙壁的最小距离，不是单 tick 位移上限）。未来若需更大速度上限，必须实现 sub-step 碰撞检测（将单 tick 位移拆为多步）。
- 负值保护：`product(multipliers)` 结果必须 `Math.max(0, ...)` 后再 clamp（防止 buggy 状态效果产生负速度）

## Edge Cases

- **如果 blocksMovement 被激活时玩家正在移动**：速度立即归零（不经过减速过程），加速度状态重置为 idle。状态解除后需要重新加速。
- **如果 freeze 效果激活**：freeze 使用 `blocksMovement = true`（不使用 `speedMultiplier=0.0`）。原因：`speedMultiplier` 经过 floor clamp 后会产生 10% base 速度，导致冰冻状态下滑行。`blocksMovement` 绕过速度计算，直接归零。
- **如果玩家同时按住相反方向键（W+S 或 A+D）**：输入方向为 (0, 0)，视为无输入，进入减速状态。
- **如果玩家按住对角线（W+A 等）**：输入向量归一化后应用，确保对角线速度 = 直线速度（不超 100%）。
- **如果鼠标正好在玩家屏幕中心位置**：aimAngle 未定义（atan2(0,0)）。此时保持上一帧的 aimAngle 不变。
- **如果输入缓冲中的技能在缓冲窗口内因 blocksSkill 被再次拒绝**：缓冲输入被丢弃（不续期）。silence 状态下不缓冲任何输入。
- **如果网络延迟导致 game:state 中的 cooldowns 数据比客户端本地预测更旧**：客户端取 max(本地, 服务端) 冷却时间（基于 `performance.now()` 单调时钟比较），保证一致性。注：服务端发送冷却剩余时间（ms），客户端转换为本地 `performance.now()` 绝对时间，消除跨机器 `Date.now()` 时钟偏差。
- **如果 Dash 方向与 aimAngle 不一致**：Dash 方向跟随 aimAngle（而非移动方向），确保玩家可以向鼠标方向闪避。
- **如果 Dodge Roll 方向与 aimAngle 不一致**：Dodge Roll 方向跟随移动方向（而非 aimAngle），与 Dash 不同——Dash 是进攻位移（朝瞄准方向），Dodge Roll 是防御闪避（朝逃跑方向）。与 Enter the Gungeon 行为一致。
- **如果加速度过程中被 stun 打断**：速度归零。stun 结束后从 0 重新加速（不保留之前的加速进度）。
- **如果鼠标移出 canvas 范围**：保持最后有效的 aimAngle。不将鼠标位置 clamp 到 canvas 边缘（避免边缘处角度突变）。
- **如果多个技能在同一帧被 key-down 触发**：按 key 1/2/3 优先级顺序依次执行（1 最高）。同一帧最多执行 1 个技能。
- **如果玩家在减速过程中重新按下方向键**：立即切换到加速模式，从当前速度开始加速（不归零重来）。
- **如果服务端 game:state 超过 200ms 未到达**：正常网络波动（10Hz = 100ms 间隔，偶尔丢 1 包），客户端继续用最后已知状态渲染。超时超过 500ms 时 debug 模式记录警告。超时超过 1s 时显示"连接中..."提示（即时出现，无渐入动画——这是关键状态，不是装饰性通知）。超时超过 3s 时显示"连接断开"并尝试重连。
- **如果延迟尖峰导致 dt > 50ms**：dt clamp 到 0.05s。这是碰撞安全的硬约束（对角线位移 31px < 32px tile），不仅防延迟尖峰。
- **如果客户端预测的技能被服务端拒绝**：客户端回滚冷却遮罩、恢复能量显示、技能图标红色闪烁 250ms + 文字提示（"冷却中"/"被沉默"等）500ms。回滚在收到 `skill:rejected` 后立即执行。
- **如果技能预测超时（100ms 内未收到 accepted/rejected）**：客户端自动回滚预测状态（假设拒绝）。下一个 `game:state` 会校正实际状态。这是 server crash / socket reconnect 的兜底路径。
- **如果新技能输入到达时缓冲队列已有条目**：新输入覆盖旧条目（last-write-wins）。玩家切换意图时最后按下的技能优先。

## Dependencies

### 上游依赖（本系统需要）

| 系统 | 提供什么 | 接口 | 硬/软依赖 |
|------|---------|------|----------|
| StatusEffects | speedMultiplier, blocksMovement, blocksSkill | `statusManager.getAggregatedFlags()` | 硬（无 flags 无法正确移动/施法） |
| Collision | 碰撞检测 | `isWalkableRadius(x, y, r)` | 硬（无碰撞则穿墙） |
| Protocol | 网络传输 | `GameInput` 接口 | 硬（无协议无法通信） |
| CharacterDefs | 速度/趋近速率基础值 | `CHARACTER_DEFS[type].speed/accelRate` | 硬（无配置无法计算） |

### 必需 Schema 变更（shared/types.ts）

本系统实现前必须先更新 `shared/types.ts` 的 PlayerState：

```typescript
// 新增字段（PlayerState）
velocity: { x: number; y: number }     // 当前速度向量（客户端用于动画状态）
inputBuffer?: {                          // 输入缓冲（服务端权威）
  skillIndex: number;
  timestamp: number;
}
cooldowns: number[]                      // 冷却结束时间戳数组（服务端权威）

// 弃用字段（迁移期保留，双写）
angle: number                            // 已有，由 aimAngle 替代（迁移期两者同时存在）
```

**协议变更（shared/protocol.ts）**：
```typescript
// GameInput 新增
aimAngle: number  // 瞄准角度（弧度，来自鼠标位置）
// 迁移期保留 angle 字段，服务端读取 aimAngle ?? angle
```

**注意**：`inputDx`/`inputDy` 不加入 PlayerState — 服务端已有此数据（来自 GameInput），广播回去无意义。客户端通过 `velocity` 推断其他玩家的移动方向。

### 下游依赖（本系统服务）

| 系统 | 消费什么 | 接口 | 说明 |
|------|---------|------|------|
| Combat | `player.aimAngle` | 攻击方向 | 近战弧形/远程弹丸方向 |
| Skills | `combat.useSkill(player, index)` | 施法触发 | key-down 即发 |
| ClientRenderer | `player.velocity` | 动画状态 | idle/accelerating/moving/decelerating |
| ClientRenderer | `player.aimAngle` | 精灵朝向 | 角色+武器面向鼠标方向 |
| EnemyAI | 无直接依赖 | — | 敌人 AI 不使用玩家瞄准数据 |
| Dungeon | `isWalkableRadius()` | 碰撞检测 | 移动碰撞（间接，通过 Collision） |

### 依赖图

```
shared/character-definitions.ts ← PlayerControl ← Combat (aimAngle)
shared/protocol.ts (GameInput) ← PlayerControl ← Skills (useSkill)
StatusEffects (flags) ← PlayerControl ← ClientRenderer (velocity, aimAngle)
Collision (isWalkable) ← PlayerControl ← ClientUI (冷却 HUD)
```

## Tuning Knobs

### 移动手感

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| warrior.accelRate | 50.0 | 30.0–80.0 | warrior 趋近速率（加速/减速共用） |
| ranger.accelRate | 60.0 | 35.0–90.0 | ranger 趋近速率（最灵活） |
| mage.accelRate | 50.0 | 30.0–80.0 | mage 趋近速率 |
| cleric.accelRate | 50.0 | 30.0–80.0 | cleric 趋近速率 |
| velocity.threshold | 1.0 px/s | 0.5–5.0 | 低于此速度视为静止（避免浮点抖动） |
| dt.max | 50ms | 30–100 | 帧间隔上限（防止延迟尖峰退化） |

### 瞄准

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| aimAngle.sendThreshold | 0.05 rad | 0.02–0.1 | 角度变化超过此值才发送更新（减少网络包） |
| aimAngle.interpolation | false | true/false | 客户端是否插值瞄准角度变化（false = 即时） |

### 施法

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| inputBuffer.windowMs | 150 | 100–250 | 输入缓冲窗口（150ms 覆盖人类预期输入方差 ~120ms） |
| inputBuffer.maxEntries | 1 | 1–3 | 缓冲队列最大长度 |
| cooldownSync.fallbackMs | 500 | 200–1000 | 服务端冷却数据超时后回退到本地预测 |
| skillPreview.holdMs | 200 | 100–500 | 按住技能键多久后显示范围预览 |

### 速度倍率（与 StatusEffects 共享）

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| speed.floor | 0.1 × base | 0.05–0.2 | 速度下限倍率 |
| speed.ceiling | 2.0 × base | 硬约束 | 速度上限倍率（不可调：maxSpeed × dt_max < tileWidth/√2，详见 F5） |

## Visual/Audio Requirements

### 移动视觉反馈

| 状态 | 视觉效果 | 说明 |
|------|---------|------|
| idle | idle 动画帧（4 帧循环） | 现有，不变 |
| accelerating | run 动画帧（4 帧循环）+ 脚下尘土粒子（2-3 个，alpha 递减） | 启动时有"踏地"感 |
| moving | run 动画帧（4 帧循环） | 现有，不变 |
| decelerating | run 动画帧正常速度播放 + 脚后方尘土/滑行痕迹（2-3 个粒子，alpha 递减）+ 减速到 0 时角色轻微前倾（2 帧）然后回到 idle | 惯性感通过粒子和位移减速传达，不通过动画减速（动画帧间隔不变，避免被误认为掉帧） |
| blocked (stun) | 头顶旋转星星 | 现有 StatusEffects 渲染 |
| blocked (freeze) | 角色着色变蓝 + 冰晶粒子 | 现有 StatusEffects 渲染 |

### Dash 轨迹视觉

| 元素 | 描述 | 参数 |
|------|------|------|
| 残影 | Dash 路径上 3 个半透明玩家副本 | alpha: 0.6/0.4/0.2，间距 50px，存在 200ms |
| 速度线 | Dash 方向的白色短线（4 条） | 长度 20px，存在 150ms |
| 落点闪光 | Dash 终点的小型白色爆点 | 半径 10px，存在 100ms |

### 近战范围指示

| 元素 | 描述 | 位置 |
|------|------|------|
| 近战范围指示 | warrior 专用：90° 弧形半透明区域 | 按住攻击键时显示，半径 50px |

### 音效

| 事件 | 音效 | 说明 |
|------|------|------|
| 移动启动 | `footstep_grass`（已有） | 脚步声，加速时每 200ms 播放 |
| Dash 释放 | `dash_whoosh`（新） | 快速位移的风声，频率上升 |
| 技能 key-down 释放 | 对应技能 SFX（已有） | 从 key-up 移到 key-down 触发 |
| 技能被拒绝 | `skill_cooldown.wav`（已有） | 不变 |
| 输入缓冲执行 | 无声 | 缓冲触发的技能使用正常技能音效 |

## UI Requirements

### 鼠标光标

- 使用系统默认鼠标光标，角色精灵朝向跟随 aimAngle 指示瞄准方向
- 参考：Hades/Gungeon 使用自定义光标精灵替换而非隐藏

### 技能冷却 HUD 修正

| 变更 | 当前行为 | 新行为 |
|------|---------|--------|
| 冷却数据源 | 客户端本地预测（key-up 时间戳） | 服务端权威（`game:state` 推送） |
| 冷却显示 | key-up 后立即显示遮罩 | 收到服务端 cooldowns 后显示遮罩 |
| 兜底机制 | 无 | 500ms 未收到服务端数据 → 回退本地预测 |
| 冷却就绪反馈 | 无特殊反馈 | 冷却完毕时技能图标双脉冲闪烁（白色，150ms on-off-on） |

### 移动状态指示

| 元素 | 描述 | 说明 |
|------|------|------|
| 速度线 | 快速移动时（>80% maxSpeed）角色后方短线 | 增强速度感，2-3 条白色短线 |
| 停顿感 | 减速到 0 时角色轻微前倾（1 帧）然后回到 idle | 惯性视觉暗示 |

### 输入状态指示

| 元素 | 描述 | 说明 |
|------|------|------|
| 输入缓冲指示 | 技能被缓冲时，技能栏显示小沙漏图标（普通模式可见） | 150ms 后消失或技能执行；缓冲超时丢弃时图标变红 250ms（"输入已丢弃"反馈） |
| 技能拒绝提示 | 技能被拒绝时，技能图标红色闪烁 250ms + 文字提示 500ms | 文字内容：冷却中/被沉默/能量不足等，出现在技能图标附近 |
| 连接状态 | game:state 超过 1s 未到达时显示"连接中..."（即时出现，无渐入动画） | 屏幕顶部居中，像素字体。超过 3s 显示"连接断开"并尝试重连 |

## Acceptance Criteria

### 移动验收

1. **GIVEN** ranger 在 idle 状态, **WHEN** 按住 W 键, **THEN** 帧 0 速度 ≥ 135 px/s（~62% 满速），帧 3 ≥ 215 px/s（~98% 满速）
2. **GIVEN** warrior 在满速移动中, **WHEN** 松开所有方向键, **THEN** 角色在 ~5 帧内（83ms）从满速减速到 <1 px/s（指数趋近归零）
3. **GIVEN** 玩家向墙壁移动, **WHEN** 碰撞发生, **THEN** 角色沿墙壁滑行（不卡住），速度不突变
4. **GIVEN** 玩家被 stun, **WHEN** 正在加速过程中, **THEN** 速度立即归零，stun 结束后从 0 重新加速
5. **GIVEN** 玩家同时按住 W 和 S, **WHEN** 无其他输入, **THEN** 角色进入减速状态（输入方向为 0）
5b. **GIVEN** 玩家按住 W+A（对角线）, **WHEN** 移动, **THEN** 合成速度 = targetSpeed（不超 100%），归一化生效

### 瞄准验收

6. **GIVEN** ranger 在向右移动（D 键）, **WHEN** 鼠标在屏幕左上方, **THEN** 角色面向左上方（aimAngle 跟随鼠标），同时向右移动
7. **GIVEN** warrior 在移动中, **WHEN** 点击攻击键, **THEN** 近战弧形检测以 aimAngle 方向为中心线（非移动方向）
8. **GIVEN** 鼠标正好在玩家屏幕中心, **WHEN** 移动鼠标, **THEN** aimAngle 保持上一帧值不变（不抖动）
9. **GIVEN** 玩家释放 Dash 技能, **WHEN** aimAngle 朝向右上方, **THEN** Dash 方向为右上方（跟随 aimAngle，非移动方向）

### 施法验收

10a. **GIVEN** 即时技能（Dash）冷却完毕且能量足够, **WHEN** 按下技能键（key-down）, **THEN** 技能立即释放（不等 key-up），视觉反馈 < 16ms，服务端确认 < 100ms，客户端立即显示冷却遮罩
10b. **GIVEN** AoE 技能（Meteor）冷却完毕且能量足够, **WHEN** 按住技能键, **THEN** 显示落点范围预览指示器（跟随鼠标方向）；**WHEN** 松手（key-up）, **THEN** 技能释放到预览位置
10c. **GIVEN** AoE 技能冷却中, **WHEN** 按住技能键, **THEN** 不进入预览模式，立即拒绝（播放冷却音效）
11. **GIVEN** 技能冷却剩余 80ms, **WHEN** 按下技能键, **THEN** 输入被缓冲，80ms 后冷却完毕时自动执行
12. **GIVEN** 技能冷却剩余 200ms, **WHEN** 按下技能键, **THEN** 输入被缓冲但 150ms 后超时丢弃（不执行）
13. **GIVEN** 玩家被 silence, **WHEN** 按下技能键, **THEN** 技能被拒绝且输入不缓冲
14. **GIVEN** 即时技能刚执行完毕, **WHEN** key-down 发送成功, **THEN** 客户端立即显示冷却遮罩（本地优先），game:state 到达后校正（服务端权威）

### 集成验收

15. `npx tsc --noEmit` — 零 error
16. E2E — 登录→建房→选职业→准备→冒险，4 职业移动/瞄准/施法验证无报错
17. 多人场景 — 2 个玩家同时移动+施法无弹道混淆
18. 性能 — 移动+瞄准+施法逻辑每帧 < 0.5ms（不含碰撞检测和渲染）

## Open Questions

1. **Q: Dash 方向跟随 aimAngle 还是移动方向？** ✅ 已解决：跟随 aimAngle（已在 Edge Cases 中定义）。warrior 的 Shield Bash 前方扇形检测也统一跟随 aimAngle。

2. **Q: 远程职业的弹丸发射点是玩家中心还是武器位置？** ✅ 已解决：保持玩家中心发射，简化计算。

3. **Q: 客户端是否需要本地预测移动（客户端先行）？** A: 当前服务端权威 + 10Hz 同步 + lerp 插值。如果启用客户端预测（先移动再校正），手感会更好但增加回滚复杂度。→ **建议暂不启用**，当前 10Hz 插值已经够用，先优化加减速手感。注意：无客户端预测时，"按键延迟 < 1 帧"的 Player Fantasy 目标数学上不可能实现（10Hz = 平均 50ms 延迟），实际目标为 < 100ms。

4. **Q: 移动加速度参数是否需要存入 `CHARACTER_DEFS` 注册表？** A: 是的，作为新字段 `accelRate` 存入 `shared/character-definitions.ts`。这符合单一数据源架构。

6. **Q: 输入缓冲是否需要支持"技能队列"（按 1→2→3 自动连招）？** A: 当前设计只缓冲 1 条输入。连招系统可以作为未来扩展，不在本次范围内。

7. **Q: 精灵翻转方向基于 aimAngle 还是移动方向？** ✅ 已解决：基于 aimAngle（玩家始终面向鼠标方向），与 Enter the Gungeon 行为一致。其他玩家看到的精灵朝向基于该玩家的 aimAngle（通过 game:state 同步）。现有精灵翻转逻辑需从"移动方向"改为"aimAngle"。

8. **Q: 技能释放是 key-down 直接施法还是按住预览+松手施法？** ✅ 已解决：分技能混合方案——即时技能（Dash/Shield Bash/War Cry/Holy Light/Dodge Roll）key-down 直接施法；AoE 技能（Arrow Rain/Meteor/Frost Nova/Sanctuary）按住显示预览+松手施法。吟唱技能作为未来扩展，在施法状态机中新增 `casting` 状态。
