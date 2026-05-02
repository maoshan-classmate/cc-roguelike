# 战斗系统 GDD

## Overview

局域网多人 Roguelike 的核心战斗循环：4 职业各自拥有独立攻击路径，在程序生成的地牢中与 5 种敌人作战。

## Player Fantasy

玩家应感受到快节奏的地牢探险：近战 warrior 的打击感、ranger 的远程精准、mage 的爆发输出、cleric 的团队辅助。战斗应有策略深度但不应有操作门槛。

## Detailed Rules

### 职业攻击路径（五条独立，不可混用）
- **warrior**: sword 近战，不产生子弹，挥砍范围检测
- **ranger**: weapon_arrow 箭矢，直线飞行+碰撞
- **mage**: `drawMagicOrb()` 紫色能量弹
- **cleric**: `spawnHealWave()` AoE 治疗波（maxRadius=80px）
- **enemy**: 红色能量弹

### 技能系统
- 4 技能槽: dash/shield/heal/speed_boost
- 按职业不同排列
- 技能有冷却时间

### 碰撞检测
- `isWalkableRadius(x,y,r)` 检查中心+4角共5点
- 碰撞半径按实体类型不同（见 enemy config）

### 子弹渲染
- 五条独立路径，互不影响

## Formulas

### 伤害计算

**当前实现（纯平减）：**

```
player→enemy:  damage = weapon.damage
               enemy.hp -= damage

enemy→player:  damage = enemy.attack
               player.hp -= damage
               player.invincible = 0.5s
```

- ATK/DEF 属性存在于 `PlayerState` 和 `characters.ts` 配置中，但**当前未被伤害公式引用**
- 无护甲、无减伤、无暴击
- 玩家受击后 0.5s 无敌帧（`player.invincible = 0.5`）

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

- 启用前需同步修改 `Combat.ts` 的 `damageEnemy()` 和 `damagePlayer()`
- 当前 DEF 值：warrior=10, ranger=5, mage=3, cleric=6

**TODO — 伤害计算优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P0 | **启用 DEF 公式** | `damage = max(1, weapon.damage - target.def × 0.5)`，修改 `Combat.ts` | warrior 更肉，ranger/mage 更脆 |
| P1 | **暴击系统** | 引入 `critChance`（默认 5%）+ `critMultiplier`（默认 2.0x），近战暴击率更高 | 增加战斗随机性和爽感 |
| P1 | **元素伤害** | mage 武器附加 fire/ice 元素，对应 DOT/减速效果 | 职业差异化 |
| P2 | **护甲穿透** | axe 类武器忽略 50% DEF | 武器选择有意义 |
| P2 | **伤害浮动** | 最终伤害 ±10% 随机浮动 | 避免伤害数字完全固定 |

### HP 缩放

**当前实现（固定值，无缩放）：**

玩家 HP（服务端 `GameRoom.ts`，与 `characters.ts` 一致）：

| 职业 | HP |
|------|-----|
| warrior | 100 |
| ranger | 80 |
| mage | 60 |
| cleric | 70 |

敌人 HP（服务端 `ENEMY_BASE_HP`，`GameRoom.ts`）：

| 类型 | HP |
|------|-----|
| basic | 30 |
| fast | 20 |
| ghost | 40 |
| tank | 80 |
| boss | 200 |

- **无 Floor 缩放乘数**：Floor 1 的 basic HP = Floor 5 的 basic HP = 30
- 难度递增仅通过敌人类型组合和数量实现（见 progression.md）

**客户端配置差异（已知）**：`src/config/enemies.ts` 的 ATK 值与服务端不一致（如 basic ATK: 客户端=5, 服务端=8）。GDD 以服务端为准。

**计划迭代（Floor 缩放公式，当前未启用）：**

```
enemy_hp = ENEMY_BASE_HP[type] × (1 + (floor - 1) × 0.15)
```

- Floor 1: ×1.0（不变）
- Floor 3: ×1.3
- Floor 5: ×1.6
- Boss 不缩放（始终 200 HP）

**TODO — HP 缩放优化计划**：

| 优先级 | 优化项 | 描述 | 预期效果 |
|--------|--------|------|---------|
| P0 | **启用 Floor 缩放** | `enemy_hp = ENEMY_BASE_HP × (1 + (floor-1) × 0.15)` | 后期 floor 敌人不再"纸糊" |
| P1 | **玩家 HP 随等级增长** | 每过 1 floor +10 HP（warrior Floor 5=140 HP） | 补偿后期敌人伤害增长 |
| P1 | **Boss HP 多阶段** | Boss HP 低于 50% 进入 P2，回复 20% HP + 攻击模式变化 | Boss 战更有层次感 |
| P2 | **难度自适应** | 根据存活玩家数动态调整敌人 HP（1人=0.7x, 4人=1.0x） | 单人/满员都平衡 |

### 速度因子

**当前实现（固定速度 × dt）：**

```
player_displacement = CLASS_SPEED[type] × speedMultiplier × dt
enemy_displacement  = ENEMY_SPEED[type] × dt
bullet_displacement = BULLET_SPEED × dt
```

- `speedMultiplier` = `player.speedBuff || 1.0`（speed_boost 技能设为 1.5，持续 5s）
- 无加速度、无摩擦、无惯性——输入停止时瞬间静止
- 所有运动在服务端 tick（20Hz）计算，客户端 10Hz 插值

**速度值（服务端 `GameRoom.ts`）：**

| 实体 | 速度(px/s) |
|------|-----------|
| warrior | 180 |
| ranger | 220 |
| mage | 180 |
| cleric | 190 |
| basic | 60 |
| fast | 100 |
| ghost | 70 |
| tank | 40 |
| boss | 50 |
| 所有弹丸 | 400 |

**碰撞半径：**
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
