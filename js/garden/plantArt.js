/**
 * Plant pixel art drawing functions
 * Extracted from garden.js for maintainability
 */
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
  orchid:    { stem: '#6BBF6B', leaf: '#8ED88E', bloom1: '#E0A0E0', bloom2: '#C878D0', bloom3: '#A050B0' },
};

const PLANT_NAMES_DE = {
  bush: 'Busch', tulip: 'Tulpe', sunflower: 'Sonnenblume',
  cherry: 'Kirschbaum', mushroom: 'Pilz', grass: 'Gras',
  clover: 'Klee', fern: 'Farn', daisy: 'Gänseblümchen',
  appletree: 'Apfelbaum', orchid: 'Orchidee'
};

const PLANT_EMOJIS = {
  cherry: '🌸', sunflower: '🌻', tulip: '🌷', mushroom: '🍄',
  orchid: '🪻', daisy: '🌼', appletree: '🍎', fern: '🌿',
  bush: '🌿', grass: '🌱', clover: '🍀'
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
  // Offset by half tile so click in visual center maps to correct cell
  const dx = sx - originX;
  const dy = sy - originY + TILE_H / 2;
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
  const by = cy + p * 2; // shift down so plants sit on the tile

  // Shadow
  const shadowW = p * (1.2 + stage * 0.8);
  const shadowH = p * (0.6 + stage * 0.3);
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#2D2D2D';
  ctx.beginPath();
  ctx.ellipse(bx + p / 2, by, shadowW, shadowH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  switch (plantType) {
    case 'tulip': drawTulip(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'daisy': drawDaisy(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'orchid': drawOrchid(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'sunflower': drawSunflower(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'bush': drawBush(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'grass': drawGrass(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'clover': drawBush(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
    case 'fern': drawFern(ctx, bx, by, stage, p, stem, leaf, b1, b2, b3, soil, droop); break;
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
    drawPixelRect(ctx, x, y-p*9, p, p*8, stem); drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*5, leaf); drawPixel(ctx, x+p, y-p*6, leaf); drawPixel(ctx, x+p*2, y-p*7, leaf);
    drawPixelRect(ctx, x-p, y-p*10-droop, p*3, p*3, b1); drawPixelRect(ctx, x, y-p*10-droop, p, p*2, b3); drawPixel(ctx, x-p*2, y-p*9-droop, b2); drawPixel(ctx, x+p*2, y-p*9-droop, b2); drawPixel(ctx, x, y-p*11-droop, b2);
    return;
  }
  // Stage 5: Legendary sunflower – twin blooms + sparkles
  drawPixelRect(ctx, x, y-p*9, p, p*8, stem); drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*5, leaf); drawPixel(ctx, x+p, y-p*6, leaf); drawPixel(ctx, x+p*2, y-p*7, leaf);
  drawPixelRect(ctx, x-p, y-p*10-droop, p*3, p*3, b1); drawPixelRect(ctx, x, y-p*10-droop, p, p*2, b3); drawPixel(ctx, x-p*2, y-p*9-droop, b2); drawPixel(ctx, x+p*2, y-p*9-droop, b2); drawPixel(ctx, x, y-p*11-droop, b2);
  // Second bloom (side branch)
  drawPixel(ctx, x+p*2, y-p*7, stem); drawPixelRect(ctx, x+p*2, y-p*8-droop, p*2, p*2, b1); drawPixel(ctx, x+p*2, y-p*9-droop, b3);
  // Sparkles
  drawPixel(ctx, x-p, y-p*11-droop, '#FFF8E0'); drawPixel(ctx, x+p*3, y-p*8-droop, '#FFFDE8');
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

// --- Daisy: flat, wide, radiating petals ---
function drawDaisy(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) { drawPixelRect(ctx, x-p, y-p, p*3, p, soil); drawPixel(ctx, x, y-p*2, '#6B5B3B'); return; }
  if (stage === 1) { drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x-p, y-p*2, leaf); return; }
  if (stage === 2) {
    drawPixelRect(ctx, x, y-p*4, p, p*3, stem); drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*2, leaf);
    drawPixel(ctx, x, y-p*4-droop, b2); drawPixel(ctx, x-p, y-p*4-droop, b1); drawPixel(ctx, x+p, y-p*4-droop, b1); return;
  }
  if (stage === 3) {
    drawPixelRect(ctx, x, y-p*5, p, p*4, stem); drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*4, leaf);
    // Radiating petals around center
    drawPixel(ctx, x, y-p*6-droop, b1); drawPixel(ctx, x-p, y-p*5-droop, b1); drawPixel(ctx, x+p, y-p*5-droop, b1);
    drawPixel(ctx, x, y-p*4-droop, b1); drawPixel(ctx, x, y-p*5-droop, b2); return;
  }
  if (stage === 4) {
    drawPixelRect(ctx, x, y-p*6, p, p*5, stem); drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*5, leaf);
    // Full daisy with radiating petals
    drawPixel(ctx, x, y-p*8-droop, b1); drawPixel(ctx, x-p, y-p*7-droop, b1); drawPixel(ctx, x+p, y-p*7-droop, b1);
    drawPixel(ctx, x-p*2, y-p*6-droop, b1); drawPixel(ctx, x+p*2, y-p*6-droop, b1);
    drawPixel(ctx, x, y-p*5-droop, b1); drawPixel(ctx, x, y-p*7-droop, b2); drawPixel(ctx, x, y-p*6-droop, b2); return;
  }
  // Stage 5: Cluster of 2-3 daisies
  drawPixelRect(ctx, x, y-p*6, p, p*5, stem); drawPixelRect(ctx, x-p*3, y-p*5, p, p*4, stem);
  drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*4, leaf);
  // Main daisy
  drawPixel(ctx, x, y-p*8-droop, b1); drawPixel(ctx, x-p, y-p*7-droop, b1); drawPixel(ctx, x+p, y-p*7-droop, b1);
  drawPixel(ctx, x-p*2, y-p*6-droop, b1); drawPixel(ctx, x+p*2, y-p*6-droop, b1);
  drawPixel(ctx, x, y-p*5-droop, b1); drawPixel(ctx, x, y-p*7-droop, b2); drawPixel(ctx, x, y-p*6-droop, b2);
  // Second daisy (smaller, left)
  drawPixel(ctx, x-p*3, y-p*7-droop, b1); drawPixel(ctx, x-p*4, y-p*6-droop, b1); drawPixel(ctx, x-p*2, y-p*6-droop, b1);
  drawPixel(ctx, x-p*3, y-p*5-droop, b1); drawPixel(ctx, x-p*3, y-p*6-droop, b2);
  // Sparkle
  drawPixel(ctx, x+p, y-p*8-droop, '#FFFDE8');
}

// --- Orchid: elegant hanging blooms on curved stem ---
function drawOrchid(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) { drawPixelRect(ctx, x-p, y-p, p*3, p, soil); drawPixel(ctx, x, y-p*2, '#6B5B3B'); return; }
  if (stage === 1) { drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, leaf); drawPixel(ctx, x+p, y-p*2, leaf); return; }
  if (stage === 2) {
    // Stem curves right
    drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem); drawPixel(ctx, x+p, y-p*5, stem);
    drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*3, leaf); return;
  }
  if (stage === 3) {
    // Curved stem with one hanging bloom
    drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem);
    drawPixel(ctx, x+p, y-p*5, stem); drawPixel(ctx, x+p, y-p*6, stem);
    drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*3, leaf);
    // Hanging bloom
    drawPixel(ctx, x+p*2, y-p*5-droop, b1); drawPixel(ctx, x+p*2, y-p*4-droop, b2); drawPixel(ctx, x+p, y-p*4-droop, b3); return;
  }
  if (stage === 4) {
    // Taller curved stem with 2-3 blooms
    drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem);
    drawPixel(ctx, x, y-p*5, stem); drawPixel(ctx, x+p, y-p*6, stem); drawPixel(ctx, x+p, y-p*7, stem);
    drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*3, leaf); drawPixel(ctx, x-p, y-p*5, leaf);
    // Bloom 1
    drawPixel(ctx, x+p*2, y-p*7-droop, b1); drawPixel(ctx, x+p*2, y-p*6-droop, b2); drawPixel(ctx, x+p, y-p*6-droop, b3);
    // Bloom 2
    drawPixel(ctx, x+p*2, y-p*5-droop, b1); drawPixel(ctx, x+p*2, y-p*4-droop, b2);
    // Bloom 3
    drawPixel(ctx, x, y-p*7-droop, b1); drawPixel(ctx, x-p, y-p*7-droop, b3); return;
  }
  // Stage 5: Full cascade with sparkles
  drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem);
  drawPixel(ctx, x, y-p*5, stem); drawPixel(ctx, x, y-p*6, stem); drawPixel(ctx, x+p, y-p*7, stem); drawPixel(ctx, x+p, y-p*8, stem);
  drawPixel(ctx, x-p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*3, leaf); drawPixel(ctx, x-p, y-p*5, leaf); drawPixel(ctx, x-p*2, y-p*6, leaf);
  // Cascade of blooms
  drawPixel(ctx, x+p*2, y-p*8-droop, b1); drawPixel(ctx, x+p*2, y-p*7-droop, b2); drawPixel(ctx, x+p, y-p*7-droop, b3);
  drawPixel(ctx, x+p*2, y-p*6-droop, b1); drawPixel(ctx, x+p*2, y-p*5-droop, b2);
  drawPixel(ctx, x, y-p*8-droop, b1); drawPixel(ctx, x-p, y-p*8-droop, b3);
  drawPixel(ctx, x-p, y-p*7-droop, b1); drawPixel(ctx, x-p*2, y-p*7-droop, b2);
  // Sparkles
  drawPixel(ctx, x+p*3, y-p*8-droop, '#FFF8E0'); drawPixel(ctx, x-p*2, y-p*8-droop, '#FFFDE8');
}

