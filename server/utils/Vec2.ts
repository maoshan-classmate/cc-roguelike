export class Vec2 {
  constructor(public x: number = 0, public y: number = 0) {}

  add(v: Vec2): Vec2 {
    return new Vec2(this.x + v.x, this.y + v.y);
  }

  sub(v: Vec2): Vec2 {
    return new Vec2(this.x - v.x, this.y - v.y);
  }

  mul(s: number): Vec2 {
    return new Vec2(this.x * s, this.y * s);
  }

  div(s: number): Vec2 {
    return new Vec2(this.x / s, this.y / s);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize(): Vec2 {
    const len = this.length();
    if (len === 0) return new Vec2(0, 0);
    return this.div(len);
  }

  distanceTo(v: Vec2): number {
    return this.sub(v).length();
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  clone(): Vec2 {
    return new Vec2(this.x, this.y);
  }

  static fromAngle(angle: number, length: number = 1): Vec2 {
    return new Vec2(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return new Vec2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  static random(): Vec2 {
    const angle = Math.random() * Math.PI * 2;
    return Vec2.fromAngle(angle);
  }
}
