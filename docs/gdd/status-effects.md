# 状态效果系统 GDD

## A. Overview

状态效果系统是游戏的**基础设施层**，为技能、Boss 机制、道具、敌人攻击和地形陷阱提供统一的 Buff/Debuff/CC 管理框架。所有限时状态（无敌帧、加速、眩晕、灼烧等）通过 `StatusManager` 统一 apply/tick/remove/query，替代当前散落在 `PlayerState.invincible`、`speedBuff`、`speedBuffTimer` 中的硬编码逻辑。设计目标：一次实现，所有系统受益；添加新状态类型无需改核心代码。

## B. Player Fantasy

玩家应感受到**清晰、可读的状态反馈**：被冰冻时角色变蓝且无法移动，被灼烧时持续闪烁火焰，加速时留下残影。每次状态施加和消退都有明确的视觉/音效信号。高手的标志是利用状态窗口（Boss 蓄力时施加眩晕打断、在被减速时用 dash 解除），而非被状态被动控制。

目标 MDA 美学：**Challenge**（状态管理增加战斗深度）、**Sensation**（状态视觉效果提供打击反馈）、**Expression**（状态组合创造build多样性）。

## C. Detailed Rules

### C1. 核心接口

#### StatusEffectInstance（运行时实例）

```typescript
interface StatusEffectInstance {
  id: string;                  // 唯一实例 ID（自动生成）
  typeId: string;              // 状态类型 ID（引用 EFFECT_DEFINITIONS 的 key）
  sourceId: string;            // 施加者实体 ID（用于嘲讽/仇恨追踪）
  remainingMs: number;         // 剩余持续时间（毫秒）
  stacks: number;              // 当前叠加层数
  value: number;               // 效果数值（伤害、倍率等，由 typeId 语义决定）
  tickAccumulator: number;     // tick 累积器（毫秒，用于 DOT 等周期效果）
}
```

#### EffectDefinition（数据驱动的状态定义）

```typescript
interface EffectDefinition {
  typeId: string;              // 唯一类型 ID
  category: 'cc' | 'buff' | 'debuff' | 'special';
  name: string;                // 显示名称（日志/UI 用）

  // 叠加规则
  stackPolicy: 'refresh' | 'max_duration' | 'stack' | 'max_stacks';
  maxStacks: number;           // stackPolicy='stack' 或 'max_stacks' 时的上限

  // 互斥组
  exclusiveGroup?: string;     // 同组互斥，新状态替换旧的
  priority: number;            // 互斥冲突时高优先级保留（0=最低）

  // 周期效果
  tickIntervalMs?: number;     // DOT/HOT 的 tick 间隔（0=无周期效果）
  tickAction?: 'damage' | 'heal' | 'energy';

  // 瞬时效果（durationMs=0 时立即执行）
  isInstant?: boolean;         // 标记为瞬时效果（不存入 effects Map）
  onApply?: (target: Entity, source: Entity, value: number) => void;

  // 行为标记（供各系统查询）
  flags: Partial<EffectFlags>;
}

interface EffectFlags {
  blocksMovement: boolean;     // 禁止移动（stun/freeze/root）
  blocksAttack: boolean;       // 禁止攻击
  blocksSkill: boolean;        // 禁止使用技能
  speedMultiplier: number;     // 速度倍率（1.0=无影响，0.5=减速50%）
  damageMultiplier: number;    // 受伤倍率（1.0=无影响，0.5=减伤50%）
  outgoingDamageMultiplier: number; // 造成伤害倍率
  invulnerable: boolean;       // 完全无敌
  forcedTarget: boolean;       // 强制攻击目标（嘲讽）
  knockbackImmune: boolean;    // 免疫击退
  energyRegenMultiplier: number; // 能量回复倍率
  cooldownMultiplier: number;  // 技能冷却倍率
  ccImmune: boolean;           // 免疫所有 CC 类状态（施加时检查）
}
```

### C2. StatusManager 管理器

