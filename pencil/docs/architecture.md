# UI 设计架构总览

> 项目：D:\cc-roguelike
> 技术栈：React 18 + Canvas + Tailwind CSS
> 风格：Hybrid 暗黑像素风（像素底层 + 哥特 UI 质感）
> 实现：A（CSS+SVG）为主 + B（PNG 装饰）为辅
> 覆盖：Login + Room + Lobby + Game 全链路

---

## 一、整体架构：三层模型

```
Layer 1：Design Tokens（设计原子层）
Layer 2：Component Library（组件层）
Layer 3：Page Templates（页面模板层）
```

---

## 二、pencil 目录结构

```
pencil/
├── 0.design-tokens/           # 【Layer 1】设计变量原子层
│   ├── colors.pen             # 颜色 token（背景/墙壁/强调/状态色）
│   ├── typography.pen          # 字体 token（像素字体/字号/字重）
│   ├── spacing.pen            # 间距 token（padding/margin/gap）
│   ├── shadow.pen             # 阴影 token（box-shadow 层次体系）
│   └── animation.pen           # 动效 token（过渡时长/缓动曲线）
│
├── 1.components/              # 【Layer 2】组件层
│   ├── atoms/                 # 原子组件（不可再分）
│   │   ├── PixelButton.pen   # 按钮
│   │   ├── PixelIcon.pen     # 图标
│   │   ├── PixelBadge.pen    # 徽章
│   │   ├── PixelInput.pen    # 输入框
│   │   └── PixelProgress.pen # 进度条（HP/SP用）
│   │
│   ├── molecules/             # 分子组件（原子组合）
│   │   ├── PixelCard.pen     # 卡片容器
│   │   ├── PixelPanel.pen    # 面板（带边框装饰）
│   │   ├── PixelHealthBar.pen # 血条（玩家/Boss）
│   │   ├── PixelSkillSlot.pen # 技能槽
│   │   └── PixelTooltip.pen  # 工具提示
│   │
│   └── organisms/              # 有机组件（业务级组合）
│       ├── PixelSkillBar.pen  # 技能栏（4槽）
│       ├── PixelMiniMap.pen   # 小地图
│       ├── PixelPlayerList.pen # 玩家列表
│       ├── PixelChatBox.pen   # 聊天框
│       ├── PixelInventory.pen # 背包
│       ├── PixelBossHealth.pen # Boss 血条
│       └── PixelDamageNumber.pen # 伤害数字
│
├── 2.pages/                   # 【Layer 3】页面模板层
│   ├── login/
│   │   └── LoginPage.pen     # 登录页：账号输入 + 开始按钮
│   ├── room/
│   │   └── RoomPage.pen       # 房间页：房间列表 + 创建 + 加入
│   ├── lobby/
│   │   └── LobbyPage.pen     # 大厅页：职业选择 + 准备状态 + 玩家列表
│   └── game/
│       ├── GamePage-HUD.pen   # 游戏 HUD：玩家血条 + 技能栏 + 小地图
│       ├── GamePage-Overlay.pen # 游戏遮罩：暂停/死亡/结算
│       └── GamePage-Boss.pen  # Boss 血条组件
│
├── 3.assets/                  # 装饰素材（PNG）
│   ├── ui-borders/           # 面板边框装饰（石刻/金属质感）
│   ├── ui-corners/           # 面板四角装饰
│   ├── ui-icons/             # 功能性图标（血瓶/钥匙/钻石等）
│   └── ui-backgrounds/       # 背景纹理（石头/砖墙）
│
└── docs/
    ├── architecture.md       # 本文件：架构总览
    └── design-spec.md        # 完整设计规范（含颜色值/字体/组件规范）

---

## 七、UI 资源入口（assets/inbox/ui-design/）

用户提供的 UI 参考素材统一放入：

```
assets/inbox/ui-design/      # UI 设计参考素材
assets/inbox/art-assets/      # 游戏图片素材
```

**规则**：
- 用户提供的 UI 参考 → 放入 `assets/inbox/ui-design/`
- 用户提供的游戏图片 → 放入 `assets/inbox/art-assets/`
- Agent 分析后 → 判断是否整合到 `pencil/3.assets/` 或直接用于设计稿
- 外部素材须确认授权（CC0 / 商业可用）才能引入项目

---

> 最后更新：2026-03-31
```

