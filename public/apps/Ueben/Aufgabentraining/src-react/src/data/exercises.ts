import type { ComponentType } from 'react';
import { TermBaumeister } from '../exercises/numbers/terms/TermBaumeister';
import { TermBerechnen } from '../exercises/numbers/terms/TermBerechnen';
import { OperatorEinsetzen } from '../exercises/numbers/terms/OperatorEinsetzen';
import { TextaufgabenTerme } from '../exercises/numbers/terms/TextaufgabenTerme';

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
        {
            id: 'term_calc_3',
            title: 'Rechenzeichen einsetzen',
            description: 'Setze die richtigen Operatoren und Klammern ein, um das Ziel zu erreichen.',
            component: OperatorEinsetzen
        },
        {
            id: 'term_calc_4',
            title: 'Textaufgaben',
            description: 'Lies die Textaufgabe und baue den passenden mathematischen Term dazu.',
            component: TextaufgabenTerme
        }
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
