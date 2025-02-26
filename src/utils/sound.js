// Create an audio context
let audioContext;

// Keep track of active audio nodes for cleanup
let activeNodes = new Set();

const SCALES = {
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
}

const NOTE_GROUPS = {
  WALL_LOW: ['F2', 'G2', 'A2', 'B2', 'C3', 'D3', 'E3'],
  WALL_MID: ['F3', 'G3', 'A3', 'B3', 'C4', 'D4', 'E4'],
  CIRCLE_HIGH: ['F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5'],
  CIRCLE_HIGHER: ['F5', 'G5', 'A5', 'B5', 'C6', 'D6', 'E6']
}

const C_MAJOR_GROUPS = {
  WALL_LOW: ['C2', 'E2', 'G2'],
  WALL_MID: ['C3', 'E3', 'G3'],
  CIRCLE_HIGH: ['C4', 'E4', 'G4'],
  CIRCLE_HIGHER: ['C5', 'E5', 'G5']
}

const A_MINOR_GROUPS = {
  WALL_LOW: ['A2', 'B2', 'C3', 'D3', 'E3', 'F3', 'G3'],
  WALL_MID: ['A3', 'B3', 'C4', 'D4', 'E4', 'F4', 'G4'],
  CIRCLE_HIGH: ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5'],
  CIRCLE_HIGHER: ['A5', 'B5', 'C6', 'D6', 'E6', 'F6', 'G6']
}

// Available waveforms
export const WAVEFORMS = [
  { id: 'sine', name: 'Sine' },
  { id: 'square', name: 'Square' },
  { id: 'sawtooth', name: 'Sawtooth' },
  { id: 'triangle', name: 'Triangle' }
]

// Keep track of current scale and sound parameters
let currentScale = 'C_MAJOR'
let wallSoundDuration = 0.25 // Default duration
let circleSoundDuration = 0.25 // Default duration
let wallDetuneAmount = 0 // Default detune for wall sounds
let circleDetuneAmount = 0 // Default detune for circle sounds
let currentWaveform = 'sine' // Default waveform

// Delay parameters for wall sounds
let wallDelayEnabled = false
let wallDelayTime = 0.3    // Default 300ms delay
let wallDelayFeedback = 0.3 // 30% feedback
let wallDelayMix = 0.3     // 30% wet signal

// Delay parameters for circle sounds
let circleDelayEnabled = false
let circleDelayTime = 0.3    // Default 300ms delay
let circleDelayFeedback = 0.3 // 30% feedback
let circleDelayMix = 0.3     // 30% wet signal

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
  const randomNoteName = noteNames[Math.floor(Math.random() * noteNames.length)]
  return SCALES[currentScale].notes[randomNoteName]
}

const cleanupAudioNodes = (nodes) => {
  nodes.forEach(node => {
    try {
      node.disconnect();
      activeNodes.delete(node);
    } catch (e) {
      console.warn('Error cleaning up audio node:', e);
    }
  });
}

const createBeep = (frequency, duration = 0.15, volume = 0.3, pan = 0, soundType = 'circle') => {
  // Initialize audio context on first interaction
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  const nodes = new Set();

  // Create audio nodes
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const pannerNode = audioContext.createStereoPanner();
  const delayNode = audioContext.createDelay();
  const feedbackNode = audioContext.createGain();
  const wetGainNode = audioContext.createGain();
  const dryGainNode = audioContext.createGain();

  // Add nodes to tracking sets
  [oscillator, gainNode, pannerNode, delayNode, feedbackNode, wetGainNode, dryGainNode]
    .forEach(node => {
      nodes.add(node);
      activeNodes.add(node);
    });

  // Set up oscillator
  oscillator.type = currentWaveform;
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
  wetGainNode.gain.setValueAtTime(useDelayEnabled ? useDelayMix : 0, audioContext.currentTime);
  dryGainNode.gain.setValueAtTime(useDelayEnabled ? 1 - useDelayMix : 1, audioContext.currentTime);

  // Connect nodes:
  // Dry signal path
  oscillator.connect(gainNode);
  gainNode.connect(dryGainNode);
  dryGainNode.connect(pannerNode);

  // Wet (delay) signal path
  gainNode.connect(delayNode);
  delayNode.connect(wetGainNode);
  wetGainNode.connect(pannerNode);

  // Delay feedback loop
  delayNode.connect(feedbackNode);
  feedbackNode.connect(delayNode);

  // Final output
  pannerNode.connect(audioContext.destination);

  // Set up cleanup
  const stopTime = audioContext.currentTime + duration + (useDelayEnabled ? useDelayTime * 4 : 0);
  oscillator.onended = () => {
    setTimeout(() => cleanupAudioNodes(nodes), (useDelayEnabled ? useDelayTime * 4000 : 0));
  };

  // Start and stop
  oscillator.start(audioContext.currentTime);
  oscillator.stop(stopTime);
}

// Convert x position to pan value (-1 to 1)
export const calculatePan = (x, width) => {
  return (x / width) * 2 - 1;
}

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
  createBeep(note, 0.15, 0.3, pan)
}

