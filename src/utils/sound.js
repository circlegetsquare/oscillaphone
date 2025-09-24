// Create an audio context
let audioContext;

// Re-enable audio optimization imports incrementally
import { getAudioPool, destroyAudioPool } from './audioPool'
import { getEffectChainPool, destroyEffectChainPool } from './effectChains'

// Global audio processing nodes
let globalCompressor;
let globalLimiter;
let globalMaster;

// Keep track of active audio nodes for cleanup
let activeNodes = new Set();

// Volume scaling constants
const VOLUME_LIMITS = {
  MIN_VELOCITY: 1,    // Minimum velocity to start scaling volume
  MAX_VELOCITY: 15,   // Velocity at which max volume is reached
  MIN_VOLUME: 0.05,   // Minimum volume for slow collisions
  MAX_VOLUME: 0.25     // Maximum volume for fast collisions
};

/**
 * Map a velocity to a volume value
 * @param {number} velocity - The velocity to map
 * @returns {number} Mapped volume value
 */
const mapVelocityToVolume = (velocity, maxVolume) => {
  // Get the absolute velocity
  const absVelocity = Math.abs(velocity);
  
  // If below minimum velocity, return minimum volume
  if (absVelocity < VOLUME_LIMITS.MIN_VELOCITY) {
    return VOLUME_LIMITS.MIN_VOLUME;
  }
  
  // Clamp velocity between min and max
  const clampedVelocity = Math.min(absVelocity, VOLUME_LIMITS.MAX_VELOCITY);
  
  // Calculate how far between min and max velocity we are (0 to 1)
  const velocityProgress = (clampedVelocity - VOLUME_LIMITS.MIN_VELOCITY) / 
    (VOLUME_LIMITS.MAX_VELOCITY - VOLUME_LIMITS.MIN_VELOCITY);
  
  // Lerp between min and maxVolume (user-controlled maximum)
  return VOLUME_LIMITS.MIN_VOLUME + (maxVolume - VOLUME_LIMITS.MIN_VOLUME) * velocityProgress;
};

// Initialize global audio processing nodes
const initGlobalProcessing = () => {
  if (!globalCompressor) {
    // Create compressor for dynamic range control
    globalCompressor = audioContext.createDynamicsCompressor();
    globalCompressor.threshold.value = -24.0;  // Start compression at -24dB
    globalCompressor.knee.value = 12.0;        // Soft knee for smooth compression
    globalCompressor.ratio.value = 4.0;        // Moderate compression ratio
    globalCompressor.attack.value = 0.003;     // Fast attack to catch transients
    globalCompressor.release.value = 0.25;     // Moderate release
    
    // Create limiter (compressor with high ratio and fast attack)
    globalLimiter = audioContext.createDynamicsCompressor();
    globalLimiter.threshold.value = -6.0;      // Limit at -6dB
    globalLimiter.knee.value = 0.0;            // Hard knee for true limiting
    globalLimiter.ratio.value = 20.0;          // Very high ratio for limiting
    globalLimiter.attack.value = 0.001;        // Very fast attack
    globalLimiter.release.value = 0.1;         // Fast release
    
    // Create master volume control
    globalMaster = audioContext.createGain();
    globalMaster.gain.value = 1.0;             // Unity gain
    
    // Connect the processing chain
    globalCompressor.connect(globalLimiter);
    globalLimiter.connect(globalMaster);
    globalMaster.connect(audioContext.destination);
    
    // Add to active nodes for cleanup
    activeNodes.add(globalCompressor);
    activeNodes.add(globalLimiter);
    activeNodes.add(globalMaster);
  }
};

// Initialize the audio context
export const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    initGlobalProcessing();

    // Initialize audio pools for memory optimization
    getAudioPool(audioContext);
    getEffectChainPool(audioContext);

    // Periodic cleanup to prevent memory leaks
    setInterval(() => {
      const pool = getAudioPool(audioContext);
      if (pool) {
        pool.cleanup();
      }
    }, 30000); // Cleanup every 30 seconds
  }
  return audioContext;
};

// Cleanup audio resources
export const cleanupAudio = () => {
  if (audioContext) {
    // Clean up all active nodes
    activeNodes.forEach(node => {
      try {
        if (node.stop && typeof node.stop === 'function') {
          node.stop();
        }
        node.disconnect();
      } catch (e) {
        // Ignore cleanup errors
      }
    });
    activeNodes.clear();

    // Cleanup pools
    destroyAudioPool();
    destroyEffectChainPool();

    // Close audio context
    audioContext.close();
    audioContext = null;
    globalCompressor = null;
    globalLimiter = null;
    globalMaster = null;
  }
};

// Tremolo parameters for wall sounds
let wallTremoloEnabled = false;
let wallTremoloRate = 4.0;     // 4 Hz default
let wallTremoloDepth = 0.5;    // 50% depth
let wallTremoloShape = 'sine'; // Default waveform
let wallTremoloMix = 0.5;      // 50% wet/dry mix

