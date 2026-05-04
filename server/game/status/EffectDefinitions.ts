import type { EffectFlags } from '../../../shared/types';

export interface EffectDefinition {
  typeId: string;
  category: 'cc' | 'buff' | 'debuff' | 'special';
  name: string;
  stackPolicy: 'refresh' | 'max_duration' | 'stack' | 'max_stacks';
  maxStacks: number;
  exclusiveGroup?: string;
  priority: number;
  tickIntervalMs?: number;
  tickAction?: 'damage' | 'heal' | 'energy';
  isInstant?: boolean;
  flags: Partial<EffectFlags>;
}

export const EFFECT_DEFINITIONS: Record<string, EffectDefinition> = {
  // ── CC ──
  stun: {
    typeId: 'stun', category: 'cc', name: '眩晕',
    stackPolicy: 'refresh', maxStacks: 1, exclusiveGroup: 'hard_cc', priority: 3,
    flags: { blocksMovement: true, blocksAttack: true, blocksSkill: true },
  },
  freeze: {
    typeId: 'freeze', category: 'cc', name: '冰冻',
    stackPolicy: 'refresh', maxStacks: 1, exclusiveGroup: 'hard_cc', priority: 3,
    flags: { blocksMovement: true, blocksAttack: true, speedMultiplier: 0 },
  },
  slow: {
    typeId: 'slow', category: 'cc', name: '减速',
    stackPolicy: 'max_duration', maxStacks: 1, priority: 1,
    flags: { speedMultiplier: 0.5 },
  },
  root: {
    typeId: 'root', category: 'cc', name: '定身',
    stackPolicy: 'refresh', maxStacks: 1, exclusiveGroup: 'hard_cc', priority: 2,
    flags: { blocksMovement: true },
  },
  knockback: {
    typeId: 'knockback', category: 'cc', name: '击退',
    stackPolicy: 'refresh', maxStacks: 1, priority: 0,
    isInstant: true,
    flags: {},
  },
  taunt: {
    typeId: 'taunt', category: 'cc', name: '嘲讽',
    stackPolicy: 'refresh', maxStacks: 1, priority: 1,
    flags: { forcedTarget: true },
  },

  // ── Buff ──
  iframes: {
    typeId: 'iframes', category: 'buff', name: '无敌帧',
    stackPolicy: 'refresh', maxStacks: 1, exclusiveGroup: 'invincibility', priority: 5,
    flags: { invulnerable: true },
  },
  speed_boost: {
    typeId: 'speed_boost', category: 'buff', name: '加速',
    stackPolicy: 'refresh', maxStacks: 1, priority: 2,
    flags: { speedMultiplier: 1.5 },
  },
  shield: {
    typeId: 'shield', category: 'buff', name: '护盾',
    stackPolicy: 'max_duration', maxStacks: 1, exclusiveGroup: 'damage_reduction', priority: 2,
    flags: { damageMultiplier: 0.5 },
  },
  invulnerable: {
    typeId: 'invulnerable', category: 'buff', name: '绝对无敌',
    stackPolicy: 'refresh', maxStacks: 1, exclusiveGroup: 'invincibility', priority: 6,
    flags: { invulnerable: true, knockbackImmune: true },
  },
  heal_over_time: {
    typeId: 'heal_over_time', category: 'buff', name: '持续回复',
    stackPolicy: 'max_stacks', maxStacks: 3, priority: 0,
    tickIntervalMs: 500, tickAction: 'heal',
    flags: {},
  },
  energy_regen_boost: {
    typeId: 'energy_regen_boost', category: 'buff', name: '能量回复',
    stackPolicy: 'refresh', maxStacks: 1, priority: 0,
    flags: { energyRegenMultiplier: 2.0 },
  },

  // ── Debuff ──
  burn: {
    typeId: 'burn', category: 'debuff', name: '灼烧',
    stackPolicy: 'stack', maxStacks: 99, priority: 0,
    tickIntervalMs: 500, tickAction: 'damage',
    flags: {},
  },
  poison: {
    typeId: 'poison', category: 'debuff', name: '中毒',
    stackPolicy: 'stack', maxStacks: 99, priority: 0,
    tickIntervalMs: 1000, tickAction: 'damage',
    flags: {},
  },
  bleed: {
    typeId: 'bleed', category: 'debuff', name: '流血',
    stackPolicy: 'stack', maxStacks: 99, priority: 0,
    tickIntervalMs: 500, tickAction: 'damage',
    flags: {},
  },
  vulnerable: {
    typeId: 'vulnerable', category: 'debuff', name: '易伤',
    stackPolicy: 'max_stacks', maxStacks: 3, priority: 1,
    flags: { damageMultiplier: 1.5 },
  },
  weaken: {
    typeId: 'weaken', category: 'debuff', name: '虚弱',
    stackPolicy: 'max_stacks', maxStacks: 3, priority: 1,
    flags: { outgoingDamageMultiplier: 0.6 },
  },
  silence: {
    typeId: 'silence', category: 'debuff', name: '沉默',
    stackPolicy: 'refresh', maxStacks: 1, priority: 2,
    flags: { blocksSkill: true },
  },

  // ── Special ──
  cooldown_reduction: {
    typeId: 'cooldown_reduction', category: 'special', name: '冷却缩减',
    stackPolicy: 'refresh', maxStacks: 1, priority: 0,
    flags: { cooldownMultiplier: 0.5 },
  },
  cc_immune: {
    typeId: 'cc_immune', category: 'special', name: 'CC免疫',
    stackPolicy: 'refresh', maxStacks: 1, priority: 0,
    flags: { ccImmune: true, knockbackImmune: true },
  },
};
