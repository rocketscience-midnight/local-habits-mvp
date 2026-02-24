/**
 * Garden Renderer - Canvas draw loop, butterfly animation, fence, tiles
 */

import {
  TILE_W, TILE_H, PIXEL,
  isoToScreen,
  drawTile,
  drawPlant, drawDeco
} from '../garden/plantArt.js';
import { drawDecoPlaced } from '../garden/decoArt.js';
import { RARITY_TO_STAGE } from '../utils/rewards.js';

// Theme-aware canvas color palettes
const GARDEN_THEMES = {
  light: {
    skyTop: '#C8E0F4', skyBottom: '#FFF8F0',
    grass: '#C8E8C0', grassTiles: ['#A8D8A8', '#96CC96', '#B4E0B4'],
    grassEdge: '#98C898', placementTile: '#D0F0D0',
    wood: '#9B7B5B', woodDark: '#7B5B3B',
  },
  dark: {
    skyTop: '#C8E0F4', skyBottom: '#FFF8F0',
    grass: '#C8E8C0', grassTiles: ['#A8D8A8', '#96CC96', '#B4E0B4'],
    grassEdge: '#98C898', placementTile: '#D0F0D0',
    wood: '#9B7B5B', woodDark: '#7B5B3B',
  },
  sakura: {
    skyTop: '#F0D0E8', skyBottom: '#FFF0F8',
    grass: '#C8E8C0', grassTiles: ['#A8D8A8', '#96CC96', '#B4E0B4'],
    grassEdge: '#98C898', placementTile: '#F0D0F0',
    wood: '#9B7B5B', woodDark: '#7B5B3B',
  },
};

function getGardenColors() {
  const theme = document.documentElement.dataset.theme || 'light';
  return GARDEN_THEMES[theme] || GARDEN_THEMES.light;
}

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

// Butterfly colors
const BUTTERFLY_COLORS = ['#F4A0C0', '#D0B8E8', '#F0E0A0'];

