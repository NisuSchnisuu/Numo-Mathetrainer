export interface App {
  id: string;
  name: string;
  description: string;
  path: string;
  icon: string; // We'll use a string for now, maybe an emoji or a Lucide icon ID
  category: 'Spiele' | 'Üben' | 'Theorie';
  tags: string[];
}

export const apps: App[] = [
  {
    id: 'trio',
    name: 'Trio Mathespiel',
    description: 'Finde die passenden Zahlenkombinationen.',
    path: 'apps/Spiele/Trio-Mathespiel/index.html',
    icon: 'app-thumbnails/Trio-Thumbnail.webp', // Path relative to public (or base)
    category: 'Spiele',
    tags: ['Kopfrechnen', 'Zahlenverständnis', 'Kombinatorik'],
  },
];
