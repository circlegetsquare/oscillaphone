import { createContext, useContext, useReducer, useEffect, useRef, type Dispatch } from 'react'
import {
  initAudioContext,
  cleanupAudio,
  setScale,
  setGlobalVolume,
  AVAILABLE_SCALES,
  WAVEFORMS
} from '../utils/sound'
import type { AudioState, AudioAction, SoundSettings, OversampleType } from '../types/audio'

// ─── Initial state ─────────────────────────────────────────────────────────────

const initialState: AudioState = {
  currentScale: 'C_MAJOR',
  globalVolume: 1.0,
  wallSettings: {
    duration: 0.25, detune: 0, waveform: 'sine', volume: 0.15,
    delay:      { enabled: false, time: 0.3,  feedback: 0.3, mix: 0.3 },
    reverb:     { enabled: false, roomSize: 0.5, damping: 0.3, mix: 0.3 },
    distortion: { enabled: false, amount: 0.5, oversample: '2x', mix: 0.3 },
    tremolo:    { enabled: false, rate: 4.0,  depth: 0.5,  mix: 0.5 },
  },
  circleSettings: {
    duration: 0.25, detune: 0, waveform: 'sine', volume: 0.15,
    delay:      { enabled: false, time: 0.3,  feedback: 0.3, mix: 0.3 },
    reverb:     { enabled: false, roomSize: 0.5, damping: 0.3, mix: 0.3 },
    distortion: { enabled: false, amount: 0.5, oversample: '2x', mix: 0.3 },
    tremolo:    { enabled: false, rate: 4.0,  depth: 0.5,  mix: 0.5 },
  },
}

// ─── Action types ──────────────────────────────────────────────────────────────

const ActionTypes = {
  SET: 'SET',
  RESET_ALL_CONTROLS: 'RESET_ALL_CONTROLS',
} as const

// ─── Immutable deep-set helper ─────────────────────────────────────────────────

function setIn<T extends object>(obj: T, path: string[], value: unknown): T {
  if (path.length === 0) return obj
  if (path.length === 1) return { ...obj, [path[0]]: value }
  const [head, ...tail] = path
  return {
    ...obj,
    [head]: setIn((obj as Record<string, unknown>)[head] as object, tail, value),
  }
}

// ─── Reducer ───────────────────────────────────────────────────────────────────

function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'SET':
      return setIn(state, action.path, action.value)
    case 'RESET_ALL_CONTROLS':
      return { ...initialState }
    default:
      return state
  }
}

const STORAGE_KEY = 'oscillaphone_audio_settings'

/**
 * Load persisted state from localStorage, deep-merged with initialState so any
 * keys added in future code are always present even if the stored object is old.
 */
function loadPersistedState(): AudioState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const saved = JSON.parse(raw)
    return {
      ...initialState,
      ...saved,
      wallSettings: { ...initialState.wallSettings, ...saved.wallSettings,
        delay:      { ...initialState.wallSettings.delay,      ...saved.wallSettings?.delay },
        reverb:     { ...initialState.wallSettings.reverb,     ...saved.wallSettings?.reverb },
        distortion: { ...initialState.wallSettings.distortion, ...saved.wallSettings?.distortion },
        tremolo:    { ...initialState.wallSettings.tremolo,    ...saved.wallSettings?.tremolo },
      },
      circleSettings: { ...initialState.circleSettings, ...saved.circleSettings,
        delay:      { ...initialState.circleSettings.delay,      ...saved.circleSettings?.delay },
        reverb:     { ...initialState.circleSettings.reverb,     ...saved.circleSettings?.reverb },
        distortion: { ...initialState.circleSettings.distortion, ...saved.circleSettings?.distortion },
        tremolo:    { ...initialState.circleSettings.tremolo,    ...saved.circleSettings?.tremolo },
      },
    }
  } catch {
    return initialState
  }
}

// Exported for unit testing
export { audioReducer, initialState, ActionTypes }

// ─── Context value type ───────────────────────────────────────────────────────

