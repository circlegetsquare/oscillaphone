// Check if two circles are colliding (optimized version using squared distance)
export const checkCircleCollision = (x1, y1, r1, x2, y2, r2) => {
  const dx = x2 - x1
  const dy = y2 - y1
  const distanceSquared = dx * dx + dy * dy
  const radiusSum = r1 + r2
  return distanceSquared < (radiusSum * radiusSum)
}

// Get actual distance between circles (only when needed for collision resolution)
export const getCircleDistance = (x1, y1, x2, y2) => {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

// Calculate new velocities after elastic collision
export const resolveCollision = (circle1, circle2) => {
  const dx = circle2.x - circle1.x
  const dy = circle2.y - circle1.y
  const distance = getCircleDistance(circle1.x, circle1.y, circle2.x, circle2.y)

  // Normal vector
  const nx = dx / distance
  const ny = dy / distance

  // Relative velocity
  const dvx = circle2.vx - circle1.vx
  const dvy = circle2.vy - circle1.vy

  // Relative velocity in normal direction
  const vnDot = dvx * nx + dvy * ny

  // Don't collide if circles are moving apart
  if (vnDot > 0) return

  // Elastic collision impulse
  const impulse = -(1 + 0.9) * vnDot / 2 // 0.9 is restitution coefficient

  // Apply impulse
  circle1.vx -= impulse * nx
  circle1.vy -= impulse * ny
  circle2.vx += impulse * nx
  circle2.vy += impulse * ny

  // Prevent circles from sticking together by moving them apart
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
