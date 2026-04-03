# 环境变量和路径约定（官方权威版）

## 官方环境变量

| 变量 | 说明 |
|------|------|
| `CLAUDE_PROJECT_DIR` | 项目根目录 |
| `CLAUDE_PLUGIN_ROOT` | 插件安装目录 |
| `CLAUDE_PLUGIN_DATA` | 插件持久数据目录 |
| `CLAUDE_CODE_REMOTE` | 远程 Web 环境时为 `"true"` |

## 用户级路径

| 路径 | 用途 |
|------|------|
| `~/.claude/settings.json` | 用户全局 Claude Code 设置 |
| `~/.claude/hooks/` | 用户全局 hook 脚本 |
| `~/.pua/config.json` | PUA 行为配置（自定义） |

## 项目级路径

| 路径 | 用途 |
|------|------|
| `.claude/settings.json` | 项目级 Claude Code 设置 |
| `.claude/settings.local.json` | 本地覆盖（gitignored） |
| `.claude/hooks/` | 项目级 hook 脚本 |
| `.claude/hooks/hooks.json` | 项目级 hook 注册 |

## Plugin 级路径

| 路径 | 用途 |
|------|------|
| `${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json` | 插件 hook 注册 |
| `${CLAUDE_PLUGIN_ROOT}/hooks/*.sh` | 插件 hook 脚本 |
| `${CLAUDE_PLUGIN_DATA}/` | 插件数据目录（持久化） |

## 配置位置优先级

```
用户全局 ~/.claude/settings.json
    ↓
项目本地 .claude/settings.json
    ↓
本地覆盖 .claude/settings.local.json
    ↓
托管策略（组织级）
    ↓
插件 hooks/hooks.json（启用时）
    ↓
Skill/Agent frontmatter hooks（活跃期间）
```

## 跨平台 stat 兼容

```bash
if [ "$(uname)" = "Darwin" ]; then
  age=$(( $(date +%s) - $(stat -f %m "$FILE") ))
else
  age=$(( $(date +%s) - $(stat -c %Y "$FILE") ))
fi
```

## Shell 类型

| 类型 | 说明 |
|------|------|
| `bash` | 默认（Linux/macOS/Windows Git Bash） |
| `powershell` | Windows PowerShell |

## 工具输入字段参考

### Bash
```json
{ "command": "...", "description": "...", "timeout": 120000, "run_in_background": false }
```

### Edit
```json
{ "file_path": "...", "old_string": "...", "new_string": "..." }
```

### Write
```json
{ "file_path": "...", "content": "..." }
```

### Read
```json
{ "file_path": "...", "limit": 2000, "offset": 0 }
```

### Glob
```json
{ "pattern": "**/*.ts" }
```

### Grep
```json
{ "pattern": "...", "path": ".", "glob": "*.ts", "-i": true, "-n": true }
```

### WebFetch
```json
{ "url": "...", "prompt": "..." }
```

### WebSearch
```json
{ "query": "...", "recency_days": null }
```
