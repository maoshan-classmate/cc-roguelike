# Easing 缓动函数库

<!-- 核心概念：控制动画速度曲线 -->

## 完整函数列表

| 函数 | 公式 | 效果 |
|------|------|------|
| `linear(t)` | `t` | 匀速 |
| `ease(t)` | `bezier(0.42, 0, 1, 1)` | 标准缓入 |
| `quad(t)` | `t * t` | 二次方加速 |
| `cubic(t)` | `t * t * t` | 三次方加速 |
| `poly(n)` | `t ** n` | N 次方 |
| `sin(t)` | `1 - cos(t * PI / 2)` | 正弦缓入 |
| `circle(t)` | `1 - sqrt(1 - t * t)` | 圆弧缓入 |
| `exp(t)` | `2 ** (10 * (t - 1))` | 指数加速 |
| `elastic(bounciness)` | `1 - cos(t*PI/2)^3 * cos(t*p)` | 弹性（果冻感） |
| `back(s)` | `t*t*((s+1)*t-s)` s默认1.70158 | 回弹（超射后回） |
| `bounce(t)` | 分段二次 | 弹球落地感 |

## in / out / inOut 修饰器

任何缓动函数都可以组合方向：

```typescript
Easing.in(easing)       // 正向（加速）— 默认行为
Easing.out(easing)      // 反向（减速）— 1 - easing(1 - t)
Easing.inOut(easing)    // 前半段加速 + 后半段减速
```

`out` 的实现：`t => 1 - easing(1 - t)`
`inOut` 的实现：`t < 0.5 ? easing(t*2)/2 : 1 - easing((1-t)*2)/2`

## 常用组合

| 效果 | 函数 |
|------|------|
| 自然减速 | `Easing.out(Easing.cubic)` |
| 弹性减速 | `Easing.out(Easing.elastic(1))` |
| 先慢后快再慢 | `Easing.inOut(Easing.quad)` |
| 弹球效果 | `Easing.out(Easing.bounce)` |
| 回弹效果 | `Easing.out(Easing.back(1.7))` |

## 三次贝塞尔曲线

```typescript
Easing.bezier(x1, y1, x2, y2)
```

常见贝塞尔值：
| 名称 | 值 | 效果 |
|------|-----|------|
| ease | `(0.25, 0.1, 0.25, 1)` | CSS ease |
| ease-in | `(0.42, 0, 1, 1)` | CSS ease-in |
| ease-out | `(0, 0, 0.58, 1)` | CSS ease-out |
| ease-in-out | `(0.42, 0, 0.58, 1)` | CSS ease-in-out |

## bounce 的分段函数

```typescript
bounce(t) {
  if (t < 1/2.75)    return 7.5625 * t * t;
  if (t < 2/2.75)    return 7.5625 * (t-1.5/2.75)^2 + 0.75;
  if (t < 2.5/2.75)  return 7.5625 * (t-2.25/2.75)^2 + 0.9375;
  return 7.5625 * (t-2.625/2.75)^2 + 0.984375;
}
```

## 游戏中的应用选择

| 游戏场景 | 推荐 Easing |
|---------|-------------|
| 角色移动 | `Easing.out(Easing.quad)` — 自然减速停车 |
| 按钮反馈 | `Easing.out(Easing.back(1.7))` — 回弹感 |
| 伤害数字 | `Easing.out(Easing.cubic)` — 快出慢停 |
| 血条变化 | `Easing.inOut(Easing.quad)` — 平滑过渡 |
| 宝箱掉落 | `Easing.out(Easing.bounce)` — 弹球落地 |
| UI 滑入 | `Easing.out(Easing.cubic)` — 优雅减速 |
| 技能冷却 | `linear` — 均匀倒计时 |
| 震屏效果 | `Easing.out(Easing.elastic(0.5))` — 震荡衰减 |
