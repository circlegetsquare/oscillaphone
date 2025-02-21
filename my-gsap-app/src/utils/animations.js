// Common animation configurations
export const fadeIn = {
  opacity: 0,
  duration: 1,
  ease: 'power2.out'
}

export const slideUp = {
  y: 100,
  opacity: 0,
  duration: 1,
  ease: 'power4.out'
}

export const slideIn = (direction = 'left') => ({
  x: direction === 'left' ? -100 : direction === 'right' ? 100 : 0,
  y: direction === 'up' ? 100 : direction === 'down' ? -100 : 0,
  opacity: 0,
  duration: 1,
  ease: 'power3.out'
})

export const scaleIn = {
  scale: 0.5,
  opacity: 0,
  duration: 0.8,
  ease: 'back.out(1.7)'
}

// ScrollTrigger defaults
export const scrollTriggerDefaults = {
  start: 'top bottom-=100',
  end: 'top center',
  toggleActions: 'play none none reverse'
}

// Stagger configurations
export const staggerChildren = {
  default: 0.1,
  fast: 0.05,
  slow: 0.2
}

// Hover animations
export const hoverScale = {
  scale: 1.1,
  duration: 0.3,
  ease: 'power2.out'
}

// Page transition
export const pageTransition = {
  from: {
    opacity: 0,
    y: 20,
    duration: 0.6,
    ease: 'power2.out'
  },
  to: {
    opacity: 0,
    y: -20,
    duration: 0.6,
    ease: 'power2.in'
  }
}
