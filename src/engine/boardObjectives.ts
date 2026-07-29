import type { CareerState, InboxMessage } from './career';
import type { LeagueState } from './tournament';

export type BoardObjectiveType =
  | 'league_position'
  | 'cup_progress'
  | 'budget_positive'
  | 'top_half'
  | 'avoid_relegation';

export interface BoardObjective {
  id: string;
  type: BoardObjectiveType;
  label: string;
  target: number;    // e.g. 4 (top 4), 3 (semifinal), 0 (budget > 0)
  achieved?: boolean; // undefined = not yet evaluated
  reward: number;    // reputation reward if achieved
  penalty: number;   // reputation penalty if failed
}

export interface BoardObjectivesState {
  seasonYear: number;
  objectives: BoardObjective[];
  evaluated: boolean;
  streakBad: number; // consecutive seasons with majority of objectives failed
}

function makeId(): string {
  return `obj-${crypto.randomUUID().slice(0, 8)}`;
}

export function getObjectives(state: CareerState): BoardObjectivesState | null {
  return (state as any).boardObjectives ?? null;
}

export function generateBoardObjectives(
  league: LeagueState,
  reputation: number,
  previousPosition?: number,
): BoardObjectivesState {
  const totalTeams = league.teams.length;
  const objectives: BoardObjective[] = [];
  const isBigClub = reputation >= 60;
  const isTopLeague = league.teams.length >= 20;

  // ── Objective 1: League position ──
  if (isBigClub && isTopLeague) {
    if (reputation >= 85) {
      objectives.push({
        id: makeId(), type: 'league_position',
        label: 'Disputar o título (Top 2)',
        target: 2, reward: 12, penalty: 8,
      });
    } else {
      objectives.push({
        id: makeId(), type: 'league_position',
        label: 'Classificar para competições europeias (Top 4)',
        target: 4, reward: 10, penalty: 6,
      });
    }
  } else if (reputation >= 40) {
    objectives.push({
      id: makeId(), type: 'top_half',
      label: `Terminar na metade de cima (Top ${Math.ceil(totalTeams / 2)})`,
      target: Math.ceil(totalTeams / 2), reward: 8, penalty: 4,
    });
  } else {
    objectives.push({
      id: makeId(), type: 'avoid_relegation',
      label: `Evitar o rebaixamento (acima de ${totalTeams - 3}º)`,
      target: totalTeams - 3, reward: 10, penalty: 6,
    });
  }

  // ── Objective 2: Cup progress ──
  if (isBigClub) {
    objectives.push({
      id: makeId(), type: 'cup_progress',
      label: 'Chegar à final da copa',
      target: 2, // runner-up or better
      reward: 8, penalty: 4,
    });
  } else if (reputation >= 40) {
    objectives.push({
      id: makeId(), type: 'cup_progress',
      label: 'Chegar às semifinais da copa',
      target: 3, // semifinal or better
      reward: 6, penalty: 3,
    });
  } else {
    objectives.push({
      id: makeId(), type: 'cup_progress',
      label: 'Chegar às quartas de final da copa',
      target: 4, // quarterfinal or better
      reward: 6, penalty: 3,
    });
  }

  // ── Objective 3: Budget ──
  objectives.push({
    id: makeId(), type: 'budget_positive',
    label: 'Manter orçamento positivo ao fim da temporada',
    target: 0, reward: 6, penalty: 3,
  });

  return {
    seasonYear: league.fixtures.length > 0 ? new Date().getFullYear() : 2024,
    objectives,
    evaluated: false,
    streakBad: 0,
  };
}

export interface ObjectiveResult {
  objective: BoardObjective;
  achieved: boolean;
  detail: string;
  rewardApplied: number;
  penaltyApplied: number;
}

