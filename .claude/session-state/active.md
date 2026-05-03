# Session State

## Current Task

技术债偿还 — Phase 2/3/4 剩余项（待下次会话继续）

## 已完成

| Phase | 内容 | 验证 |
|-------|------|------|
| Phase 1 | shared/types.ts + constants.ts + protocol.ts 创建 | tsc 双端 0 error |
| Phase 1 | any 消除 67→5（92.5%） | grep 确认仅剩 5 个合理 any |
| Phase 2.1 | EnemyAI 从 GameRoom 提取（1089→730 行） | tsc + 游戏可玩 |
| Phase 2.3 | Combat 循环依赖解除（CombatDeps 接口） | tsc + 测试通过 |
| Phase 3.1 | Vitest 安装 + vitest.config.ts | npm run test 通过 |
| Phase 3.2 | DungeonGenerator 7 个测试 | 全部通过 |
| Phase 3.4 | Combat 5 个测试（mock CombatDeps） | 全部通过 |
| Phase 4.1 | ENEMY_BASE + BOSS_TEMPLATES 死代码删除 | tsc 通过 |
| Phase 4.2 | reflect-metadata 移除 | tsc 通过 |
| Phase 4.3 | ENEMY_BASE_ATTACK/CLASS_SPEED 常量提升到 shared/constants | tsc 通过 |

## 剩余 TODO（下次会话）

- [ ] Phase 2.2: CollisionGrid 提取
  - WHAT: 从 GameRoom 提取 collisionGrid + isWalkable + isWalkableRadius + separateEntities 到 server/game/collision/CollisionGrid.ts
  - WHERE: server/game/collision/CollisionGrid.ts（新建）, server/game/GameRoom.ts
  - DONE: GameRoom 再减 ~50 行, tsc 零 error, 现有测试通过
  - DON'T: 不改碰撞逻辑, 不改客户端
  - DEPENDS: 无

- [ ] Phase 2.4: GamePage 拆分（当前 804 行）
  - WHAT: 提取 hooks: useGameInput.ts（键盘/鼠标）, useGameLoop.ts（rAF 循环）, useSocketEvents.ts（socket 监听）, useSpriteLoader.ts（精灵预加载）
  - WHERE: src/hooks/（新建 4 个文件）, src/pages/GamePage.tsx（变组合层 <300 行）
  - DONE: GamePage <300 行, tsc 零 error, 游戏可玩
  - DON'T: 不改渲染逻辑, 不改服务端
  - DEPENDS: 无
  - NOTE: 耦合高，需仔细梳理 ref 共享

- [ ] Phase 2.5: useGameRenderer 拆分（当前 898 行）
  - WHAT: 提取 src/rendering/ 下: dungeonRenderer.ts, entityRenderer.ts, projectileRenderer.ts, bossEffectRenderer.ts
  - WHERE: src/rendering/（新建 4 个文件）, src/hooks/useGameRenderer.ts（变编排层 <300 行）
  - DONE: useGameRenderer <300 行, tsc 零 error, 渲染无回归
  - DON'T: 不改绘制逻辑, 不改 Canvas 调用顺序
  - DEPENDS: 无

- [ ] Phase 3.3: CollisionGrid 测试
  - WHAT: 4 个测试用例: 边界检查、5点检查、实体分离、空网格拦截
  - WHERE: server/__tests__/collision-grid.test.ts
  - DONE: npm run test 全部通过
  - DON'T: 不改 CollisionGrid 实现
  - DEPENDS: Phase 2.2（需先提取 CollisionGrid）

- [ ] Phase 4.4: 技术债登记册
  - WHAT: 创建 docs/todo/tech-debt.md，记录所有已偿还和已发现的债
  - WHERE: docs/todo/tech-debt.md（新建）
  - DONE: 文件创建完成，覆盖全部 16 项扫描发现
  - DON'T: 不改代码
  - DEPENDS: 无

## Key Decisions

- shared/ 目录作为客户端/服务端唯一类型源，客户端用 @shared 别名，服务端用相对路径
- 依赖接口模式（CombatDeps/EnemyAIDeps）替代直接 import，解除循环依赖
- socket I/O 边界的 any 保留（on/off 回调），加 eslint-disable 注释
- Database.ts 的 any[] 保留（mysql2 驱动要求）
- GamePage 拆分因耦合高暂时 defer，需先梳理 ref 共享关系

## Files Modified (本会话)

### 新建
- shared/types.ts, shared/constants.ts, shared/protocol.ts
- server/game/enemy/EnemyAI.ts
- server/__tests__/dungeon-generator.test.ts, server/__tests__/combat.test.ts
- src/rendering/fallbackDraw.ts
- vitest.config.ts

### 重构
- server/game/GameRoom.ts (1089→730 行)
- server/game/combat/Combat.ts (CombatDeps 接口)
- server/network/SocketServer.ts (public getters + 协议常量)
- server/config/constants.ts (WeaponTemplate 接口)
- server/lobby/AuthManager.ts (Character 导出, jwt 类型)
- server/data/Database.ts (catch unknown)
- server/proto/MessageTypes.ts (Packet.data unknown)

### 客户端 any 清理
- src/store/useGameStore.ts, src/hooks/useGameRenderer.ts, src/pages/GamePage.tsx
- src/pages/LobbyPage.tsx, src/pages/RoomPage.tsx, src/pages/LoginPage.tsx
- src/network/socket.ts, src/audio/sfx.ts, src/audio/SoundEngine.ts
- src/App.tsx, src/components/pixel/PixelRoomCard.tsx, src/components/AnimatedSprite.tsx
- src/store/useRoomStore.ts

## Open Questions

- GamePage 拆分时 useRef 共享方案（可能需要 Context 或统一的 deps 对象）
- useGameRenderer 的 bossEffectRenderer 提取后 BossEffect 接口归属问题

## Blocked By

无阻塞