```typescript
class StatusManager {
  // 每个 Entity 持有一个 StatusManager 实例
  private effects: Map<string, StatusEffectInstance>;  // key = typeId

  // 核心操作
  apply(typeId: string, sourceId: string, value: number, durationMs: number): void;
  remove(typeId: string): void;
  removeAllBySource(sourceId: string): void;
  clearAll(): void;

  // tick 驱动（由 GameRoom.update() 每帧调用）
  tick(dtMs: number, context: TickContext): void;

  // 查询接口
  has(typeId: string): boolean;
  getStacks(typeId: string): number;
  getValue(typeId: string): number;
  getRemainingMs(typeId: string): number;

  // 聚合查询（合并所有活跃状态的 flags）
  getAggregatedFlags(): EffectFlags;

  // 序列化（网络同步）
  serialize(): SerializedStatusEffect[];
  deserialize(data: SerializedStatusEffect[]): void;
}

interface TickContext {
  entityId: string;
  dealDamage(targetId: string, amount: number): void;
  healTarget(targetId: string, amount: number): void;
  restoreEnergy(entityId: string, amount: number): void;
}

interface SerializedStatusEffect {
  typeId: string;
  remainingMs: number;
  stacks: number;
  value: number;
  sourceId: string;
}
```

### C3. 叠加规则

#### 叠加策略（由 EffectDefinition.stackPolicy 决定）

| 策略 | 行为 | 适用场景 |
|------|------|---------|
| `refresh` | 新施加覆盖旧实例，remainingMs 重置 | invincible, speed_boost, invulnerable |
| `max_duration` | 取 max(旧remainingMs, 新durationMs)，不重置 | 大部分 Buff |
| `stack` | stacks+1，remainingMs 重置，无上限 | DOT 类（burn, poison） |
| `max_stacks` | stacks+1（上限=maxStacks），remainingMs 重置 | 有上限的叠层（weaken, vulnerable） |

#### 互斥组

| 互斥组 | 包含状态 | 说明 |
|--------|---------|------|
| `hard_cc` | stun, freeze | 硬控互斥，最新施加的生效 |
| `invincibility` | iframes, invulnerable | 无敌互斥，取剩余时间长者 |
| `damage_reduction` | shield | 减伤来源互斥（shield 和 invulnerable 不在同一组） |

**注意**: slow 和 speed_boost **不互斥**，它们通过 C6 的乘积聚合共存。slow(0.5) × speed_boost(1.5) = 实际速度 0.75x。

#### 互斥解决规则

1. 同一 `exclusiveGroup` 内，新施加的状态与已存在的冲突时：
   - 若新状态 `priority >= 旧状态.priority` → 移除旧状态，施加新状态
   - 若新状态 `priority < 旧状态.priority` → 新状态被拒绝（不施加）
2. 同 typeId 的状态走 stackPolicy，不走互斥规则
3. 无 `exclusiveGroup` 的状态可自由共存

### C4. 状态施加流程

```
apply(typeId, sourceId, value, durationMs):
  1. 查找 EFFECT_DEFINITIONS[typeId] → 若不存在则拒绝
  2. 检查互斥组：
     a. 查找同 exclusiveGroup 的已存在状态
     b. 若存在且旧优先级 > 新优先级 → 拒绝施加
     c. 若存在且旧优先级 <= 新优先级 → 移除旧状态
  3. 瞬时效果处理：
     a. 若 definition.isInstant === true → 执行 onApply 回调，不存入 effects Map，流程结束
     b. 例如 knockback: onApply 将目标向指定方向推出 value 距离（碰撞检测后）
  4. 检查同 typeId 的已存在状态：
     a. 若存在 → 按 stackPolicy 处理
     b. 若不存在 → 创建新实例（stacks=1）
  5. 触发 onApply 回调（如有，非瞬时效果也可以有 onApply）
```

### C5. Tick 流程

```
tick(dtMs, context):
  for each effect in effects:
    1. 累加 tickAccumulator += dtMs
    2. 若 tickIntervalMs > 0 且 tickAccumulator >= tickIntervalMs:
       a. 执行 tickAction（damage/heal/energy）
       b. tickAccumulator -= tickIntervalMs
    3. remainingMs -= dtMs
    4. 若 remainingMs <= 0:
       a. 移除该状态
       b. 触发 onExpire 回调（如有）
```

### C6. 聚合规则（getAggregatedFlags）

多个活跃状态的 flags 按以下规则合并：

| Flag | 合并规则 |
|------|---------|
| blocksMovement | 任意一个为 true → true（OR） |
| blocksAttack | 任意一个为 true → true（OR） |
| blocksSkill | 任意一个为 true → true（OR） |
| speedMultiplier | 取所有值的**乘积**（0.5 slow * 1.5 boost = 0.75） |
| damageMultiplier | 取所有值的**乘积**（多个减伤叠加） |
| outgoingDamageMultiplier | 取所有值的**乘积** |
| invulnerable | 任意一个为 true → true（OR） |
| forcedTarget | 取最后一个施加的嘲讽 sourceId |
| knockbackImmune | 任意一个为 true → true（OR） |
| energyRegenMultiplier | 取所有值的**乘积** |
| cooldownMultiplier | 取所有值的**乘积** |

