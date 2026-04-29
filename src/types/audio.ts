// ─── Effect sub-settings ──────────────────────────────────────────────────────

export interface DelaySettings {
  enabled: boolean
  time: number
  feedback: number
  mix: number
}

export interface ReverbSettings {
  enabled: boolean
  roomSize: number
  damping: number
  mix: number
}

export type OversampleType = '2x' | '4x' | 'none'

export interface DistortionSettings {
  enabled: boolean
  amount: number
  oversample: OversampleType
  mix: number
}

export interface TremoloSettings {
  enabled: boolean
  rate: number
  depth: number
  mix: number
  shape?: OscillatorType
}

// ─── Top-level sound settings (wallSettings / circleSettings) ─────────────────

export interface SoundSettings {
  duration: number
  detune: number
  waveform: OscillatorType
  volume: number
  delay: DelaySettings
  reverb: ReverbSettings
  distortion: DistortionSettings
  tremolo: TremoloSettings
}

// ─── Global audio state ───────────────────────────────────────────────────────

export interface AudioState {
  currentScale: string
  globalVolume: number
  wallSettings: SoundSettings
  circleSettings: SoundSettings
}

// ─── Reducer action union ─────────────────────────────────────────────────────
//
// A single SET action carries a path array + value, eliminating the need for
// 30+ per-field action types. RESET_ALL_CONTROLS restores the full initialState.

export type AudioAction =
  | { type: 'SET'; path: string[]; value: unknown }
  | { type: 'RESET_ALL_CONTROLS' }
