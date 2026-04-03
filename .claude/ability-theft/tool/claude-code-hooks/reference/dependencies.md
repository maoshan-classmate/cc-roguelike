# 外部依赖

## 必需依赖

| 依赖 | 版本要求 | 用途 | 可替代方案 |
|------|---------|------|-----------|
| bash | 3.2+ | 脚本执行环境 | — |
| python3 | 3.6+ | JSON 解析、配置读取 | 手动 jq 构造（复杂但可行） |

## 条件依赖

| 依赖 | 哪些 hook 需要 | 用途 | 缺失时行为 |
|------|---------------|------|-----------|
| jq | Stop hook (loop-control, feedback) | JSONL 解析、JSON 构造 | hook 静默跳过（exit 0） |
| perl | Stop hook (loop-control) | 多行正则提取 `<promise>` 标签 | loop 完成信号检测失败，达到 max_iterations 后退出 |

## 安全降级模式

```bash
# jq 检查
command -v jq &>/dev/null || { echo "jq not found, skipping" >&2; exit 0; }

# perl 检查（在 pua-loop-hook.sh 中隐式依赖）
# perl 不可用时，TAG_TEXT 变量为空，匹配失败，循环继续直到 max_iterations
```

## 安装指南

### macOS

```bash
brew install python3 jq perl
```

### Ubuntu/Debian

```bash
sudo apt-get install python3 jq perl
```

### Windows (Git Bash)

```bash
# python3 — 通常已随 Git for Windows 安装
# jq — 需要单独安装
# 方法1: choco install jq
# 方法2: 从 https://jqlang.github.io/jq/ 下载
# perl — Git Bash 自带
```

## python3 使用模式

hook 脚本中 python3 有两种使用方式：

### 内联脚本（单行 JSON 提取）

```bash
VALUE=$(echo "$JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('key',''))" 2>/dev/null || echo "")
```

### 多行脚本（复杂处理）

```bash
python3 - << 'PYEOF'
import sys, json
# ... 复杂逻辑 ...
PYEOF
```

### 注意事项

1. `2>/dev/null` 防止 python3 错误输出污染 hook 结果
2. `|| echo ""` 提供降级默认值
3. heredoc 用 `'PYEOF'`（带引号）防止变量展开