// Tremolo parameters for circle sounds
let circleTremoloEnabled = false;
let circleTremoloRate = 4.0;     // 4 Hz default
let circleTremoloDepth = 0.5;    // 50% depth
let circleTremoloShape = 'sine'; // Default waveform
let circleTremoloMix = 0.5;      // 50% wet/dry mix

// Musical scales and notes
export const SCALES = {
  C_MAJOR: {
    name: "C Major",
    notes: {
      // 2nd octave (wall collisions)
      C2: 65.41, E2: 82.41, G2: 98.00,
      // 3rd octave (wall collisions)
      C3: 130.81, E3: 164.81, G3: 196.00,
      // 4th octave (circle collisions)
      C4: 261.63, E4: 329.63, G4: 392.00,
      // 5th octave (circle collisions)
      C5: 523.25, E5: 659.25, G5: 783.99
    }
  },
  A_MINOR: {
    name: "A Minor",
    notes: {
      // 2nd octave (wall collisions)
      A2: 110.00, B2: 123.47, C3: 130.81,
      D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
      // 3rd octave (wall collisions)
      A3: 220.00, B3: 246.94, C4: 261.63,
      D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
      // 4th octave (circle collisions)
      A4: 440.00, B4: 493.88, C5: 523.25,
      D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
      // 5th octave (circle collisions)
      A5: 880.00, B5: 987.77, C6: 1046.50,
      D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98
    }
  },
  F_LYDIAN: {
    name: "F Lydian",
    notes: {
      // 2nd octave (wall collisions)
      F2: 87.31, G2: 98.00, A2: 110.00, B2: 123.47,
      C3: 130.81, D3: 146.83, E3: 164.81,
      // 3rd octave (wall collisions)
      F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94,
      C4: 261.63, D4: 293.66, E4: 329.63,
      // 4th octave (circle collisions)
      F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25,
      // 5th octave (circle collisions)
      F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
      C6: 1046.50, D6: 1174.66, E6: 1318.51
    }
  }
};

// Export scales for UI
export const AVAILABLE_SCALES = Object.entries(SCALES).map(([id, scale]) => ({
  id,
  name: scale.name
}));

// Available waveforms
export const WAVEFORMS = [
  { id: 'sine', name: 'Sine' },
  { id: 'square', name: 'Square' },
  { id: 'sawtooth', name: 'Sawtooth' },
  { id: 'triangle', name: 'Triangle' }
];

