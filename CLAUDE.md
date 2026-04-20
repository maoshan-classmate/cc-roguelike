# CLAUDE.md

> Agent 团队工作手册入口文件。按 topic 引用子文档，保持主文件精简。

# Agent Team PUA 配置
所有 teammate 开工前必须加载 pua skill。
teammate 失败 2 次以上时向 Leader 发送 [PUA-REPORT] 格式汇报。
Leader 负责全局压力等级管理和跨 teammate 失败传递。

## 自动化 Agent / Skill 调度规则（强制）

> 用户手动触发 或 CLAUDE.md 明确场景下调度，不得忽略。

### 贴图资产 — 双轨制

| 场景 | 类型 | 调用方式 | 职责 |
|------|------|---------|------|
| 审查 | `Agent(sprite-audit)` | 用户调用 `/sprite-audit` | 只读审查，发现问题输出报告 |
| 修复（AI 触发） | `Agent(sprite-fix)` | `🔴 [sprite-audit]` 报告后调度 | 执行三文件同步修复 |
| 同步（用户手动） | `Skill(sync-sprite)` | 用户调用 `/sync-sprite` | 用户手动执行三文件同步 |

**双轨逻辑**：
- AI 发现问题 → agent 链路（sprite-audit → sprite-fix）
- 用户主动同步 → skill 链路（`/sync-sprite`）

### 其他调度

| 触发场景 | 类型 | 说明 |
|---------|------|------|
| `🔴 [sprite-audit] 发现 {n} 项不同步` | `Agent(sprite-fix)` | AI 审查触发，用户选择是否修复 |
| 手动调用 `/code-hygiene` | `Skill(code-hygiene)` | 项目代码整洁性全维度扫描 |

**规则**：
- agent 只做审查/分析，不自行修改文件（sprite-fix 例外）
- 收到 `🔴 [sprite-audit]` 不同步报告后，根据用户选择决定是否调度 `sprite-fix`
- 不得以"任务已完成"为由跳过 agent/skill 调度

### Commit 前 sprite-audit 强制规则

**触发条件**：仅当 `sprite-viewer.html`、`docs/sprite-inventory.md`、`src/config/sprites.ts` 三个文件中至少有一个发生变更时，才需要运行 sprite-audit 审查。若三个文件均无变更，可跳过审查直接 commit。

收到用户 `commit` 请求时：
1. **检查变更文件**：若三个 sprite 文件均无变更 → 直接执行 git commit
2. **有变更时调度** `Agent(sprite-audit)` 执行三文件同步审查
3. 等待审查报告返回：
   - 若完全一致 → 方可执行 git commit
   - 若发现不同步 → 报告用户选择：
     - **「执行修复」** → 调度 `sprite-fix` 修复后重新审查
     - **「强制提交」** → 允许提交，但在 commit message 追加 `[sprite-audit:FAILED]`
4. 修复后重新审查通过 → 方可执行 git commit

### 执行公告规范（强制）

所有 Skill / Agent / Hook 被触发时**必须向用户输出可见公告**，让用户知道什么在执行、为什么执行、执行到哪一步了。

**公告格式规范**：

| 类型 | 前缀 | 示例 |
|------|------|------|
| Hook 触发 | `[HOOK]` | `╔══ [HOOK] 任务结束提醒 ══╗` |
| Skill 执行 | `[SKILL:名称]` | `╔══ [SKILL] code-hygiene 已触发 ══╗` |
| Agent 调度 | `[AGENT:名称]` | `╔══ [AGENT] sprite-audit 已调度 ══╗` |

**规则**：
- Hook/Skill/Agent **必须在执行第一行操作前输出公告**，不得事后补
- 公告必须包含：功能说明、当前阶段、状态
- 每个阶段完成时输出进度更新
- 最终必须输出总结行（成功/失败 + 统计数据）
- 不得以任何理由跳过公告输出

## 快速上手

**首次开发**（按顺序执行）：
1. `npm install` — 安装依赖
2. `npm run dev` — 启动前后端（前端3000 + 后端3001）
3. 打开 http://localhost:3000 — 验证页面可访问
4. `npx tsc --noEmit` — 确认零 TS 错误

