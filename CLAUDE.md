# CLAUDE.md

> Agent 团队工作手册入口文件。按 topic 引用子文档，保持主文件精简。

# Agent Team PUA 配置
所有 teammate 开工前必须加载 pua skill。
teammate 失败 2 次以上时向 Leader 发送 [PUA-REPORT] 格式汇报。
Leader 负责全局压力等级管理和跨 teammate 失败传递。

## 项目概述

**游戏**：局域网多人联机 Roguelike 闯关游戏
**技术栈**：React 18 + Canvas + Node.js + Socket.io + MySQL
**主题**：地牢探险（暗黑地牢、哥特风格、剑与魔法）

- 前端端口：3000（Vite）
- 后端端口：3001（Express + Socket.io）

## 索引

- [项目结构](docs/project-structure.md)
- [完整资源审计](docs/resource-audit.md) — 像素级精灵分析，索引→内容映射
- [调试经验 + Bug 模式](docs/debugging.md)
- [UI 设计规范](docs/ui-design.md)
- [精灵/资源使用](docs/sprites.md)
- [Playwright MCP](docs/playwright.md)
- [Bug 记录（按系统）](docs/bugs/)
- [用户需求原始记录](docs/requirements.md)
- [待办任务（按领域）](docs/todo/)
- **[架构问题（最高优先级）](docs/todo/architecture.md)** — 全局设计债/体系不对齐

## 关键命令

```bash
npm run dev          # 启动前后端（前端3000 + 后端3001）
taskkill //PID <pid> //F && sleep 2 && npm run dev  # 重启
netstat -ano | grep LISTENING | grep -E "300[01]"   # 检查端口
npx tsc --noEmit                                # TypeScript 编译检查
```

## Sprite 关键发现

**Kenney 地牢精灵图 (roguelikeDungeon)**：
- 地板 tiles (0-8) 是**相同室内地板**，不是边缘感知瓦片——不要按位置选择不同索引
- 墙壁 tiles (9-16) 有深色边框，与地板相邻会产生双重边框接缝
- **推荐**：墙壁/地板用 `fillRect` 像素风格绘制，消除接缝；只用地牢精灵渲染特殊物体（楼梯、宝箱）

**碰撞网格**：
- `isWalkable()` 在 `collisionGrid` 为空时**必须返回 `false`**（不能返回 `true` 会导致穿墙）
- 生成后验证：`collisionGrid.flat().filter(Boolean).length`

## Playwright MCP 验证流程

登录→创建房间→选择职业→准备→开始冒险（完整流程覆盖）

## TODO 管理规范

**收到需求** → 先写 `docs/requirements.md`，再拆解到 `docs/todo/` 或 `docs/bugs/`
**收到任务** → 先写 `docs/todo/` 对应子文件，再开发
**完成一项** → 验证闭环后打钩 `- [x]` + 日期（tsc → build → E2E → 才标记，不要先标后验）
**发现 bug** → 先写 `docs/bugs/` 对应子文件，再修复
**架构问题** → 写 `docs/todo/architecture.md`（最高优先级，需先写方案再动手）

## Windows Bash

- 路径格式：`/d/cc-roguelike/`（不是 `D:\cc-roguelike`）

## Edit 工具注意

- `old_string` 必须与文件内容**精确匹配**（含标点/空格/换行），读文件后直接复制原文
- Edit 失败时先 re-Read 文件再重试，不要凭记忆写 old_string

## 游戏系统关键常量

- **地牢渲染**: collisionGrid 从服务端发给客户端，逐 tile 渲染（视觉=物理边界），不再用 room 矩形画墙框
- **敌人碰撞半径** `ENEMY_RADIUS`: basic=16, fast=14, tank=20, boss=28（按 size 计算，不要硬编码固定值）
- **角色精灵**: 只有 front/back 两个方向，左右用 Canvas `ctx.scale(-1,1)` 翻转，索引 2-5 是空白
- **怪物精灵**: roguelikeSheet perRow=56，最大索引 1679，超出即越界（如 1721/1725）
- **地牢色系**: FLOOR=#3A2E2C, GRID=#504440, WALL=#5C4A3A, BG=#1A1210（网格线与底色色差须 >30 色阶才可见）
- **职业速度** `CLASS_SPEED`: warrior=180, ranger=220, mage=180, cleric=190 (px/s)
- **职业武器** class→weapon: warrior=sword(近战), ranger/mage/cleric=pistol(远程)
- **4 技能槽**: dash/shield/heal/speed_boost 按职业不同排列
- **碰撞半径**: `isWalkableRadius(x,y,r)` 检查中心+4角共5点
- **客户端插值**: lerp(prev, target, t) 平滑服务端 10Hz 同步
- **地牢尺寸**: 1024×768 (32×24 tiles, tile=32px)
