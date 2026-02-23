# Architecture Review – Local Habits PWA

**Datum:** 2026-02-23  
**Codebase:** ~3.800 LOC (JS), Vanilla JS PWA, Dexie.js, GitHub Pages

## Zusammenfassung

Die Architektur ist für ein Lernprojekt / MVP erstaunlich sauber. Das Repository Pattern ist konsequent umgesetzt, die Modulaufteilung ist logisch, und es gibt keine zirkulären Abhängigkeiten. Das größte strukturelle Problem ist die **garden.js** (769 Zeilen), die View-Logik, State-Management, Canvas-Rendering und UI-Interaktion in einer einzigen `renderGarden()`-Funktion mischt. Ansonsten steht die App auf einem soliden Fundament.

---

## Stärken

### ✅ Sauberes Repository Pattern
`habitRepo.js` ist der **einzige** Datenzugriffspunkt. Kein View greift direkt auf Dexie zu. Das ist genau richtig und macht eine spätere Migration (z.B. REST API für Kollaboration v2) realistisch.

### ✅ Klare Modulstruktur
Die Aufteilung in `views/`, `utils/`, `repo/`, `garden/` ist intuitiv und folgt einer nachvollziehbaren Logik:
- Views rendern Screens
- Utils sind zustandslose Helfer
- Repo kapselt Datenzugriff
- Garden kapselt Pixel-Art

### ✅ Keine zirkulären Abhängigkeiten
Der Dependency Graph ist ein sauberer DAG:
```
app.js → router.js
       → views/* → habitRepo.js → utils/dates.js
                 → utils/*
                 → garden/*
```

### ✅ Guter Security-Ansatz
`escapeHtml()` wird konsequent bei User-Content eingesetzt. XSS-Prävention ist für ein Lernprojekt vorbildlich.

### ✅ Pragmatische DB-Migrationen
Die Dexie-Versionierung (v1→v7) mit Upgrade-Funktionen ist korrekt implementiert. Alte Migrations bleiben stehen – richtig so.

### ✅ Refactoring plantArt/decoArt
Die Auslagerung der Pixel-Art-Zeichenfunktionen war der richtige Schritt. `plantArt.js` und `decoArt.js` haben klare, getrennte Verantwortlichkeiten.

---

## Probleme (nach Priorität)

### 🔴 P1: garden.js ist eine God Function (769 LOC)

`renderGarden()` ist eine einzige ~600-Zeilen-Funktion, die **alles** macht:
- State initialisieren (placementMode, plantGrid, butterflies)
- Canvas einrichten und Seeded-Random berechnen
- Inventar rendern + Event Handling
- Collection/Pokédex UI bauen
- Animationsloop steuern
- Click-Handler mit Iso-Koordinaten-Umrechnung
- Tooltip-Management
- Reward-Popup anzeigen

**Warum problematisch:** Jedes neue Feature (z.B. Drag & Drop, Garten-Erweiterung, Jahreszeiten) macht diese Funktion noch länger. Lokale Variablen per Closure geteilt = schwer testbar, schwer zu debuggen.

**Empfehlung:** Nicht sofort umbauen, aber beim nächsten Garden-Feature in 3-4 Teile aufbrechen:
1. `gardenState.js` – Placement-State, Grid-Berechnung
2. `gardenRenderer.js` – Canvas-Draw-Loop, Butterfly-Animation
3. `gardenInventory.js` – Inventar-UI + Collection
4. `garden.js` – Orchestriert die Teile

### 🟡 P2: Service Worker Cache-First ohne Update-Mechanismus

```js
// Aktuell: Cache-first, kein Netzwerk-Update
cached || fetch(event.request)
```

**Problem:** Wenn die App im Cache liegt, sieht der User **nie** Updates – außer der SW-Versionsstring (`v27`) wird manuell hochgezählt. Und selbst dann muss der User die App 2× laden (install → activate → reload).

Das erklärt vermutlich die gestrigen Cache-Probleme.

**Empfehlung:** Stale-While-Revalidate für App-Assets:
```js
event.respondWith(
  caches.match(event.request).then(cached => {
    const fetchPromise = fetch(event.request).then(response => {
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
      return response;
    });
    return cached || fetchPromise;
  })
);
```
Plus: Update-Banner anzeigen wenn neuer SW aktiviert wird.

### 🟡 P3: View-Pattern Inkonsistenz

Die Views nutzen **zwei verschiedene Patterns**:

**Pattern A** (today.js, stats.js): Baut DOM imperativ mit `createElement`, hängt Events direkt an.

