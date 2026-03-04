# CONCEPT: Local Habits Garden Info Popup

**Project:** Local Habits PWA (boring-project)  
**Goal:** Replace info-footer with plant-click popup for better UX  
**Current Issue:** Info footer takes screen space + competes with inventory bar  
**Target:** Better mobile experience with contextual plant information  

## 🎯 Current System Analysis

### **Info Footer (buildInfoFooter in garden.js):**
```javascript
// Current: Shows plant details in footer when plant clicked
function showPlantDetails(plant) {
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
}
```

### **Current Canvas Click Logic (setupCanvasInteraction):**
```javascript
canvas.addEventListener('click', (e) => {
  // ...get coordinates...
  const plant = plantGrid[key];
  if (plant) {
    updateFooter.showPlantDetails(plant); // ← This needs to become popup
  } else {
    updateFooter.showGardenStats();
  }
});
```

### **Existing CSS Infrastructure:**
**Good News:** `.garden-tooltip` already exists in garden.css but unused!
```css
.garden-tooltip {
  position: absolute;
  background: rgba(255, 248, 240, 0.96);
  border: 2px solid #8B5CF6;
  border-radius: 12px;
  padding: 12px 16px;
  pointer-events: auto;
  z-index: 50;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translate(-50%, -100%);
  margin-top: -12px;
  /* ... existing styles ... */
}
```

## 🚀 Proposed Changes

### **1. Replace Footer with Popup System**

**Remove:**
- `buildInfoFooter()` function
- Info footer DOM element  
- Footer update calls

**Add:**
- Plant popup system at clicked position
- Contextual popup positioning 
- Enhanced plant information display

### **2. Modified Click Handler**
```javascript
canvas.addEventListener('click', (e) => {
  // ...get coordinates...
  const plant = plantGrid[key];
  
  if (plant) {
    // NEW: Show popup instead of footer
    showPlantPopup(plant, e.clientX, e.clientY);
  } else {
    // Close any existing popup
    hidePlantPopup();
  }
});
```

### **3. Plant Popup Implementation**
```javascript
let currentPopup = null;

function showPlantPopup(plant, screenX, screenY) {
  // Remove any existing popup
  hidePlantPopup();
  
  const popup = document.createElement('div');
  popup.className = 'plant-popup';
  popup.innerHTML = buildPlantPopupContent(plant);
  
  // Position popup near click point
  positionPopup(popup, screenX, screenY);
  
  // Add to garden canvas wrapper
  document.querySelector('.garden-canvas-wrap').appendChild(popup);
  
  // Show with animation
  requestAnimationFrame(() => popup.classList.add('show'));
  
  // Setup event handlers
  setupPopupHandlers(popup, plant);
  
  currentPopup = popup;
}

function hidePlantPopup() {
  if (currentPopup) {
    currentPopup.remove();
    currentPopup = null;
  }
}
```

### **4. Enhanced Popup Content**
```javascript
function buildPlantPopupContent(plant) {
  const isDeco = plant.itemType === 'deco';
  const emoji = isDeco ? (DECO_EMOJIS[plant.plantType] || '🎨') : (PLANT_EMOJIS[plant.plantType] || '🌿');
  const name = isDeco ? (DECO_NAMES[plant.plantType] || plant.plantType) : (PLANT_NAMES_DE[plant.plantType] || plant.plantType);
  const rarityColor = RARITY_COLORS[plant.rarity] || '#8ED88E';
  const rarityLabel = isDeco ? 'Dekoration' : (RARITY_LABELS[plant.rarity] || plant.rarity);
  
  // Growth visualization for plants
  const growthDisplay = plant.maxGrowth ? `
    <div class="popup-growth">
      <span class="growth-label">Wachstum:</span>
      <div class="growth-bar">
        <div class="growth-fill" style="width: ${(plant.totalGrowth / plant.maxGrowth) * 100}%"></div>
        <span class="growth-text">${plant.totalGrowth}/${plant.maxGrowth}</span>
      </div>
    </div>
  ` : '';
  
  return `
    <div class="popup-header">
      <span class="popup-emoji">${emoji}</span>
      <div class="popup-title">
        <h3 class="popup-name">${name}</h3>
        <span class="popup-rarity" style="color: ${rarityColor}">${rarityLabel}</span>
      </div>
      <button class="popup-close">×</button>
    </div>
    
    <div class="popup-body">
      <div class="popup-info">
        <div class="popup-detail">
          <span class="detail-icon">🏷️</span>
          <span class="detail-text">Gehört zu: ${escapeHtml(plant.habitName)}</span>
        </div>
        
        ${plant.isAdopted && plant.originalHabitName ? `
          <div class="popup-detail">
            <span class="detail-icon">🤝</span>
            <span class="detail-text">Adoptiert von: ${escapeHtml(plant.originalHabitName)}</span>
          </div>
        ` : ''}
        
        ${growthDisplay}
        
        <div class="popup-detail">
          <span class="detail-icon">📅</span>
          <span class="detail-text">Verdient in Woche: ${plant.weekEarned}</span>
        </div>
      </div>
      
      <div class="popup-actions">
        <button class="popup-remove-btn" data-plant-id="${plant.id}">
          🗑️ Aus Garten entfernen
        </button>
      </div>
    </div>
  `;
}
```

