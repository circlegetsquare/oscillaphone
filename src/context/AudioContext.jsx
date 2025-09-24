import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { 
  initAudioContext,
  setScale,
  setWallDuration,
  setCircleDuration,
  setWallDetune,
  setCircleDetune,
  setWallWaveform,
  setCircleWaveform,
  setWallDelayEnabled,
  setWallDelayTime,
  setWallDelayFeedback,
  setWallDelayMix,
  setCircleDelayEnabled,
  setCircleDelayTime,
  setCircleDelayFeedback,
  setCircleDelayMix,
  setWallReverbEnabled,
  setWallReverbRoomSize,
  setWallReverbDamping,
  setWallReverbMix,
  setCircleReverbEnabled,
  setCircleReverbRoomSize,
  setCircleReverbDamping,
  setCircleReverbMix,
  setWallDistortionEnabled,
  setWallDistortionAmount,
  setWallDistortionOversample,
  setWallDistortionMix,
  setCircleDistortionEnabled,
  setCircleDistortionAmount,
  setCircleDistortionOversample,
  setCircleDistortionMix,
  setWallTremoloEnabled,
  setWallTremoloRate,
  setWallTremoloDepth,
  setWallTremoloMix,
  setCircleTremoloEnabled,
  setCircleTremoloRate,
  setCircleTremoloDepth,
  setCircleTremoloMix,
  setWallVolume,
  setCircleVolume,
  setGlobalVolume,
  getGlobalVolume,
  AVAILABLE_SCALES,
  WAVEFORMS
} from '../utils/sound'

// Initial state for audio settings
const initialState = {
  currentScale: 'C_MAJOR',
  globalVolume: 1.0, // Global master volume
  
  // Wall sound settings
  wallSettings: {
    duration: 0.25,
    detune: 0,
    waveform: 'sine',
    volume: 0.15,
    
    delay: {
      enabled: false,
      time: 0.3,
      feedback: 0.3,
      mix: 0.3
    },
    
    reverb: {
      enabled: false,
      roomSize: 0.5,
      damping: 0.3,
      mix: 0.3
    },
    
    distortion: {
      enabled: false,
      amount: 0.5,
      oversample: 'none',
      mix: 0.3
    },
    
    tremolo: {
      enabled: false,
      rate: 4.0,
      depth: 0.5,
      mix: 0.5
    }
  },
  
  // Circle sound settings
  circleSettings: {
    duration: 0.25,
    detune: 0,
    waveform: 'sine',
    volume: 0.15,
    
    delay: {
      enabled: false,
      time: 0.3,
      feedback: 0.3,
      mix: 0.3
    },
    
    reverb: {
      enabled: false,
      roomSize: 0.5,
      damping: 0.3,
      mix: 0.3
    },
    
    distortion: {
      enabled: false,
      amount: 0.5,
      oversample: 'none',
      mix: 0.3
    },
    
    tremolo: {
      enabled: false,
      rate: 4.0,
      depth: 0.5,
      mix: 0.5
    }
  }
}

