/**
 * Audio Node Pool for memory optimization
 * Reuses audio nodes instead of creating/destroying them constantly
 */

class AudioNodePool {
  constructor(audioContext, maxSize = 50) {
    this.audioContext = audioContext
    this.maxSize = maxSize

    // Pools for different node types
    this.pools = {
      oscillator: [],
      gain: [],
      stereoPanner: [],
      delay: [],
      waveshaper: [],
      convolver: [],
      biquadFilter: []
    }

    // Track active (in-use) nodes
    this.activeNodes = new Set()

    // Pre-populate pools
    this.preAllocate()
  }

  /**
   * Pre-allocate nodes to avoid creation during audio generation
   */
  preAllocate() {
    const nodeCounts = {
      oscillator: 20,    // Most commonly used
      gain: 30,          // Used frequently for volume/mixing
      stereoPanner: 20,  // One per sound
      delay: 10,         // Less common
      waveshaper: 6,     // For distortion
      convolver: 4,      // For reverb (fewer needed)
      biquadFilter: 8    // For filtering
    }

    Object.entries(nodeCounts).forEach(([nodeType, count]) => {
      for (let i = 0; i < count; i++) {
        const node = this.createFreshNode(nodeType)
        if (node) {
          this.pools[nodeType].push(node)
        }
      }
    })
  }

  /**
   * Create a fresh audio node
   */
  createFreshNode(nodeType) {
    try {
      switch (nodeType) {
        case 'oscillator':
          return this.audioContext.createOscillator()
        case 'gain':
          return this.audioContext.createGain()
        case 'stereoPanner':
          return this.audioContext.createStereoPanner()
        case 'delay':
          return this.audioContext.createDelay()
        case 'waveshaper':
          return this.audioContext.createWaveShaper()
        case 'convolver':
          return this.audioContext.createConvolver()
        case 'biquadFilter':
          return this.audioContext.createBiquadFilter()
        default:
          console.warn(`Unknown node type: ${nodeType}`)
          return null
      }
    } catch (error) {
      console.warn(`Failed to create ${nodeType}:`, error)
      return null
    }
  }

  /**
   * Get a node from the pool (reuse if available, create if needed)
   */
  getNode(nodeType) {
    const pool = this.pools[nodeType]

    if (!pool) {
      console.warn(`No pool for node type: ${nodeType}`)
      return this.createFreshNode(nodeType)
    }

    // Try to reuse from pool
    let node = pool.pop()

    // Create new node if pool is empty
    if (!node) {
      node = this.createFreshNode(nodeType)
    }

    if (node) {
      // Reset node to default state
      this.resetNode(node, nodeType)

      // Track as active
      this.activeNodes.add(node)
    }

    return node
  }

  /**
   * Reset node to default state for reuse
   */
  resetNode(node, nodeType) {
    try {
      switch (nodeType) {
        case 'oscillator':
          // Oscillators can't be reset - they're single use
          // We'll handle this specially in the sound generation
          break
        case 'gain':
          node.gain.cancelScheduledValues(0)
          node.gain.setValueAtTime(1, this.audioContext.currentTime)
          break
        case 'stereoPanner':
          node.pan.cancelScheduledValues(0)
          node.pan.setValueAtTime(0, this.audioContext.currentTime)
          break
        case 'delay':
          node.delayTime.cancelScheduledValues(0)
          node.delayTime.setValueAtTime(0, this.audioContext.currentTime)
          break
        case 'waveshaper':
          node.curve = null
          node.oversample = 'none'
          break
        case 'biquadFilter':
          node.frequency.cancelScheduledValues(0)
          node.Q.cancelScheduledValues(0)
          node.gain.cancelScheduledValues(0)
          node.type = 'lowpass'
          node.frequency.setValueAtTime(350, this.audioContext.currentTime)
          node.Q.setValueAtTime(1, this.audioContext.currentTime)
          node.gain.setValueAtTime(0, this.audioContext.currentTime)
          break
      }

      // Disconnect all connections
      try {
        node.disconnect()
      } catch (e) {
        // Node might already be disconnected
      }
    } catch (error) {
      console.warn(`Failed to reset ${nodeType} node:`, error)
    }
  }

  /**
   * Return a node to the pool when finished
   */
  releaseNode(node, nodeType) {
    if (!node || !this.activeNodes.has(node)) {
      return
    }

    // Remove from active tracking
    this.activeNodes.delete(node)

    // Oscillators are single-use, can't be reused
    if (nodeType === 'oscillator') {
      try {
        node.stop()
        node.disconnect()
      } catch (e) {
        // Already stopped/disconnected
      }
      return
    }

    const pool = this.pools[nodeType]
    if (pool && pool.length < this.maxSize) {
      // Reset and return to pool
      this.resetNode(node, nodeType)
      pool.push(node)
    } else {
      // Pool is full or doesn't exist, disconnect and abandon
      try {
        node.disconnect()
      } catch (e) {
        // Already disconnected
      }
    }
  }

  /**
   * Release all nodes associated with a sound
   */
  releaseNodes(nodesList) {
    nodesList.forEach(({ node, type }) => {
      this.releaseNode(node, type)
    })
  }

  /**
   * Get pool statistics for debugging
   */
  getStats() {
    const stats = {}
    Object.entries(this.pools).forEach(([type, pool]) => {
      stats[type] = {
        pooled: pool.length,
        active: Array.from(this.activeNodes).filter(node => {
          // This is a rough check - in practice you'd want better type tracking
          try {
            return node.constructor.name.toLowerCase().includes(type.toLowerCase())
          } catch (e) {
            return false
          }
        }).length
      }
    })
    stats.totalActive = this.activeNodes.size
    return stats
  }

  /**
   * Clean up abandoned nodes periodically
   */
  cleanup() {
    // Remove nodes that might have been abandoned
    this.activeNodes.forEach(node => {
      try {
        // If the node is disconnected and not scheduled, it's likely abandoned
        if (node.context.state === 'closed') {
          this.activeNodes.delete(node)
        }
      } catch (e) {
        this.activeNodes.delete(node)
      }
    })
  }

  /**
   * Destroy the pool and clean up all resources
   */
  destroy() {
    // Clean up all active nodes
    this.activeNodes.forEach(node => {
      try {
        if (node.stop && typeof node.stop === 'function') {
          node.stop()
        }
        node.disconnect()
      } catch (e) {
        // Ignore errors during cleanup
      }
    })

    // Clean up pooled nodes
    Object.values(this.pools).forEach(pool => {
      pool.forEach(node => {
        try {
          node.disconnect()
        } catch (e) {
          // Ignore errors during cleanup
        }
      })
      pool.length = 0
    })

    this.activeNodes.clear()
  }
}

// Singleton instance
let globalAudioPool = null

/**
 * Get the global audio pool instance
 */
export function getAudioPool(audioContext) {
  if (!globalAudioPool || globalAudioPool.audioContext !== audioContext) {
    globalAudioPool = new AudioNodePool(audioContext)
  }
  return globalAudioPool
}

/**
 * Clean up the global audio pool
 */
export function destroyAudioPool() {
  if (globalAudioPool) {
    globalAudioPool.destroy()
    globalAudioPool = null
  }
}

/**
 * Get audio pool statistics
 */
export function getAudioPoolStats() {
  return globalAudioPool ? globalAudioPool.getStats() : null
}