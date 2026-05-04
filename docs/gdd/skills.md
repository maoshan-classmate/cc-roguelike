# 技能系统 GDD

> **Status**: In Design
> **Author**: 用户 + agents
> **Last Updated**: 2026-05-04
> **Depends On**: status-effects.md (状态效果系统)

## Overview

技能系统为 4 个职业提供**差异化的主动技能**，每职业 3 个技能槽（1 个共享位移 + 2 个职业独特技能），由能量和冷却双资源驱动。技能通过状态效果系统（`docs/gdd/status-effects.md`）施加 Buff/Debuff/CC，替代当前所有职业共享同一组 4 技能（dash/shield/heal/speed_boost）的扁平设计。设计目标：每个职业有独特的战斗身份和战术选择。

## Player Fantasy

战士应该感到自己是**不可撼动的前线**：嘲讽拉住所有敌人、盾击打断攻势、减伤硬扛伤害。队友依赖战士创造的安全空间。

游侠应该感到自己是**游击杀手**：翻滚闪避+陷阱控制+箭雨爆发，打了就跑，用走位创造输出窗口。

法师应该感到自己是**玻璃大炮**：冰冻控场保命、陨石毁灭性爆发，但容错极低。法师的满足感来自于精确的时机判断。

牧师应该感到自己是**团队的生命线**：圣光救急、圣域保护全队，队友的存活依赖牧师的判断。

## Detailed Design

### Core Rules

#### 技能架构

- 每职业 **3 个技能槽**，按键 1/2/3 触发
- **槽 1**：Dash（所有职业共享） — 朝向瞬移 200px + 0.3s 无敌帧
- **槽 2-3**：职业独特技能（每职业不同）

#### 技能列表

**Warrior（坦克/前排）**

| # | 技能名 | 类型 | 效果 | 冷却 | 能量 | 持续 |
|---|--------|------|------|------|------|------|
| 1 | Dash | 位移 | 朝向瞬移 200px + iframes(300ms) | 2s | 20 | — |
| 2 | War Cry (战吼) | 嘲讽/减伤 | 200px 半径内敌人施加 taunt(3s) + 自身施加 damage_reduction(0.6, 3s) | 8s | 30 | 3s |
| 3 | Shield Bash (盾击) | 控制 | 前方 80px 扇形内敌人施加 knockback(60px) + stun(1s) | 5s | 25 | 1s(眩晕) |

**Ranger（远程输出/机动）**

| # | 技能名 | 类型 | 效果 | 冷却 | 能量 | 持续 |
|---|--------|------|------|------|------|------|
| 1 | Dash | 位移 | 朝向瞬移 200px + iframes(300ms) | 2s | 20 | — |
| 2 | Dodge Roll (翻滚) | 闪避/陷阱 | 朝移动方向翻滚 150px + iframes(400ms)，落点放置减速陷阱（半径 40px，slow(0.5, 3s)） | 6s | 25 | 3s(陷阱) |
| 3 | Arrow Rain (箭雨) | AOE爆发 | 标记前方 160px 区域，0.5s 延迟后落下 3 波箭矢，每波 ATK×0.5 伤害 | 10s | 35 | — |

**Mage（爆发法师/控场）**

| # | 技能名 | 类型 | 效果 | 冷却 | 能量 | 持续 |
|---|--------|------|------|------|------|------|
| 1 | Dash | 位移 | 朝向瞬移 200px + iframes(300ms) | 2s | 20 | — |
| 2 | Frost Nova (冰霜新星) | 控场 | 以自身 120px 半径内敌人施加 freeze(0.5s) + slow(0.5, 3s) | 7s | 30 | 3s(减速) |
| 3 | Meteor (陨石) | 爆发AOE | 标记鼠标方向 300px 内位置，1s 延迟落下陨石，150px AOE 造成 ATK×2.5 + burn(5HP/s, 3s) | 12s | 40 | 3s(DOT) |

**Cleric（治疗辅助）**

