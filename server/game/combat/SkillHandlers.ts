import type { PlayerState, SkillType } from '../../../shared/types';
import type { SkillTemplate } from '../../config/constants';
import type { StatusManager } from '../status/StatusManager';
import type { CombatDeps } from './Combat';
import { clampToDungeon, normalizeAngleDiff } from '../../utils/math';

export interface SkillContext {
  player: PlayerState;
  skill: SkillTemplate;
  sm: StatusManager | undefined;
  deps: CombatDeps;
}

export type SkillHandler = (ctx: SkillContext) => void;

// ── Handler implementations ──

function handleDash(ctx: SkillContext): void {
  const { player, skill, sm, deps } = ctx;
  const dashDist = skill.value || 200;
  const dashX = player.x + Math.cos(player.angle) * dashDist;
  const dashY = player.y + Math.sin(player.angle) * dashDist;

  if (deps.isWalkable(dashX, dashY)) {
    player.x = dashX;
    player.y = dashY;
  } else {
    const halfDist = dashDist / 2;
    const halfX = player.x + Math.cos(player.angle) * halfDist;
    const halfY = player.y + Math.sin(player.angle) * halfDist;
    if (deps.isWalkable(halfX, halfY)) {
      player.x = halfX;
      player.y = halfY;
    }
  }
  const clamped = clampToDungeon(player.x, player.y);
  player.x = clamped.x;
  player.y = clamped.y;

  sm?.apply('iframes', player.id, 0, 300);
  player.invincible = 0.3;
}

function handleWarCry(ctx: SkillContext): void {
  const { player, skill, sm, deps } = ctx;
  const radius = skill.radius || 200;
  const duration = skill.duration || 3000;
  const dmgReduction = skill.value || 0.6;
  const state = deps.getState();

  // Taunt all enemies in radius
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist <= radius) {
      const esm = deps.getEnemyStatus(enemy.id);
      esm?.apply('taunt', player.id, 0, duration);
    }
  }

  // Self buff: damage reduction
  sm?.apply('shield', player.id, 1 - dmgReduction, duration);
  // Dual-write legacy
  player.invincible = Math.max(player.invincible, 0.1);
}

function handleShieldBash(ctx: SkillContext): void {
  const { player, skill, deps } = ctx;
  const range = skill.range || 80;
  const knockbackDist = skill.knockbackDist || 60;
  const stunDuration = skill.stunDuration || 1000;
  const state = deps.getState();

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const dist = Math.hypot(dx, dy);

    if (dist > range + 20) continue;

    // Check arc (front-facing 90)
    const angle = Math.atan2(dy, dx);
    const diff = normalizeAngleDiff(angle, player.angle);

    if (Math.abs(diff) < Math.PI / 4) {
      // Apply knockback (instant position push)
      if (dist > 0) {
        const pushX = enemy.x + (dx / dist) * knockbackDist;
        const pushY = enemy.y + (dy / dist) * knockbackDist;
        if (deps.isWalkable(pushX, pushY)) {
          enemy.x = pushX;
          enemy.y = pushY;
        }
      }

      // Apply stun
      const esm = deps.getEnemyStatus(enemy.id);
      esm?.apply('stun', player.id, 0, stunDuration);
    }
  }
}

function handleDodgeRoll(ctx: SkillContext): void {
  const { player, skill, sm, deps } = ctx;
  const rollDist = skill.value || 150;
  // Roll direction: movement direction if moving, otherwise facing direction
  const rollAngle = (player.dx !== 0 || player.dy !== 0)
    ? Math.atan2(player.dy, player.dx)
    : player.angle;

  const rollX = player.x + Math.cos(rollAngle) * rollDist;
  const rollY = player.y + Math.sin(rollAngle) * rollDist;

  if (deps.isWalkable(rollX, rollY)) {
    player.x = rollX;
    player.y = rollY;
  } else {
    const halfDist = rollDist / 2;
    const halfX = player.x + Math.cos(rollAngle) * halfDist;
    const halfY = player.y + Math.sin(rollAngle) * halfDist;
    if (deps.isWalkable(halfX, halfY)) {
      player.x = halfX;
      player.y = halfY;
    }
  }
  const rollClamped = clampToDungeon(player.x, player.y);
  player.x = rollClamped.x;
  player.y = rollClamped.y;

  // Iframes during roll
  sm?.apply('iframes', player.id, 0, 400);
  player.invincible = 0.4;

  // Place slow trap at landing position (via applying slow to enemies when they enter range)
  // For now, apply slow to enemies already at landing position
  const trapRadius = skill.trapRadius || 40;
  const trapDuration = skill.trapDuration || 3000;
  const trapSlow = skill.trapSlow || 0.5;
  const state = deps.getState();

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist <= trapRadius) {
      const esm = deps.getEnemyStatus(enemy.id);
      esm?.apply('slow', player.id, trapSlow, trapDuration);
    }
  }
}