**Pattern B** (settings.js): Setzt `innerHTML` mit Template-String, sucht dann mit `querySelector` nach Elementen.

Beides funktioniert, aber die Mischung macht den Code unvorhersehbar. Für ein Lernprojekt akzeptabel, aber ein konsistentes Pattern würde die Views leichter erweiterbar machen.

### 🟡 P4: today.js hat zu viel Verantwortung

`today.js` (377 LOC) enthält:
- Habit-Card-Rendering mit inline Event Handling
- Progress-Bar-Update-Logik
- Weekly Focus Modal (rendern + speichern)
- FAB-Management mit MutationObserver
- All-Done-Check für Mega-Confetti

Die Weekly Focus Card + Modal gehört in eine eigene Datei (`weeklyFocus.js`). Die Habit Card Factory (`createHabitCard`) könnte in `components/habitCard.js` leben – der Ordner existiert laut CONCEPT.md sogar im geplanten Layout, wurde aber nie angelegt.

### 🟢 P5: Debug-Buttons in Produktion

`garden.js` enthält 3 Debug-Buttons (Test-Pflanze, Alle löschen, Test-Gemüse) und `today.js` hat einen Mega-Konfetti-Button. Diese sind im produktiven UI sichtbar.

**Empfehlung:** Hinter ein Flag verstecken:
```js
const DEBUG = localStorage.getItem('debug') === '1';
if (DEBUG) { /* debug buttons */ }
```

### 🟢 P6: localStorage als Settings-Store neben IndexedDB

Settings (Theme, Sound-Stil) leben in `localStorage`, während alle anderen Daten in IndexedDB sind. Das bedeutet:
- JSON-Export/Import sichert Settings **nicht** mit
- Zwei verschiedene Persistenz-Mechanismen

Für ein MVP kein echtes Problem, aber beim Thema Backup/Portabilität eine Lücke.

### 🟢 P7: Dexie via unpkg CDN-Import

```js
import Dexie from 'https://unpkg.com/dexie/dist/dexie.mjs';
```

Funktioniert, aber: kein Version-Pinning (kann breaken), und der SW muss Dexie separat cachen. Besser: `https://unpkg.com/dexie@4.0.11/dist/dexie.mjs` (oder lokal vendoren).

### 🟢 P8: Duplizierter Code in Reward-Popup

`showRewardPopup()` in garden.js baut Emoji-Mappings inline (`p.plantType === 'cherry' ? '🌸' : ...`) statt `PLANT_EMOJIS` aus plantArt.js zu verwenden. Kleine Inkonsistenz, aber zeigt Copy-Paste.

---

## Empfehlungen

| # | Was | Aufwand | Impact |
|---|-----|---------|--------|
| 1 | Dexie URL version-pinnen | 5 min | Verhindert CDN-Breakage |
| 2 | Debug-Buttons hinter Flag | 10 min | Sauberes Prod-UI |
| 3 | SW auf Stale-While-Revalidate | 30 min | Löst Cache-Update-Problem |
| 4 | Weekly Focus in eigene Datei | 30 min | today.js entlasten |
| 5 | garden.js aufbrechen | 2-3h | Beim nächsten Garden-Feature mitmachen |
| 6 | Reward-Popup Emoji-Fix | 5 min | `PLANT_EMOJIS` dict nutzen statt inline |

**Nicht empfohlen:**
- ❌ Framework einführen (React/Svelte) – kein Mehrwert für diese App-Größe, und es ist ein Lernprojekt
- ❌ State-Management-Library – zu wenig shared State
- ❌ Build-Step / Bundler – der Zero-Config-Workflow ist ein Feature, kein Bug
- ❌ Components-Abstraction-Layer – die App hat ~10 Views, kein Component-System nötig

---

## Fazit: **Punktuell verbessern** ✅

Die Architektur ist für ein MVP / Lernprojekt gut. Es gibt keinen Grund für einen großen Umbau. Die Datenschicht ist sauber, die Modulstruktur ist logisch, und die Abhängigkeiten fließen in die richtige Richtung.

**Prioritäten:**
1. Service Worker fixen (Cache-Strategie) – das ist das einzige Problem, das User direkt betrifft
2. Debug-Buttons verstecken – kosmetisch aber wichtig wenn andere die App nutzen
3. garden.js beim nächsten Feature mitaufbrechen – nicht proaktiv, sondern opportunistisch

Der Code liest sich gut, ist konsistent kommentiert, und die Entscheidung für Vanilla JS + kein Build-Step ist für den Anwendungszweck goldrichtig. Weiter so. 🌱