function drawButterfly(ctx, bf, time) {
  const wingOpen = Math.sin(time * 5 + bf.phase) > 0;
  const p = 2;
  const bx = Math.round(bf.x);
  const by = Math.round(bf.y);
  ctx.fillStyle = '#6B5B3B';
  ctx.fillRect(bx, by, p, p * 3);
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

function updateButterfly(bf, dt, canvasW, canvasH, skyH) {
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
  if (bf.x < -20 || bf.x > canvasW + 20 || bf.y < skyH - 20 || bf.y > canvasH + 20) {
    bf.x = Math.random() * canvasW;
    bf.y = skyH + Math.random() * (canvasH - skyH) * 0.4;
    bf.vx = (Math.random() - 0.5) * 0.4;
    bf.vy = (Math.random() - 0.5) * 0.2;
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

/**
 * Initialize and run the garden canvas renderer.
 *
 * @param {Object} params
 * @param {HTMLCanvasElement} params.canvas
 * @param {Object} params.plantGrid - "col,row" -> plant map
 * @param {number} params.gridCols
 * @param {number} params.gridRows
 * @param {Function} params.getPlacementMode - returns current placementMode or null
 * @returns {{ cleanup: Function }} - call cleanup() to stop animation
 */
export function startRenderer({ canvas, plantGrid, gridCols, gridRows, getPlacementMode }) {
  const skyH = 80;
  const canvasW = canvas.width;
  const canvasH = canvas.height;
  const originX = gridRows * (TILE_W / 2) + TILE_W / 2;
  const originY = skyH + TILE_H;
  const ctx = canvas.getContext('2d');

  const gc = getGardenColors();
  const GRASS_GREENS = gc.grassTiles;
  const GRASS_DARK = ['#8EC08E', '#82B882'];

  // Precompute grass colors + tufts
  const grassColorMap = {};
  const grassTuftMap = {};
  {
    const gr = seededRand(77);
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const k = `${c},${r}`;
        grassColorMap[k] = GRASS_GREENS[Math.floor(gr() * GRASS_GREENS.length)];
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

  // Ground details
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

  // Deco map
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

  // Fence drawing
  function drawFence(ctx) {
    const WOOD = gc.wood;
    const WOOD_DARK = gc.woodDark;
    const postW = 6;
    const postH = 20;
    const railH = 3;

    const corners = [
      isoToScreen(0, 0, originX, originY),
      isoToScreen(gridCols, 0, originX, originY),
      isoToScreen(gridCols, gridRows, originX, originY),
      isoToScreen(0, gridRows, originX, originY),
    ];

    const edges = [
      [corners[0], corners[1]],
      [corners[1], corners[2]],
      [corners[2], corners[3]],
      [corners[3], corners[0]],
    ];

    const gateEdge = 2;
    const gateCenter = 0.5;
    const gateWidth = 0.12;

    for (let ei = 0; ei < edges.length; ei++) {
      const [from, to] = edges[ei];
      const segments = 8;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        if (ei === gateEdge && Math.abs(t - gateCenter) < gateWidth) continue;

        const px = from.x + (to.x - from.x) * t;
        const py = from.y + (to.y - from.y) * t;

        if (i % 2 === 0) {
          ctx.fillStyle = WOOD_DARK;
          ctx.fillRect(Math.round(px - postW / 2), Math.round(py - postH), postW, postH + 2);
          ctx.fillStyle = WOOD;
          ctx.fillRect(Math.round(px - postW / 2 + 1), Math.round(py - postH), postW - 2, postH);
          ctx.fillStyle = WOOD_DARK;
          ctx.fillRect(Math.round(px - postW / 2), Math.round(py - postH - 2), postW, 2);
        }
      }

      for (let i = 0; i < segments; i += 2) {
        const t1 = i / segments;
        const t2 = Math.min((i + 2) / segments, 1);
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

  // Animation loop
  let animFrame;
  const startTime = performance.now();
  let lastTime = startTime;

  function draw(time) {
    const elapsed = (time - startTime) / 1000;
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    const placementMode = getPlacementMode();

    ctx.clearRect(0, 0, canvasW, canvasH);

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, skyH);
    skyGrad.addColorStop(0, gc.skyTop);
    skyGrad.addColorStop(1, gc.skyBottom);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasW, skyH);

    // Grass background
    ctx.fillStyle = gc.grass;
    ctx.fillRect(0, skyH, canvasW, canvasH - skyH);

    drawFence(ctx);

    // Draw tiles (back-to-front)
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const { x, y } = isoToScreen(c, r, originX, originY);
        const key = `${c},${r}`;
        const plant = plantGrid[key];
        const isEmpty = !plant;

        let tileColor = grassColorMap[key] || gc.grassTiles[0];
        if (placementMode && isEmpty) {
          tileColor = gc.placementTile;
        }

        drawTile(ctx, x, y, tileColor, gc.grassEdge);

        const tuft = grassTuftMap[key];
        if (tuft) {
          ctx.fillStyle = tuft.color;
          ctx.fillRect(x + tuft.ox, y + tuft.oy, 2, 2);
        }

        if (plant) {
          const animOff = elapsed * 1.5 + r * 0.7 + c * 1.1;
          if (plant.itemType === 'deco') {
            drawDecoPlaced(ctx, x, y, plant.plantType, animOff);
          } else {
            const stage = RARITY_TO_STAGE[plant.rarity] ?? plant.growthStage ?? 2;
            drawPlant(ctx, x, y, plant.plantType, stage, animOff, PIXEL, c, r);
          }
        } else {
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
      updateButterfly(bf, dt, canvasW, canvasH, skyH);
      drawButterfly(ctx, bf, elapsed);
    }

    animFrame = requestAnimationFrame(draw);
  }

  animFrame = requestAnimationFrame(draw);

  return {
    cleanup() {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  };
}

/**
 * Draw a small plant icon on a canvas (for inventory/collection).
 */
export function drawPlantIcon(canvas, plantType, stage) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height - 4;
  drawPlant(ctx, cx, cy, plantType, stage, 0, 3);
}

/**
 * Draw a small deco icon on a canvas (for inventory/collection).
 */
export function drawDecoIcon(canvas, decoType) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height - 4;
  drawDecoPlaced(ctx, cx, cy, decoType, 0, 3);
}
