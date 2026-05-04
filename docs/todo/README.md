# TODO 索引

## 按领域分类

- **[技术债登记](tech-debt.md)** — 未解决的技术债（已完成项定期清理）
- [Bug 修复清单](bugs.md)
- [UI 优化](ui-optimization.md)
- [功能待办](features.md)

## 记录规范

**收到需求** → 先写 `docs/requirements.md`，再拆解到 `docs/todo/` 或 `docs/bugs/`
**收到任务** → 先写子文件打 `- [ ]`
**完成一项** → 立即打钩 `- [x]` + 日期（不要批量标记）
**发现 bug** → 先写 `docs/bugs/` 对应子文件，再修复
- **验证类任务不需要写入 TODO**（如 Playwright 截图、手动测试）
