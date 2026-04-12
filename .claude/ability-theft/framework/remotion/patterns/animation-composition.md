# 动画组合模式

<!-- 动画组合技术 -->

## 核心原则：动画值是数字，可以算术组合

Spring 和 interpolate 返回的都是普通数字。可以对它们做加减乘除来创建复杂动画。

## 进入+退出模式（Enter-Exit）

```typescript
// 进入动画：从 0 到 1
const enter = spring({ fps, frame, config: { damping: 200 } });

// 退出动画：在最后 20 帧从 0 到 1
const exit = spring({
  fps,
  config: { damping: 200 },
  durationInFrames: 20,
  delay: durationInFrames - 20,
  frame,
});

// 组合：先进入后退出
const scale = enter - exit;
// frame=0: enter=0, exit=0, scale=0
// frame=10: enter≈1, exit=0, scale≈1
// frame=N-10: enter=1, exit≈0, scale≈1
// frame=N: enter=1, exit=1, scale=0
```

## 交错模式（Stagger）

```typescript
// 多个元素的交错出现
items.map((item, i) => {
  const staggeredFrame = Math.max(0, frame - i * 5); // 每个延迟 5 帧
  return spring({ frame: staggeredFrame, fps, config: { damping: 12 } });
});
```

## 叠加模式（Layered）

```typescript
// 水平位移 + 垂直弹跳叠加
const xMove = interpolate(frame, [0, 30], [-100, 0], { extrapolateRight: 'clamp' });
const yBounce = spring({ frame, fps, config: { damping: 6, stiffness: 200 } });
const yOscillation = Math.sin(frame * 0.3) * 5; // 持续微幅震荡

const totalX = xMove;
const totalY = yBounce * 30 + yOscillation;
```

## 缩放+透明度组合

```typescript
// 从小到大 + 从透明到不透明
const scale = spring({ frame, fps, config: { damping: 10 } });
const opacity = interpolate(frame, [0, 10], [0, 1], {
  extrapolateRight: 'clamp',
  easing: Easing.out(Easing.quad)
});

// scale 控制大小，opacity 控制透明度
// 视觉上：先快速变不透明，同时弹跳放大
```

## 轨迹效果（Trail）

Trail 的原理：复制 N 层，每层冻结到 `currentFrame - lag * (N - i)` 帧，透明度递减。

```typescript
// 简化版轨迹
for (let i = 0; i < layers; i++) {
  const trailFrame = currentFrame - lagInFrames * (layers - i);
  const trailOpacity = baseOpacity - ((layers - i) / layers) * baseOpacity;
  // 在 trailFrame 帧处渲染一层，透明度 = trailOpacity
}
```

## 循环动画（Loop）

```typescript
// 使用 wrap 外推实现无缝循环
const loopProgress = interpolate(frame, [0, 60], [0, 1], {
  extrapolateRight: 'wrap'  // 到 60 帧后回到 0 重新开始
});
```

## 游戏中的组合实战

```typescript
// 技能特效：扩散 + 淡出 + 旋转
function skillEffect(frame: number, fps: number) {
  const expand = spring({ frame, fps, config: { damping: 15, stiffness: 150 } });
  const fadeOut = interpolate(frame, [20, 40], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rotation = frame * 6; // 每帧旋转 6 度

  return {
    radius: expand * 80,
    opacity: fadeOut,
    angle: rotation
  };
}

// 伤害数字：上飘 + 缩小 + 淡出
function damageNumber(frame: number, fps: number) {
  const floatUp = interpolate(frame, [0, 40], [0, -50], { extrapolateRight: 'clamp' });
  const shrink = interpolate(frame, [0, 10, 40], [1.2, 1, 0.5], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [20, 40], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return { y: floatUp, scale: shrink, opacity: fadeOut };
}
```
