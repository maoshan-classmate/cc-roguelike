# Quick Design Spec: 敌人仇恨系统重构

**Type**: Addition
**System**: Enemy AI — 仇恨/目标选择子系统
**GDD Reference**: `docs/gdd/enemy-ai.md`
**Date**: 2026-05-09

## Change Summary

敌人 AI 仇恨系统全面重构：新增威胁表（Threat Table）、视线检测（Line of Sight）、仇恨记忆 + Leash 脱战、目标锁定、被攻击产生仇恨、接触碰撞伤害、Boss 嘲讽支持、DOT 来源传递。共 6 项设计缺陷 + 7 项 Bug + GDD 不一致。

## Motivation

当前仇恨系统存在严重缺陷：敌人每帧盲目追踪最近玩家（无记忆、无忠诚度）；被远程攻击不产生仇恨（可以白嫖）；无脱战机制（追到天涯海角）；Boss 完全免疫嘲讽（战士 war_cry 对 Boss 无效）；近战不传 attackerId（战士永远不产生仇恨）；Wave 3 精英永久休眠。这些问题导致战斗策略单一、仇恨不可控、战士职业定位失效。

## Design Delta

Current GDD says (quoting `docs/gdd/enemy-ai.md`, Formulas — 仇恨检测):

> 无范围限制——始终追踪全局最近存活玩家
> 每个服务端 tick（20Hz）重新计算最近目标
> `nearestPlayer = argmin(players.alive, dist(enemy, player))`

This spec changes that to:

**仇恨检测**：
1. 每种敌人有 `aggroRange`（定义于 `ENEMY_DEFS`）。玩家进入 aggroRange **且** 视线可达 → 产生仇恨，进入 chase
2. 仇恨记忆：已有目标的敌人，leash 范围 = `aggroRange × 2`，超出才脱战
3. 被攻击产生仇恨：`damageEnemy` 收到 `attackerId` 时，向威胁表添加 `damage` 点威胁值
4. 目标选择优先级：威胁表最高威胁的存活玩家 > 最近距离玩家
5. 目标锁定：选定目标后锁定 0.5 秒，期间不切换；目标死亡立即解锁
6. 威胁衰减：每 tick 威胁值 -1（约每秒 -20，50 tick 清零）
7. 脱战：清除 aggroTargetId + threatTable

Current GDD says (quoting `docs/gdd/enemy-ai.md`, Formulas — 攻击频率):

> 无显式冷却——每 tick 尝试攻击，受玩家无敌帧限制
> 有效攻击间隔 = 0.5s（`player.invincible` 持续时间）

This spec changes that to:

**攻击频率**：已实现 `attackCooldown`（定义于 `ENEMY_DEFS`），但 GDD 未同步。显式冷却 per type，见 Tuning Knobs。

## New Rules / Values

### 1. 威胁表（Threat Table）
- `EnemyState.threatTable: Record<string, number>` — 玩家 ID → 威胁值
- 累加制：每次被攻击 `threatTable[attackerId] += damage`
- 衰减：每 tick 所有条目 -1（下限 0）
- 目标选择：`argmax(threatTable, player.alive)`；无威胁表或全零时 fallback 最近距离

### 2. 视线检测（Line of Sight）
- `CollisionGrid.hasLineOfSight(x1, y1, x2, y2): boolean`
- 射线步进 8px/步，每步 `isWalkable` 检查
- 不可走 → 返回 false（有墙阻挡）
- ghost 类型跳过视线检测（直接返回 true）
- **仅用于**：首次进入 aggroRange 判断是否产生仇恨。已在 chase 的敌人不受视线限制

### 3. 仇恨记忆 + Leash
- `EnemyState.aggroTargetId?: string` — 当前仇恨目标
- `EnemyState.lastAggroTime: number` — 最后仇恨时间
- 首次 aggro：进入 aggroRange + 视线 → 设 aggroTargetId，chase
- Leash：已有 aggroTargetId 时，leash = aggroRange × 2。超出 → 脱战（清 aggroTargetId + threatTable）
- 被攻击可打断脱战：收到伤害时刷新 aggroTargetId

### 4. 目标锁定
- `EnemyState.targetLockUntil: number` — 目标锁定截止时间（ms）
- 选定目标后锁定 500ms，期间不重选
- 目标死亡（`alive === false`）→ 立即解锁

