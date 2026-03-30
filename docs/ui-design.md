
# UI 设计规范

## 美术风格

### 像素复古风格颜色
- 背景：`#2D1B2E`（深紫黑）
- 墙壁：`#8B4513`（棕色）
- 金色：`#FFD700`（强调色）
- 敌人红：`#DC143C`
- 生命绿：`#32CD32`
- 玩家色：玩家1 `#4A9EFF`、玩家2 `#51CF66`、玩家3 `#FFA500`、玩家4 `#9B59B6`

### 设计原则
- **暗黑地牢氛围**：深色调为主，光源（道具、技能）作为视觉焦点
- **像素风格**：所有游戏内绘制使用 `imageRendering: 'pixelated'`
- **UI保持可读性**：HUD 和信息面板使用明亮强调色

## 资源使用规范

**优先使用现有资源**：在创建或修改任何图片、图标、精灵之前，**必须**先检查：
- `src/assets/kenney/`
- `src/assets/images/`
- `public/fonts/`

**搜索下载规则**：
1. 首选 Kenney.nl（已下载的资源在 `resources/kenney/`）
2. 其次 itch.io / opengameart.org（必须 CC0 或 commercial use allowed）
3. 下载后放入对应目录并更新资源索引
4. 禁止直接链接外部图片 URL

## Tailwind CSS
- 使用 PostCSS 方式：`@tailwindcss/postcss` + `postcss.config.js`（不要用 `@tailwindcss/vite`）
- `src/index.css` 顶部添加 `@import "tailwindcss"` + `@theme` 块

## Canvas 游戏渲染
- 实体绘制使用 `fillRect()` 纯色占位，或精灵图 `drawSpriteAt()`
- 绘制时设置 `imageRendering: 'pixelated'`
- 像素艺术元素（血条、皇冠、箭头等）统一用 `fillRect` 绘制
- 添加 3D 立体感：高光线（顶部/左侧亮色）+ 阴影线（底部/右侧暗色）
- 名称标签需添加半透明暗色背景面板

## pencil UI 设计架构

pencil 文件夹已建立完整三层架构，详见 [Pencil UI 设计架构](pencil/docs/architecture.md)。

**设计风格**：Hybrid 暗黑像素风（像素底层 + 哥特 UI 质感）
**实现方案**：A（CSS+SVG）为主 + B（PNG 装饰）为辅
**覆盖范围**：Login + Room + Lobby + Game 全链路

> 后续 UI 设计稿统一在 `pencil/` 目录下对应的 .pen 文件中，架构变更同步更新 `pencil/docs/architecture.md`。

## UI 组件规范
- SVG 组件放置在 `src/components/PixelIcons.tsx`
- 像素图标模式：内联 `<svg>` + `imageRendering: 'pixelated'`
- 按钮/卡片使用 `border: none`
- SVG 组件必须显式导入
- 禁止使用 `alert()`，替换为内联错误通知
