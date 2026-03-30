---
name: code-hygiene
description: 项目代码整洁性审查与清理。检查架构清晰性、死代码、命名规范、类型安全、调试残留、废弃文件等，输出结构化报告并可选自动修复。
---

# Code Hygiene — 项目代码整洁性守卫

> 底层逻辑：代码整洁不是美学问题，是工程质量问题。架构债累积到临界点，团队效率断崖下跌。

## ⚠️ 执行公告（强制，不可跳过）

Skill 被触发时，**必须**在执行任何操作之前向用户输出以下公告：

```
╔══════════════════════════════════════════════════╗
║ [SKILL] code-hygiene 已触发                       ║
╠══════════════════════════════════════════════════╣
║ 功能: 项目代码整洁性全维度扫描                     ║
║ 阶段: Phase 1 扫描 → Phase 2 架构评估             ║
║        → Phase 3 报告 → Phase 4 修复 → Phase 5   ║
║ 状态: 正在执行 Phase 1 全局扫描...                ║
╚══════════════════════════════════════════════════╝
```

每个 Phase 开始和结束时也要输出状态更新：
- `📋 [SKILL:code-hygiene] Phase {n} {名称} — 完成（发现 {x} 项问题）`
- `🔧 [SKILL:code-hygiene] Phase {n} {名称} — 开始修复...`

## 触发时机

- 用户说"整理代码"、"清理"、"重构"、"架构检查"、"代码审查"
- 完成 TODO 任务后，提交前
- 用户主动调用 `/code-hygiene`
- 大功能完成后（>5 文件改动）

## 执行流程

### Phase 1: 全局扫描（必须，不可跳过）

按以下维度扫描项目，**每个维度输出结构化报告**：

```bash
# 维度1: 文件体积热点（>300行需关注，>500行必须拆分）
find src/ server/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -rn | head -15

# 维度2: 类型安全违规（any / @ts-ignore）
grep -rn "\bany\b" src/ server/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".d.ts"
grep -rn "@ts-ignore\|@ts-nocheck" src/ server/ --include="*.ts" --include="*.tsx"

# 维度3: 调试残留
grep -rn "console\.log\|console\.debug\|debugger" src/ server/ --include="*.ts" --include="*.tsx" | grep -v "node_modules"

# 维度4: 废弃/僵尸文件（无引用）
# 列出 src/ 下所有 .ts/.tsx 文件，逐个 grep 检查是否被 import

# 维度5: 硬编码常量（应入 config 的散落常量）
grep -rn "size:\s*[0-9]\+\|hp:\s*[0-9]\+\|speed:\s*[0-9]\+\|radius:\s*[0-9]\+" src/pages/ src/components/ --include="*.ts" --include="*.tsx" | grep -v "config/"

# 维度6: 命名违规
# 检查文件名是否 kebab-case、类型是否 PascalCase、常量是否 UPPER_SNAKE

# 维度7: 重复代码模式（相同逻辑出现2+次）
grep -rn "ctx\.drawImage\|ctx\.fillRect\|ctx\.fillStyle" src/pages/GamePage.tsx | wc -l
```

### Phase 2: 架构清晰度评估

检查以下架构规则是否被违反：

| 规则 | 检查方法 | 违规等级 |
|------|----------|----------|
| GamePage.tsx ≤ 500行 | `wc -l src/pages/GamePage.tsx` | 🔴 >800行 🔵 500-800 |
| 配置常量不入渲染层 | `grep -rn "size:\s*\d\+" src/pages/` | 🔴 |
| React组件不直接含游戏逻辑 | GamePage.tsx 中 socket.emit 直接调用次数 | 🔵 >10次 |
| Zustand store 代替 useState散落 | `grep -rn "useState" src/pages/` | 🔵 >5处 |
| 逻辑不跨层调用 | server/ 不 import src/ | 🔴 |
| 无 any 类型 | `grep -rn "\bany\b"` | 🔴 |
| 无废弃文件 | 引用检查 | 🔵 |

### Phase 3: 输出报告格式

```
## Code Hygiene Report — {日期}

### 🔴 Critical（必须修复）
- [ ] GamePage.tsx: 952行（阈值 500），需拆分网关层
- [ ] 21处 `any` 类型（src/pages/: 16处, src/network/: 3处, server/: 2处）
- [ ] 废弃文件未删除：src/assets/0x72/index.ts, src/assets/0x72/spriteRegistry.ts

### 🔵 Warning（建议修复）
- [ ] 3处 [DEBUG] console.log 残留（LobbyPage.tsx: 157, 171, 193）
- [ ] 2处硬编码 size 常量散落在 GamePage.tsx（应入 config）

### 🟢 Good（通过项）
- ✅ 无 @ts-ignore
- ✅ 服务端未跨层引用前端
- ✅ 文件命名 kebab-case 一致

### 建议优先级
1. （最高）...
2. ...
3. ...
```

### Phase 4: 修复执行（强制——必须用户确认后才能进入）

**Phase 3 报告出具后，禁止直接跳 Phase 5。必须停下来等用户确认。**

用户确认选项：
- **「执行修复」**：用户选择修复项，依次执行，每次修复后重跑 Phase 1 验证
- **「仅测试/不出报告」**：本次只验证流程，不修改任何文件，Phase 4 以「用户选择不修复」闭环

```
✅ [SKILL:code-hygiene] Phase 4 用户确认 — 用户选择「{选项}」
   结论：{简述决定}
```

**禁止行为**：Phase 3 报告后不等待用户，直接跳 Phase 5 验证。报告≠交付，用户确认才是闭环。

修复优先级排序：
1. **删除废弃文件**（零风险，立即做）
2. **清理调试残留**（console.log → console.warn/error 或删除）
3. **any 类型替换**（用具体接口替代）
4. **常量提取入 config**（散落常量 → src/config/ 或 server/config/）
5. **大文件拆分**（最复杂，需规划）

### Phase 5: 验证闭环

修复完成后必须执行：
```bash
npx tsc --noEmit  # 零 error
```

## 关键原则

1. **只做减法和整理，不做加法**——不添加新功能、新抽象、新模式
2. **一次只做一类修复**——先清废弃文件，再清 any，再清常量，不混着来
3. **每步可回滚**——每类修复一个 commit，不积攒大改动
4. **报告先行，修复在后**——先出完整报告，用户确认后才动手
5. **对照 DEVELOPMENT_STANDARD.md**——所有违规项必须有对应规范条款引用

## 项目特定检查项

### cc-roguelike 专属规则

- `GamePage.tsx` 职责：Canvas 渲染 + 网关层（socket 收发），目标是拆分到 <500行
- `src/assets/0x72/index.ts` 和 `src/assets/0x72/spriteRegistry.ts` 为已知废弃文件
- `SPRITE_REGISTRY` 是唯一 sprite 数据源，不得有平行数据源
- 渲染代码中不得硬编码 sprite key（除 config 初始定义）
- 常量 `TILE_SIZE=32`, `ENEMY_RADIUS` 等必须从 config 引用
- Socket 事件类型必须通过 `server/proto/MessageTypes.ts` 定义
- `console.log` 仅允许在 server/index.ts 启动日志中使用

### 废弃文件判定标准

文件被判定为废弃需同时满足：
1. CLAUDE.md 或调试文档中明确标注为废弃
2. `grep -rn "from.*该文件" src/ server/` 返回零结果
3. 不被任何运行时代码 import

满足三条即可建议删除，删除前输出确认。
