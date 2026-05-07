# 战斗系统 GDD

## Overview

局域网多人 Roguelike 的核心战斗循环：4 职业各自拥有独立攻击路径，在程序生成的地牢中与 5 种敌人作战。

## Player Fantasy

玩家应感受到快节奏的地牢探险：近战 warrior 的打击感、ranger 的远程精准、mage 的爆发输出、cleric 的团队辅助。战斗应有策略深度但不应有操作门槛。

## Detailed Rules

### 角色数据架构

角色和敌人数据通过两套独立的模板注册表统一管理，消除散落多处的硬编码映射。

```
shared/character-definitions.ts         shared/enemy-definitions.ts
┌─────────────────────────┐             ┌─────────────────────────┐
│ CHARACTER_DEFS           │             │ ENEMY_DEFS               │
│ (CharacterDef 注册表)     │             │ (EnemyDef 注册表)         │
│ 11 维度合一：             │             │ 战斗+视觉+掉落合一：      │
│  hp/atk/def/energy/speed │             │  hp/atk/speed/radius/     │
│  skills/weapon/          │             │  aggroRange/cooldown/     │
│  attackType/weaponSprite │             │  damageReduction/dodge/   │
│  bulletKey/avatar/       │             │  spriteIndex/dropTable    │
│  attackSfx/sprites       │             │                          │
└───────────┬─────────────┘             └───────────┬─────────────┘
            │                                       │
            ▼                                       ▼
  server/ → CHARACTER_DEFS[type]          server/ → ENEMY_DEFS[type]
  src/   → CHARACTER_DEFS[type]          src/   → ENEMY_DEFS[type]
            │                                       │
            ▼                                       ▼
  派生：AuthManager.CLASS_CONFIG          派生：src/config/enemies.ts ENEMIES
        src/config/characters.ts CHARACTERS
```

**权威注册表（唯一数据源）：**

| 注册表 | 位置 | 内容 |
|--------|------|------|
| `CHARACTER_DEFS` | `shared/character-definitions.ts` | 4 职业完整定义（11 维度：stats/speed/skills/weapon/attackType/weaponSprite/bulletKey/avatar/attackSfx/sprites） |
| `ENEMY_DEFS` | `shared/enemy-definitions.ts` | 5 种敌人完整定义（战斗属性+视觉+掉落表） |
| `WEAPON_TEMPLATES` | `server/config/constants.ts` | 武器行为（damage/cooldown/type/range/arc） |
| `SKILL_TEMPLATES` | `server/config/constants.ts` | 技能行为（damageMult/cooldown/radius/duration 等） |

**派生配置（从注册表读取，非独立数据源）：**

| 配置 | 位置 | 数据源 |
|------|------|--------|
| `CLASS_CONFIG` | `AuthManager.ts` | 从 `CHARACTER_DEFS` 派生 |
| `CHARACTERS` | `src/config/characters.ts` | 从 `CHARACTER_DEFS` 派生（speed 保持动画倍率） |
| `ENEMIES` | `src/config/enemies.ts` | 从 `ENEMY_DEFS` 派生 |

> ⚠️ 所有消费方直接 import `CHARACTER_DEFS` / `ENEMY_DEFS`，不通过 `shared/constants.ts` 中转。

### 职业攻击路径（五条独立，不可混用）
- **warrior**: sword 近战，不产生子弹，挥砍范围检测
- **ranger**: weapon_arrow 箭矢，直线飞行+碰撞
- **mage**: `drawMagicOrb()` 紫色能量弹
- **cleric**: `spawnHealWave()` AoE 治疗波（maxRadius=80px）
- **enemy**: 红色能量弹

> 攻击路径通过 `CHARACTER_DEFS[type].attackType` 数据驱动路由，`Combat.ts` 的 `ATTACK_HANDLERS` 注册表按 `attackType` 分发：
> - `melee` → `executeMelee()`（近战弧形检测）
> - `ranged_bullet` → `fireGun()`（发射弹丸）
> - `ranged_heal` → `spawnHealWave()`（AoE 治疗波）

### 技能系统
- 每职业 **3 个技能槽**（按键 1/2/3）：槽 1 = Dash（共享），槽 2-3 = 职业独特技能
- 详见 `skills.md` 完整设计

### 碰撞检测
- `isWalkableRadius(x,y,r)` 检查中心+4角共5点
- 碰撞半径按实体类型不同（见 enemy config）

### 子弹渲染
- 五条独立路径，互不影响

## Formulas

