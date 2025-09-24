/**
 * Pre-allocated Effect Chains for memory optimization
 * Maintains reusable effect processors instead of creating new ones for each sound
 */

import { getAudioPool } from './audioPool'

class EffectChain {
  constructor(audioContext, type = 'default') {
    this.audioContext = audioContext
    this.type = type
    this.isActive = false

    // Pre-allocated nodes for this chain
    this.nodes = {}
    this.connections = []

    this.initChain()
  }

  /**
   * Initialize the effect chain with pre-allocated nodes
   */
  initChain() {
    const pool = getAudioPool(this.audioContext)

    try {
      // Core nodes that every chain needs
      this.nodes.input = pool.getNode('gain')
      this.nodes.output = pool.getNode('gain')
      this.nodes.pan = pool.getNode('stereoPanner')

      // Effect nodes
      this.nodes.delayInput = pool.getNode('gain')
      this.nodes.delay = pool.getNode('delay')
      this.nodes.delayFeedback = pool.getNode('gain')
      this.nodes.delayWet = pool.getNode('gain')
      this.nodes.delayDry = pool.getNode('gain')

      this.nodes.distortion = pool.getNode('waveshaper')
      this.nodes.distortionMix = pool.getNode('gain')
      this.nodes.distortionDry = pool.getNode('gain')

      this.nodes.tremoloLFO = pool.getNode('gain') // We'll create LFO manually
      this.nodes.tremoloDepth = pool.getNode('gain')
      this.nodes.tremoloMix = pool.getNode('gain')

      // Simple reverb using multiple delays
      this.nodes.reverbInput = pool.getNode('gain')
      this.nodes.reverb1 = pool.getNode('delay')
      this.nodes.reverb2 = pool.getNode('delay')
      this.nodes.reverbMix = pool.getNode('gain')
      this.nodes.reverbDry = pool.getNode('gain')

      // Connect the chain: input -> effects -> pan -> output
      this.wireChain()

    } catch (error) {
      console.warn('Failed to initialize effect chain:', error)
      this.cleanup()
    }
  }

  /**
   * Wire the effect chain connections
   */
  wireChain() {
    try {
      // Main signal path: input -> delayDry/effects -> pan -> output
      this.nodes.input.connect(this.nodes.delayDry)
      this.nodes.input.connect(this.nodes.delayInput)

      // Delay effect
      this.nodes.delayInput.connect(this.nodes.delay)
      this.nodes.delay.connect(this.nodes.delayFeedback)
      this.nodes.delayFeedback.connect(this.nodes.delay) // Feedback loop
      this.nodes.delay.connect(this.nodes.delayWet)

      // Mix delay wet/dry
      this.nodes.delayDry.connect(this.nodes.pan)
      this.nodes.delayWet.connect(this.nodes.pan)

      // Pan and output
      this.nodes.pan.connect(this.nodes.output)

      // Store connections for cleanup
      this.connections = [
        { from: this.nodes.input, to: this.nodes.delayDry },
        { from: this.nodes.input, to: this.nodes.delayInput },
        { from: this.nodes.delayInput, to: this.nodes.delay },
        { from: this.nodes.delay, to: this.nodes.delayFeedback },
        { from: this.nodes.delayFeedback, to: this.nodes.delay },
        { from: this.nodes.delay, to: this.nodes.delayWet },
        { from: this.nodes.delayDry, to: this.nodes.pan },
        { from: this.nodes.delayWet, to: this.nodes.pan },
        { from: this.nodes.pan, to: this.nodes.output }
      ]

    } catch (error) {
      console.warn('Failed to wire effect chain:', error)
    }
  }

