import { useState, useMemo } from 'react';
import { apps } from './data/apps';
import { DashboardLayout } from './components/DashboardLayout';
import { AppCard } from './components/AppCard';
import { Search, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = ['Alle', 'Spiele', 'Üben', 'Theorie'] as const;
type Category = typeof categories[number];

function App() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('Alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Extract all unique tags
  const allTags = useMemo(() => Array.from(new Set(apps.flatMap(app => app.tags))), []);

  const filteredApps = apps.filter(app => {
    const matchesCategory = selectedCategory === 'Alle' || app.category === selectedCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => app.tags.includes(tag));

    return matchesCategory && matchesSearch && matchesTags;
  });

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header Section */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">
            Deine Lernumgebung
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Wähle eine App aus, um zu starten. Filter nach Themen oder Kategorien, um genau das zu finden, was du brauchst.
          </p>
        </div>

        {/* Filters & Search */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Category Tabs */}
            <div className="flex p-1 bg-slate-900/50 border border-white/5 rounded-xl backdrop-blur-sm self-start">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${selectedCategory === category
                      ? 'bg-cyan-500/10 text-cyan-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Search Bar */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Suche..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-2">Filter:</span>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${selectedTags.includes(tag)
                      ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/25'
                      : 'bg-slate-900/50 text-slate-400 border-white/10 hover:border-cyan-500/30 hover:text-cyan-400'
                    }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Apps Grid */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredApps.map(app => (
              <motion.div
                key={app.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <AppCard app={app} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filteredApps.length === 0 && (
          <div className="text-center py-20">
            <div className="bg-slate-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
              <Command className="text-slate-600" size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-300">Keine Apps gefunden</h3>
            <p className="text-slate-500">Versuche andere Filter oder Suchbegriffe.</p>
          </div>
        )}

      </div>
    </DashboardLayout>
  )
}

export default App
