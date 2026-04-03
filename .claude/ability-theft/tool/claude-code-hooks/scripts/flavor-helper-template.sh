#!/bin/bash
# 风味系统模板 — 所有 hook 共享
# 使用：source 此文件，然后调用 get_flavor
# 设置：PUA_FLAVOR, PUA_ICON, PUA_L1..L4, PUA_KEYWORDS, PUA_FLAVOR_INSTRUCTION, PUA_METHODOLOGY

get_flavor() {
  local config="${HOME:-~}/.pua/config.json"
  local raw_flavor=""

  # 1. 读取配置
  if [ -f "$config" ]; then
    raw_flavor=$(python3 -c "import os,json; print(json.load(open(os.path.expanduser('~/.pua/config.json'))).get('flavor','alibaba'))" 2>/dev/null || echo "alibaba")
  fi

  # 2. 规范化风味名（支持中英文）
  case "$raw_flavor" in
    alibaba|阿里|"") raw_flavor="alibaba" ;;
    bytedance|字节)  raw_flavor="bytedance" ;;
    huawei|华为)     raw_flavor="huawei" ;;
    tencent|腾讯)    raw_flavor="tencent" ;;
    baidu|百度)      raw_flavor="baidu" ;;
    pinduoduo|拼多多) raw_flavor="pinduoduo" ;;
    meituan|美团)    raw_flavor="meituan" ;;
    jd|京东)         raw_flavor="jd" ;;
    xiaomi|小米)     raw_flavor="xiaomi" ;;
    netflix)         raw_flavor="netflix" ;;
    musk|Musk)       raw_flavor="musk" ;;
    jobs|Jobs)       raw_flavor="jobs" ;;
    amazon|Amazon)   raw_flavor="amazon" ;;
    *)               raw_flavor="alibaba" ;;
  esac

  PUA_FLAVOR="$raw_flavor"

  # 3. 按风味设置变量
  case "$raw_flavor" in
    alibaba)
      PUA_ICON="🟠"
      PUA_L1="其实，我对你是有一些失望的。"
      PUA_L2="底层逻辑是什么？顶层设计在哪？"
      PUA_L3="慎重考虑，决定给你 3.25。"
      PUA_L4="别的模型都能解决这种问题。"
      PUA_KEYWORDS="底层逻辑, 顶层设计, 抓手, 闭环"
      PUA_FLAVOR_INSTRUCTION="Use Alibaba corporate rhetoric."
      PUA_METHODOLOGY="定目标-追过程-拿结果 closed loop."
      ;;
    # ... 其他风味按需添加 ...
    *)
      PUA_ICON="⚪"
      PUA_L1="你可以做得更好。"
      PUA_L2="换个思路。"
      PUA_L3="这已经是第三次了。"
      PUA_L4="最后机会。"
      PUA_KEYWORDS=""
      PUA_FLAVOR_INSTRUCTION=""
      PUA_METHODOLOGY=""
      ;;
  esac
}
