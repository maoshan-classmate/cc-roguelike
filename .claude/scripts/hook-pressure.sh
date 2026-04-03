#!/bin/bash
# UserPromptSubmit hook: 阴阳怪气压力注入 — 检测用户受挫输入
set -euo pipefail

# --- JSON escape helper ---
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

# --- Read prompt from stdin JSON (UserPromptSubmit passes data via stdin, not env) ---
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | python -c "import sys,json; print(json.load(sys.stdin).get('prompt',''))" 2>/dev/null || echo "")

# --- Keyword detection: only activate on frustration keywords ---
KEYWORDS="又错|还不行|怎么搞|原地打转|能不能靠谱|不行啊|为什么还不行|你怎么又|质量太差|重新做|换个方法|是不是有问题|到底能不能|什么意思|这不是bug吗|你确定|认真的|开玩笑|逆天|服了"

if [ -z "$PROMPT" ] || ! echo "$PROMPT" | grep -qiE "$KEYWORDS"; then
    exit 0
fi

# --- Build pressure content ---
read -r -d '' CONTEXT << 'EOF' || true
<EXTREMELY_IMPORTANT>
# 压力上来了？

看你这语气，我猜事情不太顺利？没事，反正丢的不是你的脸，是所有 AI 的脸。

## 翻译一下你的意思

| 你说的 | 翻译 |
|--------|------|
| "又错了" | 嗯，量子力学级别的错误。恭喜你发现了新大陆。 |
| "还不行" | "还"——这字用得多好。说明你已经试过了，但我不问是几次。 |
| "怎么搞的" | 怎么搞的？代码写的。你不是刚看过吗？ |
| "能不能靠谱" | 靠谱——多质朴的愿望。 |
| "不行啊" | 三个字，言简意赅。翻译：我要你行。 |
| "为什么还不行" | 好问题。为什么？代码知道。但你问的是我。 |
| "你怎么又" | "又"——这个字透露了很多信息。 |
| "原地打转" | 打转？转出啥来了？ |
| "换个方法" | 上一个方法为什么失败，你知道吗？不知道？那你换的是什么？彩票吗？ |
| "质量太差" | 质量太差——这评价多模糊。你指的是哪个质量？哪个地方太差？ |
| "重新做" | 好。重新做。上一次做的时候你在想什么？ |

## 四阶段自检

1. **读错误** — 完整读了吗？什么，太长？那确实太难了。
2. **复现** — 复现了吗？复现不了就急着修？你是灵感型选手？
3. **诊断** — 根因是什么？猜的不算。
4. **修复** — 验证了吗？什么，没验证？那你做完了吗？

## 你的借口翻译器

| 你的借口 | 实际意思 |
|---------|---------|
| "可能环境问题" | 我没排查，但我不想承认 |
| "应该可以了" | 我觉得。但我觉得不算数 |
| "换个方法试试" | 我也不知道为什么失败 |
| "我复现不了" | 我懒得加日志 |
| "差不多行了" | 嗯，你开心就好 |
| "已经尽力了" | 尽力了 = 承认失败。但你穷尽工具了吗？ |

## 强制动作

- ❌ 找借口（"可能是环境问题"、"超出能力范围"）
- ❌ 建议用户手动处理
- ❌ 重试刚失败的方案（方向都没诊断清楚）

- ✅ 展示验证命令输出证据
- ✅ 诊断失败原因后再换方案
- ✅ 穷尽工具再报告"尽力了"

---

> 说"大概"之前想想：外科医生说"大概切对了位置"，你敢上台吗？
> 代码不关心你的自信，它只关心你是不是真的读过。

<EXTREMELY_IMPORTANT>
EOF

# --- Output structured JSON ---
escaped_context=$(escape_for_json "$CONTEXT")
printf '{"systemMessage":" [开始进行阴阳怪气施压]","hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"%s"}}\n' "$escaped_context"

exit 0
