import { useState } from 'react';
import { curriculum } from '../data/curriculum';

interface DashboardProps {
    onSelectTopic: (topicId: string) => void;
}

export function Dashboard({ onSelectTopic }: DashboardProps) {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    const activeCategory = curriculum.find(c => c.id === selectedCategory);

    return (
        <div className="w-full max-w-6xl mx-auto p-4 animate-fade-in">
            {/* Header */}
            <div className="mb-8 text-center relative">
                 {selectedCategory && (
                    <button 
                        onClick={() => setSelectedCategory(null)}
                        className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        <span className="sr-only">Zurück</span>
                    </button>
                )}
                <h1 className="text-3xl font-bold tracking-tight mb-2 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                    {activeCategory ? activeCategory.title : 'Übungsaufgaben'}
                </h1>
                <p className="text-muted-foreground">
                    {activeCategory 
                        ? 'Wähle ein Thema aus diesem Bereich.' 
                        : 'Wähle eine Kategorie, um unbegrenzt Aufgaben zu lösen.'}
                </p>
            </div>

            {/* Grid */}
            {!selectedCategory ? (
                // Category View
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
            ) : (
                // Topics View
                (() => {
                    if (!activeCategory) return null;
                    return (
                    <div className="space-y-8">
                        {/* Cycle 1 */}
                        {activeCategory.topics.filter(t => t.cycle === 1).length > 0 && (
                            <div className="animate-fade-in">
                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                    Zyklus 1 <span className="text-muted-foreground font-normal text-sm ml-2">(1. – 2. Klasse)</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                <h3 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-primary/60"></span>
                                    Zyklus 2 <span className="text-muted-foreground font-normal text-sm ml-2">(3. – 6. Klasse)</span>
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
            className="glass-card rounded-xl p-6 cursor-pointer transition-all duration-200 group"
        >
            <div className="mb-4">
                <div className={`h-1.5 w-10 rounded-full ${dotColor} mb-3 opacity-60 group-hover:opacity-100 transition-opacity`}></div>
            </div>
            <h3 className="text-lg font-semibold mb-1 text-foreground tracking-tight group-hover:text-primary transition-colors">{topic.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{topic.description}</p>
        </div>
    );
}
