// @ts-nocheck
/**
 * Targeted tests for effectChains.js — covers the three pure-logic paths
 * called out in BACKLOG A6: IR cache, IR buffer shape, and pool overflow.
 *
 * All Web Audio construction is avoided by:
 *   - mocking ./audioPool so getNode() returns plain JS objects
 *   - supplying a minimal mock AudioContext whose createBuffer() fills real
 *     Float32Arrays (needed for shape assertions)
 */
import { describe, it, expect, afterEach, vi } from 'vitest'

// ─── Mock audioPool ─────────────────────────────────────────────────────────
// Inline factory (vi.mock is hoisted, so we can't call outer-scope helpers).
vi.mock('./audioPool', () => {
  function makeGain() {
    return {
      gain: {
        value: 1,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
  }
  function makePanner() {
    return {
      pan: { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
  }
  function makeWaveshaper() {
    return { curve: null, oversample: 'none', connect: vi.fn(), disconnect: vi.fn() }
  }
  function makeDelay() {
    return {
      delayTime: { value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }
  }
  return {
    getAudioPool: vi.fn(() => ({
      getNode: vi.fn((type) => {
        switch (type) {
          case 'gain':        return makeGain()
          case 'stereoPanner': return makePanner()
          case 'waveshaper':  return makeWaveshaper()
          case 'delay':       return makeDelay()
          default: throw new Error(`Unexpected node type in test: ${type}`)
        }
      }),
      releaseNode: vi.fn(),
    })),
  }
})

import { getEffectChainPool, destroyEffectChainPool, getEffectChainStats } from './effectChains'

// ─── Mock AudioContext factory ───────────────────────────────────────────────
// createBuffer() fills real Float32Arrays so IR shape assertions work.
function createMockAudioContext(sampleRate = 44100) {
  return {
    currentTime: 0,
    sampleRate,
    createConvolver: vi.fn(() => ({ buffer: null, connect: vi.fn(), disconnect: vi.fn() })),
    createOscillator: vi.fn(() => ({
      type: 'sine',
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    createBuffer: vi.fn((numChannels, length, sr) => {
      const channels = Array.from({ length: numChannels }, () => new Float32Array(length))
      return {
        numberOfChannels: numChannels,
        length,
        sampleRate: sr,
        getChannelData: (c) => channels[c],
      }
    }),
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function freshPool(sampleRate = 44100) {
  return getEffectChainPool(createMockAudioContext(sampleRate))
}

// Minimal settings that activates the reverb path inside configure().
function reverbSettings(roomSize, damping) {
  return {
    volume: 0.3,
    duration: 0.1,
    pan: 0,
    reverb: { enabled: true, roomSize, damping, mix: 0.4 },
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('effectChains', () => {
  afterEach(() => destroyEffectChainPool())

  // ── Impulse response cache ─────────────────────────────────────────────────
  describe('IR cache', () => {
    it('returns the same buffer object for identical reverb params (cache hit)', () => {
      const pool = freshPool()
      const chain1 = pool.getChain()
      chain1.configure(reverbSettings(0.55, 0.25))
      const buf1 = chain1.nodes.convolver.buffer
      pool.releaseChain(chain1)

      const chain2 = pool.getChain()
      chain2.configure(reverbSettings(0.55, 0.25))
      const buf2 = chain2.nodes.convolver.buffer
      pool.releaseChain(chain2)

      expect(buf1).not.toBeNull()
      expect(buf1).toBe(buf2)
    })

    it('returns a different buffer for different reverb params (cache miss)', () => {
      const pool = freshPool()
      const chain1 = pool.getChain()
      chain1.configure(reverbSettings(0.2, 0.1))
      const bufA = chain1.nodes.convolver.buffer
      pool.releaseChain(chain1)

      const chain2 = pool.getChain()
      chain2.configure(reverbSettings(0.8, 0.9))
      const bufB = chain2.nodes.convolver.buffer
      pool.releaseChain(chain2)

      expect(bufA).not.toBeNull()
      expect(bufB).not.toBeNull()
      expect(bufA).not.toBe(bufB)
    })

    it('cache key uses 3 decimal places so close params share an entry', () => {
      // 0.1231 and 0.1234 both round to '0.123'; they should share a cache entry.
      const pool = freshPool()
      const chain1 = pool.getChain()
      chain1.configure(reverbSettings(0.1231, 0.3))
      const bufA = chain1.nodes.convolver.buffer
      pool.releaseChain(chain1)

      const chain2 = pool.getChain()
      chain2.configure(reverbSettings(0.1234, 0.3))
      const bufB = chain2.nodes.convolver.buffer
      pool.releaseChain(chain2)

      expect(bufA).toBe(bufB) // same cache key: '0.123-0.300'
    })
  })

  // ── Impulse response shape ─────────────────────────────────────────────────
  describe('IR shape', () => {
    it('has 2 channels', () => {
      const pool = freshPool()
      const chain = pool.getChain()
      chain.configure(reverbSettings(0.5, 0.3))
      expect(chain.nodes.convolver.buffer.numberOfChannels).toBe(2)
      pool.releaseChain(chain)
    })

    it('length = ceil(sampleRate * (0.3 + roomSize * 2.2))', () => {
      const sampleRate = 44100
      const roomSize = 0.4
      const expectedLength = Math.ceil(sampleRate * (0.3 + roomSize * 2.2))

      const pool = freshPool(sampleRate)
      const chain = pool.getChain()
      chain.configure(reverbSettings(roomSize, 0.35))
      expect(chain.nodes.convolver.buffer.length).toBe(expectedLength)
      pool.releaseChain(chain)
    })

    it('shows exponential amplitude decay (average of first samples > last samples)', () => {
      const pool = freshPool()
      const chain = pool.getChain()
      chain.configure(reverbSettings(0.6, 0.5))
      const buf = chain.nodes.convolver.buffer
      const data = buf.getChannelData(0)
      const n = 200
      const avgStart = Array.from(data.slice(0, n)).reduce((s, x) => s + Math.abs(x), 0) / n
      const avgEnd   = Array.from(data.slice(-n)).reduce((s, x) => s + Math.abs(x), 0) / n
      expect(avgStart).toBeGreaterThan(avgEnd)
      pool.releaseChain(chain)
    })

    it('both channels contain independent noise (non-zero, non-identical)', () => {
      const pool = freshPool()
      const chain = pool.getChain()
      chain.configure(reverbSettings(0.7, 0.4))
      const buf = chain.nodes.convolver.buffer
      const ch0 = buf.getChannelData(0)
      const ch1 = buf.getChannelData(1)
      const anyNonZero = (arr) => Array.from(arr).some((v) => v !== 0)
      expect(anyNonZero(ch0)).toBe(true)
      expect(anyNonZero(ch1)).toBe(true)
      // Independent noise means the two channels should differ
      const identical = Array.from(ch0).every((v, i) => v === ch1[i])
      expect(identical).toBe(false)
      pool.releaseChain(chain)
    })
  })

  // ── Effect chain pool ──────────────────────────────────────────────────────
  describe('pool', () => {
    it('starts with 8 available chains', () => {
      freshPool()
      expect(getEffectChainStats().available).toBe(8)
    })

    it('getChain() returns a chain and updates available/active counts', () => {
      const pool = freshPool()
      const chain = pool.getChain()
      expect(chain).not.toBeNull()
      expect(getEffectChainStats().available).toBe(7)
      expect(getEffectChainStats().active).toBe(1)
    })

    it('pool overflow: 9th getChain() warns and still returns a usable chain', () => {
      const pool = freshPool()
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const chains = Array.from({ length: 9 }, () => pool.getChain())

      expect(spy).toHaveBeenCalledWith('Effect chain pool exhausted, creating new chain')
      expect(chains[8]).not.toBeNull()
      expect(getEffectChainStats().active).toBe(9)
      expect(getEffectChainStats().available).toBe(0)

      spy.mockRestore()
      chains.forEach((c) => pool.releaseChain(c))
    })

    it('overflow chain is cleaned up on release (pool does not grow past cap)', () => {
      const pool = freshPool()
      vi.spyOn(console, 'warn').mockImplementation(() => {})
      const chains = Array.from({ length: 9 }, () => pool.getChain())
      chains.forEach((c) => pool.releaseChain(c))
      vi.restoreAllMocks()

      const stats = getEffectChainStats()
      expect(stats.available).toBe(8)
      expect(stats.active).toBe(0)
      expect(stats.total).toBe(8)
    })

    it('releaseChain is safe for chains not tracked by the pool', () => {
      const pool = freshPool()
      expect(() => pool.releaseChain({})).not.toThrow()
      expect(() => pool.releaseChain(null)).not.toThrow()
      expect(getEffectChainStats().available).toBe(8)
    })
  })
})
