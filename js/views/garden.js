/**
 * Garden View - Isometric pixel-art garden with collect & place mechanic.
 * Plants are earned as weekly rewards and placed manually by the user.
 */

import habitRepo from '../repo/habitRepo.js';
import { checkWeeklyRewards, addTestPlant, RARITY_LABELS, RARITY_COLORS, RARITY_TO_STAGE } from '../utils/rewards.js';
import { escapeHtml } from '../utils/sanitize.js';

// ============================================================
// Constants & Palette
// ============================================================

let gardenCleanup = null;

/** Cancel all garden animation frames */
export function cleanupGarden() {
  if (gardenCleanup) {
    gardenCleanup();
    gardenCleanup = null;
  }
}

const TILE_W = 64;
const TILE_H = 32;
const PIXEL = 5;
const COLS = 6;
const ROWS = 5;

// Color palettes per plant type
const PLANT_PALETTES = {
  tulip:     { stem: '#6BBF6B', leaf: '#8ED88E', bloom1: '#F4A0C0', bloom2: '#E878A0', bloom3: '#D05A80' },
  sunflower: { stem: '#6BBF6B', leaf: '#8ED88E', bloom1: '#FFD966', bloom2: '#FFB833', bloom3: '#E89520' },
  bush:      { stem: '#5A9B5A', leaf: '#7BC47B', bloom1: '#A8D8A8', bloom2: '#6BBF6B', bloom3: '#4A8F4A' },
  cherry:    { stem: '#9B7B5B', leaf: '#A8D8A8', bloom1: '#DDA0DD', bloom2: '#C77DC7', bloom3: '#8B5CF6' },
  mushroom:  { stem: '#D8C8B0', leaf: '#E8D8C0', bloom1: '#D88888', bloom2: '#C06060', bloom3: '#8B5CF6' },
  grass:     { stem: '#7BC47B', leaf: '#A8D8A8', bloom1: '#8ED88E', bloom2: '#6BBF6B', bloom3: '#5A9B5A' },
  clover:    { stem: '#5A9B5A', leaf: '#6BBF6B', bloom1: '#8ED88E', bloom2: '#A8D8A8', bloom3: '#E8F5E8' },
  fern:      { stem: '#4A8F4A', leaf: '#6BBF6B', bloom1: '#7BC47B', bloom2: '#8ED88E', bloom3: '#A8D8A8' },
  daisy:     { stem: '#6BBF6B', leaf: '#8ED88E', bloom1: '#FFFFFF', bloom2: '#F8D480', bloom3: '#FFE8B0' },
  appletree: { stem: '#8B6B4B', leaf: '#7BC47B', bloom1: '#E06040', bloom2: '#CC4030', bloom3: '#6BBF6B' },
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

/** Shift hue of a hex color by degrees (-180 to 180) while keeping it pastel */
function shiftHue(hex, degrees) {
  let [r, g, b] = hexToRgb(hex).map(v => v / 255);
  // RGB to HSL
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  // Shift hue
  h = ((h * 360 + degrees) % 360 + 360) % 360 / 360;
  // HSL to RGB
  function hue2rgb(p, q, t) {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  }
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return rgbToHex(r * 255, g * 255, b * 255);
}

// ============================================================
// Isometric projection
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
// Drawing primitives
// ============================================================

function drawPixel(ctx, x, y, color, size = PIXEL) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}

function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

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
// Plant drawing functions (pixel art, 5 stages)
// ============================================================

