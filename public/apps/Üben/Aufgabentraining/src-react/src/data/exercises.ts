import type { ComponentType } from 'react';
import { TermBaumeister } from '../exercises/numbers/terms/TermBaumeister';
import { TermBerechnen } from '../exercises/numbers/terms/TermBerechnen';

// Definition einer Übung
export interface Exercise {
    id: string;
    title: string;
    description: string;
    component: ComponentType<{ onBack: () => void }>;
}

// Map: Topic ID -> Liste von Übungen
export const exercises: Record<string, Exercise[]> = {
    'terms': [
        {
            id: 'term_calc_1',
            title: 'Term-Baumeister',
            description: 'Übe das Rechnen mit Punkt-vor-Strich und Klammern in verschiedenen Schwierigkeitsstufen.',
            component: TermBaumeister
        },
        {
            id: 'term_calc_2',
            title: 'Terme berechnen',
            description: 'Berechne das Ergebnis der angezeigten Terme mit Punkt-vor-Strich und Klammern.',
            component: TermBerechnen
        },
        // Hier können später einfach weitere Übungen hinzugefügt werden:
        // {
        //     id: 'term_calc_2',
        //     title: 'Lückenfüller',
        //     description: 'Finde die fehlende Zahl in der Gleichung.',
        //     component: GapFillGame
        // }
    ],
    // Platzhalter für andere Themen, damit die App nicht abstürzt
    'number_space': [],
    'arithmetic_basic': [],
    'fractions': [],
    'shapes': [],
    'symmetry': [],
    'bodies': [],
    'measurement_geo': [],
    'money_time': [],
    'units': [],
    'stats': []
};
