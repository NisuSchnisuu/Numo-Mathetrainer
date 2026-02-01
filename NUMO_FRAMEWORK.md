# Numo Framework Dokumentation

Diese Datei dient als Referenz für KIs und Entwickler, um die Architektur des Numo Frameworks zu verstehen.

## Übersicht

Numo ist ein hybrides System bestehend aus:
1.  **Dashboard Shell**: Eine React-Anwendung (Vite), die als Navigation und Verwaltung dient.
2.  **Standalone Apps**: Unabhängige Web-Anwendungen (HTML/JS oder eigene Frameworks), die im `public/apps` Ordner liegen.

## App-Integration

Die Apps sind nicht fest in den React-Build integriert, sondern liegen als statische Dateien vor. Das Dashboard verlinkt lediglich auf diese Dateien.

### 1. App Registry
Alle verfügbaren Apps werden zentral in `src/data/apps.ts` definiert.

**Schema:**
```typescript
interface App {
  id: string;          // Eindeutige ID
  name: string;        // Anzeigename
  description: string; // Kurzbeschreibung für die Karte
  path: string;        // Relativer Pfad zur index.html in public/ (z.B. "apps/Kategorie/App/index.html")
  icon: string;        // Pfad zum Thumbnail in public/ (z.B. "app-thumbnails/icon.svg")
  category:Category;   // 'Spiele' | 'Üben' | 'Theorie'
  tags: string[];      // Tags für die Suche
}
```

### 2. Speicherort der Apps
-   Der Root-Ordner für Apps ist `public/apps/`.
-   Struktur: `public/apps/<Kategorie>/<App-Name>/`.
-   Jede App muss "völlig eigenständig" funktionieren (keine Abhängigkeiten zu `node_modules` des Root-Projekts).
-   Technologie-Agnostisch: Apps können in Vanilla JS, React, Vue, etc. geschrieben sein, solange sie kompiliert/lauffähig im Ordner liegen.

## Kategorien & Navigation

Die Kategorien sind fest im Typ-System verankert (`src/App.tsx` bzw. `src/data/apps.ts`).

-   **Verfügbare Kategorien**: `Spiele`, `Üben`, `Theorie`.
-   **Alle-Ansicht**: Zeigt alle Apps an, mit optionalen Filtern.
-   **Kategorie-Ansicht**: Filtert die Apps basierend auf dem `category` Feld.
-   **Routing**: Das Dashboard nutzt kein komplexes Routing für die Apps selbst. Ein Klick auf eine App-Karte öffnet den Link (`path`) in einem neuen Tab oder im gleichen Fenster (je nach Konfiguration in `AppCard.tsx`, aktuell `target="_blank"`).

## Design System

-   **CSS**: Tailwind CSS v4.
-   **Theme**: Dark Mode (Slate-950 Background).
-   **Shared Assets**: Apps können theoretisch auf Shared Assets in `public/` zugreifen, sollten aber idealerweise self-contained sein.
-   Die Shell nutzt `src/index.css` für globale Styles.

## Workflow für neue Apps

1.  Erstelle den App-Ordner in `public/apps/<Kategorie>/<Name>`.
2.  Implementiere die App (index.html, style.css, script.js).
3.  Erstelle ein Thumbnail/Icon in `public/app-thumbnails/`.
4.  Füge einen Eintrag in `src/data/apps.ts` hinzu.
