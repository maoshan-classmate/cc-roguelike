# SessionStart Hook 模式

## 用途
会话启动时注入行为协议或恢复运行时状态。

## hooks.json 注册

```json
{
  "SessionStart": [
    {
      "matcher": "startup|resume",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-restore.sh",
          "timeout": 5
        }
      ]
    },
    {
      "matcher": "compact",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-restore.sh",
          "timeout": 5
        }
      ]
    }
  ]
}
```

## 两种注入方式

### 方式 1：additionalContext JSON（系统级注入）

输出 `hookSpecificOutput` JSON，内容作为**不可变行为协议**注入。

```bash
escaped=$(escape_for_json "$PROTOCOL_TEXT")
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$escaped"
```

**特点**：Claude 将其视为系统级约束，不可忽略。适用于强制行为协议。

### 方式 2：纯文本 stdout（上下文注入）
直接输出文本，Claude 将其视为上下文补充。

```bash
cat << EOF
[系统提示]
这是建议性内容...
EOF
```

**特点**：Claude 可以选择是否遵循.适用于建议性提示。

## 完整脚本模板

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/style-helper.sh"
load_style

# JSON 转义函数
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

CONFIG="${HOME:-~}/.hook-config/config.json"
JOURNAL="${HOME:-~}/.hook-config/state-journal.md"
context_parts=""

# 1. 检查配置 → 注入行为协议
if [ -f "$CONFIG" ]; then
  always_on=$(python3 -c "import os,json; print(json.load(open(os.path.expanduser('~/.hook-config/config.json'))).get('always_on', False))" 2>/dev/null)
  if [ "$always_on" = "True" ]; then
    read -r -d '' PROTOCOL << 'EOF' || true
<EXTREMELY_IMPORTANT>
[行为协议标题]
协议内容...
支持变量替换：STYLE_PLACEHOLDER → 实际值
</EXTREMELY_IMPORTANT>
EOF
    PROTOCOL="${PROTOCOL//STYLE_PLACEHOLDER/${STYLE_NAME} ${STYLE_ICON}}"
    context_parts="${PROTOCOL}"
  fi
fi

# 2. 检查 compaction journal → 恢复状态
if [ -f "$JOURNAL" ]; then
  age=$(( $(date +%s) - $(stat -c %Y "$JOURNAL") ))
  if [ "$age" -le 7200 ]; then
    context_parts="${context_parts}[恢复指令]"
  fi
fi

# 3. 无内容则不干预
if [ -z "$context_parts" ]; then
  exit 0
fi

# 4. 输出 JSON
escaped=$(escape_for_json "$context_parts")
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$escaped"
exit 0
```

## Matcher 选项
| matcher | 触发时机 |
|---------|---------|
| `startup` | 新会话启动 |
| `resume` | 恢复已有会话 |
| `compact` | 上下文压缩后恢复 |
| `startup\|resume` | 启动或恢复（不含 compact） |
| `*` | 所有 SessionStart 事件 |
| 设计要点
1. **条件注入**：先检查配置/状态，无内容时不输出（静默通过）
2. **多段合并**：可以拼接多段内容到同一个 additionalContext
3. **超时控制**：SessionStart hook 通常设置 5 秒超时
4. **变量替换**：先构造模板文本，再用 `${var//PLACEHOLDER/value}` 替换
5. **幂等安全**：多次调用不应产生累积副作用
