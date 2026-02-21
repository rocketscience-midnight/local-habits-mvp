/**
 * Garden View - Isometric pixel-art garden that visualizes habit progress.
 * Each habit becomes a plant on an isometric tile grid.
 * Plants grow through 5 stages based on streak length,
 * and wilt based on days since last completion.
 */

import habitRepo from '../repo/habitRepo.js';
import { todayString } from '../utils/dates.js';

// ============================================================
// Constants & Palette
// ============================================================

const TILE_W = 64;           // isometric tile width (in canvas pixels)
const TILE_H = 32;           // isometric tile height
const PIXEL = 5;             // size of one "pixel art pixel" (bigger = more visible)
const COLS = 6;
const ROWS = 4;

/** Growth stage thresholds (streak days → stage index 0-4) */
const STAGE_THRESHOLDS = [0, 3, 7, 14, 30];
const STAGE_NAMES = ['Samen', 'Keimling', 'Jungpflanze', 'Blühend', 'Ausgewachsen'];

/** Health status from days since last completion */
function getHealth(daysSinceLast) {
  if (daysSinceLast <= 0) return 'thriving';
  if (daysSinceLast === 1) return 'okay';
  if (daysSinceLast < 5) return 'wilting';
  return 'withered';
}

function getGrowthStage(streak) {
  let stage = 0;
  for (let i = STAGE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (streak >= STAGE_THRESHOLDS[i]) { stage = i; break; }
  }
  return stage;
}

// Color palettes per plant type (pastel Dreamgarden style)
const PLANT_PALETTES = {
  tulip:     { stem: '#6BBF6B', leaf: '#8ED88E', bloom1: '#F4A0C0', bloom2: '#E878A0', bloom3: '#D05A80' },
  sunflower: { stem: '#6BBF6B', leaf: '#8ED88E', bloom1: '#FFD966', bloom2: '#FFB833', bloom3: '#E89520' },
  bush:      { stem: '#5A9B5A', leaf: '#7BC47B', bloom1: '#A8D8A8', bloom2: '#6BBF6B', bloom3: '#4A8F4A' },
  cherry:    { stem: '#9B7B5B', leaf: '#A8D8A8', bloom1: '#DDA0DD', bloom2: '#C77DC7', bloom3: '#8B5CF6' },
  mushroom:  { stem: '#D8C8B0', leaf: '#E8D8C0', bloom1: '#D88888', bloom2: '#C06060', bloom3: '#8B5CF6' },
};

// Health tint multipliers (applied to colors)
const HEALTH_TINT = {
  thriving: { sat: 1.0, light: 1.0 },
  okay:     { sat: 0.7, light: 1.05 },
  wilting:  { sat: 0.35, light: 0.85 },
  withered: { sat: 0.0, light: 0.6 },
};

// ============================================================
// Color helpers
// ============================================================

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}

function tintColor(hex, health) {
  const [r, g, b] = hexToRgb(hex);
  const t = HEALTH_TINT[health];
  const avg = (r + g + b) / 3;
  const nr = avg + (r - avg) * t.sat;
  const ng = avg + (g - avg) * t.sat;
  const nb = avg + (b - avg) * t.sat;
  return rgbToHex(nr * t.light, ng * t.light, nb * t.light);
}

// ============================================================
// Isometric projection helpers
// ============================================================

function isoToScreen(col, row, originX, originY) {
  const x = originX + (col - row) * (TILE_W / 2);
  const y = originY + (col + row) * (TILE_H / 2);
  return { x, y };
}

