export type PoolableNodeType = 'gain' | 'stereoPanner' | 'delay' | 'waveshaper' | 'convolver' | 'biquadFilter'
export type AnyNodeType = PoolableNodeType | 'oscillator'
export type PoolableNode = GainNode | StereoPannerNode | DelayNode | WaveShaperNode | ConvolverNode | BiquadFilterNode
export type AnyAudioNode = PoolableNode | OscillatorNode

interface NodeEntry {
  node: AnyAudioNode
  type: AnyNodeType
}

interface PoolTypeStats {
  pooled: number
  active: number
}
interface PoolStats extends Record<string, PoolTypeStats | number> {
  totalActive: number
}

class AudioNodePool {
  audioContext: AudioContext
  private maxSize: number
  private pools: Record<PoolableNodeType, PoolableNode[]>
  activeNodes: Set<AnyAudioNode>

  constructor(audioContext: AudioContext, maxSize = 50) {
    this.audioContext = audioContext
    this.maxSize = maxSize
    this.pools = {
      gain: [],
      stereoPanner: [],
      delay: [],
      waveshaper: [],
      convolver: [],
      biquadFilter: [],
    }
    this.activeNodes = new Set()
    this.preAllocate()
  }

  private preAllocate(): void {
    const nodeCounts: Record<PoolableNodeType, number> = {
      gain: 30,
      stereoPanner: 20,
      delay: 10,
      waveshaper: 6,
      convolver: 4,
      biquadFilter: 8,
    }
    for (const [nodeType, count] of Object.entries(nodeCounts) as [PoolableNodeType, number][]) {
      for (let i = 0; i < count; i++) {
        const node = this.createFreshNode(nodeType)
        if (node) this.pools[nodeType].push(node as PoolableNode)
      }
    }
  }

  private createFreshNode(nodeType: AnyNodeType): AnyAudioNode | null {
    try {
      switch (nodeType) {
        case 'oscillator': return this.audioContext.createOscillator()
        case 'gain':       return this.audioContext.createGain()
        case 'stereoPanner': return this.audioContext.createStereoPanner()
        case 'delay':      return this.audioContext.createDelay()
        case 'waveshaper': return this.audioContext.createWaveShaper()
        case 'convolver':  return this.audioContext.createConvolver()
        case 'biquadFilter': return this.audioContext.createBiquadFilter()
      }
    } catch (error) {
      console.warn(`Failed to create ${nodeType}:`, error)
      return null
    }
  }

  getNode(nodeType: AnyNodeType): AnyAudioNode | null {
    // Oscillators are always created fresh — the Web Audio spec forbids restarting
    // a stopped oscillator, so pooling them provides no benefit.
    if (nodeType === 'oscillator') {
      const node = this.createFreshNode('oscillator')
      if (node) this.activeNodes.add(node)
      return node
    }

    const pool = this.pools[nodeType as PoolableNodeType]
    if (!pool) {
      console.warn(`No pool for node type: ${nodeType}`)
      return this.createFreshNode(nodeType)
    }

    let node = pool.pop() ?? null
    if (!node) node = this.createFreshNode(nodeType) as PoolableNode | null

    if (node) {
      this.resetNode(node, nodeType as PoolableNodeType)
      this.activeNodes.add(node)
    }
    return node
  }

  private resetNode(node: PoolableNode, nodeType: PoolableNodeType): void {
    try {
      const t = this.audioContext.currentTime
      switch (nodeType) {
        case 'gain':
          (node as GainNode).gain.cancelScheduledValues(0)
          ;(node as GainNode).gain.setValueAtTime(1, t)
          break
        case 'stereoPanner':
          (node as StereoPannerNode).pan.cancelScheduledValues(0)
          ;(node as StereoPannerNode).pan.setValueAtTime(0, t)
          break
        case 'delay':
          (node as DelayNode).delayTime.cancelScheduledValues(0)
          ;(node as DelayNode).delayTime.setValueAtTime(0, t)
          break
        case 'waveshaper':
          (node as WaveShaperNode).curve = null
          ;(node as WaveShaperNode).oversample = 'none'
          break
        case 'biquadFilter': {
          const f = node as BiquadFilterNode
          f.frequency.cancelScheduledValues(0)
          f.Q.cancelScheduledValues(0)
          f.gain.cancelScheduledValues(0)
          f.type = 'lowpass'
          f.frequency.setValueAtTime(350, t)
          f.Q.setValueAtTime(1, t)
          f.gain.setValueAtTime(0, t)
          break
        }
      }
      try { node.disconnect() } catch { /* already disconnected */ }
    } catch (error) {
      console.warn(`Failed to reset ${nodeType} node:`, error)
    }
  }

  releaseNode(node: AnyAudioNode, nodeType: AnyNodeType): void {
    if (!node || !this.activeNodes.has(node)) return
    this.activeNodes.delete(node)

    if (nodeType === 'oscillator') {
      try { (node as OscillatorNode).stop() } catch { /* already stopped */ }
      try { node.disconnect() } catch { /* already disconnected */ }
      return
    }

    const pool = this.pools[nodeType as PoolableNodeType]
    if (pool && pool.length < this.maxSize) {
      this.resetNode(node as PoolableNode, nodeType as PoolableNodeType)
      pool.push(node as PoolableNode)
    } else {
      try { node.disconnect() } catch { /* already disconnected */ }
    }
  }

  releaseNodes(nodesList: NodeEntry[]): void {
    nodesList.forEach(({ node, type }) => this.releaseNode(node, type))
  }

  getStats(): PoolStats {
    const stats: PoolStats = { totalActive: this.activeNodes.size }
    for (const [type, pool] of Object.entries(this.pools) as [PoolableNodeType, PoolableNode[]][]) {
      stats[type] = {
        pooled: pool.length,
        active: Array.from(this.activeNodes).filter(node => {
          try { return node.constructor.name.toLowerCase().includes(type.toLowerCase()) } catch { return false }
        }).length,
      }
    }
    return stats
  }

  cleanup(): void {
    this.activeNodes.forEach(node => {
      try {
        const ctx = (node as unknown as { context: BaseAudioContext }).context
        if (ctx.state === 'closed') this.activeNodes.delete(node)
      } catch { this.activeNodes.delete(node) }
    })
  }

  destroy(): void {
    this.activeNodes.forEach(node => {
      try {
        if (typeof (node as OscillatorNode).stop === 'function') (node as OscillatorNode).stop()
        node.disconnect()
      } catch { /* ignore */ }
    })
    for (const pool of Object.values(this.pools)) {
      pool.forEach(node => { try { node.disconnect() } catch { /* ignore */ } })
      pool.length = 0
    }
    this.activeNodes.clear()
  }
}

let globalAudioPool: AudioNodePool | null = null

export function getAudioPool(audioContext: AudioContext): AudioNodePool {
  if (!globalAudioPool || globalAudioPool.audioContext !== audioContext) {
    globalAudioPool = new AudioNodePool(audioContext)
  }
  return globalAudioPool
}

export function destroyAudioPool(): void {
  if (globalAudioPool) {
    globalAudioPool.destroy()
    globalAudioPool = null
  }
}

export function getAudioPoolStats(): ReturnType<AudioNodePool['getStats']> | null {
  return globalAudioPool ? globalAudioPool.getStats() : null
}
