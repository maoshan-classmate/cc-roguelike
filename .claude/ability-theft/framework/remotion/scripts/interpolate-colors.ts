/**
 * 颜色插值
 *
 * 纯函数，无框架依赖。可直接用于 Canvas 游戏动画。
 */

import { interpolate } from './interpolate.js';

// 命名颜色表（常用子集）
const colorNames: Record<string, number> = {
  transparent: 0x00000000,
  black: 0x000000ff,
  white: 0xffffffff,
  red: 0xff0000ff,
  green: 0x008000ff,
  blue: 0x0000ffff,
  yellow: 0xffff00ff,
  cyan: 0x00ffffff,
  magenta: 0xff00ffff,
  orange: 0xffa500ff,
  purple: 0x800080ff,
  gray: 0x808080ff,
  grey: 0x808080ff,
};

function normalizeColor(color: string): number {
  const matchers = {
    hex6: /^#([0-9a-fA-F]{6})$/,
    hex8: /^#([0-9a-fA-F]{8})$/,
    hex3: /^#([0-9a-fA-F]{3})$/,
    rgb: /rgb\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/,
    rgba: /rgba\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/,
  };

  if (colorNames[color] !== undefined) return colorNames[color];

  let match: RegExpExecArray | null;

  if ((match = matchers.hex6.exec(color))) {
    return Number.parseInt(match[1] + 'ff', 16) >>> 0;
  }

  if ((match = matchers.hex8.exec(color))) {
    return Number.parseInt(match[1], 16) >>> 0;
  }

  if ((match = matchers.hex3.exec(color))) {
    return (
      Number.parseInt(
        match[1] + match[1] + match[2] + match[2] + match[3] + match[3] + 'ff',
        16,
      ) >>> 0
    );
  }

  if ((match = matchers.rgb.exec(color))) {
    return (
      ((Number.parseInt(match[1]) << 24) |
        (Number.parseInt(match[2]) << 16) |
        (Number.parseInt(match[3]) << 8) |
        0xff) >>>
      0
    );
  }

  if ((match = matchers.rgba.exec(color))) {
    const alpha = Number.parseFloat(match[4]);
    return (
      ((Number.parseInt(match[1]) << 24) |
        (Number.parseInt(match[2]) << 16) |
        (Number.parseInt(match[3]) << 8) |
        Math.round(Math.max(0, Math.min(1, alpha)) * 255)) >>>
      0
    );
  }

  throw new Error(`invalid color string: ${color}`);
}


function processColor(color: string): number {
  const normalizedColor = normalizeColor(color);
  // 转换 0xRRGGBBAA → 0xAARRGGBB
  return ((normalizedColor << 24) | (normalizedColor >>> 8)) >>> 0;
}

const opacity = (c: number): number => ((c >> 24) & 255) / 255;
const red = (c: number): number => (c >> 16) & 255;
const green = (c: number): number => (c >> 8) & 255;
const blue = (c: number): number => c & 255;

/**
 * 颜色插值
 *
 * @param input 输入值
 * @param inputRange 输入范围
 * @param outputRange 颜色输出范围
 * @returns rgba(r, g, b, a) 字符串
 */
export function interpolateColors(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly string[],
): string {
  if (inputRange.length !== outputRange.length) {
    throw new Error('inputRange and outputRange must have the same length');
  }

  const processedOutputRange = outputRange.map((c) => processColor(c));

  const [r, g, b, a] = [red, green, blue, opacity].map((f) => {
    const unrounded = interpolate(
      input,
      inputRange,
      processedOutputRange.map((c) => f(c)),
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
    );
    return f === opacity
      ? Number(unrounded.toFixed(3))
      : Math.round(unrounded);
  });

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
