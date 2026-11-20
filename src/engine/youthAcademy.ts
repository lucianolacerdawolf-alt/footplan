import type { Player, Position, Team } from './types';
import { generatePlayer, generateRandomName } from '../data/leagues/generateTeam';
import { playerOvr } from '../utils/playerOvr';
import { calculateMarketValue, calculateWeeklyWage } from './transferMarket';

// =============================================================================
// CATEGORIAS DE BASE (PLANO_YOUTH_ACADEMY.md) + potencial escondido / olheiro
// =============================================================================
// Todo fim de temporada chega uma leva de 3-5 jovens (15-17 anos). Cada um tem um
// POTENCIAL real escondido; a tela mostra só a faixa estimada pelo olheiro. Na base o
// jovem evolui em direção ao potencial; com 18+ anos e OVR 55+ pode ser promovido ao
// profissional. Quem chega aos 20 sem ser promovido é dispensado.

export const YOUTH_PROMOTE_MIN_AGE = 18;
export const YOUTH_PROMOTE_MIN_OVR = 55;
export const YOUTH_RELEASE_AGE = 20;
const POSITION_ORDER: Position[] = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'FWD'];

let youthSeq = 0;

/** Jovem de 15-17 anos, OVR 40-58, potencial = OVR + 10..36 (raro passar de 85). */
export function generateYouthPlayer(position: Position, seasonYear: number, rng: () => number = Math.random): Player {
  const age = 15 + Math.floor(rng() * 3);
  const ovr = 40 + Math.floor(rng() * 19);
  // Distribuição puxada pra baixo: a maioria vira jogador de elenco, poucos viram craque.
  const growth = 10 + Math.floor(Math.pow(rng(), 1.6) * 27);
  const potential = Math.min(92, ovr + growth);
  const id = `youth-s${seasonYear}-${youthSeq++}-${Math.floor(rng() * 1e6)}`;
  const base = generatePlayer(id, generateRandomName(rng), 0, position, ovr, age, 4);
  return { ...base, age, potential };
}

/** Captação anual: 3-5 jovens, cobrindo goleiro/defesa/meio/ataque. */
export function generateYouthIntake(seasonYear: number, rng: () => number = Math.random): Player[] {
  const count = 3 + Math.floor(rng() * 3);
  return Array.from({ length: count }, (_, i) => generateYouthPlayer(POSITION_ORDER[i % POSITION_ORDER.length], seasonYear, rng));
}

/** Uma temporada na base: cresce em direção ao potencial (mais rápido quanto mais longe). */
export function progressYouthPlayer(player: Player, rng: () => number = Math.random): Player {
  const current = playerOvr(player);
  const potential = player.potential ?? current + 10;
  const gap = Math.max(0, potential - current);
  const delta = Math.min(gap, Math.max(1, Math.round(gap * 0.35) + Math.floor(rng() * 3) - 1));
  const target = Math.max(40, current + delta);
  const scale = target / current;
  const a = player.attributes;
  const s = (v: number) => Math.max(1, Math.min(99, Math.round(v * scale)));
  return {
    ...player,
    age: (player.age ?? 16) + 1,
    attributes: {
      speed: s(a.speed), stamina: s(a.stamina), passing: s(a.passing), finishing: s(a.finishing),
      tackling: s(a.tackling), dribbling: s(a.dribbling), vision: s(a.vision), positioning: s(a.positioning),
    },
  };
}

/** Jovem escolhido como "foco do treino": evolui uma etapa extra na virada da temporada
 *  (a idade sobe só uma vez). Só um por temporada — a escolha zera no fim dela. */
export function progressFocusedYouth(player: Player, rng: () => number = Math.random): Player {
  const once = progressYouthPlayer(player, rng);
  return { ...progressYouthPlayer(once, rng), age: once.age };
}

/** Temporadas até o jovem poder subir (idade e força), estimando a evolução pelo
 *  potencial do olheiro. null = provavelmente não chega lá antes de ser dispensado. */
