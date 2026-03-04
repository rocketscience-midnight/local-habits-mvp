# CONCEPT: Garden Plant Info Popup

**Goal:** Replace hover tooltip with click-activated popup for better UX, especially on mobile  
**Target File:** `garten.html`  
**Status:** Ready for implementation

## 🎯 Current State Analysis

### Current Tooltip System:
- **Trigger:** Mouse hover (`mousemove`, `mouseleave`)
- **Display:** Simple text overlay with `position: fixed`
- **Content:** `{emoji} {plant_name}` (e.g. "🥕 Möhre")
- **Issues:** No mobile support, limited information space

## 🚀 Proposed Popup System

### 1. **Trigger Change: Hover → Click**
```javascript
// Replace current hover handlers with click handlers
function handlePlantClick(e, canvas, bedIdx) {
  const { col, row } = getPlantCoordinates(e, canvas);
  const plant = beds[bedIdx][row][col];
  
  if (plant) {
    showPlantPopup(plant, col, row, bedIdx);
  } else {
    hidePlantPopup();
  }
}
```

### 2. **Enhanced Popup Design**
```css
.plant-popup {
  position: fixed;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #8BC48B;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  z-index: 1000;
  
  /* Mobile-friendly sizing */
  min-width: 280px;
  max-width: 90vw;
  
  /* Smooth animations */
  opacity: 0;
  transform: scale(0.8) translateY(10px);
  transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.plant-popup.show {
  opacity: 1;
  transform: scale(1) translateY(0);
}
```

### 3. **Rich Content Structure**
```html
<div class="plant-popup" id="plantPopup">
  <div class="popup-header">
    <span class="plant-emoji">🥕</span>
    <h3 class="plant-name">Möhre</h3>
    <button class="popup-close">×</button>
  </div>
  
  <div class="popup-body">
    <div class="plant-position">
      <span class="position-label">Position:</span>
      <span class="position-value">H1, C3/R1</span>
    </div>
    
    <div class="plant-info">
      <span class="info-label">Typ:</span>
      <span class="info-value">Mittelzehrer</span>
    </div>
    
    <!-- Optional: Additional plant data -->
    <div class="plant-season" data-optional>
      <span class="season-label">Saison:</span>
      <span class="season-value">Apr - Sep</span>
    </div>
  </div>
</div>
```

### 4. **Smart Positioning Logic**
```javascript
function positionPopup(popup, clickX, clickY) {
  const rect = popup.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  
  // Default: below and right of click
  let x = clickX + 12;
  let y = clickY + 12;
  
  // Adjust if popup would overflow viewport
  if (x + rect.width > viewportW - 20) {
    x = clickX - rect.width - 12; // Left of click
  }
  
  if (y + rect.height > viewportH - 20) {
    y = clickY - rect.height - 12; // Above click
  }
  
  popup.style.left = `${Math.max(10, x)}px`;
  popup.style.top = `${Math.max(10, y)}px`;
}
```

## 📋 Implementation Plan

### Phase 1: Basic Popup (Core Functionality)
- [ ] **Replace tooltip with popup container** in HTML
- [ ] **Update click handlers** to show/hide popup instead of plant placement
- [ ] **Separate plant placement** from info display (different click behavior)
- [ ] **Add popup CSS** with animations and mobile-friendly design

### Phase 2: Enhanced UX
- [ ] **Smart positioning** to avoid viewport overflow
- [ ] **Close button** and outside-click dismissal
- [ ] **Keyboard navigation** (ESC to close)
- [ ] **Touch-friendly** sizing and interactions

### Phase 3: Rich Content (Optional)
- [ ] **Plant metadata** integration (season, care tips, etc.)
- [ ] **Companion planting info** (which plants grow well together)
- [ ] **Growth status** visualization (if tracking time)

## 🔧 Technical Implementation Details

