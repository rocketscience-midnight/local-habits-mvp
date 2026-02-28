/**
 * Sound effects - multiple sound styles for completing habits/tasks
 * Supports both Web Audio API synthesis and real audio files
 */

let audioCtx = null;
let audioCache = new Map(); // Cache for loaded audio files

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/** Get current sound style from settings */
function getStyle() {
  return localStorage.getItem('soundStyle') || 'gentle';
}

/** Available audio file styles */
const AUDIO_FILES = {
  success: './assets/sounds/success.ogg',
  // Future: different sounds for different types
};

/**
 * Load an audio file and cache it
 * @param {string} url - Audio file URL
 * @returns {Promise<AudioBuffer>}
 */
async function loadAudioFile(url) {
  if (audioCache.has(url)) {
    return audioCache.get(url);
  }
  
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Audio file not found: ${url}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await getCtx().decodeAudioData(arrayBuffer);
    
    audioCache.set(url, audioBuffer);
    return audioBuffer;
  } catch (error) {
    console.warn(`Failed to load audio file: ${url}`, error);
    return null;
  }
}

/**
 * Play an audio file
 * @param {string} audioKey - Key from AUDIO_FILES
 * @param {string} type - Intensity type (affects volume)
 */
async function playAudioFile(audioKey, type = 'small') {
  const url = AUDIO_FILES[audioKey];
  if (!url) return;
  
  try {
    const audioBuffer = await loadAudioFile(url);
    if (!audioBuffer) return;
    
    const ctx = getCtx();
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Adjust volume based on type (much gentler)
    const volume = type === 'mega' ? 0.3 : type === 'big' ? 0.2 : 0.1;
    gainNode.gain.value = volume;
    
    source.start(0);
    
    // For mega type, play multiple times with slight delay
    if (type === 'mega') {
      setTimeout(() => playAudioFile(audioKey, 'big'), 300);
    }
  } catch (error) {
    console.warn(`Failed to play audio file: ${audioKey}`, error);
  }
}

/**
 * Play a completion sound
 * @param {'small'|'big'|'mega'} type - intensity
 */
export function playPling(type = 'small') {
  if (localStorage.getItem('sound') === 'off') return;
  try {
    const style = getStyle();
    switch (style) {
      case 'pling': playPlingSound(type); break;
      case 'xylophon': playXylophon(type); break;
      case 'tropfen': playTropfen(type); break;
      case 'glockenspiel': playGlockenspiel(type); break;
      case 'success': playAudioFile('success', type); break;
      case 'gentle': playGentleSuccess(type); break;
      default: playGentleSuccess(type); // Safe default
    }
  } catch (e) { /* silent */ }
}

/** Play a specific style (for test buttons) */
export function playSound(style, type = 'small') {
  try {
    switch (style) {
      case 'pling': playPlingSound(type); break;
      case 'xylophon': playXylophon(type); break;
      case 'tropfen': playTropfen(type); break;
      case 'glockenspiel': playGlockenspiel(type); break;
      case 'success': playAudioFile('success', type); break;
      case 'gentle': playGentleSuccess(type); break;
      default: playGentleSuccess(type);
    }
  } catch (e) { /* silent */ }
}

/**
 * Check if audio files are available
 * @returns {Promise<string[]>} Available audio file keys
 */
export async function getAvailableAudioFiles() {
  const available = [];
  for (const [key, url] of Object.entries(AUDIO_FILES)) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        available.push(key);
      }
    } catch {
      // File not available
    }
  }
  return available;
}

// ==================== Pling (original) ====================
function playPlingSound(type) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const baseFreq = type === 'mega' ? 660 : type === 'big' ? 784 : 880;
  const duration = type === 'mega' ? 0.5 : type === 'big' ? 0.35 : 0.2;
  const vol = type === 'mega' ? 0.08 : type === 'big' ? 0.06 : 0.04; // Much quieter

  const env = ctx.createGain();
  env.gain.setValueAtTime(vol, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);
  env.connect(ctx.destination);

  [[baseFreq, 0.6], [baseFreq * 2, 0.25], [baseFreq * 1.5, 0.15]].forEach(([f, v]) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
    const g = ctx.createGain(); g.gain.value = v;
    o.connect(g); g.connect(env);
    o.start(now); o.stop(now + duration);
  });

  if (type === 'mega') setTimeout(() => playPlingSound('big'), 200);
}

