/**
 * Spatial Grid for optimized collision detection
 * Reduces collision detection complexity from O(n²) to O(n)
 */

export class SpatialGrid {
  constructor(width, height, cellSize = 100) {
    this.width = width
    this.height = height
    this.cellSize = cellSize
    this.cols = Math.ceil(width / cellSize)
    this.rows = Math.ceil(height / cellSize)
    this.grid = new Map()
  }

  /**
   * Clear the grid for a new frame
   */
  clear() {
    this.grid.clear()
  }

  /**
   * Get grid cell coordinates for a position
   */
  getCellCoords(x, y) {
    const col = Math.floor(x / this.cellSize)
    const row = Math.floor(y / this.cellSize)
    return {
      col: Math.max(0, Math.min(col, this.cols - 1)),
      row: Math.max(0, Math.min(row, this.rows - 1))
    }
  }

  /**
   * Get grid cell key for a position
   */
  getCellKey(x, y) {
    const { col, row } = this.getCellCoords(x, y)
    return `${col},${row}`
  }

  /**
   * Insert a circle into the spatial grid
   */
  insert(id, x, y, radius) {
    // Calculate which cells this circle overlaps
    const minX = x - radius
    const maxX = x + radius
    const minY = y - radius
    const maxY = y + radius

    const startCol = Math.max(0, Math.floor(minX / this.cellSize))
    const endCol = Math.min(this.cols - 1, Math.floor(maxX / this.cellSize))
    const startRow = Math.max(0, Math.floor(minY / this.cellSize))
    const endRow = Math.min(this.rows - 1, Math.floor(maxY / this.cellSize))

    // Insert circle into all overlapping cells
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col},${row}`
        if (!this.grid.has(key)) {
          this.grid.set(key, new Set())
        }
        this.grid.get(key).add(id)
      }
    }
  }

  /**
   * Get potential collision candidates for a circle
   * Returns Set of IDs that could potentially collide
   */
  getPotentialCollisions(x, y, radius) {
    const candidates = new Set()

    // Calculate which cells this circle overlaps
    const minX = x - radius
    const maxX = x + radius
    const minY = y - radius
    const maxY = y + radius

    const startCol = Math.max(0, Math.floor(minX / this.cellSize))
    const endCol = Math.min(this.cols - 1, Math.floor(maxX / this.cellSize))
    const startRow = Math.max(0, Math.floor(minY / this.cellSize))
    const endRow = Math.min(this.rows - 1, Math.floor(maxY / this.cellSize))

    // Collect all circles in overlapping cells
    for (let col = startCol; col <= endCol; col++) {
      for (let row = startRow; row <= endRow; row++) {
        const key = `${col},${row}`
        const cell = this.grid.get(key)
        if (cell) {
          cell.forEach(id => candidates.add(id))
        }
      }
    }

    return candidates
  }

  /**
   * Update grid dimensions (e.g., on window resize)
   */
  updateDimensions(width, height) {
    this.width = width
    this.height = height
    this.cols = Math.ceil(width / this.cellSize)
    this.rows = Math.ceil(height / this.cellSize)
  }

  /**
   * Get debug information about grid usage
   */
  getDebugInfo() {
    let totalCells = this.cols * this.rows
    let usedCells = this.grid.size
    let totalObjects = 0

    this.grid.forEach(cell => {
      totalObjects += cell.size
    })

    return {
      totalCells,
      usedCells,
      totalObjects,
      averageObjectsPerCell: usedCells > 0 ? (totalObjects / usedCells).toFixed(2) : 0,
      gridDimensions: `${this.cols}x${this.rows}`,
      cellSize: this.cellSize
    }
  }
}