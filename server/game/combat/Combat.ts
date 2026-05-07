import type { PlayerState, BulletState, GameState, EnvObjectState, CharacterType } from '../../../shared/types';
import type { AttackType } from '../../../shared/character-definitions';
import { CHARACTER_DEFS } from '../../../shared/character-definitions';
import { ENEMY_DEFS } from '../../../shared/enemy-definitions';
import { GAME_CONFIG, WEAPON_TEMPLATES, SKILL_TEMPLATES, type WeaponTemplate } from '../../config/constants';
import { normalizeAngleDiff } from '../../utils/math';
import type { StatusManager } from '../status/StatusManager';
import { SKILL_HANDLERS } from './SkillHandlers';

// ── 攻击类型路由注册表（数据驱动，替代 characterType 硬编码特判） ──
type AttackHandler = (player: PlayerState, weapon: WeaponTemplate, combat: Combat) => void;

const ATTACK_HANDLERS: Record<AttackType, AttackHandler> = {
  melee: (player, weapon, combat) => {
    combat.executeMelee(player, weapon);
  },
  ranged_bullet: (player, weapon, combat) => {
    combat.fireGun(player, weapon);
  },
  ranged_heal: (player, weapon, combat) => {
    combat.room.spawnHealWave(player.id, player.x, player.y, weapon.damage);
  },
};

export interface CombatDeps {
  getState(): GameState;
  spawnBullet(ownerId: string, x: number, y: number, angle: number, damage: number, friendly: boolean, ownerType?: string): void;
  spawnHealWave(ownerId: string, x: number, y: number, amount: number): void;
  damageEnemy(enemyId: string, damage: number, attackerId?: string): void;
  damagePlayer(playerId: string, damage: number): void;
  removeBullet(bulletId: string): void;
  isWalkable(x: number, y: number): boolean;
  getPlayerStatus(playerId: string): StatusManager | undefined;
  getEnemyStatus(enemyId: string): StatusManager | undefined;
  getEnvObjects(): EnvObjectState[];
  damageEnvObject(id: string, damage: number, attackerId?: string): void;
}

export interface SkillResult {
  accepted: boolean;
  reason?: 'cooldown' | 'energy' | 'stunned' | 'silenced' | 'dead' | 'invalid' | 'blocked';
  effectiveCooldown?: number;
}

export class Combat {
  private room: CombatDeps;
  private lastAttackTime: Map<string, number> = new Map();

  constructor(room: CombatDeps) {
    this.room = room;
  }

  playerAttack(player: PlayerState): void {
    const now = Date.now();
    const lastAttack = this.lastAttackTime.get(player.id) || 0;
    const weapon = WEAPON_TEMPLATES[player.weapon] || WEAPON_TEMPLATES.pistol;

    if (now - lastAttack < weapon.cooldown) return;
    if (player.energy < weapon.energyCost) return;

    player.energy -= weapon.energyCost;
    this.lastAttackTime.set(player.id, now);

    const def = CHARACTER_DEFS[player.characterType as CharacterType];
    const handler = ATTACK_HANDLERS[def?.attackType ?? 'ranged_bullet'];
    handler(player, weapon, this);
  }

  private fireGun(player: PlayerState, weapon: WeaponTemplate): void {
    const sm = this.room.getPlayerStatus(player.id);
    const outMult = sm?.getAggregatedFlags().outgoingDamageMultiplier ?? 1.0;
    const effectiveDamage = Math.round(weapon.damage * outMult);

    const count = weapon.bulletCount || 1;
    const spread = (weapon.spread || 0) * Math.PI / 180;

    for (let i = 0; i < count; i++) {
      const aimAngle = player.aimAngle ?? player.angle;
      const angle = aimAngle + (this.random() - 0.5) * spread;
      this.room.spawnBullet(
        player.id,
        player.x + Math.cos(angle) * 20,
        player.y + Math.sin(angle) * 20,
        angle,
        effectiveDamage,
        true,
        player.characterType
      );
    }
  }

  private executeMelee(player: PlayerState, weapon: WeaponTemplate): void {
    const range = weapon.range || GAME_CONFIG.MELEE_RANGE;
    const arc = weapon.arc || GAME_CONFIG.MELEE_ARC;

    const sm = this.room.getPlayerStatus(player.id);
    const outMult = sm?.getAggregatedFlags().outgoingDamageMultiplier ?? 1.0;
    const effectiveDamage = Math.round(weapon.damage * outMult);

    const state = this.room.getState();

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > range + 20) continue;

