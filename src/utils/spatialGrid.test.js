import { describe, it, expect, beforeEach } from 'vitest'
import { SpatialGrid } from './spatialGrid'

describe('SpatialGrid', () => {
  let grid

  beforeEach(() => {
    grid = new SpatialGrid(1000, 800, 100)
  })

  describe('constructor', () => {
    it('calculates correct column and row counts', () => {
      expect(grid.cols).toBe(10)
      expect(grid.rows).toBe(8)
    })

    it('initializes with an empty grid', () => {
      expect(grid.grid.size).toBe(0)
    })
  })

  describe('getCellCoords', () => {
    it('returns correct cell for a position', () => {
      const { col, row } = grid.getCellCoords(150, 250)
      expect(col).toBe(1)
      expect(row).toBe(2)
    })

    it('clamps to grid bounds for out-of-range positions', () => {
      const { col, row } = grid.getCellCoords(-50, 9999)
      expect(col).toBe(0)
      expect(row).toBe(7) // clamped to rows - 1
    })
  })

  describe('insert', () => {
    it('inserts a small circle into a single cell', () => {
      grid.insert('a', 150, 150, 5) // small radius, well within one cell
      expect(grid.grid.size).toBeGreaterThanOrEqual(1)
    })

    it('inserts a large circle spanning multiple cells', () => {
      grid.insert('b', 200, 200, 150) // radius > cellSize, spans multiple cells
      expect(grid.grid.size).toBeGreaterThan(1)
    })

    it('adds the id to each overlapping cell', () => {
      grid.insert('c', 150, 150, 5)
      const key = grid.getCellKey(150, 150)
      expect(grid.grid.get(key).has('c')).toBe(true)
    })
  })

  describe('clear', () => {
    it('empties the grid', () => {
      grid.insert('a', 150, 150, 10)
      grid.clear()
      expect(grid.grid.size).toBe(0)
    })
  })

  describe('getPotentialCollisions', () => {
    it('returns nearby circle ids', () => {
      grid.insert('a', 150, 150, 10)
      grid.insert('b', 160, 150, 10)  // very close
      grid.insert('c', 900, 700, 10)  // far away
      const candidates = grid.getPotentialCollisions(155, 150, 10)
      expect(candidates.has('a')).toBe(true)
      expect(candidates.has('b')).toBe(true)
      expect(candidates.has('c')).toBe(false)
    })

    it('returns an empty Set when grid is empty', () => {
      const candidates = grid.getPotentialCollisions(500, 400, 10)
      expect(candidates.size).toBe(0)
    })

    it('includes the queried id itself if inserted', () => {
      grid.insert('self', 300, 300, 10)
      const candidates = grid.getPotentialCollisions(300, 300, 10)
      expect(candidates.has('self')).toBe(true)
    })
  })

  describe('updateDimensions', () => {
    it('recalculates cols and rows', () => {
      grid.updateDimensions(500, 400)
      expect(grid.cols).toBe(5)
      expect(grid.rows).toBe(4)
    })
  })
})
