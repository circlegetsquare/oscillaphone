// @ts-nocheck
/**
 * Pre-allocated Effect Chains for memory optimization
 * Maintains reusable effect processors instead of creating new ones for each sound
 */

import { getAudioPool } from './audioPool'

/**
 * Soft-clipping distortion curve (same algorithm as sound.js createDistortionNetwork).
 * Defined here to avoid a circular import with sound.js.
 */
const createDistortionCurve = (amount = 20) => {
  const n_samples = 256
  const curve = new Float32Array(n_samples)
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1
    curve[i] = Math.max(-1, Math.min(1, (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x))))
  }
  return curve
}

/**
 * Impulse response cache — avoids regenerating the same IR on every note.
 * Key: `${roomSize.toFixed(3)}-${damping.toFixed(3)}`
 */
const irCache = new Map()

/**
 * Synthesize an exponentially-decaying stereo impulse response.
 * @param {AudioContext} audioContext
 * @param {number} roomSize - 0–1; maps to tail length 0.3s–2.5s
 * @param {number} damping  - 0–1; higher = faster decay within the tail
 * @returns {AudioBuffer}
 */
function buildImpulseResponse(audioContext, roomSize = 0.5, damping = 0.3) {
  const cacheKey = `${roomSize.toFixed(3)}-${damping.toFixed(3)}`
  if (irCache.has(cacheKey)) return irCache.get(cacheKey)

  const duration = 0.3 + roomSize * 2.2          // 0.3 – 2.5 s
  const sampleRate = audioContext.sampleRate
  const length = Math.ceil(sampleRate * duration)
  const buffer = audioContext.createBuffer(2, length, sampleRate)
  const decayRate = 3 + damping * 5              // 3 – 8: higher damping = shorter tail

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.exp(-decayRate * t / duration)
    }
  }

  irCache.set(cacheKey, buffer)
  return buffer
}

class EffectChain {
  constructor(audioContext, type = 'default') {
    this.audioContext = audioContext
    this.type = type
    this.isActive = false
    this.currentLFO = null  // fresh LFO oscillator per sound when tremolo is enabled

    this.nodes = {}
    this.connections = []

    this.initChain()
  }

  /**
   * Initialize the effect chain with pre-allocated nodes.
   *
   * Signal path (all permanently wired in wireChain):
   *   oscillator → input (volume envelope)
   *     → tremoloLFO (gain=1 bypass, or LFO-modulated when tremolo enabled)
   *     → distortionDry (+) waveshaper→distortionMix   → reverbInput (post-distortion bus)
   *     → reverbDry (+) convolver→reverbMix            → tremoloMix (post-reverb bus)
   *     → delayDry (+) delayInput→delay→delayWet       → pan → output
   */
  initChain() {
    const pool = getAudioPool(this.audioContext)

    try {
      // Core nodes
      this.nodes.input = pool.getNode('gain')
      this.nodes.output = pool.getNode('gain')
      this.nodes.pan = pool.getNode('stereoPanner')

      // Tremolo section
      // tremoloLFO: signal passes through; its .gain AudioParam is modulated by a per-sound LFO
      // tremoloDepth: scales the LFO output before it connects to tremoloLFO.gain
      this.nodes.tremoloLFO = pool.getNode('gain')
      this.nodes.tremoloDepth = pool.getNode('gain')

      // Distortion section
      this.nodes.distortion = pool.getNode('waveshaper')
      this.nodes.distortionMix = pool.getNode('gain')   // wet path
      this.nodes.distortionDry = pool.getNode('gain')   // dry path

      // Reverb section (ConvolverNode — synthesized impulse response)
      // reverbInput serves as the post-distortion summing bus
      this.nodes.reverbInput = pool.getNode('gain')
      // ConvolverNode created directly — needs a buffer, can't come from the pool
      this.nodes.convolver = this.audioContext.createConvolver()
      this.nodes.reverbMix = pool.getNode('gain')       // wet path
      this.nodes.reverbDry = pool.getNode('gain')       // dry path

      // tremoloMix repurposed as post-reverb summing bus (always gain=1)
      this.nodes.tremoloMix = pool.getNode('gain')

      // Delay section
      this.nodes.delayInput = pool.getNode('gain')
      this.nodes.delay = pool.getNode('delay')
      this.nodes.delayFeedback = pool.getNode('gain')
      this.nodes.delayWet = pool.getNode('gain')
      this.nodes.delayDry = pool.getNode('gain')

      this.wireChain()

    } catch (error) {
      console.warn('Failed to initialize effect chain:', error)
      this.cleanup()
    }
  }

