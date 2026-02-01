const exercises = [
    {
        id: 'addition',
        title: 'Addition',
        description: 'Addiere Zahlen im Kopf oder schriftlich.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
        color: 'bg-blue-500/10 text-blue-500'
    },
    {
        id: 'subtraction',
        title: 'Subtraktion',
        description: 'Subtrahiere Zahlen und übe den Zehnerübergang.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400"><path d="M5 12h14"/></svg>',
        color: 'bg-red-500/10 text-red-500'
    },
    {
        id: 'multiplication',
        title: 'Multiplikation',
        description: 'Das kleine und große Einmaleins.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-400"><path d="m18 6-12 12"/><path d="m6 6 12 12"/></svg>',
        color: 'bg-green-500/10 text-green-500'
    },
    {
        id: 'division',
        title: 'Division',
        description: 'Teile Zahlen mit und ohne Rest.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-yellow-400"><circle cx="12" cy="6" r="1"/><path d="M5 12h14"/><circle cx="12" cy="18" r="1"/></svg>',
        color: 'bg-yellow-500/10 text-yellow-500'
    },
    {
        id: 'geometry',
        title: 'Geometrie',
        description: 'Formen, Winkel und Körper erkennen.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-purple-400"><path d="M3 21l18 0"/><path d="M5 21l7 -18"/><path d="M19 21l-7 -18"/></svg>',
        color: 'bg-purple-500/10 text-purple-500'
    },
    {
        id: 'units',
        title: 'Maßeinheiten',
        description: 'Rechnen mit Gewicht, Länge und Zeit.',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-orange-400"><path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V8Z"/><path d="M4 22h16"/><path d="M2 13.5V5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v8.5"/></svg>',
        color: 'bg-orange-500/10 text-orange-500'
    }
];

function renderDashboard() {
    const grid = document.getElementById('dashboard-grid');
    if (!grid) return;

    grid.innerHTML = exercises.map((ex, index) => `
        <div class="glass-card rounded-xl p-6 cursor-pointer transition-all duration-200 animate-fade-in" style="animation-delay: ${index * 50}ms" onclick="startExercise('${ex.id}')">
            <div class="flex items-start justify-between mb-4">
                <div class="p-3 rounded-lg ${ex.color} bg-opacity-10 ring-1 ring-inset ring-white/5">
                    ${ex.icon}
                </div>
                <div class="px-2 py-1 rounded-full bg-white/5 text-xs text-muted-foreground border border-white/5">
                    Unbegrenzt
                </div>
            </div>
            <h3 class="text-lg font-semibold mb-1 text-foreground tracking-tight">${ex.title}</h3>
            <p class="text-sm text-muted-foreground leading-relaxed">${ex.description}</p>
        </div>
    `).join('');
}

function startExercise(id) {
    // Placeholder for navigation
    // console.log('Starting exercise:', id);
    // In a real standalone app, this would change the view or load a new page
    alert(`Starte Übung: ${id}\nHier würde das Übungs-Interface laden.`);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
});
