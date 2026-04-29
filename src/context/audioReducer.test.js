// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'

// Mock sound.js (and its transitive deps effectChains/audioPool) so Web Audio
// API nodes are never constructed during import in a node test environment.
vi.mock('../utils/sound', () => ({
  initAudioContext: vi.fn(),
  setScale: vi.fn(),
  setGlobalVolume: vi.fn(),
  AVAILABLE_SCALES: {},
  WAVEFORMS: [],
}))

import { audioReducer, initialState, ActionTypes } from './AudioContext'

// Shorthand: dispatch a SET action
const set = (path, value) => ({ type: ActionTypes.SET, path, value })

describe('audioReducer', () => {
  describe('SET currentScale', () => {
    it('updates currentScale', () => {
      const state = audioReducer(initialState, set(['currentScale'], 'A_MINOR'))
      expect(state.currentScale).toBe('A_MINOR')
    })

    it('does not mutate other state', () => {
      const state = audioReducer(initialState, set(['currentScale'], 'A_MINOR'))
      expect(state.globalVolume).toBe(initialState.globalVolume)
      expect(state.wallSettings).toBe(initialState.wallSettings)
    })
  })

  describe('SET globalVolume', () => {
    it('updates globalVolume', () => {
      const state = audioReducer(initialState, set(['globalVolume'], 0.5))
      expect(state.globalVolume).toBe(0.5)
    })
  })

  describe('wall sound settings', () => {
    it('updates wallSettings.waveform without touching circleSettings', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'waveform'], 'square'))
      expect(state.wallSettings.waveform).toBe('square')
      expect(state.circleSettings.waveform).toBe(initialState.circleSettings.waveform)
    })

    it('updates wallSettings.volume', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'volume'], 0.8))
      expect(state.wallSettings.volume).toBe(0.8)
    })

    it('updates wallSettings.duration', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'duration'], 0.5))
      expect(state.wallSettings.duration).toBe(0.5)
    })

    it('updates wallSettings.detune', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'detune'], 100))
      expect(state.wallSettings.detune).toBe(100)
    })
  })

  describe('wall delay settings', () => {
    it('enables delay', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'delay', 'enabled'], true))
      expect(state.wallSettings.delay.enabled).toBe(true)
    })

    it('updates delay time', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'delay', 'time'], 0.6))
      expect(state.wallSettings.delay.time).toBe(0.6)
    })

    it('updates delay feedback', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'delay', 'feedback'], 0.7))
      expect(state.wallSettings.delay.feedback).toBe(0.7)
    })

    it('updates delay mix', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'delay', 'mix'], 0.4))
      expect(state.wallSettings.delay.mix).toBe(0.4)
    })
  })

  describe('wall reverb settings', () => {
    it('enables reverb', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'reverb', 'enabled'], true))
      expect(state.wallSettings.reverb.enabled).toBe(true)
    })

    it('updates room size', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'reverb', 'roomSize'], 0.9))
      expect(state.wallSettings.reverb.roomSize).toBe(0.9)
    })
  })

  describe('wall distortion settings', () => {
    it('enables distortion', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'distortion', 'enabled'], true))
      expect(state.wallSettings.distortion.enabled).toBe(true)
    })

    it('updates amount', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'distortion', 'amount'], 0.8))
      expect(state.wallSettings.distortion.amount).toBe(0.8)
    })
  })

  describe('wall tremolo settings', () => {
    it('enables tremolo', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'tremolo', 'enabled'], true))
      expect(state.wallSettings.tremolo.enabled).toBe(true)
    })

    it('updates rate', () => {
      const state = audioReducer(initialState, set(['wallSettings', 'tremolo', 'rate'], 8.0))
      expect(state.wallSettings.tremolo.rate).toBe(8.0)
    })
  })

  describe('circle sound settings', () => {
    it('updates circleSettings.waveform without touching wallSettings', () => {
      const state = audioReducer(initialState, set(['circleSettings', 'waveform'], 'triangle'))
      expect(state.circleSettings.waveform).toBe('triangle')
      expect(state.wallSettings.waveform).toBe(initialState.wallSettings.waveform)
    })

    it('updates circleSettings.volume', () => {
      const state = audioReducer(initialState, set(['circleSettings', 'volume'], 0.3))
      expect(state.circleSettings.volume).toBe(0.3)
    })

    it('enables circle delay without touching wall delay', () => {
      const state = audioReducer(initialState, set(['circleSettings', 'delay', 'enabled'], true))
      expect(state.circleSettings.delay.enabled).toBe(true)
      expect(state.wallSettings.delay.enabled).toBe(initialState.wallSettings.delay.enabled)
    })

    it('enables circle reverb', () => {
      const state = audioReducer(initialState, set(['circleSettings', 'reverb', 'enabled'], true))
      expect(state.circleSettings.reverb.enabled).toBe(true)
    })

    it('updates circle distortion amount', () => {
      const state = audioReducer(initialState, set(['circleSettings', 'distortion', 'amount'], 0.6))
      expect(state.circleSettings.distortion.amount).toBe(0.6)
    })

    it('updates circle tremolo depth', () => {
      const state = audioReducer(initialState, set(['circleSettings', 'tremolo', 'depth'], 0.9))
      expect(state.circleSettings.tremolo.depth).toBe(0.9)
    })
  })

  describe('RESET_ALL_CONTROLS', () => {
    it('restores all settings to initial state', () => {
      let state = audioReducer(initialState, set(['wallSettings', 'waveform'], 'square'))
      state = audioReducer(state, set(['circleSettings', 'volume'], 0.9))
      state = audioReducer(state, set(['wallSettings', 'delay', 'enabled'], true))
      state = audioReducer(state, set(['globalVolume'], 0.2))

      const reset = audioReducer(state, { type: ActionTypes.RESET_ALL_CONTROLS })

      expect(reset.wallSettings).toEqual(initialState.wallSettings)
      expect(reset.circleSettings).toEqual(initialState.circleSettings)
    })

    it('resets wallSettings and circleSettings to initial values', () => {
      let state = audioReducer(initialState, set(['currentScale'], 'A_MINOR'))
      state = audioReducer(state, set(['globalVolume'], 0.5))
      const reset = audioReducer(state, { type: ActionTypes.RESET_ALL_CONTROLS })

      expect(reset.wallSettings).toEqual(initialState.wallSettings)
      expect(reset.circleSettings).toEqual(initialState.circleSettings)
    })
  })

  describe('unknown action', () => {
    it('returns state unchanged for unknown action type', () => {
      const state = audioReducer(initialState, { type: 'UNKNOWN_ACTION' })
      expect(state).toBe(initialState)
    })
  })
})

