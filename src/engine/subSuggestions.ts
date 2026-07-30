import type { Team, Player } from './types';
import { playerOvr } from '../utils/playerOvr';
import { getStarters } from './matchHelpers';

export interface SubSuggestion {
  type: 'fatigue' | 'card_risk' | 'tactical';
  out: Player;
  reason: string;
  candidates: { player: Player; reason: string }[];
}

export interface SubSuggestionContext {
  /** Fadiga ao vivo da partida (0-100). Cai para `player.currentFatigue` se ausente. */
  fatigueMap?: Record<string, number>;
  /** Cartões da partida em andamento. Sem isso não há sugestão de risco de cartão. */
  cards?: Map<string, 'yellow' | 'red'>;
  /** Jogadores lesionados durante a partida. */
  injuredIds?: string[];
}

const FATIGUE_THRESHOLD = 70;

function isAvailable(p: Player, injured: Set<string>): boolean {
  return !p.injuredRounds && !p.isSuspended && !injured.has(p.id);
}

export function getSubSuggestions(
  team: Team,
  userScore: number,
  opponentScore: number,
  ctx: SubSuggestionContext = {},
): SubSuggestion[] {
  const { fatigueMap, cards } = ctx;
  const injured = new Set(ctx.injuredIds ?? []);

  // getStarters seleciona por posição segundo a formação — não são os 11 primeiros
  // do elenco. O banco é o complemento por id, nunca um slice do array.
  const starters = getStarters(team, cards, injured);
  const starterIds = new Set(starters.map(p => p.id));
  const bench = team.squad.filter(p => !starterIds.has(p.id) && isAvailable(p, injured));

  const fatigueOf = (p: Player) => fatigueMap?.[p.id] ?? p.currentFatigue;
  const replacementsFor = (p: Player) => bench.filter(b => b.position === p.position);

  const suggestions: SubSuggestion[] = [];
  const alreadySuggested = new Set<string>();

  const push = (s: SubSuggestion) => {
    if (alreadySuggested.has(s.out.id)) return;
    alreadySuggested.add(s.out.id);
    suggestions.push(s);
  };

  // ── Risco de cartão: só para quem realmente tem amarelo em campo ──
  for (const p of starters) {
    if (cards?.get(p.id) !== 'yellow') continue;
    const options = replacementsFor(p);
    if (options.length === 0) continue;
    push({
      type: 'card_risk',
      out: p,
      reason: `${p.name} está pendurado com amarelo — risco de expulsão`,
      candidates: options
        .sort((a, b) => playerOvr(b) - playerOvr(a))
        .slice(0, 2)
        .map(b => ({ player: b, reason: 'mesma posição, sem cartão' })),
    });
  }

  // ── Fadiga ──
  for (const p of starters) {
    const fatigue = fatigueOf(p);
    if (fatigue < FATIGUE_THRESHOLD) continue;
    const options = replacementsFor(p);
    if (options.length === 0) continue;
    const freshest = [...options].sort((a, b) => fatigueOf(a) - fatigueOf(b))[0];
    push({
      type: 'fatigue',
      out: p,
      reason: `${p.name} está com ${Math.round(fatigue)}% de fadiga`,
      candidates: [{
        player: freshest,
        reason: `descansado, ${Math.round(fatigueOf(freshest))}% de fadiga`,
      }],
    });
  }

  // ── Táticas ──
  if (userScore < opponentScore) {
    // Atrás no placar: sacrifica um defensor por mais poder ofensivo
    const def = starters.find(p => p.position === 'DEF');
    const extraFwd = bench.find(b => b.position === 'FWD');
    if (def && extraFwd) {
      push({
        type: 'tactical',
        out: def,
        reason: 'Time atrás no placar — trocar defesa por ataque',
        candidates: [{ player: extraFwd, reason: 'mais poder ofensivo' }],
      });
    }
  } else if (userScore > opponentScore) {
    // À frente: reforça a defesa para segurar o resultado
    const fwd = starters.find(p => p.position === 'FWD');
    const extraDef = bench.find(b => b.position === 'DEF');
    if (fwd && extraDef) {
      push({
        type: 'tactical',
        out: fwd,
        reason: 'Segurando resultado — reforçar defesa',
        candidates: [{ player: extraDef, reason: 'mais solidez defensiva' }],
      });
    }
  }

  return suggestions;
}
