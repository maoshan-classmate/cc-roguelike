# 房间多样化 + 竞技关系统

> **Status**: Approved (四次 design-review 修订完成，8 阻塞项 + 5 推荐项已修复)
> **Author**: 猫山同学 + Claude Code
> **Last Updated**: 2026-05-05
> **Implements Pillar**: 探索惊喜感、战斗策略深度、高风险高回报选择

## Overview

本系统为地牢探索增加三个维度的内容多样性：**房间结构差异化**（通过模板系统在 BSP 矩形内雕刻非矩形形状）、**环境物体**（碰撞柱子提供掩体、陷阱区域造成伤害、装饰物体增强氛围）、**竞技关**（Floor 过渡时有概率进入的隐藏挑战层，玩家在进入前不知道下一关是普通层还是竞技关）。Boss 房间获得独立的王座厅视觉风格（红色地毯、柱子、横幅），与普通房间一眼可辨。

底层改造包括：`DungeonGenerator.generate()` 拆分为可组合步骤、碰撞系统从纯 `boolean[][]` 扩展为地形+物体双层检测、渲染管线增加房间类型感知能力、`GameRoom` 引入状态机支持楼层过渡和竞技关中间状态。竞技关作为 Floor 间的概率触发层实现——Floor 2-4 过渡时 10% 概率随机替换为竞技关（每局最多触发 1 次），竞技关内出口默认打开，敌人处于慢速巡逻状态，玩家不攻击可直接通过到下一层，主动攻击敌人则出口关闭触发 3 波挑战。

## Player Fantasy

每次推开一扇门都不确定会面对什么——可能是布满尖刺的死亡走廊，可能是一群疯狂涌出的敌人，也可能是空无一物的宝箱房。清完一个 Floor 后走向出口，推开门——门后是一个陌生的房间，敌人慢悠悠地在巡逻，出口就在对面。你不确定这是普通楼层还是竞技关。你可以小心翼翼地绕过敌人走向出口（安全但一无所获），也可以选择攻击——出口门在你发动攻击的瞬间轰然关闭，三波敌人接踵而至。但清完所有怪物后，散落在地上的稀有战利品告诉你：这场赌博值得。当然，如果你够谨慎，完全可以不惊动它们直接走向下一层。Boss 房间不需要任何文字提示，走进去就能感受到——更暗的光线、红色的地毯、两侧的旗帜——这里是真正的大 boss 所在地。柱子不只是装饰，它们是真真切切的掩体，法师躲在后面蓄力、战士绕着柱子和 Boss 周旋。

## Detailed Design

### Core Rules

#### 1. GameRoom 状态机

当前 `GameRoom` 无显式状态。竞技关和楼层过渡需要正式状态机。

**状态定义**：

| 状态 | 含义 | tick 行为 |
|------|------|----------|
| `LOBBY` | 等待玩家准备 | 无 tick |
| `FLOOR_TRANSITION` | 过渡动画/生成 | 无 tick，`startFloor()` 或 `startArena()` |
| `PLAYING` | 普通 Floor 活跃游玩 | 正常 update（移动/敌人AI/战斗/物品/过关检测） |
| `ARENA_PLAYING` | 竞技关游玩 | 见下方 arena 行为（出口开放/攻击触发/波次战斗） |
| `VICTORY` | Floor 5 通过 | 终态 |
| `GAME_OVER` | 全员死亡 | 终态 |

**转换表**：

```
LOBBY             →(start())                           → FLOOR_TRANSITION
FLOOR_TRANSITION  →(startFloor() completes)            → PLAYING
PLAYING           →(all enemies dead)                  → exit opens (stay PLAYING)
PLAYING           →(player→exit, floor<5)              → FLOOR_TRANSITION (random: arena or next floor)
PLAYING           →(all enemies dead, floor=5)         → VICTORY
PLAYING           →(all players die)                   → GAME_OVER
FLOOR_TRANSITION  →(random arena=true, startArena())   → ARENA_PLAYING (enemies dormant, exit open)
FLOOR_TRANSITION  →(random arena=false, startFloor())  → PLAYING
ARENA_PLAYING     →(player→exit, no attack triggered)  → FLOOR_TRANSITION (startFloor(N+1))
ARENA_PLAYING     →(player attacks dormant enemy)      → exit closes, wave 1 activates (stay ARENA_PLAYING)
ARENA_PLAYING     →(all 3 waves cleared)               → rewards spawn, exit opens → player→exit → FLOOR_TRANSITION (startFloor(N+1))
ARENA_PLAYING     →(all players die)                   → GAME_OVER
```

**状态守卫**：
- `checkEnemyClearance()` 在所有 enemies alive=false 时打开出口（现有行为不变）
- `checkFloorExit()` 检测玩家到达出口点（现有行为不变）
- `FLOOR_TRANSITION` 时决定是否进入竞技关：`arenaTriggered=false`（本局未触发过）且 `floor∈{1,2,3}`（即过渡到 Floor 2/3/4）时，`random() < 0.1` → startArena()
- `ARENA_PLAYING` 期间：出口门默认 `doorOpen=true`，`arenaTriggered=false` 时敌人处于 `dormant` 状态
- `checkArenaAttack()` 检测玩家对 dormant 敌人的攻击：触发后 `doorOpen=false`，所有 dormant 敌人激活，开始波次系统
- 玩家在出口门打开时到达出口 → 正常 startFloor(N+1)
- 非法转换被静默忽略，phase 不变

