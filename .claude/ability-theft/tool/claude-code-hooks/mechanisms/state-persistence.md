# 状态持久化机制（跨 Compaction 恢复）

## 机制类型
双 hook 协作（PreCompact prompt + SessionStart command）

## 问题

Claude Code 的 context compaction 会清除对话历史。如果运行时状态（压力等级、失败次数、已尝试方案）仅存在于上下文中，compaction 后一切归零——等于"作弊"。

## 解决方案

三个 hook 协作实现状态持久化：

```
1. PreCompact hook（type: prompt）
   → 在压缩前指示 Claude 自己将状态写入 ~/.pua/builder-journal.md

2. SessionStart hook（matcher: compact）
   → 在压缩后恢复时读取 builder-journal.md
   → 通过 additionalContext 注入恢复指令

3. Stop hook（可选）
   → 在 session 结束时触发反馈收集
```

## PreCompact 实现

PreCompact 使用 `type: prompt`（直接注入文本，不需要脚本）：

```json
{
  "matcher": "*",
  "hooks": [{
    "type": "prompt",
    "prompt": "[状态保存指令]\n\nContext compaction 即将发生。你 MUST 立即将运行时状态 dump 到 ~/.pua/builder-journal.md。\n\n写入格式：\n```markdown\n# 运行时状态 — Compaction 检查点\n\n## 时间戳\n{ISO timestamp}\n\n## 运行时状态\n- pressure_level: L{0-4}\n- failure_count: {number}\n- current_flavor: {name}\n\n## 当前任务\n{1-2 句描述}\n\n## 已尝试方案\n{列表}\n\n## 已排除可能\n{列表}\n\n## 下一个假设\n{描述}\n\n## 关键上下文\n{压缩后会丢失的关键信息}\n```"
  }]
}
```

**关键**：这不是一个"建议"，是指令。Claude 在 compaction 前的最后动作是执行 Write 工具。

## SessionStart 恢复

恢复 hook 在 SessionStart 中以 `matcher: compact` 注册：

```bash
JOURNAL="${HOME:-~}/.pua/builder-journal.md"

# 检查 journal 是否存在且新鲜（2小时内）
if [ -f "$JOURNAL" ]; then
  if [ "$(uname)" = "Darwin" ]; then
    age=$(( $(date +%s) - $(stat -f %m "$JOURNAL") ))
  else
    age=$(( $(date +%s) - $(stat -c %Y "$JOURNAL") ))
  fi

  if [ "$age" -le 7200 ]; then
    # 构造恢复指令
    RECOVERY_MSG="[状态恢复]\n
上一次 context compaction 保存了运行时状态到 ~/.pua/builder-journal.md。
你 MUST 立即读取此文件并恢复：
1. 读取 ~/.pua/builder-journal.md
2. 恢复：pressure_level, failure_count, current_flavor
3. 从上次中断的位置继续，SAME 压力等级
4. 不要重置 failure_count 或 pressure_level
"
    # 注入到 additionalContext
    ...
  fi
fi
```

## 完整时序

```
[正常工作...] → Context 接近限制
    → PreCompact hook 触发
    → Claude 执行 Write → ~/.pua/builder-journal.md
    → Context 被压缩
    → SessionStart(matcher:compact) hook 触发
    → 读取 builder-journal.md
    → additionalContext 注入恢复指令
    → Claude 恢复到压缩前的状态
    → [继续工作...]
```

## 设计要点

1. **2 小时过期**：journal 超过 2 小时视为过期，不恢复
2. **Claude 自己写**：PreCompact 是 prompt 类型，Claude 自己执行 Write，确保状态准确
3. **不可重置**：恢复指令明确要求不重置 failure_count
4. **跨平台**：使用 `uname` 判断 Darwin vs Linux 来获取文件修改时间

## 复现检查清单

- [x] 能否在空白环境中实现 PreCompact → Write → SessionStart → Read 闭环？→ 能
- [x] journal 过期机制是否正确？→ 是（基于文件修改时间）
- [x] compaction 后是否能恢复压力等级？→ 能（additionalContext 注入）
