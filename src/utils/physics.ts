import type { CircleState } from '../types/physics'

/** Returns true if the two circles overlap (uses squared distance — no sqrt). */
export const checkCircleCollision = (
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
): boolean => {
  const dx = x2 - x1
  const dy = y2 - y1
  const distanceSquared = dx * dx + dy * dy
  const radiusSum = r1 + r2
  return distanceSquared < radiusSum * radiusSum
}

/** Euclidean distance between two circle centres. */
export const getCircleDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Resolve an elastic collision between two circles by mutating both states.
 * Skips if circles are already moving apart.
 */
export const resolveCollision = (circle1: CircleState, circle2: CircleState): void => {
  const dx = circle2.x - circle1.x
  const dy = circle2.y - circle1.y
  const distance = getCircleDistance(circle1.x, circle1.y, circle2.x, circle2.y)

  // Normal vector
  const nx = dx / distance
  const ny = dy / distance

  // Relative velocity
  const dvx = circle2.vx - circle1.vx
  const dvy = circle2.vy - circle1.vy

  // Relative velocity along the normal
  const vnDot = dvx * nx + dvy * ny

  // Don't collide if circles are already moving apart
  if (vnDot > 0) return

  // Elastic collision impulse (restitution coefficient 0.9)
  const impulse = -(1 + 0.9) * vnDot / 2

  circle1.vx -= impulse * nx
  circle1.vy -= impulse * ny
  circle2.vx += impulse * nx
  circle2.vy += impulse * ny

  // Separate overlapping circles
  const overlap = (circle1.radius + circle2.radius) - distance
  if (overlap > 0) {
    const moveX = (overlap * nx) / 2
    const moveY = (overlap * ny) / 2
    circle1.x -= moveX
    circle1.y -= moveY
    circle2.x += moveX
    circle2.y += moveY
  }
}