function handleArrowRain(ctx: SkillContext): void {
  const { player, skill, deps } = ctx;
  const radius = skill.radius || 160;
  const waves = skill.waves || 3;
  const damageMult = skill.damageMult || 0.5;
  const delay = 500;

  const targetX = player.x + Math.cos(player.angle) * 150;
  const targetY = player.y + Math.sin(player.angle) * 150;

  const pAttack = player.attack;
  const pId = player.id;
  const sm = deps.getPlayerStatus(pId);
  const outMult = sm?.getAggregatedFlags().outgoingDamageMultiplier ?? 1.0;
  const dmg = Math.round(pAttack * damageMult * outMult);

  for (let w = 0; w < waves; w++) {
    setTimeout(() => {
      const state = deps.getState();
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
        if (dist <= radius) {
          deps.damageEnemy(enemy.id, dmg, pId);
        }
      }
    }, delay + w * 300);
  }
}

function handleFrostNova(ctx: SkillContext): void {
  const { player, skill, sm, deps } = ctx;
  const radius = skill.radius || 120;
  const freezeDuration = skill.freezeDuration || 500;
  const slowDuration = skill.duration || 3000;
  const slowMult = skill.slowMult || 0.5;
  const damageMult = skill.damageMult || 0.8;
  const outMult = sm?.getAggregatedFlags().outgoingDamageMultiplier ?? 1.0;
  const dmg = Math.round(player.attack * damageMult * outMult);
  const state = deps.getState();

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (dist <= radius) {
      deps.damageEnemy(enemy.id, dmg, player.id);
      const esm = deps.getEnemyStatus(enemy.id);
      esm?.apply('freeze', player.id, 0, freezeDuration);
      esm?.apply('slow', player.id, slowMult, slowDuration);
    }
  }
}

function handleMeteor(ctx: SkillContext): void {
  const { player, skill, deps } = ctx;
  const radius = skill.radius || 150;
  const damageMult = skill.damageMult || 2.5;
  const dotDmg = skill.dotDmg || 5;
  const dotDuration = skill.dotDuration || 3000;
  const delay = skill.duration || 1000;
  const maxRange = skill.range || 300;

  const meteorTarget = clampToDungeon(
    player.x + Math.cos(player.angle) * maxRange,
    player.y + Math.sin(player.angle) * maxRange,
  );
  const targetX = meteorTarget.x;
  const targetY = meteorTarget.y;

  const pAttack = player.attack;
  const pId = player.id;
  const sm = deps.getPlayerStatus(pId);
  const outMult = sm?.getAggregatedFlags().outgoingDamageMultiplier ?? 1.0;
  const dmg = Math.round(pAttack * damageMult * outMult);

  setTimeout(() => {
    const state = deps.getState();
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
      if (dist <= radius) {
        deps.damageEnemy(enemy.id, dmg, pId);
        const esm = deps.getEnemyStatus(enemy.id);
        esm?.apply('burn', pId, dotDmg, dotDuration);
      }
    }
  }, delay);
}

function handleHolyLight(ctx: SkillContext): void {
  const { player, skill, deps } = ctx;
  const healAmount = skill.value || 50;
  const targetRange = skill.targetRange || 150;
  const state = deps.getState();

  // Find nearest ally (or self) within range
  let target: PlayerState = player;
  let targetDist = 0;

  for (const p of state.players) {
    if (!p.alive || p.id === player.id) continue;
    const dist = Math.hypot(p.x - player.x, p.y - player.y);
    if (dist <= targetRange && (target === player || p.hp < target.hp)) {
      target = p;
      targetDist = dist;
    }
  }

  // Heal whoever has lower HP (self vs nearest ally)
  if (target === player || player.hp < target.hp) {
    player.hp = Math.min(player.hpMax, player.hp + healAmount);
  } else {
    target.hp = Math.min(target.hpMax, target.hp + healAmount);
  }
}

function handleSanctuary(ctx: SkillContext): void {
  const { player, skill, deps } = ctx;
  const radius = skill.radius || 150;
  const duration = skill.duration || 5000;
  const damageReduction = skill.damageReduction || 0.3;
  const healPerSec = skill.healPerSec || 5;
  const state = deps.getState();

  // Apply buffs to all allies in radius
  for (const p of state.players) {
    if (!p.alive) continue;
    const dist = Math.hypot(p.x - player.x, p.y - player.y);
    if (dist <= radius) {
      const psm = deps.getPlayerStatus(p.id);
      psm?.apply('shield', player.id, 1 - damageReduction, duration);
      const healPerTick = healPerSec / 2; // tick 每 500ms，2次/秒
      psm?.apply('heal_over_time', player.id, healPerTick, duration);
    }
  }
}

// ── Registry ──

export const SKILL_HANDLERS: Record<string, SkillHandler> = {
  dash: handleDash,
  taunt: handleWarCry,
  knockback: handleShieldBash,
  dodge_roll: handleDodgeRoll,
  aoe_delayed: handleArrowRain,
  cc_aoe: handleFrostNova,
  meteor: handleMeteor,
  heal_single: handleHolyLight,
  zone_buff: handleSanctuary,
};