**乘积下限保护**：所有乘积结果 clamp 到 `[0.1, 3.0]`（`Math.max(0.1, Math.min(3.0, result))`），防止速度/伤害/冷却归零或溢出。

### C7. 实体容量硬上限

- 单实体最大活跃状态数：**8**
- 超出上限时，按优先级从低到高移除最早施加的状态（不含 invulnerable）
- `priority: 0` 的状态最先被移除

### C8. 与现有系统的交互接口

#### EnemyAI 查询

```typescript
// EnemyAI.update() 中：
if (enemy.statusManager.getAggregatedFlags().blocksMovement) {
  return; // 被定身/冰冻，跳过 AI tick
}
```

#### Combat 伤害计算

```typescript
// damagePlayer() / damageEnemy() 中：
const flags = target.statusManager.getAggregatedFlags();
if (flags.invulnerable) return;
const effectiveDamage = rawDamage * flags.damageMultiplier;
```

#### 移动系统

```typescript
// GameRoom.update() 中：
const speedMult = player.statusManager.getAggregatedFlags().speedMultiplier;
const speed = baseSpeed * speedMult * dt;
```

#### 技能使用

```typescript
// Combat.useSkill() 中：
const flags = player.statusManager.getAggregatedFlags();
if (flags.blocksSkill) return; // 被沉默/眩晕，无法使用技能
```

## D. Formulas

### D1. 速度倍率计算

```
effectiveSpeed = baseSpeed * product(all speedMultiplier flags) * dt
```

**边界保护**：
- 最终速度 >= baseSpeed * 0.1（防止完全停止，除非 blocksMovement=true）
- 最终速度 <= baseSpeed * 3.0（防止速度溢出）

**示例**：
- 基础速度 180，slow(0.5) + speed_boost(1.5) → 180 * 0.75 = 135 px/s
- 基础速度 180，仅 slow(0.5) → 180 * 0.5 = 90 px/s
- 基础速度 180，speed_boost(1.5) → 180 * 1.5 = 270 px/s

### D2. 伤害倍率计算

```
effectiveDamage = max(1, rawDamage - target.defense * 0.5) * target.damageMultiplier
```

**示例**：
- rawDamage=30, DEF=10, shield(0.5) → max(1, 30-5) * 0.5 = 12.5 → 12
- rawDamage=30, DEF=10, vulnerable(1.5) → max(1, 30-5) * 1.5 = 37.5 → 37
- rawDamage=30, DEF=10, invulnerable → 0（被拦截）

### D3. DOT 伤害计算

```
tickDamage = value * stacks
totalDamage = tickDamage * ceil(durationMs / tickIntervalMs)
```

**示例**（burn, value=5, tickInterval=500ms, duration=3000ms, stacks=1）：
- tickDamage = 5 * 1 = 5
- 总 ticks = ceil(3000/500) = 6
- totalDamage = 30

**叠加后**（stacks=3）：
- tickDamage = 5 * 3 = 15
- totalDamage = 90

### D4. 击退公式

```
knockbackDistance = value (px) // 直接使用 value 作为距离
direction = normalize(target.pos - source.pos)
target.pos += direction * knockbackDistance * (1 - knockbackResistance)
```

- knockbackResistance 默认 0.0（全量击退）
- knockbackImmune 标记为 true 时完全免疫

### D5. 状态持续时间缩放

```
actualDurationMs = baseDurationMs * (1 + source.hasteBonus)
```

- hasteBonus 为施加者的冷却缩减属性（当前为 0，预留给未来）
- 负面状态持续时间可被目标的 resilience 缩减：`actualDuration = base * (1 - resilience)`

### D6. 最大活跃状态溢出处理

```
if (effects.size >= MAX_ACTIVE_EFFECTS):
  candidates = effects.filter(e => e.typeId !== 'invulnerable').sort((a,b) => a.priority - b.priority)
  remove(candidates[0])  // 移除优先级最低的
```

## E. Edge Cases

### E1. 状态施加到死亡实体

**规则**：所有状态施加前检查目标实体 `alive` 状态。若目标已死亡，拒绝施加。已存在的状态在实体死亡时由 `clearAll()` 清除。

### E2. 负值持续时间

**规则**：`remainingMs` 不允许为负。`apply()` 时若 `durationMs <= 0`，视为瞬时效果（立即执行一次 tickAction 后不存入）。

