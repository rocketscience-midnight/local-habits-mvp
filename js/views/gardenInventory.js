/**
 * Garden Inventory – Inventory UI, Placement Mode, Collection/Pokédex
 */

import gardenRepo from '../repo/gardenRepo.js';
import { RARITY_LABELS, RARITY_COLORS, RARITY_TO_STAGE } from '../utils/rewards.js';
import { ALL_DECOS, DECO_NAMES, DECO_EMOJIS, DECO_DIFFICULTY } from '../utils/decoRewards.js';
import { PLANT_NAMES_DE, PLANT_EMOJIS, drawPlant, drawTile } from '../garden/plantArt.js';
import { drawDecoPlaced } from '../garden/decoArt.js';
import { drawPlantIcon, drawDecoIcon } from './gardenRenderer.js';
import { createModal } from '../components/modal.js';
import { escapeHtml } from '../utils/sanitize.js';

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// ============================================================
// Collection Preview Tooltip
// ============================================================

let _activeTooltip = null;
let _longPressTimer = null;

/** Draw a mini garden background on the preview canvas */
function _drawPreviewBackground(ctx, w, h) {
  // Grass fill
  ctx.fillStyle = '#A8D8A8';
  ctx.fillRect(0, 0, w, h);

  // Draw a small 2×2 isometric tile grid in the lower-center
  const TILE_W = 64, TILE_H = 32;
  const originX = w / 2;
  const originY = h / 2 + 18;

  const tileColors = ['#A8D8A8', '#96CC96', '#B4E0B4'];
  const edgeColor = '#98C898';

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const tx = originX + (c - r) * (TILE_W / 2);
      const ty = originY + (c + r) * (TILE_H / 2);
      const color = tileColors[(c + r) % tileColors.length];
      drawTile(ctx, tx, ty, color, edgeColor);
    }
  }

  // A couple of pixel stones for charm
  ctx.fillStyle = '#B0A898';
  ctx.fillRect(originX - 22, originY + 4, 6, 3);
  ctx.fillStyle = '#C8C0B0';
  ctx.fillRect(originX - 20, originY + 1, 3, 3);
  ctx.fillStyle = '#B0A898';
  ctx.fillRect(originX + 16, originY + 6, 4, 2);
}

/** Render a plant or deco preview onto a canvas element */
function _renderPreviewCanvas(canvas, type, rarity, isDeco) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  _drawPreviewBackground(ctx, w, h);

  const cx = w / 2;
  const cy = h / 2 + 28;
  const pixelSize = 6;

  if (isDeco) {
    drawDecoPlaced(ctx, cx, cy, type, 0, pixelSize);
  } else {
    const stage = RARITY_TO_STAGE[rarity] ?? 3;
    drawPlant(ctx, cx, cy, type, stage, 0, pixelSize);
  }
}

