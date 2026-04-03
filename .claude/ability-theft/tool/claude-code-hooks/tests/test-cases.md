# 实战测试集

测试定义时间：2026-04-03
模式：单资源
等级：complete

## 边界场景识别记录

**识别到的边界场景：**
1. Windows CRLF 兼容性 — 来源：loop-control hook（tr -d '\r' 处理）
2. python3/jq 缺失时的降级处理 — 来源：failure-detector, stop-feedback
3. SessionStart additionalContext vs 纯文本 stdout 的优先级差异 — 来源：session-restore
4. Stop hook 的 decision:block 阻止退出机制 — 来源：loop-control
5. 会话隔离（session_id 绑定）— 来源：failure-detector, loop-control
6. Compaction 后状态恢复的 2 小时过期机制 — 来源：session-restore

**核心能力点：**
1. hooks.json 注册格式和 matcher 规则 — 来源：hooks/hooks.json
2. additionalContext JSON 注入机制 — 来源：hooks/session-restore
3. 配置风格路由的共享 source 模式 — 来源：hooks/style-helper
4. 失败检测 + 计数器 + 分级干预闭环 — 来源：hooks/failure-detector
5. Loop 控制（Stop hook block + 状态文件 + transcript 读取）— 来源：hooks/loop-control

## 测试用例

### TC-01：创建一个基础的 SessionStart hook
**目标任务：** 用能力库中的知识，从零创建一个 SessionStart hook，注入自定义行为协议
**预期入口：** core/hook-registration.md → patterns/session-start.md → mechanisms/context-injection.md
**成功标准：** 能写出 hooks.json + session-start.sh，输出正确的 additionalContext JSON
**类型：** 核心能力
**结果：** 待验证

### TC-02：创建一个 PostToolUse 失败检测 hook
**目标任务：** 创建一个 PostToolUse hook，检测 Bash 工具的连续失败，在 3 次失败时输出升级干预
**预期入口：** patterns/post-tool-use.md → rules/error-detection.md → mechanisms/pressure-escalation.md
**成功标准：** hook 能正确读取 tool_result、检测错误信号、维护失败计数器、在阈值输出升级文本
**类型：** 核心能力
**结果：** 待验证

### TC-03：实现 Stop hook 的自动循环控制
**目标任务：** 创建 Stop hook + 状态文件，实现 Claude 自动迭代循环（block → 重发 prompt → 检测 <promise> 完成信号）
**预期入口：** patterns/loop-control.md → patterns/stop-hook.md
**成功标准：** 状态文件 frontmatter 解析正确、transcript 读取正常、信号检测工作、迭代计数更新
**类型：** 核心能力
**结果：** 待验证

### TC-04：Windows CRLF 兼容性处理
**目标任务：** 在 Windows 环境下处理状态文件的 CRLF 问题，确保 sed/awk 正确匹配
**预期入口：** rules/state-management.md（CRLF 处理节）
**成功标准：** 在 Windows 上读写状态文件不出现匹配失败
**类型：** 边界场景
**结果：** 待验证

### TC-05：配置风格路由共享 source 模式
**目标任务：** 创建 style-helper.sh，多个 hook 脚本共享，通过 config.json 配置当前风格
**预期入口：** mechanisms/flavor-routing.md → scripts/
**成功标准：** load_style() 正确读取配置、设置环境变量、各 hook 能使用风格变量
**类型：** 核心能力
**结果：** 待验证

### TC-06：PreCompact + SessionStart 状态持久化闭环
**目标任务：** 实现 PreCompact prompt 保存状态 → SessionStart 恢复状态的完整闭环
**预期入口：** mechanisms/state-persistence.md
**成功标准：** compaction 前状态写入 state-journal.md，compaction 后 SessionStart hook 正确恢复
**类型：** 边界场景
**结果：** 待验证
