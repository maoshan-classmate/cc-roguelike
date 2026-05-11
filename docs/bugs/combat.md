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
- [x] 战斗逻辑存在重大错误 — 已通过技能系统重构解决

---

## P0 — 技能冷却中可释放但无效果 (2026-05-07)
- **优先级**: P0
- **发现时间**: 2026-05-07
- **问题**: 技能处于冷却状态时，按键仍可触发技能释放（播放动画/特效），但没有实际效果。同时冷却时间中再次释放会导致冷却计时显示异常。
- **期望行为**: 冷却中按键应被完全忽略（不触发、不播放动画、不重置冷却计时）
- **涉及系统**: 技能冷却、输入缓冲
- **状态**: ✅ 已修复（2026-05-09，useGameInput isSkillOnCooldown 检查）

## P0 — 死亡敌人仍阻挡子弹 (2026-05-07)
- **优先级**: P0
- **发现时间**: 2026-05-07
- **问题**: 远程职业子弹命中敌人 A 并将其击杀后，A 的尸体（alive=false / state=dying）仍然参与子弹碰撞检测，阻挡了飞向后方敌人 B 的子弹。场景：A 和 B 在一条直线上，子弹打死 A 后应该继续命中 B，但被死亡的 A 挡住了。
- **期望行为**: 子弹碰撞检测应跳过已死亡（alive=false）或正在死亡（state=dying）的敌人
- **涉及系统**: 子弹碰撞检测 — `Combat.ts` 的 `checkBulletCollision()`
- **状态**: ✅ 已修复（2026-05-09，Combat.ts:174 跳过 alive=false/state=dying）

## P0 — AoE 技能实际释放位置与预览位置不符 (2026-05-07, 更新 2026-05-09)
- **优先级**: P0
- **发现时间**: 2026-05-07
- **更新时间**: 2026-05-09
- **问题**: 角色释放范围技能（arrow_rain, meteor）时，客户端特效位置与预览位置和实际伤害位置不一致。鼠标靠近自身时，特效始终出现在角色朝向 150px（箭雨）/300px（陨石）处，造成"排除自身位置范围"的观感。服务端伤害判定实际是正确的（使用鼠标坐标），但视觉反馈错误。
- **期望行为**: 预览位置 = 特效位置 = 实际伤害位置，三者完全一致
- **根因分析**:
  1. **客户端特效创建**（`src/pages/game/index.tsx:392`）只传 `player.x/y + aimAngle`，不传 `targetPos`:
     `skillEffectStoreRef.current.add(skillId, localPlayer.x, localPlayer.y, localPlayer.aimAngle)`
  2. **特效渲染**（`skillEffectRenderer.ts:417-418`）硬编码偏移:
     `targetX = fx.x + cos(angle) * 150`（arrow_rain）/ `300`（meteor）
  3. **服务端伤害**（`SkillHandlers.ts:165-176`）正确使用 `targetPos`（鼠标坐标 clamp 到 maxRange）
  4. **预览**（`skillPreviewRenderer.ts:241`）正确使用 `mouseCanvasPos`（followMouse 模式）
- **修复方案**: 在 `handleSkillCast` 中将 AoE 技能的 `targetPos` 传入 `add()`，特效渲染器使用传入的目标坐标而非硬编码偏移
- **涉及文件**:
  - `src/pages/game/index.tsx` — handleSkillCast 需传 targetPos
  - `src/rendering/skillEffectRenderer.ts` — drawArrowRain/drawMeteor 需使用 fx 中的目标坐标
  - `src/hooks/useGameInput.ts` — keyUp 时需将 targetPos 传给 onSkillCast 回调
- **涉及系统**: 技能视觉反馈、AoE 定位
- **修复提交**: 2026-05-09
- **修复内容**: useGameInput onSkillCast 传 targetPos → handleSkillCast 透传 → skillEffectRenderer.add() 接收 → drawArrowRain/drawMeteor 用 fx.targetX/targetY 替代硬编码偏移
- **状态**: ✅ 已修复

