## Technical Debt Register
Last updated: 2026-05-04
Total items: 4 | Estimated total effort: 2M + 2S

| ID | Category | Description | Files | Effort | Impact | Priority | Added | Sprint | Status |
|----|----------|-------------|-------|--------|--------|----------|-------|--------|--------|
| TD-001 | Architecture | GamePage 756行未拆完 — gameLoop/socketEvents 依赖15+ ref，强行提取增加复杂度 | src/pages/GamePage.tsx | M | Med | 3 | 2026-05-04 | Backlog | Open |
| TD-002 | Architecture | AnimRefs 接口中 elapsedMs 在 animRefs 和 deps 中重复传递 | src/rendering/entityRenderer.ts, src/hooks/useGameRenderer.ts | S | Low | 2 | 2026-05-04 | Backlog | Open |
| TD-003 | Code Quality | Boss casting 动画中 performance.now() 直接调用应抽为参数 | src/rendering/entityRenderer.ts | S | Low | 1 | 2026-05-04 | Backlog | Open |
| TD-004 | Code Quality | 出口引导光线代码重复（collisionGrid 路径和 rooms 路径各一份） | src/hooks/useGameRenderer.ts | S | Low | 2 | 2026-05-04 | Backlog | Open |
