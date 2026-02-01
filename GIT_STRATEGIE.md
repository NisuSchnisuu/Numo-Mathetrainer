# Git Konfiguration für Numo Dashboard

Auf deine Frage, was am sinnvollsten ist:

## Empfehlung: Monorepo (Ein großes Repository)
Ich empfehle **ein einziges Git-Repository** für den gesamten `numo-repo` Ordner.

### Vorteile:
- **Einfachheit**: Du musst nicht mit mehreren Repositories jonglieren. Ein `git push` sichert alles.
- **Konsistenz**: Änderungen am Dashboard und an App-Verlinkungen passieren gleichzeitig.
- **Unabhängigkeit**: Die Apps sind trotzdem in ihren eigenen Ordnern (`/Trio-Mathespiel`) getrennt und können unabhängig bearbeitet werden. Du kannst innerhalb von `Trio` arbeiten, ohne das Dashboard anzufassen.

### Umsetzung:
1. Initialize Git im Hauptordner: `git init`
2. Erstelle eine `.gitignore` im Hauptordner (bereits erstellt durch das Setup), die `node_modules` etc. ignoriert.
3. Commit: `git add .` und `git commit -m "Initial Dashboard setup"`.

## Alternative: Git Submodules
Nur sinnvoll, wenn du z.B. das "Trio-Mathespiel" auch komplett isoliert in einem *anderen* Projekt nutzen willst oder es von einem anderen Team entwickelt wird. Das ist aber deutlich komplexer zu verwalten.
