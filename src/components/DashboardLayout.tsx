import type { ReactNode } from 'react';

export function DashboardLayout({ children }: { children: ReactNode }) {
    const rootPath = import.meta.env.DEV 
        ? import.meta.env.BASE_URL 
        : import.meta.env.BASE_URL.replace(/dashboard\/$/i, '');

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30 font-sans">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10" />

            <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={`${rootPath}numo-logo/Numo-logo-192x192.png`} alt="Numo Logo" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-lg tracking-tight text-white">Numo</span>
                    </div>
                    {/* 
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                    <a href="#" className="hover:text-white transition-colors">Dashboard</a>
                    <a href="#" className="hover:text-white transition-colors">Settings</a>
                </nav> 
                */}
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                {children}
            </main>
        </div>
    )
}
