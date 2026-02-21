# Habits Garden – Konzept v1

## Vision
Eine PWA, die Habit-Tracking mit einem virtuellen Garten verbindet. Jede erledigte Gewohnheit lässt eine Pflanze wachsen. Konsistenz wird belohnt, Vernachlässigung sichtbar. Alles offline-fähig, keine Accounts, keine Cloud – deine Daten bleiben auf deinem Gerät.

---

## 1. Habit Tracker

### Habits anlegen
- Name + Emoji (z.B. "Meditation 🧘" / "Lesen 📚")
- Frequenz: täglich, bestimmte Wochentage, oder X-mal pro Woche
- Optionale Notiz/Beschreibung
- Kategorie (optional): Gesundheit, Lernen, Fitness, Achtsamkeit, Custom

### Tägliche Ansicht
- Heute-Screen als Startseite: alle fälligen Habits als Checkliste
- Abhaken mit satisfying Animation + Feedback (Confetti/Partikel bei Streak-Meilensteinen)
- Reihenfolge anpassbar (Drag & Drop)

### Tracking & Streaks
- 🔥 Aktuelle Streak pro Habit
- 🏆 Best Streak (all-time)
- Gesamte Completions
- Completion-Rate (%) letzte 7/30 Tage

### Habit Grid
- GitHub-Contribution-Style Heatmap pro Habit
- Farbe = Completion (grau → hellgrün → dunkelgrün)
- Letzte 12 Wochen auf einen Blick
- Tap auf Tag zeigt Details

---

## 2. Garten-System (Gamification)

### Kernmechanik
- Jeder Habit ist mit einer **Pflanze** verknüpft
- Habit erledigt → Pflanze bekommt Wasser/Sonnenlicht → wächst eine Stufe
- Habit verpasst → Pflanze welkt langsam (nach 2 Tagen sichtbar, nach 5 Tagen verwelkt)
- Verwelkte Pflanzen können durch erneute Streaks wiederbelebt werden

### Wachstumsstufen (5 Stufen)
1. 🌰 **Samen** (Tag 0 – Habit angelegt)
2. 🌱 **Sprössling** (3-Tage-Streak)
3. 🌿 **Jungpflanze** (7-Tage-Streak)
4. 🌸 **Blühend** (14-Tage-Streak)
5. 🌳 **Ausgewachsen** (30-Tage-Streak)

### Pflanzenarten
- Verschiedene Arten: Blumen, Büsche, Bäume, Sukkulenten, Pilze
- Art wird beim Anlegen des Habits zufällig oder gewählt
- Jede Art hat eigene Pixel-Art/SVG-Sprites für alle 5 Stufen
- Seltene Pflanzen als Belohnung für besondere Meilensteine (z.B. 100-Tage-Streak)

### Garten-View
- Isometrische oder Top-Down Gartenansicht
- Grid-basiert (z.B. 6×4 Felder)
- Jede Pflanze steht auf ihrem Feld
- Garten wächst mit → mehr Habits = größerer Garten
- Jahreszeiten-Effekte (optional): Hintergrund ändert sich mit echtem Datum

### Belohnungen
- 🎉 Meilenstein-Confetti (7, 14, 30, 100 Tage)
- 🌸 Neue Pflanzenart freischalten bei X Habits auf Stufe 5
- 🏅 Badges/Achievements (z.B. "Grüner Daumen" = 5 Pflanzen gleichzeitig blühend)

---

## 3. Navigation & Screens

### Tab-Navigation (Bottom Bar)
1. **Heute** – Tägliche Habit-Checkliste
2. **Garten** – Gartenansicht mit allen Pflanzen
3. **Statistiken** – Habit Grid, Streaks, Completion Rates
4. **Einstellungen** – Habits verwalten, Export/Import, Theme

### Flows
- App öffnen → Heute-Screen → Habits abhaken → Pflanze wächst (kurze Animation)
- Garten besuchen → Pflanzen anschauen → Tap auf Pflanze zeigt zugehörigen Habit + Stats
- Neuen Habit anlegen → Name, Emoji, Frequenz → Pflanze wählen → erscheint als Samen im Garten

---

## 4. Technische Architektur

### Stack
- **Framework:** Vue 3 (Composition API) + Vite
  - Lightweight, schnell, gute PWA-Unterstützung
  - Reactive State perfekt für UI-Updates
