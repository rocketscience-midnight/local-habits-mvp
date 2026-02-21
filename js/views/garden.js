/**
 * Garden View - Isometric pixel-art garden with collect & place mechanic.
 * Plants are earned as weekly rewards and placed manually by the user.
 */

import habitRepo from '../repo/habitRepo.js';
import { checkWeeklyRewards, addTestPlant, RARITY_LABELS, RARITY_COLORS, RARITY_TO_STAGE } from '../utils/rewards.js';

// ============================================================
// Constants & Palette
// ============================================================

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

function drawPlant(ctx, cx, cy, plantType, stage, animOffset, pixelSize = PIXEL) {
  const pal = PLANT_PALETTES[plantType] || PLANT_PALETTES.bush;
  const { stem, leaf, bloom1: b1, bloom2: b2, bloom3: b3 } = pal;
  const soil = '#8B7355';
  const health = 'thriving'; // placed plants are always healthy

  const sway = Math.sin(animOffset) * 1;
  const droop = 0;
  const p = pixelSize;

  const bx = cx + sway;
  const by = cy;

  // Shadow
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
  drawPixelRect(ctx, x, y-p*11, p, p*10, stem); drawPixel(ctx, x-p, y-p*4, leaf); drawPixel(ctx, x-p*2, y-p*5, leaf); drawPixel(ctx, x+p, y-p*7, leaf); drawPixel(ctx, x+p*2, y-p*8, leaf);
  drawPixelRect(ctx, x-p, y-p*12-droop, p*3, p*3, b1); drawPixelRect(ctx, x, y-p*12-droop, p, p*2, b3); drawPixel(ctx, x-p*2, y-p*11-droop, b2); drawPixel(ctx, x+p*2, y-p*11-droop, b2); drawPixel(ctx, x, y-p*13-droop, b2);
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
  drawPixelRect(ctx, x, y-p*9, p*2, p*8, stem); drawPixelRect(ctx, x-p*3, y-p*11-droop, p*8, p*4, leaf); drawPixelRect(ctx, x-p*2, y-p*13-droop, p*6, p*2, leaf);
  drawPixel(ctx, x-p*2, y-p*12-droop, b1); drawPixel(ctx, x+p*2, y-p*11-droop, b1); drawPixel(ctx, x, y-p*13-droop, b2); drawPixel(ctx, x-p, y-p*11-droop, b2);
  drawPixel(ctx, x+p*3, y-p*12-droop, b1); drawPixel(ctx, x-p*3, y-p*13-droop, b3); drawPixel(ctx, x+p, y-p*14-droop, b3);
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

  // Canvas setup
  const gridCols = COLS;
  const gridRows = ROWS;
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

  container.appendChild(screen);

  // Show reward popup if new plants were earned
  if (newPlants.length > 0) {
    showRewardPopup(newPlants, () => {
      // Refresh inventory display
      refreshInventory();
    });
  }

  const ctx = canvas.getContext('2d');

  // Seeded random for deco
  function seededRand(seed) {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
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

  // Animation
  let animFrame;
  const startTime = performance.now();

  function draw(time) {
    const elapsed = (time - startTime) / 1000;
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

    // Draw tiles (back-to-front)
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const { x, y } = isoToScreen(c, r, originX, originY);
        const plant = plantGrid[`${c},${r}`];
        const isEmpty = !plant;

        // Tile color: highlight empty tiles in placement mode
        let tileColor = plant ? '#A8D8A8' : '#B8E0B0';
        if (placementMode && isEmpty) {
          tileColor = '#D0F0D0'; // lighter highlight for placeable tiles
        }

        drawTile(ctx, x, y, tileColor, '#98C898');

        if (plant) {
          const animOff = elapsed * 1.5 + r * 0.7 + c * 1.1;
          const stage = plant.growthStage ?? RARITY_TO_STAGE[plant.rarity] ?? 2;
          // Legendary plants get slightly bigger pixels
          const pxSize = plant.rarity === 'legendary' ? PIXEL + 1 : PIXEL;
          drawPlant(ctx, x, y - TILE_H / 4, plant.plantType, stage, animOff, pxSize);
        } else {
          const deco = decoMap[`${c},${r}`];
          if (deco !== undefined && !placementMode) {
            drawDeco(ctx, x, y - 2, deco);
          }
        }
      }
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
        <div class="garden-tooltip-detail">Verdient durch: ${plant.habitName}</div>
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

  // Cleanup animation on view change
  const observer = new MutationObserver(() => {
    if (!document.body.contains(container) || container.innerHTML === '') {
      cancelAnimationFrame(animFrame);
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true });
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
              <div class="reward-habit">${p.habitName}</div>
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