**竞技关触发机制**（概率触发 + 行为选择）：
- Floor 1-4 过渡时（Floor 5 直接 VICTORY），若本局 `arenaTriggered=false`，10% 概率进入竞技关
- 进入竞技关后 `arenaTriggered=true`（保证每局最多 1 次竞技关）
- 竞技关内敌人处于 **dormant** 状态：慢速巡逻（速度 ×0.3），不追击玩家，不攻击
- 出口门默认 `doorOpen=true`，玩家可直接通过到下一层（无奖励）
- 玩家**主动攻击**任何 dormant 敌人 → 出口门关闭 → 所有 dormant 敌人激活 → 3 波挑战开始
- Dormant 敌人被激活后行为与普通敌人一致（追击/攻击/碰撞）
- 玩家通过观察敌人"异常缓慢的巡逻"可察觉这是竞技关而非普通层

#### 2. DungeonGenerator 拆分

当前 `generate()` 是单一方法。拆分为可组合的 pipeline 步骤：

**Pipeline 接口**：

```typescript
// 步骤 1：布局生成
generateLayout(floor, seed): { rooms, corridors }
// 步骤 2：模板应用（在矩形内雕刻非矩形）
applyTemplates(rooms, random): { carvedTiles, envObjects }
// 步骤 3：房间类型分配
assignRoomTypes(rooms, floor): void
// 步骤 4：内容生成（敌人+道具）
spawnContent(rooms, floor, random): { enemies, items }
// 步骤 5：碰撞网格生成
generateGrid(rooms, corridors, carvedTiles): { collisionGrid, corridorTiles }
```

**竞技关使用不同 pipeline**：
- `ArenaPipeline`：单房间生成 + 对称柱子/陷阱 + 无走廊 + 锁门

#### 3. 房间模板系统（减法雕刻）

BSP 生成矩形后，模板通过移除可行走 tile 雕刻非矩形形状。

**模板定义**：

| 模板 | 描述 | 最小房间尺寸 | 适用房间 |
|------|------|------------|---------|
| `none` | 矩形，无雕刻 | 无 | entrance/boss/treasure/默认 |
| `cross` | 中心十字，移除四角 | 192×192 px | normal/treasure |
| `l_shape` | 移除一个角 | 160×160 px | trap/normal |
| `pillars_4` | 矩形 + 4 根柱子 | 160×160 px | mob_arena/normal |
| `diamond` | 方形，移除四角三角 | 192×192 px | normal |

**选择规则**：
- entrance/boss：固定 `none`（确保安全布局）
- treasure：50% `none`，50% `cross`
- normal：60% `none`，40% 随机合格模板
- 竞技关：不适用（独立生成）

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

#### 5. 竞技关系统

**位置**：Floor N 和 Floor N+1 之间的可选独立层。不计入 1-5 层数。Floor 5 完成后直接 VICTORY 无竞技关。仅在 Floor 1→2、2→3、3→4 过渡时（即源 floor∈{1,2,3}）可能触发。

**触发机制**（概率触发 + 行为选择）：
- Floor 1-4 清除后玩家到达出口 → `FLOOR_TRANSITION`
- 系统决定：若 `arenaTriggered=false` 且 `floor∈{1,2,3}`（即过渡到 Floor 2/3/4），`random() < 0.1` → 进入竞技关
- 进入竞技关后设 `arenaTriggered=true`（保证每局最多 1 次竞技关）
- Floor 5 直接 VICTORY，不触发竞技关

**竞技关初始状态**（玩家进入后）：
- 单房间（768×576 px）生成完成
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
      → 生成单间（768×576 px）+ 柱子 + 陷阱 + 出口门(open) + wave1 enemies(dormant)
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

