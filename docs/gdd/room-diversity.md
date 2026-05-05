# 关卡结构差异化系统

> **Status**: Approved (v2 修订 — 四种关卡独立生成算法，5th review passed 2026-05-05)
> **Author**: 猫山同学 + Claude Code
> **Last Updated**: 2026-05-05
> **Implements Pillar**: 探索惊喜感、战斗策略深度、高风险高回报选择

## Overview

本系统将地牢探索的关卡结构从**单一 BSP 生成**升级为**四种独立生成算法**，每种关卡拥有完全不同的空间结构、战斗节奏和探索体验：

1. **普通关（Floor 1-4 常规探索）**：BSP-Enhanced 算法——非矩形房间（十字形/L形/椭圆）、A* 弯曲走廊、3-5 条导航价值环路，创造自然有机的空间感
2. **Boss 关（Floor 5）**：固定参数的王座大厅 + 入口走廊，4 根柱子提供掩体，红色地毯和横幅营造仪式感。没有探索阶段，走进来直面对决
3. **迷宫关（Floor 2-4 过渡时 20% 概率触发）**：整层变成一座迷宫。递归回溯生成 + Combat Pockets（走廊中突然开阔的战斗空间）+ Dead-End Rewards（死胡同奖励驱动探索）。**迷雾系统**限制玩家视野为 4 tiles，走过的地方保留暗淡记忆
4. **竞技关（Floor 2-4 过渡时 10% 概率触发）**：中央竞技场 + 环形通道的双层结构。4 个通道口连接内外两层，形成咽喉点战术空间。波次竞技，柱子掩体 + 环形风筝

**关卡间互斥规则**：迷宫关和竞技关同一过渡点只触发一种，每局各最多 1 次。迷宫关和竞技关不计入 1-5 层数。

**底层改造**：保留环境物体系统（柱子/陷阱/装饰/门）和竞技关波次机制不变，新增 `MazeGenerator`（迷宫生成器）、`BossArenaGenerator`（王座厅生成器）、`ColosseumGenerator`（同心双层竞技场生成器），渲染管线新增迷雾层（Fog of War）。

## Player Fantasy

每次进入新 Floor 都不确定会面对什么——

普通 Floor 的走廊不再是千篇一律的直角弯道。有些房间是十字形的，有些是 L 形的，走廊沿着自然弯曲的路径连接它们。偶尔你会发现一条环路——绕过刚才的房间，走到一个你从未到过的区域。空间感是活的、有机的，不再是网格化的方盒子堆叠。

Floor 5 的 Boss 房间不需要任何文字提示，走进来就能感受到——更暗的光线、红色地毯从入口走廊一直延伸到王座台下，两侧的旗帜和柱子告诉你：这里不是普通的房间。没有探索，没有岔路，只有你和 Boss 之间的一片空地。

迷宫关是最紧张的体验。视野突然缩小到身边 4 格，其余全是黑暗。你沿着走廊前进，遇到岔路——左边还是右边？左边走到尽头发现一瓶药水，值得。右边突然变开阔了——Combat Pocket，两只小怪扑来。清完继续走，迷雾中依稀看到出口的光。走过的地方不会完全消失，留下暗淡的记忆帮你认路。每条死胡同都可能藏着奖励，也可能什么都没有——但你不会知道，除非亲自走过去。

竞技关是另一个极端——环形通道包围着中央竞技场，4 个通道口是唯一的进出咽喉。柱子提供掩体，但环形通道上的陷阱让风筝战术充满风险。三波敌人，一波比一波猛。清完后散落的稀有战利品告诉你：这场赌博值得。

环境物体系统贯穿所有关卡类型：柱子是真真切切的掩体（法师躲在后面蓄力、战士绕着柱子和 Boss 周旋），陷阱不只是地面装饰（引诱敌人踩陷阱是有效战术），竞技关的出口门在你发动攻击的瞬间轰然关闭——你选择战斗。

## Detailed Design

### Core Rules

#### 1. GameRoom 状态机

当前 `GameRoom` 无显式状态。竞技关和楼层过渡需要正式状态机。

**状态定义**：

| 状态 | 含义 | tick 行为 |
|------|------|----------|
| `LOBBY` | 等待玩家准备 | 无 tick |
| `FLOOR_TRANSITION` | 过渡动画/生成 | 无 tick，决定下一层类型 |
| `PLAYING` | 普通 Floor 活跃游玩 | 正常 update（移动/敌人AI/战斗/物品/过关检测） |
| `MAZE_PLAYING` | 迷宫关游玩 | 正常 update + 迷雾视野限制 |
| `ARENA_PLAYING` | 竞技关游玩 | arena 行为（出口开放/攻击触发/波次战斗） |
| `VICTORY` | Floor 5 通过 | 终态 |
| `GAME_OVER` | 全员死亡 | 终态 |

**转换表**：

```
LOBBY             →(start())                           → FLOOR_TRANSITION
FLOOR_TRANSITION  →(startFloor() completes)            → PLAYING
FLOOR_TRANSITION  →(startMaze() completes)             → MAZE_PLAYING (fog enabled)
FLOOR_TRANSITION  →(startArena() completes)            → ARENA_PLAYING (enemies dormant, exit open)
PLAYING           →(all enemies dead)                  → exit opens (stay PLAYING)
PLAYING           →(player→exit, floor<5)              → FLOOR_TRANSITION (random: maze/arena/next)
PLAYING           →(all enemies dead, floor=5)         → VICTORY
PLAYING           →(all players die)                   → GAME_OVER
MAZE_PLAYING      →(player→exit)                       → FLOOR_TRANSITION (startFloor(N+1))
MAZE_PLAYING      →(all players die)                   → GAME_OVER
ARENA_PLAYING     →(player→exit, no attack triggered)  → FLOOR_TRANSITION (startFloor(N+1))
ARENA_PLAYING     →(player attacks dormant enemy)      → exit closes, wave 1 activates
ARENA_PLAYING     →(all 3 waves cleared)               → rewards, exit opens → FLOOR_TRANSITION
ARENA_PLAYING     →(all players die)                   → GAME_OVER
```

**状态守卫**：
- `checkEnemyClearance()` 在所有 enemies alive=false 时打开出口（PLAYING 状态，现有行为不变）
- `checkFloorExit()` 检测玩家到达出口点（现有行为不变）
- `FLOOR_TRANSITION` 时决定下一层类型（互斥随机）：
  ```
  if floor ∈ {1,2,3} (过渡到 Floor 2/3/4):
    roll = random()
    if roll < 0.1 and !arenaTriggered:   → startArena(), arenaTriggered = true
    elif roll < 0.3 and !mazeTriggered:  → startMaze(), mazeTriggered = true
    else:                                 → startFloor(N+1)
  else (Floor 5):                         → VICTORY
  ```
- `MAZE_PLAYING` 期间：迷雾系统启用，出口始终开放（无门），敌人正常活跃（无 dormant 机制）
- `ARENA_PLAYING` 期间：出口门默认 `doorOpen=true`，Wave 1 敌人处于 `dormant` 状态
- `checkArenaAttack()` 检测玩家对 dormant 敌人的攻击：触发后 `doorOpen=false`，所有 dormant 敌人激活，开始波次系统
- `mazeTriggered` 和 `arenaTriggered` 分别追踪，保证每局各最多 1 次迷宫关和 1 次竞技关
- 迷宫关和竞技关**互斥**：同一过渡点只会触发一种（先检查 arena 的 10%，再检查 maze 的 20%）
- 非法转换被静默忽略，phase 不变

#### 2. 多生成器路由

`GameRoom.startFloor()` / `startMaze()` / `startArena()` 根据关卡类型路由到不同的生成器：

```
GameRoom.startFloor(floor):
  if floor == 5:
    data = BossArenaGenerator.generate(floor, seed)
  else:
    data = DungeonGenerator.generate(floor, seed)  // BSP-Enhanced

GameRoom.startMaze():
  data = MazeGenerator.generate(floor, seed)
  phase = MAZE_PLAYING
  mazeFog = { enabled: true, visionRadius: 128 }

GameRoom.startArena():
  data = ColosseumGenerator.generate(floor, seed)
  phase = ARENA_PLAYING
```

**新增文件**：

| 文件 | 职责 |
|------|------|
| `server/game/dungeon/BossArenaGenerator.ts` | Floor 5 王座厅生成（固定参数） |
| `server/game/dungeon/MazeGenerator.ts` | 陷阱迷宫关生成（递归回溯+Combat Pockets） |
| `server/game/dungeon/ColosseumGenerator.ts` | 竞技关同心双层生成 |

