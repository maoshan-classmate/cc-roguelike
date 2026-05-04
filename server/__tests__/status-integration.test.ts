import { describe, it, expect } from 'vitest';
import { StatusManager, type TickContext } from '../game/status/StatusManager';

// ── 模拟游戏循环中的实体 + StatusManager 集成 ──

interface MockEntity {
  id: string;
  x: number;
  y: number;
  hp: number;
  hpMax: number;
  energy: number;
  energyMax: number;
  speed: number;
  sm: StatusManager;
  moved: boolean;
  attacked: boolean;
}

function makeEntity(id: string, hp = 100, energy = 50): MockEntity {
  return {
    id, x: 0, y: 0, hp, hpMax: hp, energy, energyMax: 50,
    speed: 100, sm: new StatusManager(), moved: false, attacked: false,
  };
}

function makeTickCtx(e: MockEntity): TickContext {
  return {
    entityId: e.id,
    dealDamage(_id: string, amount: number) { e.hp -= amount; },
    healTarget(_id: string, amount: number) { e.hp = Math.min(e.hpMax, e.hp + amount); },
    restoreEnergy(_id: string, amount: number) { e.energy = Math.min(e.energyMax, e.energy + amount); },
  };
}

function simulateUpdate(entities: MockEntity[], dtMs: number): void {
  for (const e of entities) {
    const ctx = makeTickCtx(e);
    e.sm.tick(dtMs, ctx);
    const flags = e.sm.getAggregatedFlags();
    // 模拟移动逻辑
    if (!flags.blocksMovement) {
      e.x += e.speed * flags.speedMultiplier * (dtMs / 1000);
      e.moved = true;
    }
    // 模拟攻击逻辑
    if (!flags.blocksAttack) {
      e.attacked = true;
    }
  }
}

