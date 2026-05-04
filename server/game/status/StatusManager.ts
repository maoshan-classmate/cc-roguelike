import type { EffectFlags, StatusEffectInstance, SerializedStatusEffect } from '../../../shared/types';
import { EFFECT_DEFINITIONS, type EffectDefinition } from './EffectDefinitions';

const MAX_ACTIVE_EFFECTS = 8;
const CLAMP_FLOOR = 0.1;
const CLAMP_CEIL = 3.0;

let nextId = 0;

export interface TickContext {
  entityId: string;
  dealDamage(targetId: string, amount: number): void;
  healTarget(targetId: string, amount: number): void;
  restoreEnergy(entityId: string, amount: number): void;
}

const DEFAULT_FLAGS: EffectFlags = {
  blocksMovement: false,
  blocksAttack: false,
  blocksSkill: false,
  speedMultiplier: 1.0,
  damageMultiplier: 1.0,
  outgoingDamageMultiplier: 1.0,
  invulnerable: false,
  forcedTarget: false,
  knockbackImmune: false,
  energyRegenMultiplier: 1.0,
  cooldownMultiplier: 1.0,
  ccImmune: false,
};

export class StatusManager {
  private effects: Map<string, StatusEffectInstance> = new Map();

  apply(typeId: string, sourceId: string, value: number, durationMs: number): boolean {
    const def = EFFECT_DEFINITIONS[typeId];
    if (!def) return false;

    // Instant effects
    if (def.isInstant) return true;

    // CC immune check
    if (def.category === 'cc' && this.getAggregatedFlags().ccImmune) return false;

    // Exclusive group check
    if (def.exclusiveGroup) {
      for (const [existingTypeId, existing] of this.effects) {
        const existingDef = EFFECT_DEFINITIONS[existingTypeId];
        if (existingDef?.exclusiveGroup === def.exclusiveGroup) {
          if (existingDef.priority > def.priority) return false;
          this.remove(existingTypeId);
          break;
        }
      }
    }

    // Stack policy
    const existing = this.effects.get(typeId);
    if (existing) {
      switch (def.stackPolicy) {
        case 'refresh':
          existing.remainingMs = durationMs;
          existing.value = value;
          existing.sourceId = sourceId;
          existing.stacks = 1;
          existing.tickAccumulator = 0;
          break;
        case 'max_duration':
          existing.remainingMs = Math.max(existing.remainingMs, durationMs);
          if (value !== existing.value) existing.value = value;
          break;
        case 'stack':
          existing.stacks += 1;
          existing.remainingMs = durationMs;
          existing.value = value;
          existing.tickAccumulator = 0;
          break;
        case 'max_stacks':
          existing.stacks = Math.min(existing.stacks + 1, def.maxStacks);
          existing.remainingMs = durationMs;
          existing.value = value;
          existing.tickAccumulator = 0;
          break;
      }
    } else {
      // Overflow check
      if (this.effects.size >= MAX_ACTIVE_EFFECTS) {
        this.evictLowestPriority();
      }
      this.effects.set(typeId, {
        id: `se_${nextId++}`,
        typeId,
        sourceId,
        remainingMs: durationMs,
        stacks: 1,
        value,
        tickAccumulator: 0,
      });
    }
    return true;
  }

  remove(typeId: string): void {
    this.effects.delete(typeId);
  }

  removeAllBySource(sourceId: string): void {
    for (const [key, effect] of this.effects) {
      if (effect.sourceId === sourceId) this.effects.delete(key);
    }
  }

  clearAll(): void {
    this.effects.clear();
  }

  tick(dtMs: number, ctx: TickContext): void {
    const toRemove: string[] = [];

    for (const [key, effect] of this.effects) {
      const def = EFFECT_DEFINITIONS[effect.typeId];
      if (!def) { toRemove.push(key); continue; }

      // Tick action
      if (def.tickIntervalMs && def.tickIntervalMs > 0 && def.tickAction) {
        effect.tickAccumulator += dtMs;
        while (effect.tickAccumulator >= def.tickIntervalMs) {
          effect.tickAccumulator -= def.tickIntervalMs;
          const amount = effect.value * effect.stacks;
          switch (def.tickAction) {
            case 'damage': ctx.dealDamage(ctx.entityId, amount); break;
            case 'heal': ctx.healTarget(ctx.entityId, amount); break;
            case 'energy': ctx.restoreEnergy(ctx.entityId, amount); break;
          }
        }
      }

      effect.remainingMs -= dtMs;
      if (effect.remainingMs <= 0) toRemove.push(key);
    }

    for (const key of toRemove) this.effects.delete(key);
  }