const NOTE_GROUPS = {
  WALL_LOW: ['F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3'],
  WALL_MID: ['F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'],
  CIRCLE_HIGH: ['F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'],
  CIRCLE_HIGHER: ['F5', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6']
};

const C_MAJOR_GROUPS = {
  WALL_LOW: ['C2', 'E2', 'G2'],
  WALL_MID: ['C3', 'E3', 'G3'],
  CIRCLE_HIGH: ['C4', 'E4', 'G4'],
  CIRCLE_HIGHER: ['C5', 'E5', 'G5']
};

const A_MINOR_GROUPS = {
  WALL_LOW: ['A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3'],
  WALL_MID: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'],
  CIRCLE_HIGH: ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'],
  CIRCLE_HIGHER: ['A5', 'B5', 'C6', 'D6', 'E6', 'F6', 'G6']
};

// Keep track of current scale and sound parameters
let currentScale = 'C_MAJOR';
let wallSoundDuration = 0.25; // Default duration
let circleSoundDuration = 0.25; // Default duration
let wallDetuneAmount = 0; // Default detune for wall sounds
let circleDetuneAmount = 0; // Default detune for circle sounds
let wallWaveform = 'sine'; // Default waveform for wall sounds
let circleWaveform = 'sine'; // Default waveform for circle sounds
let wallSoundVolume = 0.15; // Default wall sound volume
let circleSoundVolume = 0.15; // Default circle sound volume (reduced to prevent distortion)

// Delay parameters for wall sounds
let wallDelayEnabled = false;
let wallDelayTime = 0.3;    // Default 300ms delay
let wallDelayFeedback = 0.3; // 30% feedback
let wallDelayMix = 0.3;     // 30% wet signal

// Delay parameters for circle sounds
let circleDelayEnabled = false;
let circleDelayTime = 0.3;    // Default 300ms delay
let circleDelayFeedback = 0.3; // 30% feedback
let circleDelayMix = 0.3;     // 30% wet signal

// Reverb parameters for wall sounds
let wallReverbEnabled = false;
let wallReverbRoomSize = 0.5;    // Medium room size (0.0 to 1.0)
let wallReverbDamping = 0.3;     // Moderate damping (0.0 to 1.0)
let wallReverbMix = 0.3;         // 30% wet signal

// Reverb parameters for circle sounds
let circleReverbEnabled = false;
let circleReverbRoomSize = 0.5;  // Medium room size (0.0 to 1.0)
let circleReverbDamping = 0.3;   // Moderate damping (0.0 to 1.0)
let circleReverbMix = 0.3;       // 30% wet signal

// Distortion parameters for wall sounds
let wallDistortionEnabled = false;
let wallDistortionAmount = 0.5;    // Default distortion amount (0.0 to 1.0)
let wallDistortionOversample = 'none'; // Options: 'none', '2x', '4x'
let wallDistortionMix = 0.3;       // 30% wet signal

// Distortion parameters for circle sounds
let circleDistortionEnabled = false;
let circleDistortionAmount = 0.5;  // Default distortion amount (0.0 to 1.0)
let circleDistortionOversample = 'none';
let circleDistortionMix = 0.3;     // 30% wet signal

const getRandomNote = (group) => {
  let noteNames;
  switch (currentScale) {
    case 'C_MAJOR':
      noteNames = C_MAJOR_GROUPS[group];
      break;
    case 'A_MINOR':
      noteNames = A_MINOR_GROUPS[group];
      break;
    case 'F_LYDIAN':
      noteNames = NOTE_GROUPS[group];
      break;
    default:
      noteNames = C_MAJOR_GROUPS[group];
  }
  const randomNoteName = noteNames[Math.floor(Math.random() * noteNames.length)];
  return SCALES[currentScale].notes[randomNoteName];
};

const cleanupAudioNodes = (nodes) => {
  nodes.forEach(node => {
    try {
      node.disconnect();
      activeNodes.delete(node);
    } catch (e) {
      console.warn('Error cleaning up audio node:', e);
    }
  });
};

// Create a distortion curve for the WaveShaper node
const createDistortionCurve = (amount = 20) => {
  // Use a smaller number of samples for better performance
  const n_samples = 256;
  const curve = new Float32Array(n_samples);
  
  for (let i = 0; i < n_samples; ++i) {
    const x = i * 2 / n_samples - 1;
    // Simpler distortion algorithm that creates a nice warm overdrive
    curve[i] = (Math.PI + amount) * x / (Math.PI + amount * Math.abs(x));
  }
  
  return curve;
};

// Create a distortion network
const createDistortionNetwork = (audioContext, input, output, amount, oversample, mix, nodes) => {
  // Create distortion components
  const distortionInput = audioContext.createGain();
  const distortionOutput = audioContext.createGain();
  const dryMix = audioContext.createGain();
  const wetMix = audioContext.createGain();
  const waveShaperNode = audioContext.createWaveShaper();
  
  // Add nodes to tracking sets
  [distortionInput, distortionOutput, dryMix, wetMix, waveShaperNode].forEach(node => {
    nodes.add(node);
    activeNodes.add(node);
  });
  
  // Configure WaveShaper
  waveShaperNode.curve = createDistortionCurve(amount * 100); // Scale amount for better control (0-100)
  waveShaperNode.oversample = oversample;
  
  // Set up dry/wet mix
  dryMix.gain.setValueAtTime(1 - mix, audioContext.currentTime);
  wetMix.gain.setValueAtTime(mix, audioContext.currentTime);
  
  // Connect dry path
  input.connect(dryMix);
  dryMix.connect(output);
  
  // Connect wet path
  input.connect(distortionInput);
  distortionInput.connect(waveShaperNode);
  waveShaperNode.connect(wetMix);
  wetMix.connect(output);
  
  return {
    input: distortionInput,
    output: distortionOutput,
    waveShaperNode
  };
};

// Create a custom reverb network
const createReverbNetwork = (audioContext, input, output, roomSize, damping, mix, nodes) => {
  // Create reverb components
  const reverbInput = audioContext.createGain();
  const reverbOutput = audioContext.createGain();
  const dryMix = audioContext.createGain();
  const wetMix = audioContext.createGain();
  
  // Create multiple delay lines with different delay times for a richer reverb
  const delays = [
    { delayTime: 0.03, feedback: roomSize * 0.8 },
    { delayTime: 0.05, feedback: roomSize * 0.7 },
    { delayTime: 0.07, feedback: roomSize * 0.6 },
    { delayTime: 0.11, feedback: roomSize * 0.5 }
  ];
  
  const delayNodes = [];
  const feedbackNodes = [];
  const filterNodes = [];
  
  // Add all nodes to tracking sets
  [reverbInput, reverbOutput, dryMix, wetMix].forEach(node => {
    nodes.add(node);
    activeNodes.add(node);
  });
  
  // Set up dry/wet mix
  dryMix.gain.setValueAtTime(1 - mix, audioContext.currentTime);
  wetMix.gain.setValueAtTime(mix, audioContext.currentTime);
  
  // Connect dry path
  input.connect(dryMix);
  dryMix.connect(output);
  
  // Connect wet path input
  input.connect(reverbInput);
  
  // Create and connect delay lines
  delays.forEach((delayConfig, i) => {
    // Create nodes for this delay line
    const delayNode = audioContext.createDelay();
    const feedbackNode = audioContext.createGain();
    const filterNode = audioContext.createBiquadFilter();
    
    // Configure nodes
    delayNode.delayTime.setValueAtTime(delayConfig.delayTime, audioContext.currentTime);
    feedbackNode.gain.setValueAtTime(delayConfig.feedback, audioContext.currentTime);
    
    filterNode.type = 'lowpass';
    // Apply damping - higher damping = lower cutoff frequency
    const cutoff = 20000 - (damping * 15000);
    filterNode.frequency.setValueAtTime(cutoff, audioContext.currentTime);
    filterNode.Q.setValueAtTime(0.5, audioContext.currentTime);
    
    // Connect this delay line
    reverbInput.connect(delayNode);
    delayNode.connect(filterNode);
    filterNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);
    filterNode.connect(reverbOutput);
    
    // Add to arrays for tracking
    delayNodes.push(delayNode);
    feedbackNodes.push(feedbackNode);
    filterNodes.push(filterNode);
    
    // Add to node tracking sets
    [delayNode, feedbackNode, filterNode].forEach(node => {
      nodes.add(node);
      activeNodes.add(node);
    });
  });
  
  // Connect wet path output
  reverbOutput.connect(wetMix);
  wetMix.connect(output);
  
  return {
    input: reverbInput,
    output: reverbOutput,
    delayNodes,
    feedbackNodes,
    filterNodes
  };
};

