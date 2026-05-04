import { describe, it, expect } from 'vitest';
import { StatusManager, type TickContext } from '../game/status/StatusManager';

function makeCtx(): TickContext & { dmg: number; heal: number; energy: number } {
  return {
    entityId: 'test',
    dmg: 0, heal: 0, energy: 0,
    dealDamage(_id: string, amount: number) { this.dmg += amount; },
    healTarget(_id: string, amount: number) { this.heal += amount; },
    restoreEnergy(_id: string, amount: number) { this.energy += amount; },
  };
}

describe('StatusManager', () => {
  it('apply and has', () => {
    const sm = new StatusManager();
    expect(sm.apply('stun', 'src1', 0, 1500)).toBe(true);
    expect(sm.has('stun')).toBe(true);
    expect(sm.has('burn')).toBe(false);
  });

  it('remove', () => {
    const sm = new StatusManager();
    sm.apply('stun', 'src1', 0, 1500);
    sm.remove('stun');
    expect(sm.has('stun')).toBe(false);
  });

  it('clearAll', () => {
    const sm = new StatusManager();
    sm.apply('stun', 'src1', 0, 1500);
    sm.apply('burn', 'src1', 5, 3000);
    sm.clearAll();
    expect(sm.has('stun')).toBe(false);
    expect(sm.has('burn')).toBe(false);
  });

  it('tick reduces remaining and removes expired', () => {
    const sm = new StatusManager();
    const ctx = makeCtx();
    sm.apply('stun', 'src1', 0, 1000);
    sm.tick(500, ctx);
    expect(sm.has('stun')).toBe(true);
    sm.tick(600, ctx);
    expect(sm.has('stun')).toBe(false);
  });

  it('DOT tick deals damage', () => {
    const sm = new StatusManager();
    const ctx = makeCtx();
    sm.apply('burn', 'src1', 5, 3000);
    sm.tick(500, ctx);
    expect(ctx.dmg).toBe(5);
    sm.tick(500, ctx);
    expect(ctx.dmg).toBe(10);
  });

  it('DOT stacks multiply damage', () => {
    const sm = new StatusManager();
    const ctx = makeCtx();
    sm.apply('burn', 'src1', 5, 3000);
    sm.apply('burn', 'src1', 5, 3000); // stacks = 2
    expect(sm.getStacks('burn')).toBe(2);
    sm.tick(500, ctx);
    expect(ctx.dmg).toBe(10); // 5 * 2
  });

  it('exclusive group rejects lower priority', () => {
    const sm = new StatusManager();
    sm.apply('stun', 'src1', 0, 1500); // priority 3
    expect(sm.apply('root', 'src2', 0, 2000)).toBe(false); // priority 2 < 3
    expect(sm.has('stun')).toBe(true);
    expect(sm.has('root')).toBe(false);
  });

  it('exclusive group replaces same priority', () => {
    const sm = new StatusManager();
    sm.apply('stun', 'src1', 0, 1500); // priority 3
    expect(sm.apply('freeze', 'src2', 0, 2000)).toBe(true); // priority 3, replaces
    expect(sm.has('stun')).toBe(false);
    expect(sm.has('freeze')).toBe(true);
  });

  it('aggregated flags merge correctly', () => {
    const sm = new StatusManager();
    sm.apply('slow', 'src1', 0.5, 3000);
    sm.apply('speed_boost', 'src2', 1.5, 5000);
    const flags = sm.getAggregatedFlags();
    // 0.5 * 1.5 = 0.75, clamped to [0.1, 3.0]
    expect(flags.speedMultiplier).toBeCloseTo(0.75);
    expect(flags.blocksMovement).toBe(false);
  });

  it('invulnerable flag blocks all damage', () => {
    const sm = new StatusManager();
    sm.apply('iframes', 'src1', 0, 500);
    const flags = sm.getAggregatedFlags();
    expect(flags.invulnerable).toBe(true);
  });

  it('serialize/deserialize round-trip', () => {
    const sm = new StatusManager();
    sm.apply('burn', 'src1', 5, 3000);
    sm.apply('slow', 'src2', 0.5, 3000);
    const data = sm.serialize();
    expect(data.length).toBe(2);

    const sm2 = new StatusManager();
    sm2.deserialize(data);
    expect(sm2.has('burn')).toBe(true);
    expect(sm2.has('slow')).toBe(true);
    expect(sm2.getValue('burn')).toBe(5);
    expect(sm2.getValue('slow')).toBe(0.5);
  });

  it('cc_immune blocks CC application', () => {
    const sm = new StatusManager();
    sm.apply('cc_immune', 'src1', 0, 2000);
    expect(sm.apply('stun', 'src2', 0, 1500)).toBe(false);
    expect(sm.has('stun')).toBe(false);
  });

  it('max_stacks caps at maxStacks', () => {
    const sm = new StatusManager();
    sm.apply('vulnerable', 'src1', 1.5, 3000);
    sm.apply('vulnerable', 'src1', 1.5, 3000);
    sm.apply('vulnerable', 'src1', 1.5, 3000);
    sm.apply('vulnerable', 'src1', 1.5, 3000); // 4th, should cap at 3
    expect(sm.getStacks('vulnerable')).toBe(3);
  });
});
