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

## 敌人血条不更新 ⚠️ 待修复
- **发现时间**: 2026-03-31
- **优先级**: P1
- **复现**: 用远程武器射击敌人 → 血条没有变化
- **根因分析**:
  - **文件**: `server/game/combat/Combat.ts` 第 145 行
  - **问题**: 碰撞检测距离阈值使用硬编码值 `bullet.radius + 15 = 19 像素`，可能过小导致子弹"穿过"敌人
  ```typescript
  // 当前实现
  const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
  if (dist < bullet.radius + 15) {  // 4 + 15 = 19 像素阈值
    this.room.damageEnemy(enemy.id, bullet.damage);
  }
  ```
  - **另一可能**: 客户端插值显示位置与服务器实际位置不同步，导致视觉命中但服务器未检测到碰撞
- **修复记录**:
  - [ ] 2026-03-31: 待验证 - 碰撞阈值可能需要调大，或检查客户端插值同步问题
