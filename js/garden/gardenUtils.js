/**
 * Garden utilities - constants, isometric projection, drawing primitives,
 * butterfly logic, fence drawing, ground details.
 */

// ============================================================
// Constants
// ============================================================

export const TILE_W = 64;
export const TILE_H = 32;
export const PIXEL = 5;
export const COLS = 6;
export const ROWS = 5;

export const PLANT_NAMES_DE = {
  bush: 'Busch', tulip: 'Tulpe', sunflower: 'Sonnenblume',
  cherry: 'Kirschbaum', mushroom: 'Pilz', grass: 'Gras',
  clover: 'Klee', fern: 'Farn', daisy: 'Gänseblümchen',
  appletree: 'Apfelbaum', orchid: 'Orchidee'
};

export const PLANT_EMOJIS = {
  cherry: '🌸', sunflower: '🌻', tulip: '🌷', mushroom: '🍄',
  orchid: '🪻', daisy: '🌼', appletree: '🍎', fern: '🌿',
  bush: '🌿', grass: '🌱', clover: '🍀'
};

export const BUTTERFLY_COLORS = ['#F4A0C0', '#D0B8E8', '#F0E0A0'];

// ============================================================
// Isometric projection
// ============================================================

export function isoToScreen(col, row, originX, originY) {
  const x = originX + (col - row) * (TILE_W / 2);
  const y = originY + (col + row) * (TILE_H / 2);
  return { x, y };
}

export function screenToIso(sx, sy, originX, originY) {
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

export function drawPixel(ctx, x, y, color, size = PIXEL) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), size, size);
}

export function drawPixelRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

export function drawTile(ctx, cx, cy, fillColor, strokeColor) {
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
// Small decorative elements for empty tiles
// ============================================================

export function drawDeco(ctx, cx, cy, type) {
  const p = PIXEL;
  switch (type) {
    case 0: drawPixel(ctx, cx, cy-p, '#E8B8D0'); drawPixel(ctx, cx, cy-p*2, '#FFD0E0'); break;
    case 1: drawPixelRect(ctx, cx-p, cy-p, p*2, p, '#C0B8A8'); drawPixel(ctx, cx, cy-p*2, '#D0C8B8'); break;
    case 2: drawPixel(ctx, cx-p, cy-p, '#7BC47B'); drawPixel(ctx, cx, cy-p*2, '#8ED88E'); drawPixel(ctx, cx+p, cy-p, '#7BC47B'); break;
  }
}

// ============================================================
// Ground details
// ============================================================

export function drawGroundDetail(ctx, cx, cy, detail) {
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

// ============================================================
// Butterfly logic
// ============================================================

export function drawButterfly(ctx, bf, time) {
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

export function updateButterfly(bf, dt, canvasW, canvasH, skyH) {
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

// ============================================================
// Fence drawing
// ============================================================

export function drawFence(ctx, gridCols, gridRows, originX, originY) {
  const WOOD = '#9B7B5B';
  const WOOD_DARK = '#7B5B3B';
  const postW = 6;
  const postH = 20;
  const railH = 3;

  // Get corner screen positions (with some padding)
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

// ============================================================
// Seeded random
// ============================================================

export function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}