  /**
   * Configure the chain for a specific sound
   */
  configure(settings) {
    if (!this.nodes.input) return

    try {
      const currentTime = this.audioContext.currentTime

      // Configure panning
      if (settings.pan !== undefined) {
        this.nodes.pan.pan.setValueAtTime(
          Math.max(-1, Math.min(1, settings.pan)),
          currentTime
        )
      }

      // Configure delay
      if (settings.delay) {
        const { enabled, time, feedback, mix } = settings.delay
        this.nodes.delay.delayTime.setValueAtTime(
          enabled ? time : 0,
          currentTime
        )
        this.nodes.delayFeedback.gain.setValueAtTime(
          enabled ? feedback : 0,
          currentTime
        )
        this.nodes.delayWet.gain.setValueAtTime(
          enabled ? mix : 0,
          currentTime
        )
        this.nodes.delayDry.gain.setValueAtTime(
          enabled ? (1 - mix) : 1,
          currentTime
        )
      }

      // Configure tremolo
      if (settings.tremolo) {
        const { enabled, rate, depth, mix } = settings.tremolo
        // Note: This is a simplified tremolo - full implementation would need LFO
        this.nodes.tremoloMix.gain.setValueAtTime(
          enabled ? mix : 0,
          currentTime
        )
        this.nodes.tremoloDepth.gain.setValueAtTime(
          enabled ? depth : 1,
          currentTime
        )
      }

      // Configure reverb
      if (settings.reverb) {
        const { enabled, roomSize, damping, mix } = settings.reverb
        this.nodes.reverbMix.gain.setValueAtTime(
          enabled ? mix : 0,
          currentTime
        )
        this.nodes.reverbDry.gain.setValueAtTime(
          enabled ? (1 - mix) : 1,
          currentTime
        )
      }

      // Configure distortion
      if (settings.distortion) {
        const { enabled, amount, mix } = settings.distortion
        this.nodes.distortionMix.gain.setValueAtTime(
          enabled ? mix : 0,
          currentTime
        )
        this.nodes.distortionDry.gain.setValueAtTime(
          enabled ? (1 - mix) : 1,
          currentTime
        )
      }

      // Configure basic volume envelope
      if (settings.volume !== undefined && settings.duration !== undefined) {
        this.nodes.input.gain.cancelScheduledValues(currentTime)
        this.nodes.input.gain.setValueAtTime(0, currentTime)
        this.nodes.input.gain.linearRampToValueAtTime(
          settings.volume,
          currentTime + 0.01
        )
        this.nodes.input.gain.linearRampToValueAtTime(
          0,
          currentTime + settings.duration
        )
      }

    } catch (error) {
      console.warn('Failed to configure effect chain:', error)
    }
  }

  /**
   * Connect an oscillator to this effect chain
   */
  connectOscillator(oscillator) {
    if (this.nodes.input && oscillator) {
      try {
        oscillator.connect(this.nodes.input)
        return true
      } catch (error) {
        console.warn('Failed to connect oscillator to effect chain:', error)
        return false
      }
    }
    return false
  }

  /**
   * Connect this effect chain to a destination
   */
  connectToDestination(destination) {
    if (this.nodes.output && destination) {
      try {
        this.nodes.output.connect(destination)
        return true
      } catch (error) {
        console.warn('Failed to connect effect chain to destination:', error)
        return false
      }
    }
    return false
  }

  /**
   * Mark this chain as active
   */
  activate() {
    this.isActive = true
  }

  /**
   * Mark this chain as inactive and reset it
   */
  deactivate() {
    this.isActive = false
    this.reset()
  }

  /**
   * Reset the chain to default state
   */
  reset() {
    if (!this.nodes.input) return

    try {
      const currentTime = this.audioContext.currentTime

      // Reset all parameters
      Object.values(this.nodes).forEach(node => {
        if (node && node.gain) {
          node.gain.cancelScheduledValues(currentTime)
          node.gain.setValueAtTime(1, currentTime)
        }
        if (node && node.pan) {
          node.pan.cancelScheduledValues(currentTime)
          node.pan.setValueAtTime(0, currentTime)
        }
        if (node && node.delayTime) {
          node.delayTime.cancelScheduledValues(currentTime)
          node.delayTime.setValueAtTime(0, currentTime)
        }
      })

    } catch (error) {
      console.warn('Failed to reset effect chain:', error)
    }
  }