### **5. Smart Positioning System**
```javascript
function positionPopup(popup, screenX, screenY) {
  // Add popup to DOM temporarily to measure
  popup.style.visibility = 'hidden';
  document.body.appendChild(popup);
  const rect = popup.getBoundingClientRect();
  popup.remove();
  
  const canvasWrap = document.querySelector('.garden-canvas-wrap');
  const wrapRect = canvasWrap.getBoundingClientRect();
  
  // Convert screen coordinates to canvas wrapper relative coordinates
  let x = screenX - wrapRect.left;
  let y = screenY - wrapRect.top;
  
  // Popup positioning logic (within canvas wrapper)
  const buffer = 16;
  
  // Default: Above and centered on click point
  x = x - rect.width / 2;
  y = y - rect.height - buffer;
  
  // Adjust if popup would overflow wrapper bounds
  if (x < buffer) x = buffer;
  if (x + rect.width > wrapRect.width - buffer) x = wrapRect.width - rect.width - buffer;
  if (y < buffer) y = screenY + buffer; // Show below instead
  
  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
  popup.style.position = 'absolute';
}
```

## 🎨 Enhanced CSS (Update existing .garden-tooltip)

### **Popup Container:**
```css
.plant-popup {
  position: absolute;
  background: linear-gradient(135deg, #FFF8F0 0%, #F8F4F0 100%);
  border: 2px solid #8B5CF6;
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 100;
  min-width: 280px;
  max-width: 320px;
  
  /* Entry animation */
  opacity: 0;
  transform: scale(0.8) translateY(8px);
  transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
  
  /* Prevent canvas touch events */
  pointer-events: auto;
}

.plant-popup.show {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### **Header Section:**
```css
.popup-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
}

.popup-emoji {
  font-size: 32px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.popup-title {
  flex: 1;
}

.popup-name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #2D4A2D;
  line-height: 1.2;
}

.popup-rarity {
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.popup-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 50%;
  color: #8B5CF6;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.popup-close:hover {
  background: rgba(139, 92, 246, 0.2);
  transform: scale(1.1);
}
```

### **Body Section:**
```css
.popup-body {
  padding: 12px 20px 16px;
}

.popup-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.popup-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #5A5A5A;
}

.detail-icon {
  font-size: 16px;
  width: 20px;
  flex-shrink: 0;
}

.detail-text {
  line-height: 1.3;
}

/* Growth bar for plants */
.popup-growth {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.growth-label {
  font-size: 13px;
  font-weight: 600;
  color: #4A4A4A;
}

.growth-bar {
  position: relative;
  height: 20px;
  background: rgba(168, 216, 168, 0.3);
  border-radius: 10px;
  overflow: hidden;
}

.growth-fill {
  height: 100%;
  background: linear-gradient(90deg, #A8D8A8, #8BC48B);
  border-radius: 10px;
  transition: width 0.3s ease;
}

.growth-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 11px;
  font-weight: 600;
  color: #2D4A2D;
  text-shadow: 0 1px 2px rgba(255,255,255,0.8);
}

.popup-actions {
  border-top: 1px solid rgba(139, 92, 246, 0.1);
  padding-top: 12px;
}

.popup-remove-btn {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(232, 69, 69, 0.3);
  border-radius: 10px;
  background: rgba(232, 69, 69, 0.05);
  color: #E84545;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.popup-remove-btn:hover {
  background: rgba(232, 69, 69, 0.1);
  border-color: #E84545;
}
```

## 📋 Implementation Tasks

### **Phase 1: Core Popup System**
- [ ] **Remove info-footer** from garden.js and garden.css
- [ ] **Implement showPlantPopup()** with basic content
- [ ] **Update canvas click handler** to show popup instead of footer
- [ ] **Add popup positioning logic** within canvas wrapper
- [ ] **Style the popup** with enhanced CSS

### **Phase 2: UX Enhancements** 
- [ ] **Outside-click dismissal** (click canvas to close popup)
- [ ] **ESC key support** for keyboard users
- [ ] **Touch-friendly** button sizing and interactions
- [ ] **Animation polish** (smooth entry/exit)

### **Phase 3: Enhanced Content**
- [ ] **Growth bar visualization** for plants with maxGrowth
- [ ] **Rarity indicators** with colors and styling
- [ ] **Adoption info** display for adopted plants
- [ ] **Action confirmation** for plant removal

## 🎯 Success Criteria

### **Primary Goals:**
✅ **No bottom footer** competing with inventory bar  
✅ **Contextual plant information** at point of interest  
✅ **Mobile-friendly** touch interactions  
✅ **Maintains all current functionality** (plant removal, info display)  

### **Secondary Goals:**
✅ **Enhanced information display** with growth bars and icons  
✅ **Smooth animations** for professional feel  
✅ **Consistent design** with Local Habits visual system  
✅ **Performance-conscious** implementation  

## 🚧 Technical Considerations

### **Garden Layout Impact:**
- **More canvas space** without footer taking screen real estate
- **Inventory bar** becomes primary persistent UI element
- **Better mobile experience** with contextual popups

### **State Management:**
- **Single popup instance** (close previous when opening new)
- **No persistent DOM elements** (popups are ephemeral)
- **Canvas interaction preservation** (placement mode still works)

### **Performance:**
- **Popup DOM creation** only when needed (not pre-rendered)
- **CSS animations** instead of JavaScript for smoothness
- **Event listener cleanup** when popup removed

---

**Ready for Claude Code implementation!** 🚀

*This concept transforms the Local Habits garden from a traditional UI with footer info into a modern contextual popup system that maximizes screen space and improves mobile UX.*