### 5. 被攻击产生仇恨
- `GameRoom.damageEnemy(enemyId, damage, attackerId)` → 有 attackerId 时调 `enemyAI.addThreat(enemyId, attackerId, damage)`
- 近战修复：`Combat.executeMelee` 中 `damageEnemy(enemy.id, effectiveDamage)` → `damageEnemy(enemy.id, effectiveDamage, player.id)`

### 6. 接触碰撞伤害
- `EnemyState.contactDamageCooldown?: number` — 接触伤害冷却
- 每 tick 检查：玩家-敌人距离 < 双方 radius 之和
- 触发 30% attack 伤害，0.5s 冷却
- 客户端-服务端共享 radius：`GAME_CONFIG.PLAYER_BASE.radius` (10) + `ENEMY_DEFS[type].radius`

### 7. Boss 嘲讽支持
- `updateBoss` 开头添加 `forcedTarget` 检查（与 `updateRegular` 对齐）
- Boss 不再免疫嘲讽

### 8. Bug 修复
- **Wave 3 休眠**：`spawnArenaWave` wave=3 分支显式设 `enemy.dormant = false`
- **能量回复延迟**：跟踪 `lastEnergyUseTime`，`ENERGY_REGEN_DELAY`（2000ms）后才回复
- **DOT 来源传递**：tick 回调从 status effect 提取 `sourceId` 传给 `damageEnemy`
- **war_cry 跳过休眠敌人**：遍历敌人时 `if (enemy.dormant) continue;`

### Tuning Knobs

| 参数 | 当前值 | 新值 | 范围 | 类别 | 理由 |
|------|--------|------|------|------|------|
| 威胁衰减速率 | N/A | -1/tick (~-20/s) | 0-50 | curve | 2.5s 完全清零，确保被攻击后有时间窗口 |
| 目标锁定时间 | N/A | 500ms | 0-2000 | feel | 防止高频切换目标导致抖动 |
| Leash 倍率 | N/A | aggroRange × 2 | 1-4 | gate | 给追击留余量，不会追到地图边缘 |
| 视线步进 | N/A | 8px | 4-16 | curve | 性能与精度平衡 |
| 接触伤害倍率 | N/A | 30% | 10-50% | gate | 不超过主动攻击，但提供近身惩罚 |
| 接触伤害冷却 | N/A | 500ms | 200-1000 | feel | 与攻击冷却对齐 |
| 能量回复延迟 | 0（未启用） | 2000ms | 0-5000 | gate | 防止战斗中无限技能 |

## Affected Systems

| System | Impact | Action Required |
|--------|--------|-----------------|
| shared/types.ts | EnemyState +5 字段 | 新增字段定义 |
| CollisionGrid | +hasLineOfSight 方法 | 新增射线步进 |
| EnemyAI | 重构目标选择逻辑 | 威胁表 + 视线 + 锁定 + Boss 嘲讽 |
| GameRoom | addThreat + Wave3 + 能量 + DOT + 接触伤害 | 5 处修改 |
| Combat | 近战传 attackerId | 1 行改动 |
| SkillHandlers | war_cry 跳过 dormant | 1 行改动 |
| docs/gdd/enemy-ai.md | Formulas + 状态机 + Tuning Knobs | 全面更新 |

## Acceptance Criteria

- [ ] 被远程攻击后敌人转向攻击者（威胁表累加验证）
- [ ] war_cry 对 Boss 有效（Boss 追击战士）
- [ ] 敌人超出 aggroRange × 2 后脱战返回 idle
- [ ] 墙壁后玩家不触发敌人仇恨（视线检测）
- [ ] Wave 3 精英立即参战（dormant = false）
- [ ] 战士近战击杀回能量（attackerId 传递）
- [ ] 能量 2s 延迟回复（ENERGY_REGEN_DELAY 生效）
- [ ] 接触碰撞受伤（贴脸 30% attack 伤害）
- [ ] 目标锁定 0.5s 内不切换（即使更高威胁玩家出现）
- [ ] `npx tsc --noEmit` 零 error
- [ ] E2E：登录→建房间→选战士→开始冒险，无回归

## GDD Update Required?

**Yes** — `docs/gdd/enemy-ai.md`，需要更新：
- Formulas → 仇恨检测：替换为威胁表 + leash + 视线
- Formulas → 攻击频率：同步已有 cooldown
- 状态机表格：更新 idle→chase 条件（aggroRange + 视线）
- Boss 状态机：添加嘲讽支持说明
- Tuning Knobs：新增参数表
- TODO 表：标记已实现项