// Get a random note for circle collisions
export const playCollisionBeep = (pan = 0) => {
  const group = Math.random() < 0.5 ? 'CIRCLE_HIGH' : 'CIRCLE_HIGHER';
  const note = getRandomNote(group);
  createBeep(note, circleSoundDuration, 0.2, pan, 'circle');
}

// Get a random note for wall collisions
export const playWallCollisionBeep = (pan = 0) => {
  const group = Math.random() < 0.5 ? 'WALL_LOW' : 'WALL_MID';
  const note = getRandomNote(group);
  createBeep(note, wallSoundDuration, 0.15, pan, 'wall');
}

// Export scales for UI
export const AVAILABLE_SCALES = Object.entries(SCALES).map(([id, scale]) => ({
  id,
  name: scale.name
}))

// Export scale switcher
export const setScale = (scale) => {
  if (SCALES[scale]) {
    currentScale = scale
  }
}

// Export wall duration setter
export const setWallDuration = (duration) => {
  wallSoundDuration = Math.max(0.05, Math.min(1.0, duration))
}

// Export wall duration getter
export const getWallDuration = () => wallSoundDuration

// Export circle duration setter
export const setCircleDuration = (duration) => {
  circleSoundDuration = Math.max(0.05, Math.min(1.0, duration))
}

// Export circle duration getter
export const getCircleDuration = () => circleSoundDuration

// Wall detune setter/getter
export const setWallDetune = (amount) => {
  wallDetuneAmount = Math.max(-1200, Math.min(1200, amount))
}

export const getWallDetune = () => wallDetuneAmount

// Circle detune setter/getter
export const setCircleDetune = (amount) => {
  circleDetuneAmount = Math.max(-1200, Math.min(1200, amount))
}

export const getCircleDetune = () => circleDetuneAmount

// Legacy detune setter/getter (affects both)
export const setDetune = (amount) => {
  const clampedAmount = Math.max(-1200, Math.min(1200, amount))
  wallDetuneAmount = clampedAmount
  circleDetuneAmount = clampedAmount
}

export const getDetune = () => circleDetuneAmount // Return circle value for consistency

// Export waveform setter
export const setWaveform = (waveform) => {
  if (WAVEFORMS.find(w => w.id === waveform)) {
    currentWaveform = waveform
  }
}

// Export waveform getter
export const getWaveform = () => currentWaveform

// Wall delay parameter setters
export const setWallDelayEnabled = (enabled) => {
  wallDelayEnabled = enabled
}

export const setWallDelayTime = (time) => {
  wallDelayTime = Math.max(0.1, Math.min(1.0, time))
}

export const setWallDelayFeedback = (amount) => {
  wallDelayFeedback = Math.max(0, Math.min(0.9, amount))
}

export const setWallDelayMix = (amount) => {
  wallDelayMix = Math.max(0, Math.min(1.0, amount))
}

// Wall delay parameter getters
export const getWallDelayEnabled = () => wallDelayEnabled
export const getWallDelayTime = () => wallDelayTime
export const getWallDelayFeedback = () => wallDelayFeedback
export const getWallDelayMix = () => wallDelayMix

// Circle delay parameter setters
export const setCircleDelayEnabled = (enabled) => {
  circleDelayEnabled = enabled
}

export const setCircleDelayTime = (time) => {
  circleDelayTime = Math.max(0.1, Math.min(1.0, time))
}

export const setCircleDelayFeedback = (amount) => {
  circleDelayFeedback = Math.max(0, Math.min(0.9, amount))
}

export const setCircleDelayMix = (amount) => {
  circleDelayMix = Math.max(0, Math.min(1.0, amount))
}

// Circle delay parameter getters
export const getCircleDelayEnabled = () => circleDelayEnabled
export const getCircleDelayTime = () => circleDelayTime
export const getCircleDelayFeedback = () => circleDelayFeedback
export const getCircleDelayMix = () => circleDelayMix

// Legacy delay parameter setters (affect both wall and circle)
export const setDelayEnabled = (enabled) => {
  wallDelayEnabled = enabled
  circleDelayEnabled = enabled
}

export const setDelayTime = (time) => {
  const clampedTime = Math.max(0.1, Math.min(1.0, time))
  wallDelayTime = clampedTime
  circleDelayTime = clampedTime
}

export const setDelayFeedback = (amount) => {
  const clampedAmount = Math.max(0, Math.min(0.9, amount))
  wallDelayFeedback = clampedAmount
  circleDelayFeedback = clampedAmount
}

export const setDelayMix = (amount) => {
  const clampedAmount = Math.max(0, Math.min(1.0, amount))
  wallDelayMix = clampedAmount
  circleDelayMix = clampedAmount
}

// Legacy delay parameter getters (return circle values for consistency)
export const getDelayEnabled = () => circleDelayEnabled
export const getDelayTime = () => circleDelayTime
export const getDelayFeedback = () => circleDelayFeedback
export const getDelayMix = () => circleDelayMix

// Cleanup function for component unmount
export const cleanup = () => {
  cleanupAudioNodes(activeNodes);
  activeNodes.clear();
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
}
