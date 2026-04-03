# Hook 输出协议（官方权威版）

## 退出码含义

| 退出码 | 含义 | JSON 处理 |
|--------|------|---------|
| `0` | 成功 | 解析 stdout 中的 JSON |
| `2` | 阻塞错误 | 忽略 stdout 和 JSON，stderr 反馈给 Claude |
| 其他非零 | 非阻塞错误 | 显示 stderr，执行继续 |

> ⚠️ **关键**：退出码 2 时任何 JSON 都会被忽略。只在 exit 0 时处理 JSON。

## 三种输出类型

### 1. 纯文本 stdout

最简单的形式。脚本输出纯文本，Claude Code 将其作为上下文注入。

```bash
cat << EOF
[警告：检测到危险命令]
> rm -rf 操作需要二次确认
EOF
```

### 2. additionalContext JSON（SessionStart 专用）

输出 `hookSpecificOutput` JSON，注入不可变行为协议。

```bash
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$escaped"
```

**特点**：additionalContext 优先级最高，不可被覆盖。

### 3. Top-level Decision JSON

用于 UserPromptSubmit / PostToolUse / Stop 等事件。

```json
{
  "decision": "block",
  "reason": "阻止原因或新的用户消息",
  "hookSpecificOutput": {
    "hookSpecificOutput": {
      "additionalContext": "附加上下文"
    }
  }
}
```

| 字段 | 用于事件 | 说明 |
|------|---------|------|
| `decision: "block"` | UserPromptSubmit | 阻止提示词处理 |
| `reason` | Stop | 作为新用户消息发送 |
| `additionalContext` | SessionStart | 注入行为协议 |

## PreToolUse 专用输出格式

PreToolUse 使用 `hookSpecificOutput` 而非 top-level 字段：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|defer|ask",
    "permissionDecisionReason": "拒绝原因说明",
    "updatedInput": { "command": "npm run lint" },
    "additionalContext": "附加上下文"
  }
}
```

**字段优先级**：`deny` > `defer` > `ask` > `allow`

**`updatedInput` 示例**（自动改写命令）：

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {
      "command": "npm run lint"
    }
  }
}
```

**`defer` 限制**：
- 仅在 `-p`（非交互）模式下生效
- 需要 Claude Code v2.1.89+
- 仅当 Claude 单次工具调用时有效
- 恢复时不保留权限模式

## PermissionRequest 专用输出格式

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow|deny|ask",
      "updatedInput": { "command": "npm run lint" }
    }
  }
}
```

## Stop 专用输出格式

### 允许退出

不输出任何内容 + `exit 0`。

### 阻止退出（循环控制）

```json
{
  "decision": "block",
  "reason": "继续循环的 prompt",
  "systemMessage": "迭代压力信息"
}
```

## 决策字段速查表

| 事件 | 使用的字段 |
|------|-----------|
| SessionStart | `additionalContext`（在 hookSpecificOutput 内） |
| UserPromptSubmit | `decision: "block"` |
| PreToolUse | `permissionDecision` / `updatedInput`（在 hookSpecificOutput 内） |
| PermissionRequest | `behavior` / `updatedInput`（在 hookSpecificOutput 内） |
| Stop | `decision: "block"` / `reason` / `systemMessage` |
| SubagentStart/Stop | `decision: "block"` |
| TaskCreated/Completed | exit 2 = 拒绝 |
| TeammateIdle | `decision: "block"` |
| ConfigChange | `decision: "block"` |

## JSON 转义

在 shell 中构造 JSON 时必须转义：

```bash
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}
```

## 输出上限

Hook 输出（additionalContext / systemMessage / 纯 stdout）上限为 **10,000 字符**。超出时保存到文件，替换为预览和文件路径。

## Shell 配置干扰

如果 shell 配置文件（`.bashrc` 等）在启动时打印文本，会干扰 JSON 解析。

> ⚠️ 确保 hook 脚本的 stdout 只包含 JSON 对象，不要在 stdout 输出任何非 JSON 文本。