**竞技关生成规则**（独立区域，不在 Floor 地牢内）：
- 单房间，居中 768×576 px（roomX=128, roomY=96，偏移为 32 的倍数确保所有 envObject 位置 tile 对齐）
- 5-7 根对称柱子（关于房间垂直中轴对称，数量 = 4 + (floor - 1)，即 Floor 2=5, Floor 3=6, Floor 4=7。奇数时 1 根柱子位于房间垂直中轴 `x = Math.floor((roomX + width/2) / 32) * 32`，其余对称配对在 `(roomX + width - dx - 32, roomY + dy)`，所有偏移量 dx/dy 必须为 32 的倍数以确保 tile 对齐）
- 3-5 个对称陷阱（spike/fire，关于房间垂直中轴对称，数量 = 1 + floor，即 Floor 2=3, Floor 3=4, Floor 4=5，陷阱间最小距离 128px 防止重叠双触发秒杀）
- 1 个出口门 envObject（位于房间出口侧，初始 `doorOpen=true`，玩家攻击敌人后变为 `false`）
- Wave 1 敌人以 dormant 状态生成（`dormant=true, speed×0.3, noChase, noAttack`）
- 无走廊，独立碰撞网格

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
| dungeon-generation | 上游（本系统依赖） | DungeonData 新增 envObjects + roomTemplates |
| progression | 上游（本系统依赖） | checkFloorCompletion() 在全敌清除后打开出口，玩家到达出口时 FLOOR_TRANSITION 随机决定是否竞技关 |
| combat | 上游（本系统依赖） | 子弹检测新增环境碰撞；伤害公式可受陷阱区域加成 |
| enemy-ai | 上游（本系统依赖） | 敌人 AI 不感知陷阱（故意设计） |
| items | 上游（本系统依赖） | 竞技关奖励使用现有道具类型；Chest 可作为竞技关奖励容器 |
| status-effects | 上游 | fire 陷阱施加 burn(3s, 5dmg/s)，slow 陷阱施加 slow(0.3x, 2s)（与 StatusManager 定义及 status-effects.md 映射表一致） |
| rendering | 下游 | 渲染器需接收房间类型+环境物体数据，按类型区分渲染 |
| shared/types | 上游 | GameState 新增 phase + isArenaFloor + envObjects |

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

### 房间模板选择概率

```
template = 'none'  (默认)
if room.type == 'entrance' || room.type == 'boss': template = 'none'
if room.type == 'treasure': 50% 'none', 50% 'cross'
if room.type == 'normal':
  60% 'none', 15% 'cross', 10% 'l_shape', 10% 'pillars_4', 5% 'diamond'
```

**约束**：模板只在房间尺寸 >= minWidth × minHeight 时生效，否则回退 `none`。

### 房间类型分配

```
rooms[0] = entrance
rooms[last] = boss (Floor 5) / exit (Floor 1-4)
treasure: 1 个随机中间房间
trap: randomInt(0, min(floor-1, 2)) 个（Floor 2+ 出现）
确保 normal 房间 >= 50%
```

**trap 房间规则**：
- trap 房间是普通房间 + 额外陷阱物体
- 陷阱类型随机：spike(60%) / fire(30%) / slow(10%)
- 陷阱数量：3-6 个，对称放置（避开中心 3×3 安全区）
- 敌人生成与 normal 相同（按 FLOOR_CONFIG）
- 无额外道具
- 模板倾向 `l_shape`（不规则空间增加陷阱规避难度）

## Edge Cases

- **If 所有玩家在竞技关中死亡**：进入 GAME_OVER 状态（与普通 Floor 死亡相同）。不提供"重试竞技关"。
- **If 竞技关中部分玩家死亡**：存活玩家继续战斗。死亡玩家不参与波间恢复。竞技关清除后死亡玩家在 `startFloor(N+1)` 时自动复活（与 progression.md 一致）。
- **If 玩家在陷阱激活瞬间站在陷阱上**：立即受到一次伤害（每周期只触发一次）。500ms 警告是唯一的避让窗口。
- **If 敌人被陷阱击杀**：正常掉落（30% 掉率），击杀计数计入最近攻击该敌人的玩家。
- **If 柱子被摧毁时玩家/敌人站在柱子位置**：碰撞立即恢复为可行走，实体不会被"卡住"（碰撞检测每帧重新计算）。
- **If 子弹同时命中敌人和柱子**：优先检测敌人命中（现有逻辑先执行），敌人命中后子弹销毁，不再检测柱子。
- **If 两个陷阱区域重叠**：分别独立触发。实体同时受两个陷阱效果（double damage 是允许的）。
- **If 房间模板雕刻导致房间面积过小**：模板有 minWidth/minHeight 约束，不满足时回退 `none`。不会产生极端情况。
- **If 竞技关生成时房间超出地牢边界（768×576 在 1024×768 中）**：竞技关房间居中放置（x=128, y=96），偏移为 32 的倍数保证 tile 对齐，四周留有 128px/96px 墙壁边界。
- **If 所有柱子都被摧毁**：碰撞网格全部恢复为可行走，竞技关变为纯空旷房间。这是允许的战术选择。
- **If 陷阱激活时区域内无实体**：无效果。陷阱不"积累"伤害。
- **If Boss 房间中的装饰物体（banner/torch）被子弹命中**：装饰无碰撞框，子弹穿过不受影响。
- **If Floor 5 完成后触发竞技关**：Floor 5 完成后直接进入 VICTORY，无竞技关（Floor 5 是最终高潮）。
- **If 玩家不攻击敌人直接穿过竞技关**：正常进入 Floor N+1，无惩罚，无奖励。
- **If 玩家在竞技关战斗中断线**：角色保持在竞技关内（alive=true，dx=0, dy=0），仍可被攻击。重连后恢复控制。
- **If 慢速陷阱 + 伤害陷阱重叠触发**：允许。slow(0.3x) 降低移动速度使玩家更难逃离 spike 伤害区域。有意设计。
- **If 竞技关波次间有敌人在 dying 状态**：dying 敌人（500ms 死亡计时器）不计为"已清除"。波次切换在所有敌人 `alive === false` 后触发。
- **If 竞技关敌人意外通过 `createEnemy()` 生成**：基础缩放 `(1+(floor-1)×0.15)` 与竞技关缩放 `(1+(floor-1)×0.15)×1.2` 会重复叠加，导致 Floor 4 elite tank HP≈403（预期 278）。竞技关**必须**使用独立工厂函数，禁止调用 `createEnemy()`。
- **If 竞技关 wave 3 为 ghost elite**：ghost 类型可穿墙（见 enemy-ai.md），竞技关柱子对 ghost 无遮挡效果。这是有意设计——wave 3 的 ghost elite 迫使玩家改变战术（从柱子掩体转为风筝战术）。奇数 Floor 使用 ghost elite 是有意为之的难度加成。
- **If 竞技关 slow 陷阱不存在**：竞技关仅生成 spike/fire 陷阱（见 AC 43），不含 slow。这是有意设计——竞技关强调即时伤害威胁而非减速控制，与普通地牢陷阱房体验差异化。

