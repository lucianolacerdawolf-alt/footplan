const RIVALRY_MAP = new Map<string, Set<string>>();
const DERBY_NAMES = new Map<string, string>();

function register(a: string, b: string, name?: string): void {
  if (!RIVALRY_MAP.has(a)) RIVALRY_MAP.set(a, new Set());
  if (!RIVALRY_MAP.has(b)) RIVALRY_MAP.set(b, new Set());
  RIVALRY_MAP.get(a)!.add(b);
  RIVALRY_MAP.get(b)!.add(a);
  if (name) {
    DERBY_NAMES.set(`${a}:${b}`, name);
    DERBY_NAMES.set(`${b}:${a}`, name);
  }
}

// Premier League
register('pl-t0', 'pl-mu', 'Arsenal × United');
register('pl-mu', 'pl-t1', 'North-West Derby');
register('pl-t0', 'pl-ch', 'London Derby');
register('pl-ch', 'pl-t1', 'Chelsea × Liverpool');
register('pl-mu', 'pl-t3', 'Manchester Derby');
register('pl-t1', 'pl-ev', 'Merseyside Derby');
register('pl-t0', 'pl-th', 'North London Derby');

// La Liga
register('laliga-t0', 'laliga-t1', 'El Clásico');
register('laliga-t2', 'laliga-t1', 'Atlético × Barça');
register('laliga-t0', 'laliga-t2', 'Derbi Madrileño');

// Bundesliga
register('bundesliga-t0', 'bundesliga-t1', 'Der Klassiker');

// Serie A
register('seriea-t0', 'seriea-t1', 'Derby d\'Italia');
register('seriea-t0', 'seriea-t3', 'Derby del Made in Italy');
register('seriea-t1', 'seriea-t3', 'Derby della Madonnina');

// Ligue 1
register('ligue1-t0', 'ligue1-t2', 'Le Classique');

// Portugal
register('portugal-t0', 'portugal-t1', 'O Clássico');
register('portugal-t0', 'portugal-t2', 'Derby de Lisboa');

export function isDerby(teamA: string, teamB: string): boolean {
  return RIVALRY_MAP.get(teamA)?.has(teamB) ?? false;
}

export function getDerbyName(teamA: string, teamB: string): string | null {
  return DERBY_NAMES.get(`${teamA}:${teamB}`) ?? null;
}

export function getDerbyEffect(): { intensityBonus: number; cardMultiplier: number } {
  return { intensityBonus: 1.20, cardMultiplier: 1.5 };
}
