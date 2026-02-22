/**
 * Sound effects - satisfying pling for completing habits/tasks
 * Generated WAV embedded as base64 (no external files needed)
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

/**
 * Play a satisfying pling sound using Web Audio API
 * @param {'small'|'big'|'mega'} type - intensity of the sound
 */
export function playPling(type = 'small') {
  // Respect user preference
  if (localStorage.getItem('sound') === 'off') return;

  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Base frequency varies by type
    const baseFreq = type === 'mega' ? 660 : type === 'big' ? 784 : 880;
    const duration = type === 'mega' ? 0.5 : type === 'big' ? 0.35 : 0.2;
    const gain = type === 'mega' ? 0.25 : type === 'big' ? 0.2 : 0.15;

    // Main tone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq, now);

    // Octave harmonic
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(baseFreq * 2, now);

    // Fifth harmonic
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(baseFreq * 1.5, now);

    // Envelope
    const envelope = ctx.createGain();
    envelope.gain.setValueAtTime(gain, now);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);

    // Mix
    const mix = ctx.createGain();
    mix.gain.value = 1;

    osc1.connect(mix);
    osc2.connect(mix);
    osc3.connect(mix);
    mix.connect(envelope);
    envelope.connect(ctx.destination);

    // Adjust harmonic volumes
    const g1 = ctx.createGain(); g1.gain.value = 0.6;
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    const g3 = ctx.createGain(); g3.gain.value = 0.15;

    osc1.disconnect(); osc2.disconnect(); osc3.disconnect();
    osc1.connect(g1); g1.connect(mix);
    osc2.connect(g2); g2.connect(mix);
    osc3.connect(g3); g3.connect(mix);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);
    osc1.stop(now + duration);
    osc2.stop(now + duration);
    osc3.stop(now + duration);

    // Mega gets a second chime
    if (type === 'mega') {
      setTimeout(() => playPling('big'), 200);
    }
  } catch (e) {
    // Audio not available, silently ignore
  }
}
