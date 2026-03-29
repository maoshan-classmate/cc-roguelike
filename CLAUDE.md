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
- **[开发规范（强制）](docs/DEVELOPMENT_STANDARD.md)** — 所有 AI 开发必须遵守，含 AI 开发检查清单

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

## 0x72 Dungeon Tileset II 集成规范

**Atlas vs Kenney 区别**：
- Kenney: 网格索引式 (`spriteIndex: 0`)，按行切 spritesheet
- 0x72: atlas 坐标式 (`spriteName: 'knight_m_idle_anim_f0'`)，直接 `ctx.drawImage(img, sx, sy, sw, sh, ...)`

**精灵命名规范**：
- `_anim_f{n}` 后缀 = 4帧动画（如 `knight_m_idle_anim_f0`）
- `_f{n}` 无 `_anim` = 3帧动画（如 `chest_full_open_anim_f0`）
- 无后缀 = 静态（如 `flask_big_blue`、`skull`）
- `getAnimSprite()` 对静态项**不追加**帧号，非静态才替换帧后缀

**已知缺失**：`slime_idle_anim_f0` 不存在于 atlas，basic 敌人 fallback 到 `goblin_idle_anim_f0`

**统一 Sprite Registry** (`src/config/sprites.ts`)：
- `SPRITE_REGISTRY` = 全局单一数据源，key = spriteName 值
- `getSpriteEntry(spriteName)` → 查 size/animated/frameCount
- `is0x72Sprite(spriteName)` → source 检测，替代 `spriteName !== undefined`
- 渲染优先级：0x72 (`is0x72Sprite()?→draw0x72Sprite`) → Kenney fallback

**新资产引入流程**：解析→语义分类(CHARACTER/MONSTER/WEAPON/ITEM/SCENE/UI)→持久化(TS+MD)→替换

## Playwright MCP 验证流程

登录→创建房间→选择职业→准备→开始冒险（完整流程覆盖）

## 验证规范

- **编译检查**：`npx tsc --noEmit`（零 error 即通过，弃用警告可忽略）
- **E2E 验证**：Playwright MCP 走完 登录→建房间→选职业→准备→开始冒险，确认零 `[0x72] Sprite not found` 警告
- **截图存档**：E2E 通过后截图，验证后删除 `.playwright-mcp/` 下的截图文件；Playwright MCP `browser_take_screenshot` 保存截图到 `.playwright-mcp/` 目录

## TODO 管理规范

**收到需求** → 先写 `docs/requirements.md`，再拆解到 `docs/todo/` 或 `docs/bugs/`
**收到任务** → 先写 `docs/todo/` 对应子文件，再开发
**完成一项** → 验证闭环后打钩 `- [x]` + 日期（tsc → build → E2E → 才标记，不要先标后验）
**发现 bug** → 先写 `docs/bugs/` 对应子文件，再修复
**架构问题** → 写 `docs/todo/architecture.md`（最高优先级，需先写方案再动手）

## 资源管理流程（外源素材引入）

**入口目录**: `assets/inbox/` — 所有手动下载的 CC0 资源统一放入这里，Agent 负责整合。

**流程**：
1. 下载 CC0 素材 → 丢进 `assets/inbox/`
2. 告知 Agent 文件名
3. Agent 执行：**分析格式** → **移动到 `src/assets/kenney/Spritesheet/`** → **更新 `characters.ts` / `enemies.ts` 索引** → **编译验证**

**已有资产**（Kenney，CC0）：
- `src/assets/kenney/Spritesheet/roguelikeChar_transparent.png` — 角色 spritesheet
- `src/assets/kenney/Spritesheet/roguelikeDungeon_transparent.png` — 地牢/道具 spritesheet
- `src/assets/kenney/Spritesheet/roguelikeSheet_transparent.png` — 综合 spritesheet（含怪物）

**待集成资产**（0x72，PWYW 商业许可）：
- `assets/inbox/0x72_DungeonTilesetII_v1.7/` — 角色/怪物动画帧（370 帧），暗黑地牢风格

**索引对应关系**（需随新资源更新）：
- `src/config/characters.ts` — 4 个职业的 spriteIndex
- `src/config/enemies.ts` — 4 种怪物的 spriteIndex
- `src/assets/kenney/index.ts` — spritesheet 路径和尺寸常量

**Config → Registry 映射规则**：
- `characters.ts` 的 `spriteName.front/back` = Registry key（例：`'knight_m_idle_anim_f0'`）
- `enemies.ts` 的 `spriteName` = Registry key（例：`'goblin_idle_anim_f0'`）
- `items.ts` 的 `spriteName` = Registry key（例：`'flask_big_red'`）
- 渲染代码直接 `is0x72Sprite(charConfig.spriteName?.front ?? '')` 判断 source，无需二次查表

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
- **职业武器** class→weapon: warrior=sword(近战), ranger/mage=pistol(远程), cleric=staff(魔法杖)
- **4 技能槽**: dash/shield/heal/speed_boost 按职业不同排列
- **碰撞半径**: `isWalkableRadius(x,y,r)` 检查中心+4角共5点
- **客户端插值**: lerp(prev, target, t) 平滑服务端 10Hz 同步
- **地牢尺寸**: 1024×768 (32×24 tiles, tile=32px)

## Bug 修复教训（本 session 沉淀）

**角色 sprite 大小**：atlas 原始 16px → 在 32px tile 世界需要 scale 2-3x 才能清晰可见 → 当前 CHARACTER size=48；改 size 前必须截图验证，不可靠直觉

**白色棍子已知来源**：`drawDirectionArrow` 在本地玩家头顶绘制白色 12px 方向箭头，删除 GamePage.tsx 中调用即可，不要误删 PixelSprites

**删除文件前必须全量 grep 引用**：确认零引用才能删；`ui-optimization.md` 可能引用 `PixelSprites.tsx`

**Bug 修复验证**：改完代码必须 Playwright E2E + 截图确认，不能只看 `tsc --noEmit`；视觉类 bug 必须拿 screenshot 证据

**异步竞态修复模式**：DB 写 + 内存写双保险，`handleRoomStart` 优先读内存；`handleSelectClass` 同时更新 `lobbyManager.setPlayerCharacterType()`
