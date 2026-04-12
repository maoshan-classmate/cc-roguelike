# 颜色插值

<!-- 核心概念：颜色空间中的平滑过渡 -->

## 核心思想

`interpolateColors` 将数值映射到颜色空间，在 RGB 通道上分别做线性插值。

```typescript
interpolateColors(input, inputRange, outputRange)
```

## 支持的颜色格式

| 格式 | 示例 |
|------|------|
| 命名色 | `'red'`, `'blue'`, `'transparent'` |
| hex3 | `'#f00'` |
| hex6 | `'#ff0000'` |
| hex8（含alpha） | `'#ff000080'` |
| rgb | `'rgb(255, 0, 0)'` |
| rgba | `'rgba(255, 0, 0, 0.5)'` |
| hsl | `'hsl(0, 100%, 50%)'` |
| hsla | `'hsla(0, 100%, 50%, 0.5)'` |
| oklch | `'oklch(0.63 0.26 29)'` |
| oklab | `'oklab(0.63 0.22 0.06)'` |
| lab | `'lab(53 80 67)'` |
| lch | `'lch(53 105 40)'` |
| hwb | `'hwb(0 0% 0%)'` |

## 内部处理流程

```
1. 解析颜色字符串 → 规范化为 uint32 RGBA
   格式：0xRRGGBBAA

2. 提取 R/G/B/A 四个通道值

3. 对每个通道分别调用 interpolate()，使用 clamp 外推

4. 重组为 rgba() 字符串
```

## 游戏中的应用

```typescript
// 生命值颜色：绿 → 黄 → 红
const hpColor = interpolateColors(
  hpPercent,       // 0-100
  [0, 50, 100],    // inputRange
  ['#ff0000', '#ffff00', '#00ff00']  // 红→黄→绿
);

// 受击闪白
const flashColor = interpolateColors(
  hitProgress,     // 0-1
  [0, 0.5, 1],
  ['transparent', 'rgba(255,255,255,0.8)', 'transparent']
);

// 魔法充能光效
const chargeColor = interpolateColors(
  chargeFrame / totalFrames,
  [0, 0.5, 1],
  ['#000033', '#6600ff', '#ff00ff']
);
```

## 注意事项

- 输出总是 `rgba(r, g, b, a)` 格式
- alpha 通道精度为 3 位小数
- RGB 通道四舍五入到整数
- inputRange/outputRange 长度必须相同
- 不支持同一调用内混合不同颜色空间格式（输入输出各自统一即可）