// Action types
const ActionTypes = {
  SET_SCALE: 'SET_SCALE',
  SET_GLOBAL_VOLUME: 'SET_GLOBAL_VOLUME',
  
  // Wall sound actions
  SET_WALL_DURATION: 'SET_WALL_DURATION',
  SET_WALL_DETUNE: 'SET_WALL_DETUNE',
  SET_WALL_WAVEFORM: 'SET_WALL_WAVEFORM',
  SET_WALL_VOLUME: 'SET_WALL_VOLUME',
  
  SET_WALL_DELAY_ENABLED: 'SET_WALL_DELAY_ENABLED',
  SET_WALL_DELAY_TIME: 'SET_WALL_DELAY_TIME',
  SET_WALL_DELAY_FEEDBACK: 'SET_WALL_DELAY_FEEDBACK',
  SET_WALL_DELAY_MIX: 'SET_WALL_DELAY_MIX',
  
  SET_WALL_REVERB_ENABLED: 'SET_WALL_REVERB_ENABLED',
  SET_WALL_REVERB_ROOM_SIZE: 'SET_WALL_REVERB_ROOM_SIZE',
  SET_WALL_REVERB_DAMPING: 'SET_WALL_REVERB_DAMPING',
  SET_WALL_REVERB_MIX: 'SET_WALL_REVERB_MIX',
  
  SET_WALL_DISTORTION_ENABLED: 'SET_WALL_DISTORTION_ENABLED',
  SET_WALL_DISTORTION_AMOUNT: 'SET_WALL_DISTORTION_AMOUNT',
  SET_WALL_DISTORTION_OVERSAMPLE: 'SET_WALL_DISTORTION_OVERSAMPLE',
  SET_WALL_DISTORTION_MIX: 'SET_WALL_DISTORTION_MIX',
  
  SET_WALL_TREMOLO_ENABLED: 'SET_WALL_TREMOLO_ENABLED',
  SET_WALL_TREMOLO_RATE: 'SET_WALL_TREMOLO_RATE',
  SET_WALL_TREMOLO_DEPTH: 'SET_WALL_TREMOLO_DEPTH',
  SET_WALL_TREMOLO_MIX: 'SET_WALL_TREMOLO_MIX',
  
  // Circle sound actions
  SET_CIRCLE_DURATION: 'SET_CIRCLE_DURATION',
  SET_CIRCLE_DETUNE: 'SET_CIRCLE_DETUNE',
  SET_CIRCLE_WAVEFORM: 'SET_CIRCLE_WAVEFORM',
  SET_CIRCLE_VOLUME: 'SET_CIRCLE_VOLUME',
  
  SET_CIRCLE_DELAY_ENABLED: 'SET_CIRCLE_DELAY_ENABLED',
  SET_CIRCLE_DELAY_TIME: 'SET_CIRCLE_DELAY_TIME',
  SET_CIRCLE_DELAY_FEEDBACK: 'SET_CIRCLE_DELAY_FEEDBACK',
  SET_CIRCLE_DELAY_MIX: 'SET_CIRCLE_DELAY_MIX',
  
  SET_CIRCLE_REVERB_ENABLED: 'SET_CIRCLE_REVERB_ENABLED',
  SET_CIRCLE_REVERB_ROOM_SIZE: 'SET_CIRCLE_REVERB_ROOM_SIZE',
  SET_CIRCLE_REVERB_DAMPING: 'SET_CIRCLE_REVERB_DAMPING',
  SET_CIRCLE_REVERB_MIX: 'SET_CIRCLE_REVERB_MIX',
  
  SET_CIRCLE_DISTORTION_ENABLED: 'SET_CIRCLE_DISTORTION_ENABLED',
  SET_CIRCLE_DISTORTION_AMOUNT: 'SET_CIRCLE_DISTORTION_AMOUNT',
  SET_CIRCLE_DISTORTION_OVERSAMPLE: 'SET_CIRCLE_DISTORTION_OVERSAMPLE',
  SET_CIRCLE_DISTORTION_MIX: 'SET_CIRCLE_DISTORTION_MIX',
  
  SET_CIRCLE_TREMOLO_ENABLED: 'SET_CIRCLE_TREMOLO_ENABLED',
  SET_CIRCLE_TREMOLO_RATE: 'SET_CIRCLE_TREMOLO_RATE',
  SET_CIRCLE_TREMOLO_DEPTH: 'SET_CIRCLE_TREMOLO_DEPTH',
  SET_CIRCLE_TREMOLO_MIX: 'SET_CIRCLE_TREMOLO_MIX',

  // Reset actions
  RESET_ALL_CONTROLS: 'RESET_ALL_CONTROLS'
}