**可删除文件**：`server/game/dungeon/RoomTemplates.ts`（普通关改用非矩形房间直接生成，不再需要减法雕刻模板）

#### 3. 普通关（BSP-Enhanced）

保留 BSP 分裂作为房间布局的骨干（确定性、可控、已验证），在每一步做增量升级。

**为什么保留 BSP**：32×24 tiles 是微型地图，10-14 个房间随机放置碰撞剔除率高。BSP 在这个尺度上更可靠。

**升级 1: 非矩形房间**

BSP 叶节点内不再只生成矩形，按概率选择形状：

| 形状 | 概率 | 描述 |
|------|------|------|
| 矩形 | 60% | 标准 |
| 十字形 | 15% | 中心十字，四角为墙 |
| L 形 | 15% | 两矩形叠加 |
| 椭圆形 | 10% | 椭圆内区域可行走 |

在碰撞网格上按形状方程填充 true，渲染器按 grid 渲染无需改动。

**升级 2: 房间合并**

BSP 生成后，面积之和 < 200px 的相邻叶节点合并为一个大房间（形状自然变不规则）。

**升级 3: A* 弯曲走廊**

替代 L 形走廊。A* 在 tile 网格上寻路，代价函数鼓励沿已有路径走（走廊复用=自然形成广场和交叉口）。

**升级 4: 智能环路注入**

替代当前的线性链 + 1-2 随机环路。在房间连接图上加 3-5 条环路，优先选择"让最远两房间路径缩短 30%+"的边——保证每条环路都有导航价值，不是无意义的捷径。

**房间类型简化**（迷宫关升级为独立关卡后）：
- 普通关房间类型：entrance / normal / treasure / exit
- 陷阱作为 envObject 随机出现在 normal 房间中（概率 10%，Floor 2+），但房间结构仍然是正常的多房间布局
- 不再有 trap 房间类型

**与当前 BSP 的对比**：

| 维度 | 当前 BSP | BSP-Enhanced |
|------|---------|-------------|
| 房间形状 | 全矩形 | 矩形/十字/L/椭圆 + 房间合并 |
| 走廊形状 | L 形 | A* 自然弯曲 |
| 环路 | 线性链 + 1-2 随机 | 3-5 条导航价值环路 |
| 空间感 | 网格化、规律 | 自然、有机 |
| 可靠性 | 已验证 | BSP 骨干不变，增量升级 |

#### 3a. Boss 关（Floor 5 王座厅）

Floor 5 不再用 BSP。改为**固定参数的王座大厅 + 入口走廊**。没有探索阶段，走进来直面对决。

**布局参数**：

| 属性 | 值 |
|------|-----|
| 王座大厅 | 832×576 px (26×18 tiles)，居中 (x=96, y=96) |
| 入口走廊 | 64×192 px (2×6 tiles)，连接大厅左侧 |
| 柱子 | 4 根，四角距墙 32px，HP=120 |
| 横幅 | 4 个，墙壁内侧，spriteKey='wall_banner_red' |
| 王座台 | 大厅右端中央，装饰 envObject |
| 地板色 | 暗红 #351A1A + 中心红色地毯 #2A0A0A |
| spawnPoint | 走廊左端中心 |
| Boss 位置 | 大厅中心偏右 |

**生成函数**：
```typescript
function generateBossArena(floor: number, seed: number): DungeonData {
  // 1. 全 false 网格 (32×24 tiles)
  // 2. 大厅 true (col 3-28, row 3-20)
  // 3. 走廊 true (col 1-2, row 9-14)
  // 4. 4 柱子 + 4 横幅 + 1 王座台
  // 5. 柱子烘焙 → grid false
  // 6. Boss @ 大厅中心偏右
  // 7. 入口处 health + potion
}
```

#### 3b. 迷宫关（独立迷宫关卡 + 迷雾系统）

**触发机制**：Floor 2-4 过渡时 20% 概率（与竞技关 10% 互斥），每局最多 1 次，不计入 1-5 层数。

**迷宫算法**：Recursive Backtracking + Combat Pockets + Dead-End Rewards

```typescript
function generateMaze(cols: number, rows: number, seed: number): boolean[][] {
  // 1. 初始化全 false（墙壁）网格 (32×24 tiles)
  //    迷宫单元格: 16×12 个（奇数行奇数列为单元格，偶数行列为墙）
  // 2. 递归回溯生成完美迷宫（从入口(0,0)开始）
  // 3. 打通 8-12 面墙壁创造环路
  // 4. BFS 找入口→出口最短路径，拓宽为 2 tiles（主路径舒适通行）
  // 5. Combat Pockets：死胡同密集区合并为 4×4 tile 战斗空间，内放 1-2 个 basic/fast
  // 6. Dead-End Rewards：独立死胡同末端放置 60%道具/20%陷阱/20%空
  // 7. 走廊巡逻小怪：3-5 个 basic/fast
}
```

**布局参数**：

| 属性 | 值 | 说明 |
|------|-----|------|
| 迷宫单元格 | 16×12 | 每个 2×2 tiles |
| 通道宽度 | 主路径 2 tiles，支路 1-2 tiles | |
| Combat Pockets | 3-4 个，每个 4×4 tiles | 死胡同密集区合并，内含 1-2 个 basic/fast |
| 死胡同奖励 | 每个独立死胡同末端 | 60%道具/20%陷阱/20%空 |
| 陷阱类型 | spike(60%)/fire(30%)/slow(10%) | |
| 走廊巡逻小怪 | 3-5 个 basic/fast | |
| 环路 | 8-12 个额外打通 | |
| 入口 | 西侧中部 (col 0-1, row 11-12) | |
| 出口 | 东侧中部 (col 30-31, row 11-12) | |
| 地板色 | #2A2220 (深棕灰) | |

**玩家体验循环**：
1. **走廊探索**：迷雾中沿走廊前进，遇到岔路
2. **岔路决策**："这是通向出口还是死胡同？"
3a. **死胡同→奖励**：走到尽头发现道具 → "走错了但值得" → 回头
3b. **死胡同→空/陷阱**：偶尔空手或踩陷阱 → "下次要不要冒险？" → 回头
3c. **Combat Pocket**：走廊突然变开阔 → 小怪出现 → 战斗 → 清除后继续
4. **找到出口**：主路径通向出口

**迷雾系统（Fog of War）**：

核心机制：迷宫关中，玩家只能看到自身周围一定半径内的区域，其余全部为黑色。

| 参数 | 值 | 说明 |
|------|-----|------|
| 视野半径 | 128px (4 tiles) | 圆形视野 |
| 视野边缘 | 渐变过渡 (16px) | 边缘 alpha 从 1→0 |
| 已探索区域 | fog overlay alpha=0.7（地面 30% 可见） | 走过的地方保留暗淡记忆（alpha=0.7 黑色遮罩 = 地面内容 30% 亮度透出） |
| 未探索区域 | 全黑 (alpha=1.0) | 从未看到的区域完全黑暗 |

**客户端实现**：
- 在所有游戏元素绘制完成后，叠加迷雾层
- 使用离屏 canvas 缓存，每帧只更新玩家位置附近区域
- 已探索区域由客户端维护 `exploredTiles: Set<string>` ("col,row")
- 迷宫关出口始终开放（无门），玩家到达出口即过关

**服务端无改动**：迷雾是纯客户端视觉效果。碰撞网格、敌人 AI、陷阱逻辑不变。

**Debug 全亮模式**：DebugMenu 新增"迷宫全亮 ON/OFF"开关（纯客户端），跳过 drawFogOfWar()。

**数据结构**：
```typescript
// shared/types.ts 新增
interface MazeFogState {
  enabled: boolean           // 是否为迷宫关
  visionRadius: number       // 视野半径 (px)
  exploredTiles: string[]    // 已探索格子 "col,row" 列表
}
```

#### 4. 环境物体系统

**数据结构**：

```typescript
interface EnvObjectState {
  id: string;
  type: 'pillar' | 'trap' | 'door' | 'decoration';
  x: number; y: number;          // 中心位置 (px)
  width: number; height: number;  // 碰撞框 (px)
  alive: boolean;
  hp?: number; hpMax?: number;    // 可破坏物体（柱子）
  trapType?: 'spike' | 'fire' | 'slow';
  trapActive?: boolean;           // 循环开关
  triggeredEntityIds?: string[];  // 本激活周期内已触发的实体 ID 列表，trapActive→false 时清空
  trapCycleTimer?: number;
  trapOnDuration?: number;
  trapOffDuration?: number;
  doorOpen?: boolean;
  spriteKey?: string;
}
```

