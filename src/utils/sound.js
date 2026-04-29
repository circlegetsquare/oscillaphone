// Create an audio context
let audioContext;

// Re-enable audio optimization imports incrementally
import { getAudioPool, destroyAudioPool, getAudioPoolStats } from './audioPool'
import { getEffectChainPool, destroyEffectChainPool, getEffectChainStats } from './effectChains'

// Global audio processing nodes
let globalCompressor;
let globalLimiter;
let globalMaster;

// Keep track of active audio nodes for cleanup
let activeNodes = new Set();

// ID for the periodic cleanup interval so it can be cancelled
let cleanupIntervalId = null;

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
    globalLimiter.threshold.value = -3.0;      // Stronger limiting at -3dB (was -6dB)
    globalLimiter.knee.value = 0.0;            // Hard knee for true limiting
    globalLimiter.ratio.value = 20.0;          // Very high ratio for limiting
    globalLimiter.attack.value = 0.001;        // Very fast attack
    globalLimiter.release.value = 0.1;         // Fast release
    
    // Create master volume control
    globalMaster = audioContext.createGain();
    globalMaster.gain.value = 0.7;             // Reduced from 1.0 to provide headroom
    
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
    cleanupIntervalId = setInterval(() => {
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
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
  if (audioContext) {
    // Clean up all active nodes
    activeNodes.forEach(node => {
      try {
        if (node.stop && typeof node.stop === 'function') {
          node.stop();
        }
        node.disconnect();
      } catch {
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
  },
  A_PENTATONIC_MINOR: {
    name: "Penta Minor",
    notes: {
      // 2nd octave (wall collisions)
      A2: 110.00, C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00,
      // 3rd octave (wall collisions)
      A3: 220.00, C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00,
      // 4th octave (circle collisions)
      A4: 440.00, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99,
      // 5th octave (circle collisions)
      A5: 880.00, C6: 1046.50, D6: 1174.66, E6: 1318.51, G6: 1567.98
    }
  },
  C_PENTATONIC_MAJOR: {
    name: "Penta Major",
    notes: {
      // 2nd octave (wall collisions)
      C2: 65.41, D2: 73.42, E2: 82.41, G2: 98.00, A2: 110.00,
      // 3rd octave (wall collisions)
      C3: 130.81, D3: 146.83, E3: 164.81, G3: 196.00, A3: 220.00,
      // 4th octave (circle collisions)
      C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.00, A4: 440.00,
      // 5th octave (circle collisions)
      C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.00
    }
  },
  D_DORIAN: {
    name: "D Dorian",
    notes: {
      // 2nd octave (wall collisions)
      D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.00,
      A2: 110.00, B2: 123.47, C3: 130.81,
      // 3rd octave (wall collisions)
      D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00,
      A3: 220.00, B3: 246.94, C4: 261.63,
      // 4th octave (circle collisions)
      D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00,
      A4: 440.00, B4: 493.88, C5: 523.25,
      // 5th octave (circle collisions)
      D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99,
      A5: 880.00, B5: 987.77, C6: 1046.50
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

// Current musical scale (used by getRandomNote and playBeep)
let currentScale = 'C_MAJOR';

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
    } catch {
      console.warn('Error cleaning up audio node');
    }
  });
};

// soundSettings is the wallSettings or circleSettings object from React AudioContext state.
const createOptimizedBeep = (frequency, duration = 0.15, volume = 0.3, pan = 0, soundSettings) => {
  initAudioContext();

  const pool = getAudioPool(audioContext);
  const chainPool = getEffectChainPool(audioContext);
  const oscillator = audioContext.createOscillator();

  // Configure oscillator from React state
  oscillator.type = soundSettings?.waveform ?? 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  oscillator.detune.setValueAtTime(soundSettings?.detune ?? 0, audioContext.currentTime);

  const effectChain = chainPool.getChain();

  if (!effectChain) {
    console.warn('No effect chain available, falling back to basic sound');
    const gainNode = pool.getNode('gain');
    const panNode = pool.getNode('stereoPanner');

    oscillator.connect(gainNode);
    gainNode.connect(panNode);
    panNode.connect(globalCompressor || audioContext.destination);

    const currentTime = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);
    panNode.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), currentTime);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + duration);

    setTimeout(() => {
      pool.releaseNode(gainNode, 'gain');
      pool.releaseNode(panNode, 'stereoPanner');
    }, (duration + 0.1) * 1000);

    return;
  }

  // Build effect chain config directly from the React state settings object
  const delay = soundSettings?.delay ?? { enabled: false, time: 0.3, feedback: 0.3, mix: 0.3 };
  const reverb = soundSettings?.reverb ?? { enabled: false, roomSize: 0.5, damping: 0.3, mix: 0.3 };
  const distortion = soundSettings?.distortion ?? { enabled: false, amount: 0.5, mix: 0.3 };
  const tremolo = soundSettings?.tremolo ?? { enabled: false, rate: 4.0, depth: 0.5, mix: 0.5 };

  const activeEffectCount = [delay.enabled, reverb.enabled, distortion.enabled, tremolo.enabled]
    .filter(Boolean).length;
  const baseVolumeScale = soundSettings?.volume ?? 1.0;
  const effectScaling = Math.max(0.4, 1.0 - activeEffectCount * 0.1);

  effectChain.configure({
    volume: volume * baseVolumeScale * effectScaling,
    duration,
    pan,
    delay,
    reverb,
    distortion,
    tremolo: { ...tremolo, shape: tremolo.shape ?? 'sine', duration }
  });

  // Connect oscillator to effect chain
  effectChain.connectOscillator(oscillator);
  effectChain.connectToDestination(globalCompressor || audioContext.destination);

  // Start and stop oscillator
  const currentTime = audioContext.currentTime;
  oscillator.start(currentTime);
  oscillator.stop(currentTime + duration);

  // Schedule cleanup — extend timeout to cover reverb/delay tails
  const reverbTailTime = reverb.enabled ? 2.0 : 0;
  const delayTailTime = delay.enabled ? delay.time * 4 : 0;
  const tailTime = Math.max(reverbTailTime, delayTailTime);
  setTimeout(() => {
    chainPool.releaseChain(effectChain);
  }, (duration + tailTime + 0.1) * 1000);
};

