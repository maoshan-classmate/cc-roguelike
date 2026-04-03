# Hook JSON 输出格式参考（官方权威版）

## 退出码 0 = 成功（解析 JSON）

```json
{"decision": "block", "reason": "..."}
{"hookSpecificOutput": {...}}
{"additionalContext": "..."}
```

## 退出码 2 = 阻塞错误（忽略 JSON）

```bash
# stderr 反馈给 Claude
echo "Command blocked: dangerous operation" >&2
exit 2
```

## 退出码 其他 = 非阻塞错误（显示 stderr，继续执行）

```bash
echo "Warning: something went wrong" >&2
exit 1
```

## SessionStart 输出

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "行为协议文本（已转义）"
  }
}
```

## PreToolUse 输出

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|defer|ask",
    "permissionDecisionReason": "拒绝原因",
    "updatedInput": {
      "command": "替换后的命令"
    },
    "additionalContext": "可选：附加上下文"
  }
}
```

**permissionDecision 优先级**：
```
deny > defer > ask > allow
```

**updatedInput 可修改的字段**（按工具）：

| 工具 | 可修改字段 |
|------|-----------|
| Bash | `command`, `description`, `timeout`, `run_in_background` |
| Edit | `file_path`, `old_string`, `new_string` |
| Write | `file_path`, `content` |
| Read | `file_path` |
| Grep | `pattern`, `path`, `glob`, `-i`, `-n` |
| Glob | `pattern` |

## PermissionRequest 输出

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow|deny|ask",
      "updatedInput": { ... }
    }
  }
}
```

## Stop 输出

```json
{
  "decision": "block",
  "reason": "新的用户 prompt",
  "systemMessage": "系统指令（压力等级等）"
}
```

## UserPromptSubmit 输出

```json
{
  "decision": "block",
  "reason": "可选：替换用户消息"
}
```

## TaskCompleted 拒绝（exit 2）

```bash
#!/bin/bash
if ! npm test; then
  echo "Tests must pass before completing task" >&2
  exit 2
fi
exit 0
```

## JSON 转义函数

```bash
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$' '/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}
```

## MCP 工具命名

格式：`mcp__<server>__<tool>`

| 工具 | 命名 |
|------|------|
| Memory create entities | `mcp__memory__create_entities` |
| Filesystem read file | `mcp__filesystem__read_file` |
| GitHub search | `mcp__github__search_repositories` |

Matcher 示例：`"mcp__.*"` / `"mcp__memory__.*"`
