## Technical Debt Register
Last updated: 2026-05-04
Total items: 4 | Estimated total effort: 2M + 2S

| ID | Category | Description | Files | Effort | Impact | Priority | Added | Sprint | Status |
|----|----------|-------------|-------|--------|--------|----------|-------|--------|--------|
| TD-001 | ~~Architecture~~ | ~~GamePage 已拆分为 src/pages/game/ 目录~~ | ~~已完成~~ | — | — | — | 2026-05-04 | — | Closed |
| TD-002 | Architecture | AnimRefs 接口中 elapsedMs 在 animRefs 和 deps 中重复传递 | src/rendering/entityRenderer.ts, src/hooks/useGameRenderer.ts | S | Low | 2 | 2026-05-04 | Backlog | Open |
| TD-003 | Code Quality | Boss casting 动画中 performance.now() 直接调用应抽为参数 | src/rendering/entityRenderer.ts | S | Low | 1 | 2026-05-04 | Backlog | Open |
| TD-004 | Code Quality | 出口引导光线代码重复（collisionGrid 路径和 rooms 路径各一份） | src/hooks/useGameRenderer.ts | S | Low | 2 | 2026-05-04 | Backlog | Open |