  /**
   * Clean up the effect chain
   */
  cleanup() {
    try {
      // Disconnect all connections
      this.connections.forEach(({ from, to }) => {
        try {
          if (from && to) {
            from.disconnect(to)
          }
        } catch (e) {
          // Connection might already be broken
        }
      })

      // Return nodes to pool
      const pool = getAudioPool(this.audioContext)
      if (pool) {
        const nodeTypes = {
          input: 'gain',
          output: 'gain',
          pan: 'stereoPanner',
          delayInput: 'gain',
          delay: 'delay',
          delayFeedback: 'gain',
          delayWet: 'gain',
          delayDry: 'gain',
          distortion: 'waveshaper',
          distortionMix: 'gain',
          distortionDry: 'gain',
          tremoloLFO: 'gain',
          tremoloDepth: 'gain',
          tremoloMix: 'gain',
          reverbInput: 'gain',
          reverb1: 'delay',
          reverb2: 'delay',
          reverbMix: 'gain',
          reverbDry: 'gain'
        }

        Object.entries(this.nodes).forEach(([nodeName, node]) => {
          if (node && nodeTypes[nodeName]) {
            pool.releaseNode(node, nodeTypes[nodeName])
          }
        })
      }

      this.nodes = {}
      this.connections = []
      this.isActive = false

    } catch (error) {
      console.warn('Failed to cleanup effect chain:', error)
    }
  }
}

/**
 * Effect Chain Pool - manages multiple pre-allocated effect chains
 */
class EffectChainPool {
  constructor(audioContext, poolSize = 8) {
    this.audioContext = audioContext
    this.poolSize = poolSize
    this.availableChains = []
    this.activeChains = new Set()

    // Pre-allocate chains
    this.preAllocate()
  }

  /**
   * Pre-allocate effect chains
   */
  preAllocate() {
    for (let i = 0; i < this.poolSize; i++) {
      const chain = new EffectChain(this.audioContext, `chain-${i}`)
      this.availableChains.push(chain)
    }
  }

  /**
   * Get an available effect chain
   */
  getChain() {
    let chain = this.availableChains.pop()

    if (!chain) {
      // Create new chain if pool is empty (with warning)
      console.warn('Effect chain pool exhausted, creating new chain')
      chain = new EffectChain(this.audioContext, 'overflow')
    }

    chain.activate()
    this.activeChains.add(chain)
    return chain
  }

  /**
   * Return a chain to the pool
   */
  releaseChain(chain) {
    if (!chain || !this.activeChains.has(chain)) {
      return
    }

    chain.deactivate()
    this.activeChains.delete(chain)

    if (this.availableChains.length < this.poolSize) {
      this.availableChains.push(chain)
    } else {
      // Pool is full, cleanup the chain
      chain.cleanup()
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      available: this.availableChains.length,
      active: this.activeChains.size,
      total: this.availableChains.length + this.activeChains.size
    }
  }

  /**
   * Clean up all chains
   */
  cleanup() {
    this.activeChains.forEach(chain => chain.cleanup())
    this.availableChains.forEach(chain => chain.cleanup())
    this.activeChains.clear()
    this.availableChains = []
  }
}

// Singleton instance
let globalEffectChainPool = null

/**
 * Get the global effect chain pool
 */
export function getEffectChainPool(audioContext) {
  if (!globalEffectChainPool || globalEffectChainPool.audioContext !== audioContext) {
    globalEffectChainPool = new EffectChainPool(audioContext)
  }
  return globalEffectChainPool
}

/**
 * Clean up the global effect chain pool
 */
export function destroyEffectChainPool() {
  if (globalEffectChainPool) {
    globalEffectChainPool.cleanup()
    globalEffectChainPool = null
  }
}

/**
 * Get effect chain pool statistics
 */
export function getEffectChainStats() {
  return globalEffectChainPool ? globalEffectChainPool.getStats() : null
}