  /**
   * Wire all nodes into a permanent signal graph.
   * Effects are enabled/disabled via gain values in configure(), not by
   * connecting/disconnecting nodes.
   */
  wireChain() {
    try {
      const n = this.nodes

      // — Tremolo section —
      n.input.connect(n.tremoloLFO)

      // — Distortion section —
      // dry path (bypasses waveshaper)
      n.tremoloLFO.connect(n.distortionDry)
      // wet path: through waveshaper
      n.tremoloLFO.connect(n.distortion)
      n.distortion.connect(n.distortionMix)
      // both paths sum at reverbInput (post-distortion bus)
      n.distortionDry.connect(n.reverbInput)
      n.distortionMix.connect(n.reverbInput)

      // — Reverb section —
      // dry path
      n.reverbInput.connect(n.reverbDry)
      // wet path: convolution reverb (buffer set per-note in configure())
      n.reverbInput.connect(n.convolver)
      n.convolver.connect(n.reverbMix)
      // both paths sum at tremoloMix (post-reverb bus)
      n.reverbDry.connect(n.tremoloMix)
      n.reverbMix.connect(n.tremoloMix)

      // — Delay section —
      // dry path
      n.tremoloMix.connect(n.delayDry)
      // wet path
      n.tremoloMix.connect(n.delayInput)
      n.delayInput.connect(n.delay)
      n.delay.connect(n.delayFeedback)
      n.delayFeedback.connect(n.delay)        // feedback loop
      n.delay.connect(n.delayWet)
      // both paths sum at pan
      n.delayDry.connect(n.pan)
      n.delayWet.connect(n.pan)

      // — Output —
      n.pan.connect(n.output)

      this.connections = [
        { from: n.input, to: n.tremoloLFO },
        { from: n.tremoloLFO, to: n.distortionDry },
        { from: n.tremoloLFO, to: n.distortion },
        { from: n.distortion, to: n.distortionMix },
        { from: n.distortionDry, to: n.reverbInput },
        { from: n.distortionMix, to: n.reverbInput },
        { from: n.reverbInput, to: n.reverbDry },
        { from: n.reverbInput, to: n.convolver },
        { from: n.convolver, to: n.reverbMix },
        { from: n.reverbDry, to: n.tremoloMix },
        { from: n.reverbMix, to: n.tremoloMix },
        { from: n.tremoloMix, to: n.delayDry },
        { from: n.tremoloMix, to: n.delayInput },
        { from: n.delayInput, to: n.delay },
        { from: n.delay, to: n.delayFeedback },
        { from: n.delayFeedback, to: n.delay },
        { from: n.delay, to: n.delayWet },
        { from: n.delayDry, to: n.pan },
        { from: n.delayWet, to: n.pan },
        { from: n.pan, to: n.output }
      ]

    } catch (error) {
      console.warn('Failed to wire effect chain:', error)
    }
  }

  /**
   * Configure the chain for a specific sound before playback begins.
   */
  configure(settings) {
    if (!this.nodes.input) return

    try {
      const t = this.audioContext.currentTime
      const n = this.nodes

      // — Volume envelope —
      if (settings.volume !== undefined && settings.duration !== undefined) {
        n.input.gain.cancelScheduledValues(t)
        n.input.gain.setValueAtTime(0, t)
        n.input.gain.linearRampToValueAtTime(settings.volume, t + 0.01)
        n.input.gain.linearRampToValueAtTime(0, t + settings.duration)
      }

      // — Pan —
      if (settings.pan !== undefined) {
        n.pan.pan.setValueAtTime(Math.max(-1, Math.min(1, settings.pan)), t)
      }

      // — Tremolo —
      // Clean up any previous LFO from a prior sound
      if (this.currentLFO) {
        try { this.currentLFO.stop() } catch { /* already stopped */ }
        try { this.currentLFO.disconnect() } catch { /* already disconnected */ }
        try { n.tremoloDepth.disconnect() } catch { /* already disconnected */ }
        this.currentLFO = null
      }

      if (settings.tremolo?.enabled) {
        const { rate, depth, shape = 'sine', duration = 0 } = settings.tremolo
        const lfo = this.audioContext.createOscillator()
        lfo.type = shape
        lfo.frequency.setValueAtTime(rate, t)
        // Scale LFO so it oscillates tremoloLFO.gain around 1 by ±(depth * 0.5)
        n.tremoloDepth.gain.setValueAtTime(depth * 0.5, t)
        n.tremoloLFO.gain.cancelScheduledValues(t)
        n.tremoloLFO.gain.setValueAtTime(1, t)
        lfo.connect(n.tremoloDepth)
        n.tremoloDepth.connect(n.tremoloLFO.gain)
        lfo.start(t)
        // Schedule LFO stop slightly after the note ends
        if (duration > 0) {
          lfo.stop(t + duration + 0.1)
        }
        this.currentLFO = lfo
      } else {
        n.tremoloLFO.gain.cancelScheduledValues(t)
        n.tremoloLFO.gain.setValueAtTime(1, t)  // passthrough
      }

      // — Distortion —
      if (settings.distortion) {
        const { enabled, amount, oversample = 'none', mix } = settings.distortion
        if (enabled) {
          n.distortion.curve = createDistortionCurve(amount * 20)
          n.distortion.oversample = oversample
          n.distortionDry.gain.setValueAtTime(1 - mix, t)
          n.distortionMix.gain.setValueAtTime(mix, t)
        } else {
          n.distortionDry.gain.setValueAtTime(1, t)
          n.distortionMix.gain.setValueAtTime(0, t)
        }
      }

      // — Reverb (ConvolverNode) —
      if (settings.reverb) {
        const { enabled, roomSize, damping, mix } = settings.reverb
        if (enabled) {
          n.convolver.buffer = buildImpulseResponse(this.audioContext, roomSize, damping)
          n.reverbDry.gain.setValueAtTime(1 - mix, t)
          n.reverbMix.gain.setValueAtTime(mix, t)
        } else {
          n.reverbDry.gain.setValueAtTime(1, t)
          n.reverbMix.gain.setValueAtTime(0, t)
        }
      }

      // — Delay —
      if (settings.delay) {
        const { enabled, time, feedback, mix } = settings.delay
        n.delay.delayTime.setValueAtTime(enabled ? time : 0, t)
        n.delayFeedback.gain.setValueAtTime(enabled ? feedback : 0, t)
        n.delayWet.gain.setValueAtTime(enabled ? mix : 0, t)
        n.delayDry.gain.setValueAtTime(enabled ? (1 - mix) : 1, t)
      }

      // tremoloMix is the post-reverb bus; keep at unity
      n.tremoloMix.gain.setValueAtTime(1, t)

    } catch (error) {
      console.warn('Failed to configure effect chain:', error)
    }
  }

