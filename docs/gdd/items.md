# 物品系统 GDD

## Overview

地牢中散落的道具和装备，为玩家提供恢复和增益。物品配置在 `items.ts` 中定义。

## Player Fantasy

探索奖励感：每发现一个道具都是小型惊喜，道具效果立即可感知（回血、加速、护盾）。

## Detailed Rules

### 道具类型

**服务端实际生效的道具**（`GameRoom.ts` checkItemPickup）：

| 道具 | type ID | 效果 | 拾取半径 |
|------|---------|------|---------|
| Medical Pack | `health` | HP +30（上限 hpMax） | 50px |
| Gold Coin | `coin` | Gold +1 | 50px |
| Energy Pack | `energy` | Energy +30（上限 energyMax） | 50px |
| Key | `key` | Keys +1 | 50px |

**客户端定义但服务端未处理**（`items.ts` 有定义但 checkItemPickup switch 无对应 case）：

| 道具 | type ID | 定义效果 | 状态 |
|------|---------|---------|------|
| Potion | `potion` | heal 50 HP | 死代码——拾取后移除但无效果 |
| Shield | `shield` | buff DEF +10 | 死代码——拾取后移除但无效果 |
| Bullet | `bullet` | 弹药补充 | 死代码——拾取后移除但无效果 |
| Chest | `chest` | 随机战利品 | 死代码——无法拾取 |

### 道具渲染
- 0x72 优先 → Kenney fallback
- `items.ts` 的 `spriteName` = Registry key

### 道具拾取

**触发条件**（每 tick 检查）：
1. 玩家存活（`player.alive`）
2. 欧氏距离 `dist(player, item) < 50px`
3. 先检查先得（for 循环从后向前遍历，无优先级）

**拾取后**：
- 效果立即生效（无动画延迟）
- 道具从数组移除（`items.splice(i, 1)`）
- 回复类效果有上限保护（`Math.min(hpMax, hp + amount)`）
- 无叠加规则（所有效果瞬发，无 buff 持续）

**生成来源**：
- 地牢 treasure 房间：50/50 health 或 energy（每房 1 个）
- 敌人死亡掉落：30% 掉率，池 `['health', 'coin', 'coin']`（1/3 health, 2/3 coin）

## Formulas

```
pickupRange = 50 px
healAmount = 30 HP（capped at hpMax）
energyAmount = 30（capped at energyMax）
goldIncrement = 1
dropChance = 0.3
dropPool = { health: 33%, coin: 67% }
treasureItemChance = { health: 50%, energy: 50% }
```

## Edge Cases

- `health_pack`≠`health`（客户端/服务端 ID 必须匹配）
- 道具效果是否可叠加
- 道具是否可在持有上限后拾取

## Dependencies

- 贴图系统（道具渲染）
- 战斗系统（回血/护盾效果）
- 地牢生成（道具放置位置）

## Tuning Knobs

| 参数 | 当前值 | 范围 | 影响 |
|------|--------|------|------|
| 拾取半径 | 50 px | 30-80 | 拾取手感（松/紧） |
| HP 回复量 | 30 | 15-50 | 战斗续航 |
| Energy 回复量 | 30 | 15-50 | 技能使用频率 |
| 掉落率 | 30% | 10%-50% | 道具稀缺性 |
| 掉落池权重 | health:coin=1:2 | — | 道具类型分布 |
| treasure 房道具数 | 1 | 1-3 | 探索奖励 |

**TODO — 道具系统优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P0 | **修复死代码道具** | potion（50HP 回复）、shield（临时 DEF buff）加入 checkItemPickup switch | 7 种道具全部可用 |
| P1 | **Chest 战利品箱** | 实现随机开启，从 loot table 中抽取 1-3 个道具 | 探索奖励高潮 |
| P1 | **Buff 持续时间** | shield 效果改为 10s DEF +10，带视觉指示 | 临时 buff 增加策略性 |
| P1 | **稀有度分级** | common（白）、uncommon（绿）、rare（蓝），影响回复量/持续时间 | 增加拾取惊喜感 |
| P2 | **弹药补给** | bullet 道具恢复能量或增加弹匣容量 | 远程职业资源管理 |
| P2 | **主动道具** | 可拾取并存储到背包（最多 2 格），按键使用 | 增加策略深度 |

## Acceptance Criteria

1. 所有道具正确渲染（0x72 优先，Kenney fallback）
2. 拾取后效果正确应用
3. 道具在客户端和服务端 ID 一致