/** Create and show the preview tooltip near the target element */
function _showPreviewTooltip(targetEl, type, rarity, isDeco) {
  _removePreviewTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'collection-preview-tooltip';

  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 160;
  _renderPreviewCanvas(canvas, type, rarity, isDeco);
  tooltip.appendChild(canvas);

  document.body.appendChild(tooltip);
  _activeTooltip = tooltip;

  // Position: prefer above-right of item, clamped to viewport
  const rect = targetEl.getBoundingClientRect();
  const ttW = 160 + 16; // canvas + 2*padding
  const ttH = 160 + 16;
  const margin = 8;

  let left = rect.right + margin;
  let top = rect.top;

  // Clamp right edge
  if (left + ttW > window.innerWidth - margin) {
    left = rect.left - ttW - margin;
  }
  // Clamp left edge
  if (left < margin) {
    left = rect.left + (rect.width - ttW) / 2;
  }
  // Clamp bottom edge
  if (top + ttH > window.innerHeight - margin) {
    top = window.innerHeight - ttH - margin;
  }
  // Clamp top edge
  if (top < margin) top = margin;

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function _removePreviewTooltip() {
  if (_activeTooltip) {
    _activeTooltip.remove();
    _activeTooltip = null;
  }
}

/** Attach hover (desktop) and long-press (mobile) preview events to a collection item */
function _attachPreviewEvents(item, type, rarity, isDeco) {
  // Desktop hover
  item.addEventListener('mouseenter', () => {
    _showPreviewTooltip(item, type, rarity, isDeco);
  });
  item.addEventListener('mouseleave', () => {
    _removePreviewTooltip();
  });

  // Mobile long-press (400ms)
  item.addEventListener('touchstart', (e) => {
    _longPressTimer = setTimeout(() => {
      _showPreviewTooltip(item, type, rarity, isDeco);
    }, 400);
  }, { passive: true });

  item.addEventListener('touchend', () => {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
    _removePreviewTooltip();
  }, { passive: true });

  item.addEventListener('touchcancel', () => {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
    _removePreviewTooltip();
  }, { passive: true });

  item.addEventListener('touchmove', () => {
    clearTimeout(_longPressTimer);
    _longPressTimer = null;
  }, { passive: true });
}

const ALL_COMBOS = [
  { type: 'bush', rarity: 'common' }, { type: 'mushroom', rarity: 'common' },
  { type: 'grass', rarity: 'common' }, { type: 'clover', rarity: 'common' },
  { type: 'tulip', rarity: 'uncommon' }, { type: 'mushroom', rarity: 'uncommon' },
  { type: 'fern', rarity: 'uncommon' }, { type: 'daisy', rarity: 'uncommon' },
  { type: 'sunflower', rarity: 'rare' }, { type: 'bush', rarity: 'rare' },
  { type: 'cherry', rarity: 'epic' }, { type: 'appletree', rarity: 'epic' },
  { type: 'cherry', rarity: 'legendary' }, { type: 'sunflower', rarity: 'legendary' },
];

const DIFF_LABELS = { medium: 'Mittel', hard: 'Groß' };
const DIFF_COLORS = { medium: '#F5A623', hard: '#E84545' };

/**
 * Build the inventory bar element and return it together with a refresh function.
 *
 * @param {Object} params
 * @param {Function} params.getPlacementMode
 * @param {Function} params.setPlacementMode
 * @param {HTMLElement} params.placementIndicator
 * @returns {{ element: HTMLElement, refresh: Function }}
 */
export function buildInventory({ getPlacementMode, setPlacementMode, placementIndicator }) {
  const inventoryBar = document.createElement('div');
  inventoryBar.className = 'garden-inventory';
  const inventoryTitle = document.createElement('div');
  inventoryTitle.className = 'garden-inventory-title';
  inventoryBar.appendChild(inventoryTitle);

  const inventoryScroll = document.createElement('div');
  inventoryScroll.className = 'garden-inventory-scroll';
  inventoryBar.appendChild(inventoryScroll);

  function refresh() {
    // Show ONLY unplaced plants (placed plants live on the canvas)
    gardenRepo.getAllGardenPlants().then(allPlants => {
      const unplaced = allPlants.filter(p => !p.placed);
      inventoryTitle.textContent = `Inventar (${unplaced.length})`;
      inventoryScroll.innerHTML = '';

      if (unplaced.length === 0) {
        inventoryScroll.innerHTML = '<div class="inventory-empty">Alle Pflanzen im Garten platziert 🌱</div>';
        return;
      }

      for (const plant of unplaced) {
        const item = document.createElement('div');
        item.className = 'inventory-item';
        item.dataset.plantId = plant.id;

        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 56;
        iconCanvas.height = 56;
        iconCanvas.className = 'inventory-icon-canvas';
        if (plant.itemType === 'deco') {
          drawDecoIcon(iconCanvas, plant.plantType);
        } else {
          const stage = RARITY_TO_STAGE[plant.rarity] ?? plant.growthStage ?? 2;
          drawPlantIcon(iconCanvas, plant.plantType, stage);
        }

        const label = document.createElement('div');
        label.className = 'inventory-item-label';
        if (plant.itemType === 'deco') {
          const diffColor = DECO_DIFFICULTY[plant.plantType] === 'hard' ? '#E84545' : DECO_DIFFICULTY[plant.plantType] === 'medium' ? '#F5A623' : '#6BBF6B';
          label.innerHTML = `<span style="color:${diffColor};font-size:10px;font-weight:700;">${DECO_NAMES[plant.plantType] || plant.plantType}</span>`;
        } else {
          const rarityColor = RARITY_COLORS[plant.rarity] || '#8ED88E';
          const plantName = PLANT_NAMES_DE[plant.plantType] || plant.plantType;
          label.innerHTML = `<span style="color:${rarityColor};font-size:10px;font-weight:700;">${plantName}</span>`;
        }

        item.appendChild(iconCanvas);
        item.appendChild(label);

        item.addEventListener('click', () => {
          // Placement logic for unplaced plants
          if (getPlacementMode() && getPlacementMode().id === plant.id) {
            setPlacementMode(null);
            placementIndicator.classList.add('hidden');
            refresh();
            return;
          }
          setPlacementMode(plant);
          placementIndicator.classList.remove('hidden');
          inventoryScroll.querySelectorAll('.inventory-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
        });

        inventoryScroll.appendChild(item);
      }
    });
  }

  refresh();

  return { element: inventoryBar, refresh };
}

/**
 * Build the collection/Pokédex element.
 *
 * @param {Array} allPlants - all garden plants from DB
 * @returns {HTMLElement}
 */
export function buildCollection(allPlants) {
  const ownedSet = new Set(allPlants.map(p => `${p.plantType}-${p.rarity}`));

  const collection = document.createElement('div');
  collection.className = 'garden-collection';
  const collTitle = document.createElement('div');
  collTitle.className = 'garden-collection-title';
  const ownedCount = ALL_COMBOS.filter(c => ownedSet.has(`${c.type}-${c.rarity}`)).length;
  collTitle.textContent = `Sammlung (${ownedCount}/${ALL_COMBOS.length})`;
  collection.appendChild(collTitle);

  const collGrid = document.createElement('div');
  collGrid.className = 'collection-grid';

  for (const rarity of RARITY_ORDER) {
    const combos = ALL_COMBOS.filter(c => c.rarity === rarity);
    if (combos.length === 0) continue;

    for (const combo of combos) {
      const owned = ownedSet.has(`${combo.type}-${combo.rarity}`);
      const item = document.createElement('div');
      item.className = `collection-item ${owned ? '' : 'locked'}`;
      item.style.borderColor = owned ? RARITY_COLORS[combo.rarity] : '#E0D8D0';

      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 56;
      iconCanvas.height = 56;
      const stage = RARITY_TO_STAGE[combo.rarity];
      drawPlantIcon(iconCanvas, combo.type, stage);
      if (!owned) iconCanvas.style.filter = 'grayscale(1) opacity(0.3)';

      const label = document.createElement('div');
      label.className = 'collection-item-label';
      label.innerHTML = `<span style="color:${RARITY_COLORS[combo.rarity]};font-weight:600;">${PLANT_NAMES_DE[combo.type]}</span>`;

      item.appendChild(iconCanvas);
      item.appendChild(label);
      if (owned) {
        _attachPreviewEvents(item, combo.type, combo.rarity, false);
      }
      collGrid.appendChild(item);
    }
  }
  collection.appendChild(collGrid);

  // Deco collection section
  const ownedDecoSet = new Set(allPlants.filter(p => p.itemType === 'deco').map(p => p.plantType));
  const decoTitle = document.createElement('div');
  decoTitle.className = 'garden-collection-title';
  decoTitle.style.marginTop = '20px';
  const ownedDecoCount = ALL_DECOS.filter(d => ownedDecoSet.has(d.type)).length;
  decoTitle.textContent = `Dekorationen (${ownedDecoCount}/${ALL_DECOS.length})`;
  collection.appendChild(decoTitle);

  const decoGrid = document.createElement('div');
  decoGrid.className = 'collection-grid';

  for (const diff of ['medium', 'hard']) {
    const decos = ALL_DECOS.filter(d => DECO_DIFFICULTY[d.type] === diff);
    if (decos.length === 0) continue;

    for (const deco of decos) {
      const owned = ownedDecoSet.has(deco.type);
      const item = document.createElement('div');
      item.className = `collection-item ${owned ? '' : 'locked'}`;
      item.style.borderColor = owned ? DIFF_COLORS[diff] : '#E0D8D0';

      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 56;
      iconCanvas.height = 56;
      drawDecoIcon(iconCanvas, deco.type);
      if (!owned) iconCanvas.style.filter = 'grayscale(1) opacity(0.3)';

      const label = document.createElement('div');
      label.className = 'collection-item-label';
      label.innerHTML = `<span style="color:${DIFF_COLORS[diff]};font-weight:600;">${deco.name}</span>`;

      item.appendChild(iconCanvas);
      item.appendChild(label);
      if (owned) {
        _attachPreviewEvents(item, deco.type, null, true);
      }
      decoGrid.appendChild(item);
    }
  }
  collection.appendChild(decoGrid);

  return collection;
}

/**
 * Show info popup for a placed plant (long-press only – no move/remove buttons).
 * @param {Object} plant - Plant data object
 */
export function showPlantInteractionPopup(plant) {
  const isDeco = plant.itemType === 'deco';
  const emoji = isDeco ? (DECO_EMOJIS[plant.plantType] || '🎨') : (PLANT_EMOJIS[plant.plantType] || '🌿');
  const name = isDeco ? (DECO_NAMES[plant.plantType] || plant.plantType) : (PLANT_NAMES_DE[plant.plantType] || plant.plantType);
  const rarityColor = RARITY_COLORS[plant.rarity] || '#8ED88E';
  const rarityLabel = isDeco ? 'Dekoration' : (RARITY_LABELS[plant.rarity] || plant.rarity);

  // Growth bar HTML (only for plants with maxGrowth)
  const growthDisplay = plant.maxGrowth ? `
    <div class="popup-growth">
      <span class="growth-label">Wachstum:</span>
      <div class="growth-bar">
        <div class="growth-fill" style="width: ${((plant.totalGrowth || plant.growthStage) / plant.maxGrowth) * 100}%"></div>
        <span class="growth-text">${plant.totalGrowth || plant.growthStage}/${plant.maxGrowth}</span>
      </div>
    </div>
  ` : '';

  // Adoption info (if applicable)
  const adoptionInfo = plant.isAdopted && plant.originalHabitName ? `
    <div class="popup-detail">
      <span class="detail-icon">🤝</span>
      <span class="detail-text">Adoptiert von: ${escapeHtml(plant.originalHabitName)}</span>
    </div>
  ` : '';

  const html = `
    <div class="plant-popup-header">
      <span class="popup-emoji">${emoji}</span>
      <div class="popup-title">
        <h3 class="popup-name">${name}</h3>
        <span class="popup-rarity" style="color: ${rarityColor}">${rarityLabel}</span>
      </div>
    </div>

    <div class="popup-info">
      <div class="popup-detail">
        <span class="detail-icon">🏷️</span>
        <span class="detail-text">Verdient durch: ${escapeHtml(plant.habitName || '–')}</span>
      </div>
      ${adoptionInfo}
      ${growthDisplay}
    </div>

    <div class="popup-hint">Tippe auf die Pflanze im Garten um sie zu verschieben.</div>
  `;

  const { overlay } = createModal(html, {
    extraClass: 'plant-interaction-popup',
    title: `${emoji} ${name}`,
  });
  overlay.classList.add('plant-popup-overlay');
}
