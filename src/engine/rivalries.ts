type RivalryPair = [string, string];

const RIVALRY_MAP = new Map<string, Set<string>>();

function register(a: string, b: string): void {
  if (!RIVALRY_MAP.has(a)) RIVALRY_MAP.set(a, new Set());
  if (!RIVALRY_MAP.has(b)) RIVALRY_MAP.set(b, new Set());
  RIVALRY_MAP.get(a)!.add(b);
  RIVALRY_MAP.get(b)!.add(a);
}

// Premier League
register('pl-t0', 'pl-mu');  // Arsenal vs Man United
register('pl-mu', 'pl-t1');  // Man United vs Liverpool
register('pl-t0', 'pl-ch');  // Arsenal vs Chelsea
register('pl-ch', 'pl-t1');  // Chelsea vs Liverpool
register('pl-mu', 'pl-t3');  // Man United vs Man City
register('pl-t1', 'pl-ev');  // Liverpool vs Everton
register('pl-t0', 'pl-th');  // Arsenal vs Tottenham

// La Liga
register('laliga-t0', 'laliga-t1'); // Real Madrid vs Barcelona
register('laliga-t2', 'laliga-t1'); // Atlético vs Barcelona
register('laliga-t0', 'laliga-t2'); // Real Madrid vs Atlético

// Bundesliga
register('bundesliga-t0', 'bundesliga-t1'); // Bayern vs Dortmund

// Serie A
register('seriea-t0', 'seriea-t1'); // Juventus vs Inter
register('seriea-t0', 'seriea-t3'); // Juventus vs Milan
register('seriea-t1', 'seriea-t3'); // Inter vs Milan (Derby della Madonnina)

// Ligue 1
register('ligue1-t0', 'ligue1-t2'); // PSG vs Marseille (Le Classique)

// Portugal
register('portugal-t0', 'portugal-t1'); // Benfica vs Porto
register('portugal-t0', 'portugal-t2'); // Benfica vs Sporting

export function isDerby(teamA: string, teamB: string): boolean {
  return RIVALRY_MAP.get(teamA)?.has(teamB) ?? false;
}

export function getDerbyEffect(): { intensityBonus: number; cardMultiplier: number } {
  return { intensityBonus: 1.20, cardMultiplier: 1.5 };
}
