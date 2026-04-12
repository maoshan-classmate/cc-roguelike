# 帧驱动动画模型

<!-- 核心概念：基于帧数的动画控制 -->

## 核心思想

动画不是基于时间戳，而是基于**帧数（frame）**。每一帧是一个整数（可含小数用于亚帧精度），动画函数接收当前帧号，返回当前动画值。

```
frame 0 → 值 0.0
frame 1 → 值 0.15
frame 2 → 值 0.42
...
frame N → 值 1.0（动画完成）
```

## 三层抽象

| 层级 | 概念 | 作用 |
|------|------|------|
| 帧（Frame） | 时间单位 | `frame / fps * 1000 = 毫秒` |
| 序列（Sequence） | 时间区间 | `[from, from + durationInFrames)` |
| 合成（Composition） | 完整动画周期 | 包含多个序列 |

## 帧与时间转换

```
frameToMs = (frame, fps) => (frame / fps) * 1000
msToFrame = (ms, fps) => (ms / 1000) * fps
```

## Sequence 时间偏移

Sequence 是嵌套的时间窗口。子序列的帧号相对于父序列的起始帧偏移：

```
absoluteFrame = parentCumulatedFrom + sequenceFrom
localFrame = absoluteFrame - cumulatedFrom - relativeFrom
```

嵌套规则：
- 子 Sequence 自动继承父 Sequence 的时间偏移
- 超出 `[from, from + duration)` 范围的帧，内容不渲染
- 可用 `premountFor` 实现预挂载（提前渲染但不显示）

## 游戏中的应用

在 Canvas 游戏循环中，用 `requestAnimationFrame` 驱动帧计数器：

```typescript
let frameCount = 0;
const FPS = 60;

function gameLoop(timestamp: number) {
  // 帧驱动：所有动画值由当前帧决定
  const opacity = interpolate(frameCount, [0, 30], [0, 1], {
    extrapolateRight: 'clamp'
  });
  const scale = spring({ frame: frameCount, fps: FPS, config: { damping: 12 } });

  // 渲染使用计算出的值
  ctx.globalAlpha = opacity;
  ctx.scale(scale, scale);
  drawSprite();

  frameCount++;
  requestAnimationFrame(gameLoop);
}
```

## 关键优势

1. **确定性**：相同帧号总是产生相同结果（无随机性）
2. **可缓存**：帧 → 值的映射可预计算并缓存
3. **可组合**：多个动画值可算术组合（加、减、乘）
4. **可逆**：反向播放只需递减帧号