### E3. 零除保护

**规则**：所有除法操作用 `Math.max(epsilon, divisor)` 保护。速度乘积用 `Math.max(0.1, product)`。

### E4. 同一帧施加多个互斥状态

**规则**：按施加顺序逐个处理。第一个施加成功，第二个触发互斥检查。结果取决于两者优先级。同优先级时后者替换前者（后发先至）。

### E5. 状态施加者死亡/离开

**规则**：嘲讽（taunt）状态在施加者死亡时自动移除（`removeAllBySource(deadEntityId)`）。其他状态不受施加者存活影响。

### E6. 击退穿过墙壁

**规则**：击退后检查目标位置 `isWalkableRadius()`。不可行走时沿击退方向二分查找最近可行走点（最多 4 次二分，步长减半）。

### E7. Tick 中的状态移除

**规则**：tick 遍历时收集待移除列表，遍历结束后统一移除。禁止在遍历中直接删除。

### E8. 速度乘积极端值

**规则**：多个 slow 叠加时速度不会低于 baseSpeed * 0.1。例如 3 个 slow(0.5)：0.5 * 0.5 * 0.5 = 0.125 → clamped to 0.1。

### E9. 网络延迟下的状态同步

**规则**：服务端为状态效果绝对权威。客户端收到 `game:state` 时完全替换本地状态。客户端预测仅用于本地玩家移动（不含状态效果）。

### E10. floor 过渡时的状态清理

**规则**：`startFloor()` 时对所有存活玩家和敌人调用 `statusManager.clearAll()`。Boss 状态（bossPhase, bossCasting 等）由 EnemyState 单独管理，不走 StatusManager。

### E11. 叠加层数上限溢出

**规则**：`stack` 策略无上限（DOT 可无限叠加），但受硬上限 MAX_ACTIVE_EFFECTS=8 限制。`max_stacks` 策略严格受 maxStacks 约束。

### E12. 退避策略 (Degenerate Strategy Mitigation)

**问题**：玩家在 Boss 战中反复施加 stun 造成 Boss 完全无法行动（stun-lock）。

**缓解**：
1. Boss 的 stun/freeze 持续时间 ×0.5（通过 Boss 的 resilience 属性）
2. Boss 每次被 CC 后获得 2 秒 CC 免疫（通过施加 `cc_immune` 状态）
3. `cc_immune` 不走 StatusManager，由 EnemyState 的 `ccImmuneUntil` 时间戳管理（不会被清除或覆盖）

## F. Dependencies

### F1. 上游依赖（本系统需要）

| 系统 | 提供什么 | 接口 |
|------|---------|------|
| shared/types.ts | PlayerState, EnemyState | 已有，需新增 statusEffects 字段 |
| shared/constants.ts | CLASS_SPEED, ENEMY_SPEED | 已有，只读 |
| server/config/constants.ts | GAME_CONFIG, SKILL_TEMPLATES | 已有，只读 |
| GameRoom | tick 驱动、isWalkable | 已有，需集成 StatusManager |
| Combat | damagePlayer/damageEnemy | 已有，需改用 flags 查询 |
| EnemyAI | AI 行为 | 已有，需加 flags 检查 |

### F2. 下游依赖（本系统服务）

| 系统 | 消费什么 | 接口 |
|------|---------|------|
| 技能系统（v2） | 施加/移除状态 | statusManager.apply() |
| Boss 机制 | 震地击退、未来冰冻 | statusManager.apply() |
| 道具系统 | shield buff、未来诅咒 | statusManager.apply() |
| 敌人攻击 | 中毒、减速 | statusManager.apply() |
| 地形陷阱 | 减速区域、伤害区域 | statusManager.apply() |
| 客户端渲染 | 状态视觉效果映射 | serialize() 返回值 |

### F3. 依赖图

```
shared/types.ts ← StatusManager ← GameRoom.update()
                      ↑
                      ├── Combat（伤害计算时查询 flags）
                      ├── EnemyAI（移动/攻击前检查 blocks）
                      ├── 技能系统（apply 状态）
                      ├── 道具系统（apply 状态）
                      └── 客户端渲染（serialize 输出）
```

## G. Tuning Knobs

### G1. Feel Knobs（手感调参）