**日常开发**：
- `npm run dev` — 重启前后端
- `taskkill //PID <pid> //F && sleep 2 && npm run dev` — 强制重启
- DebugMenu 按 `Home` 键 — 调出调试菜单（teleport/killAll/setInvincible）

**Commit 前必查**：
- sprite 文件有变更？ → `/sprite-audit` 审查
- `npx tsc --noEmit` — 零 error 才能提交

---

## 项目结构

```
./
├── src/                    # React 前端（Vite，端口3000）
│   ├── config/            # 配置文件（sprites.ts/characters.ts/enemies.ts/items.ts）
│   ├── components/        # React 组件（像素风格组件库）
│   ├── hooks/             # 自定义 Hooks
│   ├── pages/            # 页面（GamePage/LoginPage 等）
│   └── assets/            # 静态资源（kenney/0x72 精灵图）
├── server/                # Node.js 后端（端口3001）
│   ├── room/              # 游戏房间逻辑（GameRoom）
│   └── index.ts           # Express + Socket.io 入口
├── docs/                  # 项目文档
│   ├── components.md      # 组件库索引
│   ├── bugs/              # Bug 记录（按系统分类）
│   └── todo/              # 待办任务（按领域分类）
└── sprite-viewer.html     # 贴图资产可视化预览（交互）
```

---

## 项目概述

**游戏**：局域网多人联机 Roguelike 闯关游戏
**技术栈**：React 18 + Canvas + Node.js + Socket.io + MySQL
**主题**：地牢探险（暗黑地牢、哥特风格、剑与魔法）

- 前端端口：3000（Vite）
- 后端端口：3001（Express + Socket.io）

## 铁律（最高优先级 ⚠️）

> 贴图三文件同步铁律详见 `.claude/rules/sprite-sync.md`（条件加载）。
> 以下为 agent 局限性和已知同步历史

**已知同步历史**：
- `floor_stairs` → source=0x72, atlasKey=23, category=SCENE；三文件一致，但渲染路径硬编码 `drawDungeonSprite(23)` 绕过 SPRITE_REGISTRY
- `bullet_kenney` → 已废弃，代码无引用
- `weapon_anime_sword` → sprites.ts 有注册，代码有引用，但 HTML/MD 标记 u:false（需人工确认）
- `weapon_mace` / `weapon_hammer` → sprites.ts 曾缺失，已补齐

**sprite-audit agent 局限性**：
- 只检查 registry 缺失条目，不检查 `u:false` 标记准确性
- 不自动验证 HTML vs MD 坐标一致性
- 修复后需手动 `grep` 核对关键条目坐标

**sprite-fix 局限性**：
- 只补缺失条目，不修复已存在条目间的坐标/尺寸不一致
- WEAPON 类坐标差异需人工确认后手动同步

**架构风险**：详见 [架构问题](docs/todo/architecture.md)

## 索引

- [项目结构](docs/project-structure.md)
- [调试经验 + Bug 模式](docs/debugging.md)
- [UI 设计规范](docs/ui-design.md)
- **[组件库](docs/components.md)** — 像素风格组件索引与 API 文档
- **[Pencil UI 设计架构](pencil/docs/architecture.md)** — 三层架构（Tokens/Components/Pages），组件索引+目录结构
- **[贴图资产清单（交互）](sprite-viewer.html)** — 109个精灵可视化，0x72+Kenney双源，代码引用可点击
- **[贴图资产清单（文档）](docs/sprite-inventory.md)** — 与上方HTML 1:1 对应，静态检索
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

## AI 调试工具

**DebugMenu**（按 `Home` 键，DEV模式专用，**非作弊工具**）：
- 服务端：`GameRoom.handleDebugCommand()`，生产环境安全（`NODE_ENV !== 'production'`）
- `teleport` → 跳关（floor 1-5）
- `killAll` → 一键清怪
- `setInvincible` → 角色无敌开关
- 用途：快速复现游戏状态、验证修复、跨 floor 测试

## Sprite 关键发现

> 精灵渲染规范、三文件同步铁律、角色种族分配等规则详见 `.claude/rules/rendering.md` 和 `.claude/rules/sprite-sync.md`。