| # | 技能名 | 类型 | 效果 | 冷却 | 能量 | 持续 |
|---|--------|------|------|------|------|------|
| 1 | Dash | 位移 | 朝向瞬移 200px + iframes(300ms) | 2s | 20 | — |
| 2 | Holy Light (圣光) | 治疗单体 | 回复自身或最近队友（150px 内）50 HP | 6s | 25 | — |
| 3 | Sanctuary (圣域) | 团队增益 | 以自身为中心创造安全区域（150px 半径），范围内队友 damage_reduction(0.3) + heal_over_time(5HP/s)，持续 5s | 12s | 40 | 5s |

#### 技能执行流程

```
useSkill(player, skillIndex):
  1. 检查 player.skills[skillIndex] 是否存在
  2. 检查能量：player.energy >= skill.energyCost
  3. 检查冷却：Date.now() - lastUseTime >= skill.cooldown
  4. 检查状态：player.statusManager.getAggregatedFlags().blocksSkill === false
  5. 扣除能量：player.energy -= skill.energyCost
  6. 记录冷却时间
  7. 按 skill.type 路由到对应 handler
  8. 服务端推送技能使用事件（成功/失败）给客户端
```

#### 技能 Handler 路由

| skill.type | Handler | 说明 |
|-----------|---------|------|
| dash | `handleDash()` | 复用现有瞬移逻辑，施加 iframes |
| taunt | `handleWarCry()` | 搜索半径内敌人，施加 taunt 状态，自身施加 damage_reduction |
| knockback | `handleShieldBash()` | 搜索前方扇形内敌人，施加 knockback（瞬时）+ stun |
| dodge_roll | `handleDodgeRoll()` | 翻滚位移 + iframes + 放置陷阱实体 |
| aoe_delayed | `handleArrowRain()` | 创建延时区域实体，多波伤害 |
| cc_aoe | `handleFrostNova()` | 搜索半径内敌人，施加 freeze + slow |
| meteor | `handleMeteor()` | 创建延时区域实体，单次伤害 + burn DOT |
| heal_single | `handleHolyLight()` | 搜索范围内最近队友/自身，回复 HP |
| zone_buff | `handleSanctuary()` | 创建区域实体，范围内队友获得 buff |

### States and Transitions

技能无内部状态机（全部即时释放）。技能的外部状态由冷却和能量决定：

```
Ready → (按键触发) → 检查能量/冷却 → [通过] → 执行技能 → Cooldown → Ready
                                  → [失败] → Ready（播放冷却音效/视觉反馈）
```

### Interactions with Other Systems

| 系统 | 接口 | 数据流 |
|------|------|--------|
| 状态效果系统 | `statusManager.apply()` | 技能 → 施加状态（stun/slow/taunt/burn/damage_reduction 等） |
| Combat | `damageEnemy()` / `spawnBullet()` | Arrow Rain / Meteor 造成伤害 |
| EnemyAI | `getAggregatedFlags().forcedTarget` | Taunt 改变敌人目标选择 |
| GameRoom | `isWalkable()` / `addBullet()` | Dash 碰撞检测 / Arrow Rain 弹丸 |
| 能量系统 | `player.energy` / `energyMax` | 技能消耗能量，受击/击杀回复能量 |
| 客户端输入 | `useGameInput.ts` 按键 1/2/3 | 客户端发送 `game:input { skill: index }` |
| 客户端渲染 | 新增渲染函数 | Frost Nova / Meteor / Sanctuary / Arrow Rain / Trap 视觉效果 |

## Formulas

### 能量经济

```
energyCap = 50                    // 所有职业统一
energyRegen = 5 * dt              // 基础回复 5/秒
energyOnHit = +3                  // 受击回复（鼓励战士承伤）
energyOnKill = +8                 // 击杀回复（鼓励进攻）

10秒循环：自然回复 50 → 可用 2 个技能
  - 轻量循环: Dash(20) + 轻技能(25) = 45 ✓
  - 重量循环: 轻技能(25) + 重技能(40) = 65 ✗ → 需等待 3s
  - 极限循环: 受击3次(+9) + 击杀1次(+8) + 自然(50) = 67 → 可连续放重技能
```

### 冷却公式