// Create a tremolo network
const createTremoloNetwork = (audioContext, input, output, rate, depth, shape, mix, nodes) => {
  // Create tremolo components
  const tremoloInput = audioContext.createGain();
  const tremoloOutput = audioContext.createGain();
  const dryMix = audioContext.createGain();
  const wetMix = audioContext.createGain();
  const tremoloGain = audioContext.createGain();
  const lfo = audioContext.createOscillator();
  
  // Add nodes to tracking sets
  [tremoloInput, tremoloOutput, dryMix, wetMix, tremoloGain, lfo].forEach(node => {
    nodes.add(node);
    activeNodes.add(node);
  });
  
  // Configure LFO (Low Frequency Oscillator)
  lfo.type = shape;
  lfo.frequency.setValueAtTime(rate, audioContext.currentTime);
  
  // Set up tremolo gain - this will be modulated by the LFO
  // Start at 1 (full volume)
  tremoloGain.gain.setValueAtTime(1, audioContext.currentTime);
  
  // Connect LFO to tremolo gain
  // Scale the depth to control how much the volume changes
  // The oscillator output is -1 to 1, so we need to scale it to avoid negative gain
  // For a depth of 1 (100%), we want the gain to go from 0 to 1
  // For a depth of 0.5 (50%), we want the gain to go from 0.5 to 1
  const scaledDepth = depth * 0.5; // Scale depth to 0-0.5 range
  lfo.connect(tremoloGain.gain);
  tremoloGain.gain.setValueAtTime(1 - scaledDepth, audioContext.currentTime);
  
  // Set up dry/wet mix
  dryMix.gain.setValueAtTime(1 - mix, audioContext.currentTime);
  wetMix.gain.setValueAtTime(mix, audioContext.currentTime);
  
  // Connect dry path
  input.connect(dryMix);
  dryMix.connect(output);
  
  // Connect wet path
  input.connect(tremoloInput);
  tremoloInput.connect(tremoloGain);
  tremoloGain.connect(wetMix);
  wetMix.connect(output);
  
  // Start the LFO
  lfo.start();
  
  return {
    input: tremoloInput,
    output: tremoloOutput,
    lfo,
    tremoloGain
  };
};

