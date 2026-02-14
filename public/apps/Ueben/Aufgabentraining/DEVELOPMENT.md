# Entwickler-Guide: Numo MatheTrainer

Dieser Guide erklärt die Struktur der App und wie man neue Übungen hinzufügt.

## 1. Architektur & Ordnerstruktur

Die App ist hierarchisch aufgebaut: **Kategorie** (Category) -> **Thema** (Topic) -> **Übung** (Exercise).

Der Quellcode befindet sich im Ordner `src-react/`.

```text
src-react/
└── src/
    ├── components/     # Globale UI-Komponenten (Dashboard, ExerciseList, etc.)
    ├── data/
    │   ├── curriculum.ts   # Definition der Kategorien & Themen (Statische Struktur)
    │   └── exercises.ts    # REGISTRY: Verknüpft Themen mit konkreten Übungen
    │
    └── exercises/      # Hier liegen die eigentlichen Spiele/Apps
        │
        ├── numbers/    # Kategorie-ID (z.B. Zahlen & Rechnen)
        │   ├── terms/  # Themen-ID (z.B. Terme & Klammern)
        │   │   ├── TermBaumeister.tsx  # Die konkrete Übung
        │   │   └── AnotherGame.tsx     # Eine weitere Übung im gleichen Thema
        │   │
        │   └── fractions/  # Anderes Thema
        │
        └── geometry/   # Andere Kategorie
            └── shapes/
```

---

## 2. Anleitung: Neue Übung hinzufügen

Um eine neue Übung (z.B. "Formen erkennen") hinzuzufügen, befolge diese 3 Schritte:

### Schritt 1: IDs identifizieren
Schaue in `src-react/src/data/curriculum.ts` nach, zu welcher Kategorie und welchem Thema die Übung gehört.
*   Beispiel Kategorie-ID: `geometry`
*   Beispiel Themen-ID: `shapes`

### Schritt 2: Komponente erstellen
Erstelle die Datei in der passenden Ordnerstruktur innerhalb von `src-react`.
**Pfad:** `src-react/src/exercises/geometry/shapes/ShapeGuesser.tsx`

Nutze dieses Template, damit die Navigation funktioniert:

```tsx
import { useState } from 'react';

// Jede Übung bekommt eine onBack prop, um zur Liste zurückzukehren
interface Props {
    onBack: () => void;
}

export function ShapeGuesser({ onBack }: Props) {
    // Dein State und Logik hier...

    return (
        <div className="w-full max-w-4xl mx-auto p-4 animate-fade-in relative">
            {/* ZURÜCK BUTTON (Wichtig!) */}
            <button 
                onClick={onBack} 
                className="absolute top-0 left-0 text-muted-foreground hover:text-white"
            >
                &larr; Zurück
            </button>

            <h1 className="text-2xl font-bold text-center mb-8">Formen erkennen</h1>
            
            <div className="glass-card p-6">
                <p>Hier kommt dein Spiel hin...</p>
            </div>
        </div>
    );
}
```

### Schritt 3: In der Registry eintragen
Öffne `src-react/src/data/exercises.ts`. Importiere deine neue Komponente und füge sie unter der entsprechenden **Themen-ID** (`shapes`) hinzu.

```typescript
import { ShapeGuesser } from '../exercises/geometry/shapes/ShapeGuesser';

export const exercises: Record<string, Exercise[]> = {
    // ... andere Themen ...

    'shapes': [
        {
            id: 'shape_guesser_1',          // Eindeutige ID für diese Übung
            title: 'Formen-Quiz',           // Angezeigter Titel
            description: 'Erkennst du alle Formen?', // Kurze Beschreibung
            component: ShapeGuesser         // Die Komponente (Referenz, nicht JSX!)
        }
    ],
    
    // ...
};
```

### Schritt 4: App bauen (Wichtig!)
Damit die Änderungen in der Numo-Hauptapp sichtbar werden, muss die App gebaut werden:
1. Gehe in den Ordner `src-react/`.
2. Führe `npm run build` aus.
Die Dateien werden automatisch in den Hauptordner der App exportiert.

---

## 3. Tech Stack

*   **Framework:** React 19 + TypeScript
*   **Build Tool:** Vite (konfiguriert für relativen Build in `src-react/vite.config.ts`)
*   **Styling:** Tailwind CSS v4 (konfiguriert in `src-react/src/index.css` via `@theme`)
*   **Icons:** Inline SVGs (um Abhängigkeiten klein zu halten)