      let angle = Math.atan2(dy, dx);
      const diff = normalizeAngleDiff(angle, player.aimAngle ?? player.angle);

      if (Math.abs(diff) < arc / 2) {
        this.room.damageEnemy(enemy.id, effectiveDamage);
      }
    }
  }

  useSkill(player: PlayerState, skillIndex: number, targetPos?: { x: number; y: number }): SkillResult {
    const skills = player.skills;
    if (skillIndex < 0 || skillIndex >= skills.length) {
      return { accepted: false, reason: 'invalid' };
    }

    const skillId = skills[skillIndex];
    const skill = SKILL_TEMPLATES[skillId];
    if (!skill) {
      return { accepted: false, reason: 'invalid' };
    }

    // Check dead
    if (!player.alive) {
      return { accepted: false, reason: 'dead' };
    }

    // Check blocksSkill via StatusManager
    const sm = this.room.getPlayerStatus(player.id);
    if (sm?.getAggregatedFlags().blocksSkill) {
      return { accepted: false, reason: 'silenced' };
    }

    // Check cooldown (server-authoritative via player.cooldowns[])
    const cooldownMult = sm?.getAggregatedFlags().cooldownMultiplier ?? 1.0;
    const effectiveCooldown = skill.cooldown * cooldownMult;
    const remainingCooldown = player.cooldowns[skillIndex] ?? 0;

    if (remainingCooldown > 0) {
      return { accepted: false, reason: 'cooldown' };
    }

    // Check energy
    if (player.energy < skill.energyCost) {
      return { accepted: false, reason: 'energy' };
    }

    // Execute
    player.energy -= skill.energyCost;
    player.cooldowns[skillIndex] = effectiveCooldown;

    // Route to handler via registry
    const handler = SKILL_HANDLERS[skill.type];
    if (handler) handler({ player, skill, sm, deps: this.room, targetPos });

    return { accepted: true, effectiveCooldown };
  }

  checkBulletCollision(bullet: BulletState): void {
    const state = this.room.getState();

    if (bullet.friendly) {
      for (const enemy of state.enemies) {
        if (!enemy.alive || enemy.state === 'dying') continue;

        // Check invulnerable via StatusManager
        const esm = this.room.getEnemyStatus(enemy.id);
        if (esm?.getAggregatedFlags().invulnerable) continue;

        const enemyRadius = ENEMY_DEFS[enemy.type]?.radius || 16;
        const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
        if (dist < bullet.radius + enemyRadius) {
          this.room.damageEnemy(enemy.id, bullet.damage, bullet.ownerId);
          bullet.piercing--;

          if (bullet.piercing <= 0) {
            this.room.removeBullet(bullet.id);
            return;
          }
        }
      }
    } else {
      // Check against players
      for (const player of state.players) {
        if (!player.alive) continue;

        // Check invulnerable via StatusManager, fallback to legacy invincible
        const psm = this.room.getPlayerStatus(player.id);
        if (psm?.getAggregatedFlags().invulnerable || player.invincible > 0) continue;

        const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
        if (dist < bullet.radius + 16) {
          this.room.damagePlayer(player.id, bullet.damage);
          bullet.piercing--;

          if (bullet.piercing <= 0) {
            this.room.removeBullet(bullet.id);
            return;
          }
        }
      }
    }

    // Environment object collision (pillars and doors)
    if (bullet.friendly) {
      for (const envObj of this.room.getEnvObjects()) {
        if (!envObj.alive) continue;
        if (envObj.type !== 'pillar' && envObj.type !== 'door') continue;
        if (envObj.type === 'door' && envObj.doorOpen) continue;

        const objRadius = Math.max(envObj.width, envObj.height) / 2;
        const dist = Math.hypot(bullet.x - envObj.x, bullet.y - envObj.y);
        if (dist < bullet.radius + objRadius) {
          if (envObj.type === 'pillar') {
            this.room.damageEnvObject(envObj.id, bullet.damage, bullet.ownerId);
          }
          // Door: bullet destroyed, door unaffected
          this.room.removeBullet(bullet.id);
          return;
        }
      }
    }
  }

  private random(): number {
    return Math.random();
  }
}
