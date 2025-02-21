// Create an audio context
let audioContext;

// C major chord frequencies across 3 octaves
const NOTES = {
  // 2nd octave for wall collisions
  C2: 65.41,
  E2: 82.41,
  G2: 98.00,
  // 3rd octave for wall collisions
  C3: 130.81,
  E3: 164.81,
  G3: 196.00,
  // 4th and 5th octaves for circle collisions
  C4: 261.63,
  E4: 329.63,
  G4: 392.00,
  C5: 523.25,
  E5: 659.25,
  G5: 783.99
}

const WALL_NOTES = [
  NOTES.C2, NOTES.E2, NOTES.G2,
  NOTES.C3, NOTES.E3, NOTES.G3
]

const CIRCLE_NOTES = [
  NOTES.C4, NOTES.E4, NOTES.G4,
  NOTES.C5, NOTES.E5, NOTES.G5
]

const getRandomCircleDuration = () => {
  return 0.15 + Math.random() * 0.1 // Random duration between 0.15 and 0.25 seconds
}

const getRandomWallDuration = () => {
  return 0.25 + Math.random() * 0.25 // Random duration between 0.25 and 0.5 seconds
}

const createBeep = (frequency, duration = 0.15, volume = 0.3, pan = 0) => {
  // Initialize audio context on first interaction
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Create oscillator for beep sound
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const pannerNode = audioContext.createStereoPanner();

  // Set up oscillator
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  
  // Set up gain node for volume envelope
  gainNode.gain.setValueAtTime(0, audioContext.currentTime);
  gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

  // Set up panner
  pannerNode.pan.value = Math.max(-1, Math.min(1, pan)); // Clamp between -1 and 1

  // Connect nodes: oscillator -> gain -> panner -> destination
  oscillator.connect(gainNode);
  gainNode.connect(pannerNode);
  pannerNode.connect(audioContext.destination);

  // Start and stop
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

// Convert x position to pan value (-1 to 1)
export const calculatePan = (x, width) => {
  return (x / width) * 2 - 1;
}

// Higher pitched beep for creation (C5)
export const playBeep = (pan = 0) => {
  createBeep(NOTES.C5, 0.15, 0.3, pan) // Keep creation sound consistent
}

// Get a random note from the C major chord (higher octaves)
export const playCollisionBeep = (pan = 0) => {
  const randomNote = CIRCLE_NOTES[Math.floor(Math.random() * CIRCLE_NOTES.length)]
  createBeep(randomNote, getRandomCircleDuration(), 0.2, pan)
}

// Get a random note from the C major chord (lower octaves)
export const playWallCollisionBeep = (pan = 0) => {
  const randomNote = WALL_NOTES[Math.floor(Math.random() * WALL_NOTES.length)]
  createBeep(randomNote, getRandomWallDuration(), 0.15, pan)
}
