# Loop 控制模式（Stop Hook 高级用法）

## 模式类型
Stop hook + 状态文件 + transcript 读取

## 工作原理

Stop hook 是 Claude Code 中**唯一能阻止会话退出**的 hook。通过输出 `decision: block` JSON，hook 可以：
1. 阻止 Claude Code 关闭
2. 将上一轮的 prompt 重新发送给 Claude
3. 附带系统消息（干预等级、迭代计数等）
4. 实现"自动迭代循环"

```
Claude 完成输出 → Stop hook 触发
    → 读取 loop 状态文件 (.claude/loop-state.local.md)
    → 检查是否活跃 + 会话匹配
    → 读取 transcript 获取上一轮输出
    → 检查完成信号（<promise>xxx</promise>）
    → 未完成 → 输出 decision: block JSON
    → Claude Code 不退出，以 reason 字段内容作为新 prompt
    → Claude 继续工作
    → ...循环...
    → 检测到 <promise>xxx</promise> → 删除状态文件 → 允许退出
```

## 状态文件格式

```markdown
---
active: true
iteration: 3
max_iterations: 10
completion_promise: "所有测试通过"
session_id: abc123
---

你的循环 prompt 内容...
每轮会以 reason 字段发送给 Claude
```

## 核心实现

### 1. 读取 hook 输入和状态

```bash
HOOK_INPUT=$(cat)
LOOP_STATE_FILE=".claude/loop-state.local.md"

# 无状态文件 → 允许退出
[[ ! -f "$LOOP_STATE_FILE" ]] && exit 0

# 规范化 CRLF（Windows 兼容）
TEMP_NORM="${LOOP_STATE_FILE}.norm.$$"
tr -d '\r' < "$LOOP_STATE_FILE" > "$TEMP_NORM" && mv "$TEMP_NORM" "$LOOP_STATE_FILE"
```

### 2. 解析 frontmatter

```bash
FRONTMATTER=$(sed -n '/^---$/,/^---$/{ /^---$/d; p; }' "$LOOP_STATE_FILE" | tr -d '\r')
LOOP_ACTIVE=$(echo "$FRONTMATTER" | grep '^active:' | sed 's/active: *//' || true)
ITERATION=$(echo "$FRONTMATTER" | grep '^iteration:' | sed 's/iteration: *//' || true)
MAX_ITERATIONS=$(echo "$FRONTMATTER" | grep '^max_iterations:' | sed 's/max_iterations: *//' || true)
COMPLETION_PROMISE=$(echo "$FRONTMATTER" | grep '^completion_promise:' | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/' || true)
STATE_SESSION=$(echo "$FRONTMATTER" | grep '^session_id:' | sed 's/session_id: *//' || true)
```

### 3. 会话隔离

```bash
HOOK_SESSION=$(echo "$HOOK_INPUT" | jq -r '.session_id // ""')

# 无 session_id → 绑定当前会话
if [[ -z "$STATE_SESSION" ]] && [[ "$HOOK_SESSION" != "" ]]; then
  TEMP_FILE="${LOOP_STATE_FILE}.tmp.$$"
  sed "s/^session_id:.*/session_id: $HOOK_SESSION/" "$LOOP_STATE_FILE" > "$TEMP_FILE"
  mv "$TEMP_FILE" "$LOOP_STATE_FILE"
  STATE_SESSION="$HOOK_SESSION"
fi

# 不同会话 → 不干预
if [[ -n "$STATE_SESSION" ]] && [[ "$STATE_SESSION" != "$HOOK_SESSION" ]]; then
  exit 0
fi
```

### 4. 读取 transcript

```bash
TRANSCRIPT_PATH=$(echo "$HOOK_INPUT" | jq -r '.transcript_path')

# 提取最后一条 assistant 消息的文本
LAST_LINES=$(grep '"role":"assistant"' "$TRANSCRIPT_PATH" | tail -n 100)
LAST_OUTPUT=$(echo "$LAST_LINES" | jq -rs '
  map(.message.content[]? | select(.type == "text") | .text) | last // ""
' 2>&1)
```

### 5. 信号检测

```bash
# 终止信号
ABORT_TEXT=$(echo "$LAST_OUTPUT" | perl -0777 -ne 'if (/<loop-abort>(.*?)<\/loop-abort>/s) { $t=$1; $t=~s/^\s+|\s+$//g; print $t }' 2>/dev/null || echo "")

# 暂停信号
PAUSE_TEXT=$(echo "$LAST_OUTPUT" | perl -0777 -ne 'if (/<loop-pause>(.*?)<\/loop-pause>/s) { $t=$1; $t=~s/^\s+|\s+$//g; print $t }' 2>/dev/null || echo "")

# 完成信号
PROMISE_TEXT=$(echo "$LAST_OUTPUT" | perl -0777 -pe 's/.*?<promise>(.*?)<\/promise>.*/$1/s; s/^\s+|\s+$//g; s/\s+/ /g' 2>/dev/null || echo "")
if [[ "$PROMISE_TEXT" = "$COMPLETION_PROMISE" ]]; then
  rm "$LOOP_STATE_FILE"
  exit 0  # 允许退出
fi
```

### 6. 迭代计数和干预提示

```bash
NEXT_ITERATION=$((ITERATION + 1))

# 提示随迭代升级
if [[ $NEXT_ITERATION -le 3 ]]; then
  HINT="继续推进，逐步验证"
elif [[ $NEXT_ITERATION -le 7 ]]; then
  HINT="切换方案，禁止重试相同路径"
elif [[ $NEXT_ITERATION -le 15 ]]; then
  HINT="强制深入根因分析，出示证据链"
elif [[ $NEXT_ITERATION -le 25 ]]; then
  HINT="即将达到最大迭代数，必须收敛"
else
  HINT="最后一轮，穷尽所有工具后输出结论"
fi
```

### 7. 输出 block JSON

```bash
# 提取 prompt 正文（frontmatter 之后的内容）
PROMPT_TEXT=$(awk '/^---$/{i++; next} i>=2' "$LOOP_STATE_FILE")

# 更新迭代计数
TEMP_FILE="${LOOP_STATE_FILE}.tmp.$$"
sed "s/^iteration: .*/iteration: $NEXT_ITERATION/" "$LOOP_STATE_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$LOOP_STATE_FILE"

# 输出阻止退出的 JSON
jq -n \
  --arg prompt "$PROMPT_TEXT" \
  --arg msg "$SYSTEM_MSG" \
  '{
    "decision": "block",
    "reason": $prompt,
    "systemMessage": $msg
  }'
```

## 三种控制信号
| 信号 | Claude 输出 | 效果 |
|------|-----------|------|
| `<loop-abort>原因</loop-abort>` | 终止循环 | 删除状态文件，允许退出 |
| `<loop-pause>需要什么</loop-pause>` | 暂停循环 | 设置 active=false，保留文件 |
| `<promise>文本</promise>` | 完成循环 | 匹配时删除文件，允许退出 |

## 设计要点

1. **项目级状态**：`.claude/loop-state.local.md` 在项目根目录，非用户目录
2. **会话绑定**：`session_id` 确保只有启动 loop 的会话能控制它
3. **CRLF 处理**：Windows 上必须 tr -d '\r'，否则 sed 匹配失败
4. **tail -n 100**：限制 transcript 读取量，避免大 session 超时
5. **原子更新**：临时文件 + mv 确保状态文件完整性
6. **信号优先级**：abort > pause > promise
