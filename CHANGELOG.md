# Changelog – Local Habits

## 2026-02-22

### Neue Features
- **4 Sound-Stile:** Pling, Xylophon, Tropfen, Glockenspiel – auswählbar in Einstellungen (Default: Glockenspiel)
- **Hilfe-Overlay (❓)** auf jedem Screen mit Erklärungen in warmem Prosa-Text
- **Starter-Inhalte** beim Onboarding: 2 Beispiel-Habits (Wasser trinken, Kalt duschen), 4 Beispiel-Aufgaben, 1 Orchidee im Inventar
- **Einmal-Aufgaben:** Neue Frequenz "Einmalig" – Task verschwindet nach Erledigung
- **3 Gemüse-Varianten** als Deko-Belohnung (Möhre, Karotte, Mohrrübe)
- **12 Pixel-Art Dekorationen:** Teich, Laterne, Bank, Vogelhaus, Gießkanne, Pilzkreis, Scheune, Fahrrad, Brunnen, Pavillon, Windmühle, Brücke

### Verbesserungen
- **Tabs umgestellt:** Aufgaben jetzt vor Statistiken
- **Checkboxen eckig** statt rund
- **Task-Checkbox reagiert sofort** – kein Warten mehr auf Animation
- **Sammlung:** Pflanzenname oben (bunt), Seltenheit unten (grau)
- **Inventar:** Zeigt jetzt Pflanzennamen statt nur Seltenheit
- **Weekly Streak zählt mit** wenn man on-track ist (nicht erst nach Wochenende)
- **Überfällig-Hinweis sanft:** Oranges "Offen seit X Tagen" statt roter Warn-Sektion
- **Deko-Animation** langsamer (3s statt instant)
- **"In Entwicklung"-Banner** entfernt

### Bugfixes
- **todayString() UTC-Bug:** Nutzte UTC statt lokale Zeit – hätte nach Mitternacht CET den falschen Tag geliefert
- **Pflanzen schweben nicht mehr** über ihren Kacheln
- **Sonnenblume** nicht mehr baumgroß in späten Wachstumsphasen
- **Legendäre Pflanzen** nicht mehr überproportional groß
- **Teich** sitzt jetzt auf dem Boden (schwebte vorher)
- **Bank** breiter und flacher (sah vorher wie Zaun aus)
- **Gießkanne** komplett grau (war irrtümlich grün)

### Code-Qualität
- **Refactoring:** garden.js aufgeteilt → plantArt.js (290 Z.) + decoArt.js (369 Z.)
- **Dead Code entfernt:** Unused imports, variables, console.logs
- **Architektur-Review** durchgeführt – Ergebnis: Struktur tragfähig, kein Framework nötig

### Cache
v8 → v27 (19 Bumps über den Tag)
