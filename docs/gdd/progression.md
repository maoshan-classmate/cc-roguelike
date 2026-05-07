# 关卡推进 GDD

## Overview

Floor 1-5 的线性推进系统，每 floor 难度递增。通过出口楼梯进入下一 floor。Floor 2-4 过渡时可概率触发迷宫关（20%）或竞技关（10%），每局各最多 1 次，不计入楼层数。Floor 5 Boss 房间全敌清除后直接 VICTORY。

## Player Fantasy

递进的紧张感和成就感：每过一 floor 感觉变强了，但敌人也在变强。Boss floor 是阶段性高潮。偶尔出现的迷宫关和竞技关打破常规节奏，提供高风险高回报的分支体验。

## Detailed Rules

### Floor 结构
- 5 个 floor（可通过 DebugMenu 的 `teleport` 跳关验证）
- 出口楼梯是唯一用精灵的地牢物体：`drawDungeonSprite(23)`

### GameRoom 状态机

| 状态 | 含义 |
|------|------|
| `LOBBY` | 等待玩家准备 |
| `FLOOR_TRANSITION` | 过渡动画/生成，决定下一层类型 |
| `PLAYING` | 普通 Floor 活跃游玩 |
| `MAZE_PLAYING` | 迷宫关游玩（迷雾视野限制） |
| `ARENA_PLAYING` | 竞技关游玩（波次战斗） |
| `VICTORY` | Floor 5 通过 |
| `GAME_OVER` | 全员死亡 |

详见 `room-diversity.md` Section 1 完整转换表。

### 过关条件

**触发条件**（每 tick 检查，`checkFloorCompletion()`）：
1. **全敌清除**：所有敌人 `alive === false`（dying 状态等 500ms 后 alive 变 false）
2. **玩家到达出口**：任一存活玩家距 exitPoint < 40px
3. 两个条件同时满足时触发

**Floor 5 特殊胜利条件**（见 room-diversity.md AC 3）：
- Floor 5 Boss 房间全敌清除后**直接 VICTORY**，无需玩家到达出口
- 广播 `game:end { win: true }`

**楼层过渡路由**（FLOOR_TRANSITION 时决定下一层类型）：
```
if floor ∈ {1,2,3} (过渡到 Floor 2/3/4):
  roll = random()
  if roll < 0.1 and !arenaTriggered:   → startArena(), arenaTriggered = true
  elif roll < 0.3 and !mazeTriggered:  → startMaze(), mazeTriggered = true
  else:                                 → startFloor(N+1)
else (Floor 5):                         → VICTORY
```

**互斥规则**：
- 迷宫关和竞技关同一过渡点只触发一种（先检查竞技关 10%，再检查迷宫关 20%）
- 每局各最多 1 次迷宫关和 1 次竞技关（`mazeTriggered` / `arenaTriggered` 标记）
- 迷宫关和竞技关不计入 1-5 层数

**Floor 过关后**：
- 所有玩家（含已死亡）复活并传送到新出生点
- HP/能量恢复满
- **楼层成长加成**：每通过一个 floor，玩家永久获得 +10% ATK 和 +15% HP（基于基础值叠加）。Floor 5 结束时玩家拥有 1.4× ATK 和 1.6× HP，与敌人缩放曲线匹配
- **楼层商店**：FLOOR_TRANSITION 状态期间显示商店界面，玩家可用金币购买道具/增益（详见 items.md "楼层商店" 章节）
- `startFloor(floor + 1)` — 清除所有敌人/子弹/道具，重新生成地牢

**迷宫关通过后**：
- `startFloor(N+1)` — N 为进入迷宫前的 floor 编号
- 死亡玩家自动复活

**竞技关通过后**：
- 奖励道具生成在中央场中心 3×3 tile 区域
- `startFloor(N+1)` — N 为进入竞技关前的 floor 编号
- 死亡玩家自动复活

**Floor 5 过关**：
- `this.running = false`，游戏停止
- 广播 `game:end { win: true }`
- 重置大厅房间

### 难度递增

**当前实现（属性缩放 + 组合递增）**：

| Floor | 敌人数/房 | 敌人类型 | eliteChance | 房间数 |
|-------|----------|---------|-------------|--------|
| 1 | 3-5 | basic×2 | 10% | 8 |
| 2 | 4-7 | basic, fast | 15% | 10 |
| 3 | 5-8 | fast, ghost, tank | 20% | 12 |
| 4 | 6-10 | fast, ghost, tank×2 | 25% | 14 |
| 5 | 8-12 | ghost, tank×3 | 30% | 16 |

