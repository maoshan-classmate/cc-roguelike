# PostToolUse Hook 模式

## 用途
工具调用完成后检测失败，跟踪状态，升级干预等级。

## hooks.json 注册
```json
{
  "PostToolUse": [
    {
      "matcher": "Bash",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/failure-detector.sh",
          "timeout": 5
        }
      ]
    }
  ]
}
```

**注意**：`PostToolUse` 的 matcher 匹配的是**工具名称**（精确字符串），不是正则。`"Bash"` 只匹配 Bash 工具。`"*"` 匹配所有工具。

## 核心逻辑

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/style-helper.sh"
load_style

# 读取 hook 输入
HOOK_INPUT=$(cat)

# 1. 过滤：只处理 Bash 工具
TOOL_NAME=$(echo "$HOOK_INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")
if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

# 2. 提取工具结果
TOOL_RESULT=$(echo "$HOOK_INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
result = data.get('tool_result', '')
if isinstance(result, dict):
    result = result.get('content', result.get('text', str(result)))
print(str(result)[:2000])
" 2>/dev/null || echo "")

# 3. 错误检测
IS_ERROR="false"
if echo "$TOOL_RESULT" | grep -qiE 'error|Error|ERROR|exit code [1-9]|FAILED|fatal:|Traceback|Exception:'; then
  IS_ERROR="true"
fi

# 4. 会话隔离 + 计数器
COUNTER_FILE="${HOME:-~}/.hook-config/.failure_count"
SESSION_FILE="${HOME:-~}/.hook-config/.failure_session"
CURRENT_SESSION=$(echo "$HOOK_INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id','unknown'))" 2>/dev/null || echo "unknown")
STORED_SESSION=""
[ -f "$SESSION_FILE" ] && STORED_SESSION=$(cat "$SESSION_FILE" 2>/dev/null || echo "")

if [ "$CURRENT_SESSION" != "$STORED_SESSION" ]; then
  echo "0" > "$COUNTER_FILE"
  echo "$CURRENT_SESSION" > "$SESSION_FILE"
fi

COUNT=0
[ -f "$COUNTER_FILE" ] && COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
[ -z "$COUNT" ] && COUNT=0

# 5. 更新计数
if [ "$IS_ERROR" = "true" ]; then
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$COUNTER_FILE"
else
  if [ "$COUNT" -gt 0 ]; then
    echo "0" > "$COUNTER_FILE"
  fi
  exit 0
fi

# 6. 等级路由
if [ "$COUNT" -lt 2 ]; then exit 0; fi

if [ "$COUNT" -eq 2 ]; then
  cat << EOF
[Intervention L1 ${STYLE_ICON} — 检测到连续失败]
> ${INTERVENTION_L1}

强制动作...
当前配置: ${STYLE_NAME} ${STYLE_ICON}
EOF
elif [ "$COUNT" -eq 3 ]; then
  # L2 输出...
elif [ "$COUNT" -eq 4 ]; then
  # L3 输出...
else
  # L4 输出...
fi

exit 0
```

## 输出格式

PostToolUse hook 的输出是**纯文本 stdout**（不是 JSON）。Claude Code 将其作为上下文注入。

格式规范：
```
[等级标签 图标 — 触发原因]

> 干预提示文本（引用块格式）

强制动作：
- [ ] 动作 1
- [ ] 动作 2

当前配置: style_name 图标
```

## 设计要点

1. **只监控 Bash**：其他工具（Read/Write/Grep）不触发失败检测
2. **首次不干预**：COUNT < 2 时静默通过
3. **成功重置**：任何一次成功都将计数器归零
4. **超时 5 秒**：PostToolUse 不应阻塞过久
5. **防御性解析**：python3 解析失败时 fallback 到空字符串
