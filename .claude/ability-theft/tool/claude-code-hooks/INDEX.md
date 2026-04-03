---
name: claude-code-hooks
version: v2
date: 2026-04-03
level: 全部窃取
sources:
  - tanweai/pua (GitHub, hooks/ directory)
  - code.claude.com/docs/en/hooks (官方文档)
status: tested
---

# Claude Code Hooks — 行为强制注入层

> 从 Claude Code 插件中蒸馏出的 Hook 系统完整架构。可用于自行构建任何类型的行为注入 hook。

## 核心能力速查

| 能力 | 入口文件 | 一句话描述 |
|------|---------|-----------|
| Hook 生命周期与事件类型 | [core/hook-lifecycle.md](core/hook-lifecycle.md) | **28 种** hook 事件的触发时机和输入输出 |
| Hook 注册配置 | [core/hook-registration.md](core/hook-registration.md) | hooks.json 完整格式，`if`/`async`/`http`/`agent` 字段 |
| Hook 输出协议 | [core/hook-output-protocol.md](core/hook-output-protocol.md) | exit code 含义，permissionDecision/decision 字段 |
| JSON 输出格式参考 | [reference/json-output-format.md](reference/json-output-format.md) | 所有事件类型的完整 JSON 输出格式 |
| 环境变量与路径 | [reference/environment-variables.md](reference/environment-variables.md) | 官方环境变量、跨平台 stat、工具字段格式 |
| 状态管理 | [rules/state-management.md](rules/state-management.md) | 跨调用状态持久化、会话隔离、计数器 |
| 风味系统 | [rules/flavor-system.md](rules/flavor-system.md) | 可配置的 13 种行为风格 |
| 错误检测 | [rules/error-detection.md](rules/error-detection.md) | 从 Bash 输出中检测失败的信号模式 |
| SessionStart 模式 | [patterns/session-start.md](patterns/session-start.md) | 会话启动时注入行为协议 |
| PostToolUse 模式 | [patterns/post-tool-use.md](patterns/post-tool-use.md) | 工具调用后检测失败并升级 |
| UserPromptSubmit 模式 | [patterns/user-prompt-submit.md](patterns/user-prompt-submit.md) | 用户输入匹配时激活行为 |
| Stop Hook 模式 | [patterns/stop-hook.md](patterns/stop-hook.md) | 阻止会话退出、循环控制 |
| PreToolUse 模式 | [patterns/pre-tool-use.md](patterns/pre-tool-use.md) | 工具执行前阻断/修改/延迟权限 |
| PreCompact 模式 | [patterns/pre-compact.md](patterns/pre-compact.md) | 压缩前保存运行时状态 |
| Loop 控制 | [patterns/loop-control.md](patterns/loop-control.md) | Stop hook 高级用法：自动迭代循环 |
| Context 注入机制 | [mechanisms/context-injection.md](mechanisms/context-injection.md) | additionalContext JSON 注入原理 |
| 压力升级 | [mechanisms/pressure-escalation.md](mechanisms/pressure-escalation.md) | L1-L4 四级递增加压 |
| 状态持久化 | [mechanisms/state-persistence.md](mechanisms/state-persistence.md) | 跨 compaction 恢复运行时状态 |
| 风味路由 | [mechanisms/flavor-routing.md](mechanisms/flavor-routing.md) | 任务类型→方法论自动映射 |

## 快速入口

**我要创建一个新的 hook：**
1. 读 [core/hook-lifecycle.md](core/hook-lifecycle.md) 选事件类型
2. 读 [core/hook-registration.md](core/hook-registration.md) 写 hooks.json
3. 读 [core/hook-output-protocol.md](core/hook-output-protocol.md) 确认输出格式
4. 参考 [scripts/](scripts/) 中的模板脚本

**我要实现类似 PUA 的行为强制：**
1. 读 [mechanisms/context-injection.md](mechanisms/context-injection.md)
2. 读 [mechanisms/pressure-escalation.md](mechanisms/pressure-escalation.md)
3. 读 [patterns/session-start.md](patterns/session-start.md) 作参考

**我要实现自动迭代循环：**
1. 读 [patterns/loop-control.md](patterns/loop-control.md)
2. 读 [mechanisms/state-persistence.md](mechanisms/state-persistence.md)

## 依赖

| 依赖 | 用途 | 是否必须 |
|------|------|---------|
| bash | 脚本执行 | 是 |
| python3 | JSON 解析、配置读取、数据脱敏 | 大部分 hook 需要 |
| jq | JSON 解析（Stop hook） | 仅 loop/stop 需要 |
| perl | 多行文本提取（正则） | 仅 loop 控制需要 |

## 版本历史

- v2 (2026-04-03): 整合官方文档，扩充 28 事件/14 可阻断/PermissionRequest/PreToolUse 完整决策机制
- v1 (2026-04-03): 全部窃取，8 个 hook 脚本 + 配置文件完整分析

## 冲突裁决记录

| 冲突点 | v1 实现 | 官方文档 | 裁决 |
|--------|---------|---------|------|
| 可阻断事件数量 | 仅 Stop 可阻断 | **14 个事件可阻断** | 以官方为准，v1 为参考 |