function screenToIso(sx, sy, originX, originY) {
  const dx = sx - originX;
  const dy = sy - originY;
  const col = (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2;
  const row = (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2;
  return { col: Math.floor(col), row: Math.floor(row) };
}

// ============================================================
// Drawing primitives (pixel art style)
// ============================================================

function drawPixel(ctx, x, y, color, size = PIXEL) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}

function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

// Draw an isometric diamond tile
function drawTile(ctx, cx, cy, fillColor, strokeColor) {
  const hw = TILE_W / 2;
  const hh = TILE_H / 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx, cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ============================================================
// Plant drawing functions (pixel art, 5 stages per type)
// ============================================================

function drawPlant(ctx, cx, cy, plantType, stage, health, animOffset) {
  const pal = PLANT_PALETTES[plantType] || PLANT_PALETTES.bush;
  const stem = tintColor(pal.stem, health);
  const leaf = tintColor(pal.leaf, health);
  const b1 = tintColor(pal.bloom1, health);
  const b2 = tintColor(pal.bloom2, health);
  const b3 = tintColor(pal.bloom3, health);
  const soil = tintColor('#8B7355', health);

  // Subtle sway offset
  const sway = Math.sin(animOffset) * (health === 'wilting' ? 2 : health === 'withered' ? 0 : 1);
  const droop = health === 'wilting' ? 2 : health === 'withered' ? 4 : 0;
  const p = PIXEL;

  // Base Y is bottom of the plant area (center of tile)
  const bx = cx + sway;
  const by = cy;

  // Draw shadow under plant (ellipse, scales with growth stage)
  const shadowW = p * (2 + stage * 1.5);
  const shadowH = p * (1 + stage * 0.5);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#2D2D2D';
  ctx.beginPath();
  ctx.ellipse(bx + p / 2, by + p, shadowW, shadowH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  switch (plantType) {
    case 'tulip': drawTulip(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'sunflower': drawSunflower(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'bush': drawBush(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'cherry': drawCherry(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'mushroom': drawMushroom(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    default: drawBush(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop);
  }
}

function drawTulip(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) {
    // Seed: small soil mound
    drawPixelRect(ctx, x - p, y - p, p * 3, p, soil);
    drawPixel(ctx, x, y - p * 2, '#6B5B3B');
    return;
  }
  if (stage === 1) {
    // Sprout
    drawPixel(ctx, x, y - p * 2, stem);
    drawPixel(ctx, x, y - p * 3, stem);
    drawPixel(ctx, x + p, y - p * 3, leaf);
    return;
  }
  if (stage === 2) {
    // Young
    drawPixelRect(ctx, x, y - p * 5, p, p * 4, stem);
    drawPixel(ctx, x - p, y - p * 3, leaf);
    drawPixel(ctx, x + p, y - p * 4, leaf);
    drawPixel(ctx, x, y - p * 5 - droop, b1);
    return;
  }
  if (stage === 3) {
    // Blooming
    drawPixelRect(ctx, x, y - p * 7, p, p * 6, stem);
    drawPixel(ctx, x - p, y - p * 4, leaf);
    drawPixel(ctx, x + p, y - p * 5, leaf);
    drawPixel(ctx, x - p, y - p * 6, leaf);
    // Flower
    drawPixel(ctx, x, y - p * 7 - droop, b2);
    drawPixel(ctx, x - p, y - p * 7 - droop, b1);
    drawPixel(ctx, x + p, y - p * 7 - droop, b1);
    drawPixel(ctx, x, y - p * 8 - droop, b1);
    return;
  }
  // Stage 4: Full tulip
  drawPixelRect(ctx, x, y - p * 9, p, p * 8, stem);
  drawPixel(ctx, x - p, y - p * 4, leaf);
  drawPixel(ctx, x - p * 2, y - p * 5, leaf);
  drawPixel(ctx, x + p, y - p * 6, leaf);
  drawPixel(ctx, x + p * 2, y - p * 7, leaf);
  // Big tulip bloom
  drawPixelRect(ctx, x - p, y - p * 10 - droop, p * 3, p * 2, b1);
  drawPixel(ctx, x, y - p * 11 - droop, b2);
  drawPixel(ctx, x - p, y - p * 11 - droop, b3);
  drawPixel(ctx, x + p, y - p * 11 - droop, b3);
  drawPixel(ctx, x, y - p * 12 - droop, b2);
}

function drawSunflower(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) {
    drawPixelRect(ctx, x - p, y - p, p * 3, p, soil);
    drawPixel(ctx, x, y - p * 2, '#8B7355');
    return;
  }
  if (stage === 1) {
    drawPixel(ctx, x, y - p * 2, stem);
    drawPixel(ctx, x, y - p * 3, stem);
    drawPixel(ctx, x - p, y - p * 2, leaf);
    return;
  }
  if (stage === 2) {
    drawPixelRect(ctx, x, y - p * 6, p, p * 5, stem);
    drawPixel(ctx, x - p, y - p * 3, leaf);
    drawPixel(ctx, x + p, y - p * 5, leaf);
    drawPixel(ctx, x, y - p * 6 - droop, b1);
    drawPixel(ctx, x + p, y - p * 6 - droop, b2);
    return;
  }
  if (stage === 3) {
    drawPixelRect(ctx, x, y - p * 8, p, p * 7, stem);
    drawPixel(ctx, x - p, y - p * 4, leaf);
    drawPixel(ctx, x + p, y - p * 6, leaf);
    drawPixel(ctx, x - p, y - p * 7, leaf);
    // Sunflower head
    drawPixel(ctx, x, y - p * 8 - droop, b3); // center brown
    drawPixel(ctx, x - p, y - p * 8 - droop, b1);
    drawPixel(ctx, x + p, y - p * 8 - droop, b1);
    drawPixel(ctx, x, y - p * 9 - droop, b1);
    drawPixel(ctx, x, y - p * 7 - droop, b2);
    return;
  }
  // Full sunflower
  drawPixelRect(ctx, x, y - p * 11, p, p * 10, stem);
  drawPixel(ctx, x - p, y - p * 4, leaf);
  drawPixel(ctx, x - p * 2, y - p * 5, leaf);
  drawPixel(ctx, x + p, y - p * 7, leaf);
  drawPixel(ctx, x + p * 2, y - p * 8, leaf);
  // Big head
  drawPixelRect(ctx, x - p, y - p * 12 - droop, p * 3, p * 3, b1);
  drawPixelRect(ctx, x, y - p * 12 - droop, p, p * 2, b3); // brown center
  drawPixel(ctx, x - p * 2, y - p * 11 - droop, b2);
  drawPixel(ctx, x + p * 2, y - p * 11 - droop, b2);
  drawPixel(ctx, x, y - p * 13 - droop, b2);
}

function drawBush(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) {
    drawPixelRect(ctx, x - p, y - p, p * 3, p, soil);
    drawPixel(ctx, x, y - p * 2, '#5A8F5A');
    return;
  }
  if (stage === 1) {
    drawPixel(ctx, x, y - p * 2, stem);
    drawPixel(ctx, x - p, y - p * 3, leaf);
    drawPixel(ctx, x + p, y - p * 3, leaf);
    return;
  }
  if (stage === 2) {
    drawPixelRect(ctx, x, y - p * 4, p, p * 3, stem);
    drawPixelRect(ctx, x - p, y - p * 4 - droop, p * 3, p * 2, b1);
    drawPixel(ctx, x - p * 2, y - p * 3, leaf);
    drawPixel(ctx, x + p * 2, y - p * 3, leaf);
    return;
  }
  if (stage === 3) {
    drawPixelRect(ctx, x, y - p * 5, p, p * 4, stem);
    drawPixelRect(ctx, x - p * 2, y - p * 6 - droop, p * 5, p * 3, b1);
    drawPixel(ctx, x - p, y - p * 7 - droop, b2);
    drawPixel(ctx, x + p, y - p * 7 - droop, b2);
    drawPixel(ctx, x, y - p * 8 - droop, b3);
    return;
  }
  // Full bush
  drawPixelRect(ctx, x, y - p * 6, p, p * 5, stem);
  drawPixelRect(ctx, x - p * 3, y - p * 8 - droop, p * 7, p * 4, b1);
  drawPixelRect(ctx, x - p * 2, y - p * 9 - droop, p * 5, p * 2, b2);
  drawPixel(ctx, x, y - p * 10 - droop, b3);
  drawPixel(ctx, x - p * 2, y - p * 10 - droop, b3);
  drawPixel(ctx, x + p * 2, y - p * 10 - droop, b3);
}

function drawCherry(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) {
    drawPixelRect(ctx, x - p, y - p, p * 3, p, soil);
    drawPixel(ctx, x, y - p * 2, '#7B5B3B');
    return;
  }
  if (stage === 1) {
    drawPixel(ctx, x, y - p * 2, stem);
    drawPixel(ctx, x, y - p * 3, stem);
    drawPixel(ctx, x + p, y - p * 3, leaf);
    return;
  }
  if (stage === 2) {
    // Small tree trunk
    drawPixelRect(ctx, x, y - p * 5, p, p * 4, stem);
    drawPixel(ctx, x - p, y - p * 5 - droop, leaf);
    drawPixel(ctx, x + p, y - p * 5 - droop, leaf);
    drawPixel(ctx, x, y - p * 6 - droop, leaf);
    return;
  }
  if (stage === 3) {
    // Trunk
    drawPixelRect(ctx, x, y - p * 7, p, p * 6, stem);
    // Canopy with blooms
    drawPixelRect(ctx, x - p * 2, y - p * 8 - droop, p * 5, p * 3, leaf);
    drawPixel(ctx, x - p, y - p * 9 - droop, b1);
    drawPixel(ctx, x + p, y - p * 8 - droop, b1);
    drawPixel(ctx, x, y - p * 10 - droop, b2);
    return;
  }
  // Full cherry blossom tree
  drawPixelRect(ctx, x, y - p * 9, p * 2, p * 8, stem);
  // Big canopy
  drawPixelRect(ctx, x - p * 3, y - p * 11 - droop, p * 8, p * 4, leaf);
  drawPixelRect(ctx, x - p * 2, y - p * 13 - droop, p * 6, p * 2, leaf);
  // Blossoms scattered
  drawPixel(ctx, x - p * 2, y - p * 12 - droop, b1);
  drawPixel(ctx, x + p * 2, y - p * 11 - droop, b1);
  drawPixel(ctx, x, y - p * 13 - droop, b2);
  drawPixel(ctx, x - p, y - p * 11 - droop, b2);
  drawPixel(ctx, x + p * 3, y - p * 12 - droop, b1);
  drawPixel(ctx, x - p * 3, y - p * 13 - droop, b3);
  drawPixel(ctx, x + p, y - p * 14 - droop, b3);
}

function drawMushroom(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) {
    drawPixelRect(ctx, x - p, y - p, p * 3, p, soil);
    drawPixel(ctx, x, y - p * 2, '#C0A0A0');
    return;
  }
  if (stage === 1) {
    drawPixel(ctx, x, y - p * 2, stem);
    drawPixel(ctx, x, y - p * 3, b1);
    return;
  }
  if (stage === 2) {
    drawPixelRect(ctx, x, y - p * 3, p, p * 2, stem);
    drawPixelRect(ctx, x - p, y - p * 4 - droop, p * 3, p * 2, b1);
    drawPixel(ctx, x, y - p * 5 - droop, b2);
    return;
  }
  if (stage === 3) {
    drawPixelRect(ctx, x, y - p * 4, p, p * 3, stem);
    drawPixelRect(ctx, x - p * 2, y - p * 5 - droop, p * 5, p * 2, b1);
    drawPixel(ctx, x - p, y - p * 6 - droop, b2);
    drawPixel(ctx, x + p, y - p * 6 - droop, b2);
    // Spots
    drawPixel(ctx, x, y - p * 6 - droop, leaf);
    return;
  }
  // Full mushroom — cute and chunky
  drawPixelRect(ctx, x - p / 2, y - p * 5, p * 2, p * 4, stem);
  drawPixelRect(ctx, x - p * 3, y - p * 7 - droop, p * 7, p * 3, b1);
  drawPixelRect(ctx, x - p * 2, y - p * 8 - droop, p * 5, p, b2);
  // Spots
  drawPixel(ctx, x - p * 2, y - p * 7 - droop, leaf);
  drawPixel(ctx, x + p * 2, y - p * 6 - droop, leaf);
  drawPixel(ctx, x, y - p * 8 - droop, leaf);
  // Tiny second mushroom
  drawPixelRect(ctx, x + p * 3, y - p * 2, p, p * 2, stem);
  drawPixelRect(ctx, x + p * 2, y - p * 3, p * 3, p * 2, b3);
}

// Small decorative elements for empty tiles
function drawDeco(ctx, cx, cy, type) {
  const p = PIXEL;
  switch (type) {
    case 0: // tiny flower
      drawPixel(ctx, cx, cy - p, '#E8B8D0');
      drawPixel(ctx, cx, cy - p * 2, '#FFD0E0');
      break;
    case 1: // stone
      drawPixelRect(ctx, cx - p, cy - p, p * 2, p, '#C0B8A8');
      drawPixel(ctx, cx, cy - p * 2, '#D0C8B8');
      break;
    case 2: // grass tuft
      drawPixel(ctx, cx - p, cy - p, '#7BC47B');
      drawPixel(ctx, cx, cy - p * 2, '#8ED88E');
      drawPixel(ctx, cx + p, cy - p, '#7BC47B');
      break;
  }
}

// ============================================================
// Main render function
// ============================================================

export async function renderGarden(container) {
  const habits = await habitRepo.getAll();

  container.innerHTML = '';

  const screen = document.createElement('div');
  screen.className = 'garden-screen';

  const title = document.createElement('h1');
  title.className = 'garden-title';
  title.textContent = 'Garten';
  screen.appendChild(title);

  if (habits.length === 0) {
    screen.innerHTML += `
      <div class="garden-empty">
        <div class="garden-empty-emoji">🌱</div>
        <p>Erstelle deine erste Gewohnheit,<br>um deinen Garten zum Wachsen zu bringen!</p>
      </div>
    `;
    container.appendChild(screen);
    return;
  }

  // Gather habit data with streaks & health
  const today = todayString();
  const todayMs = new Date(today + 'T12:00:00').getTime();
  const habitData = [];

  for (const h of habits) {
    const streak = await habitRepo.getStreak(h.id);
    const completions = await habitRepo.getCompletionsForHabit(h.id);
    // Find last completion date
    let lastDate = null;
    for (const c of completions) {
      if (!lastDate || c.date > lastDate) lastDate = c.date;
    }
    const daysSince = lastDate
      ? Math.floor((todayMs - new Date(lastDate + 'T12:00:00').getTime()) / 86400000)
      : 999;

    // Check for debug stage override
    const debugOverrides = JSON.parse(localStorage.getItem('gardenDebugStages') || '{}');
    const debugStage = debugOverrides[h.id];

    habitData.push({
      habit: h,
      streak,
      stage: debugStage !== undefined ? debugStage : getGrowthStage(streak),
      health: debugStage !== undefined ? 'thriving' : getHealth(daysSince),
      plantType: h.plantType || 'bush',
    });
  }

  // Canvas setup
  const wrap = document.createElement('div');
  wrap.className = 'garden-canvas-wrap';

  // Calculate canvas size to fit isometric grid + sky + margin
  const gridCols = Math.max(COLS, Math.ceil(Math.sqrt(habits.length * 1.5)));
  const gridRows = Math.max(ROWS, Math.ceil(habits.length / gridCols));
  const canvasW = (gridCols + gridRows) * (TILE_W / 2) + TILE_W;
  const skyH = 80;
  const canvasH = (gridCols + gridRows) * (TILE_H / 2) + TILE_H * 3 + skyH;
  const originX = gridRows * (TILE_W / 2) + TILE_W / 2;
  const originY = skyH + TILE_H;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  wrap.appendChild(canvas);
  screen.appendChild(wrap);
  container.appendChild(screen);

  const ctx = canvas.getContext('2d');

  // Assign habits to grid positions
  const grid = Array.from({ length: gridRows }, () => Array(gridCols).fill(null));
  habitData.forEach((hd, i) => {
    const row = Math.floor(i / gridCols);
    const col = i % gridCols;
    if (row < gridRows) grid[row][col] = hd;
  });

  // Seeded pseudo-random for deterministic deco placement
  function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  }
  const rand = seededRand(42);

  // Pre-generate deco positions for empty tiles
  const decoMap = {};
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (!grid[r][c] && rand() > 0.4) {
        decoMap[`${r},${c}`] = Math.floor(rand() * 3);
      }
    }
  }

  // Animation loop
  let animFrame;
  let startTime = performance.now();
  let tooltip = null;

  function draw(time) {
    const elapsed = (time - startTime) / 1000;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
    skyGrad.addColorStop(0, '#C8E0F4');
    skyGrad.addColorStop(1, '#FFF8F0');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasW, skyH);

    // Grass background below sky
    ctx.fillStyle = '#C8E8C0';
    ctx.fillRect(0, skyH, canvasW, canvasH - skyH);

    // Draw tiles back-to-front (painter's algorithm)
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const { x, y } = isoToScreen(c, r, originX, originY);

        // Tile base
        const hd = grid[r][c];
        const tileColor = hd ? '#A8D8A8' : '#B8E0B0';
        drawTile(ctx, x, y, tileColor, '#98C898');

        if (hd) {
          // Draw plant centered on tile, slightly above
          const animOff = elapsed * 1.5 + r * 0.7 + c * 1.1;
          drawPlant(ctx, x, y - TILE_H / 4, hd.plantType, hd.stage, hd.health, animOff);
        } else {
          // Maybe draw a deco element
          const deco = decoMap[`${r},${c}`];
          if (deco !== undefined) {
            drawDeco(ctx, x, y - 2, deco);
          }
        }
      }
    }

    animFrame = requestAnimationFrame(draw);
  }

  animFrame = requestAnimationFrame(draw);

  // Tooltip on tap
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const iso = screenToIso(cx, cy, originX, originY);

    // Remove existing tooltip
    wrap.querySelector('.garden-tooltip')?.remove();

    if (iso.row >= 0 && iso.row < gridRows && iso.col >= 0 && iso.col < gridCols) {
      const hd = grid[iso.row][iso.col];
      if (hd) {
        const { x, y } = isoToScreen(iso.col, iso.row, originX, originY);
        const screenX = x / scaleX;
        const screenY = (y - TILE_H * 2) / scaleY;

        const tip = document.createElement('div');
        tip.className = 'garden-tooltip';
        tip.style.left = screenX + 'px';
        tip.style.top = screenY + 'px';
        tip.innerHTML = `
          <span class="garden-tooltip-emoji">${hd.habit.emoji || '✨'}</span>
          <div class="garden-tooltip-name">${hd.habit.name}</div>
          <div class="garden-tooltip-streak">🔥 ${hd.streak} Tage Streak</div>
          <div class="garden-tooltip-stage">${STAGE_NAMES[hd.stage]}</div>
          <div class="garden-debug-controls" style="display:flex;gap:4px;margin-top:6px;justify-content:center;">
            ${STAGE_NAMES.map((name, i) => `<button data-stage="${i}" style="font-size:10px;padding:2px 6px;border-radius:4px;border:1px solid #8B5CF6;background:${i===hd.stage?'#8B5CF6':'#FFF8F0'};color:${i===hd.stage?'#fff':'#4A4A4A'};cursor:pointer;">${i+1}</button>`).join('')}
          </div>
        `;
        // Debug: change growth stage on button click (touch + click)
        tip.querySelectorAll('.garden-debug-controls button').forEach(btn => {
          const handler = async (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
            const newStage = parseInt(btn.dataset.stage);
            const overrides = JSON.parse(localStorage.getItem('gardenDebugStages') || '{}');
            overrides[hd.habit.id] = newStage;
            localStorage.setItem('gardenDebugStages', JSON.stringify(overrides));
            tip.remove();
            await renderGarden(container);
          };
          btn.addEventListener('touchend', handler);
          btn.addEventListener('click', handler);
        });
        wrap.appendChild(tip);

        // Auto-hide after 8s (longer for debug)
        setTimeout(() => tip.remove(), 8000);
      }
    }
  });

  // Cleanup animation on view change
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container) || container.innerHTML === '') {
      cancelAnimationFrame(animFrame);
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true });
}
