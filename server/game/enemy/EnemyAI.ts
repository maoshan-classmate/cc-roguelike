import type { PlayerState, EnemyState, BulletState, BossEvent } from '../../../shared/types';
import { ENEMY_DEFS } from '../../../shared/enemy-definitions';
import { ARENA_DORMANT_SPEED_MULTIPLIER, TILE_SIZE } from '../../../shared/constants';
import { GAME_CONFIG } from '../../config/constants';
import type { StatusManager } from '../status/StatusManager';

export interface EnemyAIDeps {
  isWalkableRadius(x: number, y: number, radius: number): boolean;
  hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean;
  addBullet(bullet: BulletState): void;
  damagePlayer(playerId: string, damage: number): void;
  getPlayers(): PlayerState[];
  pushBossEvent(event: BossEvent): void;
}

const TARGET_LOCK_MS = 500;
const THREAT_DECAY_PER_TICK = 1;
const CONTACT_DAMAGE_COOLDOWN = 500;
const CONTACT_DAMAGE_RATIO = 0.3;

export class EnemyAI {
  private deps: EnemyAIDeps;
  private stuckTimers = new Map<string, { frames: number; lastX: number; lastY: number }>();
  private contactCooldowns = new Map<string, number>();
  private static readonly STUCK_THRESHOLD = 30;
  private static readonly STUCK_MOVE_DIST = 10;

  constructor(deps: EnemyAIDeps) {
    this.deps = deps;
  }

  addThreat(enemy: EnemyState, playerId: string, amount: number): void {
    if (!enemy.threatTable) enemy.threatTable = {};
    enemy.threatTable[playerId] = (enemy.threatTable[playerId] || 0) + amount;
    enemy.aggroTargetId = playerId;
    enemy.lastAggroTime = Date.now();
  }

  update(enemy: EnemyState, dt: number, sm?: StatusManager): void {
    // Dormant: slow patrol, no chase, no attack
    if (enemy.dormant) {
      const speed = (ENEMY_DEFS[enemy.type]?.speed || 60) * dt * ARENA_DORMANT_SPEED_MULTIPLIER;
      const seed = enemy.id.charCodeAt(enemy.id.length - 1) || 0;
      const angle = (seed * 1.7 + Date.now() * 0.0003) % (Math.PI * 2);
      const radius = ENEMY_DEFS[enemy.type]?.radius || 16;
      const newX = enemy.x + Math.cos(angle) * speed;
      const newY = enemy.y + Math.sin(angle) * speed;
      if (this.deps.isWalkableRadius(newX, newY, radius)) {
        enemy.x = newX;
        enemy.y = newY;
      }
      enemy.state = 'idle';
      return;
    }

    // Check status flags before acting
    if (sm) {
      const flags = sm.getAggregatedFlags();
      if (flags.blocksMovement && flags.blocksAttack && !enemy.bossCasting) return;
    }

    // Threat decay
    if (enemy.threatTable) {
      for (const pid of Object.keys(enemy.threatTable)) {
        enemy.threatTable[pid] = Math.max(0, enemy.threatTable[pid] - THREAT_DECAY_PER_TICK);
        if (enemy.threatTable[pid] <= 0) delete enemy.threatTable[pid];
      }
    }

    if (enemy.type === 'boss') {
      this.updateBoss(enemy, dt, sm);
      return;
    }
    this.updateRegular(enemy, dt, sm);
  }

  private selectTarget(enemy: EnemyState, players: PlayerState[], forcedTargetId?: string): PlayerState | null {
    // Check forced target (taunt)
    if (forcedTargetId) {
      const taunter = players.find(p => p.alive && p.id === forcedTargetId);
      if (taunter) return taunter;
    }

    // Check target lock
    const now = Date.now();
    if (enemy.aggroTargetId && enemy.targetLockUntil > now) {
      const locked = players.find(p => p.alive && p.id === enemy.aggroTargetId);
      if (locked) return locked;
      // Target dead — unlock
      enemy.targetLockUntil = 0;
    }

    // Threat table: highest threat alive player
    if (enemy.threatTable) {
      const entries = Object.entries(enemy.threatTable).filter(([pid, threat]) => {
        if (threat <= 0) return false;
        return players.some(p => p.alive && p.id === pid);
      });
      if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        const target = entries[0][0];
        enemy.aggroTargetId = target;
        enemy.targetLockUntil = now + TARGET_LOCK_MS;
        return players.find(p => p.id === target) || null;
      }
    }

