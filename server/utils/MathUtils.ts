export class MathUtils {
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  static randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  static randomBool(probability: number = 0.5): boolean {
    return Math.random() < probability;
  }

  static angleBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  static circleCollision(
    x1: number, y1: number, r1: number,
    x2: number, y2: number, r2: number
  ): boolean {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < r1 + r2;
  }

  static pointInArc(
    px: number, py: number,
    cx: number, cy: number,
    radius: number,
    startAngle: number,
    endAngle: number
  ): boolean {
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > radius) return false;

    let angle = Math.atan2(dy, dx);
    if (angle < 0) angle += Math.PI * 2;

    // Normalize angles
    let start = startAngle % (Math.PI * 2);
    let end = endAngle % (Math.PI * 2);
    if (start < 0) start += Math.PI * 2;
    if (end < 0) end += Math.PI * 2;

    if (start <= end) {
      return angle >= start && angle <= end;
    } else {
      return angle >= start || angle <= end;
    }
  }

  static seededRandom(seed: number): () => number {
    return () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  }
}
