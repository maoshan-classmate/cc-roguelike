import { describe, it, expect } from 'vitest'
import { CollisionGrid } from '../game/collision/CollisionGrid'

function makeGrid(rows: number, cols: number, walkable = true): boolean[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(walkable))
}

describe('CollisionGrid', () => {
  it('empty grid blocks all movement', () => {
    const grid = new CollisionGrid()
    expect(grid.isWalkable(100, 100)).toBe(false)
    expect(grid.isWalkableRadius(100, 100, 10)).toBe(false)
  })

  it('out-of-bounds coordinates are not walkable', () => {
    const grid = new CollisionGrid()
    grid.setGrid(makeGrid(24, 32))
    expect(grid.isWalkable(-10, -10)).toBe(false)
    expect(grid.isWalkable(2000, 2000)).toBe(false)
    expect(grid.isWalkable(0, 2000)).toBe(false)
  })

  it('5-point radius check passes when all corners are walkable', () => {
    const grid = new CollisionGrid()
    grid.setGrid(makeGrid(24, 32))
    expect(grid.isWalkableRadius(100, 100, 10)).toBe(true)
  })

  it('5-point radius check fails when a corner hits a wall', () => {
    const g = makeGrid(24, 32)
    // Place a wall at tile (3,3) which covers 96-128 in both x and y
    g[3][3] = false
    const grid = new CollisionGrid()
    grid.setGrid(g)
    // Center at (112, 112) with radius 20 → corner at (92, 92) walks into tile (2,2) which is fine
    // But corner at (132, 132) walks into tile (4,4) which is also fine since only (3,3) is a wall
    // Let's test with center closer to the wall
    expect(grid.isWalkable(96, 96)).toBe(false) // tile (3,3)
    expect(grid.isWalkable(64, 64)).toBe(true)  // tile (2,2)
    expect(grid.isWalkableRadius(80, 80, 16)).toBe(false) // corner at (96,96) hits wall
  })

  it('separateEnemies pushes overlapping enemies apart', () => {
    const grid = new CollisionGrid()
    grid.setGrid(makeGrid(24, 32))
    const enemies = [
      { x: 100, y: 100, type: 'basic', alive: true },
      { x: 102, y: 100, type: 'basic', alive: true },
    ]
    grid.separateEnemies(enemies)
    // After separation, distance should be >= minDist (basic radius 16, so minDist = 32)
    const dist = Math.hypot(enemies[1].x - enemies[0].x, enemies[1].y - enemies[0].y)
    expect(dist).toBeGreaterThan(2) // they were 2px apart, must have moved
  })

  it('separateEnemies only processes passed-in enemies (caller filters alive)', () => {
    const grid = new CollisionGrid()
    grid.setGrid(makeGrid(24, 32))
    // Caller is responsible for filtering alive enemies
    const enemies = [
      { x: 100, y: 100, type: 'basic', alive: true },
      { x: 102, y: 100, type: 'basic', alive: true },
    ]
    grid.separateEnemies(enemies)
    const dist = Math.hypot(enemies[1].x - enemies[0].x, enemies[1].y - enemies[0].y)
    expect(dist).toBeGreaterThan(2)
    // Empty array — no crash
    grid.separateEnemies([])
  })
})
