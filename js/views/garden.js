/**
 * Garden View - Orchestration, state init, event handling.
 * Plants are earned as weekly rewards and placed manually by the user.
 */

import gardenRepo from '../repo/gardenRepo.js';
import { checkWeeklyRewards, updatePlantGrowth, addTestPlant, RARITY_LABELS, RARITY_COLORS } from '../utils/rewards.js';
import { DECO_NAMES, DECO_EMOJIS } from '../utils/decoRewards.js';
import { escapeHtml } from '../utils/sanitize.js';
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

  // Check for weekly rewards, then update growth for current-week plants
  const newPlants = await checkWeeklyRewards();
  await updatePlantGrowth();

  const screen = document.createElement('div');
  screen.className = 'garden-screen';

  const title = document.createElement('h1');
  title.className = 'garden-title';
  title.innerHTML = '<div class="header-row"><span>Garten</span></div>';
  screen.appendChild(title);

  // Debug buttons (only visible when debug mode is enabled in settings)
  if (localStorage.getItem('debug') !== '0') {
    screen.appendChild(buildDebugButtons(container));
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

  // Info Footer - shows selected plant details or garden stats
  const { element: infoFooter, updateFooter } = buildInfoFooter(placedPlants);
  screen.appendChild(infoFooter);

  container.appendChild(screen);

  // Check for unseen deco rewards (keep only IDs of existing plants to prevent unbounded growth)
  const allDecoIds = new Set(allPlants.filter(p => p.itemType === 'deco').map(p => p.id));
  const seenIds = new Set(JSON.parse(localStorage.getItem('seenDecoIds') || '[]').filter(id => allDecoIds.has(id)));
  const unseenDecos = allPlants.filter(p =>
    p.itemType === 'deco' && !seenIds.has(p.id)
  );
  if (unseenDecos.length > 0) {
    for (const d of unseenDecos) seenIds.add(d.id);
  }
  localStorage.setItem('seenDecoIds', JSON.stringify([...seenIds]));

  // Show reward popups: weekly plants first, then unseen decos (sequentially)
  if (newPlants.length > 0) {
    showRewardPopup(newPlants, () => {
      if (unseenDecos.length > 0) {
        showDecoRewardPopup(unseenDecos, () => refreshInventory());
      } else {
        refreshInventory();
      }
    });
  } else if (unseenDecos.length > 0) {
    showDecoRewardPopup(unseenDecos, () => refreshInventory());
  }

  // Start renderer
  const renderer = startRenderer({
    canvas,
    plantGrid,
    gridCols,
    gridRows,
    getPlacementMode: () => placementMode,
  });

  // Canvas interaction: placement + footer updates
  setupCanvasInteraction({
    canvas, wrap, plantGrid, gridCols, gridRows, originX, originY,
    getPlacementMode: () => placementMode,
    setPlacementMode: (val) => { placementMode = val; },
    placementIndicator, refreshInventory, updateFooter,
  });

  // Store cleanup reference for router to call
  gardenCleanup = () => {
    renderer.cleanup();
  };
}

// ============================================================
// Debug buttons (dev mode only)
// ============================================================

function buildDebugButtons(container) {
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

  return debugWrap;
}

// ============================================================
// Canvas interaction: placement + footer updates
// ============================================================

/**
 * Set up click handling on the garden canvas for plant placement and footer updates.
 */
function setupCanvasInteraction({ canvas, wrap, plantGrid, gridCols, gridRows, originX, originY,
  getPlacementMode, setPlacementMode, placementIndicator, refreshInventory, updateFooter }) {

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    const iso = screenToIso(cx, cy, originX, originY);

    if (iso.row < 0 || iso.row >= gridRows || iso.col < 0 || iso.col >= gridCols) {
      // Click outside garden - show garden stats
      updateFooter.showGardenStats();
      return;
    }

    const key = `${iso.col},${iso.row}`;
    const placementMode = getPlacementMode();

    if (placementMode) {
      if (!plantGrid[key]) {
        gardenRepo.placePlant(placementMode.id, iso.col, iso.row).then(() => {
          plantGrid[key] = { ...placementMode, gridCol: iso.col, gridRow: iso.row, placed: 1 };
          setPlacementMode(null);
          placementIndicator.classList.add('hidden');
          refreshInventory();
        });
      }
      return;
    }

    // Update footer based on clicked plant/tile
    const plant = plantGrid[key];
    if (plant) {
      updateFooter.showPlantDetails(plant);
    } else {
      updateFooter.showGardenStats();
    }
  });

  // Cancel placement button
  placementIndicator.querySelector('.placement-cancel-btn').addEventListener('click', () => {
    setPlacementMode(null);
    placementIndicator.classList.add('hidden');
    refreshInventory();
  });
}



// ============================================================
// Reward popup
// ============================================================

/**
 * Show a reward popup modal for new plants or decorations.
 * @param {string} title - Popup headline
 * @param {Array} items - Array of {emoji, name, subtitle, subtitleColor, source}
 * @param {Function} onClose - Callback when popup is dismissed
 */