## Dependencies

| 系统 | 方向 | 接口 | 类型 |
|------|------|------|------|
| dungeon-generation | 上游 | DungeonData 结构扩展（envObjects, roomTemplates）+ ArenaPipeline | 硬依赖 |
| progression | 上游 | checkFloorCompletion() 在全敌清除后打开出口，FLOOR_TRANSITION 随机决定竞技关 | 硬依赖 |
| combat | 上游 | 子弹碰撞检测新增环境分支 | 硬依赖 |
| status-effects | 上游 | fire→burn(3s,5dmg/s), slow→slow(2s,0.3x) 状态施加 | 硬依赖（陷阱需要） |
| enemy-ai | 上游 | 敌人 AI 不感知陷阱（无改动，但需确认） | 无依赖（故意不交互） |
| items | 上游 | 竞技关奖励使用现有 + 新增道具类型（vitality_crystal/power_essence/iron_rune） | 硬依赖 |
| skills | 上游 | 竞技关能量经济、技能冷却影响竞技关平衡、Dash 穿陷阱 | 软依赖 |
| shared/types | 上游 | GameState 新增 phase + EnvObjectState/GamePhase 类型 | 硬依赖 |
| shared/protocol | 上游 | 新增 arena:entered/arena:wave/arena:cleared/trap:triggered/door:state 事件 | 硬依赖 |
| rendering | 下游 | 渲染器需接收 room.type + envObjects + 竞技关波次数据 | 本系统定义接口 |
| sprites.ts | 下游 | 新注册精灵：floor_spikes_anim_f1-f3, wall_banner_red, doors_leaf_closed/open | 本系统提供数据 |

**反向依赖验证**：
- combat.md：无冲突（子弹碰撞是新增分支，不影响现有逻辑）
- progression.md：需修改（checkFloorCompletion 全敌清除→出口打开，FLOOR_TRANSITION 时随机决定竞技关，不再拆分为 checkEnemyClearance/checkPathChoice）。**重要变更**：AC 3 将 Floor 5 胜利条件从"全敌清除 + 玩家到达出口"改为"全敌清除直接 VICTORY（无需到达出口）"，progression.md 必须同步更新
- dungeon-generation.md：需更新（新增模板系统、环境物体、ArenaPipeline）
- items.md：需更新（新增 vitality_crystal/power_essence/iron_rune 三个竞技关专属道具）
- status-effects.md：需新增 3 个状态类型：(1) `slow_trap`（speedMultiplier=0.3，区别于标准 slow 的 0.5）；(2) `power_essence_effect`（flags.outgoingDamageMultiplier=1.15，category=buff，stackPolicy=refresh）；(3) `iron_rune_effect`（需在 EffectFlags 新增 `trapResistance` flag，陷阱伤害减半）。另外需新增 vitality_crystal_effect 标记状态（无 flag 影响，仅用于唯一性检查）

## Tuning Knobs

| 参数 | 默认值 | 范围 | 影响 |
|------|--------|------|------|
| 竞技关 HP 加成 | 1.2 | 1.0-1.5 | 竞技关难度 |
| 竞技关 ATK 加成 | 1.1 | 1.0-1.3 | 竞技关伤害 |
| 竞技关波间延迟 | 2s | 1-5s | 波次切换间隔 |
| 竞技关波间恢复 | 25% hpMax | 0-50% | 波间 HP 恢复比例 |
| spike 伤害 | 15 | 5-30 | 陷阱威胁度 |
| fire 伤害 | 10 | 5-20 | 陷阱威胁度 |
| 柱子 HP | 120 | 60-200 | 柱子可破坏性 |
| 柱子掉落率 | 20% | 0-50% | 摧毁柱子的奖励感 |
| 陷阱警告时间 | 500ms | 200-1000ms | 玩家反应窗口 |
| 陷阱检测半径 | 28px | 16-40 | 陷阱触发精度 |
| 竞技关房间尺寸 | 768×576 | 576×384 ~ 832×640 | 竞技关战斗空间（必须为 32 的倍数，确保 tile 对齐） |
| 竞技关柱子数 | 5-7 | 0-12 | 竞技关掩体密度（奇数时中轴 1 根，位置 snap 到 tile 边界） |
| 竞技关陷阱数 | 3-5 | 0-8 | 竞技关危险度（1+floor，Floor 2=3, Floor 3=4, Floor 4=5） |
| 竞技关陷阱间最小距离 | 128 px | 64-256 | 防止重叠双触发秒杀 |
| 竞技关奖励道具数 | 2-3 | 1-5 | 竞技关回报感 |
| 竞技关金币奖励 | 3-5 | 1-10 | 竞技关回报感 |
| normal 房间模板概率 | 40% 非none | 0-60% | 房间形状多样性 |
| 竞技关目标清除时间 | 1-3 min | 0.5-5 min | TTK 基准（4 人队实测约 1 min，playtest 后调优） |
| 模板最小房间尺寸 | 160-192px | 128-256 | 模板启用阈值 |

