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

## 用户挫折检测

UserPromptSubmit hook 通过正则匹配用户输入中的挫折信号。

### 关键词模式

```json
{
  "matcher": "try harder|别偷懒|又错了|还不行|怎么搞|stop giving|you broke|third time|降智|原地打转|能不能靠谱|认真点|不行啊|为什么还不行|你怎么又|换个方法|stop spinning|figure it out|you keep failing|加油|再试试|质量太差|重新做|PUA模式|怎么又失败"
}
```

**分类**：
- 中英文混合的挫折表达
- 包含"再次/重复"语义的词
- 包含"不满/命令"语义的词
- 包含质量批评的词

### Matcher 工作原理

`UserPromptSubmit` 的 `matcher` 字段是正则表达式，**匹配用户输入的文本**。匹配成功时，对应的 hooks 才会执行。

这与 `PostToolUse` 的 matcher 不同——后者匹配的是**工具名称**（精确字符串），不是正则。

## 安全过滤

检测到匹配后，必须验证 PUA 确实在本会话中触发过（通过扫描 transcript）：

```bash
if ! grep -qE 'PUA生效|\[Auto-select:|\[PIP-REPORT\]|\[PUA-REPORT\]' "$TRANSCRIPT_PATH" 2>/dev/null; then
  exit 0
fi
```

这防止在无关会话中误触发。
