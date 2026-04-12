# Interpolate API 规范

<!-- interpolate 和 interpolateColors 的完整 API 参考 -->

## interpolate

```typescript
function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: InterpolateOptions
): number;

type InterpolateOptions = Partial<{
  easing: (input: number) => number;
  extrapolateLeft: 'extend' | 'identity' | 'clamp' | 'wrap';
  extrapolateRight: 'extend' | 'identity' | 'clamp' | 'wrap';
}>;
```

### 参数校验规则

| 条件 | 错误 |
|------|------|
| `input` 为 undefined | `input can not be undefined` |
| `inputRange` 与 `outputRange` 长度不同 | 长度不匹配错误 |
| `inputRange` 非严格递增 | `inputRange must be strictly monotonically increasing` |
| `inputRange` 含非有限数 | `must contain only finite numbers` |
| `inputRange` 少于 2 个元素 | `must have at least 2 elements` |
| `input` 非数字 | `Cannot interpolate an input which is not a number` |

### 计算流程

```
1. 找到 input 落在 inputRange 的哪个区间 [rangeStart, rangeEnd]
2. 如果 input < rangeStart → 按 extrapolateLeft 处理
3. 如果 input > rangeEnd → 按 extrapolateRight 处理
4. 归一化：result = (input - rangeStart) / (rangeEnd - rangeStart)
5. 应用缓动：result = easing(result)
6. 映射输出：result = result * (outputEnd - outputStart) + outputStart
```

## interpolateColors

```typescript
function interpolateColors(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly string[]
): string;
```

### 与 interpolate 的区别

| 特性 | interpolate | interpolateColors |
|------|-------------|-------------------|
| 输出类型 | number | string (rgba) |
| 缓动 | 支持 easing 选项 | 不支持（始终线性RGB插值） |
| 外推 | 支持 4 种模式 | 隐式 clamp |
| 多段映射 | 支持 | 支持 |

### 支持的输入格式

输出范围支持：命名色、hex(3/4/6/8)、rgb/rgba、hsl/hsla、oklch、oklab、lab、lch、hwb

### 返回格式

总是返回 `rgba(r, g, b, a)` 字符串。

## 游戏中的实用封装

```typescript
// 帧范围映射 + clamp 的快捷版
function mapFrame(frame: number, start: number, end: number, from: number, to: number): number {
  return interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });
}

// 带 easing 的版本
function mapFrameEase(
  frame: number, start: number, end: number,
  from: number, to: number, easing: (t: number) => number
): number {
  return interpolate(frame, [start, end], [from, to], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing
  });
}
```
