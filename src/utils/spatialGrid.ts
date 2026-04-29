import type { GridDebugInfo } from '../types/physics'

/**
 * Spatial hash grid for O(n) broad-phase collision detection.
 * Divides the container into fixed-size cells; each circle registers in all
 * cells it overlaps so getPotentialCollisions returns only nearby candidates.
 */
export class SpatialGrid {
  private cellSize: number
  private cols: number
  private rows: number
  private grid: Map<string, Set<string>>

  constructor(width: number, height: number, cellSize = 100) {
    this.cellSize = cellSize
    this.cols = Math.ceil(width / cellSize)
    this.rows = Math.ceil(height / cellSize)
    this.grid = new Map()
  }

  /** Clear all entries for the next frame. */
  clear(): void {
    this.grid.clear()
  }

  /** Returns the clamped (col, row) cell for a position. */
  private getCellCoords(x: number, y: number): { col: number; row: number } {
    const col = Math.floor(x / this.cellSize)
    const row = Math.floor(y / this.cellSize)
    return {
      col: Math.max(0, Math.min(col, this.cols - 1)),
      row: Math.max(0, Math.min(row, this.rows - 1)),
    }
  }

  /** Returns the string key for the cell at a position. */
  getCellKey(x: number, y: number): string {
    const { col, row } = this.getCellCoords(x, y)
    return `${col},${row}`
  }

  /** Register a circle in every cell it overlaps. */
  insert(id: string, x: number, y: number, radius: number): void {
    const startCol = Math.max(0, Math.floor((x - radius) / this.cellSize))
    const endCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize))
    const startRow = Math.max(0, Math.floor((y - radius) / this.cellSize))
    const endRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize))

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col},${row}`
        let cell = this.grid.get(key)
        if (!cell) {
          cell = new Set()
          this.grid.set(key, cell)
        }
        cell.add(id)
      }
    }
  }

  /** Returns all circle IDs in cells that overlap the given circle's AABB. */
  getPotentialCollisions(x: number, y: number, radius: number): Set<string> {
    const candidates = new Set<string>()

    const startCol = Math.max(0, Math.floor((x - radius) / this.cellSize))
    const endCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize))
    const startRow = Math.max(0, Math.floor((y - radius) / this.cellSize))
    const endRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize))

    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const cell = this.grid.get(`${col},${row}`)
        if (cell) {
          cell.forEach(id => candidates.add(id))
        }
      }
    }

    return candidates
  }

  /** Recalculate grid dimensions after a resize. */
  updateDimensions(width: number, height: number): void {
    this.cols = Math.ceil(width / this.cellSize)
    this.rows = Math.ceil(height / this.cellSize)
  }

  getDebugInfo(): GridDebugInfo {
    const totalCells = this.cols * this.rows
    const usedCells = this.grid.size
    let totalObjects = 0
    this.grid.forEach(cell => { totalObjects += cell.size })

    return {
      totalCells,
      usedCells,
      totalObjects,
      averageObjectsPerCell: usedCells > 0 ? (totalObjects / usedCells).toFixed(2) : 0,
      gridDimensions: `${this.cols}x${this.rows}`,
      cellSize: this.cellSize,
    }
  }
}
