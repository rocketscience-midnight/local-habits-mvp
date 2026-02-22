/**
 * Decoration pixel art drawing functions
 * Extracted from garden.js for maintainability
 */

import { PIXEL, drawPixel, drawPixelRect } from './plantArt.js';
import { DECO_DIFFICULTY } from '../utils/decoRewards.js';

// ============================================================
// Decoration item drawing (pixel art, placed decos from tasks)
// ============================================================

function drawDecoPlaced(ctx, cx, cy, decoType, animOffset, pixelSize = PIXEL) {
  const p = pixelSize;
  const isMedium = DECO_DIFFICULTY[decoType] === 'medium';
  const shadowW = isMedium ? p * 3 : p * 5;
  const shadowH = isMedium ? p * 1.5 : p * 2;
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#2D2D2D';
  ctx.beginPath();
  ctx.ellipse(cx + p / 2, cy + p, shadowW, shadowH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  switch (decoType) {
    case 'pond_small': drawDecoPond(ctx, cx, cy, p, animOffset); break;
    case 'lantern': drawDecoLantern(ctx, cx, cy, p, animOffset); break;
    case 'bench': drawDecoBench(ctx, cx, cy, p); break;
    case 'birdhouse': drawDecoBirdhouse(ctx, cx, cy, p); break;
    case 'watering_can': drawDecoWateringCan(ctx, cx, cy, p); break;
    case 'mushroom_ring': drawDecoMushroomRing(ctx, cx, cy, p); break;
    case 'carrot': drawDecoCarrot(ctx, cx, cy, p); break;
    case 'barn': drawDecoBarn(ctx, cx, cy, p); break;
    case 'bicycle': drawDecoBicycle(ctx, cx, cy, p); break;
    case 'fountain': drawDecoFountain(ctx, cx, cy, p, animOffset); break;
    case 'pavilion': drawDecoPavilion(ctx, cx, cy, p); break;
    case 'windmill': drawDecoWindmill(ctx, cx, cy, p, animOffset); break;
    case 'bridge': drawDecoBridge(ctx, cx, cy, p); break;
  }
}

// --- Medium decos ---

function drawDecoPond(ctx, x, y, p, anim) {
  const shimmer = Math.sin(anim * 2) * 0.15;
  // Water body - flat on the ground (y is tile bottom)
  drawPixelRect(ctx, x - p*3, y, p*7, p, '#68A8D8');
  drawPixelRect(ctx, x - p*3, y - p, p*7, p, '#88C0E8');
  drawPixelRect(ctx, x - p*2, y - p*2, p*5, p, '#A8D8F0');
  // Edge stones around the pond
  drawPixel(ctx, x - p*3, y - p*2, '#B0A898');
  drawPixel(ctx, x + p*3, y, '#B0A898');
  drawPixel(ctx, x - p*4, y - p, '#C8C0B0');
  drawPixel(ctx, x + p*4, y - p, '#C8C0B0');
  // Shimmer highlights
  ctx.save();
  ctx.globalAlpha = 0.3 + shimmer;
  drawPixel(ctx, x - p, y - p, '#C8E8FF');
  drawPixel(ctx, x + p, y, '#C8E8FF');
  ctx.restore();
  // Lily pad
  drawPixel(ctx, x + p*2, y - p, '#6BBF6B');
  drawPixel(ctx, x + p, y, '#5A9B5A');
}

function drawDecoLantern(ctx, x, y, p, anim) {
  const glow = 0.4 + Math.sin(anim * 3) * 0.2;
  // Base
  drawPixelRect(ctx, x - p, y - p, p*3, p, '#908878');
  // Post
  drawPixelRect(ctx, x, y - p*4, p, p*3, '#B0A898');
  // Lamp housing
  drawPixelRect(ctx, x - p, y - p*6, p*3, p*2, '#B0A898');
  // Warm glow inside
  drawPixel(ctx, x, y - p*5, '#F8D480');
  ctx.save();
  ctx.globalAlpha = glow;
  drawPixel(ctx, x - p, y - p*5, '#FFE8B0');
  drawPixel(ctx, x + p, y - p*5, '#FFE8B0');
  ctx.restore();
  // Roof
  drawPixelRect(ctx, x - p*2, y - p*7, p*5, p, '#908878');
  // Finial
  drawPixel(ctx, x, y - p*8, '#B0A898');
}

function drawDecoBench(ctx, x, y, p) {
  const WOOD = '#9B7B5B';
  const WOOD_D = '#7B5B3B';
  const WOOD_L = '#B08E6B';
  // 4 short legs
  drawPixel(ctx, x - p*3, y - p, WOOD_D);
  drawPixel(ctx, x + p*3, y - p, WOOD_D);
  drawPixel(ctx, x - p*3, y - p*2, WOOD_D);
  drawPixel(ctx, x + p*3, y - p*2, WOOD_D);
  // Wide seat (2 planks)
  drawPixelRect(ctx, x - p*4, y - p*3, p*9, p, WOOD);
  drawPixelRect(ctx, x - p*4, y - p*4, p*9, p, WOOD_L);
  // Armrests
  drawPixel(ctx, x - p*4, y - p*5, WOOD_D);
  drawPixel(ctx, x + p*4, y - p*5, WOOD_D);
  // Short backrest (just 1 plank, not tall like a fence)
  drawPixelRect(ctx, x - p*3, y - p*5, p*7, p, WOOD);
}

function drawDecoBirdhouse(ctx, x, y, p) {
  const WOOD = '#9B7B5B';
  const WOOD_D = '#7B5B3B';
  const ROOF = '#E06040';
  const ROOF_D = '#CC4030';
  // Pole
  drawPixelRect(ctx, x, y - p*4, p, p*4, WOOD_D);
  // House body
  drawPixelRect(ctx, x - p, y - p*6, p*3, p*2, WOOD);
  // Entrance hole
  drawPixel(ctx, x, y - p*5, '#5A4A3A');
  // Perch
  drawPixel(ctx, x, y - p*4, '#A0A8B0');
  // Roof
  drawPixelRect(ctx, x - p*2, y - p*7, p*5, p, ROOF);
  drawPixelRect(ctx, x - p, y - p*8, p*3, p, ROOF_D);
  drawPixel(ctx, x, y - p*9, ROOF_D);
}

function drawDecoWateringCan(ctx, x, y, p) {
  const METAL = '#808890';
  const METAL_L = '#A0A8B0';
  const METAL_D = '#606870';
  // Body
  drawPixelRect(ctx, x - p*2, y - p*3, p*4, p*3, METAL);
  // Rim
  drawPixelRect(ctx, x - p*2, y - p*4, p*4, p, METAL_L);
  // Bottom
  drawPixelRect(ctx, x - p*2, y, p*4, p, METAL_D);
  // Spout
  drawPixel(ctx, x + p*2, y - p*2, METAL_L);
  drawPixel(ctx, x + p*3, y - p*3, METAL_L);
  drawPixel(ctx, x + p*4, y - p*4, METAL_L);
  // Spout head (rose)
  drawPixel(ctx, x + p*4, y - p*5, METAL_D);
  drawPixel(ctx, x + p*5, y - p*5, METAL_D);
  // Handle
  drawPixel(ctx, x - p*2, y - p*5, METAL_D);
  drawPixel(ctx, x - p*2, y - p*6, METAL_L);
  drawPixel(ctx, x - p, y - p*7, METAL_L);
  drawPixel(ctx, x, y - p*6, METAL_D);
}

function drawDecoMushroomRing(ctx, x, y, p) {
  const STEM = '#D8C8B0';
  const CAP1 = '#D88888';
  const CAP2 = '#C06060';
  const SPOT = '#F0E0D0';
  // Left mushroom
  drawPixel(ctx, x - p*3, y - p, STEM);
  drawPixelRect(ctx, x - p*4, y - p*2, p*3, p, CAP1);
  drawPixel(ctx, x - p*3, y - p*3, CAP2);
  drawPixel(ctx, x - p*4, y - p*2, SPOT);
  // Center mushroom (taller)
  drawPixelRect(ctx, x, y - p*2, p, p*2, STEM);
  drawPixelRect(ctx, x - p, y - p*3, p*3, p, CAP1);
  drawPixel(ctx, x, y - p*4, CAP2);
  drawPixel(ctx, x + p, y - p*3, SPOT);
  // Right mushroom
  drawPixel(ctx, x + p*3, y - p, STEM);
  drawPixelRect(ctx, x + p*2, y - p*2, p*3, p, CAP1);
  drawPixel(ctx, x + p*3, y - p*3, CAP2);
  drawPixel(ctx, x + p*2, y - p*2, SPOT);
  // Tiny front mushroom
  drawPixel(ctx, x + p, y, STEM);
  drawPixelRect(ctx, x, y - p, p*2, p, CAP2);
  // Grass tufts
  drawPixel(ctx, x - p, y, '#7BC47B');
  drawPixel(ctx, x + p*3, y, '#7BC47B');
}

// --- Hard decos ---

function drawDecoBarn(ctx, x, y, p) {
  const RED = '#C04040';
  const RED_D = '#903030';
  const ROOF = '#808890';
  const ROOF_D = '#606870';
  const WOOD = '#7B5B3B';
  // Walls
  drawPixelRect(ctx, x - p*3, y - p*5, p*7, p*5, RED);
  // Dark trim
  drawPixelRect(ctx, x - p*3, y - p*5, p, p*5, RED_D);
  drawPixelRect(ctx, x + p*3, y - p*5, p, p*5, RED_D);
  // Door
  drawPixelRect(ctx, x, y - p*3, p*2, p*3, WOOD);
  drawPixel(ctx, x, y - p, '#9B7B5B');
  // Windows
  drawPixel(ctx, x - p*2, y - p*4, '#A8D8F0');
  drawPixel(ctx, x + p*2, y - p*4, '#A8D8F0');
  // Cross beam on door
  drawPixel(ctx, x, y - p*2, '#5A4A3A');
  drawPixel(ctx, x + p, y - p*2, '#5A4A3A');
  // Roof
  drawPixelRect(ctx, x - p*4, y - p*6, p*9, p, ROOF);
  drawPixelRect(ctx, x - p*3, y - p*7, p*7, p, ROOF);
  drawPixelRect(ctx, x - p*2, y - p*8, p*5, p, ROOF);
  drawPixelRect(ctx, x - p, y - p*9, p*3, p, ROOF_D);
  drawPixel(ctx, x, y - p*10, ROOF_D);
}

function drawDecoBicycle(ctx, x, y, p) {
  const METAL = '#808890';
  const METAL_L = '#A0A8B0';
  const SEAT = '#7B5B3B';
  const TIRE = '#505050';
  const SPOKE = '#C0C0C0';
  // Back wheel
  drawPixel(ctx, x - p*3, y - p, TIRE);
  drawPixel(ctx, x - p*4, y - p*2, TIRE);
  drawPixel(ctx, x - p*3, y - p*3, TIRE);
  drawPixel(ctx, x - p*2, y - p*2, TIRE);
  drawPixel(ctx, x - p*3, y - p*2, SPOKE);
  // Front wheel
  drawPixel(ctx, x + p*2, y - p, TIRE);
  drawPixel(ctx, x + p, y - p*2, TIRE);
  drawPixel(ctx, x + p*2, y - p*3, TIRE);
  drawPixel(ctx, x + p*3, y - p*2, TIRE);
  drawPixel(ctx, x + p*2, y - p*2, SPOKE);
  // Frame - bottom bar
  drawPixel(ctx, x - p*2, y - p*3, METAL);
  drawPixel(ctx, x - p, y - p*3, METAL);
  drawPixel(ctx, x, y - p*3, METAL);
  drawPixel(ctx, x + p, y - p*3, METAL);
  // Frame - seat tube
  drawPixel(ctx, x - p, y - p*4, METAL);
  drawPixel(ctx, x - p, y - p*5, METAL);
  // Frame - top tube
  drawPixel(ctx, x, y - p*5, METAL_L);
  drawPixel(ctx, x + p, y - p*4, METAL_L);
  // Head tube + handlebar
  drawPixel(ctx, x + p*2, y - p*4, METAL);
  drawPixel(ctx, x + p*2, y - p*5, METAL);
  drawPixelRect(ctx, x + p, y - p*6, p*3, p, METAL_L);
  // Seat
  drawPixelRect(ctx, x - p*2, y - p*6, p*2, p, SEAT);
  // Pedal
  drawPixel(ctx, x, y - p*2, '#606060');
}

function drawDecoFountain(ctx, x, y, p, anim) {
  const STONE = '#B0A898';
  const STONE_D = '#908878';
  const WATER = '#88C0E8';
  const WATER_D = '#68A8D8';
  const WATER_L = '#A8D8F0';
  const shimmer = Math.sin(anim * 2.5);
  // Base
  drawPixelRect(ctx, x - p*4, y - p, p*9, p, STONE_D);
  drawPixelRect(ctx, x - p*3, y - p*2, p*7, p, STONE);
  // Bottom basin with water
  drawPixelRect(ctx, x - p*3, y - p*3, p*7, p, STONE);
  drawPixelRect(ctx, x - p*2, y - p*3, p*5, p, WATER_D);
  // Center column
  drawPixelRect(ctx, x, y - p*6, p, p*3, STONE);
  // Upper basin
  drawPixelRect(ctx, x - p*2, y - p*7, p*5, p, STONE);
  drawPixelRect(ctx, x - p, y - p*7, p*3, p, WATER);
  // Top spout
  drawPixel(ctx, x, y - p*8, STONE_D);
  // Water spray
  drawPixel(ctx, x, y - p*9, WATER_L);
  drawPixel(ctx, x, y - p*10, WATER_L);
  // Animated water arcs
  ctx.save();
  ctx.globalAlpha = 0.5 + shimmer * 0.2;
  drawPixel(ctx, x - p, y - p*9, WATER_L);
  drawPixel(ctx, x + p, y - p*9, WATER_L);
  ctx.restore();
  // Shimmer on basin water
  ctx.save();
  ctx.globalAlpha = 0.3 + shimmer * 0.15;
  drawPixel(ctx, x - p, y - p*3, '#C8E8FF');
  drawPixel(ctx, x + p*2, y - p*7, '#C8E8FF');
  ctx.restore();
}

function drawDecoPavilion(ctx, x, y, p) {
  const WOOD = '#9B7B5B';
  const WOOD_D = '#7B5B3B';
  const ROOF = '#C04040';
  const ROOF_D = '#903030';
  // Floor
  drawPixelRect(ctx, x - p*4, y - p, p*9, p, WOOD_D);
  // Pillars
  drawPixelRect(ctx, x - p*3, y - p*5, p, p*4, WOOD);
  drawPixelRect(ctx, x + p*3, y - p*5, p, p*4, WOOD);
  // Cross beam
  drawPixelRect(ctx, x - p*3, y - p*5, p*7, p, WOOD);
  // Roof
  drawPixelRect(ctx, x - p*4, y - p*6, p*9, p, ROOF);
  drawPixelRect(ctx, x - p*3, y - p*7, p*7, p, ROOF);
  drawPixelRect(ctx, x - p*2, y - p*8, p*5, p, ROOF);
  drawPixelRect(ctx, x - p, y - p*9, p*3, p, ROOF_D);
  drawPixel(ctx, x, y - p*10, ROOF_D);
  // Inner bench hint
  drawPixelRect(ctx, x - p*2, y - p*2, p*5, p, WOOD_D);
}

function drawDecoWindmill(ctx, x, y, p, anim) {
  const STONE = '#C8C0B8';
  const STONE_D = '#B0A898';
  const WOOD = '#9B7B5B';
  const BLADE = '#D8D0C8';
  const BLADE_D = '#B8B0A8';
  // Base
  drawPixelRect(ctx, x - p*3, y - p, p*7, p, STONE_D);
  // Building body (tapers up)
  drawPixelRect(ctx, x - p*3, y - p*3, p*7, p*2, STONE);
  drawPixelRect(ctx, x - p*2, y - p*5, p*5, p*2, STONE);
  drawPixelRect(ctx, x - p, y - p*7, p*3, p*2, STONE_D);
  // Door
  drawPixel(ctx, x, y - p*2, WOOD);
  drawPixel(ctx, x, y - p, WOOD);
  // Window
  drawPixel(ctx, x, y - p*4, '#A8D8F0');
  // Blade hub
  const hx = x, hy = y - p*8;
  drawPixel(ctx, hx, hy, WOOD);
  // Blades - rotate with canvas transform
  ctx.save();
  ctx.translate(hx + p * 0.5, hy + p * 0.5);
  ctx.rotate(anim * 1.5);
  ctx.fillStyle = BLADE;
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.rotate(i * Math.PI / 2);
    ctx.fillRect(-1, -p * 3.5, 3, p * 3);
    ctx.fillStyle = BLADE_D;
    ctx.restore();
  }
  ctx.restore();
}