### 伤害计算

**当前实现：**

```
player→enemy（普攻）:
  damage = weapon.damage × outgoingDamageMultiplier
  finalDamage = max(1, damage - enemy.defense × 0.5)
  enemy.hp -= finalDamage

player→enemy（技能）:
  damage = player.attack × skill.damageMult × outgoingDamageMultiplier
  finalDamage = max(1, damage - enemy.defense × 0.5)
  enemy.hp -= finalDamage

enemy→player:
  rawDamage = enemy.attack
  damageMultiplier = player.statusManager.getAggregatedFlags().damageMultiplier  // shield/vulnerable
  finalDamage = max(1, rawDamage × damageMultiplier - (player.defense + defenseBonus) × 0.5)
  player.hp -= finalDamage
  // iframes/invulnerable 检查由 damagePlayer() 统一处理
```

- `outgoingDamageMultiplier`：聚合自 StatusManager（weaken=0.6, power_essence=1.15 等）
- `damageMultiplier`：聚合自 StatusManager（shield 使用 effect.value 动态值, vulnerable 同理）
- `defenseBonus`：来自 defense_buff 状态效果（shield 道具触发）
- 玩家受击后 0.5s 无敌帧（`player.invincible = 0.5`）
- 所有 enemy→player 伤害统一走 `GameRoom.damagePlayer()`，确保 invulnerable/shield/能量回复闭环

**武器伤害值（服务端 `WEAPON_TEMPLATES`）：**

| 武器 | 类型 | 伤害 | 冷却(ms) | 能量消耗 | 特殊 |
|------|------|------|---------|---------|------|
| pistol | 远程 | 12 | 300 | 5 | 单发 |
| shotgun | 远程 | 8×5 | 800 | 15 | 5 颗弹丸，30° 扇形 |
| rifle | 远程 | 20 | 500 | 10 | 单发 |
| sword | 近战 | 30 | 400 | 10 | 范围 50px，90° 弧 |
| axe | 近战 | 45 | 600 | 15 | 范围 55px，90° 弧 |
| staff | 近战 | 22 | 450 | 10 | 范围 55px，60° 弧 |

**近战命中判定**：`dist < range + 20` 且角度差 `< arc / 2`

**弹丸命中判定**：`dist < bullet.radius + 15`（bullet.radius = 4px，有效碰撞距离 19px）

**计划迭代（DEF 公式，当前未启用）：**

```
damage = max(1, weapon.damage - target.def * 0.5)
```

- 已实现于 `Combat.ts` 的 `damageEnemy()` 和 `GameRoom.ts` 的 `damagePlayer()`
- 当前 DEF 值（`CHARACTER_DEFS[type].defense`）：warrior=10, ranger=5, mage=3, cleric=6

**TODO — 伤害计算优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P0 | **启用 DEF 公式** ✅ 2026-05-03 | `damage = max(1, weapon.damage - target.def × 0.5)`，已实现于 `GameRoom.ts damagePlayer()` | warrior 更肉，ranger/mage 更脆 |
| P1 | **暴击系统** | 引入 `critChance`（默认 5%）+ `critMultiplier`（默认 2.0x），近战暴击率更高 | 增加战斗随机性和爽感 |
| P1 | **元素伤害** | mage 武器附加 fire/ice 元素，对应 DOT/减速效果 | 职业差异化 |
| P2 | **护甲穿透** | axe 类武器忽略 50% DEF | 武器选择有意义 |
| P2 | **伤害浮动** | 最终伤害 ±10% 随机浮动 | 避免伤害数字完全固定 |

### HP 缩放

**当前实现（固定值，无缩放）：**

玩家 HP（服务端 `CHARACTER_DEFS[type].hp`，`shared/character-definitions.ts`）：

| 职业 | HP |
|------|-----|
| warrior | 100 |
| ranger | 80 |
| mage | 60 |
| cleric | 70 |

敌人 HP（服务端 `ENEMY_DEFS[type].hp`，`shared/enemy-definitions.ts`）：

| 类型 | HP |
|------|-----|
| basic | 30 |
| fast | 20 |
| ghost | 40 |
| tank | 80 |
| boss | 800 |

- **Floor 缩放已启用**（见 progression.md）：`enemy_hp = base × (1 + (floor-1) × 0.15)`
- 难度递增通过属性缩放 + 敌人类型组合 + 数量实现

**客户端配置差异（已消除）**：`src/config/enemies.ts` 现从 `ENEMY_DEFS` 派生，数值与服务端一致。