describe('Status Integration — 游戏循环中的真实效果', () => {

  it('burn DOT 真的扣血', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('burn', 'p1', 5, 3000); // 5 HP/tick, 500ms interval = 10 HP/s

    simulateUpdate([enemy], 500); // 1 tick
    expect(enemy.hp).toBe(95); // 100 - 5

    simulateUpdate([enemy], 500); // 2 ticks
    expect(enemy.hp).toBe(90);
  });

  it('burn 多层叠加伤害', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('burn', 'p1', 5, 3000);
    enemy.sm.apply('burn', 'p1', 5, 3000); // stacks = 2

    simulateUpdate([enemy], 500); // 5 * 2 = 10 damage
    expect(enemy.hp).toBe(90);
  });

  it('stun 阻止移动和攻击', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('stun', 'p1', 0, 1000);

    const beforeX = enemy.x;
    simulateUpdate([enemy], 500);

    expect(enemy.x).toBe(beforeX); // 没移动
    expect(enemy.moved).toBe(false);
    expect(enemy.attacked).toBe(false); // 没攻击
  });

  it('stun 过期后恢复正常', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('stun', 'p1', 0, 500);

    simulateUpdate([enemy], 600); // stun 过期

    expect(enemy.sm.has('stun')).toBe(false);
    expect(enemy.moved).toBe(true); // 过期后的 tick 允许移动
  });

  it('slow 降低移动速度', () => {
    const normal = makeEntity('e1', 100);
    const slowed = makeEntity('e2', 100);
    slowed.sm.apply('slow', 'p1', 0.5, 3000);

    simulateUpdate([normal, slowed], 1000);

    expect(normal.x).toBeCloseTo(100); // speed * 1.0 * 1s
    expect(slowed.x).toBeCloseTo(50);  // speed * 0.5 * 1s
  });

  it('freeze 阻止移动 (speedMultiplier=0)', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('freeze', 'p1', 0, 500);

    simulateUpdate([enemy], 200);

    expect(enemy.x).toBe(0); // 没移动
    expect(enemy.sm.getAggregatedFlags().blocksMovement).toBe(true);
  });

  it('taunt 设置 forcedTarget', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('taunt', 'player1', 0, 3000);

    const flags = enemy.sm.getAggregatedFlags();
    expect(flags.forcedTarget).toBe(true);
    expect(flags.forcedTargetSource).toBe('player1');
  });

  it('invulnerable 挡住伤害标记', () => {
    const player = makeEntity('p1', 100);
    player.sm.apply('invulnerable', 'system', 0, 500);

    const flags = player.sm.getAggregatedFlags();
    expect(flags.invulnerable).toBe(true);
    expect(flags.knockbackImmune).toBe(true);
  });

  it('iframes 提供无敌', () => {
    const player = makeEntity('p1', 100);
    player.sm.apply('iframes', 'system', 0, 300);

    expect(player.sm.getAggregatedFlags().invulnerable).toBe(true);

    // 300ms 后过期
    simulateUpdate([player], 400);
    expect(player.sm.getAggregatedFlags().invulnerable).toBe(false);
  });

  it('heal_over_time 真的回血', () => {
    const player = makeEntity('p1', 100);
    player.hp = 50;
    player.sm.apply('heal_over_time', 'cleric', 5, 3000); // 5 HP per 500ms tick

    simulateUpdate([player], 500);
    expect(player.hp).toBe(55); // 50 + 5

    simulateUpdate([player], 500);
    expect(player.hp).toBe(60);
  });

  it('shield 降低受到的伤害 (damageMultiplier)', () => {
    const player = makeEntity('p1', 100);
    player.sm.apply('shield', 'skill', 0.5, 3000);

    const flags = player.sm.getAggregatedFlags();
    expect(flags.damageMultiplier).toBe(0.5); // 受到伤害 ×0.5
  });

  it('vulnerable 增加受到的伤害', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('vulnerable', 'debuff', 1.5, 3000);

    const flags = enemy.sm.getAggregatedFlags();
    expect(flags.damageMultiplier).toBe(1.5);
  });

  it('weaken 降低造成伤害', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('weaken', 'debuff', 0.6, 3000);

    const flags = enemy.sm.getAggregatedFlags();
    expect(flags.outgoingDamageMultiplier).toBe(0.6);
  });

  it('silence 阻止技能', () => {
    const player = makeEntity('p1', 100);
    player.sm.apply('silence', 'debuff', 0, 3000);

    expect(player.sm.getAggregatedFlags().blocksSkill).toBe(true);
  });

  it('cc_immune 阻止 CC 施加', () => {
    const player = makeEntity('p1', 100);
    player.sm.apply('cc_immune', 'buff', 0, 3000);

    expect(player.sm.apply('stun', 'enemy', 0, 1000)).toBe(false);
    expect(player.sm.apply('freeze', 'enemy', 0, 1000)).toBe(false);
    expect(player.sm.has('stun')).toBe(false);
  });

  it('speed_boost 提高移动速度', () => {
    const normal = makeEntity('e1', 100);
    const boosted = makeEntity('e2', 100);
    boosted.sm.apply('speed_boost', 'buff', 1.5, 5000);

    simulateUpdate([normal, boosted], 1000);

    expect(normal.x).toBeCloseTo(100);
    expect(boosted.x).toBeCloseTo(150); // speed * 1.5
  });

  it('slow + speed_boost 叠加计算', () => {
    const entity = makeEntity('e1', 100);
    entity.sm.apply('slow', 'debuff', 0.5, 3000);
    entity.sm.apply('speed_boost', 'buff', 1.5, 5000);

    const flags = entity.sm.getAggregatedFlags();
    expect(flags.speedMultiplier).toBeCloseTo(0.75); // 0.5 * 1.5

    simulateUpdate([entity], 1000);
    expect(entity.x).toBeCloseTo(75); // speed * 0.75
  });

  it('exclusive group: stun 替换 root', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('root', 'p1', 0, 2000);
    expect(enemy.sm.has('root')).toBe(true);

    // stun (priority 3) > root (priority 2) — replaces
    expect(enemy.sm.apply('stun', 'p1', 0, 1000)).toBe(true);
    expect(enemy.sm.has('root')).toBe(false);
    expect(enemy.sm.has('stun')).toBe(true);
  });

  it('exclusive group: root 被 stun 拒绝 (反向)', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('stun', 'p1', 0, 1000);

    // root (priority 2) < stun (priority 3) — rejected
    expect(enemy.sm.apply('root', 'p1', 0, 2000)).toBe(false);
    expect(enemy.sm.has('stun')).toBe(true);
  });

  it('energy_regen_boost 提高能量回复', () => {
    const player = makeEntity('p1', 100, 50);
    player.energy = 30;
    player.sm.apply('energy_regen_boost', 'buff', 2.0, 5000);

    const flags = player.sm.getAggregatedFlags();
    expect(flags.energyRegenMultiplier).toBe(2.0);
  });

  it('状态过期后 flags 恢复默认', () => {
    const enemy = makeEntity('e1', 100);
    enemy.sm.apply('slow', 'p1', 0.5, 500);
    enemy.sm.apply('vulnerable', 'p1', 1.5, 500);

    simulateUpdate([enemy], 600); // 过期

    const flags = enemy.sm.getAggregatedFlags();
    expect(flags.speedMultiplier).toBe(1.0);
    expect(flags.damageMultiplier).toBe(1.0);
  });
});
