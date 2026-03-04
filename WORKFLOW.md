# WORKFLOW.md – Wie wir arbeiten

## Ablauf bei Änderungen

### 1. 💬 Diskutieren
- Was wollen wir ändern und warum?
- Wie setzen wir es um?
- Edge Cases, Bedenken, Alternativen besprechen
- Erst wenn wir uns einig sind → weiter

### 2. 🔨 Bauen
- Umsetzen was besprochen wurde
- Testen ob es funktioniert
- Nicht committen bevor es läuft

### 3. ✅ Committen
- Saubere Commit-Message (was + warum)
- Service Worker Cache bumpen
- Push

### 4. 🔍 Check
- Passt BACKLOG.md noch? (Erledigtes abhaken, Neues ergänzen)
- Passt CONCEPT.md noch?
- Ist Refactoring nötig? (Datei zu groß, duplizierter Code, etc.)
- Wenn ja → als nächsten Schritt planen, nicht sofort machen

## Transparenz

- **Berechtigungen:** Susanne wird IMMER informiert wenn ein Agent, Claude Code oder Tool erweiterte Berechtigungen bekommt
- **Installationen:** Nichts installieren ohne Bescheid (npm, brew, etc.)
- **Kosten:** Nichts das Geld kostet ohne Rückfrage
- **Claude Code:** Nutzt `--dangerously-skip-permissions` (= darf autonom Dateien schreiben im angegebenen Verzeichnis). Arbeitsverzeichnis immer benennen. Ergebnisse werden reviewed bevor committed wird.

## Sub-Agent-Regeln

- **Keine temporären Notiz-Dateien ins Repo committen** (concept.md, verification.md, etc.) – gehören nicht in den Code
- **`git diff` prüfen vor Commit** – keine Duplikate, keine unbeabsichtigten Änderungen
- **Jeder Sub-Agent-Commit wird reviewed** bevor er als "fertig" gemeldet wird

## Grundsätze

- **Kein Over-Engineering** – pragmatisch bleiben
- **Keine Schuldzuweisungen** – wir wollen nicht werten, es geht nie um Schuld
- **Debug-Buttons bleiben** bis Testing abgeschlossen
- **Kein `sed` auf CSS** – nie wieder
- **Vanilla JS** – kein Framework solange es ohne geht
