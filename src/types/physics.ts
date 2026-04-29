/** Physics state for a single bouncing circle */
export interface CircleState {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  color: string
}

/** Per-axis wall-collision tracking (true = currently pressing that wall) */
export interface WallCollisions {
  x: boolean
  y: boolean
}

/** Container bounds passed to wall-collision helpers */
export interface Bounds {
  width: number
  height: number
}

/** Axis-level hit flags returned by checkWallCollision */
export interface WallHitResult {
  hitLeftRight: boolean
  hitTopBottom: boolean
}

/** Full result of handleWallCollision */
export interface WallCollisionResult {
  state: CircleState
  wallCollisions: WallCollisions
  hitLeftRight: boolean
  hitTopBottom: boolean
}

/** Ball-ball collision event emitted by handleCircleCollisions */
export interface CollisionEvent {
  id1: string
  id2: string
  state1: CircleState
  state2: CircleState
  collisionPoint: { x: number; y: number }
  angle: number
}

/** Debug info returned by SpatialGrid.getDebugInfo() */
export interface GridDebugInfo {
  totalCells: number
  usedCells: number
  totalObjects: number
  averageObjectsPerCell: number | string
  gridDimensions: string
  cellSize: number
}