- **Styling:** CSS Custom Properties + Scoped Styles
  - Kein UI-Framework (zu heavy) → eigenes minimal Design System
- **Daten:** IndexedDB via Dexie.js
  - Strukturierte Daten (Habits, Completions, Garden State)
  - Performant auch bei vielen Einträgen
  - Besser als localStorage für komplexe Queries
- **Garten-Rendering:** SVG-basiert
  - Skalierbar, animierbar, lightweight
  - Jede Pflanze = SVG-Component mit Wachstumsstufen
- **PWA:** Vite PWA Plugin (vite-plugin-pwa)
  - Service Worker (Workbox)
  - Web App Manifest
  - Offline-first

### Datenmodell
```
Habit {
  id: string (uuid)
  name: string
  emoji: string
  frequency: 'daily' | 'weekly' | number[]  // Wochentage
  category?: string
  plantType: string
  createdAt: Date
  order: number
}

Completion {
  id: string
  habitId: string
  date: string (YYYY-MM-DD)
  completedAt: Date
}

GardenState {
  habitId: string
  growthStage: 1-5
  health: 'thriving' | 'okay' | 'wilting' | 'withered'
  position: { x: number, y: number }
}

Achievement {
  id: string
  type: string
  unlockedAt: Date
}
```

### Backup & Portabilität
- JSON-Export aller Daten (ein Klick)
- JSON-Import zum Wiederherstellen
- Optional: Clipboard-Copy als Schnell-Backup

---

## 5. Design-Richtung

### Stil
- **Pixel-Art** – Stardew Valley inspired, charmant und niedlich
- **Isometrische Garten-Perspektive**
- Sanfte Animationen (kein Overload)
- Mobile-first Design

### Farbpalette – Option A: "Naturalist" (realistisch/bunt)
- Background: #E8DCC8 (Sand)
- Gras: #5B8C3E (sattes Gras-Grün)
- Erde: #8B6914 (warmes Braun)
- Blumen: #E04040 (Rot), #F4A020 (Orange), #3A7BD5 (Kornblume)
- Himmel: #87CEEB (Hellblau)
- Holz/UI: #6B4226 (Dunkelholz)
- Text: #2D2D2D

### Farbpalette – Option B: "Dreamgarden" (pastell/bunt)
- Background: #FFF8F0 (cremiges Weiß)
- Gras: #A8D8A8 (Mintgrün)
- Erde: #D4A574 (helles Terracotta)
- Blumen: #F4A0B0 (Rosa), #B8A0D8 (Lavendel), #F8D480 (Butterblume)
- Himmel: #C8E0F4 (Babyblau)
- Holz/UI: #9B7B5B (helles Holz)
- Text: #4A4A4A

### Typography
- Clean Sans-Serif (z.B. Inter oder System Font Stack)
- Große, tappbare Elemente (mobile-first)

---

## 6. Scope v1 (MVP)

### Drin ✅
- Habits CRUD (anlegen, bearbeiten, löschen, sortieren)
- Tägliches Tracking mit Checkliste
- Streaks + Basic Stats
- Habit Grid (Heatmap)
- Garten mit 4-5 Pflanzenarten, 5 Wachstumsstufen
- Wachstum + Welken-Mechanik
- PWA (offline, installierbar)
- JSON Export/Import
- Mobile-first responsive Design

### Nicht in v1 ❌ (spätere Versionen)
- **Kollaboration / Multiplayer** (v2 – gemeinsamer Garten, Habitica-Style)
- Leaderboard / Social Features
- Push Notifications (braucht VAPID Setup)
- Tages-Tipps / Atomic Habits Zitate
- Jahreszeiten im Garten
- Sound-Effekte
- Cloud Sync (nötig für Kollaboration)
- Achievements/Badges (v1.1)

---

## Offene Fragen für Susanne

1. **Pflanzen-Stil:** Eher Pixel-Art (retro, charmant) oder illustrierte SVGs (modern, clean)? Oder hast du ein visuelles Vorbild?

2. **Garten-Perspektive:** Top-Down (einfacher, übersichtlich) oder isometrisch (hübscher, aufwändiger)?

3. **Farben:** Gefällt dir die warme Erdton-Palette, oder schwebt dir was anderes vor?

4. **Zielgerät:** Primär Handy, oder auch Desktop wichtig?