```
实际冷却 = skill.cooldown * player.statusManager.getAggregatedFlags().cooldownMultiplier
```

- cooldownMultiplier 默认 1.0，受 cooldown_reduction 状态影响
- 冷却期间再次触发 → 拒绝 + 播放 `skill_cooldown.wav`

### 伤害公式（技能类）

```
// Arrow Rain 每波
arrowRainDamage = player.atk * 0.5

// Meteor 爆发
meteorDamage = player.atk * 2.5

// Shield Bash
shieldBashDamage = 0  // 纯控制，无伤害
```

### 治疗公式

```
// Holy Light
healAmount = 50  // 固定值
target = self OR nearestAlly(within 150px)

// Sanctuary 持续回复
healPerSecond = 5  // 5 HP/s，持续 5s = 25 HP 总量
```

## Edge Cases

- **能量不足时触发技能**: 拒绝执行，客户端播放 `skill_cooldown.wav`，技能栏显示红色闪烁
- **冷却中再次触发**: 同上
- **被 stun/silence 时使用技能**: 由 StatusManager 的 `blocksSkill` flag 拦截
- **Dash 目标位置不可行走**: 尝试半距离 (100px)，若仍不可走则原地 iframes
- **War Cry 半径内无敌人**: 仍获得 damage_reduction，不浪费（保底价值）
- **Shield Bash 前方无敌人**: 消耗能量和冷却，无效果（惩罚空放）
- **Arrow Rain 区域内有敌人 + 队友**: 友军不受伤（仅 enemy 受伤）
- **Meteor 目标位置超出 300px**: clamp 到 300px 距离
- **Sanctuary 区域内无队友**: 仍获得自身 damage_reduction（保底价值）
- **Dodge Roll 方向无移动输入**: 朝角色朝向翻滚
- **断线重连后技能状态**: 冷却时间基于 Date.now() 差值计算，重连后自动恢复
- **Dash + speed_boost 同时生效**: iframes 和 speed_boost 是独立状态，可共存

## Dependencies

### 上游依赖

| 系统 | 提供什么 | 说明 |
|------|---------|------|
| 状态效果系统 | `statusManager.apply()` | 技能通过此接口施加所有状态效果 |
| Combat | `damageEnemy()` / `spawnBullet()` | 伤害计算和弹丸生成 |
| GameRoom | `isWalkable()` / `addBullet()` | 碰撞检测和弹丸管理 |
| shared/types.ts | PlayerState / EnemyState | 技能数组、能量、冷却时间 |
| shared/constants.ts | CLASS_SPEED | 移动速度基础值 |

### 下游依赖

| 系统 | 消费什么 | 说明 |
|------|---------|------|
| 客户端输入 | 按键 1/2/3 → skill index | 输入映射 |
| 客户端渲染 | 技能视觉效果 | Frost Nova / Meteor / Sanctuary / Arrow Rain / Trap |
| 客户端 UI | 技能栏 3 槽位 + 冷却遮罩 | 技能图标、冷却动画 |

## Tuning Knobs

