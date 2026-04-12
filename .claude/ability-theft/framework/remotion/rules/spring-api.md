# Spring API 规范

<!-- Spring 函数的完整 API 参考 -->

## 函数签名

```typescript
function spring(params: {
  frame: number;
  fps: number;
  config?: Partial<SpringConfig>;
  from?: number;          // 默认 0
  to?: number;            // 默认 1
  durationInFrames?: number;
  durationRestThreshold?: number;
  delay?: number;         // 默认 0
  reverse?: boolean;      // 默认 false
}): number;

interface SpringConfig {
  damping: number;           // 默认 10
  mass: number;              // 默认 1
  stiffness: number;         // 默认 100
  overshootClamping: boolean; // 默认 false
}
```

## 返回值

返回一个 `number`，范围通常在 `[from, to]` 之间（除非 overshootClamping=false 且有弹跳）。

## measureSpring

```typescript
function measureSpring(params: {
  fps: number;
  config?: Partial<SpringConfig>;
  threshold?: number;
}): number;
```

返回弹簧自然衰减到静止所需的帧数。用途：
- 预知动画时长
- 实现 reverse 需要知道总帧数
- 实现 durationInFrames 需要归一化

## 参数约束

- `damping` 必须 > 0，否则永远不收敛
- `frame` 必须 >= 0
- `fps` 必须 > 0
- `durationInFrames` 必须为正数

## 缓存机制

Spring 计算内部有两级缓存：
1. `advanceCache`：单步推进缓存（key = toValue+timestamp+current+velocity+config+now）
2. `calculationCache`：完整计算缓存（key = frame+fps+config）

**游戏优化建议**：对于实时游戏，可使用相同策略——预计算常用弹簧曲线，查表取值。

## 游戏中的使用模式

```typescript
// 1. 角色受击后缩放恢复
const hitScale = spring({
  frame: framesSinceHit,
  fps: 60,
  from: 1.3,
  to: 1.0,
  config: { damping: 12, stiffness: 200, overshootClamping: true }
});

// 2. UI 元素弹入
const uiScale = spring({
  frame: framesSinceShow,
  fps: 60,
  config: { damping: 8, mass: 0.5, stiffness: 150 }
});

// 3. 数值弹跳
const bounceValue = spring({
  frame: frame,
  fps: 60,
  config: { damping: 5, stiffness: 300 }
});
```