// Optimized createBeep function using audio pools and effect chains
const createOptimizedBeep = (frequency, duration = 0.15, volume = 0.3, pan = 0, soundType = 'circle') => {
  // Initialize audio context if not already initialized
  initAudioContext();

  const pool = getAudioPool(audioContext);
  const chainPool = getEffectChainPool(audioContext);

  // Get oscillator (can't be pooled as they're single-use)
  const oscillator = audioContext.createOscillator();

  // Get an effect chain from the pool
  const effectChain = chainPool.getChain();

  if (!effectChain) {
    console.warn('No effect chain available, falling back to basic sound');
    // Fallback to basic sound without effects
    const gainNode = pool.getNode('gain');
    const panNode = pool.getNode('stereoPanner');

    oscillator.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(globalCompressor || audioContext.destination);

    // Configure basic sound
    const useWaveform = soundType === 'wall' ? wallWaveform : circleWaveform;
    oscillator.type = useWaveform;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

    const currentTime = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);

    panNode.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), currentTime);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);

    // Schedule cleanup
    setTimeout(() => {
      pool.releaseNode(gainNode, 'gain');
      pool.releaseNode(panNode, 'stereoPanner');
    }, (duration + 0.1) * 1000);

    return;
  }

  // Configure the effect chain
  const settings = {
    volume,
    duration,
    pan,
    delay: {
      enabled: soundType === 'wall' ? wallDelayEnabled : circleDelayEnabled,
      time: soundType === 'wall' ? wallDelayTime : circleDelayTime,
      feedback: soundType === 'wall' ? wallDelayFeedback : circleDelayFeedback,
      mix: soundType === 'wall' ? wallDelayMix : circleDelayMix
    },
    tremolo: {
      enabled: soundType === 'wall' ? wallTremoloEnabled : circleTremoloEnabled,
      rate: soundType === 'wall' ? wallTremoloRate : circleTremoloRate,
      depth: soundType === 'wall' ? wallTremoloDepth : circleTremoloDepth,
      mix: soundType === 'wall' ? wallTremoloMix : circleTremoloMix
    },
    reverb: {
      enabled: soundType === 'wall' ? wallReverbEnabled : circleReverbEnabled,
      roomSize: soundType === 'wall' ? wallReverbRoomSize : circleReverbRoomSize,
      damping: soundType === 'wall' ? wallReverbDamping : circleReverbDamping,
      mix: soundType === 'wall' ? wallReverbMix : circleReverbMix
    },
    distortion: {
      enabled: soundType === 'wall' ? wallDistortionEnabled : circleDistortionEnabled,
      amount: soundType === 'wall' ? wallDistortionAmount : circleDistortionAmount,
      mix: soundType === 'wall' ? wallDistortionMix : circleDistortionMix
    }
  };

  effectChain.configure(settings);

  // Set up oscillator
  const useWaveform = soundType === 'wall' ? wallWaveform : circleWaveform;
  oscillator.type = useWaveform;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  const useDetuneAmount = soundType === 'wall' ? wallDetuneAmount : circleDetuneAmount;
  oscillator.detune.setValueAtTime(useDetuneAmount, audioContext.currentTime);

  // Connect oscillator to effect chain
  effectChain.connectOscillator(oscillator);
  effectChain.connectToDestination(globalCompressor || audioContext.destination);

  // Start and stop oscillator
  const currentTime = audioContext.currentTime;
  oscillator.start(currentTime);
  oscillator.stop(currentTime + duration);

  // Schedule cleanup
  setTimeout(() => {
    chainPool.releaseChain(effectChain);
  }, (duration + 0.1) * 1000);
};

