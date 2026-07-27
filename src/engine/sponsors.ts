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

const SPONSOR_POOLS: Record<string, string[]> = {
  england:   ['Fly Emirates', 'Barclays', 'Umbro', 'Ladbrokes', 'Carlsberg', 'Standard Chartered', 'Vodafone', 'Nike UK', 'Bet365', 'Sky Sports'],
  spain:     ['Iberdrola', 'CaixaBank', 'Movistar', 'Estrella Galicia', 'Rakuten', 'Banco Santander', 'Mahou', 'Adeslas', 'Bwin', 'Joma'],
  germany:   ['Allianz', 'Adidas', 'Volkswagen', 'Lufthansa', 'Deutsche Bank', 'Telekom', 'Puma', 'SAP', 'Rewe', 'Evonik'],
  italy:     ['Pirelli', 'Ferrero', 'TIM', 'Barilla', 'Mediolanum', 'Eni', 'Mapei', 'Kappa', 'Sisal', 'Nutella'],
  france:    ['Orange', 'Renault', 'Air France', 'Lacoste', 'BNP Paribas', 'Canal+', 'TotalEnergies', 'Le Coq Sportif', 'Groupama', 'Accor'],
  portugal:  ['Super Bock', 'Sagres', 'MEO', 'Caixa Geral', 'Galp', 'NOS', 'Millennium', 'Placard', 'Betano', 'Vitalis'],
};

const COUNTRY_BY_LEAGUE: Record<string, string> = {
  pl: 'england', championship: 'england',
  laliga: 'spain', laliga2: 'spain',
  bundesliga: 'germany', bundesliga2: 'germany',
  seriea: 'italy', serieb: 'italy',
  ligue1: 'france', ligue2: 'france',
  portugal: 'portugal', portugal2: 'portugal',
};

const LEAGUE_STARTING_TIER: Record<string, SponsorTier> = {
  pl: 'global', laliga: 'global', bundesliga: 'global', seriea: 'global', ligue1: 'global',
  portugal: 'regional', championship: 'regional',
  laliga2: 'local', bundesliga2: 'local', serieb: 'local', ligue2: 'local', portugal2: 'local',
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

export function computeMerchRevenue(reputation: number): number {
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
