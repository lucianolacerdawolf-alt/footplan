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

// IDs precisam bater com os ids reais dos times nos arquivos de dados (antes
// usavam placeholders 'pl-t0'/etc. que não existiam — o derby nunca disparava).
// Premier League
register('arsenal', 'man-utd', 'Arsenal × United');
register('man-utd', 'liverpool', 'North-West Derby');
register('arsenal', 'chelsea', 'London Derby');
register('chelsea', 'liverpool', 'Chelsea × Liverpool');
register('man-utd', 'man-city', 'Manchester Derby');
register('liverpool', 'everton', 'Merseyside Derby');
register('arsenal', 'tottenham', 'North London Derby');

// La Liga
register('rma', 'fcb', 'El Clásico');
register('atm', 'fcb', 'Atlético × Barça');
register('rma', 'atm', 'Derbi Madrileño');

// Bundesliga
register('bay', 'bvb', 'Der Klassiker');

// Serie A
register('juv', 'int', 'Derby d\'Italia');
register('juv', 'acm', 'Derby del Made in Italy');
register('int', 'acm', 'Derby della Madonnina');

// Ligue 1
register('psg', 'om', 'Le Classique');

// Portugal
register('slb', 'fcp', 'O Clássico');
register('slb', 'scp', 'Derby de Lisboa');

export function isDerby(teamA: string, teamB: string): boolean {
  return RIVALRY_MAP.get(teamA)?.has(teamB) ?? false;
}

export function getDerbyName(teamA: string, teamB: string): string | null {
  return DERBY_NAMES.get(`${teamA}:${teamB}`) ?? null;
}
