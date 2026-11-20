// Diagnóstico da economia da carreira (regras de src/engine/clubEconomy.ts): caixa inicial,
// saldo por temporada SEM contratar e folga até o teto salarial, por tamanho de clube.
// Uso: npx vite-node scripts/economy-audit.ts
import { readFileSync } from 'node:fs';
import { assignMarketValues, computeWageBill, getLeaguePrizeMoney } from '../src/engine/transferMarket';
import { baseWeeklyRevenue, clubInitialBudget, projectedRoundBalance, wageCap } from '../src/engine/clubEconomy';
import { getAvgOvr } from '../src/utils/teamUtils';
import { initialReputation } from '../src/engine/reputation';
import { getSponsorMultiplier, computeMerchRevenue, tierForReputation } from '../src/engine/sponsors';
import { sponsorTvPerRound } from '../src/engine/clubEconomy';
import type { Team } from '../src/engine/types';

const snap = JSON.parse(readFileSync('public/rosters-snapshot.json', 'utf8')) as { rosters: Record<string, Team[]> };
const fmt = (n: number) => `€${(n / 1e6).toFixed(1)}M`;
for (const lid of ['pl', 'laliga', 'championship', 'serieB']) {
  const teams = snap.rosters[lid].map(t => assignMarketValues(t)).sort((a, b) => getAvgOvr(b) - getAvgOvr(a));
  const rounds = (teams.length - 1) * 2;
  console.log(`\n${lid}: ${rounds} rodadas`);
  for (const [label, idx] of [['grande', 0], ['médio', Math.floor(teams.length / 2)], ['pequeno', teams.length - 1]] as const) {
    const t = teams[idx];
    const base = baseWeeklyRevenue(t, lid);
    const wage = computeWageBill(t);
    const home = projectedRoundBalance({ base, leagueId: lid, wageBill: wage, homeMatch: true });
    const away = projectedRoundBalance({ base, leagueId: lid, wageBill: wage, homeMatch: false });
    const season = (home + away) * rounds / 2;
    const prize = getLeaguePrizeMoney(lid, idx + 1);
    const cap = wageCap(base, lid);
    // Reputação inicial (reputation.ts) e o que ela faz com o patrocínio no fim da 1ª temporada
    // (sem títulos): abaixo do mínimo do nível inicial, o patrocínio cai um nível.
    const rep = initialReputation(t, teams, lid);
    const tier0 = tierForReputation(rep);
    const tier1 = tier0; // nunca cai abaixo do nível de largada do clube
    const sponsorDelta = (sponsorTvPerRound(base, lid, tier1, tier0) - sponsorTvPerRound(base, lid, tier0, tier0)) * rounds;
    console.log(`  ${label.padEnd(8)} reputação inicial ${rep} · patrocínio ${tier0}→${tier1} na temp. 2 (${fmt(sponsorDelta)}/temp) · produtos ${fmt(computeMerchRevenue(rep, base) * rounds)}/temp`);
    void getSponsorMultiplier;
    console.log(`  ${label.padEnd(8)} ${t.name.padEnd(18)} caixa inicial ${fmt(clubInitialBudget(t, teams, lid))} · saldo/temporada ${fmt(season)} (+ prêmio ${fmt(prize)}) · folha ${fmt(wage)}/sem, teto ${fmt(cap)} (folga ${fmt(cap - wage)}/sem)`);
  }
}