**柱子（障碍物）**：

| 属性 | 值 |
|------|-----|
| HP | 120（可被玩家/敌人摧毁） |
| 碰撞框 | 32×32 px |
| 阻挡移动 | 是（碰撞网格标记 false） |
| 阻挡子弹 | 是（子弹命中扣柱子 HP） |
| 被摧毁时 | 碰撞网格恢复 true，20% 掉落 coin |

**陷阱（全伤害：玩家+敌人）**：

| 陷阱类型 | 伤害/次 | 周期 | 效果 | 检测半径 |
|---------|---------|------|------|---------|
| spike | 15 | 2s 激活 / 3s 停用 | 即时伤害 | 28 px |
| fire | 10 | 1.5s 激活 / 2.5s 停用 | 伤害 + burn 3s | 28 px |
| slow | 0 | 3s 激活 / 2s 停用 | slow(0.3, 2s) | 28 px |

- 陷阱**不**修改碰撞网格（可走过，伤害通过半径检测）
- 激活前 500ms 视觉警告（闪烁/发光），给玩家反应时间
- 敌人 AI **不**感知陷阱（故意设计——引诱敌人踩陷阱是有效战术）

**陷阱生命周期**：
```
spawn: trapActive=false, trapCycleTimer=trapOffDuration（从停用状态开始）
tick:  trapCycleTimer -= dt
       if trapCycleTimer <= 0:
         trapActive = !trapActive
         trapCycleTimer = trapActive ? trapOnDuration : trapOffDuration
         if switching to false: triggeredEntityIds.clear()（停用时清空已触发列表）
```
- 500ms 警告期：`trapActive=false` 且 `trapCycleTimer <= 500` 时客户端渲染红色闪烁
- 每次激活周期内，实体首次进入检测半径触发一次（通过 triggeredEntityIds 去重）
- 实体停留在陷阱范围内不会重复受伤，必须等下一激活周期重新进入

**门（竞技关锁门）**：

| 属性 | 值 |
|------|-----|
| 阻挡移动 | 是（doorOpen=false 时碰撞网格标记 false） |
| 阻挡子弹 | 是（子弹撞击销毁） |
| 开启条件 | 竞技关所有敌人死亡 |
| 碰撞变化 | 开启时门 tile 从 false 改为 true |

**碰撞网格交互**：保持单一 `boolean[][]`，物体"烘焙"进网格：
- 柱子和门的位置必须 tile 对齐（`x%32===0, y%32===0`），确保碰撞框精确匹配 1 个 tile，避免跨 tile 边界的"幽灵墙"
- 柱子生成时标记 false，被摧毁时恢复 true（仅恢复该柱子占用的 tile）
- 门关闭时标记 false，开启时恢复 true
- 陷阱不修改网格

**装饰（纯视觉）**：

| 类型 | 用途 | 碰撞 |
|------|------|------|
| banner | Boss 房间墙壁装饰 | 无 |
| torch | Boss/竞技关氛围 | 无 |
| bones | 竞技关地面装饰 | 无 |

#### 5. 竞技关系统（同心双层）

**位置**：Floor N 和 Floor N+1 之间的可选独立层。不计入 1-5 层数。Floor 5 完成后直接 VICTORY 无竞技关。仅在 Floor 1→2、2→3、3→4 过渡时（即源 floor∈{1,2,3}）可能触发。

**触发机制**（概率触发 + 行为选择）：
- Floor 1-4 清除后玩家到达出口 → `FLOOR_TRANSITION`
- 系统决定：若 `arenaTriggered=false` 且 `floor∈{1,2,3}`（即过渡到 Floor 2/3/4），`random() < 0.1` → 进入竞技关
- 进入竞技关后设 `arenaTriggered=true`（保证每局最多 1 次竞技关）
- Floor 5 直接 VICTORY，不触发竞技关

**竞技关初始状态**（玩家进入后）：
- 同心双层结构（中央场 + 环形通道）生成完成
- 出口门 `doorOpen=true`（玩家可直接通过到 Floor N+1）
- Wave 1 敌人已生成但处于 **dormant** 状态：
  - 移动速度 ×0.3（慢速巡逻）
  - 不追击玩家（不执行仇恨检测）
  - 不攻击玩家（不执行攻击逻辑）
  - 碰撞仍生效（玩家不可穿过）
  - 外观与普通敌人有视觉差异（紫色着色 + 头顶睡眠指示器，见 Visual/Audio Requirements）
- 柱子/陷阱已生成

**攻击触发机制**：
- 玩家对 dormant 敌人造成伤害（近战/远程/技能命中）→ 触发竞技关
- 触发后：
  - 出口门 `doorOpen=false`（碰撞网格关闭）
  - 所有 dormant 敌人立即激活（恢复正常速度和 AI）
  - `currentWave=1`，波次系统开始
- **安全通过**：玩家不攻击任何敌人，走到出口门 → `startFloor(N+1)`，无奖励

**触发后流程**：

```
PLAYING (Floor N) → 全敌清除 → 玩家到达出口
  → FLOOR_TRANSITION → 10% 竞技关?
    → Yes: startArena()
      → 生成同心双层（中央场 512×320 + 环形通道 64px 宽）+ 柱子 + 陷阱 + 出口门(open) + wave1 enemies(dormant)
      → ARENA_PLAYING (dormant)
        → 玩家不攻击 → 走到出口门 → startFloor(N+1) (无奖励)
        → 玩家攻击 dormant 敌人 → 出口门关闭 → enemies 激活
          → 3 波敌人：
            波1: (已生成的 floor×2+2 个 basic/fast，从 dormant 激活)
            波2: floor+1 个 tank/ghost（波1清除后 2s 生成）
            波3: floor+2 个 elite（波2清除后 2s 生成）
          → 每波清除后 2s 延迟 + 25% maxHP 恢复 → 下一波
          → 全部三波清除 → 奖励生成 + 出口门打开 → startFloor(N+1)
    → No: startFloor(N+1) (普通下一层)
```

**竞技关敌人缩放**：`enemy_hp = Math.round(base × (1 + (floor-1) × 0.15) × 1.2)`（比普通 Floor 难 20%）
**竞技关 ATK 缩放**：`enemy_atk = Math.round(base × (1 + (floor-1) × 0.1) × 1.1)`

**竞技关生成规则**（同心双层结构，独立区域）：

| 属性 | 值 |
|------|-----|
| 中央竞技场 | 512×320 px (16×10 tiles)，居中 (x=256/col8, y=224/row7) |
| 环形通道 | 64px 宽 (2 tiles)，外边界 col 6..25, row 5..18 |
| 通道口 | 4 个（北/南/西/东），每侧各 1 个，宽 96px (3 tiles) |
| 柱子 | 4 根，中央场内四角，HP=120 |
| 陷阱 | 2+floor 个，环形通道四角转角处，trapType ∈ {spike, fire} |
| 入口走廊 | col 0..5, row 11..12 (2 tiles 宽，连接西环) |
| 出口走廊 | col 26..31, row 11..12 (2 tiles 宽，连接东环) |
| 地板色 | 冷灰蓝 #1E2830 |

**战术空间**：
- **中央场**：开阔战斗区，4 柱子提供掩体，适合正面交锋
- **环形通道**：窄道风筝区，陷阱在转角增加风险
- **通道口**：咽喉点，控制进出节奏
- 波次中可灵活切换阵地战/风筝战术

**通道口位置**（tile 精确坐标）：
- 北: col 14..16, row 6 (打通上墙)
- 南: col 14..16, row 17 (打通下墙)
- 西: col 7, row 10..12 (打通左墙)
- 东: col 24, row 10..12 (打通右墙)

#### 6. 子弹-环境碰撞

当前子弹只检测玩家/敌人命中。新增环境碰撞：

```
每帧每颗子弹：
  1. 检测玩家/敌人命中（现有逻辑不变）
  2. 检测环境物体：
     for each envObject (type=pillar|door, alive, !doorOpen):
       if dist(bullet, object) < bullet.radius + max(w,h)/2:
         if pillar: pillar.hp -= bullet.damage
           if hp<=0: 柱子摧毁，碰撞恢复 true，20% 掉落
         if door: 子弹销毁（门不可破坏）
         子弹销毁
  3. 检测墙壁碰撞（现有 isWalkable 检测）
     if !walkable: 子弹销毁
```

物体数量少（竞技关最多 8 柱 + 4 门），线性遍历足够。

