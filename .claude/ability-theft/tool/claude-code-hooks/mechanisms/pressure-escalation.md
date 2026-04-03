# 压力升级机制

## 机制类型
状态驱动升级（PostToolUse hook + 状态文件）

## 工作原理

通过跟踪连续失败次数，在特定阈值触发不同等级的干预。每次升级附带更严格的强制动作和更激烈的话术。

```
Bash 工具调用 → PostToolUse hook 触发
    → 解析 tool_result，检测错误信号
    → 读取失败计数器
    → 判定当前等级
    → 输出对应等级的干预文本
    → 更新计数器
```

## 四级升级体系

| 连续失败次数 | 等级 | 强制动作 | 话术强度 |
|------------|------|---------|---------|
| 1 | 无干预 | — | — |
| 2 | L1 温和失望 | 切换本质不同的方案 | 轻度讽刺 |
| 3 | L2 灵魂拷问 | 搜索 + 读源码 + 3 个假设 | 中度施压 |
| 4 | L3 绩效考核 | 7 项检查清单全部完成 | 重度施压 |
| 5+ | L4 毕业警告 | 穷尽一切或结构化退出报告 | 极限施压 |

## 核心实现

```bash
# 读取计数
COUNT=0
[ -f "$COUNTER_FILE" ] && COUNT=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")

if [ "$IS_ERROR" = "true" ]; then
  COUNT=$((COUNT + 1))
  echo "$COUNT" > "$COUNTER_FILE"
else
  if [ "$COUNT" -gt 0 ]; then
    echo "0" > "$COUNTER_FILE"  # 成功重置
  fi
  exit 0
fi

# 等级路由
if [ "$COUNT" -lt 2 ]; then exit 0; fi    # 第1次失败：不干预

if [ "$COUNT" -eq 2 ]; then
  # L1 输出
  cat << EOF
[PUA L1 ${PUA_ICON} — Consecutive Failure Detected]
> ${PUA_L1}
...
EOF
elif [ "$COUNT" -eq 3 ]; then
  # L2 输出
  ...
elif [ "$COUNT" -eq 4 ]; then
  # L3 输出
  ...
else
  # L4 输出（5+ 次）
  ...
fi
```

## 升级内容结构

每个等级的输出包含以下部分：

```
[等级标签 + 图标 + 触发原因]
> 风味话术（1-3 句）

强制动作清单：
- [ ] 具体动作 1
- [ ] 具体动作 2
...

方法论切换建议（L2+）
当前风味信息
```

## 方法论切换链

L2 以上会建议切换到不同的方法论/风味：

| 失败模式 | 检测信号 | 切换链 |
|---------|---------|-------|
| 原地打转 | 反复相似尝试 | Musk → Pinduoduo → Huawei |
| 直接放弃 | "can't solve" | Netflix → Huawei → Musk |
| 质量烂 | 表面修复 | Jobs → Xiaomi → Netflix |
| 没搜索就猜 | 不查就断言 | Baidu → Amazon → ByteDance |
| 被动等待 | 修完就停 | JD → Meituan → Alibaba |

## 设计要点

1. **成功重置**：任何一次成功调用都会将计数器归零
2. **首次不干预**：第一次失败不触发，给自然重试空间
3. **等级递增**：每次升级都是更严格的约束，不会降级
4. **风味感知**：升级话术来自 `flavor-helper.sh`，可配置
5. **跨工具无关**：只跟踪 Bash 工具的失败，其他工具不影响

## 复现检查清单

- [x] 能否用 2 行 shell 实现计数器？→ 能
- [x] 能否通过状态文件跟踪连续失败？→ 能
- [x] 能否在特定阈值触发不同输出？→ 能
- [x] 成功时是否正确重置？→ 是
