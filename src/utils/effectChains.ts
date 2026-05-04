import { getAudioPool } from './audioPool'
import type { SoundSettings } from '../types/audio'

/** Soft-clipping distortion curve (avoids circular import with sound.ts). */
const createDistortionCurve = (amount = 20): Float32Array => {
  const n_samples = 256
  const curve = new Float32Array(n_samples)
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1
    curve[i] = Math.max(-1, Math.min(1, (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x))))
  }
  return curve
}

/** Key: `${roomSize.toFixed(3)}-${damping.toFixed(3)}` */
const irCache = new Map<string, AudioBuffer>()

function buildImpulseResponse(audioContext: AudioContext, roomSize = 0.5, damping = 0.3): AudioBuffer {
  const cacheKey = `${roomSize.toFixed(3)}-${damping.toFixed(3)}`
  const cached = irCache.get(cacheKey)
  if (cached) return cached

  const duration = 0.3 + roomSize * 2.2
  const sampleRate = audioContext.sampleRate
  const length = Math.ceil(sampleRate * duration)
  const buffer = audioContext.createBuffer(2, length, sampleRate)
  const decayRate = 3 + damping * 5

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

interface ChainNodes {
  input: GainNode
  output: GainNode
  pan: StereoPannerNode
  tremoloLFO: GainNode
  tremoloDepth: GainNode
  distortion: WaveShaperNode
  distortionMix: GainNode
  distortionDry: GainNode
  reverbInput: GainNode
  convolver: ConvolverNode
  reverbMix: GainNode
  reverbDry: GainNode
  tremoloMix: GainNode
  delayInput: GainNode
  delay: DelayNode
  delayFeedback: GainNode
  delayWet: GainNode
  delayDry: GainNode
}

interface ConnectionPair {
  from: AudioNode
  to: AudioNode
}

type ConfigureSettings = Partial<SoundSettings> & { pan?: number; duration?: number }

class EffectChain {
  audioContext: AudioContext
  type: string
  isActive: boolean
  currentLFO: OscillatorNode | null
  nodes: Partial<ChainNodes>
  connections: ConnectionPair[]

  constructor(audioContext: AudioContext, type = 'default') {
    this.audioContext = audioContext
    this.type = type
    this.isActive = false
    this.currentLFO = null
    this.nodes = {}
    this.connections = []
    this.initChain()
  }

  /**
   * Signal path (all permanently wired in wireChain):
   *   oscillator → input (volume envelope)
   *     → tremoloLFO → distortionDry (+) distortion→distortionMix → reverbInput
   *     → reverbDry (+) convolver→reverbMix → tremoloMix
   *     → delayDry (+) delayInput→delay→delayFeedback→delay→delayWet → pan → output
   */
  private initChain(): void {
    const pool = getAudioPool(this.audioContext)
    try {
      const n = this.nodes as ChainNodes
      n.input        = pool.getNode('gain') as GainNode
      n.output       = pool.getNode('gain') as GainNode
      n.pan          = pool.getNode('stereoPanner') as StereoPannerNode
      n.tremoloLFO   = pool.getNode('gain') as GainNode
      n.tremoloDepth = pool.getNode('gain') as GainNode
      n.distortion   = pool.getNode('waveshaper') as WaveShaperNode
      n.distortionMix = pool.getNode('gain') as GainNode
      n.distortionDry = pool.getNode('gain') as GainNode
      n.reverbInput  = pool.getNode('gain') as GainNode
      n.convolver    = this.audioContext.createConvolver()
      n.reverbMix    = pool.getNode('gain') as GainNode
      n.reverbDry    = pool.getNode('gain') as GainNode
      n.tremoloMix   = pool.getNode('gain') as GainNode
      n.delayInput   = pool.getNode('gain') as GainNode
      n.delay        = pool.getNode('delay') as DelayNode
      n.delayFeedback = pool.getNode('gain') as GainNode
      n.delayWet     = pool.getNode('gain') as GainNode
      n.delayDry     = pool.getNode('gain') as GainNode
      this.wireChain()
    } catch (error) {
      console.warn('Failed to initialize effect chain:', error)
      this.cleanup()
    }
  }

  private wireChain(): void {
    try {
      const n = this.nodes as ChainNodes
      n.input.connect(n.tremoloLFO)
      n.tremoloLFO.connect(n.distortionDry)
      n.tremoloLFO.connect(n.distortion)
      n.distortion.connect(n.distortionMix)
      n.distortionDry.connect(n.reverbInput)
      n.distortionMix.connect(n.reverbInput)
      n.reverbInput.connect(n.reverbDry)
      n.reverbInput.connect(n.convolver)
      n.convolver.connect(n.reverbMix)
      n.reverbDry.connect(n.tremoloMix)
      n.reverbMix.connect(n.tremoloMix)
      n.tremoloMix.connect(n.delayDry)
      n.tremoloMix.connect(n.delayInput)
      n.delayInput.connect(n.delay)
      n.delay.connect(n.delayFeedback)
      n.delayFeedback.connect(n.delay)
      n.delay.connect(n.delayWet)
      n.delayDry.connect(n.pan)
      n.delayWet.connect(n.pan)
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
        { from: n.pan, to: n.output },
      ]
    } catch (error) {
      console.warn('Failed to wire effect chain:', error)
    }
  }

  configure(settings: ConfigureSettings): void {
    if (!this.nodes.input) return
    try {
      const t = this.audioContext.currentTime
      const n = this.nodes as ChainNodes

      if (settings.volume !== undefined && settings.duration !== undefined) {
        n.input.gain.cancelScheduledValues(t)
        n.input.gain.setValueAtTime(0, t)
        n.input.gain.linearRampToValueAtTime(settings.volume, t + 0.01)
        n.input.gain.linearRampToValueAtTime(0, t + settings.duration)
      }

      if (settings.pan !== undefined) {
        n.pan.pan.setValueAtTime(Math.max(-1, Math.min(1, settings.pan)), t)
      }

      // Tremolo — stop previous LFO
      if (this.currentLFO) {
        try { this.currentLFO.stop() } catch { /* already stopped */ }
        try { this.currentLFO.disconnect() } catch { /* already disconnected */ }
        try { n.tremoloDepth.disconnect() } catch { /* already disconnected */ }
        this.currentLFO = null
      }

      if (settings.tremolo?.enabled) {
        const { rate, depth, shape = 'sine' } = settings.tremolo
        const duration = settings.duration ?? 0
        const lfo = this.audioContext.createOscillator()
        lfo.type = shape ?? 'sine'
        lfo.frequency.setValueAtTime(rate, t)
        n.tremoloDepth.gain.setValueAtTime(depth * 0.5, t)
        n.tremoloLFO.gain.cancelScheduledValues(t)
        n.tremoloLFO.gain.setValueAtTime(1, t)
        lfo.connect(n.tremoloDepth)
        n.tremoloDepth.connect(n.tremoloLFO.gain)
        lfo.start(t)
        if (duration > 0) lfo.stop(t + duration + 0.1)
        this.currentLFO = lfo
      } else {
        n.tremoloLFO.gain.cancelScheduledValues(t)
        n.tremoloLFO.gain.setValueAtTime(1, t)
      }

      if (settings.distortion) {
        const { enabled, amount, oversample = 'none', mix } = settings.distortion
        if (enabled) {
          n.distortion.curve = createDistortionCurve(amount * 20) as unknown as Float32Array<ArrayBuffer>
          n.distortion.oversample = oversample
          n.distortionDry.gain.setValueAtTime(1 - mix, t)
          n.distortionMix.gain.setValueAtTime(mix, t)
        } else {
          n.distortionDry.gain.setValueAtTime(1, t)
          n.distortionMix.gain.setValueAtTime(0, t)
        }
      }

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

      if (settings.delay) {
        const { enabled, time, feedback, mix } = settings.delay
        n.delay.delayTime.setValueAtTime(enabled ? time : 0, t)
        n.delayFeedback.gain.setValueAtTime(enabled ? feedback : 0, t)
        n.delayWet.gain.setValueAtTime(enabled ? mix : 0, t)
        n.delayDry.gain.setValueAtTime(enabled ? (1 - mix) : 1, t)
      }

      n.tremoloMix.gain.setValueAtTime(1, t)
    } catch (error) {
      console.warn('Failed to configure effect chain:', error)
    }
  }

  connectOscillator(oscillator: OscillatorNode): boolean {
    if (this.nodes.input && oscillator) {
      try { oscillator.connect(this.nodes.input); return true } catch (error) {
        console.warn('Failed to connect oscillator to effect chain:', error); return false
      }
    }
    return false
  }

  connectToDestination(destination: AudioNode): boolean {
    if (this.nodes.output && destination) {
      try { this.nodes.output.connect(destination); return true } catch (error) {
        console.warn('Failed to connect effect chain to destination:', error); return false
      }
    }
    return false
  }

  activate(): void { this.isActive = true }

  deactivate(): void {
    this.isActive = false
    if (this.currentLFO) {
      try { this.currentLFO.stop() } catch { /* already stopped */ }
      try { this.currentLFO.disconnect() } catch { /* already disconnected */ }
      try { (this.nodes as ChainNodes).tremoloDepth.disconnect() } catch { /* already disconnected */ }
      this.currentLFO = null
    }
    if (this.nodes.output) {
      try { this.nodes.output.disconnect() } catch { /* already disconnected */ }
    }
    this.reset()
  }

  private reset(): void {
    if (!this.nodes.input) return
    try {
      const t = this.audioContext.currentTime
      const n = this.nodes as ChainNodes
      n.input.gain.cancelScheduledValues(t)
      n.input.gain.setValueAtTime(0, t)
      n.tremoloLFO.gain.cancelScheduledValues(t)
      n.tremoloLFO.gain.setValueAtTime(1, t)
      n.distortionDry.gain.setValueAtTime(1, t)
      n.distortionMix.gain.setValueAtTime(0, t)
      n.reverbDry.gain.setValueAtTime(1, t)
      n.reverbMix.gain.setValueAtTime(0, t)
      n.tremoloMix.gain.setValueAtTime(1, t)
      n.delayDry.gain.setValueAtTime(1, t)
      n.delayWet.gain.setValueAtTime(0, t)
      n.delay.delayTime.setValueAtTime(0, t)
      n.delayFeedback.gain.setValueAtTime(0, t)
      n.pan.pan.cancelScheduledValues(t)
      n.pan.pan.setValueAtTime(0, t)
      n.output.gain.setValueAtTime(1, t)
    } catch (error) {
      console.warn('Failed to reset effect chain:', error)
    }
  }

  cleanup(): void {
    try {
      this.connections.forEach(({ from, to }) => {
        try { if (from && to) from.disconnect(to) } catch { /* already broken */ }
      })
      const pool = getAudioPool(this.audioContext)
      if (pool) {
        const nodeTypes: Partial<Record<keyof ChainNodes, string>> = {
          input: 'gain', output: 'gain', pan: 'stereoPanner',
          tremoloLFO: 'gain', tremoloDepth: 'gain',
          distortion: 'waveshaper', distortionMix: 'gain', distortionDry: 'gain',
          reverbInput: 'gain', reverbMix: 'gain', reverbDry: 'gain', tremoloMix: 'gain',
          delayInput: 'gain', delay: 'delay', delayFeedback: 'gain',
          delayWet: 'gain', delayDry: 'gain',
        }
        for (const [name, type] of Object.entries(nodeTypes) as [keyof ChainNodes, string][]) {
          const node = this.nodes[name]
          if (node) pool.releaseNode(node as unknown as import('./audioPool').AnyAudioNode, type as never)
        }
      }
      if (this.nodes.convolver) {
        try { this.nodes.convolver.disconnect() } catch { /* already disconnected */ }
        this.nodes.convolver = undefined
      }
      this.nodes = {}
      this.connections = []
      this.isActive = false
    } catch (error) {
      console.warn('Failed to cleanup effect chain:', error)
    }
  }
}