interface AudioContextValue {
  currentScale: string
  globalVolume: number
  wallSettings: SoundSettings
  circleSettings: SoundSettings
  AVAILABLE_SCALES: Array<{ id: string; name: string }>
  WAVEFORMS: Array<{ id: string; name: string }>
  setCurrentScale: (scale: string) => void
  setGlobalVolume: (volume: number) => void
  setWallDuration: (v: number) => void
  setWallDetune: (v: number) => void
  setWallWaveform: (v: OscillatorType) => void
  setWallVolume: (v: number) => void
  setWallDelayEnabled: (v: boolean) => void
  setWallDelayTime: (v: number) => void
  setWallDelayFeedback: (v: number) => void
  setWallDelayMix: (v: number) => void
  setWallReverbEnabled: (v: boolean) => void
  setWallReverbRoomSize: (v: number) => void
  setWallReverbDamping: (v: number) => void
  setWallReverbMix: (v: number) => void
  setWallDistortionEnabled: (v: boolean) => void
  setWallDistortionAmount: (v: number) => void
  setWallDistortionOversample: (v: OversampleType) => void
  setWallDistortionMix: (v: number) => void
  setWallTremoloEnabled: (v: boolean) => void
  setWallTremoloRate: (v: number) => void
  setWallTremoloDepth: (v: number) => void
  setWallTremoloMix: (v: number) => void
  setCircleDuration: (v: number) => void
  setCircleDetune: (v: number) => void
  setCircleWaveform: (v: OscillatorType) => void
  setCircleVolume: (v: number) => void
  setCircleDelayEnabled: (v: boolean) => void
  setCircleDelayTime: (v: number) => void
  setCircleDelayFeedback: (v: number) => void
  setCircleDelayMix: (v: number) => void
  setCircleReverbEnabled: (v: boolean) => void
  setCircleReverbRoomSize: (v: number) => void
  setCircleReverbDamping: (v: number) => void
  setCircleReverbMix: (v: number) => void
  setCircleDistortionEnabled: (v: boolean) => void
  setCircleDistortionAmount: (v: number) => void
  setCircleDistortionOversample: (v: OversampleType) => void
  setCircleDistortionMix: (v: number) => void
  setCircleTremoloEnabled: (v: boolean) => void
  setCircleTremoloRate: (v: number) => void
  setCircleTremoloDepth: (v: number) => void
  setCircleTremoloMix: (v: number) => void
  resetAllControls: () => void
  dispatch: Dispatch<AudioAction>
}