| 参数 | 默认值 | 范围 | 类别 | 说明 |
|------|--------|------|------|------|
| stun.duration.ms | 1500 | 500-3000 | feel | 眩晕持续时间 |
| freeze.duration.ms | 2000 | 500-3000 | feel | 冰冻持续时间 |
| knockback.distance.px | 80 | 40-150 | feel | 击退距离 |
| invincible.frame.s | 0.5 | 0.2-1.0 | feel | 受击无敌帧（现有值） |
| invincible.dash.s | 0.3 | 0.1-0.5 | feel | 冲刺无敌帧（现有值） |

### G2. Curve Knobs（曲线调参）

| 参数 | 默认值 | 范围 | 类别 | 说明 |
|------|--------|------|------|------|
| slow.multiplier | 0.5 | 0.2-0.8 | curve | 减速倍率 |
| speed_boost.multiplier | 1.5 | 1.2-2.0 | curve | 加速倍率 |
| shield.reduction | 0.5 | 0.3-0.8 | curve | 减伤比例 |
| vulnerable.multiplier | 1.5 | 1.2-2.0 | curve | 易伤倍率 |
| burn.tick.damage | 5 | 2-15 | curve | 灼烧每次 tick 伤害 |
| poison.tick.damage | 3 | 1-10 | curve | 中毒每次 tick 伤害 |
| heal_over_time.tick.heal | 8 | 3-15 | curve | HoT 每次 tick 回复 |

### G3. Gate Knobs（节奏调参）

| 参数 | 默认值 | 范围 | 类别 | 说明 |
|------|--------|------|------|------|
| max_active_effects | 8 | 4-12 | gate | 单实体最大状态数 |
| cc_immune.after_cc.ms | 2000 | 1000-5000 | gate | Boss CC 后免疫时间 |
| dot.tick.interval.ms | 500 | 250-1000 | gate | DOT tick 频率 |
| speed.floor.multiplier | 0.1 | 0.05-0.2 | gate | 速度下限倍率 |
| speed.ceil.multiplier | 3.0 | 2.0-5.0 | gate | 速度上限倍率 |
| boss.cc.duration.multiplier | 0.5 | 0.3-0.7 | gate | Boss CC 持续时间缩放 |

所有调参存放在 `server/config/status-effect-config.ts`，不在 StatusManager 中硬编码。

## H. Acceptance Criteria

### H1. 功能验收

1. `StatusManager` 可 apply/remove/tick/query 状态，所有操作有正确的边界保护
2. 现有 `invincible`/`speedBuff`/`speedBuffTimer` 逻辑迁移到 StatusManager 后，玩家受击无敌帧、冲刺无敌、加速技能行为与迁移前完全一致
3. 叠加规则正确：同 typeId 按 stackPolicy 处理，互斥组按 priority 解决
4. 聚合 flags 正确合并多个状态（blocks 用 OR，multiplier 用乘积，有上下限保护）
5. DOT/HOT 状态按 tickIntervalMs 周期执行，stacks 乘以 value 计算每次 tick 效果
6. 击退不穿过墙壁（二分法找可行走点）
7. Boss CC 免疫机制生效（被 CC 后 2 秒内免疫后续 CC）

### H2. 性能验收

1. 4 玩家 + 50 敌人各带 3 状态（共 162 个状态实例），每帧 tick 总耗时 < 1ms
2. `getAggregatedFlags()` 单次调用 < 0.01ms（遍历最多 8 个状态）
3. `serialize()` 输出单实体状态数组平均 < 200 bytes（4 状态 * ~50 bytes）
4. GameState 总序列化增量 < 2KB（对比迁移前基线）

### H3. 集成验收

1. EnemyAI 正确查询 blocksMovement，被定身/冰冻的敌人不移动不攻击
2. Combat.damagePlayer/damageEnemy 正确查询 damageMultiplier 和 invulnerable
3. 道具 shield 的 setTimeout 被替换为 StatusManager 的 duration 管理
4. `npx tsc --noEmit` 零 error
5. 现有 vitest 测试全部通过

### H4. 扩展性验收

1. 添加新状态类型只需在 EFFECT_DEFINITIONS 中新增一条定义，不改 StatusManager 代码
2. 新状态类型的 flags 自动参与聚合计算，无需额外代码

---

## I. 已知状态清单

### I1. CC（人群控制）

