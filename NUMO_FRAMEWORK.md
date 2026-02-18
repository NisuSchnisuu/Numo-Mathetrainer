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
-   **Routing**: Das Dashboard verwendet URL-Parameter für Deep Linking zu Apps.
    -   Apps werden über `?app=<App-ID>` geöffnet (z.B. `/?app=bingo`).
    -   Beim Neuladen der Seite bleibt die aktive App erhalten.
    -   Browser-Navigation (Vor/Zurück) wird unterstützt.

## Design System

-   **CSS**: Tailwind CSS v4.
-   **Theme**: Dark Mode (Slate-950 Background).
-   **Shared Assets**: Apps can access shared assets in `public/`, but should prioritize being self-contained for offline support.
-   The Shell uses `src/index.css` for global styles.

## Sub-App Standards & Components

Um eine konsistente User Experience zu gewährleisten, müssen alle Unterapps folgende Komponenten und Logiken implementieren:

### 1. "Zurück zu Numo" Button (Back Link)
Jede App braucht einen Button oben links, um zur Haupt-App zurückzukehren.
-   **Styling**: Ein runder Button (`48x48px`), der beim Hovern auf `90px` Breite expandiert und einen Pfeil-Icon links vom Numo-Logo anzeigt. Hintergrund: `rgba(15, 23, 42, 0.6)` mit Backdrop-Filter Blur.
-   **Sichtbarkeit**:
    -   **Sichtbar**: Wenn die App im Browser oder innerhalb des Numo-Dashboards (iframe) läuft.
    -   **Versteckt**: Wenn die App als installierte PWA (Standalone) vom Homescreen gestartet wurde.
-   **Pfad**: Der Link sollte relativ zu `/` führen (meist `../../../`).

### 2. "App installieren" Button (PWA)
Unterapps sollten eigenständig installierbar sein (PWA).
-   **Styling**: Ein Button oben rechts (`top: 1.1rem; right: 1.1rem`).
-   **Sichtbarkeit**:
    -   **Anzeigen**: Nur im Browser (nicht standalone) und nur auf "Einstiegs-Screens" (Lobby/Dashboard). Sobald ein Spiel/Übung läuft, muss der Button ausgeblendet werden.
    -   **Versteckt**: Wenn die App bereits im Standalone-Modus läuft.
-   **Shell-Logik**: Wenn die App in einem iframe läuft, sollte ein Klick den direkten Link der App in einem neuen Tab öffnen (`?install=true`), damit dort die native Installation getriggert werden kann.

### 3. Technische Erkennung (Code-Snippet)
Apps sollten folgende Logik zur Erkennung der Umgebung nutzen:
```javascript
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
const isInIframe = window.parent !== window;

// Back-Button Logik: Verstecken nur wenn (Standalone UND NICHT im Iframe)
const shouldHideBack = isStandalone && !isInIframe;

// Install-Button Logik: Nur anzeigen wenn (NICHT Standalone ODER im Iframe)
const canShowInstall = !isStandalone || isInIframe;
```

## Workflow für neue Apps

1.  Erstelle den App-Ordner in `public/apps/<Kategorie>/<Name>`.
2.  Implementiere die App (index.html, style.css, script.js).
3.  **Wichtig**: Integriere die Back-Button und Install-Logik gemäß den Standards.
4.  Erstelle ein Thumbnail/Icon in `public/app-thumbnails/`.
5.  Füge einen Eintrag in `src/data/apps.ts` hinzu.
