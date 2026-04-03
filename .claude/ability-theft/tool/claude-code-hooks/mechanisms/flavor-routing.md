# 风味路由机制

## 机制类型
配置驱动路由（flavor-helper.sh）

## 工作原理

所有 hook 共享一个 `flavor-helper.sh`，通过读取 `~/.pua/config.json` 确定当前"风味"（行为风格），然后设置一系列环境变量供各 hook 使用。

```
任意 hook 脚本启动
    → source flavor-helper.sh
    → 调用 get_flavor()
    → 读取 ~/.pua/config.json 的 flavor 字段
    → 规范化风味名（中英文都支持）
    → 设置 PUA_FLAVOR / PUA_ICON / PUA_L1-L4 / PUA_KEYWORDS / PUA_FLAVOR_INSTRUCTION / PUA_METHODOLOGY
    → 各 hook 使用这些变量构造输出
```

## 配置格式

```json
{
  "flavor": "alibaba",
  "always_on": true,
  "feedback_frequency": 5
}
```

## 风味映射表

| 配置值 | 图标 | L1-L4 话术 | 方法论 |
|-------|------|-----------|-------|
| alibaba / 阿里 | 🟠 | 底层逻辑/顶层设计/3.25/毕业 | 定目标-追过程-拿结果 |
| bytedance / 字节 | 🟡 | ROI/Always Day 1/OKR/不养闲人 | Context not Control + A/B |
| huawei / 华为 | 🔴 | 奋斗者/烧不死的鸟/板凳/胜败 | RCA 5-Why + 蓝军 |
| tencent / 腾讯 | 🟢 | 赛马/MVP/产品思维/换人跑 | 赛马 + 灰度发布 |
| baidu / 百度 | ⚫ | 深度搜索/基本盘/技术信仰 | Search Everything |
| pinduoduo / 拼多多 | 🟣 | 本分/拼命/996→007 | Cut All Middle Layers |
| meituan / 美团 | 🔵 | 难而正确/猛将/长期有耐心 | 效率护城河 + 过程管理 |
| jd / 京东 | 🟦 | 只做第一/零容忍/正道 | Customer First + 一线指挥 |
| xiaomi / 小米 | 🟧 | 专注极致口碑快/性价比 | 参与感三三法则 |
| netflix | 🟤 | Keeper Test/severance/stunning | Keeper Test + 4A Feedback |
| musk | ⬛ | hardcore/ship or die/algorithm | The Algorithm (5步) |
| jobs | ⬜ | A players/real artists ship/bozo | Subtraction + DRI + Pixel-perfect |
| amazon | 🔶 | Customer Obsession/Dive Deep | Working Backwards + 6-Pager |

## 核心实现

```bash
get_flavor() {
  local config="${HOME:-~}/.pua/config.json"
  local raw_flavor=""

  # 1. 读配置
  if [ -f "$config" ]; then
    raw_flavor=$(python3 -c "import os,json; print(json.load(open(os.path.expanduser('~/.pua/config.json'))).get('flavor','alibaba'))" 2>/dev/null || echo "alibaba")
  fi

  # 2. 规范化（支持中英文输入）
  case "$raw_flavor" in
    alibaba|阿里|"") raw_flavor="alibaba" ;;
    bytedance|字节)  raw_flavor="bytedance" ;;
    huawei|华为)     raw_flavor="huawei" ;;
    # ... 所有风味 ...
    *)               raw_flavor="alibaba" ;;  # 未知风味 fallback
  esac

  PUA_FLAVOR="$raw_flavor"

  # 3. 按风味设置变量（13 个 case 分支）
  case "$raw_flavor" in
    alibaba)
      PUA_ICON="🟠"
      PUA_L1="其实，我对你是有一些失望的..."
      PUA_L2="底层逻辑是什么？..."
      PUA_L3="慎重考虑，决定给你 3.25..."
      PUA_L4="别的模型都能解决..."
      PUA_KEYWORDS="底层逻辑, 顶层设计, ..."
      PUA_FLAVOR_INSTRUCTION="Use Alibaba corporate rhetoric: ..."
      PUA_METHODOLOGY="Alibaba Methodology: ..."
      ;;
    # ... 其他风味 ...
  esac
}
```

## 方法论自动路由

除了用户配置的默认风味，还支持**任务类型自动路由**：

```markdown
| 任务类型 | 信号关键词 | 最佳风味 |
|---------|-----------|---------|
| Debug/Fix | error, bug, fix | Huawei (RCA 5-Why) |
| Build New | add, create, build | Musk (The Algorithm) |
| Code Review | review, refactor | Jobs (Subtraction) |
| Research | research, search | Baidu (Search First) |
| Architecture | design, 架构 | Amazon (Working Backwards) |
| Performance | slow, optimize | ByteDance (A/B Test) |
| Deploy/Ops | deploy, 部署 | Alibaba (Closed Loop) |
```

**路由规则**：分析用户第一条消息，如果匹配任务类型，宣布自动选择的方法论。用户手动设置的风味优先。

## 失败时味道切换链

当前方法论连续失败 2+ 次时，按固定链切换（不重复已失败的风味）：

```
原地打转 → Musk → Pinduoduo → Huawei
直接放弃 → Netflix → Huawei → Musk
质量烂   → Jobs → Xiaomi → Netflix
没搜索   → Baidu → Amazon → ByteDance
被动等待 → JD → Meituan → Alibaba
空口完成 → ByteDance → JD → Alibaba
```

## 设计要点

1. **共享 source**：所有 hook 共享同一个 flavor-helper.sh，确保风格一致
2. **中英文兼容**：配置值支持中文别名（"阿里" = "alibaba"）
3. **Fallback**：未知风味默认为 alibaba
4. **13 种预设**：覆盖中西主流大厂文化
5. **可扩展**：添加新风味只需在 case 中增加一个分支