**出口坐标对齐**：服务端 `exitPoint` 是房间中心（浮点坐标如 933.3），客户端渲染出口效果必须先对齐：`Math.floor(exitPoint.x / 32) * 32`

**killAll 后敌人检查**：服务端 `killAll` 设 `enemy.alive = false` 但不删除。判断"无活怪"必须用 `enemies.filter((e: any) => e.alive !== false).length === 0`

**已知缺失**：`slime_idle_anim_f0` 不存在于 atlas，basic 敌人 fallback 到 `goblin_idle_anim_f0`

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

**入口目录**: `assets/inbox/` — 外部资源手动下载后放入，Agent 负责分类和集成。

**UI 设计入口**：`assets/inbox/ui-design/` — 用户提供的 UI 参考素材
**图片资源入口**：`assets/inbox/art-assets/` — 游戏图片素材（角色/怪物/道具/瓦片等）

**流程**：
1. 下载 CC0 素材 → 丢进 `assets/inbox/art-assets/`
2. 用户提供 UI 参考 → 丢进 `assets/inbox/ui-design/`
3. 告知 Agent 文件名
4. Agent 执行：**分析格式** → **移动到 `src/assets/{source}/`** → **更新 `sprites.ts` 的 SPRITE_REGISTRY** → **同步更新 `docs/sprite-inventory.md` + `sprite-viewer.html`** → **编译验证**

**已有资产**（Kenney，CC0）：
- `src/assets/kenney/Spritesheet/roguelikeChar_transparent.png` — 角色 spritesheet
- `src/assets/kenney/Spritesheet/roguelikeDungeon_transparent.png` — 地牢/道具 spritesheet
- `src/assets/kenney/Spritesheet/roguelikeSheet_transparent.png` — 综合 spritesheet（含怪物）

**已集成资产**（0x72，PWYW 商业许可）：
- `src/assets/0x72/main_atlas.png` — 512×512 完整精灵图集
- `src/assets/0x72/frames/` — 280+ 预提取单帧 PNG（CHARACTER/MONSTER/WEAPON/ITEM/SCENE/UI）
- `src/assets/0x72/atlas_floor-16x16.png` — 地板瓦片
- `src/assets/0x72/atlas_walls_high-16x32.png` / `atlas_walls_low-16x16.png` — 墙壁瓦片

**⚠️ 废弃文件**（勿更新）：
- `src/assets/0x72/index.ts` — 已废弃
- `src/assets/kenney/index.ts` — 已废弃

**Config → Registry 映射规则**：
- `characters.ts` 的 `spriteName.front/back` = Registry key（例：`'knight_m_idle_anim_f0'`）
- `enemies.ts` 的 `spriteName` = Registry key（例：`'goblin_idle_anim_f0'`）
- `items.ts` 的 `spriteName` = Registry key（例：`'flask_big_red'`）
- 渲染代码直接 `is0x72Sprite(charConfig.spriteName?.front ?? '')` 判断 source，无需二次查表

## Edit 工具注意

- `old_string` 必须与文件内容**精确匹配**（含标点/空格/换行），读文件后直接复制原文
- Edit 失败时先 re-Read 文件再重试，不要凭记忆写 old_string

## 游戏系统关键常量

> 职业属性、敌人配置、攻击路径、色系、地牢尺寸等常量详见 `.claude/rules/game-constants.md`。

- **职业映射** SocketServer validTypes: warrior/ranger/mage 直传，healer→cleric 映射，cleric→cleric 直传
- **4 技能槽**: dash/shield/heal/speed_boost 按职业不同排列
- **碰撞半径**: `isWalkableRadius(x,y,r)` 检查中心+4角共5点

## 常见 Bug 模式

> 19 个反模式详见 `.claude/rules/bug-patterns.md`，完整调试经验详见 [调试经验 + Bug 模式](docs/debugging.md)。

- **弃用文件**：`src/assets/0x72/index.ts` 和 `spriteRegistry.ts` 为弃用，运行时代码只读 `src/config/sprites.ts`
- **Zustand + immer 渲染失效**：immer proxy 对象引用不变时不触发重渲染，本地玩家头像用 React state 而非 Zustand store
- **[前端动画与自适应规范](docs/frontend-animation.md)** — framer-motion/tsparticles 踩坑、自适应原则