## Visual/Audio Requirements

### Boss 房间（王座厅风格）
- 地板色调：暗红 `#351A1A`（与普通 `#3A2E2C` 区分）
- 中心 3 tiles 宽纵向红色地毯通道 `#2A0A0A`
- 四角 `column` 柱子精灵（**有碰撞**，HP=120，提供掩体）
- 墙壁内侧 `wall_banner_red` 横幅（4 个，装饰无碰撞）
- 增强暗角（半径缩小）
- **最小尺寸保证**：Boss 房间强制最小 224×224px（7×7 tiles），确保 4 柱子 + 4 横幅不拥挤。若 BSP 生成的 boss 房间小于此尺寸，强制扩展到最小值

### 竞技关房间
- 冷灰蓝地板 `#1E2830`（与普通 Floor 地板色 `#3A2E2C` 明显不同，进入即可感知"这不是普通层"）
- `skull` 装饰密度增加（25%）
- 碰撞柱子使用 `column` 精灵（有碰撞）
- 陷阱使用 `floor_spikes_anim` 4 帧循环动画
- 激活前 500ms 闪烁警告（红色渐入）
- 门：`doors_leaf_closed`（关闭）/ `doors_leaf_open`（打开）

### 陷阱房
- 默认地板 + 陷阱瓦片用 `floor_spikes_anim` 动画
- 激活时红色闪烁（300ms）

### 环境物体视觉
- 柱子被摧毁：碎石粒子效果（4-6 个 fillRect 碎片，500ms 消散）
- 门打开：渐变消失（300ms alpha 从 1 到 0）

### Dormant 敌人视觉
- Dormant 敌人头顶显示"睡眠"指示器（紫色半透明圆形，半径 8px，alpha 0.6 缓慢呼吸动画 2s 周期）
- Dormant 敌人身体着色叠加淡紫色（globalAlpha=0.15 的紫色 fillRect 覆盖）
- 激活后指示器和着色立即消失（同一 tick 内）
- 目的：让玩家一眼区分"这些敌人可以不攻击" vs 普通敌人
- 陷阱激活：红色脉冲 + 伤害数字弹出

### 音效
- 陷阱激活：金属尖刺声（短促刺耳）
- 柱子摧毁：碎石崩塌声
- 门打开：铁门开锁声
- 竞技关进入：战鼓/号角（氛围音效）
- 竞技关完成：胜利短乐

## UI Requirements

### 竞技关渲染
- 竞技关内出口门：`doorOpen=true` 时渲染为出口指示精灵，`doorOpen=false` 时渲染为关闭铁门 `doors_leaf_closed`
- Dormant 敌人外观与普通敌人一致（通过行为差异暗示）

### HUD 修改
- 楼层显示：`{floor}/5` 改为动态
  - 普通 Floor：`Floor {floor}/5`
  - 竞技关：`竞技关`（无编号）
- 竞技关波次进度（仅攻击触发后显示）

### 竞技关进度
- 波次指示：`Wave 1/3` → `Wave 2/3` → `Wave 3/3`
- 敌人剩余数显示
- 波间恢复提示：`+25% HP`

## Acceptance Criteria

### 全局状态机

1. **GIVEN** phase 为 FLOOR_TRANSITION | ARENA_PLAYING | VICTORY | GAME_OVER | LOBBY, **WHEN** checkFloorCompletion() 被调用, **THEN** 不触发任何状态转换，phase 保持不变
2. **GIVEN** phase=PLAYING, **WHEN** 所有玩家 alive=false, **THEN** phase 变为 GAME_OVER
3. **GIVEN** phase=PLAYING 且 floor=5 且全敌清除（所有 enemies alive=false）, **WHEN** checkFloorCompletion() 执行, **THEN** phase 直接变为 VICTORY（无需玩家到达出口）
4. **GIVEN** phase=PLAYING 且 floor<5 且全敌清除, **WHEN** 玩家到达 exitPoint（距出口 < 40px）, **THEN** phase 变为 FLOOR_TRANSITION，系统决定下一层

### 竞技关触发（概率）

5. **GIVEN** FLOOR_TRANSITION 且 `arenaTriggered=false` 且 floor∈{1,2,3}（过渡到 Floor 2/3/4）, **WHEN** random() < 0.1, **THEN** 调用 startArena()，设 arenaTriggered=true
6. **GIVEN** FLOOR_TRANSITION 且 `arenaTriggered=true`, **WHEN** 任何过渡, **THEN** 不再触发竞技关（每局最多 1 次）
7. **GIVEN** FLOOR_TRANSITION 且 floor=4（过渡到 Floor 5）, **THEN** 不触发竞技关（Floor 5 直接 VICTORY）

