# BUG — 战斗系统

## 游戏闭环 Bug 修复 (2026-03-28)
- [x] Bug 1: 精灵太小（玩家16px→48px，敌人按比例放大）
- [x] Bug 2: 无墙壁碰撞（DungeonGenerator 生成碰撞网格，GameRoom 检测）
- [x] Bug 3: 技能卡死（删除 SocketServer/GamePage 中所有 DEBUG console.log）
- [x] Bug 4: 技能键自动重复（keydown 防重复，仅首次触发）
- [x] Bug 5: speed_boost 技能无效（添加 speedBuff 到 PlayerState）
- [x] Bug 6: 敌人伤害硬编码 10（从配置读取 attack）
- [x] Bug 7: 道具掉落类型不匹配 health_pack→health
- [x] Bug 8: 道具拾取未实现（GameRoom 检测玩家-道具碰撞并应用效果）
- [x] Bug 9: gold/keys 始终为 0（PlayerState 添加 gold/keys，拾取时累加）
- [x] Bug 10: 游戏结束未通知客户端（emit game:end）
- [x] Bug 11: 楼层切换未通知客户端（emit game:floor:start）

## 技能类型 case 错误 ✅ 已修复
- **问题**：`Combat.ts` 中技能 switch 使用 `'shield'` `'speed_boost'` 作为 case，但 skill.type 是 `'active'`
- **修复**：改为使用 `skillId` 替代 `skill.type` 做 switch 匹配

## ⚠️ 战斗逻辑重大错误
- [ ] 战斗逻辑存在重大错误，用户要求先验证图片再修复

---

## P0 — 技能冷却中可释放但无效果 (2026-05-07)
- **优先级**: P0
- **发现时间**: 2026-05-07
- **问题**: 技能处于冷却状态时，按键仍可触发技能释放（播放动画/特效），但没有实际效果。同时冷却时间中再次释放会导致冷却计时显示异常。
- **期望行为**: 冷却中按键应被完全忽略（不触发、不播放动画、不重置冷却计时）
- **涉及系统**: 技能冷却、输入缓冲
- **状态**: 🔴 待修复

## P0 — 死亡敌人仍阻挡子弹 (2026-05-07)
- **优先级**: P0
- **发现时间**: 2026-05-07
- **问题**: 远程职业子弹命中敌人 A 并将其击杀后，A 的尸体（alive=false / state=dying）仍然参与子弹碰撞检测，阻挡了飞向后方敌人 B 的子弹。场景：A 和 B 在一条直线上，子弹打死 A 后应该继续命中 B，但被死亡的 A 挡住了。
- **期望行为**: 子弹碰撞检测应跳过已死亡（alive=false）或正在死亡（state=dying）的敌人
- **涉及系统**: 子弹碰撞检测 — `Combat.ts` 的 `checkBulletCollision()`
- **状态**: 🔴 待修复

## P0 — 范围技能释放位置问题 (2026-05-07)
- **优先级**: P0
- **发现时间**: 2026-05-07
- **问题**: 角色释放范围技能（如 cleric 的 heal wave）时，无法在鼠标靠近自身的位置释放，存在最小距离限制。实际表现：鼠标离角色太近时技能不触发或效果位置异常。
- **期望行为**: 范围技能应支持在鼠标指向的任意位置释放（自身周围 + 远处，有最大范围限制），不设最小距离
- **涉及系统**: 技能触发逻辑、鼠标瞄准、范围判定
- **状态**: 🔴 待修复

## P0 — 远程职业攻击方向未完全跟随鼠标 (2026-05-07)
- **优先级**: P0
- **发现时间**: 2026-05-07
- **问题**: 远程职业的攻击/弹道方向没有完全按照鼠标方向发射，存在方向偏差。可能与 aimAngle 计算或客户端-服务端角度同步有关。
- **期望行为**: 弹道方向应精确指向鼠标位置，客户端预测与服务端计算一致
- **涉及系统**: aimAngle 计算、useGameInput、协议同步
- **状态**: 🔴 待修复

---

## 职业/武器/技能配置不匹配 ✅ 已修复
- **发现时间**: 2026-03-29
- **影响**:
  - 选择牧师时，服务端 CLASS_CONFIG 无 'healer' 键 → fallback 到 warrior → 武器变成 sword（近战），技能变成 warrior 配置
  - 战士本应是远程（pistol），但显示为近战；攻击范围 50px 需贴脸
  - 选择职业后服务端存储的 character_type ('cleric') 与客户端 CHARACTERS 键名 ('healer') 不匹配 → 精灵/颜色渲染错误
- **根因**:
  1. `SocketServer.ts` 的 `validTypes` 数组用 'healer'，但 `CLASS_CONFIG` 用 'cleric' 键名
  2. `src/config/characters.ts` 用 'healer' 作为 CHARACTERS 键，但服务端存 'cleric'
  3. 战士默认持 pistol（gun），远程攻击；CLASS_CONFIG 配置 warrior 用 sword（melee），视觉和配置不一致
- **修复**:
  1. `SocketServer.ts`: 添加 healer→cleric 映射
  2. `src/config/characters.ts`: 'healer' 键改为 'cleric'
  3. 战士的 sword 是近战（50px），必须贴脸才能打到敌人——这是设计如此，但视觉上 sprite 0 不像剑

---

## 敌人血条不更新 ✅ 已修复 (2026-05-03)
- **发现时间**: 2026-03-31
- **修复时间**: 2026-05-03
- **优先级**: P1
- **根因**: 碰撞检测距离阈值使用硬编码值 `bullet.radius + 15 = 19px`，不区分敌人类型
- **修复**: `Combat.ts` 碰撞阈值改为 `bullet.radius + ENEMY_RADIUS[enemy.type]`（basic=16, fast=14, ghost=16, tank=20, boss=28）