function drawPlant(ctx, cx, cy, plantType, stage, animOffset, pixelSize = PIXEL, col = 0, row = 0) {
  const pal = PLANT_PALETTES[plantType] || PLANT_PALETTES.bush;
  // Randomize bloom colors slightly per plant instance (seeded by grid position for consistency)
  const seed = (col ?? 0) * 7 + (row ?? 0) * 13;
  const hueShift = ((seed * 37 + 17) % 60) - 30; // -30 to +30 degree shift
  const { stem, leaf } = pal;
  const b1 = shiftHue(pal.bloom1, hueShift);
  const b2 = shiftHue(pal.bloom2, hueShift);
  const b3 = shiftHue(pal.bloom3, hueShift);
  const soil = '#8B7355';
  const health = 'thriving'; // placed plants are always healthy

  const sway = Math.sin(animOffset) * 1;
  const droop = 0;
  const p = pixelSize;

  const bx = cx + sway;
  const by = cy;

  // Shadow
  const shadowW = p * (1.2 + stage * 0.8);
  const shadowH = p * (0.6 + stage * 0.3);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#2D2D2D';
  ctx.beginPath();
  ctx.ellipse(bx + p / 2, by + p, shadowW, shadowH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  switch (plantType) {
    case 'tulip': drawTulip(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'daisy': drawTulip(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'sunflower': drawSunflower(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'bush': drawBush(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'grass': drawBush(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'clover': drawBush(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'fern': drawBush(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'cherry': drawCherry(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'appletree': drawCherry(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'mushroom': drawMushroom(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    default: drawBush(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop);
  }
}

// --- Individual plant draw functions (unchanged pixel art) ---

function drawTulip(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) { drawPixelRect(ctx, x-p, y-p, p*3, p, soil); drawPixel(ctx, x, y-p*2, '#6B5B3B'); return; }
  if (stage === 1) { drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x+p, y-p*3, leaf); return; }
  if (stage === 2) { drawPixelRect(ctx, x, y-p*5, p, p*4, stem); drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*4, leaf); drawPixel(ctx, x, y-p*5-droop, b1); return; }
  if (stage === 3) {
    drawPixelRect(ctx, x, y-p*7, p, p*6, stem); drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x+p, y-p*5, leaf); drawPixel(ctx, x-p, y-p*6, leaf);
    drawPixel(ctx, x, y-p*7-droop, b2); drawPixel(ctx, x-p, y-p*7-droop, b1); drawPixel(ctx, x+p, y-p*7-droop, b1); drawPixel(ctx, x, y-p*8-droop, b1); return;
  }
  drawPixelRect(ctx, x, y-p*9, p, p*8, stem); drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*5, leaf); drawPixel(ctx, x+p, y-p*6, leaf); drawPixel(ctx, x+p*2, y-p*7, leaf);
  drawPixelRect(ctx, x-p, y-p*10-droop, p*3, p*2, b1); drawPixel(ctx, x, y-p*11-droop, b2); drawPixel(ctx, x-p, y-p*11-droop, b3); drawPixel(ctx, x+p, y-p*11-droop, b3); drawPixel(ctx, x, y-p*12-droop, b2);
}

function drawSunflower(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) { drawPixelRect(ctx, x-p, y-p, p*3, p, soil); drawPixel(ctx, x, y-p*2, '#8B7355'); return; }
  if (stage === 1) { drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x-p, y-p*2, leaf); return; }
  if (stage === 2) { drawPixelRect(ctx, x, y-p*6, p, p*5, stem); drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*5, leaf); drawPixel(ctx, x, y-p*6-droop, b1); drawPixel(ctx, x+p, y-p*6-droop, b2); return; }
  if (stage === 3) {
    drawPixelRect(ctx, x, y-p*8, p, p*7, stem); drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x+p, y-p*6, leaf); drawPixel(ctx, x-p, y-p*7, leaf);
    drawPixel(ctx, x, y-p*8-droop, b3); drawPixel(ctx, x-p, y-p*8-droop, b1); drawPixel(ctx, x+p, y-p*8-droop, b1); drawPixel(ctx, x, y-p*9-droop, b1); drawPixel(ctx, x, y-p*7-droop, b2); return;
  }
  if (stage === 4) {
    drawPixelRect(ctx, x, y-p*11, p, p*10, stem); drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*5, leaf); drawPixel(ctx, x+p, y-p*7, leaf); drawPixel(ctx, x+p*2, y-p*8, leaf);
    drawPixelRect(ctx, x-p, y-p*12-droop, p*3, p*3, b1); drawPixelRect(ctx, x, y-p*12-droop, p, p*2, b3); drawPixel(ctx, x-p*2, y-p*11-droop, b2); drawPixel(ctx, x+p*2, y-p*11-droop, b2); drawPixel(ctx, x, y-p*13-droop, b2);
    return;
  }
  // Stage 5: Legendary sunflower – twin blooms, taller, sparkles
  drawPixelRect(ctx, x, y-p*13, p, p*12, stem); drawPixel(ctx, x-p, y-p*5, leaf); drawPixel(ctx, x-p*2, y-p*6, leaf); drawPixel(ctx, x+p, y-p*8, leaf); drawPixel(ctx, x+p*2, y-p*9, leaf); drawPixel(ctx, x-p, y-p*10, leaf);
  drawPixelRect(ctx, x-p, y-p*14-droop, p*3, p*3, b1); drawPixelRect(ctx, x, y-p*14-droop, p, p*2, b3); drawPixel(ctx, x-p*2, y-p*13-droop, b2); drawPixel(ctx, x+p*2, y-p*13-droop, b2); drawPixel(ctx, x, y-p*15-droop, b2);
  // Second bloom
  drawPixelRect(ctx, x+p*2, y-p*11-droop, p*2, p*2, b1); drawPixel(ctx, x+p*2, y-p*12-droop, b3);
  drawPixel(ctx, x-p, y-p*15-droop, '#FFF8E0'); drawPixel(ctx, x+p, y-p*14-droop, '#FFFDE8');
}

function drawBush(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) { drawPixelRect(ctx, x-p, y-p, p*3, p, soil); drawPixel(ctx, x, y-p*2, '#5A8F5A'); return; }
  if (stage === 1) { drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*3, leaf); return; }
  if (stage === 2) { drawPixelRect(ctx, x, y-p*4, p, p*3, stem); drawPixelRect(ctx, x-p, y-p*4-droop, p*3, p*2, b1); drawPixel(ctx, x-p*2, y-p*3, leaf); drawPixel(ctx, x+p*2, y-p*3, leaf); return; }
  if (stage === 3) {
    drawPixelRect(ctx, x, y-p*5, p, p*4, stem); drawPixelRect(ctx, x-p*2, y-p*6-droop, p*5, p*3, b1);
    drawPixel(ctx, x-p, y-p*7-droop, b2); drawPixel(ctx, x+p, y-p*7-droop, b2); drawPixel(ctx, x, y-p*8-droop, b3); return;
  }
  drawPixelRect(ctx, x, y-p*6, p, p*5, stem); drawPixelRect(ctx, x-p*3, y-p*8-droop, p*7, p*4, b1); drawPixelRect(ctx, x-p*2, y-p*9-droop, p*5, p*2, b2);
  drawPixel(ctx, x, y-p*10-droop, b3); drawPixel(ctx, x-p*2, y-p*10-droop, b3); drawPixel(ctx, x+p*2, y-p*10-droop, b3);
}

