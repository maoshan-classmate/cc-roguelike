# TODO — 架构问题（最高优先级）

> 影响全局的设计债、体系不对齐、性能瓶颈、安全风险。
> 这类问题不修，后面所有功能开发都建在沙子上。修复需要先写方案再动手。

## 待处理

### 未修复

#### P0-ARCH-1: Dash 技能硬编码边界
- **文件**: `server/game/combat/Combat.ts:113-114`
- **问题**: `dash` 位移 clamp 到 `780/580`（旧 800×600 地牢尺寸），但实际地牢已改为 1024×768
- **影响**: 玩家 dash 在地图右侧/底部被截断，无法到达完整区域
- **修复**: 改用 `GAME_CONFIG.DUNGEON_WIDTH - radius` 和 `GAME_CONFIG.DUNGEON_HEIGHT - radius`

#### P0-ARCH-2: 子弹无墙壁碰撞
- **文件**: `server/game/GameRoom.ts` bullet update
- **问题**: 子弹只检查 entity 碰撞和 out-of-bounds，不检查墙壁碰撞，会穿过墙壁飞行
- **影响**: 玩家可以隔着墙射击敌人，游侠/法师/牧师的远程攻击无视地牢结构
- **修复**: 子弹移动后调用 `isWalkable(bullet.x, bullet.y)` 检查，碰墙即销毁

#### P0-ARCH-3: BSP 房间数量不受 floor 控制
- **文件**: `server/game/dungeon/DungeonGenerator.ts:50`
- **问题**: `roomCount = 6 + floor * 2` 已计算但 `generateRooms()` 从未使用该参数，房间数完全由 BSP 深度决定（固定 5-8 间）
- **影响**: 所有楼层房间数相同，高层没有更大的地牢
- **修复**: 调整 BSP 深度或房间生成逻辑，使高层房间更多

#### P0-ARCH-4: 走廊无环路（纯线性连接）
- **文件**: `server/game/dungeon/DungeonGenerator.ts` connectRooms
- **问题**: 走廊只连接 room N → room N+1（线性链），无环路无分支
- **影响**: 地牢探索感差，玩家只能走单一路线；敌人追击时无替代路径
- **修复**: 添加随机环路连接（如连接非相邻 room），或添加分支走廊

#### P0-ARCH-5: 敌人可能生成在墙外
- **文件**: `server/game/dungeon/DungeonGenerator.ts` spawnEnemies + `server/game/GameRoom.ts` createEnemy
- **问题**: 敌人生成时叠加随机偏移（`Math.random() * 40 - 20` + room 内 50% spread），可能超出房间边界落到墙 tile
- **影响**: 敌人卡在墙里无法移动，或出生在不可达区域
- **修复**: 生成后用 `isWalkableRadius()` 验证位置，不合法则重新随机

#### P0-ARCH-6: PLAYER_BASE.moveSpeed 是死代码
- **文件**: `server/config/constants.ts`
- **问题**: `PLAYER_BASE.moveSpeed = 200` 已不被任何代码使用（GameRoom 用 CLASS_SPEED 替代）
- **影响**: 新开发者误用此常量导致速度回归
- **修复**: 删除或标记 `@deprecated` 并注释指向 CLASS_SPEED

## 已修复

- [x] P0-ARCH-DONE-1: 客户端地牢渲染与碰撞网格不对齐 — 2026-03-29 collisionGrid 发客户端，逐 tile 渲染
- [x] P0-ARCH-DONE-2: 敌人碰撞半径硬编码 12px — 2026-03-29 ENEMY_RADIUS 按 enemy.type 分配
- [x] P0-ARCH-DONE-3: 角色精灵只有 front/back 无左右 — 2026-03-29 Canvas scale(-1,1) 翻转
