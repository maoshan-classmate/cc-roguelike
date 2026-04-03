# 错误检测规则

## Bash 工具失败信号检测

PostToolUse hook 从 stdin JSON 中解析 Bash 工具的输出，判断是否为失败。

### 检测层次

**第一层：工具结果文本中的错误模式**

```bash
TOOL_RESULT=$(echo "$HOOK_INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
result = data.get('tool_result', '')
if isinstance(result, dict):
    result = result.get('content', result.get('text', str(result)))
print(str(result)[:2000])  # 只取前 2000 字符，避免过大
" 2>/dev/null || echo "")

IS_ERROR="false"

if echo "$TOOL_RESULT" | grep -qiE 'error|Error|ERROR|exit code [1-9]|Exit code [1-9]|command not found|No such file|Permission denied|FAILED|fatal:|panic:|Traceback|Exception:'; then
  IS_ERROR="true"
fi
```

**错误关键词表**：

| 模式 | 匹配场景 |
|------|---------|
| `error\|Error\|ERROR` | 通用错误输出 |
| `exit code [1-9]` | Bash 命令非零退出 |
| `command not found` | 命令不存在 |
| `No such file` | 文件路径错误 |
| `Permission denied` | 权限不足 |
| `FAILED` | 测试/构建失败 |
| `fatal:` | git 致命错误 |
| `panic:` | Go runtime panic |
| `Traceback` | Python 异常 |
| `Exception:` | Java/C# 异常 |

**第二层：退出码检测**

```bash
EXIT_CODE=$(echo "$HOOK_INPUT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
result = data.get('tool_result', {})
if isinstance(result, dict):
    print(result.get('exit_code', result.get('exitCode', 0)))
else:
    print(0)
" 2>/dev/null || echo "0")

if [ "$EXIT_CODE" != "0" ] && [ "$EXIT_CODE" != "" ]; then
  IS_ERROR="true"
fi
```

**第三层：工具名过滤**

```bash
TOOL_NAME=$(echo "$HOOK_INPUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null || echo "")
if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0  # 只处理 Bash 工具的结果
fi
```

## 用户输入关键词检测

UserPromptSubmit hook 可用于检测用户输入中的特定信号（如挫折表达、紧急程度等）。

### ⚠️ 重要：UserPromptSubmit 不支持 matcher

`UserPromptSubmit` 不支持 `matcher` 字段（会被静默忽略）。关键词匹配必须在脚本内部通过 stdin JSON 读取 `prompt` 字段实现：

```bash
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | python -c "import sys,json; print(json.load(sys.stdin).get('prompt',''))" 2>/dev/null || echo "")

KEYWORDS="<关键词1>|<关键词2>|<关键词3>"

if [ -z "$PROMPT" ] || ! echo "$PROMPT" | grep -qiE "$KEYWORDS"; then
    exit 0
fi
```

### 关键词分类建议

| 类别 | 示例模式 |
|------|---------|
| 重复失败信号 | 包含"再次/重复"语义的词 |
| 不满信号 | 包含"不满/命令"语义的词 |
| 质量批评 | 包含质量评价的词 |
| 方法切换请求 | 包含"换方案/换个方法"语义的词 |

> 关键词列表应按实际需求配置，支持正则 `|` 分隔多模式。

## 安全过滤

检测到匹配后，可验证 hook 确实在本会话中触发过（通过扫描 transcript）：

```bash
if ! grep -qE '<HOOK_ACTIVE_TAG>' "$TRANSCRIPT_PATH" 2>/dev/null; then
  exit 0
fi
```

> `<HOOK_ACTIVE_TAG>` 应替换为你的 hook 实际输出的标记字符串。这防止在无关会话中误触发。
