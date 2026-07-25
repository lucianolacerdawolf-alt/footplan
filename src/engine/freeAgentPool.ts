import type { Player, Position } from './types';
import { generatePlayer, generateRandomName } from '../data/leagues/generateTeam';
import { calculateMarketValue, calculateWeeklyWage } from './transferMarket';
import { progressPlayer, shouldRetire } from './career';

const TARGET_POOL_SIZE = 16;
const POSITION_QUOTAS: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 4 };

function makeFreeAgent(idSeed: string, position: Position, rng: () => number): Player {
  const ovr = 65 + Math.floor(rng() * 18); // 65-82
  const age = 20 + Math.floor(rng() * 16); // 20-35 — profissionais estabelecidos, não só juniores
  // number=0: agente livre não tem número de camisa até ser contratado por um clube.
  const base = generatePlayer(`fa-${idSeed}`, generateRandomName(rng), 0, position, ovr);
  const player: Player = { ...base, age };
  const marketValue = calculateMarketValue(player);
  return { ...player, marketValue, weeklyWage: calculateWeeklyWage(marketValue) };
}

/** Só usado ao iniciar a carreira — monta o pool do zero respeitando a cota por posição. */
export function generateFreeAgentPool(rng: () => number = Math.random): Player[] {
  const pool: Player[] = [];
  let n = 0;
  for (const [pos, count] of Object.entries(POSITION_QUOTAS) as [Position, number][]) {
    for (let i = 0; i < count; i++) pool.push(makeFreeAgent(`s0-${n++}`, pos, rng));
  }
  return pool;
}

/**
 * Chamado uma vez por temporada (junto de progressAllLeagues em handleAdvanceSeason) —
 * não a cada abertura de janela, senão o pool envelheceria duas vezes na mesma
 * temporada. Envelhece/evolui os sobreviventes, aposenta pelo mesmo critério de
 * shouldRetire, e completa até o tamanho alvo respeitando o déficit por posição.
 */
export function refreshFreeAgentPool(
  existing: Player[],
  currentSeasonYear: number,
  rng: () => number = Math.random,
): Player[] {
  const survivors = existing
    .map(p => progressPlayer(p, rng))
    .filter(p => !shouldRetire(p.age ?? 26, rng))
    .map(p => {
      const marketValue = calculateMarketValue(p);
      return { ...p, marketValue, weeklyWage: calculateWeeklyWage(marketValue) };
    });

  if (survivors.length >= TARGET_POOL_SIZE) return survivors.slice(0, TARGET_POOL_SIZE);

  const need = TARGET_POOL_SIZE - survivors.length;
  const topUp: Player[] = [];
  let n = 0;
  for (const [pos, quota] of Object.entries(POSITION_QUOTAS) as [Position, number][]) {
    const have = survivors.filter(p => p.position === pos).length;
    const deficit = Math.max(0, quota - have);
    for (let i = 0; i < deficit && topUp.length < need; i++) {
      topUp.push(makeFreeAgent(`s${currentSeasonYear}-${n++}`, pos, rng));
    }
  }
  while (topUp.length < need) topUp.push(makeFreeAgent(`s${currentSeasonYear}-${n++}`, 'MID', rng));
  return [...survivors, ...topUp];
}