function drawCherry(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) { drawPixelRect(ctx, x-p, y-p, p*3, p, soil); drawPixel(ctx, x, y-p*2, '#7B5B3B'); return; }
  if (stage === 1) { drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x+p, y-p*3, leaf); return; }
  if (stage === 2) { drawPixelRect(ctx, x, y-p*5, p, p*4, stem); drawPixel(ctx, x-p, y-p*5-droop, leaf); drawPixel(ctx, x+p, y-p*5-droop, leaf); drawPixel(ctx, x, y-p*6-droop, leaf); return; }
  if (stage === 3) {
    drawPixelRect(ctx, x, y-p*7, p, p*6, stem); drawPixelRect(ctx, x-p*2, y-p*8-droop, p*5, p*3, leaf);
    drawPixel(ctx, x-p, y-p*9-droop, b1); drawPixel(ctx, x+p, y-p*8-droop, b1); drawPixel(ctx, x, y-p*10-droop, b2); return;
  }
  if (stage === 4) {
    drawPixelRect(ctx, x, y-p*9, p*2, p*8, stem); drawPixelRect(ctx, x-p*3, y-p*11-droop, p*8, p*4, leaf); drawPixelRect(ctx, x-p*2, y-p*13-droop, p*6, p*2, leaf);
    drawPixel(ctx, x-p*2, y-p*12-droop, b1); drawPixel(ctx, x+p*2, y-p*11-droop, b1); drawPixel(ctx, x, y-p*13-droop, b2); drawPixel(ctx, x-p, y-p*11-droop, b2);
    drawPixel(ctx, x+p*3, y-p*12-droop, b1); drawPixel(ctx, x-p*3, y-p*13-droop, b3); drawPixel(ctx, x+p, y-p*14-droop, b3);
    return;
  }
  // Stage 5: Legendary – massive tree with extra blooms and sparkles
  drawPixelRect(ctx, x-p/2, y-p*11, p*3, p*10, stem); drawPixel(ctx, x-p*2, y-p*6, stem); drawPixel(ctx, x+p*3, y-p*7, stem);
  drawPixelRect(ctx, x-p*4, y-p*13-droop, p*10, p*5, leaf); drawPixelRect(ctx, x-p*3, y-p*16-droop, p*8, p*3, leaf); drawPixelRect(ctx, x-p*2, y-p*17-droop, p*6, p, leaf);
  // Extra blooms
  drawPixel(ctx, x-p*3, y-p*14-droop, b1); drawPixel(ctx, x+p*4, y-p*14-droop, b1);
  drawPixel(ctx, x-p*2, y-p*16-droop, b2); drawPixel(ctx, x+p*2, y-p*16-droop, b2);
  drawPixel(ctx, x, y-p*17-droop, b1); drawPixel(ctx, x+p*3, y-p*15-droop, b3);
  drawPixel(ctx, x-p, y-p*13-droop, b2); drawPixel(ctx, x+p, y-p*15-droop, b1);
  drawPixel(ctx, x-p*3, y-p*12-droop, b3); drawPixel(ctx, x+p*4, y-p*12-droop, b3);
  // Sparkles (white/gold highlights)
  drawPixel(ctx, x-p*3, y-p*16-droop, '#FFF8E0'); drawPixel(ctx, x+p*3, y-p*17-droop, '#FFF8E0');
  drawPixel(ctx, x+p, y-p*13-droop, '#FFFDE8'); drawPixel(ctx, x-p*2, y-p*15-droop, '#FFFDE8');
}

