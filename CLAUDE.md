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

**贴图资产清单**（见上方铁律）：
- `sprite-viewer.html` — 交互式精灵预览，含源码引用
- `docs/sprite-inventory.md` — 静态清单，与上方 HTML 1:1 对应
- `src/config/sprites.ts` — `SPRITE_REGISTRY` 运行时数据源
- **三文件任一改动必须同步**，违反即为 3.25

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

**贴图资产三文件同步纪律**：见上方铁律区块（最高优先级）

**验证贴图是否被使用**：grep "sprite名" src/pages/GamePage.tsx src/config/*.ts — 运行时实际引用才是金标准；静态 SPRITE_REGISTRY 条目不等于被使用

**Edit 工具精确匹配**：`old_string` 须含原始缩进和注释，Edit 失败时 re-read 再试，不要凭记忆重写

**UI 状态 bug 根因模式**：`setSource`/`setCategory` 类的条件逻辑，先读源码结构确认 t===el 判断，而非检查 className 是否包含

**弃用文件判断**：`src/assets/0x72/index.ts` 和 `spriteRegistry.ts` 为弃用文件，运行时代码只读 `src/config/sprites.ts`

**Bug 修复验证**：改完代码必须 Playwright E2E + 截图确认，不能只看 `tsc --noEmit`；视觉类 bug 必须拿 screenshot 证据

**异步竞态修复模式**：DB 写 + 内存写双保险，`handleRoomStart` 优先读内存；`handleSelectClass` 同时更新 `lobbyManager.setPlayerCharacterType()`

**GameRoom 生命周期（ multiplayer 关键）**：玩家退出游戏页面（navigate to lobby）时，服务器端 GameRoom.tick 不会自动停止；必须在 `handleRoomLeave` 和 `handleDisconnect` 中显式移除玩家 + `gameManager.removeRoom()` 销毁空房间；客户端 `handleExit` 必须发送 `room:leave` 并重置 session refs

**Session refs 重置时机**：任何导致组件 unmount 的退出路径（handleExit / cleanup / navigate）都必须重置 `gameSessionRef` 为 0；否则下次进入时过滤逻辑失效，旧游戏状态污染新游戏

**game:floor:start 不覆盖初始 floor**：服务器对 floor=1 不发送 `game:floor:start`（只在新 floor 才设置 `_floorChanged=true`）；客户端必须靠 `game:state` 第一帧建立基准

**Playwright 截图调试**：视觉类 bug（瞬移、残影、重叠）用 `browser_take_screenshot` 存档，比 console log 更直观；GIF 能清晰展示运动轨迹异常

**TypeScript 检查过滤**：`npx tsc --noEmit --skipLibCheck --ignoreDeprecations "6.0" | grep "GamePage\|SocketServer\|GameRoom"` 只看相关文件

**Socket.io 连接复用**：同一 socket 连接在页面导航间复用，不会自动断开；navigate('/lobby') 不触发 socket disconnect，需靠 `room:leave` 事件通知服务器