| 参数 | 默认值 | 范围 | 说明 |
|------|--------|------|------|
| energyCap | 50 | 30-100 | 能量上限 |
| energyRegenPerSec | 5 | 2-10 | 基础能量回复/秒 |
| energyOnHit | 3 | 0-10 | 受击能量回复 |
| energyOnKill | 8 | 0-20 | 击杀能量回复 |
| dash.distance | 200px | 100-300 | Dash 位移距离 |
| dash.cooldown | 2s | 1-4 | Dash 冷却 |
| dash.iframes | 300ms | 100-500 | Dash 无敌帧 |
| warCry.radius | 200px | 100-300 | 战吼嘲讽范围 |
| warCry.cooldown | 8s | 4-15 | 战吼冷却 |
| warCry.damageReduction | 0.4 | 0.2-0.7 | 战吼减伤比例 |
| warCry.duration | 3s | 1-5 | 战吼持续时间 |
| shieldBash.range | 80px | 40-120 | 盾击范围 |
| shieldBash.knockback | 60px | 30-100 | 盾击击退距离 |
| shieldBash.stunDuration | 1s | 0.5-2 | 盾击眩晕时间 |
| shieldBash.cooldown | 5s | 3-8 | 盾击冷却 |
| dodgeRoll.distance | 150px | 80-250 | 翻滚距离 |
| dodgeRoll.trapRadius | 40px | 20-80 | 陷阱半径 |
| dodgeRoll.trapSlow | 0.5 | 0.3-0.7 | 陷阱减速倍率 |
| dodgeRoll.trapDuration | 3s | 1-5 | 陷阱持续时间 |
| arrowRain.radius | 160px | 80-250 | 箭雨范围 |
| arrowRain.waves | 3 | 1-5 | 箭雨波数 |
| arrowRain.damageMult | 0.5 | 0.3-1.0 | 箭雨每波伤害倍率 |
| arrowRain.delay | 500ms | 200-1000 | 箭雨延迟 |
| frostNova.radius | 120px | 60-200 | 冰霜新星范围 |
| frostNova.freezeDuration | 500ms | 200-1000 | 冰冻时间 |
| frostNova.slowDuration | 3s | 1-5 | 减速时间 |
| frostNova.slowMult | 0.5 | 0.3-0.7 | 减速倍率 |
| meteor.radius | 150px | 80-250 | 陨石 AOE 范围 |
| meteor.damageMult | 2.5 | 1.5-4.0 | 陨石伤害倍率 |
| meteor.dotDmg | 5 | 2-15 | 灼烧 DOT/秒 |
| meteor.dotDuration | 3s | 1-5 | 灼烧持续时间 |
| meteor.delay | 1000ms | 500-2000 | 陨石落下延迟 |
| holyLight.healAmount | 50 | 20-80 | 圣光治疗量 |
| holyLight.targetRange | 150px | 50-300 | 圣光目标搜索范围 |
| sanctuary.radius | 150px | 80-250 | 圣域范围 |
| sanctuary.damageReduction | 0.3 | 0.1-0.5 | 圣域减伤比例 |
| sanctuary.healPerSec | 5 | 2-10 | 圣域持续回复/秒 |
| sanctuary.duration | 5s | 3-8 | 圣域持续时间 |

## Acceptance Criteria

### 功能验收

1. **GIVEN** warrior 处于敌人密集区域, **WHEN** 使用 War Cry, **THEN** 200px 内所有敌人获得 taunt(3s) 且 warrior 获得 damage_reduction(40%, 3s)
2. **GIVEN** ranger 被敌人追击, **WHEN** 使用 Dodge Roll, **THEN** ranger 向移动方向翻滚 150px，翻滚期间无敌，落点留下减速陷阱
3. **GIVEN** mage 被 3 个近战敌人围住, **WHEN** 使用 Frost Nova, **THEN** 120px 内所有敌人 freeze(0.5s) + slow(3s)
4. **GIVEN** cleric 的队友 HP 低于 50%, **WHEN** 使用 Holy Light, **THEN** 最近队友（150px 内）回复 50 HP
5. **GIVEN** 任何职业玩家, **WHEN** 在能量不足时按技能键, **THEN** 技能不执行，客户端播放冷却音效
6. **GIVEN** warrior 被眩晕, **WHEN** 尝试使用技能, **THEN** 技能被 blocksSkill flag 拦截

### 职业差异化验收

7. 4 个职业的技能列表完全不同（仅 Dash 共享）
8. warrior 的 War Cry 是唯一能施加 taunt 的技能
9. mage 的 Meteor 是全游戏最高单次伤害（ATK×2.5）
10. cleric 是唯一能治疗队友的职业

### 集成验收

11. 所有技能施加的状态通过 `statusManager.apply()` 接口，不直接修改 PlayerState/EnemyState
12. `npx tsc --noEmit` 零 error
13. `npm run test` — useSkill() 测试覆盖所有 9 种 skill handler
14. E2E — 4 职业各用 3 个技能验证（无报错、视觉正常）

### 性能验收

15. 技能执行逻辑 < 0.1ms（不含状态施加）
16. 服务端技能反馈推送延迟 < 50ms
