import type { App } from '../data/apps';
import { motion } from 'framer-motion';
import { Brain, Calculator, Gamepad2, GraduationCap } from 'lucide-react';

const iconMap: Record<string, any> = {
    Calculator: Calculator,
    Game: Gamepad2,
    Learn: GraduationCap,
    Brain: Brain
};

export function AppCard({ app }: { app: App }) {
    const Icon = iconMap[app.icon] || Brain;
    const fullPath = `${import.meta.env.BASE_URL}${app.path}`;

    return (
        <a href={fullPath} target="_blank" rel="noopener noreferrer" className="block group decoration-0">
            <motion.div
                whileHover={{ y: -5 }}
                className="relative h-full overflow-hidden rounded-xl bg-slate-900/50 border border-white/10 p-6 shadow-xl transition-all hover:shadow-cyan-500/10 hover:border-cyan-500/50"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:text-cyan-300 transition-colors shadow-inner ring-1 ring-white/5">
                            <Icon size={24} />
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/5 text-slate-400 border border-white/5">
                            {app.category}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">{app.name}</h3>
                    <p className="text-slate-400 text-sm mb-6 line-clamp-2 leading-relaxed">{app.description}</p>

                    <div className="flex flex-wrap gap-2">
                        {app.tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-1 rounded-md bg-slate-950 text-slate-500 border border-white/5">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            </motion.div>
        </a>
    );
}
