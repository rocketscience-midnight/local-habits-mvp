/**
 * Garden View - Orchestration, state init, event handling.
 * Plants are earned as weekly rewards and placed manually by the user.
 */

import gardenRepo from '../repo/gardenRepo.js';
import { checkWeeklyRewards, addTestPlant, RARITY_LABELS, RARITY_COLORS } from '../utils/rewards.js';
import { DECO_NAMES, DECO_EMOJIS } from '../utils/decoRewards.js';
import { escapeHtml } from '../utils/sanitize.js';
import { showHelp } from './help.js';
import {
  TILE_W, TILE_H, COLS, ROWS,
  PLANT_NAMES_DE, PLANT_EMOJIS,
  isoToScreen, screenToIso,
} from '../garden/plantArt.js';
import { startRenderer } from './gardenRenderer.js';
import { buildInventory, buildCollection } from './gardenInventory.js';
import { createModal } from '../components/modal.js';

// ============================================================
// State
// ============================================================

let gardenCleanup = null;

/** Cancel all garden animation frames */
export function cleanupGarden() {
  if (gardenCleanup) {
    gardenCleanup();
    gardenCleanup = null;
  }
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
  title.innerHTML = '<div class="header-row"><span>Garten</span><button class="help-btn" aria-label="Hilfe">❓</button></div>';
  title.querySelector('.help-btn').addEventListener('click', showHelp);
  screen.appendChild(title);

  // Debug buttons (only visible when debug mode is enabled in settings)
  if (localStorage.getItem('debug') !== '0') {
    const debugWrap = document.createElement('div');
    debugWrap.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-bottom:8px;';

    const debugBtn = document.createElement('button');
    debugBtn.className = 'garden-debug-btn';
    debugBtn.textContent = '🎁 Test-Pflanze';
    debugBtn.addEventListener('click', async () => {
      await addTestPlant();
      renderGarden(container);
    });
    debugWrap.appendChild(debugBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'garden-debug-btn';
    clearBtn.style.background = '#4A1020';
    clearBtn.textContent = '🗑️ Alle Pflanzen löschen';
    clearBtn.addEventListener('click', async () => {
      if (!confirm('Wirklich ALLE Pflanzen löschen?')) return;
      await gardenRepo.clearAllPlants();
      renderGarden(container);
    });
    debugWrap.appendChild(clearBtn);

    const carrotBtn = document.createElement('button');
    carrotBtn.className = 'garden-debug-btn';
    carrotBtn.style.background = '#6B3B10';
    carrotBtn.textContent = '🥕 Test-Gemüse';
    carrotBtn.addEventListener('click', async () => {
      const types = ['carrot', 'karotte', 'mohrruebe'];
      const names = ['Möhre', 'Karotte', 'Mohrrübe'];
      for (let i = 0; i < 3; i++) {
        await gardenRepo.addGardenPlant({
          plantType: types[i], rarity: 'uncommon', growthStage: 1,
          itemType: 'deco', habitId: 'debug-' + types[i], habitName: names[i],
          weekEarned: new Date().toISOString().slice(0, 10), placed: 0, gridCol: null, gridRow: null,
        });
      }
      renderGarden(container);
    });
    debugWrap.appendChild(carrotBtn);

    screen.appendChild(debugWrap);
  }

  // State
  let placementMode = null;
  let placedPlants = await gardenRepo.getPlacedPlants();

  // Build placed plants map: "col,row" -> plant
  const plantGrid = {};
  for (const p of placedPlants) {
    if (p.gridCol !== null && p.gridRow !== null) {
      plantGrid[`${p.gridCol},${p.gridRow}`] = p;
    }
  }

  // Canvas setup - grid grows when >70% full
  const totalPlants = placedPlants.length;
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
  const { element: inventoryEl, refresh: refreshInventory } = buildInventory({
    getPlacementMode: () => placementMode,
    setPlacementMode: (val) => { placementMode = val; },
    placementIndicator,
  });
  screen.appendChild(inventoryEl);

  // Collection / Pokédex
  const allPlants = await gardenRepo.getAllGardenPlants();
  screen.appendChild(buildCollection(allPlants));

  container.appendChild(screen);

  // Show reward popup if new plants were earned
  if (newPlants.length > 0) {
    showRewardPopup(newPlants, () => refreshInventory());
  }

  // Start renderer
  const renderer = startRenderer({
    canvas,
    plantGrid,
    gridCols,
    gridRows,
    getPlacementMode: () => placementMode,
  });

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
      if (!plantGrid[key]) {
        gardenRepo.placePlant(placementMode.id, iso.col, iso.row).then(() => {
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
      const isDeco = plant.itemType === 'deco';
      const tooltipEmoji = isDeco ? (DECO_EMOJIS[plant.plantType] || '🎨') : (PLANT_EMOJIS[plant.plantType] || '🌿');
      const tooltipName = isDeco ? (DECO_NAMES[plant.plantType] || plant.plantType) : (PLANT_NAMES_DE[plant.plantType] || plant.plantType);
      const rarityColor = RARITY_COLORS[plant.rarity] || '#8ED88E';
      tip.innerHTML = `
        <div class="garden-tooltip-name">${tooltipEmoji} ${tooltipName}</div>
        <div class="garden-tooltip-rarity" style="color:${rarityColor}">${isDeco ? 'Dekoration' : (RARITY_LABELS[plant.rarity] || plant.rarity)}</div>
        <div class="garden-tooltip-detail">Verdient durch: ${escapeHtml(plant.habitName)}</div>
        <div class="garden-tooltip-detail">Woche: ${plant.weekEarned}</div>
        <button class="garden-tooltip-remove-btn">↩ Entfernen</button>
      `;
      tip.querySelector('.garden-tooltip-remove-btn').addEventListener('click', async (ev) => {
        ev.stopPropagation();
        await gardenRepo.unplacePlant(plant.id);
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

  // Store cleanup reference for router to call
  gardenCleanup = () => {
    renderer.cleanup();
  };
}

// ============================================================
// Reward popup
// ============================================================

function showRewardPopup(plants, onClose) {
  const html = `
    <div class="reward-popup-title">🎁 Du hast ${plants.length} neue Pflanze${plants.length > 1 ? 'n' : ''} verdient!</div>
    <div class="reward-popup-list">
      ${plants.map(p => {
        const color = RARITY_COLORS[p.rarity] || '#8ED88E';
        const emoji = PLANT_EMOJIS[p.plantType] || '🌿';
        return `<div class="reward-item">
          <span class="reward-emoji">${emoji}</span>
          <div class="reward-info">
            <div class="reward-name">${PLANT_NAMES_DE[p.plantType] || p.plantType}</div>
            <div class="reward-rarity" style="color:${color}">${RARITY_LABELS[p.rarity]}</div>
            <div class="reward-habit">${escapeHtml(p.habitName)}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <button class="btn btn-primary reward-close-btn">Super! 🌱</button>
  `;

  const { overlay, close } = createModal(html, { extraClass: 'reward-popup', onClose });
  overlay.querySelector('.reward-close-btn').addEventListener('click', close);
}
