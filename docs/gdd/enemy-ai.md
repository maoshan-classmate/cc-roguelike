# 敌人 AI GDD

## Overview

5 种敌人类型，各有独立行为模式。基础敌人由程序生成贴图，高级敌人使用 0x72 精灵。

## Player Fantasy

敌人应提供渐进式挑战：basic 是炮灰、fast 制造紧迫感、ghost 提供战术压力、tank 需要团队集火、boss 是 floor 高潮。

## Detailed Rules

### 敌人类型

| 类型 | HP | ATK | 速度(px/s) | 尺寸 | 碰撞半径 | 贴图源 |
|------|-----|-----|-----------|------|---------|--------|
| basic | 30 | 8 | 60 | 40 | 16 | sheet |
| fast | 20 | 10 | 120 | 36 | 14 | sheet |
| ghost | 40 | 12 | 70 | 42 | 16 | sheet |
| tank | 80 | 15 | 40 | 48 | 20 | sheet |
| boss | 800 | 25×(1+(floor-1)×0.1) | 50 | 64 | 28 | sheet |

### 客户端/服务端 ID 匹配
- 客户端/服务端 ID 必须匹配（`slime`≠`basic`, `health_pack`≠`health`）

### 已知贴图缺失
- `slime_idle_anim_f0` 不存在于 atlas，basic 敌人 fallback 到 `goblin_idle_anim_f0`

## Formulas

**仇恨检测**：
- 每种敌人有 `aggroRange`（定义于 `ENEMY_DEFS`），玩家进入 aggroRange **且** 视线可达 → 产生仇恨，进入 chase
- **威胁表**（Threat Table）：`EnemyState.threatTable` — 累加制，被攻击时 `threatTable[attackerId] += damage`
- **目标选择**：威胁表最高威胁的存活玩家 > 最近距离玩家
- **威胁衰减**：每 tick -1（约 -20/s），50 tick 清零
- **仇恨记忆 + Leash**：已有目标时 leash = `aggroRange × 2`，超出脱战，清 aggroTargetId + threatTable
- **目标锁定**：选定目标后锁定 500ms，期间不切换；目标死亡立即解锁
- **视线检测**：首次进入 aggroRange 时检查 `hasLineOfSight`（射线步进 8px），无视线不产生仇恨。已在 chase 不受视线限制。ghost 跳过视线
- **被攻击产生仇恨**：`damageEnemy` 收到 `attackerId` 时调 `addThreat`，远程/近战/DOT 均产生仇恨

**攻击频率**：
- 显式冷却 per type：`ENEMY_DEFS[type].attackCooldown`（basic=1000ms, fast=800ms, ghost=1200ms, tank=1500ms, boss=500ms）
- 近战攻击范围：普通敌人 30px，Boss 40px
- 接触碰撞伤害：玩家-敌人距离 < 双方 radius 之和时触发 30% attack 伤害，0.5s 冷却

**移动算法**（直接追踪 + 墙壁滑行）：
```
1. 计算方向: dir = normalize(player.pos - enemy.pos)
2. 尝试直行: if walkable(pos + dir × speed × dt) → 移动
3. 滑行 X:  else if walkable(pos + dir.x × speed × dt) → 仅 X 移动
4. 滑行 Y:  else if walkable(pos + dir.y × speed × dt) → 仅 Y 移动
5. 逃逸:    else 尝试 8 个偏移角度 (-π/2, π/2, -π/4, π/4, ...)
```

**碰撞检测**：`isWalkableRadius(x, y, radius)` — 5 点采样（中心 + 四角），32px tile 网格

**状态机**（普通敌人）：
| 状态 | 转换条件 | 持续时间 |
|------|---------|---------|
| idle → chase | 玩家进入 aggroRange 且视线可达（或被攻击产生仇恨） | 持续 |
| chase → attack | dist ≤ 30px 且 attackCooldown 已过 | 直到 dist > 30px |
| chase → idle | 超出 leash（aggroRange × 2）且无威胁表 | 重置仇恨 |
| attack → chase | dist > 30px | 持续 |
| any → dying | hp ≤ 0 | 500ms（deathTimer） |
| dying → alive=false | deathTimer ≤ 0 | 永久 |

