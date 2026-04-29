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

type NumericPayloadAction =
  | 'SET_GLOBAL_VOLUME'
  | 'SET_WALL_DURATION' | 'SET_WALL_DETUNE' | 'SET_WALL_VOLUME'
  | 'SET_WALL_DELAY_TIME' | 'SET_WALL_DELAY_FEEDBACK' | 'SET_WALL_DELAY_MIX'
  | 'SET_WALL_REVERB_ROOM_SIZE' | 'SET_WALL_REVERB_DAMPING' | 'SET_WALL_REVERB_MIX'
  | 'SET_WALL_DISTORTION_AMOUNT' | 'SET_WALL_DISTORTION_MIX'
  | 'SET_WALL_TREMOLO_RATE' | 'SET_WALL_TREMOLO_DEPTH' | 'SET_WALL_TREMOLO_MIX'
  | 'SET_CIRCLE_DURATION' | 'SET_CIRCLE_DETUNE' | 'SET_CIRCLE_VOLUME'
  | 'SET_CIRCLE_DELAY_TIME' | 'SET_CIRCLE_DELAY_FEEDBACK' | 'SET_CIRCLE_DELAY_MIX'
  | 'SET_CIRCLE_REVERB_ROOM_SIZE' | 'SET_CIRCLE_REVERB_DAMPING' | 'SET_CIRCLE_REVERB_MIX'
  | 'SET_CIRCLE_DISTORTION_AMOUNT' | 'SET_CIRCLE_DISTORTION_MIX'
  | 'SET_CIRCLE_TREMOLO_RATE' | 'SET_CIRCLE_TREMOLO_DEPTH' | 'SET_CIRCLE_TREMOLO_MIX'

type BooleanPayloadAction =
  | 'SET_WALL_DELAY_ENABLED' | 'SET_WALL_REVERB_ENABLED'
  | 'SET_WALL_DISTORTION_ENABLED' | 'SET_WALL_TREMOLO_ENABLED'
  | 'SET_CIRCLE_DELAY_ENABLED' | 'SET_CIRCLE_REVERB_ENABLED'
  | 'SET_CIRCLE_DISTORTION_ENABLED' | 'SET_CIRCLE_TREMOLO_ENABLED'

type StringPayloadAction = 'SET_SCALE'

type WaveformPayloadAction = 'SET_WALL_WAVEFORM' | 'SET_CIRCLE_WAVEFORM'

type OversamplePayloadAction =
  | 'SET_WALL_DISTORTION_OVERSAMPLE'
  | 'SET_CIRCLE_DISTORTION_OVERSAMPLE'

export type AudioAction =
  | { type: 'RESET_ALL_CONTROLS' }
  | { type: NumericPayloadAction; payload: number }
  | { type: BooleanPayloadAction; payload: boolean }
  | { type: StringPayloadAction; payload: string }
  | { type: WaveformPayloadAction; payload: OscillatorType }
  | { type: OversamplePayloadAction; payload: OversampleType }
