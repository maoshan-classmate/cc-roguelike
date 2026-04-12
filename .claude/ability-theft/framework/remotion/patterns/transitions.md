# 转场动画模式

<!-- 转场动画模式 -->

## 转场架构

转场 = **时序（Timing）** + **呈现（Presentation）**

```
Timing：控制 0→1 的进度曲线（线性 / 弹簧）
  ↓ 输出 progress: number (0-1)
Presentation：根据进度值渲染视觉效果（淡入/滑动/擦除）
```

## 时序（Timing）

### linearTiming

```typescript
function linearTiming(options: {
  durationInFrames: number;
  easing?: (t: number) => number;
}): TransitionTiming;
```

进度计算：`interpolate(frame, [0, duration], [0, 1], { easing, clamp })`

### springTiming

```typescript
function springTiming(options?: {
  config?: Partial<SpringConfig>;
  durationInFrames?: number;
  durationRestThreshold?: number;
  reverse?: boolean;
}): TransitionTiming;
```

进度计算：`spring({ frame, fps, from: 0, to: 1, config })`

## 呈现（Presentation）

### fade（淡入淡出）

```typescript
// 进入：opacity = progress（0→1）
// 退出：opacity = 1 - progress（1→0）
fade({ shouldFadeOutExitingScene?: boolean })
```

### slide（滑动）

```typescript
slide({ direction: 'from-left' | 'from-right' | 'from-top' | 'from-bottom' })
```

实现原理：`translateX/Y(百分比)`，用 epsilon=0.01 修正消除白缝。

```
from-left 进入：translateX(-100% + progress*100%)
from-left 退出：translateX(progress*100% - 0.01%)
```

### wipe（擦除）

用 `overflow: hidden` + `width` 从 0% 到 100% 实现遮罩擦除效果。

### iris（虹膜）

圆形遮罩从中心扩散，用 `clip-path: circle()` 实现。

### flip（翻转）

3D CSS 翻转，`rotateY(180deg * progress)`。

### clock-wipe（时钟擦除）

`clip-path: polygon()` 模拟时钟指针扫过的区域。

## 游戏转场应用

```typescript
// 关卡切换淡入淡出
function levelTransition(frame: number, fps: number) {
  const progress = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic)
  });

  return {
    opacity: progress <= 0.5
      ? 1 - progress * 2      // 前半段淡出
      : (progress - 0.5) * 2, // 后半段淡入
  };
}

// 战斗开始滑动进入
function battleSlideIn(frame: number) {
  const progress = spring({ frame, fps: 60, config: { damping: 15 } });
  return {
    translateX: (1 - progress) * 300
  };
}
```
