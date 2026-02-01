import { motion } from 'framer-motion';
import { Gamepad2, GraduationCap, BookOpen, LayoutGrid } from 'lucide-react';

interface CategoryCardProps {
    title: string;
    description: string;
    count: number;
    type: 'Spiele' | 'Üben' | 'Theorie' | 'Alle';
    onClick: () => void;
}

export function CategoryCard({ title, description, count, type, onClick }: CategoryCardProps) {
    const getIcon = () => {
        switch (type) {
            case 'Spiele': return <Gamepad2 size={32} className="text-purple-400" />;
            case 'Üben': return <GraduationCap size={32} className="text-cyan-400" />;
            case 'Theorie': return <BookOpen size={32} className="text-emerald-400" />;
            default: return <LayoutGrid size={32} className="text-slate-400" />;
        }
    };

    const getGradient = () => {
        switch (type) {
            case 'Spiele': return 'from-purple-500/20 to-purple-900/5 hover:border-purple-500/50';
            case 'Üben': return 'from-cyan-500/20 to-cyan-900/5 hover:border-cyan-500/50';
            case 'Theorie': return 'from-emerald-500/20 to-emerald-900/5 hover:border-emerald-500/50';
            default: return 'from-slate-800 to-slate-900 hover:border-slate-500/50';
        }
    };

    return (
        <motion.button
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`relative w-full text-left p-6 rounded-2xl border border-white/5 bg-gradient-to-br ${getGradient()} transition-all duration-300 group overflow-hidden`}
        >
            <div className="relative z-10 flex flex-col h-full justify-between gap-4">
                <div className="p-3 bg-white/5 rounded-xl w-fit backdrop-blur-sm border border-white/5 group-hover:border-white/10 transition-colors">
                    {getIcon()}
                </div>

                <div>
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-cyan-100 transition-colors">
                        {title}
                    </h3>
                    <p className="text-sm text-slate-400 line-clamp-2">
                        {description}
                    </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <span>{count} Apps</span>
                </div>
            </div>

            {/* Decorative gradient blob */}
            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 blur-3xl rounded-full group-hover:bg-white/10 transition-all duration-500" />
        </motion.button>
    );
}
