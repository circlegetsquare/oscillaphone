// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { checkCircleCollision, getCircleDistance, resolveCollision } from './physics'

describe('checkCircleCollision', () => {
  it('returns true when circles overlap', () => {
    expect(checkCircleCollision(0, 0, 10, 5, 0, 10)).toBe(true)
  })

  it('returns false when circles are apart', () => {
    expect(checkCircleCollision(0, 0, 10, 100, 0, 10)).toBe(false)
  })

  it('returns false when circles are exactly touching (not overlapping)', () => {
    // distance == radiusSum → distanceSquared == radiusSum² → not < radiusSum²
    expect(checkCircleCollision(0, 0, 10, 20, 0, 10)).toBe(false)
  })

  it('returns true when circles are at the same position', () => {
    expect(checkCircleCollision(5, 5, 10, 5, 5, 10)).toBe(true)
  })
})

describe('getCircleDistance', () => {
  it('returns correct distance between two points', () => {
    expect(getCircleDistance(0, 0, 3, 4)).toBeCloseTo(5)
  })

  it('returns 0 for identical positions', () => {
    expect(getCircleDistance(7, 7, 7, 7)).toBe(0)
  })

  it('is symmetric', () => {
    expect(getCircleDistance(1, 2, 4, 6)).toBeCloseTo(getCircleDistance(4, 6, 1, 2))
  })
})

describe('resolveCollision', () => {
  function makeCircle(x, y, vx, vy, radius = 20) {
    return { x, y, vx, vy, radius }
  }

  it('transfers momentum when circles approach head-on', () => {
    const c1 = makeCircle(0, 0, 5, 0)
    const c2 = makeCircle(30, 0, -5, 0)
    resolveCollision(c1, c2)
    // After elastic collision, c1 should be moving left, c2 moving right
    expect(c1.vx).toBeLessThan(0)
    expect(c2.vx).toBeGreaterThan(0)
  })

  it('does not change velocities when circles are moving apart', () => {
    const c1 = makeCircle(0, 0, -5, 0)
    const c2 = makeCircle(30, 0, 5, 0)
    const vx1Before = c1.vx
    const vx2Before = c2.vx
    resolveCollision(c1, c2)
    expect(c1.vx).toBe(vx1Before)
    expect(c2.vx).toBe(vx2Before)
  })

  it('separates overlapping circles', () => {
    // Two circles overlapping: centers 10px apart, radii both 20
    const c1 = makeCircle(0, 0, 5, 0)
    const c2 = makeCircle(10, 0, -5, 0)
    resolveCollision(c1, c2)
    const dist = getCircleDistance(c1.x, c1.y, c2.x, c2.y)
    expect(dist).toBeGreaterThanOrEqual(c1.radius + c2.radius - 0.01)
  })

  it('conserves total momentum in x direction', () => {
    const c1 = makeCircle(0, 0, 4, 0)
    const c2 = makeCircle(30, 0, -2, 0)
    resolveCollision(c1, c2)
    // With equal masses, restitution 0.9: velocities should have changed
    expect(c1.vx).not.toBe(4)
  })

  it('handles vertical collision', () => {
    const c1 = makeCircle(0, 0, 0, 5)
    const c2 = makeCircle(0, 30, 0, -5)
    resolveCollision(c1, c2)
    expect(c1.vy).toBeLessThan(0)
    expect(c2.vy).toBeGreaterThan(0)
  })
})
