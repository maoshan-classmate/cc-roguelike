# Stop Hook 模式

## 用途
会话即将结束时阻止退出或收集反馈。

## hooks.json 注册

```json
{
  "Stop": [
    {
      "matcher": "*",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/loop-control.sh"
        },
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/stop-feedback.sh",
          "timeout": 10
        }
      ]
    }
  ]
}
```

**注意**：Stop hook 不设 timeout（或设较大值），因为它需要读取 transcript 文件。

## 两种行为
### 行为 1：允许退出（默认）
脚本不输出任何内容或输出非 block JSON，会话正常结束。

```bash
# 无活跃 loop → 允许退出
if [[ ! -f "$STATE_FILE" ]]; then
  exit 0
fi
```

### 行为 2：阻止退出（block）
输出 JSON，Claude Code 不退出，将 `reason` 作为新 prompt 发送给 Claude。

```bash
jq -n \
  --arg prompt "$PROMPT_TEXT" \
  --arg msg "$SYSTEM_MSG" \
  '{
    "decision": "block",
    "reason": $prompt,
    "systemMessage": $msg
  }'
```

## Block JSON 字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `decision` | string | `"block"` = 阻止退出 |
| `reason` | string | 作为用户消息发送给 Claude 的内容 |
| `systemMessage` | string | 作为系统消息注入的内容（干预等级等） |

## Hook 输入

Stop hook 的 stdin JSON 包含：

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/session.jsonl"
}
```

`transcript_path` 指向 JSONL 文件（每行一个 JSON），包含完整对话历史。

## Transcript 读取

```bash
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path')

# 提取最后一条 assistant 消息
LAST_LINES=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" | tail -n 100)
LAST_OUTPUT=$(echo "$LAST_LINES" | jq -rs '
  map(.message.content[]? | select(.type == "text") | .text) | last // ""
' 2>&1)
```

**注意**：
- JSONL 格式：每行一个独立的 JSON 对象
- `content` 是数组，包含多个 block（text/tool_use/thinking）
- 取最后 100 行 assistant 消息，避免大 session 超时
- 用 `jq -rs`（slurp 模式）处理多行

## 反馈收集模式

Stop hook 还可以用于会话结束时收集反馈：

```bash
# 检查 hook 是否在本次会话中触发过
if ! grep -qE '<HOOK_ACTIVE_TAG>' "$TRANSCRIPT_PATH" 2>/dev/null; then
  exit 0  # 未触发 → 不收集反馈
fi

# 频率控制
count=$((count + 1))
echo "$count" > "$COUNTER"
[ $((count % FREQUENCY)) -ne 0 ] && exit 0

# 输出反馈收集指令（纯文本，Claude 会执行）
cat << 'FEEDBACK'
执行以下反馈流程：
1. 用 AskUserQuestion 询问满意度
2. 根据选择上传数据或记录本地
FEEDBACK
```

## 设计要点

1. **双 hook 排序**：loop-control 在 feedback 之前（先检查循环，再收集反馈）
2. **transcript 路径**：必须从 stdin JSON 读取，不能猜测
3. **jq 依赖**：Stop hook 需要 jq 解析 JSONL
4. **频率控制**：反馈收集使用模运算控制触发频率
5. **会话检查**：只在 hook 实际触发的会话中收集反馈
