const curriculum = [
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

let currentCategory = null;

function renderDashboard() {
    const grid = document.getElementById('dashboard-grid');
    const headerTitle = document.getElementById('section-title');
    const headerDesc = document.getElementById('section-desc');
    const backBtn = document.getElementById('back-button');

    if (!grid) return;

    // Reset View
    grid.innerHTML = '';

    if (currentCategory === null) {
        // Render Main Categories
        if (headerTitle) headerTitle.textContent = 'Übungsaufgaben';
        if (headerDesc) headerDesc.textContent = 'Wähle eine Kategorie, um unbegrenzt Aufgaben zu lösen.';
        if (backBtn) backBtn.classList.add('hidden');

        // Use Grid Layout
        grid.className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";

        grid.innerHTML = curriculum.map((cat, index) => `
            <div class="glass-card rounded-xl p-6 cursor-pointer transition-all duration-200 animate-fade-in hover:scale-[1.02]" 
                 style="animation-delay: ${index * 50}ms" 
                 onclick="selectCategory('${cat.id}')">
                <div class="flex items-start justify-between mb-4">
                    <div class="p-3 rounded-lg ${cat.color} bg-opacity-10 ring-1 ring-inset ring-white/5">
                        ${cat.icon}
                    </div>
                    <div class="px-2 py-1 rounded-full bg-white/5 text-xs text-muted-foreground border border-white/5">
                        ${cat.topics.length} Themen
                    </div>
                </div>
                <h3 class="text-lg font-semibold mb-1 text-foreground tracking-tight">${cat.title}</h3>
                <p class="text-sm text-muted-foreground leading-relaxed">${cat.description}</p>
            </div>
        `).join('');
    } else {
        // Render Topics for Category
        const category = curriculum.find(c => c.id === currentCategory);
        if (!category) return;

        if (headerTitle) headerTitle.textContent = category.title;
        if (headerDesc) headerDesc.textContent = 'Wähle ein Thema aus diesem Bereich.';
        if (backBtn) backBtn.classList.remove('hidden');

        // Change from Grid to Column Layout for Sections
        grid.className = "space-y-8";

        const cycle1 = category.topics.filter(t => t.cycle === 1);
        const cycle2 = category.topics.filter(t => t.cycle === 2);

        grid.innerHTML = `
            ${cycle1.length > 0 ? `
                <div class="animate-fade-in">
                    <h3 class="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-primary/60"></span>
                        Zyklus 1 <span class="text-muted-foreground font-normal text-sm ml-2">(1. – 2. Klasse)</span>
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${renderTopicsList(cycle1, category.color)}
                    </div>
                </div>
            ` : ''}

            ${cycle2.length > 0 ? `
                <div class="animate-fade-in" style="animation-delay: 100ms">
                    <h3 class="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full bg-primary/60"></span>
                        Zyklus 2 <span class="text-muted-foreground font-normal text-sm ml-2">(3. – 6. Klasse)</span>
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${renderTopicsList(cycle2, category.color)}
                    </div>
                </div>
            ` : ''}
        `;
    }
}

function renderTopicsList(topicsLink, colorClass) {
    // colorClass e.g., 'bg-blue-500/10 text-blue-500' -> we want just the color name for the dot
    const dotColor = colorClass.split(' ')[0].replace('/10', '');

    return topicsLink.map((topic, index) => `
        <div class="glass-card rounded-xl p-6 cursor-pointer transition-all duration-200 hover:scale-[1.02]" 
             onclick="selectTopic('${topic.id}')">
            <div class="mb-4">
                <div class="h-1.5 w-10 rounded-full ${dotColor} mb-3 opacity-60"></div>
            </div>
            <h3 class="text-lg font-semibold mb-1 text-foreground tracking-tight">${topic.title}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">${topic.description}</p>
        </div>
    `).join('');
}

function selectCategory(id) {
    currentCategory = id;
    renderDashboard();
}

function goBack() {
    currentCategory = null;
    renderDashboard();
}

function selectTopic(id) {
    // Placeholder for next step (Exercise selection)
    alert(`Zeige Aufgaben für Thema: ${id}`);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if back button exists, if not create it dynamically for now or wait for HTML update
    renderDashboard();
});
