import { describe, it, expect } from 'vitest'
import { DungeonGenerator } from '../game/dungeon/DungeonGenerator'

const generator = new DungeonGenerator()

function generateMany(floor: number, count: number) {
  const results = []
  for (let i = 0; i < count; i++) {
    results.push(generator.generate(floor, i * 1000 + 42))
  }
  return results
}

describe('DungeonGenerator', () => {
  it('spawn point is always walkable', () => {
    for (let floor = 1; floor <= 5; floor++) {
      for (const dungeon of generateMany(floor, 10)) {
        const { spawnPoint, collisionGrid } = dungeon
        const tileX = Math.floor(spawnPoint.x / 32)
        const tileY = Math.floor(spawnPoint.y / 32)
        expect(
          collisionGrid[tileY]?.[tileX],
          `Floor ${floor} spawn (${spawnPoint.x},${spawnPoint.y}) not walkable`
        ).toBe(true)
      }
    }
  })

  it('exit point is always walkable', () => {
    for (let floor = 1; floor <= 5; floor++) {
      for (const dungeon of generateMany(floor, 10)) {
        const { exitPoint, collisionGrid } = dungeon
        const tileX = Math.floor(exitPoint.x / 32)
        const tileY = Math.floor(exitPoint.y / 32)
        expect(
          collisionGrid[tileY]?.[tileX],
          `Floor ${floor} exit (${exitPoint.x},${exitPoint.y}) not walkable`
        ).toBe(true)
      }
    }
  })

  it('collision grid has walkable tiles', () => {
    for (let floor = 1; floor <= 5; floor++) {
      for (const dungeon of generateMany(floor, 5)) {
        let walkable = 0
        for (const row of dungeon.collisionGrid) {
          for (const cell of row) {
            if (cell) walkable++
          }
        }
        const total = dungeon.collisionGrid.length * (dungeon.collisionGrid[0]?.length || 1)
        expect(walkable / total, `Floor ${floor} walkable ratio too low`).toBeGreaterThan(0.15)
      }
    }
  })

  it('generates rooms', () => {
    for (let floor = 1; floor <= 5; floor++) {
      for (const dungeon of generateMany(floor, 5)) {
        expect(dungeon.rooms.length, `Floor ${floor} has no rooms`).toBeGreaterThan(0)
      }
    }
  })

  it('is deterministic with same seed', () => {
    const a = generator.generate(1, 12345)
    const b = generator.generate(1, 12345)
    expect(a.spawnPoint).toEqual(b.spawnPoint)
    expect(a.exitPoint).toEqual(b.exitPoint)
    expect(a.rooms.length).toBe(b.rooms.length)
    expect(a.collisionGrid).toEqual(b.collisionGrid)
  })

  it('produces different dungeons with different seeds', () => {
    const a = generator.generate(1, 100)
    const b = generator.generate(1, 200)
    expect(a.spawnPoint).not.toEqual(b.spawnPoint)
  })

  it('enemies are placed at valid positions', () => {
    for (let floor = 1; floor <= 5; floor++) {
      for (const dungeon of generateMany(floor, 5)) {
        for (const spawn of dungeon.enemies) {
          expect(spawn.x, `Enemy x out of bounds`).toBeGreaterThanOrEqual(0)
          expect(spawn.y, `Enemy y out of bounds`).toBeGreaterThanOrEqual(0)
          expect(spawn.x).toBeLessThanOrEqual(1024)
          expect(spawn.y).toBeLessThanOrEqual(768)
        }
      }
    }
  })
})
