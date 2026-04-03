# 配置风格路由机制

## 机制类型
配置驱动路由（style-helper.sh）

## 工作原理

所有 hook 共享一个 `style-helper.sh`，通过读取 `~/.hook-config/config.json` 确定当前行为风格，然后设置一系列环境变量供各 hook 使用。

```
任意 hook 脚本启动
    → source style-helper.sh
    → 调用 load_style()
    → 读取 ~/.hook-config/config.json 的 style 字段
    → 规范化风格名
    → 设置 STYLE_NAME / STYLE_ICON / INTERVENTION_L1-L4 / STYLE_INSTRUCTION / STYLE_METHODOLOGY
    → 各 hook 使用这些变量构造输出
```

## 配置格式

```json
{
  "style": "<style_name>",
  "always_on": true,
  "intervention_frequency": 5
}
```

## 风格预设示例

| 配置值 | 说明 | 适用场景 |
|-------|------|---------|
| `strict` | 严格约束，要求验证证据 | 高可靠性需求 |
| `neutral` | 中性提示，不加情感色彩 | 通用场景 |
| `encouraging` | 正向引导，鼓励式反馈 | 学习/探索场景 |

> 每种风格预设包含：图标、四级干预文本模板、专属指令、方法论提示。用户可自定义扩展。

## 核心实现

```bash
load_style() {
  local config="${HOME:-~}/.hook-config/config.json"
  local raw_style=""

  # 1. 读配置
  if [ -f "$config" ]; then
    raw_style=$(python3 -c "import os,json; print(json.load(open(os.path.expanduser('~/.hook-config/config.json'))).get('style','neutral'))" 2>/dev/null || echo "neutral")
  fi

  # 2. 规范化（支持自定义别名）
  case "$raw_style" in
    strict|"")  raw_style="strict" ;;
    neutral)    raw_style="neutral" ;;
    encouraging) raw_style="encouraging" ;;
    *)          raw_style="neutral" ;;  # 未知风格 fallback
  esac

  STYLE_NAME="$raw_style"

  # 3. 按风格设置变量
  case "$raw_style" in
    strict)
      STYLE_ICON="🔴"
      INTERVENTION_L1="<L1 提示文本>"
      INTERVENTION_L2="<L2 提示文本>"
      INTERVENTION_L3="<L3 提示文本>"
      INTERVENTION_L4="<L4 提示文本>"
      STYLE_INSTRUCTION="<风格专属指令>"
      STYLE_METHODOLOGY="<方法论提示>"
      ;;
    neutral)
      STYLE_ICON="⚪"
      INTERVENTION_L1="<L1 提示文本>"
      INTERVENTION_L2="<L2 提示文本>"
      INTERVENTION_L3="<L3 提示文本>"
      INTERVENTION_L4="<L4 提示文本>"
      STYLE_INSTRUCTION="<风格专属指令>"
      STYLE_METHODOLOGY="<方法论提示>"
      ;;
    # ... 添加自定义风格 ...
  esac
}
```

## 任务类型自动路由

支持按任务类型自动选择推荐风格：

| 任务类型 | 信号关键词 | 推荐风格 |
|---------|-----------|---------|
| Debug/Fix | error, bug, fix | strict（要求根因分析） |
| Build New | add, create, build | neutral（鼓励探索） |
| Code Review | review, refactor | strict（要求证据） |
| Research | research, search | neutral（开放探索） |
| Performance | slow, optimize | strict（要求数据对比） |

**路由规则**：分析用户第一条消息，如果匹配任务类型，自动选择推荐风格。用户手动设置优先。

## 失败时风格切换链

当前风格连续失败 2+ 次时，按预设链切换：

```
反复尝试 → strict → <备用风格1> → <备用风格2>
直接放弃 → encouraging → <备用风格1> → <备用风格2>
表面修复 → strict → <备用风格1> → <备用风格2>
```

> 切换链可在配置文件中自定义。

## 设计要点

1. **共享 source**：所有 hook 共享同一个 style-helper.sh，确保风格一致
2. **别名支持**：配置值支持别名映射
3. **Fallback**：未知风格默认为 neutral
4. **可扩展**：添加新风格只需在 case 中增加一个分支
5. **配置优先**：用户手动设置 > 任务类型自动路由 > 默认值
