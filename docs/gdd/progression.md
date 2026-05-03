# 关卡推进 GDD

## Overview

Floor 1-5 的线性推进系统，每 floor 难度递增。通过出口楼梯进入下一 floor。

## Player Fantasy

递进的紧张感和成就感：每过一 floor 感觉变强了，但敌人也在变强。Boss floor 是阶段性高潮。

## Detailed Rules

### Floor 结构
- 5 个 floor（可通过 DebugMenu 的 `teleport` 跳关验证）
- 出口楼梯是唯一用精灵的地牢物体：`drawDungeonSprite(23)`

### 过关条件

**触发条件**（每 tick 检查，`checkFloorCompletion()`）：
1. **全敌清除**：所有敌人 `alive === false`（dying 状态等 500ms 后 alive 变 false）
2. **玩家到达出口**：任一存活玩家距 exitPoint < 40px
3. 两个条件同时满足时触发

**Floor 过关后**：
- `startFloor(floor + 1)` — 清除所有敌人/子弹/道具，重新生成地牢
- 所有玩家（含已死亡）复活并传送到新出生点
- HP/能量恢复满

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

**死亡惩罚**：
- 全员死亡 → 游戏结束，无重试
- 部分玩家死亡 → 存活玩家继续，死亡玩家下 floor 自动复活

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

**TODO — 关卡推进优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P0 | **Floor 缩放** ✅ 2026-05-03 | 已启用 `enemy_hp = base × (1 + (floor-1) × 0.15)` + `enemy_atk = base × (1 + (floor-1) × 0.1)`，验证 Floor 5 tank HP=128 | 后期敌人不再"纸糊" |
| P0 | **Boss 战实现** ✅ 2026-05-03 | Boss(HP=800/ATK=35)在boss房间生成，3种攻击模式(近战+弹幕+震地AoE)，两阶段切换(HP<50%回复20%) | Floor 5 是高潮而非走过场 |
| P1 | **eliteChance 生效** ✅ 2026-05-03 | elite敌人HP×2+ATK×1.5，Floor 5 验证elite tank HP=256/ATK=32 | 增加随机挑战 |
| P1 | **死亡惩罚** | 死亡玩家下 floor HP 减半（而非恢复满），或掉落金币 | 增加失败成本 |
| P2 | **Boss 多阶段** ✅ 2026-05-04 | Boss HP < 50% 进入 P2，回复 20% HP + 弹幕冷却2s + 震地冷却7s | Boss 战更有层次感 |
| P2 | **难度自适应** | 根据玩家存活数动态调整敌人数量（1人=0.6x, 4人=1.0x） | 单人/满员都平衡 |
| P2 | **奖励递增** | 高 floor 掉落更好道具（potion/shield 替代 health） | 后期 floor 更值得探索 |

## Edge Cases

- 出口坐标浮点对齐问题
- 最后一个 floor（floor 5）过关后的处理
- 玩家死亡后是否可重新进入同一 floor

## Dependencies

- 地牢生成（每 floor 重新生成）
- 敌人 AI（难度影响敌人配置）
- 战斗系统（过关触发战斗结束）

## Tuning Knobs

| 参数 | 当前值 | 范围 | 影响 |
|------|--------|------|------|
| Floor 数量 | 5 | 3-10 | 游戏总时长 |
| 房间数公式 | 6+floor×2 | 4+floor×1 ~ 8+floor×3 | 地牢复杂度 |
| 出口检测距离 | 40 px | 30-60 | 过关触发灵敏度 |
| 掉落率 | 30% | 10%-50% | 道具稀缺性 |

## Acceptance Criteria

1. 通过出口楼梯正确触发下一 floor
2. Floor 1-5 难度递增可感知
3. DebugMenu teleport 可跳到任意 floor
4. Floor 5 过关后游戏正确结束