**Boss 状态机**：
| 状态 | 转换条件 | 说明 |
|------|---------|------|
| idle | 脱战（>`ENEMY_DEFS.boss.aggroRange` 即 400px，无蓄力） | 重置技能计时器 |
| chase | 有玩家在 aggroRange 内 | 速度 50px/s |
| chase | 被嘲讽（forcedTarget） | Boss 受嘲讽影响，追击嘲讽者 |
| casting | 蓄力中（弹幕500ms/震地800ms） | 不可被脱战中断 |
| attack | 近战冷却 500ms | 距离 ≤ 40px |
| phase2 | HP ≤ 50% | 回复20% HP，弹幕/震地冷却缩短 |

**注意**：Boss 有独立 AI 方法 `updateBossEnemy()`，实现近战+弹幕+震地AoE三种攻击+两阶段切换。`BOSS_TEMPLATES`（fireball、bone_projectile 等）存在但未被引用。

---

**TODO — AI 优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P0 | **仇恨范围** ✅ 2026-05-03 → ✅ 2026-05-09 增强 | aggroRange + 视线检测 + 威胁表 + Leash 脱战 + 目标锁定 + 被攻击产生仇恨 | 完整仇恨系统，支持策略性仇恨管理 |
| P0 | **攻击冷却** ✅ 2026-05-03 | 已实现，EnemyState 新增 `lastAttackTime`，`ENEMY_DEFS[type].attackCooldown` 配置 | 敌人间攻击节奏差异化 |
| P0 | **Ghost 穿墙** ✅ 2026-05-03 | ghost 类型跳过 `isWalkableRadius`，仅检查地图边界 | 差异化敌人行为，增加战术压力 |
| P1 | **Boss 攻击模式** ✅ 2026-05-03 → ✅ 2026-05-09 增强 | `updateBossEnemy()` 实现3种攻击（近战+5颗扇形弹幕+震地AoE）+两阶段切换+蓄力前摇+避障逃逸+脱战机制+嘲讽支持 | Boss 战成为 floor 高潮而非大号普通怪 |
| P1 | **分类型 AI** ✅ 2026-05-03 | boss独立AI方法，tank减伤40%，fast闪避20%，ghost穿墙，basic/fast共用追击 | 每种敌人有独特体验 |
| P2 | **A* 寻路** | 替代直接追踪，支持绕障碍物追击 | 避免敌人卡在墙角 |
| P2 | **脱战机制** ✅ 2026-05-03 | Boss超出aggroRange(400px)后idle，重置技能计时器 | 允许玩家撤退/战术重整 |
| P2 | **远程敌人** | 实现 `checkBulletCollision` 中 `friendly=false` 的敌人弹丸路径 | 增加战斗多样性（ranged 敌人） |

## Edge Cases

- `killAll` 设 `enemy.alive = false` 但不删除
- 判断"无活怪"必须用 `enemies.filter((e: any) => e.alive !== false).length === 0`
- ghost 类型碰撞半径为 16px（但 AI 中跳过墙壁碰撞检测，可穿透墙壁）

## Dependencies

- 地牢生成（在生成的房间中寻路）
- 贴图系统（敌人渲染）
- 战斗系统（伤害计算）

## Tuning Knobs

| 参数 | 当前值 | 范围 | 影响 |
|------|--------|------|------|
| basic HP | 30 | 20-50 | 炮灰耐久 |
| basic ATK | 8 | 3-15 | 基础威胁 |
| basic 速度 | 60 px/s | 30-120 | 移动速率 |
| boss HP | 800 | 200-1000 | Boss 战时长 |
| boss ATK | 25 | 10-50 | Boss 伤害 |
| 威胁衰减速率 | -1/tick (~-20/s) | 0-50 | 仇恨记忆持久度 |
| 目标锁定时间 | 500ms | 0-2000 | 防止目标抖动 |
| Leash 倍率 | aggroRange × 2 | 1-4 | 追击距离上限 |
| 视线步进 | 8px | 4-16 | 精度/性能 |
| 接触伤害倍率 | 30% | 10-50% | 近身惩罚 |
| 接触伤害冷却 | 500ms | 200-1000 | 接触频率 |

## Acceptance Criteria

1. 5 种敌人各有独立行为模式
2. 敌人不会卡在墙里
3. `killAll` 后所有敌人 `alive=false`，且后续活怪检测正确
4. basic 敌人贴图正确 fallback 到 goblin