function showRewardModal(title, items, onClose) {
  const html = `
    <div class="reward-popup-title">${title}</div>
    <div class="reward-popup-list">
      ${items.map(item => `
        <div class="reward-item">
          <span class="reward-emoji">${item.emoji}</span>
          <div class="reward-info">
            <div class="reward-name">${item.name}</div>
            <div class="reward-rarity" style="color:${item.subtitleColor}">${item.subtitle}</div>
            <div class="reward-habit">${escapeHtml(item.source)}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <button class="btn btn-primary reward-close-btn">Super! 🌱</button>
  `;

  const { overlay, close } = createModal(html, { extraClass: 'reward-popup', onClose });
  overlay.querySelector('.reward-close-btn').addEventListener('click', close);
}

/** Show popup for newly earned weekly plants */
function showRewardPopup(plants, onClose) {
  const items = plants.map(p => ({
    emoji: PLANT_EMOJIS[p.plantType] || '🌿',
    name: PLANT_NAMES_DE[p.plantType] || p.plantType,
    subtitle: RARITY_LABELS[p.rarity],
    subtitleColor: RARITY_COLORS[p.rarity] || '#8ED88E',
    source: p.habitName,
  }));
  const title = `🎁 Du hast ${plants.length} neue Pflanze${plants.length > 1 ? 'n' : ''} verdient!`;
  showRewardModal(title, items, onClose);
}

/** Show popup for unseen deco rewards from completed tasks */
function showDecoRewardPopup(decos, onClose) {
  const items = decos.map(d => ({
    emoji: DECO_EMOJIS[d.plantType] || '🎨',
    name: DECO_NAMES[d.plantType] || d.plantType,
    subtitle: 'Dekoration',
    subtitleColor: '#8B5CF6',
    source: d.habitName,
  }));
  const title = `🎁 ${decos.length} neue Deko${decos.length > 1 ? 's' : ''} für deinen Garten!`;
  showRewardModal(title, items, onClose);
}

// ============================================================
// Info Footer System
// ============================================================

/**
 * Build the info footer that shows garden stats or plant details
 * @param {Array} placedPlants - Array of all placed plants/decos
 * @returns {Object} { element, updateFooter }
 */
function buildInfoFooter(placedPlants) {
  const footer = document.createElement('div');
  footer.className = 'info-footer';
  
  // Calculate initial garden stats
  const stats = calculateGardenStats(placedPlants);
  
  // Default content: garden stats
  function showGardenStats() {
    footer.innerHTML = `
      <div class="info-footer-content">
        <div class="info-footer-stats">
          🌱 ${stats.totalPlants} Pflanzen • 🌸 ${stats.blooming} blühen • ⭐ ${stats.legendary} legendär
        </div>
      </div>
    `;
  }
  
  // Plant details content
  function showPlantDetails(plant) {
    const isDeco = plant.itemType === 'deco';
    const emoji = isDeco ? (DECO_EMOJIS[plant.plantType] || '🎨') : (PLANT_EMOJIS[plant.plantType] || '🌿');
    const name = isDeco ? (DECO_NAMES[plant.plantType] || plant.plantType) : (PLANT_NAMES_DE[plant.plantType] || plant.plantType);
    const rarityColor = RARITY_COLORS[plant.rarity] || '#8ED88E';
    const rarityLabel = isDeco ? 'Dekoration' : (RARITY_LABELS[plant.rarity] || plant.rarity);
    
    // Additional info for plants
    const adoptionInfo = plant.isAdopted && plant.originalHabitName ? 
      `<span class="info-footer-detail">Adoptiert von: ${escapeHtml(plant.originalHabitName)}</span>` : '';
    
    const growthInfo = plant.maxGrowth ? 
      `<span class="info-footer-detail">Wachstum: ${plant.totalGrowth || plant.growthStage}/${plant.maxGrowth}</span>` : '';
    
    footer.innerHTML = `
      <div class="info-footer-content">
        <div class="info-footer-main">
          <div class="info-footer-plant-name">${emoji} ${name}</div>
          <div class="info-footer-rarity" style="color:${rarityColor}">${rarityLabel}</div>
        </div>
        <div class="info-footer-details">
          <span class="info-footer-detail">Gehört zu: ${escapeHtml(plant.habitName)}</span>
          ${adoptionInfo}
          ${growthInfo}
          <span class="info-footer-detail">Woche: ${plant.weekEarned}</span>
        </div>
        <button class="info-footer-remove-btn" data-plant-id="${plant.id}">🗑️ Entfernen</button>
      </div>
    `;
    
    // Add click handler for remove button
    const removeBtn = footer.querySelector('.info-footer-remove-btn');
    removeBtn.addEventListener('click', async () => {
      if (confirm(`${name} wirklich aus dem Garten entfernen?`)) {
        await gardenRepo.unplacePlant(plant.id);
        // Update stats and show garden stats again
        const allPlants = await gardenRepo.getPlacedPlants();
        const newStats = calculateGardenStats(allPlants);
        stats.totalPlants = newStats.totalPlants;
        stats.blooming = newStats.blooming;
        stats.legendary = newStats.legendary;
        showGardenStats();
        // Refresh inventory to show the plant is available again
        refreshInventory();
      }
    });
  }
  
  // Initial state: show garden stats
  showGardenStats();
  
  // Return both the element and the update function
  return {
    element: footer,
    updateFooter: {
      showGardenStats,
      showPlantDetails
    }
  };
}

/**
 * Calculate garden statistics from placed plants
 * @param {Array} placedPlants - Array of placed plants/decos
 * @returns {Object} Stats object with counts
 */
function calculateGardenStats(placedPlants) {
  const plants = placedPlants.filter(p => p.itemType !== 'deco');
  const totalPlants = plants.length;
  
  // Count blooming plants (high growth stages or specific plant types that are considered "blooming")
  const blooming = plants.filter(p => {
    // Consider plants with growth stage 4+ as blooming, or certain plant types
    return p.growthStage >= 4 || p.plantType.includes('blume') || p.plantType.includes('rose');
  }).length;
  
  // Count legendary plants
  const legendary = plants.filter(p => p.rarity === 'legendary').length;
  
  return {
    totalPlants,
    blooming,
    legendary
  };
}
