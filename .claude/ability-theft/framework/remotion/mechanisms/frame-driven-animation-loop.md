# 帧驱动动画循环机制

<!-- 机制蒸馏：帧驱动动画循环 -->

## 机制类型

事件（帧驱动循环）+ 持久化（缓存）

## 工作原理

```
┌─────────────────────────────────────────────┐
│             游戏循环 / rAF                    │
│  requestAnimationFrame(timestamp)            │
│           │                                  │
│           ▼                                  │
│  ┌─────────────────┐                        │
│  │ 帧计数器递增      │ frame++                │
│  └────────┬────────┘                        │
│           │                                  │
│     ┌─────┴──────┐                          │
│     ▼            ▼                           │
│  spring()   interpolate()                    │
│  (物理计算)  (线性映射)                        │
│     │            │                           │
│     └─────┬──────┘                          │
│           ▼                                  │
│  ┌─────────────────┐                        │
│  │ 渲染（Canvas）    │ ctx.draw*()            │
│  └─────────────────┘                        │
│           │                                  │
│           ▼                                  │
│  requestAnimationFrame → 循环                │
└─────────────────────────────────────────────┘
```

## 关键实现细节

### 1. 纯函数设计

所有动画函数都是**纯函数**——输入帧号 + 配置，输出值。无副作用，无状态。

```typescript
// 纯函数：相同输入永远产生相同输出
spring({ frame: 10, fps: 60, config: { damping: 10 } }) // → 0.872...
spring({ frame: 10, fps: 60, config: { damping: 10 } }) // → 0.872...（完全一致）
```

这意味着：
- 动画值可以预计算
- 可以跳帧（跳到任意帧都有正确值）
- 可以倒放（帧号递减即可）

### 2. 帧号归一化

Spring 内部将帧号转为毫秒再计算物理：

```
time = (frame / fps) * 1000  // 帧号 → 毫秒
```

然后对每帧迭代推进物理模拟：
```
for (f = 0; f <= frame; f++) {
  time = (f / fps) * 1000;
  animation = advance(animation, time, config);
}
```

### 3. 缓存策略

Spring 使用两级缓存避免重复计算：

```typescript
// 级别 1：单步推进缓存
const cacheKey = [toValue, lastTimestamp, current, velocity, c, m, k, now].join('-');
if (advanceCache[cacheKey]) return advanceCache[cacheKey];

// 级别 2：完整结果缓存
const calcKey = [frame, fps, damping, mass, overshootClamping, stiffness].join('-');
if (calculationCache[calcKey]) return calculationCache[calcKey];
```

游戏优化：对于固定的弹簧配置，可以预计算所有帧的值存入数组。

### 4. deltaTime 上限

物理推进时限制最大 deltaTime 为 64ms，防止帧率过低时的异常跳跃：

```typescript
const deltaTime = Math.min(now - lastTimestamp, 64);
```

### 5. 序列嵌套的时间偏移

Sequence 使用 Context 嵌套传递时间偏移：

```
parentSeq.cumulatedFrom + seq.from = 全局偏移
localFrame = absoluteFrame - cumulatedFrom - relativeFrom
```

## 游戏中的复现

```typescript
class AnimationTimeline {
  private frame = 0;
  private fps: number;
  private sequences: Map<string, { from: number; duration: number }> = new Map();

  constructor(fps = 60) {
    this.fps = fps;
  }

  tick() {
    this.frame++;
  }

  // 查询某序列内的本地帧号
  localFrame(seqId: string): number {
    const seq = this.sequences.get(seqId);
    if (!seq) return 0;
    return Math.max(0, this.frame - seq.from);
  }

  // 查询某序列是否在活跃范围内
  isActive(seqId: string): boolean {
    const seq = this.sequences.get(seqId);
    if (!seq) return false;
    return this.frame >= seq.from && this.frame < seq.from + seq.duration;
  }
}
```

## 依赖与约束

- 纯函数机制不需要 React 或任何框架
- 缓存使用简单 Map，无外部依赖
- 精度依赖浮点数运算，帧号 > 10000 后可能出现精度问题

## 复现检查清单

- [x] 能否在空白环境中搭建此机制？— 能，纯函数 + requestAnimationFrame
- [x] 能否用此机制注册一个新的自定义动画？— 能，只需写新的 frame→value 函数
- [x] 能否修改此机制的行为而不破坏现有功能？— 能，纯函数无耦合
