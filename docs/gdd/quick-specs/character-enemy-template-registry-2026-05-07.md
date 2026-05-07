# Quick Design Spec: 角色+敌人模板注册表

**Type**: Tweak
**System**: 角色系统 / 敌人系统 / 战斗系统 / 渲染系统
**GDD Reference**: `docs/gdd/combat.md`
**Date**: 2026-05-07
**Predecessor**: `character-data-single-source-2026-05-06.md`（已完成）

## Change Summary

将角色和敌人数据从散落 6+ 文件的硬编码映射重构为两套独立的模板注册表（`CHARACTER_DEFS` + `ENEMY_DEFS`），各自定义在独立的 shared 文件中。攻击路由从 `characterType` 硬编码特判改为 `attackType` 数据驱动查表。

## Motivation

**角色侧**：11 个维度散落在 7 个文件中。新增一个角色需改 7 处，漏改即 bug。

**敌人侧**：两套平行定义数值不一致（basic.atk: 8 vs 5, boss.hp: 800 vs 200）。客户端 `ENEMY_LIST`、`getEnemyById` 是死代码。

**攻击路由**：`Combat.ts` 通过 `weapon.type === 'gun'` + `characterType === 'cleric'` 两层特判决定攻击行为，扩展性差。

## Design Delta

### File Architecture

```
shared/
├── constants.ts              # TILE_SIZE, TRAP_TYPES, ITEM_DEFS, ARENA_*, MAZE_*
├── character-definitions.ts  # CharacterDef + CHARACTER_DEFS【新建】
├── enemy-definitions.ts      # EnemyDef + ENEMY_DEFS【新建】
└── types.ts                  # CharacterType, EnemyType, SkillId
```

### CHARACTER_DEFS — 角色模板注册表

Current GDD says (`docs/gdd/combat.md`, 角色数据架构 — 关键常量表):

> | `CLASS_STATS` | `shared/constants.ts` | 4 职业基础属性 |
> | `CLASS_SPEED` | `shared/constants.ts` | 4 职业移动速度 |
> | `CLASS_SKILLS` | `shared/constants.ts` | 4 职业技能列表 |
> | `WEAPON_SPRITE` | `src/rendering/entityRenderer.ts` | 职业→武器贴图映射 |

This spec changes that to:

> | `CHARACTER_DEFS` | `shared/character-definitions.ts` | **唯一数据源**：stats + speed + skills + weapon + attackType + weaponSprite + bulletKey + avatar + attackSfx + sprites |

```typescript
// shared/character-definitions.ts
import type { CharacterType, SkillId } from './types';

export type AttackType = 'melee' | 'ranged_bullet' | 'ranged_heal';

export interface CharacterDef {
  hp: number; hpMax: number; attack: number; defense: number;
  energy: number; energyMax: number;
  speed: number;
  skills: SkillId[];
  weapon: string;
  attackType: AttackType;
  weaponSprite: string;
  bulletKey: string;
  avatar: string;
  attackSfx: string;
  color: string; name: string; description: string;
  spriteIndex: { front: number; back: number };
  spriteName?: { front: string[]; back: string[] };
  spriteRun?: { front: string[]; back: string[] };
  spriteHit?: { front: string; back: string };
}
```

### ENEMY_DEFS — 敌人模板注册表

Current state: `shared/constants.ts` ENEMY_DEFS（服务端权威）和 `src/config/enemies.ts` ENEMIES（客户端渲染用）两套平行定义，数值不一致。

This spec merges both into `shared/enemy-definitions.ts`：

```typescript
// shared/enemy-definitions.ts
import type { EnemyType } from './types';

export interface EnemyDef {
  hp: number; attack: number; speed: number; radius: number;
  aggroRange: number; attackCooldown: number; size: number;
  damageReduction?: number; dodgeChance?: number; spriteSource?: string;
  name: string; color: string; isBoss?: boolean;
  spriteIndex: number; sheet: 'char' | 'dungeon' | 'sheet'; spriteName?: string;
  dropTable?: { itemId: string; chance: number }[];
}
```

数值以服务端权威值为准（basic.atk=8, boss.hp=800 等）。

### 攻击类型数据驱动路由

Current GDD says (`docs/gdd/combat.md`, 职业攻击路径):

> 攻击路径按 `weapon.type`（melee/gun）路由，cleric 通过 `characterType === 'cleric'` 特判走治疗波。

This spec changes that to:

> 攻击路径按 `CHARACTER_DEFS[type].attackType` 数据驱动路由，无硬编码特判：
> - `melee` → `executeMelee()` 近战范围检测（warrior）
> - `ranged_bullet` → `fireGun()` 发射弹丸（ranger/mage，弹体渲染由 bulletKey 区分）
> - `ranged_heal` → `spawnHealWave()` AoE 治疗波（cleric）

## New Rules / Values

