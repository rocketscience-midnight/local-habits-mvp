/**
 * Sound effects - multiple sound styles for completing habits/tasks
 * Pure Web Audio API synthesis (no external files)
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

/** Get current sound style from settings */
function getStyle() {
  return localStorage.getItem('soundStyle') || 'glockenspiel';
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
      case 'xylophon': playXylophon(type); break;
      case 'tropfen': playTropfen(type); break;
      case 'glockenspiel': playGlockenspiel(type); break;
      default: playPlingSound(type);
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
    }
  } catch (e) { /* silent */ }
}

// ==================== Pling (original) ====================
function playPlingSound(type) {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const baseFreq = type === 'mega' ? 660 : type === 'big' ? 784 : 880;
  const duration = type === 'mega' ? 0.5 : type === 'big' ? 0.35 : 0.2;
  const vol = type === 'mega' ? 0.25 : type === 'big' ? 0.2 : 0.15;

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
  const vol = type === 'mega' ? 0.3 : type === 'big' ? 0.25 : 0.18;

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
  const vol = type === 'mega' ? 0.25 : type === 'big' ? 0.2 : 0.15;

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
  const baseFreq = type === 'mega' ? 1047 : type === 'big' ? 1319 : 1568;
  const duration = type === 'mega' ? 0.8 : type === 'big' ? 0.6 : 0.4;
  const vol = type === 'mega' ? 0.15 : type === 'big' ? 0.12 : 0.1;

  const env = ctx.createGain();
  env.gain.setValueAtTime(vol, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + duration);
  env.connect(ctx.destination);

  // Multiple harmonics for shimmery bell tone
  [1, 2.76, 5.4, 8.93].forEach((ratio, i) => {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.value = baseFreq * ratio;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol / (i + 1), now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration / (i * 0.5 + 1));
    o.connect(g); g.connect(env);
    o.start(now); o.stop(now + duration);
  });

  if (type === 'mega') setTimeout(() => playGlockenspiel('big'), 250);
}