### States and Transitions

见上方「1. GameRoom 状态机」的完整转换表。

### Interactions with Other Systems

| 系统 | 交互方向 | 数据接口 |
|------|---------|---------|
| dungeon-generation | 上游（本系统依赖） | DungeonData 新增 envObjects；DungeonGenerator 改用 BSP-Enhanced；新增 BossArenaGenerator/MazeGenerator/ColosseumGenerator |
| progression | 上游（本系统依赖） | checkFloorCompletion() 在全敌清除后打开出口，FLOOR_TRANSITION 随机决定 maze/arena/next floor |
| combat | 上游（本系统依赖） | 子弹检测新增环境碰撞；伤害公式可受陷阱区域加成 |
| enemy-ai | 上游（本系统依赖） | 敌人 AI 不感知陷阱（故意设计） |
| items | 上游（本系统依赖） | 竞技关奖励使用现有道具类型；迷宫死胡同奖励使用现有道具 + 陷阱 |
| status-effects | 上游 | fire 陷阱施加 burn(3s, 5dmg/s)，slow 陷阱施加 slow(0.3x, 2s)（与 StatusManager 定义及 status-effects.md 映射表一致） |
| rendering | 下游 | 渲染器需接收关卡类型+环境物体数据+迷宫迷雾状态，按类型区分渲染 |
| shared/types | 上游 | GameState 新增 phase + isArenaFloor + isMazeFloor + envObjects + MazeFogState |

## Formulas

### 竞技关敌人缩放

```
arena_enemy_hp = Math.round(ENEMY_BASE_HP × (1 + (floor-1) × 0.15) × 1.2)
arena_enemy_atk = Math.round(ENEMY_BASE_ATK × (1 + (floor-1) × 0.1) × 1.1)
```

| 变量 | 类型 | 范围 | 说明 |
|------|------|------|------|
| ENEMY_BASE_HP | int | 20-80 | 敌人基础 HP（按类型） |
| floor | int | 1-4 | 竞技关所在楼层（Floor 1 无竞技关） |
| 1.2 | float | 1.0-1.5 | 竞技关 HP 难度加成 |
| 1.1 | float | 1.0-1.3 | 竞技关 ATK 难度加成 |
| Math.round | - | - | 舍入规则：四舍五入取整 |

**输出范围验证**：

| 敌人 | Base HP | Floor 2 | Floor 4 | Floor 4 elite (HP×2) |
|------|---------|---------|---------|---------------------|
| fast | 20 | round(20×1.15×1.2)=28 | round(20×1.45×1.2)=35 | 70 |
| basic | 30 | round(30×1.15×1.2)=41 | round(30×1.45×1.2)=52 | 104 |
| ghost | 40 | round(40×1.15×1.2)=55 | round(40×1.45×1.2)=70 | 140 |
| tank | 80 | round(80×1.15×1.2)=110 | round(80×1.45×1.2)=139 | 278 |

**Elite 双重缩放说明**：elite 倍率 (HP×2, ATK×1.5) 作用于**已缩放后**的值。Floor 4 elite tank 总倍率 = 1.45 × 1.2 × 2 = 3.48x base HP。这是有意设计——elite 是最终波次的压轴威胁。

**⚠️ 缩放来源说明**：上述公式中的 `ENEMY_BASE_HP` 和 `ENEMY_BASE_ATK` 是**原始常量**（如 basic HP=30, fast HP=20），不经过 `createEnemy()` 的 floor 缩放。竞技关使用独立的敌人生成路径，直接从基础常量计算，避免与 `createEnemy()` 的 `(1 + (floor-1) × 0.15)` 缩放重复叠加。

### 竞技关 ATK 缩放验证表

`arena_enemy_atk = Math.round(ENEMY_BASE_ATK × (1 + (floor-1) × 0.1) × 1.1)`

| 敌人 | Base ATK | Floor 2 (×1.21) | Floor 3 (×1.32) | Floor 4 (×1.43) | Elite (×1.5) |
|------|----------|-----------------|-----------------|-----------------|--------------|
| fast | 10 | 12 | 13 | 14 | 21 |
| basic | 8 | 10 | 11 | 11 | 17 |
| ghost | 12 | 15 | 16 | 17 | 26 |
| tank | 15 | 18 | 20 | 21 | 32 |

**⚠️ Base ATK 来源**：与 `shared/constants.ts` ENEMY_BASE_ATTACK 一致（fast=10, basic=8, ghost=12, tank=15）。注意 enemy-ai.md 的 ATK 值（basic=5, fast=8, tank=10）与服务端代码不一致，以代码为准。

### 竞技关波次敌人数

```
wave1_count = floor × 2 + 2  (ceil(60%) basic + floor(40%) fast)
wave2_count = floor + 1       (ceil(50%) tank + floor(50%) ghost)
wave3_count = floor + 2       (elite: Floor 奇数→ghost, 偶数→tank)
wave_inter_delay = 2000 ms
wave_hp_recovery = 0.25 × player.hpMax  (每波清除后恢复 25%)
total_arena_enemies = floor × 4 + 5
```

| 变量 | 类型 | 范围 | 说明 |
|------|------|------|------|
| floor | int | 2-4 | 竞技关所在楼层 |
| wave1_count | int | 6-10 | 第一波基础敌人 |
| wave2_count | int | 3-5 | 第二波中阶敌人（tank/ghost） |
| wave3_count | int | 4-6 | 第三波精英敌人（HP×2+ATK×1.5） |

**示例**：Floor 3 竞技关 = 8 (5 basic + 3 fast) + 4 (2 tank + 2 ghost) + 5 elite ghost (HP=140) = 17 个敌人

### 陷阱伤害

```
trap_damage = TRAP_BASE_DAMAGE[trapType]  // 每次激活触发一次，非持续 tick
trap_damage_to_entity = trap_damage  (无减伤)
```

**触发规则**：每次激活周期内，实体首次进入检测半径时触发一次伤害（非持续 tick）。实体停留在陷阱范围内不会重复受伤，必须离开后重新进入（下一激活周期）才会再次触发。

| 陷阱类型 | 伤害/触发 | 激活/停用周期 | 效果 | 施加状态 |
|---------|---------|-------------|------|---------|
| spike | 15 | 2s on / 3s off | 即时伤害 | 无 |
| fire | 10 | 1.5s on / 2.5s off | 伤害 + burn | burn(3s, 5 dmg/s, tickInterval=500ms) — 与 status-effects.md 一致 |
| slow | 0 | 3s on / 2s off | 减速 | slow_trap(2s, speedMultiplier=0.3) — 独立状态类型（区别于标准 slow 的 0.5），需在 status-effects.md 新增定义 |

**检测半径**：28 px（中心到实体中心）
**全周期均值 DPS**：spike = 15/5 = 3.0, fire = (10+30)/4 = 10.0（含 burn 6 ticks × 5 = 30 总伤害。注：此为单周期值，若 burn 叠加（持续停留跨周期），持续 DPS 约 13.75）
**警告时间**：激活前 500ms 视觉提示（500ms 包含在 off 期间内，不额外增加周期长度）
**脆性职业注意**：法师 (HP=60) 单次 fire trap 触发约 40 伤害（67% HP）。iron_rune 竞技关奖励可减半陷阱伤害。陷阱检测半径 28px + 500ms 警告提供反应窗口

### 柱子耐久度

```
pillar_hp = 120
pillar_size = 32 × 32 px
bullet_damage_to_pillar = bullet.damage  (全额子弹伤害)
```

| 变量 | 类型 | 范围 | 说明 |
|------|------|------|------|
| pillar_hp | int | 120 | 固定值 |
| bullet.damage | int | 8-45 | 按武器类型 |

**摧毁所需**：pistol 10 发，sword 4 发，shotgun（8×5=40，需全部弹丸命中）3 发
**摧毁掉落**：20% 概率掉落 1 coin

### 竞技关奖励

```
reward_items = randomInt(2, 3) + floor - 1  (随 Floor 递增)
reward_gold = randomInt(3, 5) + floor        (随 Floor 递增)
guaranteed_item = arena_exclusive_pool        (竞技关专属道具)
```

| 变量 | 类型 | 范围 | 说明 |
|------|------|------|------|
| reward_items | int | 3-6 | 地面道具数量（Floor 2=3-4, Floor 4=5-6） |
| reward_gold | int | 5-9 | 金币数量（Floor 2=5-7, Floor 4=7-9） |
| 道具池 | - | 见下表 | 混合普通+专属道具 |

**竞技关专属道具**（普通地牢无法获取）：

