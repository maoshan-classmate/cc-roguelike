---
name: remotion
version: v1
date: 2026-04-12
source: D:\remotion (git clone, main branch)
source-type: local-git-clone
source-version: remotion v4.0.448
theft-level: partial
theft-scope: animation system (spring/interpolate/easing/bezier/transitions/composition)
theft-focus: apply animation capabilities to Canvas-based roguelike game
---

# Remotion 动画能力库

从 Remotion 框架提取的动画核心能力，已去除 React 依赖，可直接用于 Canvas 游戏动画。

## 快速入口

| 需求 | 入口 |
|------|------|
| **直接使用动画函数** | `scripts/` — 5个独立 TS 文件，零依赖可直接复制到项目中 |
| **理解帧动画模型** | `core/frame-animation-model.md` — 帧驱动 vs 时间驱动 |
| **Spring 弹簧效果** | `core/spring-physics.md` — 物理参数 + 预设表 |
| **值插值** | `core/interpolation.md` — 范围映射 + 外推模式 |
| **缓动曲线** | `core/easing-functions.md` — 13种缓动 + 游戏场景推荐 |
| **颜色过渡** | `core/color-interpolation.md` — RGB 插值 |
| **游戏实战示例** | `examples/game-animations.md` — 6个游戏动画完整实现 |
| **动画组合技术** | `patterns/animation-composition.md` — enter/exit + 交错 + 叠加 |
| **转场模式** | `patterns/transitions.md` — fade/slide/wipe/iris |
| **API 参考** | `rules/spring-api.md` + `rules/interpolate-api.md` |

## 核心能力速查

1. **Spring** — 物理弹簧动画：`spring({ frame, fps, config: { damping, mass, stiffness } })`
2. **Interpolate** — 值映射：`interpolate(input, [inputRange], [outputRange], { easing, extrapolate })`
3. **Easing** — 13种缓动函数：`Easing.out(Easing.cubic)` 等
4. **Bezier** — 三次贝塞尔：`bezier(x1, y1, x2, y2)`
5. **颜色插值** — `interpolateColors(input, [range], ['#color1', '#color2'])`

## 文件结构

```
core/
  frame-animation-model.md   — 帧驱动动画理论
  spring-physics.md          — 弹簧物理原理与预设
  interpolation.md           — 值插值原理
  easing-functions.md        — 缓动函数完整列表 + 游戏推荐
  color-interpolation.md     — 颜色插值原理

rules/
  spring-api.md              — Spring 完整 API 参考
  interpolate-api.md         — Interpolate + interpolateColors API 参考

patterns/
  transitions.md             — 转场模式（timing + presentation）
  animation-composition.md   — 动画组合技术（enter/exit/交错/叠加/轨迹）

mechanisms/
  frame-driven-animation-loop.md  — 帧驱动循环机制蒸馏

examples/
  game-animations.md         — 6个游戏动画实战（受击/伤害数字/宝箱/UI/血条/冷却）

scripts/
  bezier.ts                  — 三次贝塞尔曲线（独立可用）
  easing.ts                  — Easing 缓动函数库（独立可用）
  interpolate.ts             — interpolate + mapRange（独立可用）
  spring.ts                  — spring + measureSpring（独立可用）
  interpolate-colors.ts      — interpolateColors（依赖 interpolate）

tests/
  test-cases.md              — 6项测试用例（核心+边界）
```

## 在项目中使用

将 `scripts/` 中的文件复制到 `src/utils/animation/` 即可直接使用：

```typescript
import { spring } from '@/utils/animation/spring';
import { interpolate } from '@/utils/animation/interpolate';
import { Easing } from '@/utils/animation/easing';
```

## 版本历史

- v1 (2026-04-12): 初始提取，部分窃取，聚焦动画能力
