---
name: gates
description: 阶段性质量关卡定义，3 级 review 模式 + 标准裁决格式
alwaysApply: true
---

# Gate 体系

## Review 模式

配置文件：`.claude/review-mode.txt`（一个词：full / lean / solo）

| 模式 | 运行什么 | 适用场景 |
|------|---------|---------|
| `full` | 所有 gate 运行 | 团队协作、学习期 |
| `lean` | 仅 PHASE-gate（默认） | 日常开发 |
| `solo` | 跳过所有 gate | 快速原型、紧急修复 |

## 标准裁决格式

| 裁决 | 含义 | 处理 |
|------|------|------|
| **APPROVE** | 无问题，继续 | 继续流程 |
| **CONCERNS [list]** | 有问题但不阻塞 | 询问用户：修订 / 接受继续 / 讨论 |
| **REJECT [blockers]** | 阻塞问题 | 停止，解决后重新审查 |

并行 gate 时：**最严裁决胜出**（一个 REJECT 覆盖所有 APPROVE）。

## Gate 定义

### P9-GATE-ARCH — 架构变更审查
- **触发**：修改 `server/` 或 `src/config/` 核心文件
- **裁决者**：P9 或用户
- **上下文**：变更文件列表、影响的系统、ADR（如有）
- **检查项**：是否影响现有接口、是否引入新依赖、是否有回归风险

### P9-GATE-SPRITE — 贴图资产审查
- **触发**：修改 sprite 3 文件中任一
- **裁决者**：sprite-audit agent
- **上下文**：sprites.ts / sprite-inventory.md / sprite-viewer.html
- **检查项**：三文件一致性、registry 完整性
- **注**：已有 sprite-audit agent，此 gate 正式化其触发时机

### P9-GATE-RELEASE — 发布前审查
- **触发**：用户要求发布/部署
- **裁决者**：P9 + tsc + E2E
- **上下文**：git diff、tsc 输出、E2E 结果
- **检查项**：编译零 error、E2E 通过、无未解决的 P0 bug

### P9-GATE-PHASE — 阶段过渡审查
- **触发**：用户要求进入新开发阶段
- **裁决者**：P9 或 P10
- **上下文**：当前阶段完成度、下阶段依赖、风险评估
- **检查项**：当前阶段验收标准是否满足、下阶段前置条件是否具备

## Gate 检查流程

1. 读取 `.claude/review-mode.txt`
2. solo → 跳过所有 gate，记录 "[GATE-ID] skipped — Solo mode"
3. lean → 仅 P9-GATE-PHASE，其余跳过
4. full → 运行所有匹配的 gate
5. 等待裁决
6. APPROVE → 继续，CONCERNS → AskUserQuestion，REJECT → 阻塞