---

## 三、Design Tokens 颜色体系（待写入 colors.pen）

| Token | 色值 | 用途 |
|-------|------|------|
| `color-bg-primary` | #2D1B2E | 主背景（深紫黑） |
| `color-bg-secondary` | #1A1210 | 游戏区域背景 |
| `color-wall` | #8B4513 | 墙壁棕色 |
| `color-accent-gold` | #FFD700 | 强调色/边框/文字高亮 |
| `color-accent-dark` | #5C4A3A | 墙壁暗面/阴影 |
| `color-health` | #32CD32 | 生命值 |
| `color-health-lost` | #DC143C | 生命值损失/敌人高亮 |
| `color-mana` | #4A9EFF | 法力/技能 |
| `color-player-1` | #4A9EFF | 玩家1 |
| `color-player-2` | #51CF66 | 玩家2 |
| `color-player-3` | #FFA500 | 玩家3 |
| `color-player-4` | #9B59B6 | 玩家4 |

---

## 四、组件层级索引

### Layer 1：Tokens
| 文件 | 原子内容 |
|------|---------|
| colors.pen | 10-15 个颜色变量 |
| typography.pen | 字体 family / 字号 / 字重 |
| spacing.pen | 4/8/12/16/24/32/48px |
| shadow.pen | 3 层阴影（浅中深） |
| animation.pen | 150ms/300ms 过渡 |

### Layer 2：Components（按依赖顺序排列）
```
atoms（独立使用）
  └→ molecules（依赖 atoms）
        └→ organisms（依赖 molecules）
```

| 组件 | 依赖 | 状态 |
|------|------|------|
| PixelButton | atoms | 待设计 |
| PixelIcon | atoms | 待设计 |
| PixelBadge | atoms | 待设计 |
| PixelInput | atoms | 待设计 |
| PixelProgress | atoms | 待设计 |
| PixelCard | atoms | 待设计 |
| PixelPanel | atoms + 装饰素材 | 待设计 |
| PixelHealthBar | atoms | 待设计 |
| PixelSkillSlot | atoms | 待设计 |
| PixelTooltip | atoms | 待设计 |
| PixelSkillBar | molecules.PixelSkillSlot | 待设计 |
| PixelMiniMap | organisms | 待设计 |
| PixelPlayerList | molecules | 待设计 |
| PixelChatBox | organisms | 待设计 |
| PixelInventory | organisms | 待设计 |
| PixelBossHealth | organisms | 待设计 |
| PixelDamageNumber | organisms | 待设计 |

### Layer 3：Pages

| 页面 | 包含的 Components |
|------|-----------------|
| LoginPage | PixelButton, PixelInput, PixelCard |
| RoomPage | PixelButton, PixelInput, PixelCard, PixelPlayerList |
| LobbyPage | PixelButton, PixelCard, PixelPanel, PixelPlayerList, PixelSkillBar |
| GamePage-HUD | PixelHealthBar, PixelSkillBar, PixelMiniMap, PixelDamageNumber, PixelChatBox |
| GamePage-Overlay | PixelPanel, PixelButton, PixelHealthBar, PixelBossHealth |
| GamePage-Boss | PixelBossHealth |

---

## 五、设计流程约定

1. **先 tokens 后组件** — 颜色/字体/间距先定，组件才能复用
2. **先 atoms 后 organisms** — 依赖顺序不能反
3. **先框架后细节** — 布局走通再填装饰
4. **三文件同步纪律** — .pen 设计稿变更 → docs/design-spec.md 更新 → 代码实现同步

---

## 六、文件更新规则

| 触发条件 | 必须更新的文件 |
|---------|--------------|
| 颜色/字体 token 变更 | 0.design-tokens/*.pen + docs/design-spec.md |
| 新增组件 | 1.components/ 对应层级 + docs/design-spec.md |
| 页面布局变更 | 2.pages/ 对应页面 + docs/design-spec.md |
| 新增装饰素材 | 3.assets/ 对应目录 + docs/design-spec.md |

---

> 最后更新：2026-03-31
