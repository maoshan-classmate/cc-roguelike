# TODO.md

> 本文件为索引入口。详细内容按领域拆分到 `docs/todo/` 子文件。

## 索引

- **[技术债登记](docs/todo/tech-debt.md)**
- [UI 优化](docs/todo/ui-optimization.md)
- [功能待办](docs/todo/features.md)
- [Bug 修复清单](docs/todo/bugs.md)

## 用户需求

- [用户需求原始记录](docs/requirements.md)

## Bug 记录

- [游戏核心](docs/bugs/game-core.md)
- [地牢生成](docs/bugs/dungeon.md)
- [战斗系统](docs/bugs/combat.md)
- [网络/Socket](docs/bugs/network.md)

## 记录规范

**收到需求** → 先写 `docs/requirements.md`，再拆解到 `docs/todo/` 或 `docs/bugs/`
**收到任务** → 先写 `docs/todo/` 对应子文件，再开发
**完成一项** → 立即打钩 `- [x]` + 日期（不要批量标记）
**发现 bug** → 先写 `docs/bugs/` 对应子文件，再修复
- **验证类任务不需要写入**（如 Playwright 截图、手动测试）