    // Fallback: nearest alive player
    let nearest: PlayerState | null = null;
    let nearestDist = Infinity;
    for (const p of players) {
      if (!p.alive) continue;
      const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = p;
      }
    }
    if (nearest) {
      enemy.aggroTargetId = nearest.id;
      enemy.targetLockUntil = now + TARGET_LOCK_MS;
    }
    return nearest;
  }

  private updateRegular(enemy: EnemyState, dt: number, sm?: StatusManager): void {
    const speed = (ENEMY_DEFS[enemy.type]?.speed || 60) * dt;
    const radius = ENEMY_DEFS[enemy.type]?.radius || 16;
    const aggroRange = ENEMY_DEFS[enemy.type]?.aggroRange || 200;
    const attackCooldown = ENEMY_DEFS[enemy.type]?.attackCooldown || 1000;
    const isGhost = enemy.type === 'ghost';
    const flags = sm?.getAggregatedFlags();
    const players = this.deps.getPlayers();
    const forcedTargetId = flags?.forcedTarget ? flags.forcedTargetSource : undefined;

    // Check aggro state BEFORE selectTarget (which sets aggroTargetId as side effect)
    const hasAggro = !!enemy.aggroTargetId || (enemy.threatTable && Object.keys(enemy.threatTable).length > 0);

    // Quick rejection: no aggro → find nearest player for range/LOS check first
    if (!hasAggro) {
      let nearest: PlayerState | null = null;
      let nearestDist = Infinity;
      for (const p of players) {
        if (!p.alive) continue;
        const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (d < nearestDist) { nearestDist = d; nearest = p; }
      }
      if (!nearest) return;
      if (nearestDist > aggroRange) { enemy.state = 'idle'; return; }
      if (!isGhost && !this.deps.hasLineOfSight(enemy.x, enemy.y, nearest.x, nearest.y)) { enemy.state = 'idle'; return; }
    }

    // Select target (may set aggroTargetId as side effect)
    const target = this.selectTarget(enemy, players, forcedTargetId);
    if (!target) return;

    const distToTarget = Math.hypot(target.x - enemy.x, target.y - enemy.y);

    // Leash check: if we have aggroTargetId, leash = aggroRange × 2
    const leashRange = aggroRange * 2;

    if (hasAggro && distToTarget > leashRange) {
      // Out of leash — disengage
      enemy.aggroTargetId = undefined;
      enemy.threatTable = undefined;
      enemy.targetLockUntil = 0;
      enemy.state = 'idle';
      return;
    }

    // Engage
    enemy.aggroTargetId = target.id;
    enemy.lastAggroTime = Date.now();

    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy);

    const speedMult = flags?.speedMultiplier ?? 1.0;
    const effectiveSpeed = speed * speedMult;
    const canMove = !flags?.blocksMovement;

    if (dist > 30 && canMove) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const newEX = enemy.x + dirX * effectiveSpeed;
      const newEY = enemy.y + dirY * effectiveSpeed;

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
        let escaped = false;
        for (const offset of escapeOffsets) {
          const escapeAngle = baseAngle + offset;
          const tryX = enemy.x + Math.cos(escapeAngle) * effectiveSpeed;
          const tryY = enemy.y + Math.sin(escapeAngle) * effectiveSpeed;
          if (this.deps.isWalkableRadius(tryX, tryY, radius)) {
            enemy.x = tryX;
            enemy.y = tryY;
            escaped = true;
            break;
          }
        }
        if (!escaped) {
          const tileStep = Math.min(TILE_SIZE, effectiveSpeed);
          const dirs = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
          ];
          for (const d of dirs) {
            const tryX = enemy.x + d.dx * tileStep;
            const tryY = enemy.y + d.dy * tileStep;
            if (this.deps.isWalkableRadius(tryX, tryY, radius)) {
              enemy.x = tryX;
              enemy.y = tryY;
              break;
            }
          }
        }
      }

      // Stuck detection
      const stuck = this.stuckTimers.get(enemy.id) || { frames: 0, lastX: enemy.x, lastY: enemy.y };
      if (Math.hypot(enemy.x - stuck.lastX, enemy.y - stuck.lastY) < 1) {
        stuck.frames++;
      } else {
        stuck.frames = 0;
        stuck.lastX = enemy.x;
        stuck.lastY = enemy.y;
      }
      if (stuck.frames >= EnemyAI.STUCK_THRESHOLD) {
        const wanderAngle = Math.random() * Math.PI * 2;
        const wanderDist = EnemyAI.STUCK_MOVE_DIST;
        const tryX = enemy.x + Math.cos(wanderAngle) * wanderDist;
        const tryY = enemy.y + Math.sin(wanderAngle) * wanderDist;
        if (this.deps.isWalkableRadius(tryX, tryY, radius)) {
          enemy.x = tryX;
          enemy.y = tryY;
        }
        stuck.frames = 0;
        stuck.lastX = enemy.x;
        stuck.lastY = enemy.y;
      }
      this.stuckTimers.set(enemy.id, stuck);

      enemy.state = 'chase';
    } else if (dist <= 30) {
      if (flags?.blocksAttack) {
        enemy.state = 'idle';
        return;
      }
      enemy.state = 'attack';
      const now = Date.now();
      const lastAttack = enemy.lastAttackTime || 0;
      if (now - lastAttack >= attackCooldown) {
        this.deps.damagePlayer(target.id, enemy.attack || 10);
        enemy.lastAttackTime = now;
      }
    }
  }

  private updateBoss(enemy: EnemyState, dt: number, sm?: StatusManager): void {
    const speed = ENEMY_DEFS.boss.speed * dt;
    const radius = ENEMY_DEFS.boss.radius;
    const phase = enemy.bossPhase || 1;
    const rangedCooldown = phase === 2 ? 2000 : 4000;
    const aoeCooldown = phase === 2 ? 7000 : 10000;
    const aoeDamage = phase === 2 ? 40 : 30;
    const aoeRange = 100;
    const aggroRange = ENEMY_DEFS.boss.aggroRange;
    const RANGED_WINDUP = 500;
    const AOE_WINDUP = 800;
    const flags = sm?.getAggregatedFlags();
    const canMove = !flags?.blocksMovement;
    const canAttack = !flags?.blocksAttack;
    const speedMult = flags?.speedMultiplier ?? 1.0;
    const forcedTargetId = flags?.forcedTarget ? flags.forcedTargetSource : undefined;
    const players = this.deps.getPlayers();

    // Check aggro BEFORE selectTarget (which sets aggroTargetId as side effect)
    const hasAggro = !!enemy.aggroTargetId || (enemy.threatTable && Object.keys(enemy.threatTable).length > 0);

    // Quick rejection: no aggro → range/LOS check first
    if (!hasAggro && !enemy.bossCasting) {
      let nearest: PlayerState | null = null;
      let nearestDist = Infinity;
      for (const p of players) {
        if (!p.alive) continue;
        const d = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (d < nearestDist) { nearestDist = d; nearest = p; }
      }
      if (!nearest) return;
      if (nearestDist > aggroRange) { enemy.state = 'idle'; return; }
      if (!this.deps.hasLineOfSight(enemy.x, enemy.y, nearest.x, nearest.y)) { enemy.state = 'idle'; return; }
    }

    // Select target (with forced target support for taunt)
    const target = this.selectTarget(enemy, players, forcedTargetId);
    if (!target) return;

    const distToTarget = Math.hypot(target.x - enemy.x, target.y - enemy.y);

    // Leash check
    const leashRange = aggroRange * 2;

    if (hasAggro && distToTarget > leashRange && !enemy.bossCasting) {
      enemy.aggroTargetId = undefined;
      enemy.threatTable = undefined;
      enemy.targetLockUntil = 0;
      enemy.state = 'idle';
      enemy.bossRangedTimer = 0;
      enemy.bossAoETimer = 0;
      return;
    }

    enemy.aggroTargetId = target.id;
    enemy.lastAggroTime = Date.now();

    if (phase === 1 && enemy.hp <= enemy.hpMax * 0.5) {
      enemy.bossPhase = 2;
      enemy.hp = Math.min(enemy.hpMax, enemy.hp + Math.round(enemy.hpMax * 0.2));
    }

    // Casting: CC immune, locked
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

    // Post-cast cooldown
    if (enemy.bossPostCastCooldown && enemy.bossPostCastCooldown > 0) {
      enemy.bossPostCastCooldown -= dt * 1000;
      enemy.bossRangedTimer = (enemy.bossRangedTimer || 0) + dt * 1000;
      enemy.bossAoETimer = (enemy.bossAoETimer || 0) + dt * 1000;
      enemy.state = 'attack';
      return;
    }

    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    const effectiveSpeed = speed * speedMult;

    if (dist > 40 && canMove) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const newEX = enemy.x + dirX * effectiveSpeed;
      const newEY = enemy.y + dirY * effectiveSpeed;
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
        let bossEscaped = false;
        for (const offset of escapeOffsets) {
          const tryX = enemy.x + Math.cos(baseAngle + offset) * effectiveSpeed;
          const tryY = enemy.y + Math.sin(baseAngle + offset) * effectiveSpeed;
          if (this.deps.isWalkableRadius(tryX, tryY, radius)) {
            enemy.x = tryX;
            enemy.y = tryY;
            bossEscaped = true;
            break;
          }
        }
        if (!bossEscaped) {
        const tileStep = TILE_SIZE;
        const dirs = [
          { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
          { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 },
        ];
        for (const d of dirs) {
          const tryX = enemy.x + d.dx * tileStep;
          const tryY = enemy.y + d.dy * tileStep;
          if (this.deps.isWalkableRadius(tryX, tryY, radius)) {
            enemy.x = tryX;
            enemy.y = tryY;
            break;
          }
        }
        }
      }
      enemy.state = 'chase';
    } else if (dist <= 40) {
      enemy.state = 'attack';
    }

    const now = Date.now();
    const lastAttack = enemy.lastAttackTime || 0;
    if (dist <= 40 && canAttack && now - lastAttack >= 500) {
      this.deps.damagePlayer(target.id, enemy.attack || 25);
      enemy.lastAttackTime = now;
    }

    if (canAttack) {
      enemy.bossRangedTimer = (enemy.bossRangedTimer || 0) + dt * 1000;
      enemy.bossAoETimer = (enemy.bossAoETimer || 0) + dt * 1000;

      if (!enemy.bossCasting) {
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
      if (!player.alive) continue;
      const pDist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (pDist <= aoeRange) {
        this.deps.damagePlayer(player.id, aoeDamage);
      }
    }
  }

  /** Contact collision damage — call from GameRoom tick */
  applyContactDamage(enemy: EnemyState, players: PlayerState[]): void {
    if (!enemy.alive || enemy.state === 'dying' || enemy.dormant) return;
    const now = Date.now();
    const eRadius = ENEMY_DEFS[enemy.type]?.radius || 16;
    const pRadius = GAME_CONFIG.PLAYER_BASE.radius;

    for (const player of players) {
      if (!player.alive) continue;
      const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
      if (dist < eRadius + pRadius) {
        const key = `${enemy.id}:${player.id}`;
        const lastContact = this.contactCooldowns.get(key) || 0;
        if (now - lastContact < CONTACT_DAMAGE_COOLDOWN) continue;
        const contactDmg = Math.round((enemy.attack || 10) * CONTACT_DAMAGE_RATIO);
        this.deps.damagePlayer(player.id, contactDmg);
        this.contactCooldowns.set(key, now);
      }
    }
  }
}
