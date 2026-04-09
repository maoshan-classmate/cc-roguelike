# 前端动画与自适应开发规范

> 登录页重构总结的经验，适用于所有页面级动画开发。

## framer-motion TypeScript 注意事项

- `type: 'spring'` / `type: 'tween'` 在 variants 对象中必须加 `as const`，否则 TS 报类型不兼容
- ease 数组需 `as [number, number, number, number]` 元组断言
- `useSpring` + `useMotionValue` 做鼠标追踪倾斜时，`on('change')` 订阅必须在 `useEffect` 中清理

## tsparticles API

- 用 `initParticlesEngine()` 在 `useEffect` 中初始化，配合 ready state 控制 `<Particles>` 渲染
- 不要用 `init` prop（v3 API 已移除）
- 粒子配置：`direction: 'top'`, `outModes: 'destroy'`, `life.duration` 实现上升消散效果

## AnimatedSprite 组件（`src/components/AnimatedSprite.tsx`）

- `size` prop 支持 `number | string`（可传 CSS `clamp()` 值实现响应式）
- 路径模板：`/src/assets/0x72/frames/CHARACTER/{name}_{anim}_f{frame}.png`
- `requestAnimationFrame` 驱动帧切换，interval 可配置

## DungeonBackground 组件（`src/components/DungeonBackground.tsx`）

- 必须监听 `window.resize` 重绘 Canvas，否则窗口变化后背景断裂
- DPR 缩放：`canvas.width = w * dpr`，`ctx.scale(dpr, dpr)`
- 绘制逻辑抽成纯函数 `drawScene()`，resize 回调直接调用

## 背景层栈定位策略

- **固定页面**（LoginPage：100vh 不滚动）：背景层 `position: absolute`，外层 `overflow: hidden`
- **可滚动页面**（LobbyPage/RoomPage：minHeight:100vh 可溢出）：背景层必须用 `position: fixed, inset: 0`，UI 层 `position: relative, zIndex: 10` 独立滚动
- 错误做法：可滚动页面用 `position: absolute` 背景 → 滚动后背景消失

## 登录页分层架构（z-index 顺序）

| z-index | 层 | 组件/实现 |
|---------|-----|-----------|
| 0 | Canvas 地牢背景 | DungeonBackground |
| 1 | God rays | 旋转 conic-gradient |
| 5 | Ember 粒子 | tsparticles |
| 6 | 底部雾层 | 渐变 div |
| 7 | 暗角 | radial-gradient |
| 10 | UI 层 | 标题/角色/卡片 |

## 自适应原则

- 全部用 CSS `clamp()` / `min()` / `vw/vh` 连续缩放，禁止 JS `isMobile` 硬断点
- Canvas 组件必须响应 resize 事件重绘
- 精灵/标题/卡片/间距/字号全部 `clamp(min, preferred, max)`

## 已有动画组件库（`src/components/animations/`）

- `BlurText`：逐字/逐词 blur 入场动画，支持自定义 keyframes
- `GradientText`：渐变色文字动画，支持水平/垂直/对角方向
- `GlareHover`：鼠标悬停光扫效果
