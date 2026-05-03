import type { PlayerState, EnemyState, BulletState, BossEvent } from '../../../shared/types';
import { ENEMY_RADIUS, ENEMY_SPEED, ENEMY_AGGRO_RANGE, ENEMY_ATTACK_COOLDOWN } from '../../../shared/constants';
import { GAME_CONFIG } from '../../config/constants';

export interface EnemyAIDeps {
  isWalkableRadius(x: number, y: number, radius: number): boolean;
  addBullet(bullet: BulletState): void;
  damagePlayer(playerId: string, damage: number): void;
  getPlayers(): PlayerState[];
  pushBossEvent(event: BossEvent): void;
}

export class EnemyAI {
  private deps: EnemyAIDeps;

  constructor(deps: EnemyAIDeps) {
    this.deps = deps;
  }

  update(enemy: EnemyState, dt: number): void {
    if (enemy.type === 'boss') {
      this.updateBoss(enemy, dt);
      return;
    }
    this.updateRegular(enemy, dt);
  }

  private updateRegular(enemy: EnemyState, dt: number): void {
    const speed = (ENEMY_SPEED[enemy.type] || 60) * dt;
    const radius = ENEMY_RADIUS[enemy.type] || 16;
    const aggroRange = ENEMY_AGGRO_RANGE[enemy.type] || 200;
    const attackCooldown = ENEMY_ATTACK_COOLDOWN[enemy.type] || 1000;
    const isGhost = enemy.type === 'ghost';

    let nearestPlayer: PlayerState | null = null;
    let nearestDist = Infinity;

    for (const player of this.deps.getPlayers()) {
      if (!player.alive) continue;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }

    if (!nearestPlayer) return;

    if (nearestDist > aggroRange) {
      enemy.state = 'idle';
      return;
    }

    const dx = nearestPlayer.x - enemy.x;
    const dy = nearestPlayer.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 30) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const newEX = enemy.x + dirX * speed;
      const newEY = enemy.y + dirY * speed;

      if (isGhost) {
        const W = GAME_CONFIG.DUNGEON_WIDTH;
        const H = GAME_CONFIG.DUNGEON_HEIGHT;
        enemy.x = Math.max(radius, Math.min(W - radius, newEX));
        enemy.y = Math.max(radius, Math.min(H - radius, newEY));
      } else if (this.deps.isWalkableRadius(newEX, newEY, radius)) {
        enemy.x = newEX;
        enemy.y = newEY;
      } else if (this.deps.isWalkableRadius(newEX, enemy.y, radius)) {
        enemy.x = newEX;
      } else if (this.deps.isWalkableRadius(enemy.x, newEY, radius)) {
        enemy.y = newEY;
      } else {
        const baseAngle = Math.atan2(dirY, dirX);
        const escapeOffsets = [-Math.PI / 2, Math.PI / 2, -Math.PI / 4, Math.PI / 4, -3 * Math.PI / 4, 3 * Math.PI / 4, Math.PI, 0];
        for (const offset of escapeOffsets) {
          const escapeAngle = baseAngle + offset;
          const tryX = enemy.x + Math.cos(escapeAngle) * speed;
          const tryY = enemy.y + Math.sin(escapeAngle) * speed;
          if (this.deps.isWalkableRadius(tryX, tryY, radius)) {
            enemy.x = tryX;
            enemy.y = tryY;
            break;
          }
        }
      }