**数据源规则**：
- `shared/character-definitions.ts` `CHARACTER_DEFS` 是角色配置的唯一权威来源
- `shared/enemy-definitions.ts` `ENEMY_DEFS` 是敌人配置的唯一权威来源
- `shared/constants.ts` 只保留通用游戏常量
- 旧名常量（CLASS_STATS / ENEMY_BASE_HP 等）迁移期间保留为 re-export，迁移完成后删除

**attackType 路由表**：

| 职业 | attackType | 行为 | 弹体渲染 |
|------|-----------|------|---------|
| warrior | `melee` | 近战弧形检测 | 无弹丸 |
| ranger | `ranged_bullet` | 发射箭矢弹丸 | `drawBulletSprite` (weapon_arrow) |
| mage | `ranged_bullet` | 发射紫色能量弹 | `drawMagicOrb` |
| cleric | `ranged_heal` | AoE 治疗波 | 无弹丸 |

**enemies.ts 去重**：`ENEMIES` 改为从 `ENEMY_DEFS` 派生，`ENEMY_LIST`、`getEnemyById` 死代码删除。

## Affected Systems

| System | Impact | Action Required |
|--------|--------|-----------------|
| `shared/character-definitions.ts` | 新建 | CharacterDef + CHARACTER_DEFS |
| `shared/enemy-definitions.ts` | 新建 | EnemyDef + ENEMY_DEFS |
| `shared/constants.ts` | 重构 | 删除旧定义，保留通用常量 + 临时 re-export |
| `server/game/combat/Combat.ts` | 重构 | 攻击路由数据驱动 + ENEMY_RADIUS 替换 |
| `src/rendering/entityRenderer.ts` | 重构 | 删除 WEAPON_SPRITE + isMelee 数据驱动 |
| `src/audio/sfx.ts` | 重构 | playAttackSfx 查表化 |
| `src/rendering/projectileRenderer.ts` | 重构 | bulletKey 数据驱动 |
| `src/components/pixel/PixelPlayerSlot.tsx` | 重构 | 删除 CLASS_AVATARS |
| `server/lobby/AuthManager.ts` | 重构 | CLASS_CONFIG → getClassConfig() |
| `src/config/characters.ts` | 重构 | CHARACTERS 从 CHARACTER_DEFS 派生 |
| `src/config/enemies.ts` | 重构 | ENEMIES 从 ENEMY_DEFS 派生 + 删死代码 |
| `server/game/enemy/EnemyAI.ts` | 重构 | ENEMY_DEFS 直接引用 |
| `server/game/GameRoom.ts` | 重构 | ENEMY_DEFS 直接引用 |
| `server/game/collision/CollisionGrid.ts` | 重构 | ENEMY_DEFS 直接引用 |
| `docs/gdd/combat.md` | 文档更新 | 常量表 + 攻击路径描述 |

## Acceptance Criteria

- [ ] `shared/character-definitions.ts` 存在，包含 CharacterDef 接口 + CHARACTER_DEFS 注册表
- [ ] `shared/enemy-definitions.ts` 存在，包含 EnemyDef 接口 + ENEMY_DEFS 注册表
- [ ] `shared/constants.ts` 中无 CHARACTER_DEFS / ENEMY_DEFS 定义（仅有通用常量）
- [ ] `Combat.ts` 中无 `characterType === 'cleric'` 硬编码特判
- [ ] `entityRenderer.ts` 中无 `WEAPON_SPRITE` 硬编码映射
- [ ] `sfx.ts` 中 `playAttackSfx()` 无 switch-case
- [ ] `characters.ts` 中无手写 hp/attack/defense 数值
- [ ] `enemies.ts` 中无手写 hp/attack 数值，且无 `ENEMY_LIST`/`getEnemyById` 死代码
- [ ] `npx tsc --noEmit` 零 error
- [ ] No regression: 角色属性值不变（warrior=15/10/100/180, ranger=12/5/80/220, mage=20/3/60/180, cleric=8/6/70/190）
- [ ] No regression: 敌人属性与服务端一致（basic.atk=8, fast.atk=10, ghost.atk=12, tank.atk=15, boss.atk=25, boss.hp=800）

## Risks

1. **characters.ts `speed` 歧义**：`CharacterConfig.speed` 是动画倍率(1/1.5)，`CHARACTER_DEFS.speed` 是移动速度(180/220)。派生时 speed 保持 1。
2. **敌人 speed 单位不同**：客户端 enemies.ts speed=1（tiles/frame），服务端 ENEMY_DEFS speed=60（px/s）。迁移后客户端派生值变为 60，但无运行时影响。
3. **Boss/Ghost 行为分支保留**：EnemyAI.ts 的 `enemy.type === 'boss'`（专用 updateBoss）和 `enemy.type === 'ghost'`（穿墙）是行为特性，不改为数据驱动。

## GDD Update Required?

Yes — `docs/gdd/combat.md` 需要更新：
1. **角色数据架构节**：常量表更新，新增 character-definitions.ts / enemy-definitions.ts
2. **职业攻击路径节**：改为 attackType 数据驱动路由描述
3. **武器伤害值表**：注明数据源为 CHARACTER_DEFS.weapon → WEAPON_TEMPLATES
