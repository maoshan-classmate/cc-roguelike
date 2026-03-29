# TODO — 架构问题（最高优先级）

> 影响全局的设计债、体系不对齐、性能瓶颈、安全风险。修复需要先写方案再动手。

- [x] 客户端地牢渲染与碰撞网格不对齐 — 2026-03-29 collisionGrid 发客户端，逐 tile 渲染
- [x] 敌人碰撞半径硬编码 12px — 2026-03-29 ENEMY_RADIUS 按 enemy.type 分配
- [x] 角色精灵只有 front/back 无左右 — 2026-03-29 Canvas scale(-1,1) 翻转
- [x] Dash 技能 clamp 到旧地图尺寸 780/580（应为 1024/768）— 已验证代码已使用 GAME_CONFIG.DUNGEON_WIDTH/HEIGHT
- [x] 子弹无墙壁碰撞检测，可穿墙射击 — 已验证 GameRoom.ts:340-344 已实现 isWalkable 检测
- [x] BSP 房间数不受 floor 控制，所有层房间数相同 — 2026-03-29 generateRooms 现在按 targetCount 限制房间数
- [x] 走廊纯线性连接（room N→N+1），无环路无分支 — 已验证 connectRooms 已实现 1-2 个环路连接
- [x] 敌人生成随机偏移可能落到墙外 — 2026-03-29 增加 32px padding 确保在房间内部
- [x] PLAYER_BASE.moveSpeed=200 是死代码 — 2026-03-29 已清理无用注释
- [x] 当前客户端与服务端完全糅合 — 已分离（server/ vs src/，package.json 分离脚本），socket.ts 支持 VITE_SERVER_URL 环境变量
