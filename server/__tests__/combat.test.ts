import { describe, it, expect, vi } from 'vitest'
import { Combat, type CombatDeps } from '../game/combat/Combat'
import type { PlayerState, EnemyState, BulletState } from '../../shared/types'

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'player1',
    accountId: 'acc1',
    name: 'Test',
    x: 100, y: 100,
    dx: 0, dy: 0,
    hp: 100, hpMax: 100,
    energy: 50, energyMax: 50,
    attack: 15, defense: 5,
    speed: 180, speedBuff: 1, speedBuffTimer: 0,
    weapon: 'pistol',
    characterType: 'warrior',
    skills: ['dash', 'shield', 'heal', 'speed_boost'],
    alive: true,
    invincible: 0,
    angle: 0,
    gold: 0, keys: 0,
    ...overrides,
  }
}

function makeBullet(overrides: Partial<BulletState> = {}): BulletState {
  return {
    id: 'bullet1',
    x: 100, y: 100,
    vx: 400, vy: 0,
    ownerId: 'player1',
    ownerType: 'warrior',
    damage: 12,
    friendly: true,
    piercing: 1,
    radius: 4,
    ...overrides,
  }
}

function makeEnemy(overrides: Partial<EnemyState> = {}): EnemyState {
  return {
    id: 'enemy1',
    type: 'basic',
    x: 110, y: 100,
    hp: 30, hpMax: 30,
    attack: 5,
    alive: true,
    state: 'chase',
    ...overrides,
  }
}

function makeDeps(): CombatDeps & {
  damagedEnemies: Map<string, number>
  damagedPlayers: Map<string, number>
  removedBullets: Set<string>
  stateOverrides: Record<string, unknown>
} {
  const damagedEnemies = new Map<string, number>()
  const damagedPlayers = new Map<string, number>()
  const removedBullets = new Set<string>()
  const stateOverrides: Record<string, unknown> = {}

  const deps: any = {
    damagedEnemies,
    damagedPlayers,
    removedBullets,
    stateOverrides,
    getState: () => ({
      tick: 0, floor: 1, gameSession: 1,
      players: [makePlayer()],
      enemies: [makeEnemy()],
      bullets: [],
      healWaves: [],
      items: [],
      floorCompleted: false,
      ...stateOverrides,
    }),
    spawnBullet: vi.fn(),
    spawnHealWave: vi.fn(),
    damageEnemy: vi.fn((id, dmg) => damagedEnemies.set(id, dmg)),
    damagePlayer: vi.fn((id, dmg) => damagedPlayers.set(id, dmg)),
    removeBullet: vi.fn((id) => removedBullets.add(id)),
    isWalkable: vi.fn(() => true),
  }

  return deps
}

describe('Combat - checkBulletCollision', () => {
  it('friendly bullet hits enemy', () => {
    const deps = makeDeps()
    const combat = new Combat(deps)
    const bullet = makeBullet({ friendly: true, x: 110, y: 100 })
    combat.checkBulletCollision(bullet)
    expect(deps.damagedEnemies.has('enemy1')).toBe(true)
  })

  it('enemy bullet hits player', () => {
    const deps = makeDeps()
    const combat = new Combat(deps)
    const bullet = makeBullet({
      friendly: false, ownerId: 'enemy1', ownerType: 'boss',
      x: 100, y: 100,
    })
    combat.checkBulletCollision(bullet)
    expect(deps.damagedPlayers.has('player1')).toBe(true)
  })

  it('invincible player takes no damage', () => {
    const deps = makeDeps()
    Object.assign(deps.stateOverrides, { players: [makePlayer({ invincible: 1 })] })
    const combat = new Combat(deps)
    const bullet = makeBullet({ friendly: false, ownerId: 'enemy1', x: 100, y: 100 })
    combat.checkBulletCollision(bullet)
    expect(deps.damagedPlayers.has('player1')).toBe(false)
  })

  it('piercing bullet hits multiple enemies', () => {
    const deps = makeDeps()
    const enemy2 = makeEnemy({ id: 'enemy2', x: 108, y: 100 })
    Object.assign(deps.stateOverrides, {
      players: [makePlayer()],
      enemies: [makeEnemy(), enemy2],
    })
    const combat = new Combat(deps)
    const bullet = makeBullet({ friendly: true, piercing: 3, x: 109, y: 100 })
    combat.checkBulletCollision(bullet)
    expect(deps.damagedEnemies.size).toBe(2)
  })

  it('non-piercing bullet is removed after hit', () => {
    const deps = makeDeps()
    const combat = new Combat(deps)
    const bullet = makeBullet({ friendly: true, piercing: 1, x: 110, y: 100 })
    combat.checkBulletCollision(bullet)
    expect(deps.removedBullets.has('bullet1')).toBe(true)
  })
})
