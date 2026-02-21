/**
 * Confetti - Lightweight canvas-based confetti burst animation
 * Triggers from a specific point with configurable intensity
 */

const COLORS = ['#F4A0B0', '#B8A0D8', '#F8D480', '#A8D8A8', '#C8E0F4', '#FF6B35', '#8B5CF6'];

/**
 * Burst confetti from a point on screen
 * @param {number} x - X coordinate (viewport)
 * @param {number} y - Y coordinate (viewport)
 * @param {'small'|'big'} intensity - small = 20 particles, big = 50
 */
export function burstConfetti(x, y, intensity = 'small') {
  const count = intensity === 'big' ? 50 : 20;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Create particles
  const particles = Array.from({ length: count }, () => ({
    x, y,
    vx: (Math.random() - 0.5) * (intensity === 'big' ? 16 : 10),
    vy: (Math.random() * -8) - 2,
    size: Math.random() * 6 + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 12,
    life: 1,
    decay: 0.015 + Math.random() * 0.015
  }));

  let raf;
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // gravity
      p.rotation += p.rotSpeed;
      p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
    if (alive) {
      raf = requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  }
  raf = requestAnimationFrame(animate);
}
