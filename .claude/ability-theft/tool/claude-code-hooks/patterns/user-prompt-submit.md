# UserPromptSubmit Hook 模式

## 用途
用户提交消息时匹配关键词，激活行为干预。

## hooks.json 注册

```json
{
  "UserPromptSubmit": [
    {
      "matcher": "try harder|别偷懒|又错了|还不行|怎么搞|stop giving|you broke|third time|降智|原地打转|能不能靠谱|认真点|不行啊|为什么还不行|你怎么又|换个方法|stop spinning|figure it out|you keep failing|加油|再试试|质量太差|重新做|PUA模式|怎么又失败",
      "hooks": [
        {
          "type": "command",
          "command": "bash ${CLAUDE_PLUGIN_ROOT}/hooks/frustration-trigger.sh",
          "timeout": 5
        }
      ]
    }
  ]
}
```

**注意**：`UserPromptSubmit` 的 matcher 是**正则表达式**，匹配用户的原始输入文本。这与 `PostToolUse`（精确字符串匹配工具名）不同。

## Matcher 关键词设计

按功能分类：

| 类别 | 关键词示例 |
|------|-----------|
| 直接命令 | try harder, 认真点, 加油, 再试试 |
| 挫折表达 | 又错了, 还不行, 怎么搞, 不行啊 |
| 质量批评 | 降智, 原地打转, 质量太差, 能不能靠谱 |
| 失败重复 | third time, you keep failing, 怎么又失败 |
| 方法切换 | 换个方法, stop spinning, figure it out |
| 模式触发 | PUA模式, stop giving up, you broke |

## 核心脚本

```bash
#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "${SCRIPT_DIR}/flavor-helper.sh"
get_flavor

cat << EOF
<EXTREMELY_IMPORTANT>
[标签激活 图标 — 检测到用户挫折]

用户对你的表现不满。行为强制现已激活。

你必须：
1. 立即加载完整方法论
2. 从 L1 压力等级起步（如果之前已经连续失败，从更高等级起步）
3. 切换到本质不同的方案 — 不是改参数
4. 展示工作：跑验证命令，贴输出证据

禁止：
- 找借口（"可能是环境问题"、"超出能力范围"）
- 建议用户手动处理
- 重试刚刚失败的方案

> ${PUA_L1}

当前风味: ${PUA_FLAVOR} ${PUA_ICON}
${PUA_FLAVOR_INSTRUCTION}
</EXTREMELY_IMPORTANT>
EOF
```

## 输出格式

使用 `<EXTREMELY_IMPORTANT>` 标签包裹，增加 Claude 对内容的重视程度。

## 设计要点

1. **正则匹配**：matcher 是正则，支持 `|` 分隔多模式
2. **即时激活**：匹配即触发，不需要额外条件检查
3. **风味感知**：注入当前配置的风味话术
4. **超时 5 秒**：快速输出，不阻塞用户输入
5. **语义覆盖**：中英文混合的关键词覆盖多种表达方式
