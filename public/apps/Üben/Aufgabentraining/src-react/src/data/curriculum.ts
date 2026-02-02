export interface Topic {
  id: string;
  title: string;
  description: string;
  cycle: 1 | 2;
  types: string[];
}

export interface Category {
  id: string;
  title: string;
  description: string;
  icon: string; // SVG string
  color: string;
  topics: Topic[];
}

export const curriculum: Category[] = [
    {
        id: 'numbers',
        title: 'Zahlen & Rechnen',
        description: 'Zahlenräume, Grundoperationen und Terme.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
        color: 'bg-blue-500/10 text-blue-500',
        topics: [
            {
                id: 'number_space',
                title: 'Zahlenräume',
                description: 'Orientierung bis 20, 100, 1000 und 1 Million.',
                cycle: 1,
                types: []
            },
            {
                id: 'arithmetic_basic',
                title: 'Kleine Rechnungen',
                description: 'Addition, Subtraktion und das Einmaleins.',
                cycle: 1,
                types: []
            },
            {
                id: 'fractions',
                title: 'Brüche & Dezimalzahlen',
                description: 'Brüche verstehen und mit Kommazahlen rechnen.',
                cycle: 2,
                types: []
            },
            {
                id: 'terms',
                title: 'Terme & Klammern',
                description: 'Rechnen mit Klammern und Rechenregeln.',
                cycle: 2,
                types: []
            }
        ]
    },
    {
        id: 'geometry',
        title: 'Form & Raum',
        description: 'Geometrische Formen, Winkel und Symmetrie.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400"><path d="M3 21l18 0"/><path d="M5 21l7 -18"/><path d="M19 21l-7 -18"/></svg>',
        color: 'bg-purple-500/10 text-purple-500',
        topics: [
            {
                id: 'shapes',
                title: 'Formen & Muster',
                description: 'Dreiecke, Vierecke und Kreise erkennen.',
                cycle: 1,
                types: []
            },
            {
                id: 'symmetry',
                title: 'Spiegeln & Symmetrie',
                description: 'Figuren spiegeln und Symmetrieachsen finden.',
                cycle: 1,
                types: []
            },
            {
                id: 'bodies',
                title: 'Körper & Raum',
                description: 'Würfel, Quader und Pläne lesen.',
                cycle: 2,
                types: []
            },
            {
                id: 'measurement_geo',
                title: 'Messen & Zeichnen',
                description: 'Umfang, Fläche und Winkel.',
                cycle: 2,
                types: []
            }
        ]
    },
    {
        id: 'quantities',
        title: 'Grössen & Sachrechnen',
        description: 'Geld, Zeit, Gewichte und Längen.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-400"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V8Z"/><path d="M4 22h16"/><path d="M2 13.5V5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v8.5"/></svg>',
        color: 'bg-orange-500/10 text-orange-500',
        topics: [
            {
                id: 'money_time',
                title: 'Geld & Zeit',
                description: 'Mit Franken rechnen und die Uhr lesen.',
                cycle: 1,
                types: []
            },
            {
                id: 'units',
                title: 'Masseinheiten',
                description: 'Längen, Gewichte und Hohlmasse.',
                cycle: 2,
                types: []
            },
            {
                id: 'stats',
                title: 'Daten & Zufall',
                description: 'Diagramme lesen und Wahrscheinlichkeiten.',
                cycle: 2,
                types: []
            }
        ]
    }
];
