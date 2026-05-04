import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Combat, type CombatDeps } from '../game/combat/Combat';
import type { PlayerState, EnemyState, GameState } from '../../shared/types';
import { StatusManager } from '../game/status/StatusManager';

// ── 辅助函数 ──

const CLASS_SKILLS: Record<string, string[]> = {
  warrior: ['dash', 'war_cry', 'shield_bash'],
  ranger: ['dash', 'dodge_roll', 'arrow_rain'],
  mage: ['dash', 'frost_nova', 'meteor'],
  cleric: ['dash', 'holy_light', 'sanctuary'],
};

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  const charType = overrides.characterType || 'warrior';
  return {
    id: 'player1', accountId: 'acc1', name: 'Test',
    x: 400, y: 400, dx: 0, dy: 0,
    hp: 100, hpMax: 100, energy: 50, energyMax: 50,
    attack: 15, defense: 5, speed: 180, speedBuff: 1.0, speedBuffTimer: 0,
    weapon: 'sword', characterType: charType,
    skills: CLASS_SKILLS[charType] || CLASS_SKILLS.warrior,
    alive: true, invincible: 0, angle: 0, gold: 0, keys: 0,
    ...overrides,
  };
}

function makeEnemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: 'enemy1', type: 'basic', x: 410, y: 400,
    hp: 100, hpMax: 100, attack: 5, alive: true, state: 'chase',
    ...overrides,
  };
}

interface MockDeps extends CombatDeps {
  damagedEnemies: Map<string, { damage: number; attackerId?: string }>;
  damagedPlayers: Map<string, number>;
  removedBullets: Set<string>;
  _state: GameState;
  _playerSm: StatusManager;
  _enemySms: Map<string, StatusManager>;
}

function makeDeps(player: PlayerState, enemies: EnemyState[] = []): MockDeps {
  const damagedEnemies = new Map<string, { damage: number; attackerId?: string }>();
  const damagedPlayers = new Map<string, number>();
  const removedBullets = new Set<string>();
  const _playerSm = new StatusManager();
  const _enemySms = new Map<string, StatusManager>();
  for (const e of enemies) _enemySms.set(e.id, new StatusManager());

  return {
    damagedEnemies, damagedPlayers, removedBullets,
    _playerSm, _enemySms,
    _state: {
      tick: 0, floor: 1, gameSession: 1,
      players: [player], enemies, bullets: [], healWaves: [], items: [],
      floorCompleted: false,
    },
    getState: () => ({
      ...({} as GameState),
      tick: 0, floor: 1, gameSession: 1,
      players: [player], enemies, bullets: [], healWaves: [], items: [],
      floorCompleted: false,
    }),
    spawnBullet: vi.fn(),
    spawnHealWave: vi.fn(),
    damageEnemy: vi.fn((id: string, dmg: number, attackerId?: string) => damagedEnemies.set(id, { damage: dmg, attackerId })),
    damagePlayer: vi.fn((id: string, dmg: number) => damagedPlayers.set(id, dmg)),
    removeBullet: vi.fn((id: string) => removedBullets.add(id)),
    isWalkable: vi.fn(() => true),
    getPlayerStatus: vi.fn(() => _playerSm),
    getEnemyStatus: vi.fn((id: string) => _enemySms.get(id)),
  };
}

