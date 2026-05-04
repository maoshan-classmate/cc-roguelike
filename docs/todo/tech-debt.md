## Technical Debt Register
Last updated: 2026-05-04
Total items: 4 | Estimated total effort: 2M + 2S

| ID | Category | Description | Files | Effort | Impact | Priority | Added | Sprint | Status |
|----|----------|-------------|-------|--------|--------|----------|-------|--------|--------|
| TD-001 | Architecture | GamePage 756行未拆完 — gameLoop/socketEvents 依赖15+ ref，强行提取增加复杂度 | src/pages/GamePage.tsx | M | Med | 3 | 2026-05-04 | Backlog | Open |
| TD-002 | Architecture | AnimRefs 接口中 elapsedMs 在 animRefs 和 deps 中重复传递 | src/rendering/entityRenderer.ts, src/hooks/useGameRenderer.ts | S | Low | 2 | 2026-05-04 | Backlog | Open |
| TD-003 | Code Quality | Boss casting 动画中 performance.now() 直接调用应抽为参数 | src/rendering/entityRenderer.ts | S | Low | 1 | 2026-05-04 | Backlog | Open |
| TD-004 | Code Quality | 出口引导光线代码重复（collisionGrid 路径和 rooms 路径各一份） | src/hooks/useGameRenderer.ts | S | Low | 2 | 2026-05-04 | Backlog | Open |

### Resolved

| ID | Description | Resolved | How |
|----|-------------|----------|-----|
| TD-005 | Code Quality | GameRoom 1089行巨型文件 | 2026-05-04 | 提取 EnemyAI + CollisionGrid + Combat依赖注入 → 693行 |
| TD-006 | Code Quality | useGameRenderer 911行巨型文件 | 2026-05-04 | 提取 entityRenderer + bossEffectRenderer + projectileRenderer → 311行 |
| TD-007 | Code Quality | 客户端/服务端零类型共享，67处 any | 2026-05-04 | 创建 shared/ 目录，类型/常量/协议共享，any 降至 ~5 |
| TD-008 | Test Debt | 零测试覆盖 | 2026-05-04 | Vitest + DungeonGenerator 7测试 + CollisionGrid 6测试 + Combat 5测试 |
| TD-009 | Dependency | motion 包无代码引用 | 2026-05-04 | 从 package.json 移除 |
| TD-010 | Code Quality | ENEMY_BASE_ATTACK/CLASS_SPEED 在方法体内重复定义 | 2026-05-04 | 提升到 shared/constants.ts |