| typeId | name | duration | flags | stackPolicy | exclusiveGroup | priority | tick |
|--------|------|----------|-------|-------------|----------------|----------|------|
| stun | 眩晕 | 1500ms | blocksMovement=true, blocksAttack=true, blocksSkill=true | refresh | hard_cc | 3 | 无 |
| freeze | 冰冻 | 2000ms | blocksMovement=true, blocksAttack=true, speedMultiplier=0.0 | refresh | hard_cc | 3 | 无 |
| slow | 减速 | 3000ms | speedMultiplier=0.5 | max_duration | — | 1 | 无 |
| root | 定身 | 2000ms | blocksMovement=true | refresh | hard_cc | 2 | 无 |
| knockback | 击退 | 瞬时(0ms) | knockbackImmune=true(self) | refresh | — | 0 | 无 |
| taunt | 嘲讽 | 3000ms | forcedTarget=true | refresh | — | 1 | 无 |

### I2. Buff（增益）

| typeId | name | duration | flags | stackPolicy | exclusiveGroup | priority | tick |
|--------|------|----------|-------|-------------|----------------|----------|------|
| iframes | 无敌帧 | 300-500ms | invulnerable=true | refresh | invincibility | 5 | 无 |
| speed_boost | 加速 | 5000ms | speedMultiplier=1.5 | refresh | — | 2 | 无 |
| shield | 护盾 | 10000ms | damageMultiplier=0.5 | max_duration | damage_reduction | 2 | 无 |
| invulnerable | 绝对无敌 | 3000ms | invulnerable=true, knockbackImmune=true | refresh | invincibility | 6 | 无 |
| heal_over_time | 持续回复 | 5000ms | — | max_stacks(max=3) | — | 0 | heal/500ms, value=8 |
| energy_regen_boost | 能量回复 | 5000ms | energyRegenMultiplier=2.0 | refresh | — | 0 | 无 |

### I3. Debuff（减益）

| typeId | name | duration | flags | stackPolicy | exclusiveGroup | priority | tick |
|--------|------|----------|-------|-------------|----------------|----------|------|
| burn | 灼烧 | 3000ms | — | stack | — | 0 | damage/500ms, value=5 |
| poison | 中毒 | 5000ms | — | stack | — | 0 | damage/1000ms, value=3 |
| bleed | 流血 | 4000ms | — | stack | — | 0 | damage/500ms, value=4 |
| vulnerable | 易伤 | 3000ms | damageMultiplier=1.5 | max_stacks(max=3) | — | 1 | 无 |
| weaken | 虚弱 | 3000ms | outgoingDamageMultiplier=0.6 | max_stacks(max=3) | — | 1 | 无 |
| silence | 沉默 | 2000ms | blocksSkill=true | refresh | — | 2 | 无 |

### I4. Special（特殊）

| typeId | name | duration | flags | stackPolicy | exclusiveGroup | priority | tick |
|--------|------|----------|-------|-------------|----------------|----------|------|
| cooldown_reduction | 冷却缩减 | 5000ms | cooldownMultiplier=0.5 | refresh | — | 0 | 无 |
| cc_immune | CC 免疫 | 2000ms | ccImmune=true, knockbackImmune=true | refresh | — | 0 | 无 |
| thorns | 反伤 | 5000ms | — | refresh | — | 0 | 无 |

**注意**：`cc_immune` 通过 `ccImmune` flag 声明式生效。StatusManager.apply() 在步骤 2（互斥检查之前）先检查目标是否有 `ccImmune=true` 且新状态 `category='cc'`，若是则拒绝施加。

### I5. 状态与施加来源映射

| 来源系统 | 施加的状态 | 说明 |
|---------|-----------|------|
| 战士技能: taunt | taunt | 强制敌人攻击战士 |
| 战士技能: shield_bash | stun(1000ms) + knockback(60px) | 眩晕 + 击退 |
| 法师技能: frost_nova | freeze(1500ms) + slow(2000ms) | 冰冻后减速 |
| 法师技能: meteor | burn(3000ms, value=8) | 灼烧 DOT |
| Boss 震地 AoE | knockback(80px) | 击退玩家 |
| 道具: shield_potion | shield(10000ms, 0.5x) | 减伤 |
| 道具: speed_potion | speed_boost(5000ms, 1.5x) | 加速 |
| 道具: health_potion | heal_over_time(3000ms, value=10) | 持续回复 |
| 中毒敌人攻击 | poison(3000ms, value=3) | 中毒 DOT |
| 减速陷阱 | slow(2000ms, 0.3x) | 强减速 |

---

## J. 迁移方案：invincible/speedBuff → StatusManager

### J1. Phase 1：StatusManager 独立实现

