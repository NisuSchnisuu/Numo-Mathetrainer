import { useState, useEffect } from 'react';
import { curriculum } from '../data/curriculum';

interface DashboardProps {
    onSelectTopic: (topicId: string) => void;
}

export function Dashboard({ onSelectTopic }: DashboardProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Sync Numo Back Button visibility with internal dashboard state
    useEffect(() => {
        const backLink = document.getElementById('numo-back-link');
        const installBtn = document.getElementById('btn-trigger-install');

        const isHomescreen = !selectedCategory && (!searchQuery || searchQuery.length <= 1);

        if (backLink) {
            // Only show on actual homescreen (categories)
            backLink.style.display = isHomescreen ? 'flex' : 'none';
        }

        if (installBtn) {
            // Only show on actual homescreen
            installBtn.style.display = isHomescreen ? 'inline-flex' : 'none';
        }
    }, [selectedCategory, searchQuery]);

    const activeCategory = curriculum.find(c => c.id === selectedCategory);

    // Search logic: flattened topics across all categories
    const allTopics = curriculum.flatMap(cat => 
        cat.topics.map(topic => ({ ...topic, categoryColor: cat.color }))
    );

    const filteredTopics = searchQuery.length > 0 
        ? allTopics.filter(t => 
            t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            t.description.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : [];

    return (
        <div className="w-full max-w-6xl mx-auto p-4 animate-fade-in">
            {/* Header */}
            <div className="mb-8 text-center relative">
                 {(selectedCategory || searchQuery) && (
                    <button 
                        onClick={() => {
                            setSelectedCategory(null);
                            setSearchQuery('');
                        }}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        <span className="sr-only">Zurück</span>
                    </button>
                )}
                <h1 className="text-3xl font-bold tracking-tight mb-2 pb-1 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    {searchQuery ? 'Suchergebnisse' : (activeCategory ? activeCategory.title : 'Übungsaufgaben')}
                </h1>
                <p className="text-muted-foreground">
                    {searchQuery 
                        ? `Gefundene Themen für "${searchQuery}"`
                        : (activeCategory 
                            ? 'Wähle ein Thema aus diesem Bereich.' 
                            : 'Wähle eine Kategorie, um unbegrenzt Aufgaben zu lösen.')}
                </p>

                {/* Install Button - ONLY on root dashboard */}
                {!selectedCategory && (!searchQuery || searchQuery.length <= 1) && (
                    <button 
                        id="btn-trigger-install"
                        className="mt-6 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all inline-flex items-center gap-2 group shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary group-hover:scale-110 transition-transform">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        <span>App installieren</span>
                    </button>
                )}
            </div>

            {/* Search Bar Section - Always visible when not in a specific category topic list */}
            {!selectedCategory && (
                <div className="flex flex-col items-center gap-4 mb-12">
                    <div className="relative w-full max-w-md group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground group-focus-within:text-primary transition-colors"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Nach Themen suchen (z.B. Terme)..."
                            className="block w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl leading-5 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all sm:text-sm"
                        />
                    </div>
                </div>
            )}

            {/* Content Area */}
            {searchQuery ? (
                // Search Results View
                <div className="space-y-6">
                    {filteredTopics.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredTopics.map(topic => (
                                <TopicCard 
                                    key={topic.id} 
                                    topic={topic} 
                                    colorClass={topic.categoryColor} 
                                    onClick={() => onSelectTopic(topic.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 glass-card rounded-xl border-dashed border-white/10">
                            <p className="text-muted-foreground italic">Keine Themen gefunden...</p>
                        </div>
                    )}
                </div>
            ) : !selectedCategory ? (
                // Category View
                <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {curriculum.map((cat, index) => (
                            <div 
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className="glass-card rounded-xl p-6 cursor-pointer transition-all duration-200 group"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${cat.color} bg-opacity-10 ring-1 ring-inset ring-white/5`}
                                         dangerouslySetInnerHTML={{ __html: cat.icon }} 
                                    />
                                    <div className="px-2 py-1 rounded-full bg-white/5 text-xs text-muted-foreground border border-white/5">
                                        {cat.topics.length} Themen
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold mb-1 text-foreground tracking-tight group-hover:text-primary transition-colors">{cat.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{cat.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                // Topics View
                (() => {
                    if (!activeCategory) return null;
                    return (
                    <div className="space-y-8">
                        {/* Cycle 1 */}
                        {activeCategory.topics.filter(t => t.cycle === 1).length > 0 && (
                            <div className="animate-fade-in">
                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                    Zyklus 1 <span className="text-muted-foreground font-normal text-sm ml-2">(1. – 2. Klasse)</span>
                                </h3>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {activeCategory.topics.filter(t => t.cycle === 1).map(topic => (
                                        <TopicCard 
                                            key={topic.id} 
                                            topic={topic} 
                                            colorClass={activeCategory.color} 
                                            onClick={() => onSelectTopic(topic.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Cycle 2 */}
                        {activeCategory.topics.filter(t => t.cycle === 2).length > 0 && (
                            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center justify-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                    Zyklus 2 <span className="text-muted-foreground font-normal text-sm ml-2">(3. – 6. Klasse)</span>
                                </h3>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {activeCategory.topics.filter(t => t.cycle === 2).map(topic => (
                                        <TopicCard 
                                            key={topic.id} 
                                            topic={topic} 
                                            colorClass={activeCategory.color} 
                                            onClick={() => onSelectTopic(topic.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    );
                })()
            )}
        </div>
    );
}

function TopicCard({ topic, colorClass, onClick }: { topic: any, colorClass: string, onClick: () => void }) {
    // Extract color name like 'bg-blue-500' from 'bg-blue-500/10 text-blue-500'
    const dotColor = colorClass.split(' ')[0].replace('/10', '');

    return (
        <div 
            onClick={onClick}
            className="glass-card rounded-xl p-6 cursor-pointer transition-all duration-200 group w-full sm:w-[calc(50%-1rem)] lg:w-[calc(33.33%-1rem)] min-w-[280px] max-w-[360px]"
        >
            <div className="mb-4">
                <div className={`h-1.5 w-10 rounded-full ${dotColor} mb-3 opacity-60 group-hover:opacity-100 transition-opacity`}></div>
            </div>
            <h3 className="text-lg font-semibold mb-1 text-foreground tracking-tight group-hover:text-primary transition-colors">{topic.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
        </div>
    );
}