### 竞技关生成与生命周期

8a. **GIVEN** startArena() 调用, **THEN** 生成独立单间 768×576px 居中(x=128, y=96)，128%32=0 且 96%32=0，所有 envObject 位置可 tile 对齐，collisionGrid 为独立实例
8b. **GIVEN** startArena() 且 floor=N, **THEN** 生成 4+(N-1) 个 type=pillar（N=2:5, N=3:6, N=4:7），所有柱子 tile 对齐且关于垂直中轴对称
8c. **GIVEN** startArena() 且 floor=N, **THEN** 生成 1+N 个 type=trap（N=2:3, N=3:4, N=4:5），trapType ∈ {spike, fire}，对称放置，最小间距 128px
8d. **GIVEN** startArena() 调用, **THEN** 生成 1 个 type=door envObject（出口侧，doorOpen=true），碰撞网格对应 tile=true（可通过）
8e. **GIVEN** startArena() 且 floor=N, **THEN** 生成 wave1 的 N×2+2 个敌人（ceil(60%) basic + floor(40%) fast），所有敌人初始 `dormant=true`（速度×0.3，不追击，不攻击）
8f. **GIVEN** startArena() 完成, **THEN** phase 变为 ARENA_PLAYING

### 竞技关攻击触发

9. **GIVEN** phase=ARENA_PLAYING 且出口门 doorOpen=true, **WHEN** 玩家对任何 dormant 敌人造成伤害（近战/远程/技能命中）, **THEN** 出口门 doorOpen=false（碰撞网格 tile=false），所有 dormant 敌人设 dormant=false（恢复正常 AI 和速度），currentWave=1
10. **GIVEN** phase=ARENA_PLAYING 且出口门 doorOpen=true, **WHEN** 玩家走到出口门（距门 < 40px）且未攻击任何敌人, **THEN** phase 变为 FLOOR_TRANSITION，调用 startFloor(N+1)（无奖励）

### 竞技关波次

11. **GIVEN** phase=ARENA_PLAYING 且 currentWave < 3 且 arenaTriggered=true, **WHEN** 所有 alive 敌人 alive=false, **THEN** 等待 2000ms 后生成 wave currentWave+1 敌人，alive 玩家恢复 25% maxHP
12a. **GIVEN** wave 3 全部清除, **THEN** 出口门 doorOpen=true，奖励道具生成在房间中心 3×3 tile 区域
12b. **GIVEN** 竞技关清除且玩家到达出口门, **THEN** phase 变为 FLOOR_TRANSITION，调用 startFloor(N+1)，死亡玩家自动复活
13. **GIVEN** phase=ARENA_PLAYING, **WHEN** 所有玩家 alive=false, **THEN** phase 变为 GAME_OVER
14. **GIVEN** phase=ARENA_PLAYING 且 player[A].alive=false, **WHEN** tick() 执行, **THEN** player[A].dx=0, dy=0

15. **GIVEN** 门 envObject.doorOpen=false, **WHEN** 玩家移动或子弹飞行到门 tile, **THEN** 碰撞网格为 false，移动被阻挡，子弹销毁
16. **GIVEN** 门 envObject.doorOpen=true, **WHEN** 玩家或子弹经过门 tile, **THEN** 碰撞网格为 true，自由通过
17. **GIVEN** spike 陷阱 trapActive=true, **WHEN** 实体（玩家或敌人）中心首次距陷阱中心 < 28px（该激活周期内该实体首次进入）, **THEN** 实体 HP 减少 15。同一激活周期内该实体再次进入不触发。下一激活周期重新进入时再次触发
18. **GIVEN** fire 陷阱 trapActive=true, **WHEN** 实体中心首次距陷阱中心 < 28px（同上首次规则）, **THEN** 实体 HP 减少 10 + statusManager.apply('burn', sourceId, 5, 3000)（tickInterval=500ms，与 status-effects.md 一致）
19. **GIVEN** slow 陷阱 trapActive=true, **WHEN** 实体中心首次距陷阱中心 < 28px（同上首次规则）, **THEN** statusManager.apply('slow_trap', sourceId, 0.3, 2000)，HP 不变
20. **GIVEN** 任何陷阱类型, **WHEN** 生成和激活/停用, **THEN** 碰撞网格不受影响
21. **GIVEN** 陷阱 trapActive=false 且 trapCycleTimer ≤ 500（距下次激活 ≤ 500ms）, **WHEN** 客户端渲染, **THEN** envObject 序列化数据包含 warning=true；陷阱瓦片叠加红色矩形填充，alpha = 0.3 + 0.7 × abs(sin(t × 2π / 500))，其中 t = trapCycleTimer（从 500 倒数到 0）
22. **GIVEN** 子弹命中 type=pillar 且 alive=true 的 envObject, **THEN** pillar.hp -= bullet.damage；若 hp≤0 则 alive=false，grid 对应 tile 恢复 true（柱子位置 tile 对齐，仅恢复 1 个 tile），使用 seededRandom(pillar.id) 生成 [0,1) 值，若 < 0.2 则在 pillar 位置生成 1 个 type=coin 的 ItemState
23. **GIVEN** 子弹命中 type=door 且 doorOpen=false 的 envObject, **THEN** 子弹销毁，门不受影响
24. **GIVEN** 子弹飞行路径上同时存在距离内的敌人和柱子, **WHEN** 碰撞检测执行, **THEN** 优先命中敌人，子弹销毁后不再检测柱子
25. **GIVEN** spike 陷阱 trapActive=true, **WHEN** 敌人中心首次距陷阱中心 < 28px（该激活周期内该实体首次进入）, **THEN** 敌人 HP 减少 15（敌人 AI 不感知陷阱）
26. **GIVEN** fire 陷阱 trapActive=true, **WHEN** 敌人中心首次距陷阱中心 < 28px, **THEN** 敌人 HP 减少 10 + statusManager.apply('burn', enemyId, 5, 3000)
27. **GIVEN** slow 陷阱 trapActive=true, **WHEN** 敌人中心首次距陷阱中心 < 28px（该激活周期内该实体首次进入）, **THEN** statusManager.apply('slow_trap', enemyId, 0.3, 2000)，HP 不变
28. **GIVEN** 柱子 envObject alive=false 且位置 tile 对齐（x%32===0, y%32===0）, **THEN** grid[floor(y/32)][floor(x/32)] = true，isWalkable(x,y) 从 false 变为 true（grid 更新必须在同一 tick 内与柱子摧毁原子性完成）

