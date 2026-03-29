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
