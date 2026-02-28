/**
 * Garden Inventory – Inventory UI, Placement Mode, Collection/Pokédex
 */

import gardenRepo from '../repo/gardenRepo.js';
import { RARITY_LABELS, RARITY_COLORS, RARITY_TO_STAGE } from '../utils/rewards.js';
import { ALL_DECOS, DECO_NAMES, DECO_EMOJIS, DECO_DIFFICULTY } from '../utils/decoRewards.js';
import { PLANT_NAMES_DE, PLANT_EMOJIS } from '../garden/plantArt.js';
import { drawPlantIcon, drawDecoIcon } from './gardenRenderer.js';
import { createModal } from '../components/modal.js';
import { escapeHtml } from '../utils/sanitize.js';

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

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
    // Show ALL plants (both placed and unplaced)
    gardenRepo.getAllGardenPlants().then(allPlants => {
      inventoryTitle.textContent = `Inventar (${allPlants.length})`;
      inventoryScroll.innerHTML = '';

      if (allPlants.length === 0) {
        inventoryScroll.innerHTML = '<div class="inventory-empty">Keine Pflanzen im Inventar</div>';
        return;
      }

      for (const plant of allPlants) {
        const item = document.createElement('div');
        item.className = 'inventory-item';
        
        // Different styling for placed vs unplaced plants
        if (plant.placed) {
          item.classList.add('inventory-item-placed');
        }
        
        item.dataset.plantId = plant.id;

        const iconCanvas = document.createElement('canvas');
        iconCanvas.width = 48;
        iconCanvas.height = 48;
        iconCanvas.className = 'inventory-icon-canvas';
        if (plant.itemType === 'deco') {
          drawDecoIcon(iconCanvas, plant.plantType);
        } else {
          const stage = RARITY_TO_STAGE[plant.rarity] ?? plant.growthStage ?? 2;
          drawPlantIcon(iconCanvas, plant.plantType, stage);
        }

        // Add position indicator for placed plants
        if (plant.placed && plant.gridCol !== null && plant.gridRow !== null) {
          const positionBadge = document.createElement('div');
          positionBadge.className = 'position-badge';
          positionBadge.textContent = `${plant.gridCol},${plant.gridRow}`;
          item.appendChild(positionBadge);
        }

        const label = document.createElement('div');
        label.className = 'inventory-item-label';
        if (plant.itemType === 'deco') {
          const diffColor = DECO_DIFFICULTY[plant.plantType] === 'hard' ? '#E84545' : '#F5A623';
          label.innerHTML = `<span style="color:${diffColor};font-size:10px;font-weight:700;">${DECO_NAMES[plant.plantType] || plant.plantType}</span>`;
        } else {
          const rarityColor = RARITY_COLORS[plant.rarity] || '#8ED88E';
          const plantName = PLANT_NAMES_DE[plant.plantType] || plant.plantType;
          label.innerHTML = `<span style="color:${rarityColor};font-size:10px;font-weight:700;">${plantName}</span>`;
        }

        item.appendChild(iconCanvas);
        item.appendChild(label);

        item.addEventListener('click', () => {
          if (plant.placed) {
            // Show popup for placed plants with move/remove options
            showPlantInteractionPopup(plant, refresh, getPlacementMode, setPlacementMode, placementIndicator);
          } else {
            // Existing placement logic for unplaced plants
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
          }
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
      label.innerHTML = `<span style="color:${RARITY_COLORS[combo.rarity]};font-weight:600;">${PLANT_NAMES_DE[combo.type]}</span><br><span style="font-size:9px;color:#8A8A8A;">${RARITY_LABELS[combo.rarity]}</span>`;

      item.appendChild(iconCanvas);
      item.appendChild(label);
      col.appendChild(item);
    }
    collGrid.appendChild(col);
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
  decoGrid.className = 'collection-columns';

  for (const diff of ['medium', 'hard']) {
    const decos = ALL_DECOS.filter(d => DECO_DIFFICULTY[d.type] === diff);
    const col = document.createElement('div');
    col.className = 'collection-col';

    for (const deco of decos) {
      const owned = ownedDecoSet.has(deco.type);
      const item = document.createElement('div');
      item.className = `collection-item ${owned ? '' : 'locked'}`;
      item.style.borderColor = owned ? DIFF_COLORS[diff] : '#E0D8D0';

      const iconCanvas = document.createElement('canvas');
      iconCanvas.width = 48;
      iconCanvas.height = 48;
      drawDecoIcon(iconCanvas, deco.type);
      if (!owned) iconCanvas.style.filter = 'grayscale(1) opacity(0.3)';

      const label = document.createElement('div');
      label.className = 'collection-item-label';
      label.innerHTML = `<span style="color:${DIFF_COLORS[diff]};font-weight:600;">${deco.name}</span><br><span style="font-size:9px;color:#8A8A8A;">${DIFF_LABELS[diff]}</span>`;

      item.appendChild(iconCanvas);
      item.appendChild(label);
      col.appendChild(item);
    }
    decoGrid.appendChild(col);
  }
  collection.appendChild(decoGrid);

  return collection;
}

/**
 * Show interaction popup for placed plants
 * @param {Object} plant - Plant data object
 * @param {Function} refresh - Refresh inventory callback
 * @param {Function} getPlacementMode - Get current placement mode
 * @param {Function} setPlacementMode - Set placement mode
 * @param {HTMLElement} placementIndicator - Placement indicator element
 */
function showPlantInteractionPopup(plant, refresh, getPlacementMode, setPlacementMode, placementIndicator) {
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
        <span class="detail-icon">📍</span>
        <span class="detail-text">Position: ${plant.gridCol}, ${plant.gridRow}</span>
      </div>
      
      <div class="popup-detail">
        <span class="detail-icon">🏷️</span>
        <span class="detail-text">Gehört zu: ${escapeHtml(plant.habitName)}</span>
      </div>
      
      ${adoptionInfo}
      ${growthDisplay}
    </div>
    
    <div class="popup-actions">
      <button class="btn btn-secondary move-plant-btn" data-plant-id="${plant.id}">
        🔄 Verschieben
      </button>
      <button class="btn btn-danger remove-plant-btn" data-plant-id="${plant.id}">
        🗑️ Entfernen
      </button>
    </div>
  `;

  const { overlay, close } = createModal(html, { 
    extraClass: 'plant-interaction-popup',
    title: `${emoji} ${name}` 
  });
  
  // Move plant button
  overlay.querySelector('.move-plant-btn').addEventListener('click', async () => {
    // Enter move mode - like placement mode but for moving
    setPlacementMode({ ...plant, isMoving: true });
    placementIndicator.classList.remove('hidden');
    placementIndicator.querySelector('.placement-text').textContent = `${name} an neue Position verschieben`;
    close();
    refresh();
  });
  
  // Remove plant button
  overlay.querySelector('.remove-plant-btn').addEventListener('click', async () => {
    if (confirm(`${name} wirklich aus dem Garten entfernen?`)) {
      await gardenRepo.unplacePlant(plant.id);
      close();
      refresh();
    }
  });
}