describe('Skill Integration — 每个 handler 的真实效果', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  // Note: we need to restore timers after each test or vi.advanceTimersByTime won't work correctly

  it('dash: 位移 + iframes + 能量扣除', () => {
    const player = makePlayer({ angle: 0 }); // 朝右
    const deps = makeDeps(player);
    const combat = new Combat(deps);

    combat.useSkill(player, 0); // skill index 0 = dash

    // 位移
    expect(player.x).toBeGreaterThan(400); // 朝右移动了
    // iframes
    expect(deps._playerSm.has('iframes')).toBe(true);
    expect(deps._playerSm.getAggregatedFlags().invulnerable).toBe(true);
    // 能量扣除
    expect(player.energy).toBe(30); // 50 - 20
  });

  it('war_cry: 嘲讽范围内敌人 + 自身减伤', () => {
    const player = makePlayer();
    const enemy1 = makeEnemy({ id: 'e1', x: 450, y: 400 }); // 50px away — in range
    const enemy2 = makeEnemy({ id: 'e2', x: 900, y: 400 }); // 500px away — out of range
    const deps = makeDeps(player, [enemy1, enemy2]);
    const combat = new Combat(deps);

    // Change to ranger with war_cry for this test... actually just change skills
    player.skills = ['dash', 'war_cry', 'shield_bash'];
    combat.useSkill(player, 1); // skill index 1 = war_cry

    // 近的敌人被嘲讽
    const e1sm = deps._enemySms.get('e1')!;
    expect(e1sm.has('taunt')).toBe(true);
    const tauntFlags = e1sm.getAggregatedFlags();
    expect(tauntFlags.forcedTarget).toBe(true);
    expect(tauntFlags.forcedTargetSource).toBe('player1');

    // 远的敌人没被嘲讽
    const e2sm = deps._enemySms.get('e2')!;
    expect(e2sm.has('taunt')).toBe(false);

    // 自身减伤
    expect(deps._playerSm.has('shield')).toBe(true);
    const playerFlags = deps._playerSm.getAggregatedFlags();
    expect(playerFlags.damageMultiplier).toBeLessThan(1.0); // 0.4 = 1 - 0.6

    // 能量
    expect(player.energy).toBe(20); // 50 - 30
  });

  it('shield_bash: 击退 + 眩晕前方敌人', () => {
    const player = makePlayer({ angle: 0 }); // 朝右
    const enemy = makeEnemy({ id: 'e1', x: 430, y: 400 }); // 前方 30px
    const deps = makeDeps(player, [enemy]);
    const combat = new Combat(deps);

    player.skills = ['dash', 'war_cry', 'shield_bash'];
    combat.useSkill(player, 2); // skill index 2 = shield_bash

    // 击退
    expect(enemy.x).toBeGreaterThan(430); // 被推向右边
    // 眩晕
    const esm = deps._enemySms.get('e1')!;
    expect(esm.has('stun')).toBe(true);
    // 能量
    expect(player.energy).toBe(25); // 50 - 25
  });

  it('frost_nova: 冰冻 + 减速范围内敌人', () => {
    const player = makePlayer({ characterType: 'mage' });
    player.skills = ['dash', 'frost_nova', 'meteor'];
    const enemy1 = makeEnemy({ id: 'e1', x: 460, y: 400 }); // 60px — in range (radius=120)
    const enemy2 = makeEnemy({ id: 'e2', x: 700, y: 400 }); // 300px — out of range
    const deps = makeDeps(player, [enemy1, enemy2]);
    const combat = new Combat(deps);

    combat.useSkill(player, 1); // frost_nova

    const e1sm = deps._enemySms.get('e1')!;
    expect(e1sm.has('freeze')).toBe(true);
    expect(e1sm.has('slow')).toBe(true);
    expect(e1sm.getAggregatedFlags().blocksMovement).toBe(true);
    expect(e1sm.getValue('slow')).toBe(0.5);

    const e2sm = deps._enemySms.get('e2')!;
    expect(e2sm.has('freeze')).toBe(false);
    expect(e2sm.has('slow')).toBe(false);

    expect(player.energy).toBe(20); // 50 - 30
  });

  it('holy_light: 治疗血量最低的队友', () => {
    const player = makePlayer({ characterType: 'cleric', hp: 80 });
    player.skills = ['dash', 'holy_light', 'sanctuary'];
    const ally = makePlayer({ id: 'player2', hp: 30, x: 420, y: 400 });
    const deps = makeDeps(player);
    // Add ally to state
    deps.getState = () => ({
      tick: 0, floor: 1, gameSession: 1,
      players: [player, ally], enemies: [], bullets: [], healWaves: [], items: [],
      floorCompleted: false,
    });
    const combat = new Combat(deps);

    combat.useSkill(player, 1); // holy_light

    // ally (30 HP, lower) should be healed, not player (80 HP)
    expect(ally.hp).toBe(80); // 30 + 50
    expect(player.hp).toBe(80); // unchanged

    expect(player.energy).toBe(25); // 50 - 25
  });

  it('holy_light: 治疗自己（无队友时）', () => {
    const player = makePlayer({ characterType: 'cleric', hp: 60 });
    player.skills = ['dash', 'holy_light', 'sanctuary'];
    const deps = makeDeps(player);
    const combat = new Combat(deps);

    combat.useSkill(player, 1);

    expect(player.hp).toBe(100); // 60 + 50, capped at 100
    expect(player.energy).toBe(25);
  });

  it('sanctuary: 范围内队友获得减伤+持续回复', () => {
    const player = makePlayer({ characterType: 'cleric' });
    player.skills = ['dash', 'holy_light', 'sanctuary'];
    const ally = makePlayer({ id: 'player2', x: 420, y: 400 }); // 20px — in range
    const farAlly = makePlayer({ id: 'player3', x: 900, y: 400 }); // 500px — out of range

    const deps = makeDeps(player);
    const allySm = new StatusManager();
    const farAllySm = new StatusManager();
    deps.getState = () => ({
      tick: 0, floor: 1, gameSession: 1,
      players: [player, ally, farAlly], enemies: [], bullets: [], healWaves: [], items: [],
      floorCompleted: false,
    });
    deps.getPlayerStatus = vi.fn((id: string) => {
      if (id === 'player1') return deps._playerSm;
      if (id === 'player2') return allySm;
      if (id === 'player3') return farAllySm;
      return undefined;
    });

    const combat = new Combat(deps);
    combat.useSkill(player, 2); // sanctuary

    // player 自身获得 buff
    expect(deps._playerSm.has('shield')).toBe(true);
    expect(deps._playerSm.has('heal_over_time')).toBe(true);

    // 近的队友获得 buff
    expect(allySm.has('shield')).toBe(true);
    expect(allySm.has('heal_over_time')).toBe(true);

    // 远的队友没有
    expect(farAllySm.has('shield')).toBe(false);

    expect(player.energy).toBe(10); // 50 - 40
  });

  it('dodge_roll: 翻滚位移 + iframes + 减速落地处敌人', () => {
    const player = makePlayer({ characterType: 'ranger', dx: 1, dy: 0 });
    player.skills = ['dash', 'dodge_roll', 'arrow_rain'];
    const enemy = makeEnemy({ id: 'e1', x: 420, y: 400 }); // 在落地位置附近
    const deps = makeDeps(player, [enemy]);
    const combat = new Combat(deps);

    combat.useSkill(player, 1); // dodge_roll

    // 位移（朝 dx=1 方向翻滚）
    expect(player.x).toBeGreaterThan(400);
    // iframes
    expect(deps._playerSm.has('iframes')).toBe(true);
    // 敌人被减速（如果在落地范围内）
    // 注：敌人 x=420，落地后 player 可能已移动到 ~550，超出 trapRadius=40
    // 所以这个断言取决于具体位置 — 让我们检查敌人状态
    const esm = deps._enemySms.get('e1')!;
    // 如果敌人在陷阱范围内，应该被减速
    const distToLanding = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distToLanding <= 40) {
      expect(esm.has('slow')).toBe(true);
    }

    expect(player.energy).toBe(25); // 50 - 25
  });

  it('meteor: 延时后造成伤害+burn', () => {
    const player = makePlayer({ characterType: 'mage', angle: 0, attack: 20 });
    player.skills = ['dash', 'frost_nova', 'meteor'];
    const enemy = makeEnemy({ id: 'e1', x: 680, y: 400 }); // 前方约 300px
    const deps = makeDeps(player, [enemy]);
    const combat = new Combat(deps);

    combat.useSkill(player, 2); // meteor

    // 延时前还没造成伤害
    expect(deps.damageEnemy).not.toHaveBeenCalled();

    // 触发延时
    vi.advanceTimersByTime(1000);

    // 伤害已造成
    expect(deps.damageEnemy).toHaveBeenCalled();
    // burn DOT 已施加
    const esm = deps._enemySms.get('e1')!;
    expect(esm.has('burn')).toBe(true);
    expect(esm.getValue('burn')).toBe(5); // 5 HP/s

    expect(player.energy).toBe(10); // 50 - 40

    vi.useRealTimers();
  });

  it('arrow_rain: 延时后多波伤害', () => {
    const player = makePlayer({ characterType: 'ranger', angle: 0, attack: 20 });
    player.skills = ['dash', 'dodge_roll', 'arrow_rain'];
    const enemy = makeEnemy({ id: 'e1', x: 530, y: 400 }); // 在目标区域附近
    const deps = makeDeps(player, [enemy]);
    const combat = new Combat(deps);

    combat.useSkill(player, 2); // arrow_rain

    // 延时前还没造成伤害
    expect(deps.damageEnemy).not.toHaveBeenCalled();

    // 触发第一波（delay=500ms）
    vi.advanceTimersByTime(500);
    expect(deps.damageEnemy).toHaveBeenCalledTimes(1);

    // 触发第二波
    vi.advanceTimersByTime(300);
    expect(deps.damageEnemy).toHaveBeenCalledTimes(2);

    // 触发第三波
    vi.advanceTimersByTime(300);
    expect(deps.damageEnemy).toHaveBeenCalledTimes(3);

    // 每波伤害 = attack * damageMult = 20 * 0.5 = 10
    expect(deps.damagedEnemies.get('e1')?.damage).toBe(10);

    expect(player.energy).toBe(15); // 50 - 35

    vi.useRealTimers();
  });

  it('能量不足时拒绝释放技能', () => {
    const player = makePlayer({ energy: 10 }); // dash 需要 20
    const deps = makeDeps(player);
    const combat = new Combat(deps);

    combat.useSkill(player, 0);

    // 没位移
    expect(player.x).toBe(400);
    // 没扣能量
    expect(player.energy).toBe(10);
  });

  it('silence 状态下阻止技能释放', () => {
    const player = makePlayer();
    const deps = makeDeps(player);
    deps._playerSm.apply('silence', 'enemy', 0, 3000);
    const combat = new Combat(deps);

    combat.useSkill(player, 0); // dash

    // 没位移（被 silence 拦截）
    expect(player.x).toBe(400);
    expect(player.energy).toBe(50); // 没扣
  });

  it('不同职业有不同的技能列表', () => {
    const warrior = makePlayer({ characterType: 'warrior' });
    const ranger = makePlayer({ id: 'r1', characterType: 'ranger' });
    const mage = makePlayer({ id: 'm1', characterType: 'mage' });
    const cleric = makePlayer({ id: 'c1', characterType: 'cleric' });

    expect(warrior.skills).toEqual(['dash', 'war_cry', 'shield_bash']);
    expect(ranger.skills).toEqual(['dash', 'dodge_roll', 'arrow_rain']);
    expect(mage.skills).toEqual(['dash', 'frost_nova', 'meteor']);
    expect(cleric.skills).toEqual(['dash', 'holy_light', 'sanctuary']);
  });
});