## P0 — 游侠2技能（翻滚）减速陷阱无效 (2026-05-09)
- **优先级**: P0
- **发现时间**: 2026-05-09
- **问题**: 游侠（ranger）的2技能"翻滚"（dodge_roll）落地时应在落点创建减速陷阱区域，但实际只是一次性的 40px 范围检测，几乎不可能命中敌人。减速效果本身（speedMultiplier 0.5）是正常的，但触发条件过于严苛。
- **期望行为**: 落点应创建持续 trapDuration（3000ms）的减速区域，进入 trapRadius 范围的敌人都被减速
- **根因分析**:
  1. `SkillHandlers.ts:145-152` 只在落地瞬间遍历当前 enemies，对 40px 内的敌人施加 slow
  2. 没有创建持续存在的陷阱区域实体
  3. 40px 半径极小（基础敌人碰撞半径 16px），敌人需要几乎踩在落点才能触发
  4. 代码注释 "Place slow trap at landing position" 误导——实际是一次性脉冲，不是陷阱
- **修复方案**: 在落地位置创建一个持续 trapDuration 的区域效果，每帧检测进入 trapRadius 的敌人并施加 slow
- **涉及文件**:
  - `server/game/combat/SkillHandlers.ts` — handleDodgeRoll 需改为创建持续陷阱区域
  - 可能需要 `server/game/GameRoom.ts` — 支持"区域效果"实体（或在 tick 中轮询）
- **修复提交**: 2026-05-09
- **修复内容**: handleDodgeRoll 改为 500ms 间隔 6 轮持续检测（3s），trapRadius 40→60px
- **涉及系统**: 技能系统、状态效果
- **状态**: ✅ 已修复

---

## P0 — 远程职业攻击方向未完全跟随鼠标 (2026-05-07)
- **优先级**: P0
- **发现时间**: 2026-05-07
- **问题**: 远程职业的攻击/弹道方向没有完全按照鼠标方向发射，存在方向偏差。可能与 aimAngle 计算或客户端-服务端角度同步有关。
- **期望行为**: 弹道方向应精确指向鼠标位置，客户端预测与服务端计算一致
- **涉及系统**: aimAngle 计算、useGameInput、协议同步
- **状态**: ✅ 已修复（2026-05-09，aimAngle 完整链路客户端→服务端）

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

---

## P0 — 冲刺/闪避技能导致角色卡住 (2026-05-09)
- **优先级**: P0
- **发现时间**: 2026-05-09
- **问题**: 角色使用冲刺（dash）技能后可能卡在墙壁中无法移动
- **期望行为**: 冲刺不应将角色传送到墙壁内，卡住时应有位置校正
- **根因分析**:
  - **主因**: `SkillHandlers.ts:27` — `handleDash()` 使用 `isWalkable()`（单点检查），但常规移动用 `isWalkableRadius()`（中心+四角 5 点检查）。冲刺把玩家传送到中心可走但四角与墙重叠的位置，下一帧移动系统拒绝所有移动
  - **次因 #1**: `SkillHandlers.ts:34` — 备用半程距离也用 `isWalkable`（同样问题）
  - **次因 #2**: 冲刺无柱子碰撞检查（`GameRoom.ts:433-450` 的柱子推出逻辑仅常规移动触发）
  - **次因 #3**: 冲刺无路径步进碰撞检测，可穿墙
  - **接口限制**: `CombatDeps`（`Combat.ts:25-37`）只暴露 `isWalkable`，未暴露 `isWalkableRadius`
  - **同样问题**: `handleDodgeRoll()`（`SkillHandlers.ts:107-133`）存在完全相同的 `isWalkable`/`isWalkableRadius` 不一致
- **修复方案**:
  1. `CombatDeps` 新增 `isWalkableRadius(x, y, radius): boolean`
  2. `handleDash()` 和 `handleDodgeRoll()` 改用 `isWalkableRadius(x, y, PLAYER_RADIUS)`
  3. 添加路径步进碰撞检测（分段 20px 步进）
  4. 冲刺后执行柱子碰撞推出