function drawDecoBridge(ctx, x, y, p) {
  const WOOD = '#9B7B5B';
  const WOOD_D = '#7B5B3B';
  const WOOD_L = '#B8987B';
  // Bridge deck (arched - higher in middle)
  drawPixelRect(ctx, x - p*4, y - p, p*9, p, WOOD);
  drawPixelRect(ctx, x - p*3, y - p*2, p*7, p, WOOD);
  drawPixelRect(ctx, x - p*2, y - p*3, p*5, p, WOOD_L);
  // Plank lines
  drawPixel(ctx, x - p*3, y - p*2, WOOD_D);
  drawPixel(ctx, x - p, y - p*3, WOOD_D);
  drawPixel(ctx, x + p, y - p*3, WOOD_D);
  drawPixel(ctx, x + p*3, y - p*2, WOOD_D);
  // Railings
  drawPixelRect(ctx, x - p*4, y - p*4, p, p*3, WOOD_D);
  drawPixelRect(ctx, x + p*4, y - p*4, p, p*3, WOOD_D);
  // Railing tops
  drawPixel(ctx, x - p*4, y - p*5, WOOD);
  drawPixel(ctx, x + p*4, y - p*5, WOOD);
  // Railing bar
  drawPixelRect(ctx, x - p*4, y - p*4, p*9, p, WOOD);
  // Under-arch shadow
  ctx.save();
  ctx.globalAlpha = 0.1;
  drawPixelRect(ctx, x - p*2, y, p*5, p, '#2D2D2D');
  ctx.restore();
}


