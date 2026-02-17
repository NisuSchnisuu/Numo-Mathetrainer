import { useState, useMemo, useEffect, useCallback } from 'react';
import { apps, type App as AppType } from './data/apps';
import { DashboardLayout } from './components/DashboardLayout';
import { AppCard } from './components/AppCard';
import { CategoryCard } from './components/CategoryCard';
import { getRecentAppIds } from './utils/storage';
import { Search, Command, ArrowLeft, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const categories = ['Alle', 'Spiele', 'Üben', 'Theorie'] as const;
type Category = typeof categories[number];
type ViewMode = 'HOME' | 'APP_LIST';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('HOME');
  const [selectedCategory, setSelectedCategory] = useState<Category>('Alle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [recentApps, setRecentApps] = useState<string[]>([]);
  const [activeApp, setActiveApp] = useState<AppType | null>(null);

  // Load active app from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const appId = params.get('app');
    if (appId) {
      const app = apps.find(a => a.id === appId);
      if (app) {
        setActiveApp(app);
      }
    }
  }, []);

  const handleLaunchApp = useCallback((app: AppType) => {
    setActiveApp(app);
    const url = new URL(window.location.href);
    url.searchParams.set('app', app.id);
    window.history.pushState({ appId: app.id }, '', url);
  }, []);

  const handleCloseApp = useCallback(() => {
    setActiveApp(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('app');
    window.history.pushState({}, '', url);
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const appId = params.get('app');

      if (appId) {
        const app = apps.find(a => a.id === appId);
        if (app) setActiveApp(app);
      } else {
        setActiveApp(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Load recent apps on mount and when view changes to HOME
  useEffect(() => {
    if (viewMode === 'HOME') {
      setRecentApps(getRecentAppIds());
    }
  }, [viewMode]);

  // Listen for messages from sub-apps (e.g., to close the app)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data === 'numo-back-to-home') {
        handleCloseApp();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleCloseApp]);

  // Listen for escape key to close app
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeApp) {
        handleCloseApp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeApp, handleCloseApp]);

  // Extract all unique tags
  const allTags = useMemo(() => Array.from(new Set(apps.flatMap(app => app.tags))), []);

  const filteredApps = apps.filter(app => {
    const matchesCategory = selectedCategory === 'Alle' || app.category === selectedCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => app.tags.includes(tag));

    return matchesCategory && matchesSearch && matchesTags;
  });

  const recentAppObjects = useMemo(() => {
    return recentApps
      .map(id => apps.find(a => a.id === id))
      .filter((a): a is typeof apps[0] => !!a);
  }, [recentApps]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleCategoryClick = (category: Category) => {
    setSelectedCategory(category);
    setViewMode('APP_LIST');
    setSearchQuery('');
    setSelectedTags([]);
  };

  const handleBackToHome = () => {
    setViewMode('HOME');
    setSelectedCategory('Alle');
  };

  const getCategoryDescription = (cat: Category) => {
    switch (cat) {
      case 'Spiele': return 'Lerne spielerisch mit interaktiven Games.';
      case 'Üben': return 'Gezieltes Training für deine Mathe-Skills.';
      case 'Theorie': return 'Nachschlagewerke und Erklärungen.';
      default: return 'Alle verfügbaren Apps auf einen Blick.';
    }
  };

  const getCategoryCount = (cat: Category) => {
    if (cat === 'Alle') return apps.length;
    return apps.filter(a => a.category === cat).length;
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 min-h-[80vh]">

        {/* Header Section */}
        <div className="space-y-4 pt-4 pb-2">
          {viewMode === 'APP_LIST' && (
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-2 text-sm font-medium"
            >
              <ArrowLeft size={16} /> Zurück zur Übersicht
            </button>
          )}
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-tight py-1">
            {viewMode === 'HOME' ? 'Deine Lernumgebung' : `${selectedCategory}`}
          </h1>
          <p className="text-slate-400 text-base max-w-2xl">
            {viewMode === 'HOME'
              ? 'Wähle einen Bereich aus, um zu starten.'
              : getCategoryDescription(selectedCategory)}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {viewMode === 'HOME' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Category Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(['Spiele', 'Üben', 'Theorie', 'Alle'] as const).map((cat) => (
                  <CategoryCard
                    key={cat}
                    title={cat}
                    description={getCategoryDescription(cat)}
                    count={getCategoryCount(cat)}
                    type={cat}
                    onClick={() => handleCategoryClick(cat)}
                  />
                ))}
              </div>

              {/* Recently Used Section */}
              {recentAppObjects.length > 0 && (
                <div className="space-y-6 pt-8 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-900 rounded-lg border border-white/5">
                      <Clock size={20} className="text-cyan-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Zuletzt verwendet</h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {recentAppObjects.map(app => (
                      <AppCard key={`recent-${app.id}`} app={app} onLaunch={handleLaunchApp} />
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="app-list"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              {/* Filters & Search */}
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Category Tabs - Only show if we act as "Alle" filter or if we want to allow switching. 
                      User requested: "within individual areas... no filters needed. Only in area Alle." 
                  */}
                  {selectedCategory === 'Alle' && (
                    <div className="flex p-1 bg-slate-900/50 border border-white/5 rounded-xl backdrop-blur-sm self-start overflow-x-auto max-w-full">
                      {categories.map(category => (
                        <button
                          key={category}
                          onClick={() => setSelectedCategory(category)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap ${selectedCategory === category
                            ? 'bg-cyan-500/10 text-cyan-400 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}

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
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      <AppCard app={app} onLaunch={handleLaunchApp} />
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* App Viewer Overlay */}
      <AnimatePresence>
        {activeApp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950 flex flex-col"
          >
            <iframe
              src={activeApp.path.startsWith('http')
                ? activeApp.path
                : `${import.meta.env.DEV ? import.meta.env.BASE_URL : import.meta.env.BASE_URL.replace(/dashboard\/$/i, '')}${activeApp.path}`}
              className="w-full h-full border-none"
              title={activeApp.name}
              onLoad={(e) => {
                try {
                  const iframe = e.currentTarget;
                  const currentPath = iframe.contentWindow?.location.pathname;

                  // Normalize paths for comparison
                  const normalize = (p: string | undefined) => p?.replace(/\/+$/, '') || '';
                  const normalizedCurrent = normalize(currentPath);
                  const normalizedRoot = normalize(import.meta.env.BASE_URL);

                  // Only close if we are EXACTLY at root or root/index.html
                  if (normalizedCurrent === normalizedRoot || normalizedCurrent === normalizedRoot + '/index.html') {
                    // Check if it's the INITIAL load of the iframe (first time onLoad triggers)
                    // If we just launched it, normalizedCurrent might match normalizedRoot if path is empty
                    // But activeApp.path is usually "apps/..."
                    if (!activeApp.path.includes('index.html') && normalizedCurrent === normalizedRoot) {
                      // This might be a false positive on some servers. 
                      // Let's rely more on the postMessage for explicit "Back" clicks.
                    } else if (normalizedCurrent === normalizedRoot) {
                      handleCloseApp();
                    }
                  }
                } catch (err) {
                  console.debug('Iframe path check failed:', err);
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  )
}

export default App
