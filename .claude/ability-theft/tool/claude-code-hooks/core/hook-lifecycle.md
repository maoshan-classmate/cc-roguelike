# Hook 生命周期与事件类型（官方权威版）

## 全部 28 个 Hook 事件

| 事件 | 触发时机 | 可阻断？ | 典型用途 |
|------|---------|---------|---------|
| `SessionStart` | 会话开始/恢复/压缩后 | 否 | 注入 additionalContext |
| `UserPromptSubmit` | 用户提交提示词前 | **是**（decision: block） | 内容过滤、关键词拦截 |
| `PreToolUse` | 工具执行前 | **是**（permissionDecision） | 危险命令阻断、参数修改 |
| `PostToolUse` | 工具成功后 | 否 | 追踪、linter 触发 |
| `PostToolUseFailure` | 工具失败后 | 否 | 错误处理 |
| `PermissionRequest` | 权限对话框显示时 | **是**（behavior: allow/deny） | 自动批准/拒绝 |
| `PermissionDenied` | 自动模式拒绝工具时 | 否（retry 可重试） | 降级处理 |
| `Stop` | Claude 响应完成时 | **是**（decision: block） | 阻止退出、循环控制 |
| `StopFailure` | API 错误导致轮次结束时 | 否 | 错误通知 |
| `InstructionsLoaded` | CLAUDE.md 或规则文件加载时 | 否 | 指令文件监控 |
| `ConfigChange` | 配置文件变更时 | **是**（decision: block） | 配置变更拦截 |
| `CwdChanged` | 工作目录变更时 | 否 | 目录监控 |
| `FileChanged` | 监视文件变更时 | 否 | 文件变更监控 |
| `WorktreeCreate` | 创建 git worktree 时 | **是**（exit 2 失败） | worktree 创建验证 |
| `WorktreeRemove` | 移除 git worktree 时 | **是**（exit 2 失败） | worktree 移除验证 |
| `PreCompact` | 上下文压缩前 | 否 | 状态保存 |
| `PostCompact` | 上下文压缩完成后 | 否 | 状态恢复 |
| `SubagentStart` | 子代理启动时 | **是**（decision: block） | 子代理启动控制 |
| `SubagentStop` | 子代理完成时 | **是**（decision: block） | 子代理停止控制 |
| `TaskCreated` | TaskCreate 创建任务时 | **是**（exit 2 拒绝） | 任务命名规范强制 |
| `TaskCompleted` | 任务标记完成时 | **是**（exit 2 拒绝） | 测试门禁 |
| `TeammateIdle` | 团队成员即将空闲时 | **是**（decision: block） | 阻止空闲继续工作 |
| `Notification` | 发送通知时 | 否 | 通知分类处理 |
| `Elicitation` | MCP 征询用户输入时 | **是**（decision: block） | MCP 征询控制 |
| `ElicitationResult` | 用户响应 MCP 征询后 | **是**（decision: block） | 响应验证 |
| `SessionEnd` | 会话终止时 | 否 | 会话清理 |

## 事件分类

### 可阻断事件（可控制行为）

```
UserPromptSubmit  → 阻止提示词处理
PreToolUse       → 拒绝/修改/延迟工具调用
PermissionRequest → 批准/拒绝权限请求
SubagentStart    → 阻止子代理启动
SubagentStop     → 阻止子代理停止
TaskCreated      → 拒绝任务创建
TaskCompleted    → 阻止任务完成
Stop             → 阻止会话退出
TeammateIdle     → 阻止成员空闲
ConfigChange     → 阻止配置变更
Elicitation      → 拒绝 MCP 征询
ElicitationResult → 阻止响应处理
WorktreeCreate   → 使创建失败（exit 2）
WorktreeRemove   → 使移除失败（exit 2）
```

### 不可阻断事件（仅用于观察/通知）

```
PostToolUse / PostToolUseFailure / PermissionDenied
InstructionsLoaded / CwdChanged / FileChanged
PreCompact / PostCompact / Notification / SessionEnd
```

## SessionStart Matcher

| Matcher | 触发条件 |
|---------|---------|
| `startup` | 新会话启动 |
| `resume` | `--resume`/`--continue`/`/resume` |
| `clear` | `/clear` |
| `compact` | 自动或手动压缩 |

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/session.jsonl",
  "cwd": "/Users/...",
  "hook_event_name": "SessionStart",
  "source": "startup|resume|clear|compact",
  "model": "claude-sonnet-4-6"
}
```

## PreToolUse 输入

```json
{
  "session_id": "abc123",
  "cwd": "/Users/...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "npm test",
    "description": "Run test suite",
    "timeout": 120000,
    "run_in_background": false
  }
}
```

## PostToolUse 输入

```json
{
  "session_id": "abc123",
  "hook_event_name": "PostToolUse",
  "tool_name": "Write",
  "tool_input": { "file_path": "/path/to/file.txt", "content": "..." },
  "tool_response": { "filePath": "/path/to/file.txt", "success": true },
  "tool_use_id": "toolu_01ABC123..."
}
```

## PermissionRequest 输入

```json
{
  "session_id": "abc123",
  "hook_event_name": "PermissionRequest",
  "tool_name": "Bash",
  "tool_input": { "command": "rm -rf node_modules" },
  "permission_suggestions": [
    {
      "type": "addRules",
      "rules": [{ "toolName": "Bash", "ruleContent": "rm -rf node_modules" }],
      "behavior": "allow",
      "destination": "localSettings"
    }
  ]
}
```

## PostToolUseFailure 输入

```json
{
  "session_id": "abc123",
  "hook_event_name": "PostToolUseFailure",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test" },
  "error": "Command failed with exit code 1",
  "is_interrupt": false
}
```

## Hook 执行环境

| 项目 | 说明 |
|------|------|
| 工作目录 | 项目根目录（`$CLAUDE_PROJECT_DIR`） |
| Shell | bash（默认）或 powershell |
| 环境变量 | `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PLUGIN_DATA` / `CLAUDE_CODE_REMOTE` / `CLAUDE_PROJECT_DIR` |
| 超时 | command 默认 600s，prompt 默认 30s，agent 默认 60s |
| 输出上限 | 10,000 字符（超出保存到文件） |

## 不支持 Matcher 的事件

以下事件始终触发（matcher 字段被静默忽略）：

```
UserPromptSubmit / Stop / TeammateIdle
TaskCreated / TaskCompleted
WorktreeCreate / WorktreeRemove
CwdChanged
```

## `if` 字段仅在工具事件上有效

`if` 字段只在以下事件上评估：

```
PreToolUse / PostToolUse / PostToolUseFailure
PermissionRequest / PermissionDenied
```

其他事件带 `if` 字段的 hook 永远不会运行。

## 异步事件（不阻塞）

以下事件异步运行，退出码被忽略或仅显示给用户：

```
InstructionsLoaded / Notification / FileChanged / CwdChanged / ConfigChange
PreCompact / PostCompact / WorktreeCreate / WorktreeRemove / SessionEnd
```