function drawMushroom(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) { drawPixelRect(ctx, x-p, y-p, p*3, p, soil); drawPixel(ctx, x, y-p*2, '#C0A0A0'); return; }
  if (stage === 1) { drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, b1); return; }
  if (stage === 2) { drawPixelRect(ctx, x, y-p*3, p, p*2, stem); drawPixelRect(ctx, x-p, y-p*4-droop, p*3, p*2, b1); drawPixel(ctx, x, y-p*5-droop, b2); return; }
  if (stage === 3) {
    drawPixelRect(ctx, x, y-p*4, p, p*3, stem); drawPixelRect(ctx, x-p*2, y-p*5-droop, p*5, p*2, b1);
    drawPixel(ctx, x-p, y-p*6-droop, b2); drawPixel(ctx, x+p, y-p*6-droop, b2); drawPixel(ctx, x, y-p*6-droop, leaf); return;
  }
  drawPixelRect(ctx, x-p/2, y-p*5, p*2, p*4, stem); drawPixelRect(ctx, x-p*3, y-p*7-droop, p*7, p*3, b1); drawPixelRect(ctx, x-p*2, y-p*8-droop, p*5, p, b2);
  drawPixel(ctx, x-p*2, y-p*7-droop, leaf); drawPixel(ctx, x+p*2, y-p*6-droop, leaf); drawPixel(ctx, x, y-p*8-droop, leaf);
  drawPixelRect(ctx, x+p*3, y-p*2, p, p*2, stem); drawPixelRect(ctx, x+p*2, y-p*3, p*3, p*2, b3);
}

// Decorative elements for empty tiles
function drawDeco(ctx, cx, cy, type) {
  const p = PIXEL;
  switch (type) {
    case 0: drawPixel(ctx, cx, cy-p, '#E8B8D0'); drawPixel(ctx, cx, cy-p*2, '#FFD0E0'); break;
    case 1: drawPixelRect(ctx, cx-p, cy-p, p*2, p, '#C0B8A8'); drawPixel(ctx, cx, cy-p*2, '#D0C8B8'); break;
    case 2: drawPixel(ctx, cx-p, cy-p, '#7BC47B'); drawPixel(ctx, cx, cy-p*2, '#8ED88E'); drawPixel(ctx, cx+p, cy-p, '#7BC47B'); break;
  }
}

// ============================================================
// Inventory icon drawing (small preview of plant)
// ============================================================

function drawPlantIcon(canvas, plantType, stage) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height - 4;
  drawPlant(ctx, cx, cy, plantType, stage, 0, 3);
}

// ============================================================
// Main render function
// ============================================================