1. 新建 `server/game/status/StatusManager.ts`
2. 新建 `server/game/status/EffectDefinitions.ts`（所有 EFFECT_DEFINITIONS）
3. 新建 `server/config/status-effect-config.ts`（所有 tuning knobs）
4. 编写 `server/__tests__/status-manager.test.ts`（>=10 个测试用例）

**不改现有代码**，StatusManager 独立存在并通过测试。

### J2. Phase 2：整合 PlayerState

1. 在 `shared/types.ts` 的 PlayerState 新增 `statusEffects: SerializedStatusEffect[]` 字段
2. 在 `shared/types.ts` 的 EnemyState 新增 `statusEffects: SerializedStatusEffect[]` 字段
3. GameRoom 中每个 player/enemy 创建 `StatusManager` 实例
4. `GameRoom.update()` 中调用 `statusManager.tick(dt * 1000, context)`
5. `getState()` 中调用 `statusManager.serialize()` 填充 statusEffects 字段
6. **暂时保留** `invincible`/`speedBuff`/`speedBuffTimer` 字段（过渡期双写）

### J3. Phase 3：迁移现有逻辑

逐个替换硬编码为 StatusManager 调用：

| 原代码 | 替换为 |
|--------|--------|
| `player.invincible = 0.5` | `player.statusManager.apply('iframes', sourceId, 0, 500)` |
| `player.invincible -= dt` | 由 StatusManager.tick() 自动处理 |
| `if (player.invincible > 0)` | `flags.invulnerable` |
| `player.speedBuff = 1.5` | `player.statusManager.apply('speed_boost', sourceId, 1.5, 5000)` |
| `player.speedBuffTimer -= dt` | 由 StatusManager.tick() 自动处理 |
| `player.speedBuff \|\| 1.0` | `flags.speedMultiplier` |
| shield 道具 `setTimeout` | `player.statusManager.apply('shield', sourceId, 0.5, 10000)` |
| shield 道具 `player.defense += 10` | 废弃 defense 临时修改，改为 shield 状态的 damageMultiplier=0.5 |

### J4. Phase 4：清理

1. 从 PlayerState 移除 `invincible`、`speedBuff`、`speedBuffTimer` 字段
2. 移除所有直接读写这些字段的代码
3. 更新客户端渲染代码使用 `statusEffects` 数组
4. tsc + vitest + E2E 验证

### J5. 迁移期间兼容性

- Phase 2-3 期间，`invincible` 字段由 StatusManager 双写同步（apply iframes/invulnerable 状态时同时设置 player.invincible）
- 这确保未迁移的代码（如 EnemyAI 直读 player.invincible）在过渡期仍能工作
- Phase 4 清理时一次性移除所有旧字段
- **双写调用点完整映射**：
  | 调用点 | StatusManager apply | 旧字段双写 |
  |--------|-------------------|-----------|
  | 受击后无敌帧 | apply('iframes', source, 0, 500) | player.invincible = 0.5 |
  | dash 冲刺无敌 | apply('iframes', source, 0, 300) | player.invincible = 0.3 |
  | shield 技能 | apply('invulnerable', source, 0, 3000) | player.invincible = 3.0 |
  | speed_boost 技能 | apply('speed_boost', source, 1.5, 5000) + apply('iframes', source, 0, 300) | player.speedBuff=1.5 + player.invincible=0.3 |
  | shield 道具 | apply('shield', source, 0.5, 10000) | 废弃 player.defense += 10 |
  | debug setInvincible | apply('invulnerable', 'debug', 0, 999000) | player.invincible = 999 |
- **遗漏任何调用点都会导致状态不一致**，迁移完成后需 grep 确认所有 `player.invincible` 写入点已替换

---

## K. 客户端渲染接口

### K1. 状态视觉效果映射

| typeId | 视觉效果 | 位置 |
|--------|---------|------|
| stun | 头顶旋转星星（3个黄色小圆，公转） | 实体上方 20px |
| freeze | 角色着色变蓝（globalAlpha overlay） + 冰晶粒子 | 实体范围 |
| slow | 脚下泥潭效果（棕色椭圆，半透明） | 实体脚下 |
| root | 脚下藤蔓/锁链效果 | 实体脚下 |
| knockback | 被击方向的速度线（白色短线） | 实体后方 |
| taunt | 头顶红色感叹号 | 实体上方 20px |
| invincible | 角色闪烁（alpha 在 0.5-1.0 间振荡） | 实体本身 |
| invulnerable | 金色光环（圆形描边，2px） | 实体范围 |
| speed_boost | 残影效果（3 帧半透明副本，递减 alpha） | 实体后方 |
| shield | 蓝色半透明护盾球（圆形描边+fill） | 实体范围 |
| burn | 橙色火焰粒子（向上飘散） | 实体周围 |
| poison | 绿色气泡粒子（向上飘散） | 实体周围 |
| bleed | 红色滴落粒子 | 实体周围 |
| vulnerable | 红色轮廓描边（2px） | 实体边缘 |
| weaken | 灰色半透明遮罩 | 实体本身 |
| heal_over_time | 绿色十字符号旋转 | 实体上方 20px |
| silence | 头顶禁言符号（红叉） | 实体上方 20px |

