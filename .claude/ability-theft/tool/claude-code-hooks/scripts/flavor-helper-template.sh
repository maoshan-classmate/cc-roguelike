#!/bin/bash
# 配置风格模板 — 所有 hook 共享
# 使用：source 此文件，然后调用 load_style
# 设置：STYLE_NAME, STYLE_ICON, INTERVENTION_L1..L4, STYLE_KEYWORDS, STYLE_INSTRUCTION, STYLE_METHODOLOGY

load_style() {
  local config="${HOME:-~}/.hook-config/config.json"
  local raw_style=""

  # 1. 读取配置
  if [ -f "$config" ]; then
    raw_style=$(python3 -c "import os,json; print(json.load(open(os.path.expanduser('~/.hook-config/config.json'))).get('style','neutral'))" 2>/dev/null || echo "neutral")
  fi

  # 2. 规范化风格名
  case "$raw_style" in
    strict|"")  raw_style="strict" ;;
    neutral)    raw_style="neutral" ;;
    encouraging) raw_style="encouraging" ;;
    *)          raw_style="neutral" ;;
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
      STYLE_KEYWORDS=""
      STYLE_INSTRUCTION="<风格专属指令>"
      STYLE_METHODOLOGY="<方法论提示>"
      ;;
    # ... 其他风格按需添加 ...
    *)
      STYLE_ICON="⚪"
      INTERVENTION_L1="<L1 提示文本>"
      INTERVENTION_L2="<L2 提示文本>"
      INTERVENTION_L3="<L3 提示文本>"
      INTERVENTION_L4="<L4 提示文本>"
      STYLE_KEYWORDS=""
      STYLE_INSTRUCTION=""
      STYLE_METHODOLOGY=""
      ;;
  esac
}