**Floor 缩放公式（✅ 已启用）：**

```
enemy_hp = ENEMY_DEFS[type].hp × (1 + (floor - 1) × 0.15)
```

- Floor 1: ×1.0（不变）
- Floor 3: ×1.3
- Floor 5: ×1.6
- Boss 不缩放（始终 800 HP）

**TODO — HP 缩放优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P0 | **启用 Floor 缩放** ✅ 2026-05-03 | `enemy_hp = ENEMY_DEFS[type].hp × (1 + (floor-1) × 0.15)`，已实现于 `GameRoom.ts createEnemy()` | 后期 floor 敌人不再"纸糊" |
| P1 | **玩家 HP 随等级增长** | 每过 1 floor +10 HP（warrior Floor 5=140 HP） | 补偿后期敌人伤害增长 |
| P1 | **Boss HP 多阶段** | Boss HP 低于 50% 进入 P2，回复 20% HP + 攻击模式变化 | Boss 战更有层次感 |
| P2 | **难度自适应** | 根据存活玩家数动态调整敌人 HP（1人=0.7x, 4人=1.0x） | 单人/满员都平衡 |

### 速度因子

**当前实现（固定速度 × dt）：**

```
player_displacement = CHARACTER_DEFS[type].speed × speedMultiplier × dt
enemy_displacement  = ENEMY_DEFS[type].speed × dt
bullet_displacement = BULLET_SPEED × dt
```

- `speedMultiplier` = `player.speedBuff || 1.0`（speed_boost 技能设为 1.5，持续 5s）
- 无加速度、无摩擦、无惯性——输入停止时瞬间静止
- 所有运动在服务端 tick（20Hz）计算，客户端 10Hz 插值

**速度值（服务端 `CHARACTER_DEFS` / `ENEMY_DEFS`，px/s）：**

| 实体 | 速度(px/s) |
|------|-----------|
| warrior | 180 |
| ranger | 220 |
| mage | 180 |
| cleric | 190 |
| basic | 60 |
| fast | 120 |
| ghost | 70 |
| tank | 40 |
| boss | 50 |
| 所有弹丸 | 400 |

**碰撞半径（`ENEMY_DEFS[type].radius`）：**
- 玩家：16px
- 敌人：basic=16, fast=14, ghost=16, tank=20, boss=28

**计划迭代（加速度模型，当前未启用）：**

```
velocity = velocity + (input_direction × ACCEL - velocity × FRICTION) × dt
```

- 可让移动更"有重量感"，但会改变战斗手感
- 启用前需评估对碰撞预测和多人同步的影响

**TODO — 速度系统优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P1 | **近战冲刺** | warrior 攻击时前冲 30px（0.15s 位移），增加打击感 | 近战不再"站着打" |
| P1 | **加速/减速 Buff** | 毒雾/沼泽区域降低 50% 速度，风区域提升 30% | 环境影响战斗节奏 |
| P2 | **加速度模型** | 启用 ACCEL+FRICTION 公式，角色有启动/刹车时间 | 移动更有"重量感" |
| P2 | **击退效果** | 被攻击时向攻击方向推出 20-40px | 增加打击反馈 |

## Edge Cases

- `dx=0/dy=0` 的静止包不能被 guard 拦截
- `killAll` 设 `enemy.alive = false` 但不删除，判断"无活怪"必须用 `enemies.filter((e: any) => e.alive !== false).length === 0`
- 子弹击中已死亡敌人不触发效果

## Dependencies

- 地牢生成（战斗在生成的房间中进行）
- Socket.io（多人同步）
- 敌人 AI（敌人行为决定战斗节奏）

## Tuning Knobs

| 参数 | 当前值 | 范围 | 影响 |
|------|--------|------|------|
| warrior HP | 100 | 80-150 | 近战生存能力 |
| warrior ATK | 15 | 10-25 | 近战输出 |
| warrior DEF | 10 | 5-20 | 伤害减免 |
| warrior 速度 | 180 px/s | 120-250 | 移动灵活性 |
| ranger HP | 80 | 60-120 | 远程脆弱性 |
| mage HP | 60 | 40-100 | 法师脆弱性 |
| cleric HP | 70 | 50-110 | 辅助生存 |

（其余职业参数见 game-constants.md）

## Acceptance Criteria

1. 4 种职业各有独立攻击路径，路径间无交叉影响
2. 多人同时攻击时无弹道混淆
3. 技能冷却正确计算
4. 碰撞检测对 5 点采样正确判定