export function evaluateBoardObjectives(
  objectives: BoardObjectivesState,
  leaguePosition: number,
  cupStage: 'champion' | 'runner-up' | 'semifinal' | 'quarterfinal' | 'roundOf16' | 'not-played',
  budget: number,
  previousStreak: number,
): { results: ObjectiveResult[]; totalRepDelta: number; newStreak: number; warnings: string[] } {
  const results: ObjectiveResult[] = [];
  let totalRepDelta = 0;
  const warnings: string[] = [];

  for (const obj of objectives.objectives) {
    let achieved = false;
    let detail = '';

    switch (obj.type) {
      case 'league_position':
        achieved = leaguePosition <= obj.target;
        detail = achieved
          ? `Terminou em ${leaguePosition}º — meta era Top ${obj.target}`
          : `Terminou em ${leaguePosition}º — meta era Top ${obj.target} (não atingido)`;
        break;
      case 'top_half':
        achieved = leaguePosition <= obj.target;
        detail = achieved
          ? `Terminou em ${leaguePosition}º — dentro da metade de cima`
          : `Terminou em ${leaguePosition}º — ficou na metade de baixo`;
        break;
      case 'avoid_relegation':
        achieved = leaguePosition <= obj.target;
        detail = achieved
          ? `Terminou em ${leaguePosition}º — longe do rebaixamento`
          : `Terminou em ${leaguePosition}º — perigosamente perto do rebaixamento`;
        break;
      case 'cup_progress': {
        const cupRank = cupStage === 'champion' ? 1 : cupStage === 'runner-up' ? 2 : cupStage === 'semifinal' ? 3 : cupStage === 'quarterfinal' ? 4 : 5;
        achieved = cupRank <= obj.target;
        const cupLabel = cupStage === 'champion' ? 'Campeão' : cupStage === 'runner-up' ? 'Vice' : cupStage === 'semifinal' ? 'Semifinal' : cupStage === 'quarterfinal' ? 'Quartas' : 'Oitavas';
        detail = achieved
          ? `Resultado na copa: ${cupLabel} — meta atingida`
          : `Resultado na copa: ${cupLabel} — abaixo da meta`;
        break;
      }
      case 'budget_positive':
        achieved = budget >= obj.target;
        detail = achieved
          ? `Orçamento final: €${(budget / 1_000_000).toFixed(1)}M — saldo positivo`
          : `Orçamento final: €${(budget / 1_000_000).toFixed(1)}M — saldo negativo`;
        break;
    }

    const result: ObjectiveResult = {
      objective: { ...obj, achieved },
      achieved,
      detail,
      rewardApplied: achieved ? obj.reward : 0,
      penaltyApplied: achieved ? 0 : obj.penalty,
    };
    results.push(result);

    if (achieved) {
      totalRepDelta += obj.reward;
    } else {
      totalRepDelta -= obj.penalty;
    }
  }

  const failedCount = results.filter(r => !r.achieved).length;
  const newStreak = failedCount >= 2 ? previousStreak + 1 : 0;

  if (newStreak >= 2) {
    warnings.push('A diretoria está preocupada com os resultados recentes.');
  }
  if (newStreak >= 3) {
    warnings.push('⚠️ Sua posição está em risco. A próxima temporada será decisiva.');
  }

  return { results, totalRepDelta, newStreak, warnings };
}

export function createBoardObjectivesInboxMessage(objectives: BoardObjectivesState): InboxMessage {
  const lines = objectives.objectives.map(o => `• ${o.label}`);
  return {
    id: `board-obj-${objectives.seasonYear}`,
    date: new Date().toISOString().slice(0, 10),
    isRead: false,
    isMandatory: false,
    type: 'BOARD_UPDATE',
    subject: 'Objetivos da Temporada',
    body: `A diretoria definiu os seguintes objetivos para esta temporada:\n\n${lines.join('\n')}\n\nBoa sorte!`,
  };
}

export function createBoardObjectivesResultMessage(
  results: ObjectiveResult[],
  totalRepDelta: number,
  warnings: string[],
): InboxMessage {
  const achieved = results.filter(r => r.achieved).length;
  const total = results.length;
  const lines = results.map(r =>
    `${r.achieved ? '✅' : '❌'} ${r.objective.label} — ${r.detail}`
  );
  const deltaStr = totalRepDelta >= 0 ? `+${totalRepDelta}` : `${totalRepDelta}`;
  let body = `Resultado dos objetivos da temporada (${achieved}/${total} cumpridos):\n\n${lines.join('\n')}\n\nImpacto na reputação: ${deltaStr}`;

  if (warnings.length > 0) {
    body += `\n\n${warnings.join('\n')}`;
  }

  return {
    id: `board-result-${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    isRead: false,
    isMandatory: true,
    type: 'BOARD_UPDATE',
    subject: `Avaliação da Temporada — ${achieved}/${total} objetivos cumpridos`,
    body,
  };
}