// ==================== Xylophon ====================
function playXylophon(type) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const baseFreq = type === 'mega' ? 440 : type === 'big' ? 523 : 587;
  const duration = type === 'mega' ? 0.6 : type === 'big' ? 0.4 : 0.25;
  const vol = type === 'mega' ? 0.08 : type === 'big' ? 0.06 : 0.04; // Much quieter

  const env = ctx.createGain();
  env.gain.setValueAtTime(vol, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);
  env.connect(ctx.destination);

  // Triangle wave for woody tone + quick harmonic decay
  const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = baseFreq;
  const g1 = ctx.createGain(); g1.gain.value = 0.7;
  o1.connect(g1); g1.connect(env);
  o1.start(now); o1.stop(now + duration);

  // High harmonic with fast decay for the "click" attack
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = baseFreq * 4;
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.3, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
  o2.connect(g2); g2.connect(env);
  o2.start(now); o2.stop(now + 0.05);

  if (type === 'mega') setTimeout(() => playXylophon('big'), 180);
}

// ==================== Tropfen (water drop) ====================
function playTropfen(type) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const startFreq = type === 'mega' ? 600 : type === 'big' ? 800 : 1000;
  const duration = type === 'mega' ? 0.4 : type === 'big' ? 0.3 : 0.18;
  const vol = type === 'mega' ? 0.06 : type === 'big' ? 0.04 : 0.03; // Much quieter

  const env = ctx.createGain();
  env.gain.setValueAtTime(vol, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);
  env.connect(ctx.destination);

  // Sine with downward frequency sweep
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(startFreq, now);
  o.frequency.exponentialRampToValueAtTime(startFreq * 0.3, now + duration);
  o.connect(env);
  o.start(now); o.stop(now + duration);

  // Tiny bubble overtone
  const o2 = ctx.createOscillator(); o2.type = 'sine';
  o2.frequency.setValueAtTime(startFreq * 1.8, now);
  o2.frequency.exponentialRampToValueAtTime(startFreq * 0.5, now + duration * 0.5);
  const g2 = ctx.createGain(); g2.gain.setValueAtTime(0.08, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.5);
  o2.connect(g2); g2.connect(env);
  o2.start(now); o2.stop(now + duration * 0.5);

  if (type === 'mega') setTimeout(() => playTropfen('big'), 150);
}

// ==================== Glockenspiel ====================
function playGlockenspiel(type) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const baseFreq = type === 'mega' ? 523 : type === 'big' ? 659 : 784; // Lower frequencies
  const duration = type === 'mega' ? 0.6 : type === 'big' ? 0.4 : 0.25; // Shorter duration
  const vol = type === 'mega' ? 0.08 : type === 'big' ? 0.06 : 0.04; // Much quieter

  const env = ctx.createGain();
  env.gain.setValueAtTime(vol, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);
  env.connect(ctx.destination);

  // Fewer harmonics for gentler tone
  [1, 2, 3].forEach((ratio, i) => {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.value = baseFreq * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol / (i + 1), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration / (i * 0.5 + 1));
    o.connect(g); g.connect(env);
    o.start(now); o.stop(now + duration);
  });

  if (type === 'mega') setTimeout(() => playGlockenspiel('big'), 200);
}

// ==================== Gentle Success (new default) ====================
function playGentleSuccess(type) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const baseFreq = type === 'mega' ? 523 : type === 'big' ? 587 : 659; // C5, D5, E5 - pleasant frequencies
  const duration = type === 'mega' ? 0.4 : type === 'big' ? 0.3 : 0.2;
  const vol = type === 'mega' ? 0.06 : type === 'big' ? 0.04 : 0.03; // Very gentle volume

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(vol, now + 0.02); // Soft attack
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);
  env.connect(ctx.destination);

  // Simple sine wave with gentle overtone
  const o1 = ctx.createOscillator(); 
  o1.type = 'sine'; 
  o1.frequency.value = baseFreq;
  o1.connect(env);
  o1.start(now); 
  o1.stop(now + duration);

  // Very quiet overtone for warmth
  const o2 = ctx.createOscillator(); 
  o2.type = 'sine'; 
  o2.frequency.value = baseFreq * 2;
  const g2 = ctx.createGain(); 
  g2.gain.setValueAtTime(vol * 0.1, now);
  g2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);
  o2.connect(g2); 
  g2.connect(env);
  o2.start(now); 
  o2.stop(now + duration * 0.7);

  if (type === 'mega') setTimeout(() => playGentleSuccess('big'), 150);
}
