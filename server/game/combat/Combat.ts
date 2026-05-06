import type { PlayerState, BulletState, GameState, EnvObjectState } from '../../../shared/types';
import { ENEMY_RADIUS } from '../../../shared/constants';
import { GAME_CONFIG, WEAPON_TEMPLATES, SKILL_TEMPLATES, type WeaponTemplate } from '../../config/constants';
import { normalizeAngleDiff } from '../../utils/math';
import type { StatusManager } from '../status/StatusManager';
import { SKILL_HANDLERS } from './SkillHandlers';

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

    if (weapon.type === 'gun') {
      this.fireGun(player, weapon);
    } else {
      this.executeMelee(player, weapon);
    }
  }

  private fireGun(player: PlayerState, weapon: WeaponTemplate): void {
    const isHealer = player.characterType === 'cleric';

    if (isHealer) {
      // 牧师：AoE 治疗波（不产生飞行弹体）
      this.room.spawnHealWave(player.id, player.x, player.y, weapon.damage);
      return;
    }

    const count = weapon.bulletCount || 1;
    const spread = (weapon.spread || 0) * Math.PI / 180;

    for (let i = 0; i < count; i++) {
      const angle = player.angle + (this.random() - 0.5) * spread;
      this.room.spawnBullet(
        player.id,
        player.x + Math.cos(angle) * 20,
        player.y + Math.sin(angle) * 20,
        angle,
        weapon.damage,
        true,
        player.characterType
      );
    }
  }

  private executeMelee(player: PlayerState, weapon: WeaponTemplate): void {
    const range = weapon.range || GAME_CONFIG.MELEE_RANGE;
    const arc = weapon.arc || GAME_CONFIG.MELEE_ARC;

    // Check enemies in arc
    const state = this.room.getState();

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > range + 20) continue;

      let angle = Math.atan2(dy, dx);
      const diff = normalizeAngleDiff(angle, player.angle);

      if (Math.abs(diff) < arc / 2) {
        this.room.damageEnemy(enemy.id, weapon.damage);
      }
    }
  }

  useSkill(player: PlayerState, skillIndex: number): void {
    const skills = player.skills;
    if (skillIndex < 0 || skillIndex >= skills.length) return;

    const skillId = skills[skillIndex];
    const skill = SKILL_TEMPLATES[skillId];
    if (!skill) return;

    // Check blocksSkill via StatusManager
    const sm = this.room.getPlayerStatus(player.id);
    if (sm?.getAggregatedFlags().blocksSkill) return;

    const now = Date.now();
    const lastUse = this.lastAttackTime.get(`${player.id}_skill_${skillIndex}`) || 0;

    // Apply cooldown multiplier from StatusManager
    const cooldownMult = sm?.getAggregatedFlags().cooldownMultiplier ?? 1.0;
    const effectiveCooldown = skill.cooldown * cooldownMult;

    if (now - lastUse < effectiveCooldown) return;
    if (player.energy < skill.energyCost) return;

    player.energy -= skill.energyCost;
    this.lastAttackTime.set(`${player.id}_skill_${skillIndex}`, now);

    // Route to handler via registry
    const handler = SKILL_HANDLERS[skill.type];
    if (handler) handler({ player, skill, sm, deps: this.room });
  }

  checkBulletCollision(bullet: BulletState): void {
    const state = this.room.getState();

    if (bullet.friendly) {
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;

        // Check invulnerable via StatusManager
        const esm = this.room.getEnemyStatus(enemy.id);
        if (esm?.getAggregatedFlags().invulnerable) continue;

        const enemyRadius = ENEMY_RADIUS[enemy.type] || 16;
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
