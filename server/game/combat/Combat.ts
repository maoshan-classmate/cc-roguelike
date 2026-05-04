import type { PlayerState, BulletState, GameState } from '../../../shared/types';
import { ENEMY_RADIUS } from '../../../shared/constants';
import { GAME_CONFIG, WEAPON_TEMPLATES, SKILL_TEMPLATES, type WeaponTemplate, type SkillTemplate } from '../../config/constants';
import { Vec2 } from '../../utils/Vec2';
import type { StatusManager } from '../status/StatusManager';

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
      let diff = angle - player.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

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

    // Route to handler by skill type
    switch (skill.type) {
      case 'dash':
        this.handleDash(player, skill, sm);
        break;
      case 'taunt':
        this.handleWarCry(player, skill, sm);
        break;
      case 'knockback':
        this.handleShieldBash(player, skill);
        break;
      case 'dodge_roll':
        this.handleDodgeRoll(player, skill, sm);
        break;
      case 'aoe_delayed':
        this.handleArrowRain(player, skill);
        break;
      case 'cc_aoe':
        this.handleFrostNova(player, skill);
        break;
      case 'meteor':
        this.handleMeteor(player, skill);
        break;
      case 'heal_single':
        this.handleHolyLight(player, skill);
        break;
      case 'zone_buff':
        this.handleSanctuary(player, skill, sm);
        break;
    }
  }

  private handleDash(player: PlayerState, skill: SkillTemplate, sm: StatusManager | undefined): void {
    const dashDist = skill.value || 200;
    const dashX = player.x + Math.cos(player.angle) * dashDist;
    const dashY = player.y + Math.sin(player.angle) * dashDist;

    if (this.room.isWalkable(dashX, dashY)) {
      player.x = dashX;
      player.y = dashY;
    } else {
      const halfDist = dashDist / 2;
      const halfX = player.x + Math.cos(player.angle) * halfDist;
      const halfY = player.y + Math.sin(player.angle) * halfDist;
      if (this.room.isWalkable(halfX, halfY)) {
        player.x = halfX;
        player.y = halfY;
      }
    }
    player.x = Math.max(20, Math.min(GAME_CONFIG.DUNGEON_WIDTH - 20, player.x));
    player.y = Math.max(20, Math.min(GAME_CONFIG.DUNGEON_HEIGHT - 20, player.y));

    sm?.apply('iframes', player.id, 0, 300);
    player.invincible = 0.3;
  }

  private handleWarCry(player: PlayerState, skill: SkillTemplate, sm: StatusManager | undefined): void {
    const radius = skill.radius || 200;
    const duration = skill.duration || 3000;
    const dmgReduction = skill.value || 0.6;
    const state = this.room.getState();

    // Taunt all enemies in radius
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist <= radius) {
        const esm = this.room.getEnemyStatus(enemy.id);
        esm?.apply('taunt', player.id, 0, duration);
      }
    }

    // Self buff: damage reduction
    sm?.apply('shield', player.id, 1 - dmgReduction, duration);
    // Dual-write legacy
    player.invincible = Math.max(player.invincible, 0.1);
  }

  private handleShieldBash(player: PlayerState, skill: SkillTemplate): void {
    const range = skill.range || 80;
    const knockbackDist = skill.knockbackDist || 60;
    const stunDuration = skill.stunDuration || 1000;
    const state = this.room.getState();

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist > range + 20) continue;

      // Check arc (front-facing 90°)
      let angle = Math.atan2(dy, dx);
      let diff = angle - player.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      if (Math.abs(diff) < Math.PI / 4) {
        // Apply knockback (instant position push)
        if (dist > 0) {
          const pushX = enemy.x + (dx / dist) * knockbackDist;
          const pushY = enemy.y + (dy / dist) * knockbackDist;
          if (this.room.isWalkable(pushX, pushY)) {
            enemy.x = pushX;
            enemy.y = pushY;
          }
        }

        // Apply stun
        const esm = this.room.getEnemyStatus(enemy.id);
        esm?.apply('stun', player.id, 0, stunDuration);
      }
    }
  }

  private handleDodgeRoll(player: PlayerState, skill: SkillTemplate, sm: StatusManager | undefined): void {
    const rollDist = skill.value || 150;
    // Roll direction: movement direction if moving, otherwise facing direction
    const rollAngle = (player.dx !== 0 || player.dy !== 0)
      ? Math.atan2(player.dy, player.dx)
      : player.angle;

    const rollX = player.x + Math.cos(rollAngle) * rollDist;
    const rollY = player.y + Math.sin(rollAngle) * rollDist;

    if (this.room.isWalkable(rollX, rollY)) {
      player.x = rollX;
      player.y = rollY;
    } else {
      const halfDist = rollDist / 2;
      const halfX = player.x + Math.cos(rollAngle) * halfDist;
      const halfY = player.y + Math.sin(rollAngle) * halfDist;
      if (this.room.isWalkable(halfX, halfY)) {
        player.x = halfX;
        player.y = halfY;
      }
    }
    player.x = Math.max(20, Math.min(GAME_CONFIG.DUNGEON_WIDTH - 20, player.x));
    player.y = Math.max(20, Math.min(GAME_CONFIG.DUNGEON_HEIGHT - 20, player.y));

    // Iframes during roll
    sm?.apply('iframes', player.id, 0, 400);
    player.invincible = 0.4;

    // Place slow trap at landing position (via applying slow to enemies when they enter range)
    // For now, apply slow to enemies already at landing position
    const trapRadius = skill.trapRadius || 40;
    const trapDuration = skill.trapDuration || 3000;
    const trapSlow = skill.trapSlow || 0.5;
    const state = this.room.getState();

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist <= trapRadius) {
        const esm = this.room.getEnemyStatus(enemy.id);
        esm?.apply('slow', player.id, trapSlow, trapDuration);
      }
    }
  }

  private handleArrowRain(player: PlayerState, skill: SkillTemplate): void {
    const radius = skill.radius || 160;
    const waves = skill.waves || 3;
    const damageMult = skill.damageMult || 0.5;
    const delay = 500;

    // Target position: in front of player
    const targetX = player.x + Math.cos(player.angle) * 150;
    const targetY = player.y + Math.sin(player.angle) * 150;

    // Schedule waves via setTimeout
    for (let w = 0; w < waves; w++) {
      setTimeout(() => {
        const state = this.room.getState();
        for (const enemy of state.enemies) {
          if (!enemy.alive) continue;
          const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
          if (dist <= radius) {
            this.room.damageEnemy(enemy.id, Math.round(player.attack * damageMult), player.id);
          }
        }
      }, delay + w * 300);
    }
  }

  private handleFrostNova(player: PlayerState, skill: SkillTemplate): void {
    const radius = skill.radius || 120;
    const freezeDuration = skill.freezeDuration || 500;
    const slowDuration = skill.duration || 3000;
    const slowMult = skill.slowMult || 0.5;
    const damageMult = skill.damageMult || 0.8;
    const state = this.room.getState();

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const dist = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (dist <= radius) {
        this.room.damageEnemy(enemy.id, Math.round(player.attack * damageMult), player.id);
        const esm = this.room.getEnemyStatus(enemy.id);
        esm?.apply('freeze', player.id, 0, freezeDuration);
        esm?.apply('slow', player.id, slowMult, slowDuration);
      }
    }
  }

  private handleMeteor(player: PlayerState, skill: SkillTemplate): void {
    const radius = skill.radius || 150;
    const damageMult = skill.damageMult || 2.5;
    const dotDmg = skill.dotDmg || 5;
    const dotDuration = skill.dotDuration || 3000;
    const delay = skill.duration || 1000;
    const maxRange = skill.range || 300;

    // Target position: toward player facing direction, clamped to maxRange
    let targetX = player.x + Math.cos(player.angle) * maxRange;
    let targetY = player.y + Math.sin(player.angle) * maxRange;
    targetX = Math.max(20, Math.min(GAME_CONFIG.DUNGEON_WIDTH - 20, targetX));
    targetY = Math.max(20, Math.min(GAME_CONFIG.DUNGEON_HEIGHT - 20, targetY));

    const px = player.x;
    const py = player.y;
    const pAttack = player.attack;
    const pId = player.id;

    // Delayed impact
    setTimeout(() => {
      const state = this.room.getState();
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
        if (dist <= radius) {
          this.room.damageEnemy(enemy.id, Math.round(pAttack * damageMult), pId);
          // Apply burn DOT
          const esm = this.room.getEnemyStatus(enemy.id);
          esm?.apply('burn', pId, dotDmg, dotDuration);
        }
      }
    }, delay);
  }

  private handleHolyLight(player: PlayerState, skill: SkillTemplate): void {
    const healAmount = skill.value || 50;
    const targetRange = skill.targetRange || 150;
    const state = this.room.getState();

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

  private handleSanctuary(player: PlayerState, skill: SkillTemplate, sm: StatusManager | undefined): void {
    const radius = skill.radius || 150;
    const duration = skill.duration || 5000;
    const damageReduction = skill.damageReduction || 0.3;
    const healPerSec = skill.healPerSec || 5;
    const state = this.room.getState();

    // Apply buffs to all allies in radius
    for (const p of state.players) {
      if (!p.alive) continue;
      const dist = Math.hypot(p.x - player.x, p.y - player.y);
      if (dist <= radius) {
        const psm = this.room.getPlayerStatus(p.id);
        psm?.apply('shield', player.id, 1 - damageReduction, duration);
        psm?.apply('heal_over_time', player.id, healPerSec, duration);
      }
    }
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
  }

  private random(): number {
    return Math.random();
  }
}