export async function renderGarden(container) {
  container.innerHTML = '';

  // Check for weekly rewards
  const newPlants = await checkWeeklyRewards();

  const screen = document.createElement('div');
  screen.className = 'garden-screen';

  const title = document.createElement('h1');
  title.className = 'garden-title';
  title.textContent = 'Garten';
  screen.appendChild(title);

  // Debug button
  const debugBtn = document.createElement('button');
  debugBtn.className = 'garden-debug-btn';
  debugBtn.textContent = '🎁 Test-Pflanze';
  debugBtn.addEventListener('click', async () => {
    await addTestPlant();
    renderGarden(container);
  });
  screen.appendChild(debugBtn);

  // State
  let placementMode = null; // GardenPlant being placed, or null
  let placedPlants = await habitRepo.getPlacedPlants();
  let unplacedPlants = await habitRepo.getUnplacedPlants();

  // Build placed plants map: "col,row" -> plant
  const plantGrid = {};
  for (const p of placedPlants) {
    if (p.gridCol !== null && p.gridRow !== null) {
      plantGrid[`${p.gridCol},${p.gridRow}`] = p;
    }
  }

  // Canvas setup - grid grows when >70% full
  const totalPlants = placedPlants.length;
  const baseSlots = COLS * ROWS;
  let gridCols = COLS;
  let gridRows = ROWS;
  while (totalPlants > gridCols * gridRows * 0.6) {
    gridCols += 2;
    gridRows += 1;
  }
  const canvasW = (gridCols + gridRows) * (TILE_W / 2) + TILE_W;
  const skyH = 80;
  const canvasH = (gridCols + gridRows) * (TILE_H / 2) + TILE_H * 3 + skyH;
  const originX = gridRows * (TILE_W / 2) + TILE_W / 2;
  const originY = skyH + TILE_H;

  const wrap = document.createElement('div');
  wrap.className = 'garden-canvas-wrap';

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  wrap.appendChild(canvas);

  // Placement mode indicator
  const placementIndicator = document.createElement('div');
  placementIndicator.className = 'garden-placement-indicator hidden';
  placementIndicator.innerHTML = `
    <span class="placement-text">Tippe auf eine Grasfläche zum Platzieren</span>
    <button class="placement-cancel-btn">✕ Abbrechen</button>
  `;
  wrap.appendChild(placementIndicator);

  screen.appendChild(wrap);

  // Inventory bar
  const inventoryBar = document.createElement('div');
  inventoryBar.className = 'garden-inventory';
  const inventoryTitle = document.createElement('div');
  inventoryTitle.className = 'garden-inventory-title';
  inventoryTitle.textContent = `Inventar (${unplacedPlants.length})`;
  inventoryBar.appendChild(inventoryTitle);

  const inventoryScroll = document.createElement('div');
  inventoryScroll.className = 'garden-inventory-scroll';
  inventoryBar.appendChild(inventoryScroll);
  screen.appendChild(inventoryBar);

  // Collection / Pokédex: all possible plant+rarity combos
  const allPlants = await habitRepo.getAllGardenPlants();
  const ownedSet = new Set(allPlants.map(p => `${p.plantType}-${p.rarity}`));

  const PLANT_NAMES = {
    bush: 'Busch', tulip: 'Tulpe', sunflower: 'Sonnenblume',
    cherry: 'Kirschbaum', mushroom: 'Pilz', grass: 'Gras',
    clover: 'Klee', fern: 'Farn', daisy: 'Gänseblümchen',
    appletree: 'Apfelbaum'
  };
  const ALL_COMBOS = [
    { type: 'bush', rarity: 'common' }, { type: 'mushroom', rarity: 'common' },
    { type: 'grass', rarity: 'common' }, { type: 'clover', rarity: 'common' },
    { type: 'tulip', rarity: 'uncommon' }, { type: 'mushroom', rarity: 'uncommon' },
    { type: 'fern', rarity: 'uncommon' }, { type: 'daisy', rarity: 'uncommon' },
    { type: 'sunflower', rarity: 'rare' }, { type: 'bush', rarity: 'rare' },
    { type: 'cherry', rarity: 'epic' }, { type: 'appletree', rarity: 'epic' },
    { type: 'cherry', rarity: 'legendary' }, { type: 'sunflower', rarity: 'legendary' },
  ];

  const collection = document.createElement('div');
  collection.className = 'garden-collection';
  const collTitle = document.createElement('div');
  collTitle.className = 'garden-collection-title';
  const ownedCount = ALL_COMBOS.filter(c => ownedSet.has(`${c.type}-${c.rarity}`)).length;
  collTitle.textContent = `Sammlung (${ownedCount}/${ALL_COMBOS.length})`;
  collection.appendChild(collTitle);

  const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
  // Find max items per rarity for grid row count
  const maxPerCol = Math.max(...RARITY_ORDER.map(r => ALL_COMBOS.filter(c => c.rarity === r).length));

  const collGrid = document.createElement('div');
  collGrid.className = 'collection-columns';

  for (const rarity of RARITY_ORDER) {
    const combos = ALL_COMBOS.filter(c => c.rarity === rarity);
    const col = document.createElement('div');
    col.className = 'collection-col';

    for (const combo of combos) {
      const owned = ownedSet.has(`${combo.type}-${combo.rarity}`);
      const item = document.createElement('div');
      item.className = `collection-item ${owned ? '' : 'locked'}`;
      item.style.borderColor = owned ? RARITY_COLORS[combo.rarity] : '#E0D8D0';

      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 48;
      iconCanvas.height = 48;
      const stage = RARITY_TO_STAGE[combo.rarity];
      drawPlantIcon(iconCanvas, combo.type, stage);
      if (!owned) iconCanvas.style.filter = 'grayscale(1) opacity(0.3)';

      const label = document.createElement('div');
      label.className = 'collection-item-label';
      label.innerHTML = `<span style="font-size:9px;color:#8A8A8A;">${RARITY_LABELS[combo.rarity]}</span><br><span style="color:${RARITY_COLORS[combo.rarity]};font-weight:600;">${PLANT_NAMES[combo.type]}</span>`;

      item.appendChild(iconCanvas);
      item.appendChild(label);
      col.appendChild(item);
    }
    collGrid.appendChild(col);
  }
  collection.appendChild(collGrid);
  screen.appendChild(collection);

  container.appendChild(screen);

  // Show reward popup if new plants were earned
  if (newPlants.length > 0) {
    showRewardPopup(newPlants, () => {
      // Refresh inventory display
      refreshInventory();
    });
  }

  const ctx = canvas.getContext('2d');

  // Seeded random for deco and grass
  function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
  }

  // Grass tile color variation (seeded by position)
  const GRASS_GREENS = ['#A8D8A8', '#96CC96', '#B4E0B4'];
  const GRASS_DARK = ['#8EC08E', '#82B882'];
  const grassColorMap = {};
  const grassTuftMap = {};
  {
    const gr = seededRand(77);
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const k = `${c},${r}`;
        grassColorMap[k] = GRASS_GREENS[Math.floor(gr() * GRASS_GREENS.length)];
        // ~40% of tiles get a grass tuft (1-2 darker pixels)
        if (gr() < 0.4) {
          grassTuftMap[k] = {
            ox: Math.floor(gr() * 20) - 10,
            oy: Math.floor(gr() * 8) - 4,
            color: GRASS_DARK[Math.floor(gr() * GRASS_DARK.length)]
          };
        }
      }
    }
  }

  // Ground details on empty tiles (~30%)
  const groundDetailMap = {};
  {
    const dr = seededRand(123);
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        if (dr() < 0.3) {
          const type = dr() < 0.33 ? 'stone' : dr() < 0.66 ? 'tuft' : 'flower';
          groundDetailMap[`${c},${r}`] = {
            type,
            ox: Math.floor(dr() * 16) - 8,
            oy: Math.floor(dr() * 6) - 3,
            flowerColor: ['#E8B8D0', '#D0B8E8', '#F0E0A0'][Math.floor(dr() * 3)]
          };
        }
      }
    }
  }

  const rand = seededRand(42);
  const decoMap = {};
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (rand() > 0.4) {
        decoMap[`${c},${r}`] = Math.floor(rand() * 3);
      }
    }
  }

  // Butterflies
  const butterflies = [];
  const BUTTERFLY_COLORS = ['#F4A0C0', '#D0B8E8', '#F0E0A0'];
  for (let i = 0; i < 2; i++) {
    butterflies.push({
      x: Math.random() * canvasW,
      y: skyH + Math.random() * (canvasH - skyH) * 0.5,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.2,
      color: BUTTERFLY_COLORS[i % BUTTERFLY_COLORS.length],
      phase: Math.random() * Math.PI * 2,
      wanderTimer: 0
    });
  }

  function drawButterfly(ctx, bf, time) {
    const wingOpen = Math.sin(time * 5 + bf.phase) > 0;
    const p = 2;
    const bx = Math.round(bf.x);
    const by = Math.round(bf.y);
    // Body
    ctx.fillStyle = '#6B5B3B';
    ctx.fillRect(bx, by, p, p * 3);
    // Wings
    ctx.fillStyle = bf.color;
    if (wingOpen) {
      ctx.fillRect(bx - p * 2, by, p * 2, p * 2);
      ctx.fillRect(bx + p, by, p * 2, p * 2);
      ctx.fillRect(bx - p, by + p * 2, p, p);
      ctx.fillRect(bx + p, by + p * 2, p, p);
    } else {
      ctx.fillRect(bx - p, by, p, p * 2);
      ctx.fillRect(bx + p, by, p, p * 2);
    }
  }

  function updateButterfly(bf, dt) {
    bf.wanderTimer -= dt;
    if (bf.wanderTimer <= 0) {
      bf.vx += (Math.random() - 0.5) * 0.3;
      bf.vy += (Math.random() - 0.5) * 0.15;
      bf.vx = Math.max(-0.5, Math.min(0.5, bf.vx));
      bf.vy = Math.max(-0.3, Math.min(0.3, bf.vy));
      bf.wanderTimer = 1 + Math.random() * 2;
    }
    bf.x += bf.vx;
    bf.y += bf.vy;
    // Respawn if out of bounds
    if (bf.x < -20 || bf.x > canvasW + 20 || bf.y < skyH - 20 || bf.y > canvasH + 20) {
      bf.x = Math.random() * canvasW;
      bf.y = skyH + Math.random() * (canvasH - skyH) * 0.4;
      bf.vx = (Math.random() - 0.5) * 0.4;
      bf.vy = (Math.random() - 0.5) * 0.2;
    }
  }

  // Fence drawing
  function drawFence(ctx) {
    const WOOD = '#9B7B5B';
    const WOOD_DARK = '#7B5B3B';
    const postW = 6;
    const postH = 20;
    const railH = 3;

    // Get corner screen positions (with some padding)
    const pad = 8;
    const corners = [
      isoToScreen(0, 0, originX, originY),            // top
      isoToScreen(gridCols, 0, originX, originY),      // right
      isoToScreen(gridCols, gridRows, originX, originY), // bottom
      isoToScreen(0, gridRows, originX, originY),      // left
    ];

    // Draw fence along each edge
    const edges = [
      [corners[0], corners[1]], // top-right edge
      [corners[1], corners[2]], // bottom-right edge
      [corners[2], corners[3]], // bottom-left edge
      [corners[3], corners[0]], // top-left edge
    ];

    const gateEdge = 2; // bottom-left edge has gate
    const gateCenter = 0.5;
    const gateWidth = 0.12;

    for (let ei = 0; ei < edges.length; ei++) {
      const [from, to] = edges[ei];
      const segments = 8;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        // Skip gate area
        if (ei === gateEdge && Math.abs(t - gateCenter) < gateWidth) continue;

        const px = from.x + (to.x - from.x) * t;
        const py = from.y + (to.y - from.y) * t;

        // Posts every other segment point
        if (i % 2 === 0) {
          ctx.fillStyle = WOOD_DARK;
          ctx.fillRect(Math.round(px - postW / 2), Math.round(py - postH), postW, postH + 2);
          ctx.fillStyle = WOOD;
          ctx.fillRect(Math.round(px - postW / 2 + 1), Math.round(py - postH), postW - 2, postH);
          // Post cap
          ctx.fillStyle = WOOD_DARK;
          ctx.fillRect(Math.round(px - postW / 2), Math.round(py - postH - 2), postW, 2);
        }
      }

      // Rails between posts
      for (let i = 0; i < segments; i += 2) {
        const t1 = i / segments;
        const t2 = Math.min((i + 2) / segments, 1);
        // Skip gate
        if (ei === gateEdge) {
          if (t1 < gateCenter + gateWidth && t2 > gateCenter - gateWidth) continue;
        }
        const x1 = from.x + (to.x - from.x) * t1;
        const y1 = from.y + (to.y - from.y) * t1;
        const x2 = from.x + (to.x - from.x) * t2;
        const y2 = from.y + (to.y - from.y) * t2;

        for (const railOff of [-14, -7]) {
          ctx.strokeStyle = WOOD;
          ctx.lineWidth = railH;
          ctx.beginPath();
          ctx.moveTo(Math.round(x1), Math.round(y1 + railOff));
          ctx.lineTo(Math.round(x2), Math.round(y2 + railOff));
          ctx.stroke();
          // Dark underline for depth
          ctx.strokeStyle = WOOD_DARK;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(Math.round(x1), Math.round(y1 + railOff + railH / 2));
          ctx.lineTo(Math.round(x2), Math.round(y2 + railOff + railH / 2));
          ctx.stroke();
        }
      }
    }
  }

  function drawGroundDetail(ctx, cx, cy, detail) {
    const p = 2;
    switch (detail.type) {
      case 'stone':
        ctx.fillStyle = '#B0A898';
        ctx.fillRect(cx + detail.ox, cy + detail.oy, p * 2, p);
        ctx.fillStyle = '#C8C0B0';
        ctx.fillRect(cx + detail.ox + p, cy + detail.oy - p, p, p);
        break;
      case 'tuft':
        ctx.fillStyle = '#7AAC7A';
        ctx.fillRect(cx + detail.ox, cy + detail.oy, p, p);
        ctx.fillRect(cx + detail.ox + p, cy + detail.oy - p, p, p);
        break;
      case 'flower':
        ctx.fillStyle = detail.flowerColor;
        ctx.fillRect(cx + detail.ox, cy + detail.oy, p, p);
        break;
    }
  }

  // Animation
  let animFrame;
  const startTime = performance.now();
  let lastTime = startTime;

  function draw(time) {
    const elapsed = (time - startTime) / 1000;
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    ctx.clearRect(0, 0, canvasW, canvasH);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
    skyGrad.addColorStop(0, '#C8E0F4');
    skyGrad.addColorStop(1, '#FFF8F0');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasW, skyH);

    // Grass background
    ctx.fillStyle = '#C8E8C0';
    ctx.fillRect(0, skyH, canvasW, canvasH - skyH);

    // Draw fence (behind tiles)
    drawFence(ctx);

    // Draw tiles (back-to-front)
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const { x, y } = isoToScreen(c, r, originX, originY);
        const key = `${c},${r}`;
        const plant = plantGrid[key];
        const isEmpty = !plant;

        // Grass variation tile color
        let tileColor = grassColorMap[key] || '#A8D8A8';
        if (placementMode && isEmpty) {
          tileColor = '#D0F0D0';
        }

        drawTile(ctx, x, y, tileColor, '#98C898');

        // Grass tufts (tiny darker spots)
        const tuft = grassTuftMap[key];
        if (tuft) {
          ctx.fillStyle = tuft.color;
          ctx.fillRect(x + tuft.ox, y + tuft.oy, 2, 2);
        }

        if (plant) {
          const animOff = elapsed * 1.5 + r * 0.7 + c * 1.1;
          const stage = plant.growthStage ?? RARITY_TO_STAGE[plant.rarity] ?? 2;
          const pxSize = plant.rarity === 'legendary' ? PIXEL + 1 : PIXEL;
          drawPlant(ctx, x, y, plant.plantType, stage, animOff, pxSize, c, r);
        } else {
          // Ground details on empty tiles
          const detail = groundDetailMap[key];
          if (detail && !placementMode) {
            drawGroundDetail(ctx, x, y - 2, detail);
          }
          const deco = decoMap[key];
          if (deco !== undefined && !placementMode) {
            drawDeco(ctx, x, y - 2, deco);
          }
        }
      }
    }

    // Butterflies
    for (const bf of butterflies) {
      updateButterfly(bf, dt);
      drawButterfly(ctx, bf, elapsed);
    }

    animFrame = requestAnimationFrame(draw);
  }

  animFrame = requestAnimationFrame(draw);

  // --- Canvas click handler ---
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const iso = screenToIso(cx, cy, originX, originY);

    // Remove existing tooltip
    wrap.querySelector('.garden-tooltip')?.remove();

    if (iso.row < 0 || iso.row >= gridRows || iso.col < 0 || iso.col >= gridCols) return;

    const key = `${iso.col},${iso.row}`;

    if (placementMode) {
      // Place the plant if tile is empty
      if (!plantGrid[key]) {
        habitRepo.placePlant(placementMode.id, iso.col, iso.row).then(() => {
          plantGrid[key] = { ...placementMode, gridCol: iso.col, gridRow: iso.row, placed: 1 };
          placementMode = null;
          placementIndicator.classList.add('hidden');
          refreshInventory();
        });
      }
      return;
    }

    // Show tooltip for placed plant
    const plant = plantGrid[key];
    if (plant) {
      const { x, y } = isoToScreen(iso.col, iso.row, originX, originY);
      const screenX = x / scaleX;
      const screenY = (y - TILE_H * 2) / scaleY;

      const tip = document.createElement('div');
      tip.className = 'garden-tooltip';
      tip.style.left = screenX + 'px';
      tip.style.top = screenY + 'px';
      const rarityColor = RARITY_COLORS[plant.rarity] || '#8ED88E';
      tip.innerHTML = `
        <div class="garden-tooltip-name">${plant.plantType === 'cherry' ? '🌸' : plant.plantType === 'sunflower' ? '🌻' : plant.plantType === 'tulip' ? '🌷' : plant.plantType === 'mushroom' ? '🍄' : '🌿'} ${capitalize(plant.plantType)}</div>
        <div class="garden-tooltip-rarity" style="color:${rarityColor}">${RARITY_LABELS[plant.rarity] || plant.rarity}</div>
        <div class="garden-tooltip-detail">Verdient durch: ${escapeHtml(plant.habitName)}</div>
        <div class="garden-tooltip-detail">Woche: ${plant.weekEarned}</div>
        <button class="garden-tooltip-remove-btn">↩ Entfernen</button>
      `;
      // Remove button: unplace plant back to inventory
      tip.querySelector('.garden-tooltip-remove-btn').addEventListener('click', async (ev) => {
        ev.stopPropagation();
        await habitRepo.unplacePlant(plant.id);
        delete plantGrid[key];
        tip.remove();
        refreshInventory();
      });
      wrap.appendChild(tip);
      setTimeout(() => tip.remove(), 8000);
    }
  });

  // --- Cancel placement ---
  placementIndicator.querySelector('.placement-cancel-btn').addEventListener('click', () => {
    placementMode = null;
    placementIndicator.classList.add('hidden');
    refreshInventory();
  });

  // --- Inventory rendering ---
  function refreshInventory() {
    habitRepo.getUnplacedPlants().then(plants => {
      unplacedPlants = plants;
      inventoryTitle.textContent = `Inventar (${plants.length})`;
      inventoryScroll.innerHTML = '';

      if (plants.length === 0) {
        inventoryScroll.innerHTML = '<div class="inventory-empty">Keine Pflanzen im Inventar</div>';
        return;
      }

      for (const plant of plants) {
        const item = document.createElement('div');
        item.className = 'inventory-item';
        item.dataset.plantId = plant.id;

        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 48;
        iconCanvas.height = 48;
        iconCanvas.className = 'inventory-icon-canvas';
        const stage = plant.growthStage ?? RARITY_TO_STAGE[plant.rarity] ?? 2;
        drawPlantIcon(iconCanvas, plant.plantType, stage);

        const label = document.createElement('div');
        label.className = 'inventory-item-label';
        const rarityColor = RARITY_COLORS[plant.rarity] || '#8ED88E';
        label.innerHTML = `<span style="color:${rarityColor};font-size:10px;font-weight:700;">${RARITY_LABELS[plant.rarity]}</span>`;

        item.appendChild(iconCanvas);
        item.appendChild(label);

        item.addEventListener('click', () => {
          if (placementMode && placementMode.id === plant.id) {
            // Cancel placement
            placementMode = null;
            placementIndicator.classList.add('hidden');
            refreshInventory();
            return;
          }
          placementMode = plant;
          placementIndicator.classList.remove('hidden');
          // Highlight selected
          inventoryScroll.querySelectorAll('.inventory-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        });

        inventoryScroll.appendChild(item);
      }
    });
  }

  refreshInventory();

  // Store cleanup reference for router to call
  gardenCleanup = () => {
    cancelAnimationFrame(animFrame);
    animFrame = null;
  };
}

// ============================================================
// Reward popup
// ============================================================

function showRewardPopup(plants, onClose) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal reward-popup">
      <div class="reward-popup-title">🎁 Du hast ${plants.length} neue Pflanze${plants.length > 1 ? 'n' : ''} verdient!</div>
      <div class="reward-popup-list">
        ${plants.map(p => {
          const color = RARITY_COLORS[p.rarity] || '#8ED88E';
          const emoji = p.plantType === 'cherry' ? '🌸' : p.plantType === 'sunflower' ? '🌻' : p.plantType === 'tulip' ? '🌷' : p.plantType === 'mushroom' ? '🍄' : '🌿';
          return `<div class="reward-item">
            <span class="reward-emoji">${emoji}</span>
            <div class="reward-info">
              <div class="reward-name">${capitalize(p.plantType)}</div>
              <div class="reward-rarity" style="color:${color}">${RARITY_LABELS[p.rarity]}</div>
              <div class="reward-habit">${escapeHtml(p.habitName)}</div>
            </div>
          </div>`;
        }).join('')}
      </div>
      <button class="btn btn-primary reward-close-btn">Super! 🌱</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.reward-close-btn').addEventListener('click', () => {
    overlay.remove();
    onClose?.();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) { overlay.remove(); onClose?.(); }
  });
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