| 道具 | type ID | 效果 | 说明 |
|------|---------|------|------|
| 生命结晶 | `vitality_crystal` | maxHP +15（永久，持续到死亡） | 通过 `player.hpMax += 15; player.hp += 15` 直接修改属性，并 apply `vitality_crystal_effect` 标记状态（用于唯一性检查） |
| 力量精华 | `power_essence` | 造成伤害 +15%（永久，持续到死亡） | 通过 statusManager.apply('power_essence_effect', playerId, 1.15, 999000)（typeId='power_essence_effect'，flags.outgoingDamageMultiplier=1.15，死亡时 clearAll） |
| 铁壁符文 | `iron_rune` | 陷阱伤害 -50%（永久，持续到死亡） | 通过 statusManager.apply('iron_rune_effect', playerId, 0.5, 999000)（需在 EffectFlags 新增 trapResistance flag，typeId='iron_rune_effect'，死亡时 clearAll） |

**持久性说明**：以上奖励效果持续到玩家死亡（跨 Floor 有效）。死亡时由 `statusManager.clearAll()` 清除 power_essence/iron_rune 的状态效果；vitality_crystal 的 maxHP 修改在复活时重置为基础值。

**唯一性约束**：每种专属道具每局游戏只能获取一次。vitality_crystal 不会叠加（第二次拾取无效果，道具仍从地面移除），power_essence 刷新持续时间但不叠加倍率（outgoingDamageMultiplier 保持 1.15），iron_rune 同理。实现方式：拾取前检查 `player.statusManager.has('vitality_crystal_effect')` / `has('power_essence_effect')` / `has('iron_rune_effect')` 标记状态。

**奖励生成规则**：
- guaranteed 1 个专属道具（从专属池随机选择）
- 剩余 reward_items-1 个从普通池（potion/shield/energy）随机选择
- 所有奖励生成在房间中心 3×3 tile 区域（距中心 < 48px）
- guaranteed randomInt(3,5)+floor 个 type=coin

### BSP-Enhanced 参数

```
房间形状概率: 矩形 60% / 十字形 15% / L形 15% / 椭圆 10%
房间合并阈值: 面积之和 < 200px 的相邻叶节点合并
A* 走廊: tile 网格寻路，代价函数鼓励走廊复用
智能环路: 3-5 条，优先"最远两房间路径缩短 30%+"的边
```

| 变量 | 类型 | 范围 | 说明 |
|------|------|------|------|
| 非矩形概率 | float | 0.0-0.6 | normal 房间使用非矩形形状的总概率 |
| 环路数 | int | 3-5 | 智能环路注入数量 |
| 合并面积阈值 | int | 100-400 | 相邻叶节点面积之和低于此值时合并 |

### Boss 关参数（固定）

```
boss_hall_width = 832 px (26 tiles)
boss_hall_height = 576 px (18 tiles)
boss_hall_offset = (96, 96) px
boss_corridor = 64×192 px (2×6 tiles)
boss_pillars = 4 (距墙 32px, HP=120)
boss_banners = 4 (spriteKey='wall_banner_red')
boss_floor_color = '#351A1A'
boss_carpet_color = '#2A0A0A'
```

### 迷宫关参数

```
MAZE_CELLS_X = 16
MAZE_CELLS_Y = 12
MAZE_EXTRA_LOOPS = 8..12
MAZE_VISION_RADIUS = 128 px (4 tiles)
MAZE_COMBAT_POCKETS = 3..4 个 (每个 4×4 tiles)
MAZE_PATROL_ENEMIES = 3..5 个 (basic/fast)
```

| 变量 | 类型 | 范围 | 说明 |
|------|------|------|------|
| MAZE_CELLS_X/Y | int | 16/12 | 迷宫单元格数（每个 2×2 tiles） |
| MAZE_EXTRA_LOOPS | int | 8-12 | 额外打通的墙壁数 |
| MAZE_VISION_RADIUS | int | 96-160 | 迷雾视野半径 (px) |
| MAZE_COMBAT_POCKETS | int | 3-4 | 战斗口袋数量 |
| dead_end_reward | float | 0.6/0.2/0.2 | 死胡同末端：道具/陷阱/空 |

**迷宫触发概率**：
```
if roll ∈ [0.1, 0.3) and !mazeTriggered and floor ∈ {1,2,3}:
  → startMaze()
```
总触发概率 20%，与竞技关 10% 互斥。

### 房间类型分配（简化版，迷宫关升级为独立关卡后）

```
rooms[0] = entrance
rooms[last] = exit (Floor 1-4)
treasure: 1 个随机中间房间
确保 normal 房间 >= 50%
陷阱 envObject: normal 房间 10% 概率（Floor 2+）
```

## Edge Cases

### 通用
- **If 玩家在陷阱激活瞬间站在陷阱上**：立即受到一次伤害（每周期只触发一次）。500ms 警告是唯一的避让窗口。
- **If 敌人被陷阱击杀**：正常掉落（30% 掉率），击杀计数计入最近攻击该敌人的玩家。
- **If 柱子被摧毁时玩家/敌人站在柱子位置**：碰撞立即恢复为可行走，实体不会被"卡住"（碰撞检测每帧重新计算）。
- **If 子弹同时命中敌人和柱子**：优先检测敌人命中（现有逻辑先执行），敌人命中后子弹销毁，不再检测柱子。
- **If 两个陷阱区域重叠**：分别独立触发。实体同时受两个陷阱效果（double damage 是允许的）。
- **If 所有柱子都被摧毁**：碰撞网格全部恢复为可行走。这是允许的战术选择。
- **If 陷阱激活时区域内无实体**：无效果。陷阱不"积累"伤害。
- **If Boss 房间中的装饰物体（banner/torch）被子弹命中**：装饰无碰撞框，子弹穿过不受影响。
- **If 慢速陷阱 + 伤害陷阱重叠触发**：允许。slow(0.3x) 降低移动速度使玩家更难逃离 spike 伤害区域。有意设计。

### 迷宫关
- **If 迷宫生成后无死胡同**：环路打通过多时可能发生。回退：减少环路数重新生成。
- **If Combat Pocket 与主路径重叠**：BFS 最短路径拓宽后再扫描死胡同，确保不重叠。
- **If tank 敌人在 1 tile 宽走廊卡住**：迷宫通道最低保证 2 tiles 宽（主路径），tank 半径 20px 可通过 64px 通道。支路 1 tile 处不生成 tank 类型。
- **If 迷宫关和竞技关同时满足触发条件**：互斥——先检查竞技关 10%，再检查迷宫关 20%，同一过渡点只触发一种。
- **If 玩家在迷宫关断线**：角色保持在迷宫关内（alive=true, dx=0, dy=0），仍可被攻击。重连后恢复控制，exploredTiles 保留客户端状态。
- **If 所有玩家在迷宫关中死亡**：进入 GAME_OVER 状态。与普通 Floor 死亡相同。
- **If 迷宫关出口不可达**：递归回溯生成完美迷宫保证连通性，环路打通增加替代路径。入口和出口分别在西/东侧中部，BFS 验证最短路径存在。
- **If Combat Pocket 中敌人追出走廊**：迷宫小怪使用 basic/fast（无穿墙），路径已保证连通。敌人在走廊中追击是正常的——迷宫中无处藏身是设计意图。
- **If 迷雾在非迷宫关渲染**：`mazeFog.enabled` 标志控制，非迷宫关跳过 drawFogOfWar()。

### 竞技关
- **If 所有玩家在竞技关中死亡**：进入 GAME_OVER 状态（与普通 Floor 死亡相同）。不提供"重试竞技关"。
- **If 竞技关中部分玩家死亡**：存活玩家继续战斗。死亡玩家不参与波间恢复。竞技关清除后死亡玩家在 `startFloor(N+1)` 时自动复活（与 progression.md 一致）。
- **If 竞技关同心双层结构通道口被柱子堵住**：柱子仅在中央场内四角，通道口位置固定且无柱子。不会发生。
- **If 竞技关环形通道陷阱在转角重叠**：陷阱间最小距离 128px 保证不重叠。
- **If 玩家不攻击敌人直接穿过竞技关**：正常进入 Floor N+1，无惩罚，无奖励。
- **If 玩家在竞技关战斗中断线**：角色保持在竞技关内（alive=true，dx=0, dy=0），仍可被攻击。重连后恢复控制。
- **If 竞技关波次间有敌人在 dying 状态**：dying 敌人（500ms 死亡计时器）不计为"已清除"。波次切换在所有敌人 `alive === false` 后触发。
- **If 竞技关敌人意外通过 `createEnemy()` 生成**：基础缩放与竞技关缩放会重复叠加。竞技关**必须**使用独立工厂函数，禁止调用 `createEnemy()`。
- **If 竞技关 wave 3 为 ghost elite**：ghost 类型可穿墙，竞技关柱子对 ghost 无遮挡效果。这是有意设计——wave 3 的 ghost elite 迫使玩家改变战术。
- **If 竞技关 slow 陷阱不存在**：竞技关仅生成 spike/fire 陷阱，不含 slow。有意设计——竞技关强调即时伤害威胁。
- **If Floor 5 完成后触发竞技关/迷宫关**：Floor 5 完成后直接进入 VICTORY，无竞技关或迷宫关（Floor 5 是最终高潮）。