// Reducer function
function audioReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_SCALE:
      return {
        ...state,
        currentScale: action.payload
      }
      
    case ActionTypes.SET_GLOBAL_VOLUME:
      return {
        ...state,
        globalVolume: action.payload
      }
      
    // Wall sound reducers
    case ActionTypes.SET_WALL_DURATION:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          duration: action.payload
        }
      }
      
    case ActionTypes.SET_WALL_DETUNE:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          detune: action.payload
        }
      }
      
    case ActionTypes.SET_WALL_WAVEFORM:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          waveform: action.payload
        }
      }
      
    case ActionTypes.SET_WALL_VOLUME:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          volume: action.payload
        }
      }
      
    case ActionTypes.SET_WALL_DELAY_ENABLED:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          delay: {
            ...state.wallSettings.delay,
            enabled: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_DELAY_TIME:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          delay: {
            ...state.wallSettings.delay,
            time: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_DELAY_FEEDBACK:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          delay: {
            ...state.wallSettings.delay,
            feedback: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_DELAY_MIX:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          delay: {
            ...state.wallSettings.delay,
            mix: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_REVERB_ENABLED:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          reverb: {
            ...state.wallSettings.reverb,
            enabled: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_REVERB_ROOM_SIZE:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          reverb: {
            ...state.wallSettings.reverb,
            roomSize: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_REVERB_DAMPING:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          reverb: {
            ...state.wallSettings.reverb,
            damping: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_REVERB_MIX:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          reverb: {
            ...state.wallSettings.reverb,
            mix: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_DISTORTION_ENABLED:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          distortion: {
            ...state.wallSettings.distortion,
            enabled: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_DISTORTION_AMOUNT:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          distortion: {
            ...state.wallSettings.distortion,
            amount: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_DISTORTION_OVERSAMPLE:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          distortion: {
            ...state.wallSettings.distortion,
            oversample: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_DISTORTION_MIX:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          distortion: {
            ...state.wallSettings.distortion,
            mix: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_TREMOLO_ENABLED:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          tremolo: {
            ...state.wallSettings.tremolo,
            enabled: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_TREMOLO_RATE:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          tremolo: {
            ...state.wallSettings.tremolo,
            rate: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_TREMOLO_DEPTH:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          tremolo: {
            ...state.wallSettings.tremolo,
            depth: action.payload
          }
        }
      }
      
    case ActionTypes.SET_WALL_TREMOLO_MIX:
      return {
        ...state,
        wallSettings: {
          ...state.wallSettings,
          tremolo: {
            ...state.wallSettings.tremolo,
            mix: action.payload
          }
        }
      }
      
    // Circle sound reducers
    case ActionTypes.SET_CIRCLE_DURATION:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          duration: action.payload
        }
      }
      
    case ActionTypes.SET_CIRCLE_DETUNE:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          detune: action.payload
        }
      }
      
    case ActionTypes.SET_CIRCLE_WAVEFORM:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          waveform: action.payload
        }
      }
      
    case ActionTypes.SET_CIRCLE_VOLUME:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          volume: action.payload
        }
      }
      
    case ActionTypes.SET_CIRCLE_DELAY_ENABLED:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          delay: {
            ...state.circleSettings.delay,
            enabled: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_DELAY_TIME:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          delay: {
            ...state.circleSettings.delay,
            time: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_DELAY_FEEDBACK:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          delay: {
            ...state.circleSettings.delay,
            feedback: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_DELAY_MIX:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          delay: {
            ...state.circleSettings.delay,
            mix: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_REVERB_ENABLED:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          reverb: {
            ...state.circleSettings.reverb,
            enabled: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_REVERB_ROOM_SIZE:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          reverb: {
            ...state.circleSettings.reverb,
            roomSize: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_REVERB_DAMPING:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          reverb: {
            ...state.circleSettings.reverb,
            damping: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_REVERB_MIX:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          reverb: {
            ...state.circleSettings.reverb,
            mix: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_DISTORTION_ENABLED:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          distortion: {
            ...state.circleSettings.distortion,
            enabled: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_DISTORTION_AMOUNT:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          distortion: {
            ...state.circleSettings.distortion,
            amount: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_DISTORTION_OVERSAMPLE:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          distortion: {
            ...state.circleSettings.distortion,
            oversample: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_DISTORTION_MIX:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          distortion: {
            ...state.circleSettings.distortion,
            mix: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_TREMOLO_ENABLED:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          tremolo: {
            ...state.circleSettings.tremolo,
            enabled: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_TREMOLO_RATE:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          tremolo: {
            ...state.circleSettings.tremolo,
            rate: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_TREMOLO_DEPTH:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          tremolo: {
            ...state.circleSettings.tremolo,
            depth: action.payload
          }
        }
      }
      
    case ActionTypes.SET_CIRCLE_TREMOLO_MIX:
      return {
        ...state,
        circleSettings: {
          ...state.circleSettings,
          tremolo: {
            ...state.circleSettings.tremolo,
            mix: action.payload
          }
        }
      }

    case ActionTypes.RESET_ALL_CONTROLS:
      return {
        ...initialState
      }

    default:
      return state
  }
}

// Create context
const AudioContext = createContext()

// Provider component
export function AudioProvider({ children }) {
  const [state, dispatch] = useReducer(audioReducer, initialState)
  
  // Initialize audio context on mount
  useEffect(() => {
    // Initialize the audio context
    initAudioContext();
  }, []);
  
  // Apply audio settings to sound.js whenever state changes
  useEffect(() => {
    // Set scale
    setScale(state.currentScale)
    
    // Set global volume
    setGlobalVolume(state.globalVolume)
    
    // Set wall sound parameters
    setWallDuration(state.wallSettings.duration)
    setWallDetune(state.wallSettings.detune)
    setWallWaveform(state.wallSettings.waveform)
    setWallVolume(state.wallSettings.volume)
    
    // Set wall delay parameters
    setWallDelayEnabled(state.wallSettings.delay.enabled)
    setWallDelayTime(state.wallSettings.delay.time)
    setWallDelayFeedback(state.wallSettings.delay.feedback)
    setWallDelayMix(state.wallSettings.delay.mix)
    
    // Set wall reverb parameters
    setWallReverbEnabled(state.wallSettings.reverb.enabled)
    setWallReverbRoomSize(state.wallSettings.reverb.roomSize)
    setWallReverbDamping(state.wallSettings.reverb.damping)
    setWallReverbMix(state.wallSettings.reverb.mix)
    
    // Set wall distortion parameters
    setWallDistortionEnabled(state.wallSettings.distortion.enabled)
    setWallDistortionAmount(state.wallSettings.distortion.amount)
    setWallDistortionOversample(state.wallSettings.distortion.oversample)
    setWallDistortionMix(state.wallSettings.distortion.mix)
    
    // Set wall tremolo parameters
    setWallTremoloEnabled(state.wallSettings.tremolo.enabled)
    setWallTremoloRate(state.wallSettings.tremolo.rate)
    setWallTremoloDepth(state.wallSettings.tremolo.depth)
    setWallTremoloMix(state.wallSettings.tremolo.mix)
    
    // Set circle sound parameters
    setCircleDuration(state.circleSettings.duration)
    setCircleDetune(state.circleSettings.detune)
    setCircleWaveform(state.circleSettings.waveform)
    setCircleVolume(state.circleSettings.volume)
    
    // Set circle delay parameters
    setCircleDelayEnabled(state.circleSettings.delay.enabled)
    setCircleDelayTime(state.circleSettings.delay.time)
    setCircleDelayFeedback(state.circleSettings.delay.feedback)
    setCircleDelayMix(state.circleSettings.delay.mix)
    
    // Set circle reverb parameters
    setCircleReverbEnabled(state.circleSettings.reverb.enabled)
    setCircleReverbRoomSize(state.circleSettings.reverb.roomSize)
    setCircleReverbDamping(state.circleSettings.reverb.damping)
    setCircleReverbMix(state.circleSettings.reverb.mix)
    
    // Set circle distortion parameters
    setCircleDistortionEnabled(state.circleSettings.distortion.enabled)
    setCircleDistortionAmount(state.circleSettings.distortion.amount)
    setCircleDistortionOversample(state.circleSettings.distortion.oversample)
    setCircleDistortionMix(state.circleSettings.distortion.mix)
    
    // Set circle tremolo parameters
    setCircleTremoloEnabled(state.circleSettings.tremolo.enabled)
    setCircleTremoloRate(state.circleSettings.tremolo.rate)
    setCircleTremoloDepth(state.circleSettings.tremolo.depth)
    setCircleTremoloMix(state.circleSettings.tremolo.mix)
  }, [state])
  
  // Action creators
  const setCurrentScale = (scale) => {
    dispatch({ type: ActionTypes.SET_SCALE, payload: scale })
  }
  
  const setGlobalVolumeValue = (volume) => {
    dispatch({ type: ActionTypes.SET_GLOBAL_VOLUME, payload: volume })
  }
  
  // Wall sound action creators
  const setWallDurationValue = (duration) => {
    dispatch({ type: ActionTypes.SET_WALL_DURATION, payload: duration })
  }
  
  const setWallDetuneValue = (detune) => {
    dispatch({ type: ActionTypes.SET_WALL_DETUNE, payload: detune })
  }
  
  const setWallWaveformValue = (waveform) => {
    dispatch({ type: ActionTypes.SET_WALL_WAVEFORM, payload: waveform })
  }
  
  const setWallVolumeValue = (volume) => {
    dispatch({ type: ActionTypes.SET_WALL_VOLUME, payload: volume })
  }
  
  const setWallDelayEnabledValue = (enabled) => {
    dispatch({ type: ActionTypes.SET_WALL_DELAY_ENABLED, payload: enabled })
  }
  
  const setWallDelayTimeValue = (time) => {
    dispatch({ type: ActionTypes.SET_WALL_DELAY_TIME, payload: time })
  }
  
  const setWallDelayFeedbackValue = (feedback) => {
    dispatch({ type: ActionTypes.SET_WALL_DELAY_FEEDBACK, payload: feedback })
  }
  
  const setWallDelayMixValue = (mix) => {
    dispatch({ type: ActionTypes.SET_WALL_DELAY_MIX, payload: mix })
  }
  
  const setWallReverbEnabledValue = (enabled) => {
    dispatch({ type: ActionTypes.SET_WALL_REVERB_ENABLED, payload: enabled })
  }
  
  const setWallReverbRoomSizeValue = (roomSize) => {
    dispatch({ type: ActionTypes.SET_WALL_REVERB_ROOM_SIZE, payload: roomSize })
  }
  
  const setWallReverbDampingValue = (damping) => {
    dispatch({ type: ActionTypes.SET_WALL_REVERB_DAMPING, payload: damping })
  }
  
  const setWallReverbMixValue = (mix) => {
    dispatch({ type: ActionTypes.SET_WALL_REVERB_MIX, payload: mix })
  }
  
  const setWallDistortionEnabledValue = (enabled) => {
    dispatch({ type: ActionTypes.SET_WALL_DISTORTION_ENABLED, payload: enabled })
  }
  
  const setWallDistortionAmountValue = (amount) => {
    dispatch({ type: ActionTypes.SET_WALL_DISTORTION_AMOUNT, payload: amount })
  }
  
  const setWallDistortionOversampleValue = (oversample) => {
    dispatch({ type: ActionTypes.SET_WALL_DISTORTION_OVERSAMPLE, payload: oversample })
  }
  
  const setWallDistortionMixValue = (mix) => {
    dispatch({ type: ActionTypes.SET_WALL_DISTORTION_MIX, payload: mix })
  }
  
  const setWallTremoloEnabledValue = (enabled) => {
    dispatch({ type: ActionTypes.SET_WALL_TREMOLO_ENABLED, payload: enabled })
  }
  
  const setWallTremoloRateValue = (rate) => {
    dispatch({ type: ActionTypes.SET_WALL_TREMOLO_RATE, payload: rate })
  }
  
  const setWallTremoloDepthValue = (depth) => {
    dispatch({ type: ActionTypes.SET_WALL_TREMOLO_DEPTH, payload: depth })
  }
  
  const setWallTremoloMixValue = (mix) => {
    dispatch({ type: ActionTypes.SET_WALL_TREMOLO_MIX, payload: mix })
  }
  
  // Circle sound action creators
  const setCircleDurationValue = (duration) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DURATION, payload: duration })
  }
  
  const setCircleDetuneValue = (detune) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DETUNE, payload: detune })
  }
  
  const setCircleWaveformValue = (waveform) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_WAVEFORM, payload: waveform })
  }
  
  const setCircleVolumeValue = (volume) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_VOLUME, payload: volume })
  }
  
  const setCircleDelayEnabledValue = (enabled) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DELAY_ENABLED, payload: enabled })
  }
  
  const setCircleDelayTimeValue = (time) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DELAY_TIME, payload: time })
  }
  
  const setCircleDelayFeedbackValue = (feedback) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DELAY_FEEDBACK, payload: feedback })
  }
  
  const setCircleDelayMixValue = (mix) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DELAY_MIX, payload: mix })
  }
  
  const setCircleReverbEnabledValue = (enabled) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_REVERB_ENABLED, payload: enabled })
  }
  
  const setCircleReverbRoomSizeValue = (roomSize) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_REVERB_ROOM_SIZE, payload: roomSize })
  }
  
  const setCircleReverbDampingValue = (damping) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_REVERB_DAMPING, payload: damping })
  }
  
  const setCircleReverbMixValue = (mix) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_REVERB_MIX, payload: mix })
  }
  
  const setCircleDistortionEnabledValue = (enabled) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DISTORTION_ENABLED, payload: enabled })
  }
  
  const setCircleDistortionAmountValue = (amount) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DISTORTION_AMOUNT, payload: amount })
  }
  
  const setCircleDistortionOversampleValue = (oversample) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DISTORTION_OVERSAMPLE, payload: oversample })
  }
  
  const setCircleDistortionMixValue = (mix) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_DISTORTION_MIX, payload: mix })
  }
  
  const setCircleTremoloEnabledValue = (enabled) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_TREMOLO_ENABLED, payload: enabled })
  }
  
  const setCircleTremoloRateValue = (rate) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_TREMOLO_RATE, payload: rate })
  }
  
  const setCircleTremoloDepthValue = (depth) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_TREMOLO_DEPTH, payload: depth })
  }
  
  const setCircleTremoloMixValue = (mix) => {
    dispatch({ type: ActionTypes.SET_CIRCLE_TREMOLO_MIX, payload: mix })
  }

  // Reset all controls to defaults
  const resetAllControls = () => {
    dispatch({ type: ActionTypes.RESET_ALL_CONTROLS })
  }

  // Context value
  const value = {
    // State
    currentScale: state.currentScale,
    globalVolume: state.globalVolume,
    wallSettings: state.wallSettings,
    circleSettings: state.circleSettings,
    
    // Constants
    AVAILABLE_SCALES,
    WAVEFORMS,
    
    // Action creators
    setCurrentScale,
    setGlobalVolume: setGlobalVolumeValue,
    
    // Wall sound actions
    setWallDuration: setWallDurationValue,
    setWallDetune: setWallDetuneValue,
    setWallWaveform: setWallWaveformValue,
    setWallVolume: setWallVolumeValue,
    
    setWallDelayEnabled: setWallDelayEnabledValue,
    setWallDelayTime: setWallDelayTimeValue,
    setWallDelayFeedback: setWallDelayFeedbackValue,
    setWallDelayMix: setWallDelayMixValue,
    
    setWallReverbEnabled: setWallReverbEnabledValue,
    setWallReverbRoomSize: setWallReverbRoomSizeValue,
    setWallReverbDamping: setWallReverbDampingValue,
    setWallReverbMix: setWallReverbMixValue,
    
    setWallDistortionEnabled: setWallDistortionEnabledValue,
    setWallDistortionAmount: setWallDistortionAmountValue,
    setWallDistortionOversample: setWallDistortionOversampleValue,
    setWallDistortionMix: setWallDistortionMixValue,
    
    setWallTremoloEnabled: setWallTremoloEnabledValue,
    setWallTremoloRate: setWallTremoloRateValue,
    setWallTremoloDepth: setWallTremoloDepthValue,
    setWallTremoloMix: setWallTremoloMixValue,
    
    // Circle sound actions
    setCircleDuration: setCircleDurationValue,
    setCircleDetune: setCircleDetuneValue,
    setCircleWaveform: setCircleWaveformValue,
    setCircleVolume: setCircleVolumeValue,
    
    setCircleDelayEnabled: setCircleDelayEnabledValue,
    setCircleDelayTime: setCircleDelayTimeValue,
    setCircleDelayFeedback: setCircleDelayFeedbackValue,
    setCircleDelayMix: setCircleDelayMixValue,
    
    setCircleReverbEnabled: setCircleReverbEnabledValue,
    setCircleReverbRoomSize: setCircleReverbRoomSizeValue,
    setCircleReverbDamping: setCircleReverbDampingValue,
    setCircleReverbMix: setCircleReverbMixValue,
    
    setCircleDistortionEnabled: setCircleDistortionEnabledValue,
    setCircleDistortionAmount: setCircleDistortionAmountValue,
    setCircleDistortionOversample: setCircleDistortionOversampleValue,
    setCircleDistortionMix: setCircleDistortionMixValue,
    
    setCircleTremoloEnabled: setCircleTremoloEnabledValue,
    setCircleTremoloRate: setCircleTremoloRateValue,
    setCircleTremoloDepth: setCircleTremoloDepthValue,
    setCircleTremoloMix: setCircleTremoloMixValue,

    // Reset function
    resetAllControls
  }
  
  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  )
}

// Custom hook to use the audio context
export function useAudio() {
  const context = useContext(AudioContext)
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}

export default AudioContext
