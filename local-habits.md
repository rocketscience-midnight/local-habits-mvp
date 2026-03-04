# Local Habits – Projektgedächtnis

## Projekt-Info
- **Repo:** github.com/rocketscience-midnight/local-habits-mvp
- **Lokal:** ~/workspace/projects/susanne/boring-project (OpenClaw Workspace)
- **Tech:** Vanilla JS PWA, Dexie.js (IndexedDB), GitHub Pages
- **Stil:** Pixel-Art Stardew Valley, Pastell "Dreamgarden"
- **Projekt-Dateien:** BACKLOG.md, WORKFLOW.md, ARCH-REVIEW.md, SECURITY.md (alle lokal)

## UI-Entscheidungen
- Debug-Buttons per Default AN (solange Testphase)
- Pixel-Art > Emojis für Dekorationen
- Clean UI: kein Edit-Button bei Habits, Long-Press reicht
- Emojis sparsam (nur Section-Header, nicht auf jedem Item)
- Low arousal UI, kein bold/strong in Fließtexten
- Feierabend-Divider muss breit bleiben (mentales Umschalten)
- FAB bleibt oben rechts
- Erledigte Items nur leicht abblassen (nicht zu stark)
- Lieblingstheme: Sakura 🌸 (Pink/Magenta Dark)
- Garten-Canvas immer hell (auch bei Dark-Themes)
- Themes: Dreamgarden (light), Dunkel, Sakura (Midnightsky gelöscht)

## Technische Lektionen
- Service Worker Cache-First verursacht Probleme bei großen Refactorings (neue Dateien → 404)
- Kein `sed` auf CSS (hat alle `}` gelöscht, passierte 2x)
- Claude Code Agent hängt manchmal → bei Timeout killen und neu starten
- Refactoring-Agents: Ergebnis IMMER reviewen bevor Commit
