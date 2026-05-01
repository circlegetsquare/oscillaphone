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
 * Mass scales with radius^MASS_EXPONENT, so larger balls hit harder and shove
 * smaller ones around. 1.0 = linear (gentle), 2.0 = area (extreme).
 * Skips if circles are already moving apart.
 */
const MASS_EXPONENT = 1.5

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

  // Mass scaled by radius^MASS_EXPONENT (constants cancel from the impulse formula).
  const m1 = Math.pow(circle1.radius, MASS_EXPONENT)
  const m2 = Math.pow(circle2.radius, MASS_EXPONENT)
  const invMassSum = 1 / m1 + 1 / m2

  // Elastic collision impulse (restitution coefficient 0.9)
  const impulse = -(1 + 0.9) * vnDot / invMassSum

  circle1.vx -= (impulse / m1) * nx
  circle1.vy -= (impulse / m1) * ny
  circle2.vx += (impulse / m2) * nx
  circle2.vy += (impulse / m2) * ny

  // Separate overlapping circles, splitting inversely to mass (heavy moves less)
  const overlap = (circle1.radius + circle2.radius) - distance
  if (overlap > 0) {
    const totalMass = m1 + m2
    const move1 = overlap * (m2 / totalMass)
    const move2 = overlap * (m1 / totalMass)
    circle1.x -= move1 * nx
    circle1.y -= move1 * ny
    circle2.x += move2 * nx
    circle2.y += move2 * ny
  }
}