## Dependencies

| 系统 | 方向 | 接口 | 类型 |
|------|------|------|------|
| dungeon-generation | 上游 | DungeonGenerator 改用 BSP-Enhanced；新增 BossArenaGenerator/MazeGenerator/ColosseumGenerator | 硬依赖 |
| progression | 上游 | checkFloorCompletion() + FLOOR_TRANSITION 路由（maze 20%/arena 10%/next floor） | 硬依赖 |
| combat | 上游 | 子弹碰撞检测新增环境分支 | 硬依赖 |
| status-effects | 上游 | fire→burn(3s,5dmg/s), slow→slow(2s,0.3x) 状态施加 | 硬依赖（陷阱需要） |
| enemy-ai | 上游 | 竞技关 dormant 敌人行为：速度 ×0.3、不追击、不攻击；碰撞仍生效（需新增 dormant 状态字段 + AI 分支） | 硬依赖（dormant 模式） |
| enemy-ai | 上游 | 敌人 AI 不感知陷阱（故意设计，无改动） | 无依赖（故意不交互） |
| items | 上游 | 竞技关奖励使用现有 + 专属道具；迷宫死胡同奖励使用现有道具 | 硬依赖 |
| skills | 上游 | 竞技关能量经济、技能冷却影响竞技关平衡、Dash 穿陷阱 | 软依赖 |
| shared/types | 上游 | GameState 新增 phase + EnvObjectState/GamePhase/MazeFogState 类型 | 硬依赖 |
| shared/protocol | 上游 | 新增 arena:entered/arena:wave/arena:cleared/trap:triggered/door:state/maze:entered 事件 | 硬依赖 |
| shared/constants | 上游 | 新增 MAZE_CELLS_X/Y, MAZE_EXTRA_LOOPS, MAZE_VISION_RADIUS 常量 | 硬依赖 |
| rendering | 下游 | 渲染器需接收关卡类型 + envObjects + 迷宫迷雾状态 + 竞技关波次数据 | 本系统定义接口 |
| sprites.ts | 下游 | 新注册精灵：floor_spikes_anim_f1-f3, wall_banner_red, doors_leaf_closed/open | 本系统提供数据 |

**反向依赖验证**：
- combat.md：无冲突（子弹碰撞是新增分支，不影响现有逻辑）
- progression.md：需修改（FLOOR_TRANSITION 路由扩展：maze 20%/arena 10%/next floor 互斥）
- dungeon-generation.md：需更新（BSP-Enhanced 替代原有 BSP + 模板系统；新增 BossArena/Maze/Colosseum 三种生成器）
- items.md：需更新（新增 vitality_crystal/power_essence/iron_rune 三个竞技关专属道具）
- status-effects.md：需新增 3 个状态类型：`slow_trap`/`power_essence_effect`/`iron_rune_effect` + `vitality_crystal_effect` 标记状态

## Tuning Knobs

### BSP-Enhanced（普通关）

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| 非矩形房间概率 | 40% | 0-60% | normal 房间形状多样性 |
| 房间形状权重 | 矩形60%/十字15%/L15%/椭圆10% | - | 房间形状分布 |
| 房间合并面积阈值 | 200px | 100-400 | 小房间合并频率 |
| A* 走廊代价权重 | 0.5（已走路径折扣） | 0.1-1.0 | 走廊复用程度 |
| 智能环路数 | 3-5 | 1-8 | 环路密度 |
| 环路路径缩短阈值 | 30% | 10-50% | 环路导航价值过滤 |

### Boss 关（固定参数）

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| 大厅尺寸 | 832×576 px | 固定 | Boss 战斗空间 |
| 柱子数 | 4 | 2-8 | 掩体数量 |

### 迷宫关

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| 迷宫触发概率 | 20% | 0-40% | 迷宫关出现频率 |
| 迷宫视野半径 | 128px (4 tiles) | 64-192 | 迷雾紧张度 |
| 迷宫额外环路数 | 8-12 | 4-20 | 迷宫替代路径密度 |
| Combat Pockets 数 | 3-4 | 1-6 | 战斗遭遇密度 |
| 走廊巡逻小怪数 | 3-5 | 1-8 | 走廊威胁度 |
| 死胡同道具概率 | 60% | 30-80% | 探索奖励感 |
| 死胡同陷阱概率 | 20% | 0-40% | 死胡同风险 |
| 死胡同空概率 | 20% | 0-40% | 悬念感 |

### 竞技关

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| 竞技关触发概率 | 10% | 0-30% | 竞技关出现频率 |
| 竞技关 HP 加成 | 1.2 | 1.0-1.5 | 竞技关难度 |
| 竞技关 ATK 加成 | 1.1 | 1.0-1.3 | 竞技关伤害 |
| 竞技关波间延迟 | 2s | 1-5s | 波次切换间隔 |
| 竞技关波间恢复 | 25% hpMax | 0-50% | 波间 HP 恢复比例 |
| 竞技关中央场尺寸 | 512×320 px | 384×192 ~ 640×384 | 竞技场战斗空间 |
| 竞技关通道宽度 | 64px (2 tiles) | 32-96 | 环形通道宽度 |
| 竞技关柱子数 | 4 | 2-8 | 掩体密度 |
| 竞技关陷阱数 | 2+floor | 1-8 | 环形通道危险度 |
| 竞技关陷阱间最小距离 | 128 px | 64-256 | 防止重叠双触发秒杀 |
| 竞技关奖励道具数 | 2-3+floor-1 | 1-5 | 竞技关回报感 |
| 竞技关金币奖励 | 3-5+floor | 1-10 | 竞技关回报感 |

### 通用

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| spike 伤害 | 15 | 5-30 | 陷阱威胁度 |
| fire 伤害 | 10 | 5-20 | 陷阱威胁度 |
| 柱子 HP | 120 | 60-200 | 柱子可破坏性 |
| 柱子掉落率 | 20% | 0-50% | 摧毁柱子的奖励感 |
| 陷阱警告时间 | 500ms | 200-1000ms | 玩家反应窗口 |
| 陷阱检测半径 | 28px | 16-40 | 陷阱触发精度 |

## Visual/Audio Requirements

### 普通 Floor（BSP-Enhanced）
- 地板色调：标准 `#3A2E2C`（与当前一致）
- 非矩形房间在碰撞网格上按形状填充，渲染器按 grid 渲染无需改动

### Boss 房间（王座厅 — 固定参数生成）
- 地板色调：暗红 `#351A1A`（与普通 `#3A2E2C` 区分）
- 中心 3 tiles 宽纵向红色地毯通道 `#2A0A0A`
- 四角 `column` 柱子精灵（**有碰撞**，HP=120，提供掩体）
- 墙壁内侧 `wall_banner_red` 横幅（4 个，装饰无碰撞）
- 王座台装饰（大厅右端中央）
- 入口走廊（左侧 2×6 tiles）

### 迷宫关
- 地板色调：深棕灰 `#2A2220`（与普通/Boss/竞技关四色可区分）
- **迷雾渲染**：所有游戏元素绘制后叠加迷雾层
  - 未探索区域：全黑 (alpha=1.0)
  - 已探索区域：暗淡 (alpha=0.7 覆盖)
  - 当前视野：完全可见 + 16px 渐变边缘
  - 使用离屏 canvas 缓存，每帧只更新玩家位置附近区域
- **Debug 全亮模式**：DebugMenu 新增"迷宫全亮 ON/OFF"开关
  - ON: 跳过 drawFogOfWar()，整个迷宫完全可见
  - OFF: 正常迷雾效果
- Combat Pocket 进入提示：走廊突然变开阔时无特殊提示（设计意图：惊喜感）
- 出口在迷雾中无特殊发光效果（玩家需要探索发现）