const AudioContext = createContext<AudioContextValue | undefined>(undefined)

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(audioReducer, undefined, loadPersistedState)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persist state to localStorage, debounced at 250 ms so rapid slider drags
  // don't hammer storage on every tick.
  useEffect(() => {
    if (persistTimerRef.current !== null) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch { /* storage unavailable (private browsing quota) */ }
      persistTimerRef.current = null
    }, 250)
    return () => {
      if (persistTimerRef.current !== null) clearTimeout(persistTimerRef.current)
    }
  }, [state])

  // Initialize audio on mount; clean up on unmount.
  useEffect(() => {
    initAudioContext()
    return () => { cleanupAudio() }
  }, [])

  // Sync the two module-level audio values that require side-effect updates.
  useEffect(() => { setScale(state.currentScale) }, [state.currentScale])
  useEffect(() => { setGlobalVolume(state.globalVolume) }, [state.globalVolume])

  // Shorthand: dispatch a SET action
  const set = (path: string[], value: unknown) =>
    dispatch({ type: ActionTypes.SET, path, value })

  const value: AudioContextValue = {
    currentScale:   state.currentScale,
    globalVolume:   state.globalVolume,
    wallSettings:   state.wallSettings,
    circleSettings: state.circleSettings,
    AVAILABLE_SCALES,
    WAVEFORMS,

    setCurrentScale: (v) => set(['currentScale'], v),
    setGlobalVolume: (v) => set(['globalVolume'], v),

    setWallDuration: (v) => set(['wallSettings', 'duration'], v),
    setWallDetune:   (v) => set(['wallSettings', 'detune'], v),
    setWallWaveform: (v) => set(['wallSettings', 'waveform'], v),
    setWallVolume:   (v) => set(['wallSettings', 'volume'], v),

    setWallDelayEnabled:  (v) => set(['wallSettings', 'delay', 'enabled'], v),
    setWallDelayTime:     (v) => set(['wallSettings', 'delay', 'time'], v),
    setWallDelayFeedback: (v) => set(['wallSettings', 'delay', 'feedback'], v),
    setWallDelayMix:      (v) => set(['wallSettings', 'delay', 'mix'], v),

    setWallReverbEnabled:  (v) => set(['wallSettings', 'reverb', 'enabled'], v),
    setWallReverbRoomSize: (v) => set(['wallSettings', 'reverb', 'roomSize'], v),
    setWallReverbDamping:  (v) => set(['wallSettings', 'reverb', 'damping'], v),
    setWallReverbMix:      (v) => set(['wallSettings', 'reverb', 'mix'], v),

    setWallDistortionEnabled:    (v) => set(['wallSettings', 'distortion', 'enabled'], v),
    setWallDistortionAmount:     (v) => set(['wallSettings', 'distortion', 'amount'], v),
    setWallDistortionOversample: (v) => set(['wallSettings', 'distortion', 'oversample'], v),
    setWallDistortionMix:        (v) => set(['wallSettings', 'distortion', 'mix'], v),

    setWallTremoloEnabled: (v) => set(['wallSettings', 'tremolo', 'enabled'], v),
    setWallTremoloRate:    (v) => set(['wallSettings', 'tremolo', 'rate'], v),
    setWallTremoloDepth:   (v) => set(['wallSettings', 'tremolo', 'depth'], v),
    setWallTremoloMix:     (v) => set(['wallSettings', 'tremolo', 'mix'], v),

    setCircleDuration: (v) => set(['circleSettings', 'duration'], v),
    setCircleDetune:   (v) => set(['circleSettings', 'detune'], v),
    setCircleWaveform: (v) => set(['circleSettings', 'waveform'], v),
    setCircleVolume:   (v) => set(['circleSettings', 'volume'], v),

    setCircleDelayEnabled:  (v) => set(['circleSettings', 'delay', 'enabled'], v),
    setCircleDelayTime:     (v) => set(['circleSettings', 'delay', 'time'], v),
    setCircleDelayFeedback: (v) => set(['circleSettings', 'delay', 'feedback'], v),
    setCircleDelayMix:      (v) => set(['circleSettings', 'delay', 'mix'], v),

    setCircleReverbEnabled:  (v) => set(['circleSettings', 'reverb', 'enabled'], v),
    setCircleReverbRoomSize: (v) => set(['circleSettings', 'reverb', 'roomSize'], v),
    setCircleReverbDamping:  (v) => set(['circleSettings', 'reverb', 'damping'], v),
    setCircleReverbMix:      (v) => set(['circleSettings', 'reverb', 'mix'], v),

    setCircleDistortionEnabled:    (v) => set(['circleSettings', 'distortion', 'enabled'], v),
    setCircleDistortionAmount:     (v) => set(['circleSettings', 'distortion', 'amount'], v),
    setCircleDistortionOversample: (v) => set(['circleSettings', 'distortion', 'oversample'], v),
    setCircleDistortionMix:        (v) => set(['circleSettings', 'distortion', 'mix'], v),

    setCircleTremoloEnabled: (v) => set(['circleSettings', 'tremolo', 'enabled'], v),
    setCircleTremoloRate:    (v) => set(['circleSettings', 'tremolo', 'rate'], v),
    setCircleTremoloDepth:   (v) => set(['circleSettings', 'tremolo', 'depth'], v),
    setCircleTremoloMix:     (v) => set(['circleSettings', 'tremolo', 'mix'], v),

    resetAllControls: () => dispatch({ type: ActionTypes.RESET_ALL_CONTROLS }),
    dispatch,
  }

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  )
}

export function useAudio(): AudioContextValue {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}

export default AudioContext