      enemy.state = 'chase';
    } else {
      enemy.state = 'attack';
      const now = Date.now();
      const lastAttack = enemy.lastAttackTime || 0;
      if (now - lastAttack >= attackCooldown && nearestPlayer.invincible <= 0) {
        const finalDamage = Math.max(1, (enemy.attack || 10) - nearestPlayer.defense * 0.5);
        nearestPlayer.hp -= finalDamage;
        nearestPlayer.invincible = 0.5;
        enemy.lastAttackTime = now;
        if (nearestPlayer.hp <= 0) {
          nearestPlayer.alive = false;
        }
      }
    }
  }

  private updateBoss(enemy: EnemyState, dt: number): void {
    const speed = ENEMY_SPEED.boss * dt;
    const radius = ENEMY_RADIUS.boss;
    const phase = enemy.bossPhase || 1;
    const rangedCooldown = phase === 2 ? 2000 : 4000;
    const aoeCooldown = phase === 2 ? 7000 : 10000;
    const aoeDamage = phase === 2 ? 40 : 30;
    const aoeRange = 100;
    const aggroRange = ENEMY_AGGRO_RANGE.boss;
    const RANGED_WINDUP = 500;
    const AOE_WINDUP = 800;

    let nearestPlayer: PlayerState | null = null;
    let nearestDist = Infinity;
    for (const player of this.deps.getPlayers()) {
      if (!player.alive) continue;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = player;
      }
    }
    if (!nearestPlayer) return;

    if (nearestDist > aggroRange && !enemy.bossCasting) {
      enemy.state = 'idle';
      enemy.bossRangedTimer = 0;
      enemy.bossAoETimer = 0;
      return;
    }

    if (phase === 1 && enemy.hp <= enemy.hpMax * 0.5) {
      enemy.bossPhase = 2;
      enemy.hp = Math.min(enemy.hpMax, enemy.hp + Math.round(enemy.hpMax * 0.2));
    }

    if (enemy.bossCasting) {
      enemy.bossCastTimer = (enemy.bossCastTimer || 0) + dt * 1000;
      const windup = enemy.bossCasting === 'ranged' ? RANGED_WINDUP : AOE_WINDUP;
      enemy.state = 'attack';

      if (enemy.bossCastTimer >= windup) {
        if (enemy.bossCasting === 'ranged') {
          this.bossFireRanged(enemy);
        } else {
          this.bossFireAoE(enemy, aoeRange, aoeDamage);
        }
        enemy.bossCasting = null;
        enemy.bossCastTimer = 0;
        enemy.bossPostCastCooldown = 1000;
      }
      return;
    }

    const dx = nearestPlayer.x - enemy.x;
    const dy = nearestPlayer.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 40) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const newEX = enemy.x + dirX * speed;
      const newEY = enemy.y + dirY * speed;
      if (this.deps.isWalkableRadius(newEX, newEY, radius)) {
        enemy.x = newEX;
        enemy.y = newEY;
      } else if (this.deps.isWalkableRadius(newEX, enemy.y, radius)) {
        enemy.x = newEX;
      } else if (this.deps.isWalkableRadius(enemy.x, newEY, radius)) {
        enemy.y = newEY;
      } else {
        const baseAngle = Math.atan2(dy, dx);
        const escapeOffsets = [-Math.PI/2, Math.PI/2, -Math.PI/4, Math.PI/4, -Math.PI*3/4, Math.PI*3/4];
        for (const offset of escapeOffsets) {
          const tryX = enemy.x + Math.cos(baseAngle + offset) * speed;
          const tryY = enemy.y + Math.sin(baseAngle + offset) * speed;
          if (this.deps.isWalkableRadius(tryX, tryY, radius)) {
            enemy.x = tryX;
            enemy.y = tryY;
            break;
          }
        }
      }
      enemy.state = 'chase';
    } else {
      enemy.state = 'attack';
    }

    const now = Date.now();
    const lastAttack = enemy.lastAttackTime || 0;
    if (dist <= 40 && now - lastAttack >= 500 && nearestPlayer.invincible <= 0) {
      const finalDamage = Math.max(1, (enemy.attack || 25) - nearestPlayer.defense * 0.5);
      nearestPlayer.hp -= finalDamage;
      nearestPlayer.invincible = 0.5;
      enemy.lastAttackTime = now;
      if (nearestPlayer.hp <= 0) nearestPlayer.alive = false;
    }

    enemy.bossRangedTimer = (enemy.bossRangedTimer || 0) + dt * 1000;
    enemy.bossAoETimer = (enemy.bossAoETimer || 0) + dt * 1000;

    if (enemy.bossPostCastCooldown && enemy.bossPostCastCooldown > 0) {
      enemy.bossPostCastCooldown -= dt * 1000;
    }

    if (!enemy.bossCasting && (!enemy.bossPostCastCooldown || enemy.bossPostCastCooldown <= 0)) {
      if (enemy.bossRangedTimer >= rangedCooldown && dist > 40) {
        enemy.bossRangedTimer = 0;
        enemy.bossCasting = 'ranged';
        enemy.bossCastTimer = 0;
        enemy.bossTargetAngle = Math.atan2(dy, dx);
        this.deps.pushBossEvent({ type: 'ranged_windup', x: enemy.x, y: enemy.y });
      } else if (enemy.bossAoETimer >= aoeCooldown) {
        enemy.bossAoETimer = 0;
        enemy.bossCasting = 'aoe';
        enemy.bossCastTimer = 0;
        this.deps.pushBossEvent({ type: 'aoe_windup', x: enemy.x, y: enemy.y });
      }
    }
  }

  private bossFireRanged(enemy: EnemyState): void {
    const angleToPlayer = enemy.bossTargetAngle || 0;
    const spreadAngle = 30 * Math.PI / 180;
    for (let i = 0; i < 5; i++) {
      const angle = angleToPlayer + (i - 2) * (spreadAngle / 4);
      this.deps.pushBossEvent({ type: 'ranged', x: enemy.x, y: enemy.y });
      const bulletSpeed = 250;
      const id = `bullet_boss_${Date.now()}_${Math.random().toString(36).slice(2)}_${i}`;
      this.deps.addBullet({
        id,
        x: enemy.x + Math.cos(angle) * 20,
        y: enemy.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * bulletSpeed,
        vy: Math.sin(angle) * bulletSpeed,
        ownerId: enemy.id,
        ownerType: 'boss',
        damage: Math.round((enemy.attack || 25) * 0.6),
        friendly: false,
        piercing: 1,
        radius: 6,
      });
    }
  }

  private bossFireAoE(enemy: EnemyState, aoeRange: number, aoeDamage: number): void {
    this.deps.pushBossEvent({ type: 'aoe', x: enemy.x, y: enemy.y });
    for (const player of this.deps.getPlayers()) {
      if (!player.alive || player.invincible > 0) continue;
      const pDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (pDist <= aoeRange) {
        const finalDamage = Math.max(1, aoeDamage - player.defense * 0.5);
        player.hp -= finalDamage;
        player.invincible = 0.5;
        if (player.hp <= 0) player.alive = false;
      }
    }
  }
}