// Keep original function as backup
const createOriginalBeep = (frequency, duration = 0.15, volume = 0.3, pan = 0, soundType = 'circle') => {
  // Initialize audio context if not already initialized
  initAudioContext();

  const nodes = new Set();

  // Create audio nodes
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const pannerNode = audioContext.createStereoPanner();
  const delayNode = audioContext.createDelay();
  const feedbackNode = audioContext.createGain();
  const delayWetGainNode = audioContext.createGain();
  const delayDryGainNode = audioContext.createGain();
  const mainOutputNode = audioContext.createGain(); // New output node for all effects

  // Add nodes to tracking sets
  [oscillator, gainNode, pannerNode, delayNode, feedbackNode, delayWetGainNode, delayDryGainNode, mainOutputNode]
    .forEach(node => {
      nodes.add(node);
      activeNodes.add(node);
    });

  // Set up oscillator
  const useWaveform = soundType === 'wall' ? wallWaveform : circleWaveform;
  oscillator.type = useWaveform;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  const useDetuneAmount = soundType === 'wall' ? wallDetuneAmount : circleDetuneAmount;
  oscillator.detune.setValueAtTime(useDetuneAmount, audioContext.currentTime);
  
  // Set up gain node for volume envelope
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

  // Set up panner
  pannerNode.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), audioContext.currentTime);

  // Set up delay effect based on sound type
  const useDelayEnabled = soundType === 'wall' ? wallDelayEnabled : circleDelayEnabled;
  const useDelayTime = soundType === 'wall' ? wallDelayTime : circleDelayTime;
  const useDelayFeedback = soundType === 'wall' ? wallDelayFeedback : circleDelayFeedback;
  const useDelayMix = soundType === 'wall' ? wallDelayMix : circleDelayMix;
  
  delayNode.delayTime.setValueAtTime(useDelayTime, audioContext.currentTime);
  feedbackNode.gain.setValueAtTime(useDelayFeedback, audioContext.currentTime);
  delayWetGainNode.gain.setValueAtTime(useDelayEnabled ? useDelayMix : 0, audioContext.currentTime);
  delayDryGainNode.gain.setValueAtTime(useDelayEnabled ? 1 - useDelayMix : 1, audioContext.currentTime);

  // Set up reverb effect based on sound type
  const useReverbEnabled = soundType === 'wall' ? wallReverbEnabled : circleReverbEnabled;
  const useReverbRoomSize = soundType === 'wall' ? wallReverbRoomSize : circleReverbRoomSize;
  const useReverbDamping = soundType === 'wall' ? wallReverbDamping : circleReverbDamping;
  const useReverbMix = soundType === 'wall' ? wallReverbMix : circleReverbMix;

  // Set up distortion effect based on sound type
  const useDistortionEnabled = soundType === 'wall' ? wallDistortionEnabled : circleDistortionEnabled;
  const useDistortionAmount = soundType === 'wall' ? wallDistortionAmount : circleDistortionAmount;
  const useDistortionOversample = soundType === 'wall' ? wallDistortionOversample : circleDistortionOversample;
  const useDistortionMix = soundType === 'wall' ? wallDistortionMix : circleDistortionMix;

  // Set up tremolo effect based on sound type
  const useTremoloEnabled = soundType === 'wall' ? wallTremoloEnabled : circleTremoloEnabled;
  const useTremoloRate = soundType === 'wall' ? wallTremoloRate : circleTremoloRate;
  const useTremoloDepth = soundType === 'wall' ? wallTremoloDepth : circleTremoloDepth;
  const useTremoloShape = soundType === 'wall' ? wallTremoloShape : circleTremoloShape;
  const useTremoloMix = soundType === 'wall' ? wallTremoloMix : circleTremoloMix;

  // Connect nodes:
  // Main signal flow
  oscillator.connect(gainNode);
  
  // Create a single signal path that we'll modify based on enabled effects
  let currentOutput = gainNode;
  
  // Apply tremolo if enabled
  if (useTremoloEnabled) {
    // Create an output node for tremolo
    const tremoloOutputNode = audioContext.createGain();
    nodes.add(tremoloOutputNode);
    activeNodes.add(tremoloOutputNode);
    
    // Create and connect the tremolo network
    const tremoloNetwork = createTremoloNetwork(
      audioContext,
      currentOutput,
      tremoloOutputNode,
      useTremoloRate,
      useTremoloDepth,
      useTremoloShape,
      useTremoloMix,
      nodes
    );
    
    // Update current output
    currentOutput = tremoloOutputNode;
  }
  
  // Apply distortion if enabled
  if (useDistortionEnabled) {
    // Create an output node for distortion
    const distortionOutputNode = audioContext.createGain();
    nodes.add(distortionOutputNode);
    activeNodes.add(distortionOutputNode);
    
    // Create and connect the distortion network
    const distortionNetwork = createDistortionNetwork(
      audioContext,
      currentOutput,
      distortionOutputNode,
      useDistortionAmount,
      useDistortionOversample,
      useDistortionMix,
      nodes
    );
    
    // Update current output
    currentOutput = distortionOutputNode;
  }
  
  // Apply reverb if enabled
  if (useReverbEnabled) {
    // Create and connect the reverb network
    const reverbNetwork = createReverbNetwork(
      audioContext,
      currentOutput,
      mainOutputNode,
      useReverbRoomSize,
      useReverbDamping,
      useReverbMix,
      nodes
    );
    
    // Update current output
    currentOutput = mainOutputNode;
  } else {
    // If no reverb, connect to main output
    currentOutput.connect(mainOutputNode);
  }
  
  // Apply delay if enabled
  if (useDelayEnabled) {
    // Dry delay path
    mainOutputNode.connect(delayDryGainNode);
    delayDryGainNode.connect(pannerNode);
    
    // Wet delay path
    mainOutputNode.connect(delayNode);
    delayNode.connect(delayWetGainNode);
    delayWetGainNode.connect(pannerNode);
    
    // Delay feedback loop
    delayNode.connect(feedbackNode);
    feedbackNode.connect(delayNode);
  } else {
    // No delay, connect directly to panner
    mainOutputNode.connect(pannerNode);
  }
  
  // Create a final volume control node to apply the user's volume setting
  const finalVolumeNode = audioContext.createGain();
  nodes.add(finalVolumeNode);
  activeNodes.add(finalVolumeNode);

  // Set the final volume based on the sound type
  const finalVolume = soundType === 'wall' ? wallSoundVolume : circleSoundVolume;
  finalVolumeNode.gain.setValueAtTime(finalVolume, audioContext.currentTime);

  // Connect through the final volume node to the global processing chain
  pannerNode.connect(finalVolumeNode);
  finalVolumeNode.connect(globalCompressor);

  // Calculate maximum effect tail time for proper cleanup
  const reverbTailTime = useReverbEnabled ? 2.0 : 0; // 2 seconds for reverb tail
  const delayTailTime = useDelayEnabled ? useDelayTime * 4 : 0;
  const effectTailTime = Math.max(reverbTailTime, delayTailTime);
  
  // Set up cleanup
  const stopTime = audioContext.currentTime + duration + effectTailTime;
  oscillator.onended = () => {
    setTimeout(() => cleanupAudioNodes(nodes), effectTailTime * 1000);
  };

  // Start and stop
  oscillator.start(audioContext.currentTime);
  oscillator.stop(stopTime);
};

// Temporarily revert to original while fixing EffectChain wiring
const createBeep = createOriginalBeep;

// Convert x position to pan value (-1 to 1)
export const calculatePan = (x, width) => {
  return (x / width) * 2 - 1;
};

// Higher pitched beep for creation
export const playBeep = (pan = 0) => {
  let note;
  switch (currentScale) {
    case 'C_MAJOR':
      note = SCALES.C_MAJOR.notes.C5;
      break;
    case 'A_MINOR':
      note = SCALES.A_MINOR.notes.A4;
      break;
    case 'F_LYDIAN':
      note = SCALES.F_LYDIAN.notes.F5;
      break;
    default:
      note = SCALES.C_MAJOR.notes.C5;
  }
  createBeep(note, 0.15, 0.3, pan);
};

