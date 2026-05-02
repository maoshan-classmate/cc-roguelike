# 项目开发规范（强制）

> 所有 AI Agent 开发时必须强制遵守。人类开发者参照执行。
> 规范正文为人类可读，末尾 `## AI 开发检查清单` 可直接注入 AI prompt。

---

## 1. 资源统一管理

### 1.1 外部资源入口

**你必须**：
- `assets/inbox/` 是**人类放置资源的入口目录**，Agent 不得在此目录内做分析或引用
- 素材集成后**必须**移动到 `src/assets/` 下对应分类路径（kenney/Spritesheet/、0x72/等）
- 不得在 `assets/inbox/` 以外的裸路径引用外部 URL
- 素材集成后立即更新对应 config 文件，不得遗留"裸索引"

**流程**：`人类放资源到 inbox → Agent 移动到 src/assets/ → 分析 → 分类 → 更新 sprites.ts → 同步 sprite-inventory.md + sprite-viewer.html → 编译验证`

### 1.2 Sprite Registry（强制）

**你必须**：
- `src/config/sprites.ts` 的 `SPRITE_REGISTRY` 是**唯一数据源**
- 所有游戏配置（`characters.ts`、`enemies.ts`、`items.ts`）的 `spriteName` 值**必须**是 Registry key
- 渲染路径**必须**通过 `getSpriteEntry(spriteName)` 查 size/animated/frameCount
- 不得在渲染代码中硬编码 sprite key 字符串（除 config 初始定义）

**Registry 扩展流程**：
1. 从 `assets/inbox/` 移动资源到 `src/assets/` 分类路径
2. 在 `SPRITE_REGISTRY` 添加条目：`category` / `source` / `atlasKey` / `size` / `animated` / `frameCount`
3. 独立 spritesheet 需新增专用绘制函数（如 `drawPumpkinDudeSprite`）
4. 同步 `docs/sprite-inventory.md` 和 `sprite-viewer.html`
5. 编译验证

### 1.3 配置分散原则

**你不得**：
- 在非 config 文件中硬编码游戏常量（如 `size: 48`、`hp: 100`）
- 新增 config 文件夹以外的分散配置

**你应当**：常量优先入 `src/config/` 或 `server/config/constants.ts`，不得散落各模块

---

## 2. 编码风格

### 2.1 TypeScript 规范

**你必须**：
- 严格遵守 `npx tsc --noEmit` 零 error（warning 可忽略）
- 禁止 `any` 类型，禁用 `@ts-ignore`
- 接口命名：`I${Name}Config` 或直接 `{Name}Config`，不得用空接口

**你应当**：
- `type` vs `interface`：行为类型用 `interface`，数据联合类型用 `type`
- 枚举仅用于**稳定语义集**（如方向、状态），游戏数值配置用 `const` 对象

### 2.2 命名规范

| 上下文 | 规范 | 示例 |
|--------|------|------|
| 文件名 | kebab-case | `game-room.ts`、`sprite-utils.ts` |
| 类型/接口 | PascalCase | `EnemyConfig`、`SpriteEntry` |
| 函数/方法 | camelCase | `getSpriteEntry`、`isWalkable` |
| 常量 | UPPER_SNAKE_CASE | `TILE_SIZE`、`MAX_PLAYERS` |
| Registry key | `snake_case` | `knight_m_idle_anim_f0`、`flask_big_red` |

**你不得**：混用命名风格、在同一模块内中英混写（注释除外）

### 2.3 格式化

**你必须**：
- 单次 commit 只做**一件事**（同类改动合并，无关改动分离）
- Edit 前必须 re-Read 文件，凭记忆写 `old_string` 导致 Edit 失败视为违规
- 提交前运行 `npx tsc --noEmit`

---

## 3. 组件复用

### 3.1 复用判定

**你应当**在以下情况提取复用：
- 相同绘图逻辑出现 2 次以上 → 提取为 `src/config/sprites.ts` 工具函数
- 相同配置结构出现 3 次以上 → 提取为共享 `interface` + `const` 对象
- 相同业务逻辑出现 2 次以上 → 提取为 `src/utils/` 或 `server/utils/`

**你不得**：
- 为"可能将来复用"提前抽象（YAGNI）
- 复制粘贴代码后做微小修改（DRY 违规）

### 3.2 组件边界

- **React 组件**：仅负责 UI 渲染和本地状态，不直接引用游戏逻辑
- **游戏逻辑**：全部在 `src/` 或 `server/` 的纯逻辑模块，React 仅作桥接
- **Canvas 渲染**：集中在 `GamePage.tsx` 的 `requestAnimationFrame` 循环内，绘制函数从 `sprites.ts` 引入

---

## 4. 配置管理

### 4.1 配置文件清单

