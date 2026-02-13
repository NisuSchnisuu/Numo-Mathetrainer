import type { App } from '../data/apps';
import { motion } from 'framer-motion';
import { addRecentAppId } from '../utils/storage';

export function AppCard({ app, onLaunch }: { app: App; onLaunch?: (app: App) => void }) {
    // Use relative path '..' to go up from 'dashboard/' to root, then into 'apps/'
    // This works for both Dev (served from root) and Prod (structure: /dashboard and /apps)
    const fullPath = app.path.startsWith('http') ? app.path : `${import.meta.env.BASE_URL}../${app.path}`;
    const imagePath = `${import.meta.env.BASE_URL}${app.icon}`;

    const handleClick = (e: React.MouseEvent) => {
        addRecentAppId(app.id);
        if (onLaunch) {
            e.preventDefault();
            onLaunch(app);
        }
    };

    return (
        <a
            href={fullPath}
            className="block group decoration-0"
            onClick={handleClick}
        >
            <motion.div
                whileHover={{ y: -4, scale: 1.01 }}
                className="relative overflow-hidden rounded-2xl bg-slate-900/40 border border-white/5 p-5 flex flex-col items-center gap-4 transition-all hover:bg-slate-900/60 hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10"
            >
                {/* No background gradient, cleaner look */}

                {/* Logo - No container/border, raw image */}
                <div className="w-20 h-20 relative transition-transform group-hover:scale-105 duration-300">
                    <img
                        src={imagePath}
                        alt={app.name}
                        className="w-full h-full object-contain filter drop-shadow-lg"
                        style={{ filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.3))" }}
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNDc1NTY5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJMMiA3bDEwIDUgMTAtNS0xMC01ek0yIDE3bDExMCA1IDEwLTVNMiAxMmwxMCA1IDEwLTVWM2wzIDN2MThINS43NSIvPjwvc3ZnPg==';
                        }}
                    />
                </div>

                {/* Name */}
                <h3 className="text-lg font-bold text-slate-200 text-center tracking-tight group-hover:text-white transition-colors">
                    {app.name}
                </h3>

            </motion.div>
        </a>
    );
}
