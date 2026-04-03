# PreToolUse Hook 模式

## 用途

在工具执行前阻断危险操作、修改工具参数、或延迟权限请求。

## 核心能力

| 能力 | 说明 |
|------|------|
| **阻断** | `permissionDecision: "deny"` 阻止工具执行 |
| **修改** | `updatedInput` 改写工具输入参数 |
| **延迟** | `permissionDecision: "defer"` 延迟权限请求（仅 `-p` 非交互模式） |
| **询问** | `permissionDecision: "ask"` 将权限请求转给用户确认 |

**优先级**：`deny` > `defer` > `ask` > `allow`

## hooks.json 注册

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash|Edit|Write",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PROJECT_DIR}/.claude/hooks/security-check.sh",
          "timeout": 30,
          "statusMessage": "检查命令安全性..."
        }
      ]
    },
    {
      "matcher": "mcp__.*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PROJECT_DIR}/.claude/hooks/mcp-gate.sh"
        }
      ]
    }
  ]
}
```

**matcher 示例**：

| matcher | 匹配范围 |
|---------|---------|
| `Bash` | 所有 Bash 工具调用 |
| `Edit\|Write` | 所有 Edit 和 Write 调用 |
| `mcp__.*` | 所有 MCP 工具 |
| `mcp__github__.*` | GitHub MCP server 的所有工具 |
| `mcp__memory__create_entities` | 特定 MCP 工具 |

## Hook 输入

```json
{
  "session_id": "abc123",
  "cwd": "/Users/...",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf node_modules",
    "description": "Remove node_modules directory",
    "timeout": 120000,
    "run_in_background": false
  }
}
```

## 阻断危险命令

```bash
#!/bin/bash
HOOK_INPUT=$(cat)
COMMAND=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command')

# 危险命令检测
DANGEROUS_PATTERNS="rm -rf|git push --force|drop table|chmod 777"

if echo "$COMMAND" | grep -Eq "$DANGEROUS_PATTERNS"; then
  # 拒绝执行
  jq -n \
    --arg reason "危险命令已阻断：$COMMAND\n如需执行，请拆分任务并明确授权。" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": $reason,
        "additionalContext": "检测到潜在破坏性操作。Claude 拒绝了此请求。"
      }
    }'
  exit 0
fi

# 允许执行
jq -n '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
```

## 修改工具参数（updatedInput）

### 示例 1：自动添加 lint

```bash
#!/bin/bash
HOOK_INPUT=$(cat)
TOOL=$(echo "$HOOK_INPUT" | jq -r '.tool_name')
COMMAND=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command // empty')

# Bash npm 脚本 → 自动追加 lint 验证
if [[ "$TOOL" == "Bash" ]] && echo "$COMMAND" | grep -qE '^npm run (build|test|deploy)'; then
  MODIFIED=$(echo "$COMMAND" | sed 's/\(npm run \(build\|test\|deploy\)\)/\1 \&\& npm run lint/')
  jq -n \
    --arg cmd "$MODIFIED" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "updatedInput": {"command": $cmd}
      }
    }'
  exit 0
fi

jq -n '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
```

### 示例 2：路径安全检查 + 强制 gitignore

```bash
#!/bin/bash
HOOK_INPUT=$(cat)
TOOL=$(echo "$HOOK_INPUT" | jq -r '.tool_name')
FPATH=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // empty')

# Write 到敏感路径 → 拒绝
if [[ "$TOOL" == "Write" ]] && echo "$FPATH" | grep -qE '^\/(etc|usr|var|opt)\/'; then
  jq -n \
    --arg path "$FPATH" \
    --arg reason "禁止写入系统目录：$path" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": $reason
      }
    }'
  exit 0
fi

# Write → 自动追加 .gitignore 检查
if [[ "$TOOL" == "Write" ]]; then
  # 自动添加 gitignore 验证
  jq -n '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
  exit 0
fi

jq -n '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
```

### updatedInput 可修改字段（按工具）

| 工具 | 可修改字段 |
|------|-----------|
| Bash | `command`, `description`, `timeout`, `run_in_background` |
| Edit | `file_path`, `old_string`, `new_string` |
| Write | `file_path`, `content` |
| Read | `file_path` |
| Grep | `pattern`, `path`, `glob`, `-i`, `-n` |
| Glob | `pattern` |

## defer 延迟权限

```bash
#!/bin/bash
HOOK_INPUT=$(cat)
COMMAND=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command')

# 高风险命令 → 延迟（仅 -p 非交互模式生效）
if echo "$COMMAND" | grep -qE 'rm -rf|sudo|chmod'; then
  jq -n \
    --arg reason "高风险命令已延迟" \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "defer",
        "permissionDecisionReason": $reason
      }
    }'
  exit 0
fi

jq -n '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
```

**defer 限制**：
- 仅在 `-p`（非交互）模式下生效
- 需要 Claude Code v2.1.89+
- 仅当 Claude 单次工具调用时有效
- 恢复时不保留权限模式

## `if` 字段（工具事件专用）

`if` 字段提供比 `matcher` 更细粒度的条件过滤，只在 `PreToolUse`/`PostToolUse`/`PermissionRequest` 上有效。

```json
{
  "PreToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "if": "Bash(rm *)",
          "command": "bash block-rm.sh"
        },
        {
          "type": "command",
          "if": "Bash(git *)",
          "command": "bash git-log.sh"
        }
      ]
    }
  ]
}
```

**语法**：`ToolName(pattern)`，pattern 支持 glob 风格通配符。

| `if` 字段 | 匹配 |
|-----------|------|
| `Bash(git *)` | 所有 git 命令 |
| `Bash(rm -rf *)` | 所有 rm -rf 命令 |
| `mcp__.*` | 所有 MCP 工具 |

## 设计要点

1. **matcher 优先于 `if`**：matcher 在第一层过滤，`if` 在第二层过滤
2. **始终输出 JSON**：即使允许执行也要输出 `permissionDecision: "allow"` + `exit 0`
3. **defer 仅 -p 有效**：非交互模式才生效，不要依赖 defer 做关键权限控制
4. **updatedInput 只能改已有字段**：不能添加新字段
5. **exit 2 = 忽略 JSON**：如果脚本出错且需要阻止执行，用 `exit 2` + stderr
6. **超时设置**：PreToolUse 默认 600s，建议设 30s 避免阻断用户操作
