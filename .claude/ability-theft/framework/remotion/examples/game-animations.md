# 游戏动画实战示例

<!-- 游戏动画实战：帧驱动动画函数的 Canvas 应用 -->

## 示例 1：角色受击闪红 + 缩放

```typescript
import { spring } from './scripts/spring';
import { interpolate } from './scripts/interpolate';
import { Easing } from './scripts/easing';

function hitAnimation(framesSinceHit: number) {
  // 缩放：先放大到 1.3 倍再弹回 1.0
  const scale = spring({
    frame: framesSinceHit,
    fps: 60,
    from: 1.3,
    to: 1.0,
    config: { damping: 12, stiffness: 200, overshootClamping: true }
  });

  // 闪红：前 5 帧红色覆盖，然后淡出
  const redOverlay = interpolate(
    framesSinceHit,
    [0, 5, 15],
    [0.6, 0.3, 0],
    { extrapolateRight: 'clamp' }
  );

  return { scale, redOverlay };
}

// Canvas 渲染
function drawHitSprite(ctx: CanvasRenderingContext2D, frame: number) {
  const { scale, redOverlay } = hitAnimation(frame);

  ctx.save();
  ctx.scale(scale, scale);
  // ... 正常绘制精灵
  drawSprite(ctx, spriteX, spriteY);

  // 红色覆盖层
  if (redOverlay > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(255, 0, 0, ${redOverlay})`;
    ctx.fillRect(spriteX, spriteY, spriteWidth, spriteHeight);
  }
  ctx.restore();
}
```

## 示例 2：伤害数字上飘

```typescript
import { interpolate } from './scripts/interpolate';
import { Easing } from './scripts/easing';

interface DamageText {
  value: number;
  x: number;
  y: number;
  startFrame: number;
  isCritical: boolean;
}

function updateDamageTexts(texts: DamageText[], currentFrame: number) {
  return texts
    .filter(t => currentFrame - t.startFrame < 45) // 45帧后移除
    .map(t => {
      const localFrame = currentFrame - t.startFrame;

      // Y 轴上飘
      const y = interpolate(localFrame, [0, 45], [t.y, t.y - 60], {
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic)
      });

      // 缩放：先放大再缩小
      const scale = interpolate(
        localFrame,
        [0, 5, 45],
        [0.5, t.isCritical ? 1.5 : 1.2, 0.3],
        { extrapolateRight: 'clamp' }
      );

      // 透明度
      const opacity = interpolate(localFrame, [0, 20, 45], [1, 1, 0], {
        extrapolateRight: 'clamp'
      });

      return { ...t, renderY: y, scale, opacity };
    });
}
```

## 示例 3：宝箱掉落弹跳

```typescript
import { spring } from './scripts/spring';
import { interpolate } from './scripts/interpolate';
import { Easing } from './scripts/easing';

function chestDropAnimation(framesSinceDrop: number) {
  // 下落阶段（前 15 帧）
  const fallProgress = interpolate(framesSinceDrop, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad) // 加速下落
  });

  // 下落距离
  const fallY = fallProgress * 100; // 下落 100px

  // 落地弹跳（15帧后开始）
  const bounceFrame = Math.max(0, framesSinceDrop - 15);
  const bounceY = spring({
    frame: bounceFrame,
    fps: 60,
    from: 0,
    to: -30,
    config: { damping: 6, stiffness: 300 }
  });

  // 落地震屏（15-25帧）
  const shakeX = interpolate(framesSinceDrop, [15, 18, 21, 24, 25], [0, -5, 4, -2, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  // 落地闪光
  const flashOpacity = interpolate(framesSinceDrop, [14, 16, 22], [0, 0.8, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  });

  return {
    y: fallY + bounceY,
    shakeX,
    flashOpacity,
    hasLanded: framesSinceDrop >= 15
  };
}
```

## 示例 4：UI 滑入动画

```typescript
import { spring } from './scripts/spring';
import { interpolate } from './scripts/interpolate';

// 技能栏从底部滑入
function skillBarSlideIn(frame: number, itemCount: number) {
  return Array.from({ length: itemCount }, (_, i) => {
    const staggeredFrame = Math.max(0, frame - i * 4); // 每个延迟 4 帧

    const y = spring({
      frame: staggeredFrame,
      fps: 60,
      from: 80,     // 从底部 80px 处
      to: 0,        // 滑到正常位置
      config: { damping: 14, stiffness: 170, overshootClamping: true }
    });

    const opacity = interpolate(staggeredFrame, [0, 8], [0, 1], {
      extrapolateRight: 'clamp'
    });

    return { offsetY: y, opacity };
  });
}
```

## 示例 5：血条平滑变化

```typescript
import { spring } from './scripts/spring';

class HPBar {
  private displayHP: number;
  private animFrame = 0;

  constructor(private currentHP: number, private maxHP: number) {
    this.displayHP = currentHP;
  }

  takeDamage(damage: number) {
    this.currentHP = Math.max(0, this.currentHP - damage);
    this.animFrame = 0; // 重置动画
  }

  update(): number {
    this.animFrame++;
    // 使用 spring 从当前显示值平滑过渡到实际值
    // 注意：这里需要持续跟踪 target
    const progress = spring({
      frame: this.animFrame,
      fps: 60,
      config: { damping: 20, overshootClamping: true }
    });
    this.displayHP = this.displayHP + (this.currentHP - this.displayHP) * progress;
    return this.displayHP;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
    const hp = this.update();
    const ratio = hp / this.maxHP;

    // 血条背景
    ctx.fillStyle = '#3A2E2C';
    ctx.fillRect(x, y, width, height);

    // 血条前景
    const hpColor = ratio > 0.5 ? '#22CC44' : ratio > 0.25 ? '#CCCC22' : '#CC2222';
    ctx.fillStyle = hpColor;
    ctx.fillRect(x, y, width * ratio, height);
  }
}
```

## 示例 6：技能冷却圆弧

```typescript
import { interpolate } from './scripts/interpolate';

function drawCooldownArc(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  cooldownProgress: number // 0=开始冷却, 1=冷却完成
) {
  // 圆弧从 0 扫到 2π
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + interpolate(
    cooldownProgress,
    [0, 1],
    [Math.PI * 2, 0] // 冷却中扫满，冷却完成消失
  );

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, startAngle + endAngle);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();
}
```
