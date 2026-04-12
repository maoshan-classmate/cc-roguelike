# 实战测试集

测试定义时间：2026-04-12
模式：单资源
等级：部分

## 边界场景识别记录

**识别到的边界场景（来自资源原文）：**
1. Spring damping <= 0 导致无限循环
2. interpolate inputRange 非严格递增
3. Bezier x 值不在 [0,1] 范围
4. 颜色格式不识别
5. overshootClamping 对过冲值的处理

**核心能力点（来自资源原文）：**
1. Spring 弹簧物理计算（阻尼/质量/刚度）
2. Interpolate 多段值映射
3. Easing 缓动函数库
4. Bezier 三次贝塞尔曲线
5. 颜色插值 RGB 通道分离

## 测试用例

### TC-01：Spring 基础弹性动画
**目标任务：** 使用 spring() 函数计算第 0 帧到第 60 帧的值，验证物理行为正确
**预期入口：** scripts/spring.ts → spring()
**成功标准：**
- frame=0 时返回 from 值
- frame 增大时值逐渐接近 to
- damping=10/mass=1/stiffness=100 时，约 30-40 帧后基本稳定
- overshootClamping=true 时不超过 to 值
**类型：** 核心能力
**结果：** 待验证

### TC-02：Interpolate 多段映射与外推
**目标任务：** 验证 interpolate() 的多段映射、clamp/wrap 外推、easing
**预期入口：** scripts/interpolate.ts → interpolate()
**成功标准：**
- `interpolate(15, [0, 15, 30], [0, 1, 0])` === 1（中间点）
- `interpolate(40, [0, 30], [0, 1], { extrapolateRight: 'clamp' })` === 1（钳制）
- `interpolate(65, [0, 60], [0, 1], { extrapolateRight: 'wrap' })` 接近 1/12（回绕）
- 带 easing 时结果 ≠ 线性值
**类型：** 核心能力
**结果：** 待验证

### TC-03：Easing 函数曲线正确性
**目标任务：** 验证各 easing 函数在 t=0/t=0.5/t=1 时的返回值
**预期入口：** scripts/easing.ts → Easing class
**成功标准：**
- 所有函数：f(0) ≈ 0, f(1) = 1
- linear(0.5) = 0.5
- quad(0.5) = 0.25
- bounce(0.5) > 0（弹球在中间有值）
- out(cubic)(0.5) = 1 - cubic(0.5) = 1 - 0.125 = 0.875
**类型：** 核心能力
**结果：** 待验证

### TC-04：Bezier 曲线端点和中间值
**目标任务：** 验证 bezier 函数的端点值和已知曲线
**预期入口：** scripts/bezier.ts → bezier()
**成功标准：**
- `bezier(0, 0, 1, 1)(0.5)` ≈ 0.5（线性）
- `bezier(0.42, 0, 0.58, 1)(0)` = 0
- `bezier(0.42, 0, 0.58, 1)(1)` = 1
- x 值超出 [0,1] 抛出错误
**类型：** 核心能力
**结果：** 待验证

### TC-05：颜色插值
**目标任务：** 验证 interpolateColors 的 RGB 分段插值
**预期入口：** scripts/interpolate-colors.ts → interpolateColors()
**成功标准：**
- `interpolateColors(0, [0, 1], ['#000000', '#ffffff'])` 包含 'rgba(0, 0, 0'
- `interpolateColors(1, [0, 1], ['#000000', '#ffffff'])` 包含 'rgba(255, 255, 255'
- `interpolateColors(0.5, [0, 1], ['#ff0000', '#00ff00'])` 包含 'rgba(128, 128, 0'
**类型：** 核心能力
**结果：** 待验证

### TC-06：游戏实战——角色受击动画组合
**目标任务：** 用 spring + interpolate + Easing 组合实现角色受击缩放+闪红效果
**预期入口：** examples/game-animations.md → hitAnimation()
**成功标准：**
- 帧 0：scale=1.3, redOverlay=0.6（最大缩放+最强红色）
- 帧 15：scale≈1.0, redOverlay≈0（恢复正常）
- scale 从不小于 1.0（overshootClamping）
**类型：** 边界场景
**结果：** 待验证