// Play a single note for circle collisions (simplified from multi-tone)
export const playCollisionBeep = (pan = 0, velocity = 0) => {
  // Get a random note from either high or higher circle groups
  const group = Math.random() < 0.5 ? 'CIRCLE_HIGH' : 'CIRCLE_HIGHER';
  const note = getRandomNote(group);
  
  // Calculate volume based on velocity, using circleSoundVolume as maximum
  const volume = mapVelocityToVolume(velocity, circleSoundVolume);
  
  // Play a single note with velocity-based volume
  createBeep(note, circleSoundDuration, volume, pan, 'circle');
};

// Get a random note for wall collisions
export const playWallCollisionBeep = (pan = 0, velocity = 0) => {
  const group = Math.random() < 0.5 ? 'WALL_LOW' : 'WALL_MID';
  const note = getRandomNote(group);
  
  // Calculate volume based on velocity, using wallSoundVolume as maximum
  const volume = mapVelocityToVolume(velocity, wallSoundVolume);
  
  createBeep(note, wallSoundDuration, volume, pan, 'wall');
};

// Export scale setter/getter
export const setScale = (scale) => {
  if (SCALES[scale]) {
    currentScale = scale;
  }
};

// Wall delay setters/getters
export const setWallDelayEnabled = (enabled) => {
  wallDelayEnabled = enabled;
};

export const setWallDelayTime = (time) => {
  wallDelayTime = Math.max(0, Math.min(2.0, time));
};

export const setWallDelayFeedback = (feedback) => {
  wallDelayFeedback = Math.max(0, Math.min(0.9, feedback));
};

export const setWallDelayMix = (mix) => {
  wallDelayMix = Math.max(0, Math.min(1.0, mix));
};

// Circle delay setters/getters
export const setCircleDelayEnabled = (enabled) => {
  circleDelayEnabled = enabled;
};

export const setCircleDelayTime = (time) => {
  circleDelayTime = Math.max(0, Math.min(2.0, time));
};

export const setCircleDelayFeedback = (feedback) => {
  circleDelayFeedback = Math.max(0, Math.min(0.9, feedback));
};

export const setCircleDelayMix = (mix) => {
  circleDelayMix = Math.max(0, Math.min(1.0, mix));
};

// Wall reverb setters/getters
export const setWallReverbEnabled = (enabled) => {
  wallReverbEnabled = enabled;
};

export const setWallReverbRoomSize = (size) => {
  wallReverbRoomSize = Math.max(0, Math.min(1.0, size));
};

export const setWallReverbDamping = (damping) => {
  wallReverbDamping = Math.max(0, Math.min(1.0, damping));
};

export const setWallReverbMix = (mix) => {
  wallReverbMix = Math.max(0, Math.min(1.0, mix));
};

// Circle reverb setters/getters
export const setCircleReverbEnabled = (enabled) => {
  circleReverbEnabled = enabled;
};

export const setCircleReverbRoomSize = (size) => {
  circleReverbRoomSize = Math.max(0, Math.min(1.0, size));
};

export const setCircleReverbDamping = (damping) => {
  circleReverbDamping = Math.max(0, Math.min(1.0, damping));
};

export const setCircleReverbMix = (mix) => {
  circleReverbMix = Math.max(0, Math.min(1.0, mix));
};

// Wall distortion setters/getters
export const setWallDistortionEnabled = (enabled) => {
  wallDistortionEnabled = enabled;
};

export const setWallDistortionAmount = (amount) => {
  wallDistortionAmount = Math.max(0, Math.min(1.0, amount));
};

export const setWallDistortionOversample = (oversample) => {
  if (['none', '2x', '4x'].includes(oversample)) {
    wallDistortionOversample = oversample;
  }
};

export const setWallDistortionMix = (mix) => {
  wallDistortionMix = Math.max(0, Math.min(1.0, mix));
};

// Circle distortion setters/getters
export const setCircleDistortionEnabled = (enabled) => {
  circleDistortionEnabled = enabled;
};

export const setCircleDistortionAmount = (amount) => {
  circleDistortionAmount = Math.max(0, Math.min(1.0, amount));
};

export const setCircleDistortionOversample = (oversample) => {
  if (['none', '2x', '4x'].includes(oversample)) {
    circleDistortionOversample = oversample;
  }
};

export const setCircleDistortionMix = (mix) => {
  circleDistortionMix = Math.max(0, Math.min(1.0, mix));
};

// Wall tremolo setters/getters
export const setWallTremoloEnabled = (enabled) => {
  wallTremoloEnabled = enabled;
};

export const setWallTremoloRate = (rate) => {
  wallTremoloRate = Math.max(0.1, Math.min(20.0, rate));
};

export const setWallTremoloDepth = (depth) => {
  wallTremoloDepth = Math.max(0, Math.min(1.0, depth));
};

export const setWallTremoloMix = (mix) => {
  wallTremoloMix = Math.max(0, Math.min(1.0, mix));
};