### 房间生成与模板

29. **GIVEN** DungeonGenerator.generate(floor, seed), **THEN** 返回的 DungeonData 包含：(1) `envObjects: EnvObjectState[]`，每个元素含 id/type/x/y/width/height/alive，type ∈ {pillar,trap,door,decoration}；(2) `roomTemplates: string[]`，长度=rooms.length，每个值 ∈ {none,cross,l_shape,pillars_4,diamond}；(3) entrance 和 boss 房间的 template='none'；(4) 相同 floor+seed 生成相同的 roomTemplates（确定性）
30. **GIVEN** DungeonGenerator.generate(floor, seed) 生成结果中存在至少一个 width ≥ 192 且 height ≥ 192 的 type='normal' 房间, **WHEN** applyTemplates() 完成, **THEN** 该房间模板应用后的可行走 tile 数量严格小于模板应用前的矩形可行走 tile 数量
31. **GIVEN** 所有房间尺寸 < 160×160px, **WHEN** applyTemplates() 完成, **THEN** 所有房间 template='none'
32. **GIVEN** rooms[0] 和 rooms[last], **THEN** rooms[0].type='entrance'，rooms[last].type='boss'(Floor 5) 或 'exit'(Floor 1-4)

### 竞技关生成与波次（补充）

33. **GIVEN** startArena() 且 floor=N, **THEN** 房间尺寸和 envObject 数量如 AC 8a-8e 所述。竞技关使用独立工厂函数 createArenaEnemy()（禁止调用 createEnemy()），验证竞技关敌人 base HP 与 ENEMY_BASE_HP 常量匹配（无 floor 缩放叠加）
34. **GIVEN** 竞技关 Floor N, **THEN** wave1 = N×2+2 个（ceil(60%) basic + floor(40%) fast），wave2 = N+1 个（ceil(50%) tank + floor(50%) ghost），wave3 = N+2 个 elite（奇数→ghost，偶数→tank，HP=base×2, ATK=base×1.5）。示例：floor=2→wave1=6(4b+2f)+wave2=3(2t+1g)+wave3=4 elite tank；floor=3→wave1=8(5b+3f)+wave2=4(2t+2g)+wave3=5 elite ghost；floor=4→wave1=10(6b+4f)+wave2=5(3t+2g)+wave3=6 elite tank
35. **GIVEN** 竞技关敌人, **THEN** HP = Math.round(base × (1+(floor-1)×0.15) × 1.2)，ATK = Math.round(base × (1+(floor-1)×0.1) × 1.1)

### 竞技关奖励

36. **GIVEN** 竞技关清除, **THEN** 生成 randomInt(2,3)+floor-1 个 ItemState，其中至少 1 个 type ∈ {vitality_crystal, power_essence, iron_rune}（专属），其余从 {potion, shield, energy} 随机。所有道具生成在竞技关房间中心 3×3 tile 区域内（距中心 < 48px）。额外 randomInt(3,5)+floor 个 type=coin 生成在同一区域
37. **GIVEN** 竞技关清除后 startFloor(N+1) 调用, **THEN** currentFloor = N+1（竞技关不计入楼层数），死亡玩家自动复活

### Boss 房间视觉

