import { GameRoom, PlayerState, BulletState } from '../GameRoom';
import { GAME_CONFIG, WEAPON_TEMPLATES, SKILL_TEMPLATES } from '../../config/constants';
import { Vec2 } from '../../utils/Vec2';

export class Combat {
  private room: GameRoom;
  private lastAttackTime: Map<string, number> = new Map();

  constructor(room: GameRoom) {
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

  private fireGun(player: PlayerState, weapon: any): void {
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
        player.characterType,
        false
      );
    }
  }

  private executeMelee(player: PlayerState, weapon: any): void {
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

    const now = Date.now();
    const lastUse = this.lastAttackTime.get(`${player.id}_skill_${skillIndex}`) || 0;

    if (now - lastUse < skill.cooldown) return;
    if (player.energy < skill.energyCost) return;

    player.energy -= skill.energyCost;
    this.lastAttackTime.set(`${player.id}_skill_${skillIndex}`, now);

    switch (skillId) {
      case 'dash':
        // Dash in facing direction with collision check
        const dashDist = skill.value || 150;
        const dashX = player.x + Math.cos(player.angle) * dashDist;
        const dashY = player.y + Math.sin(player.angle) * dashDist;
        // Only dash if target is walkable
        if (this.room.isWalkable(dashX, dashY)) {
          player.x = dashX;
          player.y = dashY;
        } else {
          // Try partial dash
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
        player.invincible = 0.3;
        break;

      case 'shield':
        // Shield skill - brief invincibility
        player.invincible = (skill.duration || 3000) / 1000;
        break;

      case 'heal':
        player.hp = Math.min(player.hpMax, player.hp + (skill.value || 30));
        break;

      case 'speed_boost':
        // Speed boost - increase movement speed for duration
        player.speedBuff = skill.value || 1.5;
        player.speedBuffTimer = (skill.duration || 5000) / 1000;
        player.invincible = 0.3;
        break;
    }
  }

  checkBulletCollision(bullet: BulletState): void {
    const state = this.room.getState();

    if (bullet.friendly) {
      const ENEMY_RADIUS: Record<string, number> = { basic: 16, fast: 14, ghost: 16, tank: 20, boss: 28 };
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;

        const enemyRadius = ENEMY_RADIUS[enemy.type] || 16;
        const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
        if (dist < bullet.radius + enemyRadius) {
          this.room.damageEnemy(enemy.id, bullet.damage);
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
        if (!player.alive || player.invincible > 0) continue;

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