// REMOVED: createOriginalBeep — no longer needed; createOptimizedBeep is the only path.
// Left as a tombstone comment so git blame is informative.

const _tombstone = (frequency, duration = 0.15, volume = 0.3, pan = 0, soundType = 'circle') => {
  // This function has been removed. See createOptimizedBeep.
  void frequency; void duration; void volume; void pan; void soundType;
  throw new Error('createOriginalBeep has been removed');
};
void _tombstone;

const createBeep = createOptimizedBeep;

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

// Play a note for circle-to-circle collisions.
// soundSettings should be the circleSettings object from React AudioContext state.
export const playCollisionBeep = (pan = 0, velocity = 0, soundSettings) => {
  const group = Math.random() < 0.5 ? 'CIRCLE_HIGH' : 'CIRCLE_HIGHER';
  const note = getRandomNote(group);
  const maxVolume = soundSettings?.volume ?? 0.15;
  const volume = mapVelocityToVolume(velocity, maxVolume);
  createBeep(note, soundSettings?.duration ?? 0.25, volume, pan, soundSettings);
};

// Play a note for wall collision events.
// soundSettings should be the wallSettings object from React AudioContext state.
export const playWallCollisionBeep = (pan = 0, velocity = 0, soundSettings) => {
  const group = Math.random() < 0.5 ? 'WALL_LOW' : 'WALL_MID';
  const note = getRandomNote(group);
  const maxVolume = soundSettings?.volume ?? 0.15;
  const volume = mapVelocityToVolume(velocity, maxVolume);
  createBeep(note, soundSettings?.duration ?? 0.25, volume, pan, soundSettings);
};

// Export scale setter — still needed because getRandomNote and playBeep read currentScale
export const setScale = (scale) => {
  if (SCALES[scale]) {
    currentScale = scale;
  }
};

// Global master volume control — directly manipulates the audio graph node
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
export { getAudioPoolStats, getEffectChainStats };

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


