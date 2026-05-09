# Quick Design Spec: 角色数据单一数据源 + 文档同步

**Type**: Tweak
**System**: 角色系统 / 战斗系统
**GDD Reference**: `docs/gdd/combat.md`
**Date**: 2026-05-06

## Change Summary

消除角色属性数据（hp/attack/defense）的三处重复定义，统一引用 `shared/constants.ts` CLASS_STATS/CLASS_SKILLS 作为唯一数据源。同步更新 `combat.md` 中过时的技能槽描述和伤害公式。

## Motivation

角色属性散落在 3+ 个文件中硬编码，改一处忘另一处导致数值不同步（已在实战中发生）。文档描述（4 技能槽、纯平减伤害）与代码实际行为不一致，误导开发者判断。

## Design Delta

Current GDD says (`docs/gdd/combat.md`, Detailed Rules — 技能系统):

> 4 技能槽: dash/shield/heal/speed_boost
> 按职业不同排列

This spec changes that to:

> 每职业 **3 个技能槽**（按键 1/2/3）：槽 1 = Dash（共享），槽 2-3 = 职业独特技能。详见 `skills.md` 完整设计。

Current GDD says (`docs/gdd/combat.md`, Formulas — 伤害计算):

> ```
> player→enemy:  damage = weapon.damage
>                enemy.hp -= damage
> enemy→player:  damage = enemy.attack
>                player.hp -= damage
> ```
> ATK/DEF 属性存在于 PlayerState 和 characters.ts 配置中，但当前未被伤害公式引用

This spec changes that to:

> ```
> player→enemy（普攻）:
>   damage = weapon.damage × outgoingDamageMultiplier
>   finalDamage = max(1, damage - enemy.defense × 0.5)
>
> player→enemy（技能）:
>   damage = player.attack × skill.damageMult × outgoingDamageMultiplier
>
> enemy→player:
>   rawDamage = enemy.attack
>   damageMultiplier = player.statusManager.getAggregatedFlags().damageMultiplier
>   finalDamage = max(1, rawDamage × damageMultiplier - (player.defense + defenseBonus) × 0.5)
> ```
>
> 所有 enemy→player 伤害统一走 `GameRoom.damagePlayer()`，确保 invulnerable/shield/能量回复闭环。

## New Rules / Values

**数据源规则**：
- `shared/constants.ts` CLASS_STATS 是角色基础属性的唯一权威来源
- `shared/constants.ts` CLASS_SKILLS 是职业技能列表的唯一权威来源
- 客户端 `src/config/characters.ts` 通过 import 引用，不再硬编码数值
- 服务端 `server/game/GameRoom.ts` 通过 import 引用，不再内联映射
- 测试文件通过 import 引用，不再重复定义

**文档更新**：
- `combat.md` 新增"角色数据架构"节：描述 CLASS_STATS → CLASS_CONFIG → DB → handleRoomStart → addPlayer 链路
- `combat.md` 技能系统节更新为 3 技能槽/职业
- `combat.md` 伤害公式更新为含 outgoingDamageMultiplier / damageMultiplier / defenseBonus 的完整公式

## Affected Systems

| System | Impact | Action Required |
|--------|--------|-----------------|
| `src/config/characters.ts` | hp/attack/defense 改为 import CLASS_STATS | 已完成 |
| `server/game/GameRoom.ts` | 内联 classConfig 改为 import CLASS_SKILLS | 已完成 |
| `server/__tests__/skill-integration.test.ts` | 内联 CLASS_SKILLS 改为 import | 已完成 |
| `docs/gdd/combat.md` | 新增数据架构、更新技能槽、更新伤害公式 | 已完成 |

## Acceptance Criteria

- [x] `npx tsc --noEmit` 零 error
- [x] `characters.ts` 中无硬编码 hp/attack/defense 数值
- [x] `GameRoom.ts` 中无内联 class→skills 映射
- [x] `test` 文件中无重复 CLASS_SKILLS 定义
- [x] `combat.md` 技能槽描述为"每职业 3 个技能槽"
- [x] `combat.md` 伤害公式包含 outgoingDamageMultiplier / damageMultiplier / defenseBonus
- [x] `combat.md` 新增角色数据架构节（含数据流图 + 常量索引表）
- [ ] No regression: 角色属性值不变（warrior=15/10/100, ranger=12/5/80, mage=20/3/60, cleric=8/6/70）

## GDD Update Required?

Yes — `docs/gdd/combat.md` 已直接更新（3 处修改，见上文 Affected Systems）。

---

**Note**: 代码和文档修改已在 quick-design 流程之前完成。本 spec 用于记录变更理由和验收标准。
