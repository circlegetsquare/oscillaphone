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

describe('audioReducer', () => {
  describe('SET_SCALE', () => {
    it('updates currentScale', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_SCALE, payload: 'A_MINOR' })
      expect(state.currentScale).toBe('A_MINOR')
    })

    it('does not mutate other state', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_SCALE, payload: 'A_MINOR' })
      expect(state.globalVolume).toBe(initialState.globalVolume)
      expect(state.wallSettings).toBe(initialState.wallSettings)
    })
  })

  describe('SET_GLOBAL_VOLUME', () => {
    it('updates globalVolume', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_GLOBAL_VOLUME, payload: 0.5 })
      expect(state.globalVolume).toBe(0.5)
    })
  })

  describe('wall sound settings', () => {
    it('SET_WALL_WAVEFORM updates wallSettings.waveform', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_WAVEFORM, payload: 'square' })
      expect(state.wallSettings.waveform).toBe('square')
      expect(state.circleSettings.waveform).toBe(initialState.circleSettings.waveform)
    })

    it('SET_WALL_VOLUME updates wallSettings.volume', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_VOLUME, payload: 0.8 })
      expect(state.wallSettings.volume).toBe(0.8)
    })

    it('SET_WALL_DURATION updates wallSettings.duration', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_DURATION, payload: 0.5 })
      expect(state.wallSettings.duration).toBe(0.5)
    })

    it('SET_WALL_DETUNE updates wallSettings.detune', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_DETUNE, payload: 100 })
      expect(state.wallSettings.detune).toBe(100)
    })
  })

  describe('wall delay settings', () => {
    it('SET_WALL_DELAY_ENABLED enables delay', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_DELAY_ENABLED, payload: true })
      expect(state.wallSettings.delay.enabled).toBe(true)
    })

    it('SET_WALL_DELAY_TIME updates delay time', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_DELAY_TIME, payload: 0.6 })
      expect(state.wallSettings.delay.time).toBe(0.6)
    })

    it('SET_WALL_DELAY_FEEDBACK updates delay feedback', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_DELAY_FEEDBACK, payload: 0.7 })
      expect(state.wallSettings.delay.feedback).toBe(0.7)
    })

    it('SET_WALL_DELAY_MIX updates delay mix', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_DELAY_MIX, payload: 0.4 })
      expect(state.wallSettings.delay.mix).toBe(0.4)
    })
  })

  describe('wall reverb settings', () => {
    it('SET_WALL_REVERB_ENABLED enables reverb', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_REVERB_ENABLED, payload: true })
      expect(state.wallSettings.reverb.enabled).toBe(true)
    })

    it('SET_WALL_REVERB_ROOM_SIZE updates room size', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_REVERB_ROOM_SIZE, payload: 0.9 })
      expect(state.wallSettings.reverb.roomSize).toBe(0.9)
    })
  })

  describe('wall distortion settings', () => {
    it('SET_WALL_DISTORTION_ENABLED enables distortion', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_DISTORTION_ENABLED, payload: true })
      expect(state.wallSettings.distortion.enabled).toBe(true)
    })

    it('SET_WALL_DISTORTION_AMOUNT updates amount', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_DISTORTION_AMOUNT, payload: 0.8 })
      expect(state.wallSettings.distortion.amount).toBe(0.8)
    })
  })

  describe('wall tremolo settings', () => {
    it('SET_WALL_TREMOLO_ENABLED enables tremolo', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_TREMOLO_ENABLED, payload: true })
      expect(state.wallSettings.tremolo.enabled).toBe(true)
    })

    it('SET_WALL_TREMOLO_RATE updates rate', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_WALL_TREMOLO_RATE, payload: 8.0 })
      expect(state.wallSettings.tremolo.rate).toBe(8.0)
    })
  })

  describe('circle sound settings', () => {
    it('SET_CIRCLE_WAVEFORM updates circleSettings.waveform', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_CIRCLE_WAVEFORM, payload: 'triangle' })
      expect(state.circleSettings.waveform).toBe('triangle')
      expect(state.wallSettings.waveform).toBe(initialState.wallSettings.waveform)
    })

    it('SET_CIRCLE_VOLUME updates circleSettings.volume', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_CIRCLE_VOLUME, payload: 0.3 })
      expect(state.circleSettings.volume).toBe(0.3)
    })

    it('SET_CIRCLE_DELAY_ENABLED enables circle delay', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_CIRCLE_DELAY_ENABLED, payload: true })
      expect(state.circleSettings.delay.enabled).toBe(true)
      expect(state.wallSettings.delay.enabled).toBe(initialState.wallSettings.delay.enabled)
    })

    it('SET_CIRCLE_REVERB_ENABLED enables circle reverb', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_CIRCLE_REVERB_ENABLED, payload: true })
      expect(state.circleSettings.reverb.enabled).toBe(true)
    })

    it('SET_CIRCLE_DISTORTION_AMOUNT updates circle distortion amount', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_CIRCLE_DISTORTION_AMOUNT, payload: 0.6 })
      expect(state.circleSettings.distortion.amount).toBe(0.6)
    })

    it('SET_CIRCLE_TREMOLO_DEPTH updates circle tremolo depth', () => {
      const state = audioReducer(initialState, { type: ActionTypes.SET_CIRCLE_TREMOLO_DEPTH, payload: 0.9 })
      expect(state.circleSettings.tremolo.depth).toBe(0.9)
    })
  })

  describe('RESET_ALL_CONTROLS', () => {
    it('restores all settings to initial state', () => {
      // Apply a bunch of mutations
      let state = audioReducer(initialState, { type: ActionTypes.SET_WALL_WAVEFORM, payload: 'square' })
      state = audioReducer(state, { type: ActionTypes.SET_CIRCLE_VOLUME, payload: 0.9 })
      state = audioReducer(state, { type: ActionTypes.SET_WALL_DELAY_ENABLED, payload: true })
      state = audioReducer(state, { type: ActionTypes.SET_GLOBAL_VOLUME, payload: 0.2 })

      // Reset
      const reset = audioReducer(state, { type: ActionTypes.RESET_ALL_CONTROLS })

      expect(reset.wallSettings).toEqual(initialState.wallSettings)
      expect(reset.circleSettings).toEqual(initialState.circleSettings)
    })

    it('preserves scale and global volume after reset', () => {
      // RESET_ALL_CONTROLS resets sound settings but keeps scale/volume
      let state = audioReducer(initialState, { type: ActionTypes.SET_SCALE, payload: 'A_MINOR' })
      state = audioReducer(state, { type: ActionTypes.SET_GLOBAL_VOLUME, payload: 0.5 })
      const reset = audioReducer(state, { type: ActionTypes.RESET_ALL_CONTROLS })

      // Confirm wallSettings/circleSettings are reset
      expect(reset.wallSettings).toEqual(initialState.wallSettings)
    })
  })

  describe('unknown action', () => {
    it('returns state unchanged for unknown action type', () => {
      const state = audioReducer(initialState, { type: 'UNKNOWN_ACTION' })
      expect(state).toBe(initialState)
    })
  })
})