### 竞技关（同心双层）
- 冷灰蓝地板 `#1E2830`（与普通 Floor 地板色 `#3A2E2C` 明显不同，进入即可感知"这不是普通层"）
- 中央场与环形通道无视觉分隔（同色地板），通过柱子和通道口位置暗示结构
- `skull` 装饰密度增加（25%）
- 碰撞柱子使用 `column` 精灵（有碰撞）
- 陷阱使用 `floor_spikes_anim` 4 帧循环动画
- 激活前 500ms 闪烁警告（红色渐入）
- 门：`doors_leaf_closed`（关闭）/ `doors_leaf_open`（打开）

### 陷阱房（普通 Floor 内陷阱 envObject）
- 默认地板 + 陷阱瓦片用 `floor_spikes_anim` 动画
- 激活时红色闪烁（300ms）

### 环境物体视觉
- 柱子被摧毁：碎石粒子效果（4-6 个 fillRect 碎片，500ms 消散）
- 门打开：渐变消失（300ms alpha 从 1 到 0）

### Dormant 敌人视觉（竞技关）
- Dormant 敌人头顶显示"睡眠"指示器（紫色半透明圆形，半径 8px，alpha 0.6 缓慢呼吸动画 2s 周期）
- Dormant 敌人身体着色叠加淡紫色（globalAlpha=0.15 的紫色 fillRect 覆盖）
- 激活后指示器和着色立即消失（同一 tick 内）
- 陷阱激活：红色脉冲 + 伤害数字弹出

### 音效
- 陷阱激活：金属尖刺声（短促刺耳）
- 柱子摧毁：碎石崩塌声
- 门打开：铁门开锁声
- 竞技关进入：战鼓/号角（氛围音效）
- 竞技关完成：胜利短乐
- 迷宫关进入：低沉回响（暗示封闭空间）

## UI Requirements

### 关卡类型 HUD
- 楼层显示：`{floor}/5` 改为动态
  - 普通 Floor：`Floor {floor}/5`
  - 迷宫关：`迷宫关`（无编号）
  - 竞技关：`竞技关`（无编号）

### 迷宫关 HUD
- 当前视野半径指示（可选，圆圈轮廓）
- DebugMenu 新增"迷宫全亮 ON/OFF"按钮

### 竞技关 HUD
- 竞技关内出口门：`doorOpen=true` 时渲染为出口指示精灵，`doorOpen=false` 时渲染为关闭铁门 `doors_leaf_closed`
- Dormant 敌人外观与普通敌人一致（通过行为差异暗示）
- 竞技关波次进度（仅攻击触发后显示）
- 波次指示：`Wave 1/3` → `Wave 2/3` → `Wave 3/3`
- 敌人剩余数显示
- 波间恢复提示：`+25% HP`

## Acceptance Criteria

### 全局状态机

1. **GIVEN** phase 为 FLOOR_TRANSITION | ARENA_PLAYING | MAZE_PLAYING | VICTORY | GAME_OVER | LOBBY, **WHEN** checkFloorCompletion() 被调用, **THEN** 不触发任何状态转换，phase 保持不变
2. **GIVEN** phase=PLAYING, **WHEN** 所有玩家 alive=false, **THEN** phase 变为 GAME_OVER
3. **GIVEN** phase=PLAYING 且 floor=5 且全敌清除（所有 enemies alive=false）, **WHEN** checkFloorCompletion() 执行, **THEN** phase 直接变为 VICTORY（无需玩家到达出口）
4. **GIVEN** phase=PLAYING 且 floor<5 且全敌清除, **WHEN** 玩家到达 exitPoint（距出口 < 40px）, **THEN** phase 变为 FLOOR_TRANSITION，系统决定下一层

### 关卡触发（互斥随机）

5. **GIVEN** FLOOR_TRANSITION 且 `arenaTriggered=false` 且 floor∈{1,2,3}, **WHEN** random() < 0.1, **THEN** 调用 startArena()，设 arenaTriggered=true
6. **GIVEN** FLOOR_TRANSITION 且 `mazeTriggered=false` 且 floor∈{1,2,3}, **WHEN** random() ∈ [0.1, 0.3), **THEN** 调用 startMaze()，设 mazeTriggered=true
7. **GIVEN** FLOOR_TRANSITION 且 `arenaTriggered=true`, **WHEN** 任何过渡, **THEN** 不再触发竞技关（每局最多 1 次）
8. **GIVEN** FLOOR_TRANSITION 且 `mazeTriggered=true`, **WHEN** 任何过渡, **THEN** 不再触发迷宫关（每局最多 1 次）
9. **GIVEN** FLOOR_TRANSITION 且 floor=4（过渡到 Floor 5）, **THEN** 不触发竞技关和迷宫关（Floor 5 直接 VICTORY）

### 迷宫关

10. **GIVEN** startMaze() 调用, **THEN** 使用 MazeGenerator.generate(floor, seed) 生成 32×24 tiles 迷宫碰撞网格，phase 变为 MAZE_PLAYING，mazeFog={enabled:true, visionRadius:128}
11. **GIVEN** startMaze() 生成的迷宫, **THEN** 入口在西侧中部 (col 0-1, row 11-12)，出口在东侧中部 (col 30-31, row 11-12)，BFS 验证入口到出口可达
12. **GIVEN** startMaze() 生成的迷宫, **THEN** 包含 3-4 个 Combat Pocket（每个 4×4 tiles），每个内含 1-2 个 basic/fast 敌人
13. **GIVEN** startMaze() 生成的迷宫, **THEN** 包含 3-5 个走廊巡逻小怪（basic/fast），放置在非 Combat Pocket 的走廊位置
14. **GIVEN** startMaze() 生成的迷宫, **THEN** 独立死胡同末端放置奖励（60%道具/20%陷阱/20%空），道具类型从 {health, energy, coin} 随机，陷阱类型从 {spike, fire, slow} 随机
15. **GIVEN** startMaze() 生成的迷宫, **THEN** 8-12 面额外打通的墙壁创造环路，非纯树状结构
16. **GIVEN** phase=MAZE_PLAYING 且玩家到达出口（距 exitPoint < 40px）, **THEN** phase 变为 FLOOR_TRANSITION，调用 startFloor(N+1)，死亡玩家自动复活
17. **GIVEN** phase=MAZE_PLAYING, **WHEN** 所有玩家 alive=false, **THEN** phase 变为 GAME_OVER
18. **GIVEN** phase=MAZE_PLAYING 且玩家 A 断线, **THEN** player[A].dx=0, dy=0, alive 保持不变

### 迷雾系统

19. **GIVEN** phase=MAZE_PLAYING, **WHEN** 客户端渲染, **THEN** 在所有游戏元素绘制后叠加迷雾层：未探索区域全黑、已探索区域 alpha=0.7 覆盖、当前视野 128px 完全可见 + 16px 渐变边缘
20. **GIVEN** phase=MAZE_PLAYING 且 DebugMenu "迷宫全亮"=ON, **WHEN** 客户端渲染, **THEN** 跳过 drawFogOfWar()，整个迷宫完全可见
21. **GIVEN** phase=MAZE_PLAYING, **WHEN** 玩家移动, **THEN** 客户端 exploredTiles 集合更新（玩家视野内的 tiles 加入集合）
22. **GIVEN** phase≠MAZE_PLAYING, **WHEN** 客户端渲染, **THEN** 不执行迷雾渲染（mazeFog.enabled=false）

### Boss 关（Floor 5 王座厅）

23. **GIVEN** startFloor(5) 调用, **THEN** 使用 BossArenaGenerator.generate(5, seed) 生成固定参数的王座厅：大厅 832×576px (col 3-28, row 3-20) + 入口走廊 64×192px (col 1-2, row 9-14)
24. **GIVEN** Boss 王座厅生成, **THEN** 包含 4 个 type=pillar envObject（四角距墙 32px, HP=120）、4 个 type=decoration（spriteKey='wall_banner_red'）、1 个 type=decoration（王座台，大厅右端中央）
25. **GIVEN** Boss 王座厅生成, **THEN** 所有柱子位置 tile 对齐，碰撞网格对应 tile=false

### 普通关（BSP-Enhanced）

26. **GIVEN** DungeonGenerator.generate(floor, seed) 且 floor∈{1,2,3,4}, **THEN** 使用 BSP-Enhanced 算法：非矩形房间（矩形60%/十字15%/L15%/椭圆10%）+ A* 走廊 + 3-5 条智能环路
27. **GIVEN** DungeonGenerator.generate(floor, seed) 生成的 normal 房间, **THEN** 10% 概率（Floor 2+）包含陷阱 envObject，陷阱类型随机 spike(60%)/fire(30%)/slow(10%)
28. **GIVEN** DungeonGenerator.generate(floor, seed), **THEN** 房间类型为 entrance / normal / treasure / exit，不再有 trap 房间类型