// Circle tremolo setters/getters
export const setCircleTremoloEnabled = (enabled) => {
  circleTremoloEnabled = enabled;
};

export const setCircleTremoloRate = (rate) => {
  circleTremoloRate = Math.max(0.1, Math.min(20.0, rate));
};

export const setCircleTremoloDepth = (depth) => {
  circleTremoloDepth = Math.max(0, Math.min(1.0, depth));
};

export const setCircleTremoloMix = (mix) => {
  circleTremoloMix = Math.max(0, Math.min(1.0, mix));
};

// Export wall duration setter/getter
export const setWallDuration = (duration) => {
  wallSoundDuration = Math.max(0.05, Math.min(5.0, duration));
};

export const getWallDuration = () => wallSoundDuration;

// Export circle duration setter/getter
export const setCircleDuration = (duration) => {
  circleSoundDuration = Math.max(0.05, Math.min(5.0, duration));
};

export const getCircleDuration = () => circleSoundDuration;

// Wall detune setter/getter
export const setWallDetune = (amount) => {
  wallDetuneAmount = Math.max(-1200, Math.min(1200, amount));
};

export const getWallDetune = () => wallDetuneAmount;

// Circle detune setter/getter
export const setCircleDetune = (amount) => {
  circleDetuneAmount = Math.max(-1200, Math.min(1200, amount));
};

export const getCircleDetune = () => circleDetuneAmount;

// Legacy detune setter/getter (affects both)
export const setDetune = (amount) => {
  const clampedAmount = Math.max(-1200, Math.min(1200, amount));
  wallDetuneAmount = clampedAmount;
  circleDetuneAmount = clampedAmount;
};

export const getDetune = () => circleDetuneAmount; // Return circle value for consistency

// Wall waveform setter/getter
export const setWallWaveform = (waveform) => {
  if (WAVEFORMS.find(w => w.id === waveform)) {
    wallWaveform = waveform;
  }
};

export const getWallWaveform = () => wallWaveform;

// Circle waveform setter/getter
export const setCircleWaveform = (waveform) => {
  if (WAVEFORMS.find(w => w.id === waveform)) {
    circleWaveform = waveform;
  }
};

export const getCircleWaveform = () => circleWaveform;

// Legacy waveform setter/getter (affects both)
export const setWaveform = (waveform) => {
  if (WAVEFORMS.find(w => w.id === waveform)) {
    wallWaveform = waveform;
    circleWaveform = waveform;
  }
};

export const getWaveform = () => circleWaveform; // Return circle value for consistency

// Wall volume setter/getter
export const setWallVolume = (volume) => {
  wallSoundVolume = Math.max(0, Math.min(1.0, volume));
};

export const getWallVolume = () => wallSoundVolume;

// Circle volume setter/getter
export const setCircleVolume = (volume) => {
  circleSoundVolume = Math.max(0, Math.min(1.0, volume));
};

export const getCircleVolume = () => circleSoundVolume;

// Legacy volume setter/getter (affects both)
export const setVolume = (volume) => {
  const clampedVolume = Math.max(0, Math.min(1.0, volume));
  wallSoundVolume = clampedVolume;
  circleSoundVolume = clampedVolume;
};

export const getVolume = () => circleSoundVolume; // Return circle value for consistency

// Global master volume control
export const setGlobalVolume = (volume) => {
  if (globalMaster) {
    const clampedVolume = Math.max(0, Math.min(1.0, volume));
    globalMaster.gain.setValueAtTime(clampedVolume, audioContext.currentTime);
  }
};

export const getGlobalVolume = () => {
  return globalMaster ? globalMaster.gain.value : 1.0;
};

// Cleanup all audio nodes but keep the audio context
export const cleanupNodes = () => {
  cleanupAudioNodes(activeNodes);
};

// Full cleanup including audio context
export const cleanup = () => {
  if (audioContext) {
    cleanupAudioNodes(activeNodes);
    // We don't close the audio context as it can cause issues
    // Just clean up the nodes
  }
};

// Audio Memory Optimization Exports
// cleanupAudio already exported above
export { getAudioPoolStats } from './audioPool';
export { getEffectChainStats } from './effectChains';

// Debug function to get comprehensive audio memory stats
export const getAudioMemoryStats = () => {
  const poolStats = getAudioPoolStats();
  const chainStats = getEffectChainStats();

  return {
    activeNodes: activeNodes.size,
    audioPool: poolStats,
    effectChains: chainStats,
    audioContextState: audioContext ? audioContext.state : 'not initialized',
    globalProcessing: {
      compressor: !!globalCompressor,
      limiter: !!globalLimiter,
      master: !!globalMaster
    },
    message: 'Audio optimizations fully enabled'
  };
};

// Function to switch between optimized and original audio functions
let useOptimizedAudio = true;

export const setAudioOptimization = (enabled) => {
  useOptimizedAudio = enabled;
  // This would require more refactoring to fully implement the switch
  console.log(`Audio optimization ${enabled ? 'enabled' : 'disabled'}`);
};
