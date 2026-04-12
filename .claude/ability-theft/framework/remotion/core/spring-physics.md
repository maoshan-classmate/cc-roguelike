# Spring 弹簧物理动画

<!-- 核心概念：基于物理模拟的弹性动画 -->

## 核心思想

Spring 动画基于**阻尼弹簧物理模型**，不是预设的关键帧曲线。结果是自然、有机的运动感。

## 物理参数

| 参数 | 默认值 | 作用 |
|------|--------|------|
| `mass` | 1 | 物体质量，越大惯性越大 |
| `damping` | 10 | 阻尼系数，越大减速越快 |
| `stiffness` | 100 | 弹簧刚度，越大弹力越强 |
| `overshootClamping` | false | 是否禁止过冲（超过目标值） |

## 阻尼比（zeta）

```
zeta = damping / (2 * sqrt(stiffness * mass))
```

| zeta 范围 | 行为 | 视觉效果 |
|-----------|------|----------|
| zeta < 1 | 欠阻尼 | 有弹跳（推荐用于 UI 反馈） |
| zeta = 1 | 临界阻尼 | 最快到达无弹跳 |
| zeta > 1 | 过阻尼 | 缓慢到达 |

## 常用配置预设

| 效果 | mass | damping | stiffness |
|------|------|---------|-----------|
| 轻弹跳 | 1 | 10 | 100 |
| 重弹跳 | 1 | 8 | 200 |
| 无弹跳快 | 1 | 20 | 100 |
| 无弹跳慢 | 1 | 30 | 80 |
| 弹性果冻 | 1 | 5 | 150 |
| 硬弹簧 | 1 | 15 | 300 |

## 底层物理公式

```
omega0 = sqrt(k / m)           // 无阻尼角频率
omega1 = omega0 * sqrt(1 - zeta^2)  // 衰减频率

// 欠阻尼位置：
position = toValue - exp(-zeta * omega0 * t) *
           (sin(omega1 * t) * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos(omega1 * t))

// 临界阻尼位置：
position = toValue - exp(-omega0 * t) * (x0 + (v0 + omega0 * x0) * t)
```

## 从/到值映射

`from` 和 `to` 控制弹簧的起始和终止值：

```typescript
// 从 0 弹到 1（默认）
spring({ frame, fps, from: 0, to: 1 })

// 从 100 弹到 200（缩放效果）
spring({ frame, fps, from: 100, to: 200 })

// 反向弹（从 1 回到 0）
spring({ frame, fps, from: 1, to: 0 })
```

## delay 和 reverse

- `delay: N` — 延迟 N 帧后开始
- `reverse: true` — 反向播放（从终点弹回起点）

## durationInFrames

可强制指定弹簧持续时间（而非自然衰减完毕）：

```typescript
spring({
  frame,
  fps,
  durationInFrames: 20,  // 强制 20 帧完成
  config: { damping: 15 }
})
```

## overshootClamping

```typescript
// 禁止过冲 — 值永远不会超过 to
spring({ frame, fps, config: { overshootClamping: true } })
```

实现方式：
```
if to >= from: min(result, to)
if to < from:  max(result, to)
```
