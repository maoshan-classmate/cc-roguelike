# 状态管理规则

## 狀態文件约定

| 文件路径 | 用途 | 生命周期 |
|---------|------|---------|
| `~/.hook-config/.failure_count` | 连续失败计数器 | 单次连续失败期间，成功后重置为 0 |
| `~/.hook-config/.failure_session` | 当前会话 ID | 跨调用持久，新会话时更新 |
| `~/.hook-config/.stop_counter` | Stop 触发计数（控制反馈频率） | 永久累加 |
| `~/.hook-config/config.json` | 用户配置（风格、always_on 等） | 用户手动管理 |
| `~/.hook-config/state-journal.md` | 运行时状态快照（compaction 前保存） | compaction 后恢复，2 小时过期 |
| `.claude/loop-state.local.md` | Loop 控制状态文件 | 项目级，loop 结束时删除 |

## 会话隔离规则

```bash
# 读取当前 hook 的 session_id
CURRENT_SESSION=$(echo "$HOOK_INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id','unknown'))" 2>/dev/null || echo "unknown")

# 对比已保存的 session
STORED_SESSION=""
[ -f "$SESSION_FILE" ] && STORED_SESSION=$(cat "$SESSION_FILE" 2>/dev/null || echo "")

# 新会话 → 重置计数器
if [ "$CURRENT_SESSION" != "$STORED_SESSION" ]; then
  echo "0" > "$COUNTER_FILE"
  echo "$CURRENT_SESSION" > "$SESSION_FILE"
fi
```

**关键**：状态文件路径在 `~/.hook-config/` 下，跨所有项目共享。如果需要项目级隔离，改用项目目录下的路径。

## 计数器模式

### 递增模式（失败检测）

```bash
COUNT=0
[ -f "$COUNTER_FILE" ] && COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
[ -z "$COUNT" ] && COUNT=0

if [ "$IS_ERROR" = "true" ]; then
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$COUNTER_FILE"
else
  # 成功时重置
  if [ "$COUNT" -gt 0 ]; then
    echo "0" > "$COUNTER_FILE"
  fi
  exit 0
fi
```

### 模运算模式（频率控制）

```bash
count=$((count + 1))
echo "$count" > "$COUNTER"

# 每 N 次触发一次
[ $((count % FREQUENCY)) -ne 0 ] && exit 0
```

## Loop 状态文件格式

Loop 控制使用项目级的 `.claude/loop-state.local.md`，格式为 YAML frontmatter + prompt 正文：

```markdown
---
active: true
iteration: 3
max_iterations: 10
completion_promise: "所有测试通过"
session_id: abc123
---

你的循环 prompt 内容写在这里...
```

**字段说明**：
- `active`：`true`/`false`，控制 loop 是否活跃
- `iteration`：当前迭代次数，每次 +1
- `max_iterations`：最大迭代次数，0 = 无限
- `completion_promise`：Claude 输出 `<promise>xxx</promise>` 匹配时视为完成
- `session_id`：绑定到启动 loop 的会话，其他会话不干预

## 原子写入

状态文件更新使用"临时文件 + 原子替换"模式：

```bash
TEMP_FILE="${STATE_FILE}.tmp.$$"
sed "s/^iteration: .*/iteration: $NEXT/" "$STATE_FILE" > "$TEMP_FILE"
mv "$TEMP_FILE" "$STATE_FILE"
```

`$$` 是当前进程 PID，确保并发安全。

## CRLF 处理（Windows 兼容）

Claude Code 在 Windows 上写入的文件可能包含 CRLF：

```bash
# 规范化 CRLF → LF
TEMP_NORM="${STATE_FILE}.norm.$$"
tr -d '\r' < "$STATE_FILE" > "$TEMP_NORM" && mv "$TEMP_NORM" "$STATE_FILE"
```

**必须在读取 frontmatter 之前执行**，否则 `sed` 匹配 `^---$` 会失败（实际是 `---\r`）。