interface EffectChainPoolStats {
  available: number
  active: number
  total: number
}

class EffectChainPool {
  audioContext: AudioContext
  private poolSize: number
  private availableChains: EffectChain[]
  private activeChains: Set<EffectChain>

  constructor(audioContext: AudioContext, poolSize = 32) {
    this.audioContext = audioContext
    this.poolSize = poolSize
    this.availableChains = []
    this.activeChains = new Set()
    this.preAllocate()
  }

  private preAllocate(): void {
    for (let i = 0; i < this.poolSize; i++) {
      this.availableChains.push(new EffectChain(this.audioContext, `chain-${i}`))
    }
  }

  getChain(): EffectChain | null {
    const chain = this.availableChains.pop()
    if (!chain) {
      // Pool exhausted — return null so callers drop the note rather than
      // creating unbounded overflow chains that accumulate and crash the tab.
      return null
    }
    chain.activate()
    this.activeChains.add(chain)
    return chain
  }

  releaseChain(chain: EffectChain): void {
    if (!chain || !this.activeChains.has(chain)) return
    chain.deactivate()
    this.activeChains.delete(chain)
    if (this.availableChains.length < this.poolSize) {
      this.availableChains.push(chain)
    } else {
      chain.cleanup()
    }
  }

  getStats(): EffectChainPoolStats {
    return {
      available: this.availableChains.length,
      active: this.activeChains.size,
      total: this.availableChains.length + this.activeChains.size,
    }
  }

  cleanup(): void {
    this.activeChains.forEach(chain => chain.cleanup())
    this.availableChains.forEach(chain => chain.cleanup())
    this.activeChains.clear()
    this.availableChains = []
  }
}

let globalEffectChainPool: EffectChainPool | null = null

export function getEffectChainPool(audioContext: AudioContext): EffectChainPool {
  if (!globalEffectChainPool || globalEffectChainPool.audioContext !== audioContext) {
    globalEffectChainPool = new EffectChainPool(audioContext)
  }
  return globalEffectChainPool
}

export function destroyEffectChainPool(): void {
  if (globalEffectChainPool) {
    globalEffectChainPool.cleanup()
    globalEffectChainPool = null
  }
}

export function getEffectChainStats(): EffectChainPoolStats | null {
  return globalEffectChainPool ? globalEffectChainPool.getStats() : null
}