function drawDecoCarrot(ctx, x, y, p) {
  const ORANGE = '#E8883D';
  const ORANGE_D = '#CC6B28';
  const ORANGE_L = '#F0A050';
  const GREEN = '#6BBF6B';
  const GREEN_D = '#4A8F4A';
  const SOIL = '#8B7355';
  // Soil mound
  drawPixelRect(ctx, x - p*2, y, p*5, p, SOIL);
  drawPixelRect(ctx, x - p, y - p, p*3, p, SOIL);
  // Carrot body poking out of soil
  drawPixelRect(ctx, x, y - p*2, p, p, ORANGE);
  drawPixel(ctx, x - p, y - p*2, ORANGE_D);
  drawPixel(ctx, x + p, y - p*2, ORANGE_L);
  drawPixel(ctx, x, y - p*3, ORANGE);
  // Green leaves (3 stems fanning out)
  drawPixel(ctx, x, y - p*4, GREEN);
  drawPixel(ctx, x, y - p*5, GREEN);
  drawPixel(ctx, x - p, y - p*5, GREEN_D);
  drawPixel(ctx, x + p, y - p*5, GREEN_D);
  drawPixel(ctx, x - p, y - p*6, GREEN);
  drawPixel(ctx, x + p, y - p*6, GREEN);
  drawPixel(ctx, x, y - p*6, GREEN_D);
}

export { drawDecoPlaced };