### K2. 同步协议

**方案：随 GameState 同步（不单独推送事件）**

- 状态效果数据已包含在 `PlayerState.statusEffects[]` 和 `EnemyState.statusEffects[]` 中
- 客户端每 100ms（10Hz）收到完整 GameState，其中包含所有活跃状态
- 客户端根据 `typeId` 和 `remainingMs` 渲染视觉效果
- **不使用**单独的状态变化事件，原因：
  1. 避免与 GameState 不同步
  2. 10Hz 同步率足够让状态变化可感知（100ms 延迟可接受）
  3. 减少网络消息数量

**状态变化音效**：客户端本地检测 `statusEffects` 数组长度变化（对比前一帧），新增状态时播放对应音效。

### K3. 客户端渲染集成点

```typescript
// src/rendering/ 中新增 statusEffectRenderer.ts
// 在渲染管线的第 7 层（子弹/特效）和第 8 层（玩家）之间插入
// 对每个有活跃状态的实体，渲染状态视觉效果

function renderStatusEffects(
  ctx: CanvasRenderingContext2D,
  entity: { x: number; y: number; statusEffects: SerializedStatusEffect[] },
  elapsedMs: number
): void;
```

---

## L. 网络同步详情

### L1. 序列化格式

```typescript
// 单个状态的序列化数据（约 30-50 bytes JSON）
{
  "t": "burn",           // typeId 缩写为 t
  "r": 2500,             // remainingMs 缩写为 r
  "s": 2,                // stacks 缩写为 s
  "v": 5                 // value 缩写为 v
}
```

- `sourceId` 不序列化（客户端不需要知道施加者）
- 字段名缩写以减少带宽
- 4 玩家 + 50 敌人各 3 状态 ≈ 162 条 ≈ 6.5KB（JSON，未压缩）

### L2. 同步策略

- **全量同步**：每次 `game:state` 推送包含所有实体的完整 statusEffects 数组
- **不使用增量同步**：实现复杂度高，当前规模（<200 状态）全量同步性能足够
- **优化空间**：若未来状态数爆炸，可切换为增量同步（仅推送变化），但需额外 `seq` 序列号

### L3. 客户端插值

- 状态效果不插值（`remainingMs` 由服务端驱动，客户端只读）
- 视觉效果用本地 `elapsedMs` 驱动动画（粒子、闪烁等），不依赖网络同步

---

## M. 可扩展性设计

### M1. 添加新状态类型的步骤

1. 在 `EffectDefinitions.ts` 中新增一条定义
2. 在 `status-effect-config.ts` 中新增 tuning knobs
3. 在客户端 `statusEffectRenderer.ts` 中新增视觉效果映射
4. 在施加来源（技能/道具/敌人）中调用 `statusManager.apply('newTypeId', ...)`

**不需要修改**：StatusManager、StatusEffectInstance、聚合逻辑、网络序列化。

### M2. 数据驱动 vs 硬编码

- **数据驱动**：EffectDefinitions 中的所有参数（duration、multiplier、tickInterval、flags）均为配置数据，存放在独立文件中
- **硬编码**（仅在 StatusManager 内部）：叠加策略逻辑、互斥组解决、flags 聚合规则、序列化格式
- 硬编码部分是稳定的框架逻辑，不需要随新状态类型变化

### M3. 未来扩展路径

| 扩展方向 | 需要改什么 | 不需要改什么 |
|---------|-----------|-------------|
| 新增状态类型 | EffectDefinitions + config + renderer | StatusManager 核心 |
| 新增互斥组 | EffectDefinitions 的 exclusiveGroup | 互斥解决逻辑 |
| 新增 flag 类型 | EffectFlags 接口 + 聚合函数 | StatusManager 接口 |
| 新增 tickAction | TickContext + tick 分支 | StatusManager 核心 |
| 新增 stackPolicy | apply() 中新增分支 | 其他 stackPolicy 逻辑 |