  /**
   * Connect an oscillator to this effect chain's input.
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
   * Connect this effect chain's output to a destination node.
   * Called once per sound; the output is disconnected on deactivate().
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

  activate() {
    this.isActive = true
  }

  deactivate() {
    this.isActive = false

    // Stop and disconnect the per-sound LFO
    if (this.currentLFO) {
      try { this.currentLFO.stop() } catch { /* already stopped */ }
      try { this.currentLFO.disconnect() } catch { /* already disconnected */ }
      try { this.nodes.tremoloDepth.disconnect() } catch { /* already disconnected */ }
      this.currentLFO = null
    }

    // Disconnect output from destination so the next use gets a clean connection
    if (this.nodes.output) {
      try { this.nodes.output.disconnect() } catch { /* already disconnected */ }
    }

    this.reset()
  }

  /**
   * Reset all node parameters to bypass state (all effects off, input silent).
   */
  reset() {
    if (!this.nodes.input) return

    try {
      const t = this.audioContext.currentTime
      const n = this.nodes

      n.input.gain.cancelScheduledValues(t)
      n.input.gain.setValueAtTime(0, t)

      n.tremoloLFO.gain.cancelScheduledValues(t)
      n.tremoloLFO.gain.setValueAtTime(1, t)       // passthrough

      n.distortionDry.gain.setValueAtTime(1, t)    // full dry (bypass)
      n.distortionMix.gain.setValueAtTime(0, t)    // no wet

      n.reverbDry.gain.setValueAtTime(1, t)        // full dry (bypass)
      n.reverbMix.gain.setValueAtTime(0, t)        // no wet

      n.tremoloMix.gain.setValueAtTime(1, t)       // bus, always unity

      n.delayDry.gain.setValueAtTime(1, t)         // full dry (bypass)
      n.delayWet.gain.setValueAtTime(0, t)         // no wet
      n.delay.delayTime.setValueAtTime(0, t)
      n.delayFeedback.gain.setValueAtTime(0, t)

      n.pan.pan.cancelScheduledValues(t)
      n.pan.pan.setValueAtTime(0, t)

      n.output.gain.setValueAtTime(1, t)

    } catch (error) {
      console.warn('Failed to reset effect chain:', error)
    }
  }

  /**
   * Permanently destroy this chain and return all pooled nodes.
   */
  cleanup() {
    try {
      this.connections.forEach(({ from, to }) => {
        try { if (from && to) from.disconnect(to) } catch { /* already broken */ }
      })

      const pool = getAudioPool(this.audioContext)
      if (pool) {
        const nodeTypes = {
          input: 'gain',
          output: 'gain',
          pan: 'stereoPanner',
          tremoloLFO: 'gain',
          tremoloDepth: 'gain',
          distortion: 'waveshaper',
          distortionMix: 'gain',
          distortionDry: 'gain',
          reverbInput: 'gain',
          reverbMix: 'gain',
          reverbDry: 'gain',
          tremoloMix: 'gain',
          delayInput: 'gain',
          delay: 'delay',
          delayFeedback: 'gain',
          delayWet: 'gain',
          delayDry: 'gain'
        }
        Object.entries(this.nodes).forEach(([nodeName, node]) => {
          if (node && nodeTypes[nodeName]) {
            pool.releaseNode(node, nodeTypes[nodeName])
          }
        })
      }

      // ConvolverNode was created directly, not from the pool — disconnect manually
      if (this.nodes.convolver) {
        try { this.nodes.convolver.disconnect() } catch { /* already disconnected */ }
        this.nodes.convolver = null
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