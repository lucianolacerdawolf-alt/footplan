export type SponsorTier = 'local' | 'regional' | 'national' | 'global';

export interface SponsorInfo {
  tier: SponsorTier;
  name: string;
  multiplier: number;
}

const TIER_CONFIG: Record<SponsorTier, { multiplier: number; minReputation: number; label: string }> = {
  local:    { multiplier: 1.0, minReputation: 0,  label: 'Local' },
  regional: { multiplier: 1.4, minReputation: 25, label: 'Regional' },
  national: { multiplier: 1.8, minReputation: 50, label: 'Nacional' },
  global:   { multiplier: 2.5, minReputation: 75, label: 'Global' },
};

export function getSponsorMultiplier(tier: SponsorTier): number {
  return TIER_CONFIG[tier].multiplier;
}

export function getSponsorLabel(tier: SponsorTier): string {
  return TIER_CONFIG[tier].label;
}

export function getSponsorMinReputation(tier: SponsorTier): number {
  return TIER_CONFIG[tier].minReputation;
}

// Marcas FICTÍCIAS com sabor local. Antes eram marcas reais (Fly Emirates, Bet365,
// Adidas, Santander…) estampando a camisa do clube do usuário — sugere patrocínio que
// não existe (risco de marca registrada) sem ganho de jogo. Saves antigos mantêm o
// nome que já tinham (sponsorName fica gravado no CareerState).
const SPONSOR_POOLS: Record<string, string[]> = {
  england:   ['Thames Air', 'Crown & Kettle', 'Northgate Bank', 'Ravenswood Ales', 'Albion Mobile', 'Penrose Insurance', 'Kingsbet', 'Harbourline', 'Whitcombe Motors', 'Brightwater Energy'],
  spain:     ['Iberluz', 'Banco Meseta', 'Cervezas Alhambrilla', 'Telmar', 'Seguros Duero', 'Azahar Energía', 'Apuestas Brava', 'Viajes Solano', 'Olivar Foods', 'Cantabria Motor'],
  germany:   ['Rheinwerk', 'Nordbank', 'Hansa Versicherung', 'Bergbräu', 'Elbe Mobil', 'Kraftstrom', 'Alpenluft Air', 'Schwarzwald Auto', 'Tipp24x', 'Eichel Logistik'],
  italy:     ['Banca Tirrena', 'Pastificio Aurora', 'Vespina', 'Assicurazioni Duomo', 'Caffè Leone', 'Energia Ligure', 'Scommesse Sole', 'Telecom Adria', 'Moto Riviera', 'Gelati Fiore'],
  france:    ['Banque Lumière', 'Aéro Provence', 'Énergie Loire', 'Fromagerie Mont-Blanc', 'Assurances Seine', 'Télécom Azur', 'Paris Pronos', 'Autos Garonne', 'Vins Bordelune', 'Rail Atlantique'],
  portugal:  ['Cerveja Atlântica', 'Banco Lusitano', 'Tejo Telecom', 'Seguros Douro', 'Energia Minho', 'Apostas Galo', 'Conservas Mar Azul', 'Voa Açores', 'Café Barlavento', 'Auto Algarve'],
};

// Chaves precisam bater com os LeagueDefinition.id reais (serieA, serieB,
// ligaPortugal, ligaPortugal2) — antes as chaves erradas faziam Serie A e
// Liga Portugal caírem no pool inglês e no tier 'local'.
const COUNTRY_BY_LEAGUE: Record<string, string> = {
  pl: 'england', championship: 'england',
  laliga: 'spain', laliga2: 'spain',
  bundesliga: 'germany', bundesliga2: 'germany',
  serieA: 'italy', serieB: 'italy',
  ligue1: 'france', ligue2: 'france',
  ligaPortugal: 'portugal', ligaPortugal2: 'portugal',
};

// As 5 grandes começam em Nacional (×1.8), não no topo: o Global (×2.5) vira meta de
// reputação (75+) em vez de vir de graça na 1ª temporada — antes o Meu Clube já abria
// com "Nível máximo" e não havia pra onde crescer.
const LEAGUE_STARTING_TIER: Record<string, SponsorTier> = {
  pl: 'national', laliga: 'national', bundesliga: 'national', serieA: 'national', ligue1: 'national',
  ligaPortugal: 'regional', championship: 'regional',
  laliga2: 'local', bundesliga2: 'local', serieB: 'local', ligue2: 'local', ligaPortugal2: 'local',
};

export function getStartingTier(leagueId: string): SponsorTier {
  return LEAGUE_STARTING_TIER[leagueId] ?? 'local';
}

export function generateSponsor(leagueId: string, teamId: string, tier: SponsorTier): SponsorInfo {
  const country = COUNTRY_BY_LEAGUE[leagueId] ?? 'england';
  const pool = SPONSOR_POOLS[country] ?? SPONSOR_POOLS.england;
  const seed = teamId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const name = pool[seed % pool.length];
  return { tier, name, multiplier: TIER_CONFIG[tier].multiplier };
}

/**
 * Renda de produtos por rodada. Com a receita base do clube, é 10% dela × reputação/100
 * — proporcional ao tamanho do clube. Antes era fixa por ponto de reputação (€6K), igual
 * pra qualquer liga: com a reputação inicial pelo clube (20/11) um grande da Serie B
 * faturaria 5× o próprio lucro só com camisas. Sem base (saves muito antigos), a conta velha.
 */
export function computeMerchRevenue(reputation: number, baseWeeklyRevenue?: number): number {
  if (baseWeeklyRevenue && baseWeeklyRevenue > 0) {
    return Math.round(baseWeeklyRevenue * 0.1 * (reputation / 100) / 1000) * 1000;
  }
  return Math.round(reputation * 6000 / 1000) * 1000;
}

export function getNextTierUp(current: SponsorTier): SponsorTier | null {
  const order: SponsorTier[] = ['local', 'regional', 'national', 'global'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? order[idx + 1] : null;
}

export function getNextTierDown(current: SponsorTier): SponsorTier | null {
  const order: SponsorTier[] = ['local', 'regional', 'national', 'global'];
  const idx = order.indexOf(current);
  return idx > 0 ? order[idx - 1] : null;
}
