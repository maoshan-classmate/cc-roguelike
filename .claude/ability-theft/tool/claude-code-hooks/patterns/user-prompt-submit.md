# UserPromptSubmit Hook 模式

## 用途
用户提交消息时触发自定义逻辑（内容审查、关键词检测、行为注入等）。

## ⚠️ 踩坑 1：不支持 matcher

**`UserPromptSubmit` 不支持 matcher 字段，写了会被静默忽略。**

不支持 matcher 的事件完整列表：`UserPromptSubmit`、`Stop`、`TeammateIdle`、`TaskCreated`、`TaskCompleted`、`WorktreeCreate`、`WorktreeRemove`、`CwdChanged`。

> **踩坑经过**（2026-04-03）：给 UserPromptSubmit 配了中文关键词 matcher，hook 完全不触发。调查发现 matcher 被静默忽略——不是匹配失败，而是整个字段被跳过。关键词匹配必须移到脚本内部实现。

## ⚠️ 踩坑 2：数据通过 stdin JSON 传递，不是环境变量

**`UserPromptSubmit` 通过 stdin JSON 传数据，不是 `$ARGUMENTS` 环境变量。**

stdin JSON 格式：
```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/current/working/directory",
  "permission_mode": "default",
  "hook_event_name": "UserPromptSubmit",
  "prompt": "用户输入的文本"
}
```

> **踩坑经过**（2026-04-03）：脚本用 `$ARGUMENTS` 做关键词匹配，结果始终为空，脚本直接 exit 0 跳过。改为从 stdin 读 JSON 提取 prompt 后恢复正常。

## hooks.json 注册

**正确写法**（无 matcher，每次用户提交都触发，脚本内部过滤）：

```json
{
  "UserPromptSubmit": [
    {
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PROJECT_DIR}/.claude/hooks/user-prompt-handler.sh",
          "timeout": 5
        }
      ]
    }
  ]
}
```

**错误写法**（matcher 被静默忽略）：

```json
{
  "UserPromptSubmit": [
    {
      "matcher": "关键词1|关键词2",
      "hooks": [{ "type": "command", "command": "..." }]
    }
  ]
}
```

## 核心脚本模板

```bash
#!/bin/bash
set -euo pipefail

# --- Step 1: Read prompt from stdin JSON ---
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | python -c "import sys,json; print(json.load(sys.stdin).get('prompt',''))" 2>/dev/null || echo "")

# --- Step 2: Internal keyword filtering (matcher is NOT supported) ---
KEYWORDS="关键词1|关键词2|关键词3"

if [ -z "$PROMPT" ] || ! echo "$PROMPT" | grep -qiE "$KEYWORDS"; then
    exit 0
fi

# --- Step 3: Output structured hook response ---
# Plain text on stdout → injected into Claude's context
echo "检测到关键词匹配，执行自定义逻辑..."
exit 0
```

## 各 Hook 事件数据传递方式

| 事件 | 数据来源 | 关键字段 |
|------|---------|---------|
| `UserPromptSubmit` | **stdin JSON** | `prompt` |
| `PreToolUse` / `PostToolUse` | **stdin JSON** | `tool_name`, `tool_input` |
| `SessionStart` | matcher 匹配 | `startup`/`resume`/`compact` |

## 设计要点

1. **无 matcher**：UserPromptSubmit 不支持 matcher，必须脚本内部 grep 匹配
2. **stdin 读取**：用户输入通过 stdin JSON 的 `prompt` 字段传递，不是 `$ARGUMENTS`
3. **exit 0 静默跳过**：不匹配时 exit 0 即可，无输出不注入
4. **超时控制**：建议 5 秒，避免阻塞用户输入
5. **JSON 解析**：用 python/jq 从 stdin 提取字段，不要用环境变量
