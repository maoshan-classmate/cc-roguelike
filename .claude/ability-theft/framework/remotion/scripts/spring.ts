/**
 * Spring 弹簧物理动画
 *
 * 纯函数，无框架依赖。可直接用于 Canvas 游戏动画。
 */

import { interpolate } from './interpolate.js';

export type SpringConfig = {
  damping: number;
  mass: number;
  stiffness: number;
  overshootClamping: boolean;
};

type AnimationNode = {
  lastTimestamp: number;
  toValue: number;
  current: number;
  velocity: number;
  prevPosition?: number;
};

const defaultSpringConfig: SpringConfig = {
  damping: 10,
  mass: 1,
  stiffness: 100,
  overshootClamping: false,
};

function advance({
  animation,
  now,
  config,
}: {
  animation: AnimationNode;
  now: number;
  config: SpringConfig;
}): AnimationNode {
  const { toValue, lastTimestamp, current, velocity } = animation;

  const deltaTime = Math.min(now - lastTimestamp, 64);

  if (config.damping <= 0) {
    throw new Error('Spring damping must be greater than 0');
  }

  const c = config.damping;
  const m = config.mass;
  const k = config.stiffness;

  const v0 = -velocity;
  const x0 = toValue - current;

  const zeta = c / (2 * Math.sqrt(k * m));
  const omega0 = Math.sqrt(k / m);
  const omega1 = omega0 * Math.sqrt(1 - zeta ** 2);

  const t = deltaTime / 1000;

  const sin1 = Math.sin(omega1 * t);
  const cos1 = Math.cos(omega1 * t);

  const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
  const underDampedFrag1 =
    underDampedEnvelope *
    (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);

  const underDampedPosition = toValue - underDampedFrag1;
  const underDampedVelocity =
    zeta * omega0 * underDampedFrag1 -
    underDampedEnvelope *
      (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);

  const criticallyDampedEnvelope = Math.exp(-omega0 * t);
  const criticallyDampedPosition =
    toValue - criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);

  const criticallyDampedVelocity =
    criticallyDampedEnvelope *
    (v0 * (t * omega0 - 1) + t * x0 * omega0 * omega0);

  return {
    toValue,
    prevPosition: current,
    lastTimestamp: now,
    current: zeta < 1 ? underDampedPosition : criticallyDampedPosition,
    velocity: zeta < 1 ? underDampedVelocity : criticallyDampedVelocity,
  };
}

function springCalculation({
  frame,
  fps,
  config = {},
}: {
  frame: number;
  fps: number;
  config?: Partial<SpringConfig>;
}): AnimationNode {
  const from = 0;
  const to = 1;

  const mergedConfig = { ...defaultSpringConfig, ...config };

  let animation: AnimationNode = {
    lastTimestamp: 0,
    current: from,
    toValue: to,
    velocity: 0,
    prevPosition: 0,
  };
  const frameClamped = Math.max(0, frame);
  const unevenRest = frameClamped % 1;
  for (let f = 0; f <= Math.floor(frameClamped); f++) {
    let adjustedF = f;
    if (f === Math.floor(frameClamped)) {
      adjustedF = f + unevenRest;
    }

    const time = (adjustedF / fps) * 1000;
    animation = advance({
      animation,
      now: time,
      config: mergedConfig,
    });
  }
  return animation;
}

function measureSpring(params: {
  fps: number;
  config?: Partial<SpringConfig>;
  threshold?: number;
}): number {
  const { fps, config = {}, threshold = 0.005 } = params;
  let frame = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = springCalculation({ frame, fps, config });
    if (Math.abs(result.current - 1) < threshold && Math.abs(result.velocity) < threshold) {
      return frame;
    }
    frame++;
    if (frame > 10000) return 10000; // 安全上限
  }
}

/**
 * Spring 弹簧动画
 *
 * @param params.frame 当前帧号
 * @param params.fps 帧率
 * @param params.config 弹簧配置
 * @param params.from 起始值（默认 0）
 * @param params.to 目标值（默认 1）
 * @param params.durationInFrames 强制持续时间
 * @param params.durationRestThreshold 弹簧静止阈值
 * @param params.delay 延迟帧数
 * @param params.reverse 反向播放
 * @returns 当前弹簧值
 */
export function spring({
  frame: passedFrame,
  fps,
  config = {},
  from = 0,
  to = 1,
  durationInFrames: passedDurationInFrames,
  durationRestThreshold,
  delay = 0,
  reverse = false,
}: {
  frame: number;
  fps: number;
  config?: Partial<SpringConfig>;
  from?: number;
  to?: number;
  durationInFrames?: number;
  durationRestThreshold?: number;
  delay?: number;
  reverse?: boolean;
}): number {
  if (config.damping !== undefined && config.damping <= 0) {
    throw new Error('Spring damping must be greater than 0');
  }
  if (passedFrame < 0) {
    return from;
  }
  if (fps <= 0) {
    throw new Error('fps must be greater than 0');
  }

  const needsToCalculateNaturalDuration =
    reverse || typeof passedDurationInFrames !== 'undefined';

  const naturalDuration = needsToCalculateNaturalDuration
    ? measureSpring({ fps, config, threshold: durationRestThreshold })
    : undefined;

  const reverseProcessed = reverse
    ? (passedDurationInFrames ?? naturalDuration!) - passedFrame
    : passedFrame;

  const delayProcessed = reverseProcessed + (reverse ? delay : -delay);

  if (delayProcessed < 0) return from;

  const durationProcessed =
    passedDurationInFrames === undefined
      ? delayProcessed
      : delayProcessed / (passedDurationInFrames / naturalDuration!);

  if (passedDurationInFrames && delayProcessed > passedDurationInFrames) {
    return to;
  }

  const spr = springCalculation({
    fps,
    frame: durationProcessed,
    config,
  });

  const shouldClamp = config.overshootClamping ?? defaultSpringConfig.overshootClamping;
  // 物理弹簧始终在 [0,1] 范围，clamp 到不超过 1（防止过冲）
  const inner = shouldClamp
    ? Math.min(spr.current, 1)
    : spr.current;

  const interpolated =
    from === 0 && to === 1 ? inner : interpolate(inner, [0, 1], [from, to]);

  return interpolated;
}

export { measureSpring };