### Modified Click Behavior
```javascript
// Current: Single click does plant placement
// New: Need to distinguish between:
// 1. Click on EMPTY tile → Plant placement (if plant selected)
// 2. Click on EXISTING plant → Show info popup
// 3. Click with eraser selected → Remove plant

function handleCanvasClick(e, canvas, bedIdx) {
  const { col, row } = getPlantCoordinates(e, canvas);
  const existingPlant = beds[bedIdx][row][col];
  
  if (existingPlant) {
    // Show popup for existing plant
    showPlantPopup(existingPlant, col, row, bedIdx, e.clientX, e.clientY);
    return;
  }
  
  // Original plant placement logic
  if (selectedPlant) {
    beds[bedIdx][row][col] = selectedPlant;
    saveState();
  }
}
```

### Plant Data Enhancement
```javascript
// Extend PLANTS object with additional metadata
const PLANTS = {
  carrot: { 
    name: 'Möhre', 
    emoji: '🥕',
    type: 'Mittelzehrer',
    season: 'Apr - Sep',
    companions: ['onion', 'herbs'],
    water: 'medium'
  },
  // ... rest of plants
};
```

### Animation System
```css
/* Micro-interactions for polish */
.plant-popup {
  transform-origin: bottom left; /* Popup grows from click point */
}

.plant-emoji {
  display: inline-block;
  transition: transform 0.2s;
}

.plant-popup:hover .plant-emoji {
  transform: scale(1.1) rotate(5deg);
}

.popup-close {
  transition: background 0.15s;
}

.popup-close:hover {
  background: #ff6b6b;
  transform: scale(1.1);
}
```

## 🎨 Design Specifications

### **Visual Hierarchy:**
1. **Plant emoji** (32px, prominent)
2. **Plant name** (18px, bold, dark green)
3. **Position info** (14px, secondary color)
4. **Additional metadata** (12px, muted)

### **Color Scheme:**
- **Background:** Clean white with subtle gradient
- **Border:** Garden green (#8BC48B)
- **Text Primary:** Dark soil color (#3A2A1A)
- **Text Secondary:** Medium green (#5A8A5A)
- **Accent:** Bright plant green (#6BBF6B)

### **Spacing:**
- **Padding:** 16px for comfortable touch targets
- **Line height:** 1.4 for readability
- **Button size:** 44px minimum for mobile accessibility

## 🧪 Testing Checklist

### Functionality Tests:
- [ ] **Plant info displays** correctly for all plant types
- [ ] **Position coordinates** show accurate bed/row/column
- [ ] **Popup positions** correctly on all screen areas
- [ ] **Close behavior** works (button + outside click + ESC)

### Responsive Tests:
- [ ] **Mobile phones** (320px - 480px)
- [ ] **Tablets** (768px - 1024px)  
- [ ] **Desktop** (1200px+)
- [ ] **Landscape/portrait** orientation changes

### Accessibility Tests:
- [ ] **Keyboard navigation** (Tab, Enter, ESC)
- [ ] **Screen reader** compatibility
- [ ] **High contrast** mode
- [ ] **Touch target** sizing (44px minimum)

## ⚡ Performance Considerations

### Optimization Strategies:
1. **Popup DOM reuse** (single popup element, update content)
2. **CSS transitions** instead of JavaScript animations
3. **Event delegation** for efficient click handling
4. **Debounced positioning** for scroll/resize events

### Bundle Impact:
- **CSS increase:** ~2KB (popup styles + animations)
- **JS increase:** ~3KB (popup logic + positioning)
- **Total impact:** <5KB (minimal for feature richness)

## 🚀 Success Criteria

### Primary Goals:
✅ **Mobile-friendly** plant information access  
✅ **Enhanced UX** with rich content display  
✅ **Maintains** existing planting functionality  
✅ **Smooth animations** and professional polish  

### Secondary Goals:
✅ **Extensible** for future plant metadata  
✅ **Accessible** to screen readers and keyboard users  
✅ **Performance-conscious** implementation  

---

**Ready for implementation!** 🌱

*This concept maintains the garden's playful aesthetic while significantly improving information accessibility and mobile UX.*