### 竞技关生成（同心双层）

29a. **GIVEN** startArena() 调用, **THEN** 使用 ColosseumGenerator.generate(floor, seed) 生成同心双层结构：中央场 512×320px (col 8-23, row 7-16) + 环形通道 64px 宽，collisionGrid 为独立实例
29b. **GIVEN** startArena() 调用, **THEN** 4 个通道口各 3 tiles 宽（北:col 14-16,row 6 / 南:col 14-16,row 17 / 西:col 7,row 10-12 / 东:col 24,row 10-12），中央场与环形通道连通
29c. **GIVEN** startArena() 调用, **THEN** 4 个 type=pillar（中央场内四角）、2+floor 个 type=trap（环形通道转角处，trapType∈{spike,fire}）、1 个 type=door（出口侧）
29d. **GIVEN** startArena() 且 floor=N, **THEN** 生成 wave1 的 N×2+2 个敌人（ceil(60%) basic + floor(40%) fast），所有敌人初始 `dormant=true`
29e. **GIVEN** startArena() 完成, **THEN** phase 变为 ARENA_PLAYING

### 竞技关攻击触发与波次（保留不变）

30. **GIVEN** phase=ARENA_PLAYING 且出口门 doorOpen=true, **WHEN** 玩家对任何 dormant 敌人造成伤害, **THEN** 出口门 doorOpen=false，所有 dormant 敌人激活，currentWave=1
31. **GIVEN** phase=ARENA_PLAYING 且出口门 doorOpen=true, **WHEN** 玩家走到出口门（距门 < 40px）且未攻击任何敌人, **THEN** phase 变为 FLOOR_TRANSITION，调用 startFloor(N+1)（无奖励）
32. **GIVEN** phase=ARENA_PLAYING 且 currentWave < 3, **WHEN** 所有 alive 敌人 alive=false, **THEN** 等待 2000ms 后生成 wave currentWave+1 敌人，alive 玩家恢复 25% maxHP
33a. **GIVEN** wave 3 全部清除, **THEN** 出口门 doorOpen=true，奖励道具生成在中央场中心 3×3 tile 区域
33b. **GIVEN** 竞技关清除且玩家到达出口门, **THEN** phase 变为 FLOOR_TRANSITION，调用 startFloor(N+1)，死亡玩家自动复活
34. **GIVEN** phase=ARENA_PLAYING, **WHEN** 所有玩家 alive=false, **THEN** phase 变为 GAME_OVER
35. **GIVEN** phase=ARENA_PLAYING 且 player[A].alive=false, **WHEN** tick() 执行, **THEN** player[A].dx=0, dy=0

### 环境物体（通用，保留）

36. **GIVEN** 门 envObject.doorOpen=false, **WHEN** 玩家移动或子弹飞行到门 tile, **THEN** 碰撞网格为 false，移动被阻挡，子弹销毁
37. **GIVEN** 门 envObject.doorOpen=true, **WHEN** 玩家或子弹经过门 tile, **THEN** 碰撞网格为 true，自由通过
38. **GIVEN** spike 陷阱 trapActive=true, **WHEN** 实体中心首次距陷阱中心 < 28px, **THEN** 实体 HP 减少 15（每周期每实体一次）
39. **GIVEN** fire 陷阱 trapActive=true, **WHEN** 实体中心首次距陷阱中心 < 28px, **THEN** 实体 HP 减少 10 + statusManager.apply('burn', sourceId, 5, 3000)
40. **GIVEN** slow 陷阱 trapActive=true, **WHEN** 实体中心首次距陷阱中心 < 28px, **THEN** statusManager.apply('slow_trap', sourceId, 0.3, 2000)
41. **GIVEN** 任何陷阱类型, **WHEN** 生成和激活/停用, **THEN** 碰撞网格不受影响
42. **GIVEN** 陷阱 trapActive=false 且 trapCycleTimer ≤ 500, **WHEN** 客户端渲染, **THEN** 陷阱瓦片叠加红色闪烁警告
43. **GIVEN** 子弹命中 type=pillar 且 alive=true, **THEN** pillar.hp -= bullet.damage；若 hp≤0 则 alive=false，grid 恢复 true，20% 掉落 coin
44. **GIVEN** 子弹命中 type=door 且 doorOpen=false, **THEN** 子弹销毁，门不受影响
45. **GIVEN** 子弹飞行路径上同时存在距离内的敌人和柱子, **THEN** 优先命中敌人
46. **GIVEN** 柱子 envObject alive=false 且 tile 对齐, **THEN** grid 对应 tile 恢复 true（同一 tick 原子性）

### 陷阱击杀归属

47. **GIVEN** 敌人 E 被陷阱击杀（HP 降为 0）, **WHEN** lastAttackerId 有值, **THEN** 击杀奖励归属于 lastAttackerId 对应的玩家
48. **GIVEN** 敌人 E 被陷阱击杀且无 lastAttackerId, **THEN** 敌人正常死亡但不掉落道具

### 陷阱重叠

49. **GIVEN** spike 陷阱 A 和 fire 陷阱 B 检测半径重叠且两者 trapActive=true, **WHEN** 实体进入重叠区域, **THEN** 分别独立触发

### 竞技关奖励

50. **GIVEN** 竞技关清除, **THEN** 生成 randomInt(2,3)+floor-1 个 ItemState（至少 1 个专属），+ randomInt(3,5)+floor 个 coin，在中央场中心 3×3 tile 区域
51. **GIVEN** 竞技关清除后 startFloor(N+1) 调用, **THEN** currentFloor = N+1（竞技关不计入楼层数）
52. **GIVEN** 玩家已持有 vitality_crystal_effect, **WHEN** 拾取 vitality_crystal, **THEN** 道具从地面移除但 player.hpMax 不增加。power_essence/iron_rune 同理

### 竞技关约束

53. **GIVEN** 竞技关使用独立工厂函数 createArenaEnemy(), **THEN** 禁止调用 createEnemy()（避免缩放叠加）
54. **GIVEN** startArena() 生成的陷阱, **THEN** 所有 trapType ∈ {spike, fire}（不含 slow）
55. **GIVEN** phase=ARENA_PLAYING 且 wave 3 最后一个敌人 alive=false 同时最后一个存活玩家 alive=false（同 tick）, **THEN** phase 变为 GAME_OVER（死亡优先）

### 柱子渐进损坏

56. **GIVEN** hp=120 的 pillar envObject, **WHEN** 被子弹命中（damage=12）, **THEN** pillar.hp=108, pillar.alive=true, 碰撞网格 tile 保持 false

### exitPoint 异常

57. **GIVEN** phase=PLAYING 且全敌清除但 exitPoint=null/undefined, **WHEN** checkFloorCompletion() 执行, **THEN** 记录错误日志，不触发状态转换（优雅降级）

## Open Questions

1. **Chest 道具是否在此系统中激活**：Chest 目前是死代码，但可以作为竞技关奖励的"开箱"体验。建议在 items 系统迭代中处理。
2. **陷阱是否应该有视觉不同的地面纹理**：当前 plan 用 floor_spikes_anim 动画，但不同陷阱类型（spike/fire/slow）是否需要不同的地板纹理？
3. **竞技关波次清除视觉/音效反馈**：波次清除 + 25% HP 恢复时，是否需要"波次完成"的音效提示和血量恢复动画？
4. **敌人踩陷阱的 AI 改进**：当前故意让敌人不感知陷阱。是否需要在 P2 迭代中让部分敌人类型（ghost）规避陷阱？
5. **竞技关出口门视觉**：doorOpen=true 和 doorOpen=false 的视觉区分？开门时渲染出口指示还是保持门精灵？
6. **迷宫关出口是否有发光效果**：当前设计中出口在迷雾中无特殊视觉，玩家需要探索发现。是否需要在视野范围内给出口一个微弱的发光提示？
7. **BSP-Enhanced 非矩形房间的碰撞烘焙**：椭圆和 L 形房间的 tile 边界可能产生不够平滑的碰撞体验（32px 精度），是否需要在渲染层做视觉补偿？
8. **RoomTemplates.ts 删除时机**：普通关改用非矩形房间直接生成后，RoomTemplates.ts 可删除。是否在本次迭代中一并清理？
