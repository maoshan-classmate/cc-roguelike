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

**每次执行 git commit 前，必须先运行 sprite-audit 审查。**

收到用户 `commit` 请求时：
1. **立即调度** `Agent(sprite-audit)` 执行三文件同步审查
2. 等待审查报告返回
3. 若发现不同步 → 阻止 commit，调度 `sprite-fix` 修复后重新审查
4. 若完全一致 → 方可执行 git commit

> 铁律：sprite-audit 通过是 commit 的**前置条件**，不满足则拒绝提交。

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

## 项目概述

**游戏**：局域网多人联机 Roguelike 闯关游戏
**技术栈**：React 18 + Canvas + Node.js + Socket.io + MySQL
**主题**：地牢探险（暗黑地牢、哥特风格、剑与魔法）

- 前端端口：3000（Vite）
- 后端端口：3001（Express + Socket.io）

## 铁律（最高优先级 ⚠️）

> **所有 AI teammate 开工前必须读完此节。违反即为 3.25 绩效。**

### 贴图资产三文件同步（铁律）

```
sprite-viewer.html  ←→  docs/sprite-inventory.md  ←→  src/config/sprites.ts
   交互预览                   静态文档                   运行时数据源
```

**规则**：三个文件**必须完全一致**。任一改动必须同步更新其他两处，缺一不可。

**违禁行为**：
- ❌ 只改 sprite-viewer.html 不改 MD/TS
- ❌ 只改 sprites.ts 不改 HTML/MD
- ❌ 假设"运行时不被引用就忽略"（`floor_stairs` 就是 Kenney 渲染但 sprites.ts 标记为 0x72）
- ❌ 手动标记"已使用"而不验证代码引用

**验证命令**（每次修改后必跑）：
```bash
grep "目标sprite名" sprite-viewer.html docs/sprite-inventory.md src/config/sprites.ts
# 三处必须同时出现且 source/atlasKey 完全一致
```

**已知同步历史**：
- `floor_stairs` → source=kenney, atlasKey=23, category=SCENE（三文件一致）
- `bullet_kenney` → source=kenney, atlasKey=35, category=ITEM（三文件一致）
- `orc_shaman_idle_anim_f0/f1` → ⚠️ 已废弃，代码无引用，不注册
- `wizzard_f_idle_anim_f2/f3` → 存在于atlas但未被使用，不注册

## 索引

- [项目结构](docs/project-structure.md)
- [完整资源审计](docs/resource-audit.md) — 像素级精灵分析，索引→内容映射
- [调试经验 + Bug 模式](docs/debugging.md)
- [UI 设计规范](docs/ui-design.md)
- **[Pencil UI 设计架构](pencil/docs/architecture.md)** — 三层架构（Tokens/Components/Pages），组件索引+目录结构
- [精灵/资源使用](docs/sprites.md)
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

## 常见 Bug 模式

- **白色箭头**：`drawDirectionArrow` 在本地玩家头顶绘制，删除 GamePage.tsx 中调用即可
- **UI 状态 bug**：`setSource`/`setCategory` 类逻辑，先读源码确认 `t===el`，不要查 className
- **弃用文件**：`src/assets/0x72/index.ts` 和 `spriteRegistry.ts` 为弃用，运行时代码只读 `src/config/sprites.ts`
- **异步竞态**：DB 写 + 内存写双保险，`handleRoomStart` 优先读内存
- **Session refs 重置**：组件 unmount 时必须重置 `gameSessionRef`，否则旧状态污染新游戏

## 删除废弃文件前先 grep 确认无引用

删除文件前：`grep -r "文件名" src/ --include="*.ts" --include="*.tsx"`；特别注意 `ui-optimization.md` 可能引用 `PixelSprites.tsx`