  has(typeId: string): boolean { return this.effects.has(typeId); }
  getStacks(typeId: string): number { return this.effects.get(typeId)?.stacks ?? 0; }
  getValue(typeId: string): number { return this.effects.get(typeId)?.value ?? 0; }
  getRemainingMs(typeId: string): number { return this.effects.get(typeId)?.remainingMs ?? 0; }

  getAggregatedFlags(): EffectFlags {
    const result = { ...DEFAULT_FLAGS };
    let lastForcedTargetSource: string | null = null;

    for (const effect of this.effects.values()) {
      const def = EFFECT_DEFINITIONS[effect.typeId];
      if (!def?.flags) continue;

      const f = def.flags;
      if (f.blocksMovement) result.blocksMovement = true;
      if (f.blocksAttack) result.blocksAttack = true;
      if (f.blocksSkill) result.blocksSkill = true;
      if (f.invulnerable) result.invulnerable = true;
      if (f.forcedTarget) { result.forcedTarget = true; lastForcedTargetSource = effect.sourceId; }
      if (f.knockbackImmune) result.knockbackImmune = true;
      if (f.ccImmune) result.ccImmune = true;

      if (f.speedMultiplier !== undefined && f.speedMultiplier !== 1.0) {
        result.speedMultiplier *= f.speedMultiplier;
      }
      if (f.damageMultiplier !== undefined && f.damageMultiplier !== 1.0) {
        result.damageMultiplier *= f.damageMultiplier;
      }
      if (f.outgoingDamageMultiplier !== undefined && f.outgoingDamageMultiplier !== 1.0) {
        result.outgoingDamageMultiplier *= f.outgoingDamageMultiplier;
      }
      if (f.energyRegenMultiplier !== undefined && f.energyRegenMultiplier !== 1.0) {
        result.energyRegenMultiplier *= f.energyRegenMultiplier;
      }
      if (f.cooldownMultiplier !== undefined && f.cooldownMultiplier !== 1.0) {
        result.cooldownMultiplier *= f.cooldownMultiplier;
      }
    }

    // Clamp all multipliers
    result.speedMultiplier = Math.max(CLAMP_FLOOR, Math.min(CLAMP_CEIL, result.speedMultiplier));
    result.damageMultiplier = Math.max(CLAMP_FLOOR, Math.min(CLAMP_CEIL, result.damageMultiplier));
    result.outgoingDamageMultiplier = Math.max(CLAMP_FLOOR, Math.min(CLAMP_CEIL, result.outgoingDamageMultiplier));
    result.energyRegenMultiplier = Math.max(CLAMP_FLOOR, Math.min(CLAMP_CEIL, result.energyRegenMultiplier));
    result.cooldownMultiplier = Math.max(CLAMP_FLOOR, Math.min(CLAMP_CEIL, result.cooldownMultiplier));

    result.forcedTargetSource = lastForcedTargetSource ?? undefined;
    return result as any;
  }

  serialize(): SerializedStatusEffect[] {
    const result: SerializedStatusEffect[] = [];
    for (const e of this.effects.values()) {
      result.push({ t: e.typeId, r: Math.round(e.remainingMs), s: e.stacks, v: e.value });
    }
    return result;
  }

  deserialize(data: SerializedStatusEffect[]): void {
    this.effects.clear();
    for (const s of data) {
      const def = EFFECT_DEFINITIONS[s.t];
      if (!def || def.isInstant) continue;
      this.effects.set(s.t, {
        id: `se_${nextId++}`,
        typeId: s.t,
        sourceId: '',
        remainingMs: s.r,
        stacks: s.s,
        value: s.v,
        tickAccumulator: 0,
      });
    }
  }

  private evictLowestPriority(): void {
    let lowestKey: string | null = null;
    let lowestPriority = Infinity;
    for (const [key, effect] of this.effects) {
      const def = EFFECT_DEFINITIONS[effect.typeId];
      if (def && def.priority < lowestPriority && effect.typeId !== 'invulnerable') {
        lowestPriority = def.priority;
        lowestKey = key;
      }
    }
    if (lowestKey) this.effects.delete(lowestKey);
  }
}