```
src/config/
├── sprites.ts      # 统一 Sprite Registry + 渲染工具（强制单数据源）
├── characters.ts    # 角色配置（spriteName 引用 Registry）
├── enemies.ts      # 敌人配置（spriteName 引用 Registry）
├── items.ts        # 道具配置（spriteName 引用 Registry）
└── (其他领域 config)

server/config/
└── constants.ts     # 服务端游戏常量
```

### 4.2 配置扩展规则

**你必须**：
- 新增 config 文件时，在 `docs/project-structure.md` 同步记录
- 配置值不得包含业务逻辑（业务逻辑放对应模块）
- 枚举型配置用 `as const` 冻结

---

## 5. 状态管理

### 5.1 客户端状态

**你必须**：
- React 状态用 Zustand store（`src/store/`），不得用 useState 散落各组件
- 游戏状态（HP、位置、动画帧）通过 Zustand 共享，不逐层 prop drilling

### 5.2 服务端状态

**你必须**：
- 服务端是"真相之源"，客户端仅作预测插值
- `GameRoom.ts` 是服务端游戏状态核心，不得在客户端直接修改
- Socket 同步用**增量更新**，不得全量推送

### 5.3 Socket 同步规范

**你应当**：
- 客户端插值用 `lerp(prev, target, t)` 平滑 10Hz 同步
- 服务端发 `collisionGrid` 后客户端不得信任本地计算碰撞

---

## 6. 渲染管线

### 6.1 Canvas 绘制顺序（从底到顶）

```
1. 背景色 / 网格线
2. 地牢地板（fillRect 像素绘制，不用精灵）
3. 地牢墙壁（fillRect，不依赖接缝精灵）
4. 地牢出口楼梯（Kenney sprite 索引23，特殊：唯一用精灵渲染的地牢物体）
5. 道具（优先 0x72 → Kenney fallback）
6. 敌人（优先 0x72 → Kenney fallback）
7. 子弹/特效（子弹需在玩家之前渲染，否则遮挡）
8. 玩家（优先 0x72 → Kenney fallback）
9. UI 叠加层（血条、名称、皇冠、方向指示器）
```

**你不得**：改变绘制顺序（会导致遮挡关系错误），除非显式注释说明原因

> ⚠️ **已知偏差**：出口楼梯用 `drawDungeonSprite(..., 23, ...)` 渲染，是唯一用精灵的地牢物体，已标注。

### 6.2 精灵渲染规范

**你必须**：
- 0x72 Atlas 检测用 `is0x72Sprite(spriteName)`，不得用 `spriteName !== undefined`
- 动画帧计算统一用 `getAnimSprite(spriteName, elapsedMs)`
- 静态精灵（无 `_anim_f` / `_f` 后缀）**不追加**帧号

---

## 7. 游戏逻辑分层

### 7.1 层次结构

```
表现层（React + Canvas）
    ↓ socket 事件
网关层（server/network/）
    ↓
游戏逻辑层（server/game/）
    ├── GameRoom.ts       # 房间状态 + 游戏循环
    ├── combat/          # 战斗计算
    ├── dungeon/         # 地牢生成
    └── (其他模块)
    ↓
数据层（MySQL via ORM）
```

**你必须**：逻辑不得跨层调用（表现层不直接写游戏逻辑，服务端不直接调 Canvas API）

> ⚠️ **已知架构债**：当前 `GamePage.tsx`（876行）混合了网关层（输入处理+socket发送）和表现层（Canvas渲染），`useEffect gameLoop` 块承担了客户端网关职责。目标态应为：网关逻辑提取到 `src/network/` 或 `src/hooks/useGameLoop.ts`，GamePage 专司渲染。

### 7.2 地牢生成

**你必须**：
- `DungeonGenerator.ts` 是服务端唯一地牢生成入口
- `collisionGrid` 生成后验证：`collisionGrid.flat().filter(Boolean).length`
- 碰撞检测函数：`isWalkable()` 在 `collisionGrid` 为空时返回 `false`

---

## 8. 错误处理与调试

### 8.1 错误规范

**你必须**：
- `console.warn` 用于已知过渡方案（可接受状态）
- `console.error` 用于实际错误（配置缺失、类型越界）
- **不得**留下无提示的静默失败

### 8.2 调试经验积累

**你应当**：每次发现并修复 bug 后，将根因写入 `docs/bugs/` 对应子文件（格式：`docs/bugs/[系统]-[日期].md`）

---

## 9. 测试与验证

### 9.1 强制验证闭环

**每项功能完成后，你必须依次执行**：

```
1. npx tsc --noEmit         # TypeScript 编译（零 error）
2. Playwright E2E           # 登录→建房间→选职业→准备→开始冒险
3. 截图确认                 # 渲染正确后删除截图
```

**你不得**：在验证闭环完成前标记 TODO 为完成

