/**
 * 值插值函数
 * 纯函数，无框架依赖。
 */

export type ExtrapolateType = 'extend' | 'identity' | 'clamp' | 'wrap';
export type EasingFunction = (input: number) => number;

export type InterpolateOptions = Partial<{
  easing: EasingFunction;
  extrapolateLeft: ExtrapolateType;
  extrapolateRight: ExtrapolateType;
}>;

function interpolateFunction(
  input: number,
  inputRange: [number, number],
  outputRange: [number, number],
  options: Required<InterpolateOptions>,
): number {
  const { extrapolateLeft, extrapolateRight, easing } = options;

  let result = input;
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;

  if (result < inputMin) {
    if (extrapolateLeft === 'identity') return result;
    if (extrapolateLeft === 'clamp') {
      result = inputMin;
    } else if (extrapolateLeft === 'wrap') {
      const range = inputMax - inputMin;
      result = ((((result - inputMin) % range) + range) % range) + inputMin;
    }
  }

  if (result > inputMax) {
    if (extrapolateRight === 'identity') return result;
    if (extrapolateRight === 'clamp') {
      result = inputMax;
    } else if (extrapolateRight === 'wrap') {
      const range = inputMax - inputMin;
      result = ((((result - inputMin) % range) + range) % range) + inputMin;
    }
  }

  if (outputMin === outputMax) return outputMin;

  result = (result - inputMin) / (inputMax - inputMin);
  result = easing(result);
  result = result * (outputMax - outputMin) + outputMin;

  return result;
}

function findRange(input: number, inputRange: readonly number[]): number {
  let i;
  for (i = 1; i < inputRange.length - 1; ++i) {
    if (inputRange[i] >= input) break;
  }
  return i - 1;
}

function checkValidInputRange(arr: readonly number[]): void {
  for (let i = 1; i < arr.length; ++i) {
    if (!(arr[i] > arr[i - 1])) {
      throw new Error(
        `inputRange must be strictly monotonically increasing but got [${arr.join(',')}]`,
      );
    }
  }
}

function checkInfiniteRange(name: string, arr: readonly number[]): void {
  if (arr.length < 2) {
    throw new Error(name + ' must have at least 2 elements');
  }
  for (const element of arr) {
    if (typeof element !== 'number') {
      throw new Error(`${name} must contain only numbers`);
    }
    if (!Number.isFinite(element)) {
      throw new Error(
        `${name} must contain only finite numbers, but got [${arr.join(',')}]`,
      );
    }
  }
}

export function interpolate(
  input: number,
  inputRange: readonly number[],
  outputRange: readonly number[],
  options?: InterpolateOptions,
): number {
  if (inputRange.length !== outputRange.length) {
    throw new Error(
      `inputRange (${inputRange.length}) and outputRange (${outputRange.length}) must have the same length`,
    );
  }

  checkInfiniteRange('inputRange', inputRange);
  checkInfiniteRange('outputRange', outputRange);
  checkValidInputRange(inputRange);

  const easing = options?.easing ?? ((num: number): number => num);
  const extrapolateLeft: ExtrapolateType = options?.extrapolateLeft ?? 'extend';
  const extrapolateRight: ExtrapolateType = options?.extrapolateRight ?? 'extend';

  const range = findRange(input, inputRange);
  return interpolateFunction(
    input,
    [inputRange[range], inputRange[range + 1]],
    [outputRange[range], outputRange[range + 1]],
    { easing, extrapolateLeft, extrapolateRight },
  );
}