38. **GIVEN** room.type='boss' 且房间像素坐标 (roomX, roomY, roomW, roomH), **WHEN** 渲染管线绘制地板 tile at 像素位置 (px, py), **THEN**: 若 abs(floor(px/32) - floor((roomX+roomW/2)/32)) <= 1（中心 3 tile 列）且 roomY <= py < roomY+roomH → fillStyle = '#2A0A0A'；否则 → fillStyle = '#351A1A'
39a. **GIVEN** room.type='boss' 且房间 (x, y, w, h) 且 w ≥ 224 且 h ≥ 224, **THEN** 生成 4 个 type=decoration envObject（spriteKey='wall_banner_red'，位于墙壁内侧中心及两侧）和 4 个 type=pillar envObject（spriteKey='column', hp=120, hpMax=120，位于四角距墙 32px 处）
39b. **GIVEN** Boss 房间的 4 个 pillar envObject, **THEN** 所有柱子位置 tile 对齐（Math.floor(x/32)×32, Math.floor(y/32)×32），碰撞网格对应 tile = false，banner envObject 无碰撞网格条目

### 陷阱击杀归属

40. **GIVEN** 敌人 E 被陷阱击杀（HP 降为 0）, **WHEN** 敌人 E 的 lastAttackerId 有值, **THEN** 击杀奖励（掉落）归属于 lastAttackerId 对应的玩家，30% 掉率按普通规则计算

### 陷阱重叠

41. **GIVEN** spike 陷阱 A 和 fire 陷阱 B 检测半径重叠且两者 trapActive=true, **WHEN** 实体进入重叠区域, **THEN** 实体同时受到 spike 15 伤害和 fire 10+burn 伤害（分别独立触发，分别独立计算周期）

### 竞技关出口门渲染

42. **GIVEN** 竞技关出口门 envObject 且 doorOpen=true, **WHEN** 客户端渲染, **THEN** 在 (envObject.x, envObject.y) 渲染 spriteKey='exit_staircase'（出口方向指示），碰撞网格为 true
43. **GIVEN** 竞技关出口门 envObject 且 doorOpen=false, **WHEN** 客户端渲染, **THEN** 在 (envObject.x, envObject.y) 渲染 spriteKey='doors_leaf_closed'（铁门关闭状态），碰撞网格为 false

### 竞技关陷阱类型限制

44. **GIVEN** startArena() 生成的陷阱 envObjects, **THEN** 所有陷阱 trapType ∈ {spike, fire}（竞技关不包含 slow 陷阱）

### 竞技关断线与重连

45. **GIVEN** phase=ARENA_PLAYING 且玩家 A 连接中, **WHEN** 玩家 A 断开连接, **THEN** player[A].dx=0, dy=0, alive 保持不变（仍可被攻击）。**WHEN** 玩家 A 重连, **THEN** player[A] 恢复输入响应

### 波间死亡竞态

46. **GIVEN** phase=ARENA_PLAYING 且 wave 3 最后一个敌人 alive 变为 false，同时最后一个存活玩家 alive 变为 false（同 tick）, **THEN** phase 变为 GAME_OVER（死亡优先于清除），不生成奖励

### 竞技关敌人工厂约束

47. **GIVEN** createArenaEnemy(baseType='tank', floor=4) 被调用, **THEN** 返回敌人 HP = round(80×1.45×1.2) = 139 且 HP ≠ round(round(80×1.45)×1.2)（非双重缩放），ATK = round(15×1.43×1.1) = 21 且不等于 createEnemy() 产生的值

### 陷阱击杀归属（补充）

48. **GIVEN** 敌人 E 被陷阱击杀（HP 降为 0）且无 lastAttackerId, **THEN** 敌人正常死亡但不掉落道具

### 竞技关奖励唯一性拾取

49. **GIVEN** 玩家已持有 vitality_crystal_effect 状态, **WHEN** 玩家拾取 vitality_crystal, **THEN** 道具从地面移除但 player.hpMax 不增加（无效果）。power_essence_effect / iron_rune_effect 同理：刷新持续时间但不叠加倍率

### 柱子渐进损坏

50. **GIVEN** hp=120 的 pillar envObject, **WHEN** 被子弹命中（damage=12）, **THEN** pillar.hp=108, pillar.alive=true, 碰撞网格 tile 保持 false

### exitPoint 异常

51. **GIVEN** phase=PLAYING 且全敌清除但 exitPoint=null/undefined, **WHEN** checkFloorCompletion() 执行, **THEN** 记录错误日志，不生成 envObjects，不触发状态转换（优雅降级）

## Open Questions

1. **Chest 道具是否在此系统中激活**：Chest 目前是死代码，但可以作为竞技关奖励的"开箱"体验。建议在 items 系统迭代中处理。
2. **陷阱是否应该有视觉不同的地面纹理**：当前 plan 用 floor_spikes_anim 动画，但不同陷阱类型（spike/fire/slow）是否需要不同的地板纹理？
3. **竞技关波次清除视觉/音效反馈**：波次清除 + 25% HP 恢复时，是否需要"波次完成"的音效提示和血量恢复动画？
4. **敌人踩陷阱的 AI 改进**：当前故意让敌人不感知陷阱。是否需要在 P2 迭代中让部分敌人类型（ghost）规避陷阱？
5. **竞技关出口门视觉**：doorOpen=true 和 doorOpen=false 的视觉区分？开门时渲染出口指示还是保持门精灵？