- **涉及文件**:
  - `server/game/combat/SkillHandlers.ts` — handleDash + handleDodgeRoll
  - `server/game/combat/Combat.ts` — CombatDeps 接口
  - `server/game/GameRoom.ts` — 柱子碰撞逻辑 + isWalkableRadius 暴露
- **涉及系统**: 技能系统、碰撞检测
- **修复方案**:
  1. `CombatDeps` 新增 `isWalkableRadius(x, y, radius): boolean` 接口声明
  2. `handleDash()`: 改用 `isWalkableRadius` + 20px 步进碰撞（逐步验证，遇到墙立即停止）
  3. `handleDodgeRoll()`: 同样改用 `isWalkableRadius` + 步进碰撞
  4. 新增 `PLAYER_RADIUS` 常量引用
- **修复提交**: 2026-05-09
- **状态**: ✅ 已修复

---

## P0 — 战士技能 2/3 释放后无冷却无效果 (2026-05-09)
- **优先级**: P0
- **发现时间**: 2026-05-09
- **问题**: 战士 2 技能（war_cry）和 3 技能（shield_bash）释放后没有进入冷却状态，且无实际效果。需检查其他职业是否也有类似问题
- **期望行为**: 释放技能后进入冷却，效果正常触发
- **根因分析**:
  - **服务端管道验证**: 所有 4 职业 9 个技能 handler 完整注册，冷却/能量/路由逻辑正确，集成测试通过
  - **假设 A（最高概率）: 能量不足静默失败**
    - `war_cry` 消耗 30 能量，`shield_bash` 消耗 25 能量
    - 能量不足时服务端以 `reason: 'energy'` 拒绝（`Combat.ts:153-154`）
    - 客户端收到 `SKILL_REJECTED` 后移除预测冷却（`index.tsx:356`），但无能量不足视觉反馈
    - 用户体验：按键无反应、无冷却、无效果
  - **假设 B（高概率）: 客户端预测 bug** — 与 combat.md 已记载的 P0 bug "技能冷却中可释放但无效果" 同源
    - `useGameInput.ts:71` 冷却检查不阻止 `onSkillCast` 视觉触发
    - 服务端拒绝但客户端已播放特效，用户看到"释放了但无效"
  - **假设 C（中概率）: 数据库技能数据过时** — 旧格式未触发迁移
  - **关键结论**: 这不是战士专属 bug。所有 4 职业共享同一管道，问题影响全部职业
- **技能映射表**:

| Slot | Warrior | Ranger | Mage | Cleric |
|------|---------|--------|------|--------|
| 1 (idx 0) | dash | dash | dash | dash |
| 2 (idx 1) | war_cry | dodge_roll | frost_nova | holy_light |
| 3 (idx 2) | shield_bash | arrow_rain | meteor | sanctuary |

- **修复方案**:
  1. 能量不足时客户端显示视觉反馈（技能栏灰显/提示"能量不足"）
  2. 修复客户端预测：冷却中完全阻止 `onSkillCast` 调用
  3. 数据库技能格式验证：`GameRoom.addPlayer` 强制同步 `CHARACTER_DEFS` 技能
- **涉及文件**:
  - `server/game/combat/Combat.ts` — useSkill 能量检查
  - `src/pages/game/index.tsx` — SKILL_REJECTED 处理 + 能量反馈
  - `src/hooks/useGameInput.ts` — 冷却检查位置
  - `server/game/GameRoom.ts` — 技能迁移
- **涉及系统**: 技能系统、客户端预测、能量系统
- **根因确认**: 能量不足时服务端静默拒绝，客户端在收到拒绝前已播放音效和视觉效果
- **修复方案**:
  1. `useGameInput.ts`: 即时技能和 AoE 技能触发前加本地能量预检查（`player.energy < skillInfo.energyCost`）
  2. `getLocalPlayer` 返回值新增 `energy` 字段
  3. 导入 `SKILL_INFO` 获取能量消耗数据
- **修复提交**: 2026-05-09
- **状态**: ✅ 已修复