- `eliteChance` 已生效（✅）：elite 敌人 HP×2 + ATK×1.5
- Boss 房间（`rooms[last]`）生成 boss + 战前补给道具
- BSP 深度随 floor 增加：Floor 1-2→3，Floor 3-5→4（地牢布局更复杂）

**竞技关额外缩放**（详见 room-diversity.md）：
- `arena_enemy_hp = Math.round(base × (1 + (floor-1) × 0.15) × 1.2)`
- `arena_enemy_atk = Math.round(base × (1 + (floor-1) × 0.1) × 1.1)`
- 竞技关使用独立工厂函数 `createArenaEnemy()`，禁止调用 `createEnemy()`

**死亡惩罚**：
- 全员死亡 → 游戏结束，无重试
- 部分玩家死亡 → 存活玩家继续，死亡玩家下 floor/迷宫关/竞技关通过后自动复活

### DebugMenu 工具
- `teleport` → 跳关（floor 1-5）
- `killAll` → 一键清怪
- `setInvincible` → 角色无敌开关
- 仅 `NODE_ENV !== 'production'` 时可用

## Formulas

```
roomCount = 6 + floor × 2
bspDepth = min(2 + ceil(floor / 2), 4)
exitRange = 40 px
FLOOR_COUNT = 5
enemyCountPerRoom = random(FLOOR_CONFIG[floor].enemyCount[0], [1])
enemyType = randomChoice(FLOOR_CONFIG[floor].enemyTypes)
```

**难度缩放公式**（✅ 已实现）：
- `enemy_hp = base × (1 + (floor-1) × 0.15)`
- `enemy_atk = base × (1 + (floor-1) × 0.1)`
- Boss HP 固定 800，ATK = 25 × (1 + (floor-1) × 0.1)

**玩家成长公式**（每 floor 通过后应用）：
- `player_hpMax = CHARACTER_DEFS[type].hp × (1 + (floorsCleared) × 0.15)`
- `player_atk = CHARACTER_DEFS[type].atk × (1 + (floorsCleared) × 0.1)`
- 与敌人缩放曲线对称：Floor 5 时玩家 1.6× HP / 1.4× ATK vs 敌人 1.6× HP / 1.4× ATK
- 实现位置：`startFloor()` 时根据 `floorsCleared` 计算并更新 `player.hpMax` 和 `player.atk`
- 注：竞技关/迷宫关不计入 floorsCleared（它们不增加楼层数）

**竞技关/迷宫关**：缩放公式、触发概率、Elite 倍率等详见 `room-diversity.md`（权威源）。本 GDD 不重复定义。

## Edge Cases

- 出口坐标浮点对齐问题
- 最后一个 floor（floor 5）过关后的处理
- 玩家死亡后是否可重新进入同一 floor
- Floor 5 完成后不触发竞技关/迷宫关（直接 VICTORY）
- 竞技关/迷宫关玩家断线：角色保持在当前层（alive 不变，dx=0, dy=0）
- 竞技关/迷宫关内全员死亡 → GAME_OVER（与普通 Floor 相同）

## Dependencies

- **room-diversity.md**（上游）：状态机定义、触发路由、迷宫关/竞技关完整规则
- 地牢生成（每 floor 重新生成，4 种生成器）
- 敌人 AI（难度影响敌人配置、dormant 模式）
- 战斗系统（过关触发战斗结束）

## Tuning Knobs

| 参数 | 当前值 | 范围 | 影响 |
|------|--------|------|------|
| Floor 数量 | 5 | 3-10 | 游戏总时长 |
| 房间数公式 | 6+floor×2 | 4+floor×1 ~ 8+floor×3 | 地牢复杂度 |
| 出口检测距离 | 40 px | 30-60 | 过关触发灵敏度 |
| 掉落率 | 30% | 10%-50% | 道具稀缺性（权威源：items.md） |
| 竞技关/迷宫关参数 | — | — | 触发概率、HP/ATK 加成等详见 room-diversity.md（权威源） |

## Acceptance Criteria

1. 通过出口楼梯正确触发下一 floor
2. Floor 1-5 难度递增可感知
3. DebugMenu teleport 可跳到任意 floor
4. Floor 5 过关后游戏正确结束
5. FLOOR_TRANSITION 时正确路由：10% 竞技关 / 20% 迷宫关 / 其余下一 floor
6. 迷宫关/竞技关不计入楼层数，通过后正确进入 N+1 floor
7. 每局最多 1 次迷宫关和 1 次竞技关
8. Floor 5 完成后直接 VICTORY，不触发迷宫关/竞技关