### 9.2 提交规范

**你必须**：
- commit message 首行不超过 72 字符
- 格式：`<type>: <简短描述>`，type 用 `feat/fix/refactor/docs/test/chore`
- 单次 commit 只包含**一件事**

---

## 10. 文档规范

### 10.1 文档与代码同步

**你必须**：
- 新增 config/接口/工具函数后，同步更新 `docs/project-structure.md`
- 资源集成后同步 `docs/sprite-inventory.md` 和 `sprite-viewer.html`（三文件铁律）
- Bug 修复后写入 `docs/bugs/`

### 10.2 TODO 管理

**你必须**：
- 收到需求 → 先写 `docs/requirements.md`，再拆解到 `docs/todo/`
- 发现架构问题 → 写入 `docs/todo/architecture.md`（最高优先级）
- 完成一项 → 验证后打钩 `- [x] + 日期`，不得先标后验

---

## AI 开发检查清单

> 以下 checklist 可直接注入 AI prompt。每次开发任务开始前逐项确认。

### 资源管理
- [ ] 外源素材统一在 `assets/inbox/`，不裸引 URL
- [ ] sprite 扩展已写入 `src/config/sprites.ts` 的 `SPRITE_REGISTRY`
- [ ] sprite 扩展已同步到 `docs/sprite-inventory.md` 和 `sprite-viewer.html`
- [ ] 所有 config 的 `spriteName` 值是 Registry key，无两层查找
- [ ] 渲染代码用 `is0x72Sprite()` 检测 source，不依赖 `!== undefined`

### 编码规范
- [ ] `npx tsc --noEmit` 零 error（warning 可忽略）
- [ ] 无 `any`、无 `@ts-ignore`
- [ ] 命名风格统一（文件/类型/函数/常量各从其规范）
- [ ] Edit 前已 re-Read 文件，`old_string` 与原文精确匹配

### 组件复用
- [ ] 相同代码出现 2 次以上已提取为工具函数
- [ ] 未提前抽象（无 speculative abstraction）

### 配置管理
- [ ] 游戏常量已入 config，不散落各模块
- [ ] 新增 config 已同步 `docs/project-structure.md`

### 渲染管线
- [ ] 绘制顺序符合从底到顶规范（地板→墙壁→道具→敌人→玩家→特效→UI）
- [ ] 静态精灵（无帧后缀）未错误追加 `_f0`
- [ ] `getAnimSprite()` 正确区分 4帧动画、3帧动画、静态

### 状态管理
- [ ] 游戏状态通过 Zustand store 共享
- [ ] 服务端是真相之源，客户端仅作插值预测

### 测试闭环
- [ ] `npx tsc --noEmit` 通过
- [ ] Playwright E2E 完整流程通过
- [ ] 零 `[0x72] Sprite not found` 警告
- [ ] 截图存档（验证后删除）

### 提交规范
- [ ] 单次 commit 只做一件事
- [ ] commit message 格式正确
- [ ] TODO 标记含验证日期，不先标后验

---

## 过渡方案管理

对于**已知架构债**，你**必须**：

1. 在 `docs/todo/architecture.md` 记录：问题描述 + 根因 + 影响范围
2. 代码中加注释说明：`// 已知问题：XXX（TODO: YYY）`
3. **不得**引入新的架构债（过渡方案仅用于存量问题）
4. 每个 PR 最多携带**一项**架构债清理，超出则拆解

---

## 测试证据分级

> 验证驱动开发：先写测试再写实现。每个完成声明必须有对应级别的测试证据支撑。

### 证据级别

| 级别 | 适用场景 | 证据要求 | 示例 |
|------|---------|---------|------|
| **Logic** | 纯逻辑、算法、数据处理 | 自动化测试（单元测试）通过 | `npx jest --passWithNoTests` |
| **Integration** | 跨模块交互、API、Socket | 集成测试或 E2E 验证通过 | Playwright 完整流程 + tsc 零 error |
| **Visual** | UI 渲染、动画、视觉效果 | 截图 + 人工确认 | Playwright 截图 + 用户目视确认 |

### 验证规则

1. **Logic 级变更**：至少有自动化测试覆盖核心路径
2. **Integration 级变更**：需跑 `npx tsc --noEmit` + 相关 E2E 流程
3. **Visual 级变更**：需截图存档 + 用户目视确认后才能标记完成
4. **不允许降级**：Integration 级变更不能用 Logic 级证据代替
5. **"已手动测试"不作为有效证据**：手动测试不可复现、不可记录、不可回放

### TODO 条目完成标准

每个 TODO 条目（见 `.claude/rules/todo-format.md`）的 DONE 标准中，必须指定证据级别：
- `DONE: [Logic] 核心算法测试通过 + [Integration] tsc 零 error`
- 未指定级别的默认为 Integration 级
