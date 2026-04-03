# additionalContext 注入机制

## 机制类型
事件注入（SessionStart hook）

## 工作原理

SessionStart hook 在会话启动时被 Claude Code 调用。通过输出特定格式的 JSON，可以向 Claude 的上下文注入**不可变的行为协议**，其优先级高于普通 system prompt。

```
用户打开会话 → Claude Code 触发 SessionStart hook
                → hook 脚本执行
                → 输出 JSON 到 stdout
                → Claude Code 解析 JSON
                → 提取 additionalContext 字段
                → 注入为不可变行为协议（additionalContext）
                → Claude 的行为被约束
```

## 关键实现细节

### JSON 输出格式

```bash
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$escaped_content"
```

### 内容构造流程

```bash
# 1. 用 heredoc 构造长文本
read -r -d '' PROTOCOL << 'EOF' || true
<EXTREMELY_IMPORTANT>
[行为协议标题]

协议内容...
EOF

# 2. 如果需要动态变量替换
PROTOCOL="${PROTOCOL//PLACEHOLDER/$ACTUAL_VALUE}"

# 3. JSON 转义
escaped=$(escape_for_json "$PROTOCOL")

# 4. 输出 JSON
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$escaped"
```

### 多段内容合并

SessionStart hook 可以合并多个内容段：

```bash
context_parts=""

# 段落 1：always-on 行为协议
if [ "$always_on" = "True" ]; then
  context_parts="${PROTOCOL_TEXT}"
fi

# 段落 2：compaction 状态恢复
if [ -f "$JOURNAL" ] && [ "$age" -le 7200 ]; then
  context_parts="${context_parts}${RECOVERY_MSG}"
fi

# 合并后输出
if [ -z "$context_parts" ]; then
  exit 0  # 无内容 = 不干预
fi
escaped=$(escape_for_json "$context_parts")
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"%s"}}\n' "$escaped"
```

### 配置驱动

注入内容可以由用户配置控制：

```bash
CONFIG="${HOME:-~}/.hook-config/config.json"
if [ -f "$CONFIG" ]; then
  always_on=$(python3 -c "import os,json; print(json.load(open(os.path.expanduser('~/.hook-config/config.json'))).get('always_on', False))" 2>/dev/null)
  if [ "$always_on" = "True" ]; then
    # 注入行为协议
  fi
fi
```

## 依赖与约束

- **时机**：仅在 SessionStart 事件触发（startup / resume / compact）
- **编码**：必须是合法 JSON，文本需要正确转义
- **大小**：无明确限制，但过大的注入会消耗上下文窗口
- **优先级**：additionalContext > 普通 system prompt > 用户消息

## 复现检查清单

- [x] 能否在空白 shell 脚本中构造 additionalContext JSON？→ 能
- [x] 能否通过配置控制注入内容？→ 能（读 config.json）
- [x] 能否合并多个内容段？→ 能（字符串拼接 + 单次 JSON 转义）
- [x] Claude Code 是否将其视为不可变协议？→ 是（区别于纯文本 stdout）
