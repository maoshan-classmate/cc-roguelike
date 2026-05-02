---
name: todo-format
description: TODO 条目结构化格式规范，对标 CCGS Story 格式
globs:
  - "docs/todo/**"
---

# TODO 条目格式规范

每个 TODO 条目必须包含以下结构化字段：

```markdown
- [ ] 任务标题
  - WHAT: 交付什么（1-2 句描述交付物）
  - WHERE: 涉及哪些文件/模块
  - DONE: 完成标准（至少 2 条可验证标准）
  - DON'T: 不碰什么（边界，防止范围蔓延）
  - DEPENDS: 依赖哪些 TODO 先完成（引用编号，无依赖写"无"）
```

## 完成验证流程

1. 逐条检查 DONE 标准是否全部满足
2. 运行 `npx tsc --noEmit` — 零 error
3. 如涉及 sprite 文件 → 运行 `/sprite-audit`
4. 如涉及 `docs/gdd/` → 运行 `/consistency-check`
5. 打勾 `- [x]` + 日期（格式：`- [x] 2026-05-03`）

## 标记规则

- **先验证再标记**：不要先标后验
- **日期格式**：YYYY-MM-DD
- **取消**：`- [x] ~~已取消~~ 原因`
- **阻塞**：`- [ ] 🔴 被阻塞：原因`

## 示例

```markdown
- [ ] 实现敌人 AI 状态机
  - WHAT: 为 5 种敌人实现 idle/chase/attack/dead 状态切换
  - WHERE: server/room/enemy-ai.ts, src/pages/GamePage.tsx
  - DONE: (1) 每种敌人有独立行为模式 (2) tsc 零 error (3) 现有敌人行为不回归
  - DON'T: 不改碰撞检测逻辑，不改客户端渲染
  - DEPENDS: 无
```