// --- Fern: feathery fronds fanning out ---
function drawFern(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) { drawPixelRect(ctx, x-p, y-p, p*3, p, soil); drawPixel(ctx, x, y-p*2, '#4A8F4A'); return; }
  if (stage === 1) {
    // Curled fiddlehead
    drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, leaf); drawPixel(ctx, x+p, y-p*3, leaf); return;
  }
  if (stage === 2) {
    // Unfurling
    drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem);
    drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x+p, y-p*4, leaf);
    drawPixel(ctx, x-p, y-p*3, b1); drawPixel(ctx, x+p, y-p*3, b1); return;
  }
  if (stage === 3) {
    // 2-3 fronds
    drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem); drawPixel(ctx, x, y-p*5, stem);
    // Left frond
    drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*3, leaf); drawPixel(ctx, x-p, y-p*5, b1);
    // Right frond
    drawPixel(ctx, x+p, y-p*4, leaf); drawPixel(ctx, x+p*2, y-p*3, leaf); drawPixel(ctx, x+p, y-p*5, b1);
    // Top frond
    drawPixel(ctx, x, y-p*6, b1); drawPixel(ctx, x-p, y-p*6, leaf); drawPixel(ctx, x+p, y-p*6, leaf); return;
  }
  if (stage === 4) {
    // Full fan of fronds
    drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem);
    drawPixel(ctx, x, y-p*5, stem); drawPixel(ctx, x, y-p*6, stem);
    // Fronds fanning out
    drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*3, leaf); drawPixel(ctx, x-p*3, y-p*2, leaf);
    drawPixel(ctx, x+p, y-p*4, leaf); drawPixel(ctx, x+p*2, y-p*3, leaf); drawPixel(ctx, x+p*3, y-p*2, leaf);
    drawPixel(ctx, x-p, y-p*6, b1); drawPixel(ctx, x-p*2, y-p*5, b1); drawPixel(ctx, x-p*3, y-p*4, b1);
    drawPixel(ctx, x+p, y-p*6, b1); drawPixel(ctx, x+p*2, y-p*5, b1); drawPixel(ctx, x+p*3, y-p*4, b1);
    drawPixel(ctx, x, y-p*7, b2); drawPixel(ctx, x-p, y-p*7, leaf); drawPixel(ctx, x+p, y-p*7, leaf); return;
  }
  // Stage 5: Lush fern with tiny spores
  drawPixel(ctx, x, y-p*2, stem); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem);
  drawPixel(ctx, x, y-p*5, stem); drawPixel(ctx, x, y-p*6, stem); drawPixel(ctx, x, y-p*7, stem);
  // Wide fronds
  drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*3, leaf); drawPixel(ctx, x-p*3, y-p*2, leaf); drawPixel(ctx, x-p*4, y-p, leaf);
  drawPixel(ctx, x+p, y-p*4, leaf); drawPixel(ctx, x+p*2, y-p*3, leaf); drawPixel(ctx, x+p*3, y-p*2, leaf); drawPixel(ctx, x+p*4, y-p, leaf);
  drawPixel(ctx, x-p, y-p*6, b1); drawPixel(ctx, x-p*2, y-p*5, b1); drawPixel(ctx, x-p*3, y-p*4, b1);
  drawPixel(ctx, x+p, y-p*6, b1); drawPixel(ctx, x+p*2, y-p*5, b1); drawPixel(ctx, x+p*3, y-p*4, b1);
  drawPixel(ctx, x, y-p*8, b2); drawPixel(ctx, x-p, y-p*8, leaf); drawPixel(ctx, x+p, y-p*8, leaf);
  drawPixel(ctx, x-p*2, y-p*7, b1); drawPixel(ctx, x+p*2, y-p*7, b1);
  // Tiny spores
  drawPixel(ctx, x-p*2, y-p*6, b3); drawPixel(ctx, x+p*3, y-p*5, b3); drawPixel(ctx, x, y-p*9, '#FFFDE8');
}

