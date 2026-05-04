# 架构守卫

> 加载方式：alwaysApply（每次会话自动加载）
> 已有覆盖（本文件不重复）：sprite-sync、rendering、bug-patterns、socket-session、game-constants、DEVELOPMENT_STANDARD.md

---

## 第一部分：设计规范

### 代码归属

**规则**：新增代码必须放入职责匹配的目录。找不到归属 → 新建模块，不塞现有文件。

| 目录 | 职责 | 禁止放入 |
|------|------|---------|
| shared/ | 跨端类型/常量/协议 | 逻辑代码、外部 import、仅单端使用的类型 |
| server/game/GameRoom.ts | 房间生命周期、模块编排 | 具体算法（碰撞/伤害/AI/生成） |
| server/game/enemy/ | 敌人行为 | 碰撞检测、房间管理、伤害计算 |
| server/game/combat/ | 伤害计算、技能效果 | 敌人 AI、碰撞、地牢生成 |
| server/game/collision/ | 碰撞检测、实体分离 | 游戏逻辑、AI |
| server/game/dungeon/ | 地牢生成算法 | 运行时游戏逻辑 |
| server/game/player/ | 玩家逻辑 | 敌人/碰撞/道具 |
| server/game/skill/ | 技能系统 | 伤害计算（归 combat） |
| server/game/item/ | 道具逻辑 | 碰撞、伤害 |
| src/rendering/ | 纯绘制 (ctx, data) => void | React hooks/import、游戏逻辑 |
| src/hooks/ | React 副作用封装 | ctx.fillRect 等 Canvas 绘制调用 |
| src/pages/ | Hook 组合 + JSX 布局 | requestAnimationFrame、socket.on、算法 |
| src/config/ | 静态配置数据 | 行为逻辑 |
| src/utils/ | 纯工具函数 | React/Canvas 依赖 |
| src/store/ | Zustand 状态 | 副作用、DOM 操作 |
| src/network/ | Socket.io 客户端 | 游戏逻辑、UI 逻辑 |
| src/audio/ | 音效系统 | 游戏逻辑 |
| src/types/ | 仅客户端类型 | 与 shared/types.ts 重复的类型 |

**违反后果**：代码作废，必须删除重写。

### 依赖方向

```
shared/ ← server/（只依赖 shared）
shared/ ← src/（只依赖 shared）
server/ ←→ src/（只通过 socket 协议，禁止直接 import）
```

**同层通信**：
- `server/game/` 模块间用 **Deps 接口**：消费方定义 `XxxDeps`，提供方 `implements`。禁止直接 import 具体类。
- `src/hooks/` 不直接操作 `src/store/` 内部结构，用 store 暴露的接口
- `src/rendering/` 不依赖 React（纯函数）
- `src/components/` 不直接操作 Canvas

**违反后果**：代码作废，删除重写。

### shared/ 治理

- shared/ 是跨端类型的**唯一**定义源。客户端和服务端禁止重复定义 PlayerState、EnemyState 等
- shared/ 零外部依赖（不能 import 任何非 shared/ 模块）
- 新增跨端类型：先改 shared/types.ts → 服务端 → 客户端，三处同步
- 仅客户端使用的类型放 src/types/

### 拆分决策

出现以下信号**必须**拆分，不等 Sprint：

- 一个文件内 ≥3 个互不相关的代码块
- 函数参数 >6 个
- import 列表 >15 行
- 文件名无法概括文件内容
- 两个函数操作同一组数据但没有调用关系
- 修改一个功能需要改同一文件多处不相关代码

**拆分方法**：按职责边界拆，不是平分代码。提取时定义 Deps 接口。拆分后 tsc + vitest + E2E。

---

## 第二部分：流程规范

### 新功能落地路径

新增游戏功能**必须**按以下顺序。跳步即违规。

1. **GDD** → `/design-system`（新系统）或 `/quick-design`（小改动）
2. **类型** → `shared/types.ts`
3. **服务端** → 对应职责模块
4. **协议** → `shared/protocol.ts`
5. **渲染** → `src/rendering/`
6. **页面** → `src/pages/`（仅组合）
7. **验证** → tsc + 测试 + E2E

**违反后果**：已写代码作废，先完成设计文档再重新开发。

### GDD 体系对接

| 场景 | 动作 |
|------|------|
| 新系统 | `/design-system` → 8 章节 GDD → `/consistency-check` → `/review-all-gdds` → 开发 |
| 小改动 | `/quick-design` → 更新 GDD 章节 → 开发 |
| GDD 变更 | `/propagate-design-change` → 扫描影响范围 |
| 新增实体 | `/consistency-check` → 验证 GDD 与代码注册表一致 |

### 重构流程

重构前**必须**确认：
1. 目标文件职责定义清晰
2. 跨模块时 Deps 接口已定义
3. 有测试覆盖（无测试先补再重构）

重构后**必须**：tsc + vitest + E2E 验证无回归。

---

## 第三部分：质量规范

### `any` 预算

- 全项目上限 **15** 个
- 新增 `any` **必须**注释：`// any: {理由}`
- 可接受：第三方库回调、socket 序列化层
- 不可接受：`as any` 绕过、`Record<string, any>`、重复类型定义

**违反后果**：该文件改动作废，补充类型或注释后重新写。

### 新模块带测试

- 新建 `server/game/` 模块 → **≥3 个**测试用例
- 新建 `shared/` 工具函数 → **≥2 个**测试用例
- 修改碰撞/战斗/生成逻辑 → 补充对应测试
- 免测试：纯渲染、React 组件 UI、配置文件
- 测试放 `server/__tests__/`，命名 `{module}.test.ts`

**违反后果**：模块代码作废，补完测试后重新提交。

### 死代码零容忍

- 删功能同步删 import/常量/配置
- `package.json` 新依赖 3 天无引用则移除
- 注释掉的代码 >10 行直接删
- 禁止 import 废弃文件：`src/assets/0x72/index.ts`、`src/assets/kenney/index.ts`、`spriteRegistry.ts`

### Sprint 扫描

每个 Sprint 开始运行 `/tech-debt scan`，新发现登记到 `docs/todo/tech-debt.md`。
