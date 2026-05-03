# 敌人 AI GDD

## Overview

5 种敌人类型，各有独立行为模式。基础敌人由程序生成贴图，高级敌人使用 0x72 精灵。

## Player Fantasy

敌人应提供渐进式挑战：basic 是炮灰、fast 制造紧迫感、ghost 提供战术压力、tank 需要团队集火、boss 是 floor 高潮。

## Detailed Rules

### 敌人类型

| 类型 | HP | ATK | 速度 | 尺寸 | 碰撞半径 | 贴图源 |
|------|-----|-----|------|------|---------|--------|
| basic | 30 | 5 | 1.0 | 40 | 16 | generated |
| fast | 20 | 8 | 2.0 | 36 | 14 | generated |
| ghost | 40 | 12 | 1.2 | 42 | -- | generated |
| tank | 80 | 10 | 0.5 | 48 | 20 | 0x72 |
| boss | 200 | 20 | 0.8 | 64 | 28 | 0x72 |

### 客户端/服务端 ID 匹配
- 客户端/服务端 ID 必须匹配（`slime`≠`basic`, `health_pack`≠`health`）

### 已知贴图缺失
- `slime_idle_anim_f0` 不存在于 atlas，basic 敌人 fallback 到 `goblin_idle_anim_f0`

## Formulas

**仇恨检测**：
- 无范围限制——始终追踪全局最近存活玩家
- 每个服务端 tick（20Hz）重新计算最近目标
- `nearestPlayer = argmin(players.alive, dist(enemy, player))`

**攻击频率**：
- 无显式冷却——每 tick 尝试攻击，受玩家无敌帧限制
- 有效攻击间隔 = 0.5s（`player.invincible` 持续时间）
- 每秒最大伤害 = `enemy.attack × 2`（basic=16/s, boss=50/s）

**移动算法**（直接追踪 + 墙壁滑行）：
```
1. 计算方向: dir = normalize(player.pos - enemy.pos)
2. 尝试直行: if walkable(pos + dir × speed × dt) → 移动
3. 滑行 X:  else if walkable(pos + dir.x × speed × dt) → 仅 X 移动
4. 滑行 Y:  else if walkable(pos + dir.y × speed × dt) → 仅 Y 移动
5. 逃逸:    else 尝试 8 个偏移角度 (-π/2, π/2, -π/4, π/4, ...)
```

**碰撞检测**：`isWalkableRadius(x, y, radius)` — 5 点采样（中心 + 四角），32px tile 网格

**状态机**：
| 状态 | 转换条件 | 持续时间 |
|------|---------|---------|
| idle → chase | 首次 tick（无 aggro 范围，立即触发） | 持续 |
| chase → attack | dist ≤ 30px | 直到 dist > 30px |
| attack → chase | dist > 30px | 持续 |
| any → dying | hp ≤ 0 | 500ms（deathTimer） |
| dying → alive=false | deathTimer ≤ 0 | 永久 |

**注意**：`BOSS_TEMPLATES`（定义了 5 个 Boss 攻击模式如 fireball、bone_projectile）存在但**未被任何代码引用**。当前所有敌人（含 boss）共享同一近战 AI。

---

**TODO — AI 优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P0 | **仇恨范围** ✅ 2026-05-03 | 已实现于 `GameRoom.ts updateEnemy()`，ENEMY_AGGRO_RANGE static 配置 | 避免"全图感知"，增加潜行/策略空间 |
| P0 | **攻击冷却** ✅ 2026-05-03 | 已实现，EnemyState 新增 `lastAttackTime`，ENEMY_ATTACK_COOLDOWN static 配置 | 敌人间攻击节奏差异化 |
| P0 | **Ghost 穿墙** ✅ 2026-05-03 | ghost 类型跳过 `isWalkableRadius`，仅检查地图边界 | 差异化敌人行为，增加战术压力 |
| P1 | **Boss 攻击模式** | 实现 `BOSS_TEMPLATES` 中已定义的 5 个 Boss 攻击模式 | Boss 战成为 floor 高潮而非大号普通怪 |
| P1 | **分类型 AI** | 将 `updateEnemy` 按类型拆分：basic/fast 用当前逻辑，ghost 加穿墙，tank 加护甲，boss 加多阶段 | 每种敌人有独特体验 |
| P2 | **A* 寻路** | 替代直接追踪，支持绕障碍物追击 | 避免敌人卡在墙角 |
| P2 | **脱战机制** | 超出 aggroRange 后 3s 脱战，返回 idle + 回血 | 允许玩家撤退/战术重整 |
| P2 | **远程敌人** | 实现 `checkBulletCollision` 中 `friendly=false` 的敌人弹丸路径 | 增加战斗多样性（ranged 敌人） |

## Edge Cases

- `killAll` 设 `enemy.alive = false` 但不删除
- 判断"无活怪"必须用 `enemies.filter((e: any) => e.alive !== false).length === 0`
- ghost 类型碰撞半径为 `--`（可能穿透墙壁？）

## Dependencies

- 地牢生成（在生成的房间中寻路）
- 贴图系统（敌人渲染）
- 战斗系统（伤害计算）

## Tuning Knobs

| 参数 | 当前值 | 范围 | 影响 |
|------|--------|------|------|
| basic HP | 30 | 20-50 | 炮灰耐久 |
| basic ATK | 5 | 3-10 | 基础威胁 |
| basic 速度 | 1.0 | 0.5-2.0 | 移动速率 |
| boss HP | 200 | 100-500 | Boss 战时长 |
| boss ATK | 20 | 10-40 | Boss 伤害 |

## Acceptance Criteria

1. 5 种敌人各有独立行为模式
2. 敌人不会卡在墙里
3. `killAll` 后所有敌人 `alive=false`，且后续活怪检测正确
4. basic 敌人贴图正确 fallback 到 goblin
