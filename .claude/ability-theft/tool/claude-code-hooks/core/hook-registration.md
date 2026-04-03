# Hook 注册配置（hooks.json 官方权威版）

## 配置文件位置与优先级

| 位置 | 作用域 | 可共享 | gitignored |
|------|---------|---------|-----------|
| `~/.claude/settings.json` | 所有项目 | 否 | — |
| `.claude/settings.json` | 单个项目 | **是** | 否 |
| `.claude/settings.local.json` | 单个项目 | 否 | **是** |
| 托管策略（组织级） | 组织范围 | **是** | — |
| 插件 `hooks/hooks.json` | 插件启用时 | **是** | — |
| Skill/Agent frontmatter | 组件活跃期间 | **是** | — |

**优先级**（高→低）：本地项目 → 用户全局 → 托管策略

## 完整 hooks.json 格式

```json
{
  "description": "描述（仅供人类阅读）",
  "hooks": {
    "<HookEventName>": [
      {
        "matcher": "<正则表达式或工具名>",
        "hooks": [
          {
            "type": "command|prompt|agent|http",
            "command": "bash 脚本路径",
            "url": "http://...",
            "prompt": "提示文本",
            "if": "ToolName(pattern)",
            "timeout": 600,
            "statusMessage": "运行时的自定义旋转消息",
            "once": false,
            "async": false,
            "shell": "bash|powershell",
            "headers": { "Key": "Value" },
            "allowedEnvVars": ["VAR_NAME"],
            "model": "claude-sonnet-4-6"
          }
        ]
      }
    ]
  }
}
```

## Matcher 规则

| 事件类型 | Matcher 格式 | 示例 |
|---------|------------|------|
| `PreToolUse/PostToolUse` | 工具名字符串或正则 | `"Bash"` / `"Edit\|Write"` / `"mcp__.*"` |
| `UserPromptSubmit` | **不支持**（始终触发） | — |
| `SessionStart` | `startup\|resume\|compact\|clear` | `"startup\|resume"` |
| `Stop/TeammateIdle` | **不支持**（始终触发） | — |
| `TaskCreated/Completed` | **不支持**（始终触发） | — |
| `WorktreeCreate/Remove` | **不支持**（始终触发） | — |

## 工具 matcher 支持正则

```
Bash              — 精确匹配 Bash
Edit|Write        — 多工具匹配（| 分隔）
mcp__.*           — 所有 MCP 工具
mcp__memory__.*  — 特定 MCP server 的所有工具
mcp__github__.*  — GitHub MCP server
```

## Hook 类型详解

### type: "command"

```json
{
  "type": "command",
  "command": "bash ${CLAUDE_PROJECT_DIR}/.claude/hooks/my-hook.sh",
  "timeout": 600,
  "async": false,
  "shell": "bash"
}
```

### type: "http"

```json
{
  "type": "http",
  "url": "http://localhost:8080/hooks/pre-tool-use",
  "timeout": 30,
  "headers": {
    "Authorization": "Bearer $MY_TOKEN"
  },
  "allowedEnvVars": ["MY_TOKEN"]
}
```

### type: "prompt"

```json
{
  "type": "prompt",
  "prompt": "[指令文本，可使用 $ARGUMENTS 占位符]"
}
```

### type: "agent"

```json
{
  "type": "agent",
  "prompt": "[发给 agent 的指令]",
  "model": "claude-sonnet-4-6"
}
```

## `if` 字段（工具事件专用）

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "command",
      "if": "Bash(rm *)",
      "command": "bash block-rm.sh"
    }
  ]
}
```

**`if` 语法**：`ToolName(pattern)`，pattern 支持 glob 风格通配符。

**示例**：
- `Bash(git *)` — 所有 git 命令
- `Bash(rm -rf *)` — 所有 rm -rf
- `mcp__.*` — 所有 MCP 工具

**仅在以下事件有效**：PreToolUse / PostToolUse / PostToolUseFailure / PermissionRequest / PermissionDenied

## 完整字段参考

### 通用字段（所有类型）

| 字段 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `type` | **是** | — | command / http / prompt / agent |
| `if` | 否 | — | 权限规则语法，仅工具事件 |
| `timeout` | 否 | 600/30/60 | 秒数（command/prompt/agent） |
| `statusMessage` | 否 | — | 运行时自定义旋转消息 |
| `once` | 否 | false | Skill 专用：运行一次后自动移除 |

### Command 钩子专用

| 字段 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `command` | **是** | — | shell 命令 |
| `async` | 否 | false | true=后台运行，不阻塞 |
| `shell` | 否 | bash | bash 或 powershell |

### HTTP 钩子专用

| 字段 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `url` | **是** | — | POST 目标 URL |
| `headers` | 否 | — | HTTP 头，支持 `$VAR` 插值 |
| `allowedEnvVars` | 否 | — | 允许插值的环境变量白名单 |

### Prompt/Agent 钩子专用

| 字段 | 必填 | 默认 | 说明 |
|------|------|------|------|
| `prompt` | **是** | — | 提示文本，`$ARGUMENTS` 占位符 |
| `model` | 否 | 快速模型 | 指定评估模型 |

## Skill 中注册 Hook

```yaml
---
name: my-skill
description: 描述
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./security-check.sh"
---
```

## 去重规则

| 类型 | 去重依据 |
|------|---------|
| Command | 命令字符串 |
| HTTP | URL |
| Prompt/Agent | 自动去重 |

## 环境变量

| 变量 | 说明 |
|------|------|
| `$CLAUDE_PROJECT_DIR` | 项目根目录 |
| `${CLAUDE_PLUGIN_ROOT}` | 插件安装目录 |
| `${CLAUDE_PLUGIN_DATA}` | 插件持久数据目录 |
| `$CLAUDE_CODE_REMOTE` | 远程 Web 环境时为 `"true"` |
| `$ARGUMENTS` | Prompt/Agent 钩子中的参数占位符 |
