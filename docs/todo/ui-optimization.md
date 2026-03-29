# TODO — UI 优化

## 页面图标替换 ✅ 已完成
- [x] 登录页面 emoji → 像素 SVG 图标
- [x] 大厅页面 emoji → 像素 SVG 图标
- [x] 房间页面 emoji → 像素 SVG 图标
- [x] 游戏页面 HUD emoji → 像素 SVG 图标
- [x] 房间页面头像 → 像素风格角色头像（战士/游侠/法师/牧师）

## UI 问题修复 ✅ 已完成
- [x] 修复按钮白色边框 → 移除边框 (`border: none`)
- [x] 修复 PlayerIcon 组件引用错误
- [x] 修复缺失的图标导入 (PixelSkull, PixelCrown 等)

## 全面 UI 优化 ✅ 已完成 (2026-03-28)
- [x] 引入 Tailwind CSS v4 (PostCSS 方式)
- [x] 配置像素主题色和 Tailwind `@theme` 变量
- [x] 加载 Kenney 像素字体
- [x] Canvas 血条 drawHPBar → 像素立体风格
- [x] Canvas 皇冠 drawBossCrown → fillRect 像素块皇冠 + 三色宝石
- [x] Canvas 箭头 drawDirectionArrow → fillRect 像素块箭头 + 阴影
- [x] Canvas 名称 drawNameTag → 暗色背景面板 + Kenney 字体
- [x] 登录页：消除 `━━━` `◆` `⚠` `>>> <<<` 装饰
- [x] 大厅页：消除 `⚔` emoji，替换 `alert()` 为内联错误通知
- [x] 房间页：消除 `✓` `○` `◆` `⏳` Unicode 字符
- [x] PixelSprites：消除所有 emoji，改用内联 SVG
- [x] GameAssets：消除 `♥` `◆` `★` Unicode，改用 SVG 图标
- [x] 全局字体 Courier New → Kenney Mini Square Mono
- [x] 补全 CSS 变量

## 地牢渲染修复 ✅ 已完成 (2026-03-29)
- [x] 墙壁/地板不对齐 → 改用 fillRect 像素风格绘制
- [x] 背景网格消失 → 添加 `import.meta.env.DEV` 网格叠加层
- [x] 走廊不可见 → 添加 corridorTiles 协议

## 待优化
- [ ] 优化技能栏图标
- [ ] 添加地牢楼层切换动画
