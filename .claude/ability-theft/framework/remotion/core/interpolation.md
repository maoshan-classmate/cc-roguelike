# 值插值（Interpolation）

<!-- 核心概念：将输入范围映射到输出范围 -->

## 核心思想

`interpolate` 是动画系统的基石——将一个范围内的值映射到另一个范围，并可应用缓动函数。

```typescript
interpolate(input, inputRange, outputRange, options?)
```

## 基础用法

```typescript
// 线性映射：帧 0-30 → 透明度 0-1
interpolate(frame, [0, 30], [0, 1])

// 多段映射
interpolate(frame, [0, 15, 30], [0, 1, 0])  // 先升后降

// 带缓动
interpolate(frame, [0, 30], [0, 100], {
  easing: Easing.out(Easing.quad)
})
```

## inputRange 约束

- 必须**严格单调递增**：`[0, 10, 20]` 合法，`[0, 10, 5]` 非法
- 至少 2 个元素
- inputRange 和 outputRange **长度必须相同**

## 外推模式（extrapolate）

控制输入超出范围时的行为：

| 模式 | 行为 | 用途 |
|------|------|------|
| `extend`（默认） | 继续线性延伸 | 动画自然延续 |
| `clamp` | 钳制到边界值 | 防止超出范围 |
| `identity` | 返回原始输入值 | 超范围不做变换 |
| `wrap` | 循环回绕 | 重复动画 |

```typescript
// clamp 防止负值或超 1
interpolate(frame, [0, 30], [0, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp'
})
```

## 缓动（Easing）

在插值计算过程中应用缓动函数，影响值的过渡曲线：

```
result = (input - inputMin) / (inputMax - inputMin)  // 归一化到 [0,1]
result = easing(result)                                // 应用缓动
result = result * (outputMax - outputMin) + outputMin  // 映射到输出范围
```

## 多段插值的段查找

```typescript
function findRange(input, inputRange) {
  let i;
  for (i = 1; i < inputRange.length - 1; ++i) {
    if (inputRange[i] >= input) break;
  }
  return i - 1;
}
```

找到当前输入落在哪两个区间点之间，然后用这对点做线性插值。

## 特殊值处理

- `inputRange` 中的值必须有限（非 Infinity/NaN）
- 当 `outputMin === outputMax` 时直接返回 `outputMin`（避免除零）

## 游戏中的应用

```typescript
// 角色受击闪烁（透明度在 0.3-1 之间波动）
const hitFlash = interpolate(
  (frame % 10),
  [0, 5, 10],
  [1, 0.3, 1],
  { extrapolateRight: 'clamp' }
);

// 血条减少动画
const hpWidth = interpolate(
  animFrame,
  [0, 30],
  [oldHp, newHp],
  { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) }
);
```