export function seasonsUntilReady(player: Player): number | null {
  if (canPromote(player)) return 0;
  let sim: Player = { ...player, potential: scoutEstimate(player).min + Math.round((scoutEstimate(player).max - scoutEstimate(player).min) / 2) };
  for (let n = 1; n <= YOUTH_RELEASE_AGE - (player.age ?? 16); n++) {
    sim = progressYouthPlayer(sim, () => 0.5);
    if ((sim.age ?? 0) >= YOUTH_RELEASE_AGE) return null;
    if (canPromote(sim)) return n;
  }
  return null;
}

/** Máximo de jovens emprestados ao mesmo tempo. */
export const YOUTH_MAX_LOANS = 2;

/**
 * Evolução durante a temporada (a cada rodada da liga): chance de +1 de força na direção
 * do potencial. Antes a base só mexia na virada da temporada e a tela parecia parada.
 * Esperado por temporada ≈ 15% do que falta pro potencial (o salto maior continua no fim
 * da temporada); treino focado dobra a chance, empréstimo (minutos de jogo) triplica.
 */
export function youthRoundGrowth(player: Player, roundsInSeason: number, rng: () => number = Math.random, boost: 1 | 2 | 3 = 1): Player {
  const current = playerOvr(player);
  const potential = player.potential ?? current + 10;
  const gap = potential - current;
  if (gap <= 0) return player;
  const chance = Math.min(0.9, (gap * 0.15 * boost) / Math.max(1, roundsInSeason));
  if (rng() >= chance) return player;
  const scale = (current + 1) / current;
  const a = player.attributes;
  const s = (v: number) => Math.max(1, Math.min(99, Math.round(v * scale)));
  return {
    ...player,
    attributes: {
      speed: s(a.speed), stamina: s(a.stamina), passing: s(a.passing), finishing: s(a.finishing),
      tackling: s(a.tackling), dribbling: s(a.dribbling), vision: s(a.vision), positioning: s(a.positioning),
    },
  };
}

/** Fim de temporada: evolui todos e dispensa quem chegou aos 20 sem ser promovido. */
export function refreshYouthPool(existing: Player[], rng: () => number = Math.random, focusId?: string, loanIds: string[] = []): { remaining: Player[]; released: Player[] } {
  const progressed = existing.map(p => (p.id === focusId || loanIds.includes(p.id) ? progressFocusedYouth(p, rng) : progressYouthPlayer(p, rng)));
  return {
    remaining: progressed.filter(p => (p.age ?? 0) < YOUTH_RELEASE_AGE),
    released: progressed.filter(p => (p.age ?? 0) >= YOUTH_RELEASE_AGE),
  };
}

export function canPromote(player: Player): boolean {
  return (player.age ?? 0) >= YOUTH_PROMOTE_MIN_AGE && playerOvr(player) >= YOUTH_PROMOTE_MIN_OVR;
}

/**
 * Estimativa do olheiro: faixa em torno do potencial real, mais larga quanto mais novo
 * (difícil prever um garoto de 15). Determinística por jogador — não muda ao reabrir.
 */
export function scoutEstimate(player: Player): { min: number; max: number } {
  const potential = player.potential ?? playerOvr(player);
  const age = player.age ?? 17;
  const width = age <= 15 ? 12 : age <= 16 ? 10 : age <= 17 ? 8 : 6;
  let h = 0;
  for (const ch of player.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const offset = (h % (width + 1)) - Math.floor(width / 2);
  const center = potential + Math.round(offset / 2);
  return { min: Math.max(40, center - Math.floor(width / 2)), max: Math.min(95, center + Math.ceil(width / 2)) };
}

/** Promove ao profissional: número livre, valor/salário/contrato de jovem. */
export function promoteYouthPlayer(youth: Player, team: Team): Team {
  const used = new Set(team.squad.map(p => p.number));
  let number = 30;
  while (used.has(number)) number++;
  const marketValue = calculateMarketValue(youth);
  const promoted: Player = {
    ...youth,
    number,
    marketValue,
    weeklyWage: calculateWeeklyWage(marketValue),
    contractSeasonsLeft: 3,
  };
  return { ...team, squad: [...team.squad, promoted] };
}
