# Bug: 职业/武器/技能配置不匹配

**日期**: 2026-03-29

**影响**:
- 选择牧师时，服务端 CLASS_CONFIG 无 'healer' 键 → fallback 到 warrior → 武器变成 sword（近战），技能变成 warrior 配置
- 战士本应是远程（pistol），但显示为近战；攻击范围 50px 需贴脸
- 选择职业后服务端存储的 character_type ('cleric') 与客户端 CHARACTERS 键名 ('healer') 不匹配 → 精灵/颜色渲染错误

**根因**:
1. `SocketServer.ts` 的 `validTypes` 数组用 'healer'，但 `CLASS_CONFIG` 用 'cleric' 键名
2. `src/config/characters.ts` 用 'healer' 作为 CHARACTERS 键，但服务端存 'cleric'
3. 战士默认持 pistol（gun），远程攻击；CLASS_CONFIG 配置 warrior 用 sword（melee），视觉和配置不一致

**修复**:
1. `SocketServer.ts`: 添加 healer→cleric 映射
2. `src/config/characters.ts`: 'healer' 键改为 'cleric'
3. 战士的 sword 是近战（50px），必须贴脸才能打到敌人——这是设计如此，但视觉上 sprite 0 不像剑

**待办**:
- [ ] 添加技能激活视觉反馈（无敌闪烁、治疗数字飘字）
- [ ] 验证战士 sprite 是否真的是"白色棍子"外观
- [ ] 客户端职业选择 UI 是否显示正确的武器图标