// --- Grass: thin blades of varying height ---
function drawGrass(ctx, x, y, stage, p, stem, leaf, b1, b2, b3, soil, droop) {
  if (stage === 0) { drawPixelRect(ctx, x-p, y-p, p*3, p, soil); drawPixel(ctx, x, y-p*2, '#7BC47B'); return; }
  if (stage === 1) {
    // 1-2 tiny blades
    drawPixel(ctx, x, y-p*2, leaf); drawPixel(ctx, x+p, y-p*2, b1); return;
  }
  if (stage === 2) {
    // 3-4 blades
    drawPixel(ctx, x-p, y-p*2, leaf); drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x+p, y-p*2, leaf); drawPixel(ctx, x+p*2, y-p*3, b1); return;
  }
  if (stage === 3) {
    // Small tuft
    drawPixel(ctx, x-p*2, y-p*2, leaf); drawPixel(ctx, x-p, y-p*3, stem); drawPixel(ctx, x-p, y-p*4, b1);
    drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem); drawPixel(ctx, x, y-p*5, b1);
    drawPixel(ctx, x+p, y-p*3, leaf); drawPixel(ctx, x+p, y-p*4, b1);
    drawPixel(ctx, x+p*2, y-p*2, leaf); return;
  }
  if (stage === 4) {
    // Full tuft
    drawPixel(ctx, x-p*2, y-p*2, leaf); drawPixel(ctx, x-p*2, y-p*3, leaf);
    drawPixel(ctx, x-p, y-p*3, stem); drawPixel(ctx, x-p, y-p*4, stem); drawPixel(ctx, x-p, y-p*5, b1);
    drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem); drawPixel(ctx, x, y-p*5, stem); drawPixel(ctx, x, y-p*6, b1);
    drawPixel(ctx, x+p, y-p*3, stem); drawPixel(ctx, x+p, y-p*4, stem); drawPixel(ctx, x+p, y-p*5, b1);
    drawPixel(ctx, x+p*2, y-p*2, leaf); drawPixel(ctx, x+p*2, y-p*3, leaf); return;
  }
  // Stage 5: Tall lush grass with seed heads
  drawPixel(ctx, x-p*3, y-p*2, leaf); drawPixel(ctx, x-p*2, y-p*3, leaf); drawPixel(ctx, x-p*2, y-p*4, stem);
  drawPixel(ctx, x-p, y-p*3, stem); drawPixel(ctx, x-p, y-p*4, stem); drawPixel(ctx, x-p, y-p*5, stem); drawPixel(ctx, x-p, y-p*6, b1);
  drawPixel(ctx, x, y-p*3, stem); drawPixel(ctx, x, y-p*4, stem); drawPixel(ctx, x, y-p*5, stem); drawPixel(ctx, x, y-p*6, stem); drawPixel(ctx, x, y-p*7, b2);
  drawPixel(ctx, x+p, y-p*3, stem); drawPixel(ctx, x+p, y-p*4, stem); drawPixel(ctx, x+p, y-p*5, stem); drawPixel(ctx, x+p, y-p*6, b1);
  drawPixel(ctx, x+p*2, y-p*3, leaf); drawPixel(ctx, x+p*2, y-p*4, stem); drawPixel(ctx, x+p*3, y-p*2, leaf);
  // Seed heads
  drawPixel(ctx, x-p, y-p*7, b3); drawPixel(ctx, x, y-p*8, b3); drawPixel(ctx, x+p, y-p*7, b3);
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

// Re-export constants and functions used by garden.js and decoArt.js
export { TILE_W, TILE_H, PIXEL, COLS, ROWS, PLANT_NAMES_DE, PLANT_EMOJIS };
export { isoToScreen, screenToIso };
export { drawPixel, drawPixelRect, drawTile };
export { drawPlant, drawDeco };
