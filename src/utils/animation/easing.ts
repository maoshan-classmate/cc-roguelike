/**
 * Easing 缓动函数库
 * 纯函数，无框架依赖。
 */

import { bezier } from './bezier';

export class Easing {
  static linear(t: number): number {
    return t;
  }

  static ease(t: number): number {
    return Easing.bezier(0.42, 0, 1, 1)(t);
  }

  static quad(t: number): number {
    return t * t;
  }

  static cubic(t: number): number {
    return t * t * t;
  }

  static sin(t: number): number {
    return 1 - Math.cos((t * Math.PI) / 2);
  }

  static circle(t: number): number {
    return 1 - Math.sqrt(1 - t * t);
  }

  static exp(t: number): number {
    return 2 ** (10 * (t - 1));
  }

  static back(s = 1.70158): (t: number) => number {
    return (t): number => t * t * ((s + 1) * t - s);
  }

  static bounce(t: number): number {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    }
    if (t < 2 / 2.75) {
      const t2_ = t - 1.5 / 2.75;
      return 7.5625 * t2_ * t2_ + 0.75;
    }
    if (t < 2.5 / 2.75) {
      const t2_ = t - 2.25 / 2.75;
      return 7.5625 * t2_ * t2_ + 0.9375;
    }
    const t2 = t - 2.625 / 2.75;
    return 7.5625 * t2 * t2 + 0.984375;
  }

  static bezier(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): (t: number) => number {
    return bezier(x1, y1, x2, y2);
  }

  static in(easing: (t: number) => number): (t: number) => number {
    return easing;
  }

  static out(easing: (t: number) => number): (t: number) => number {
    return (t): number => 1 - easing(1 - t);
  }

  static inOut(easing: (t: number) => number): (t: number) => number {
    return (t): number => {
      if (t < 0.5) {
        return easing(t * 2) / 2;
      }
      return 1 - easing((1 - t) * 2) / 2;
    };
  }
}
