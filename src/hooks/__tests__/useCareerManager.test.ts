// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCareerManager } from '../useCareerManager';
import { makeTeam } from '@/components/__tests__/testFixtures';
import { getLeague, allLeagues } from '@/data/leagues';
import { getContinentalCup, getQualifiedTeams, createContinentalBracket } from '@/engine/continentalCups';
import { netSellRevenue, getLeaguePrizeMoney, getCupPrizeMoney, getTicketRevenue, renewalCost, calculateMarketValue } from '@/engine/transferMarket';
import { computeStandings } from '@/engine/tournament';
import { deriveCupResult, getFinances, getFreeAgentPool, getJobOffers, getPlayerConversations } from '@/engine/career';import type { MatchResult, MatchEvent, Team, Player } from '@/engine/types';
import * as careerEvents from '@/engine/careerEvents';

// Node 22+'s built-in global `localStorage` shadows jsdom's window.localStorage
// in vitest's jsdom environment (it's excluded from vitest's window-key copy
// allowlist) and returns undefined without a `--localstorage-file` CLI flag —
// so this hook's usePersistedState('fp:career', ...) reads/writes silently no-op
// under test. Polyfill an in-memory Storage on globalThis so the hook's real
// localStorage calls (and this file's `localStorage.clear()`/`.setItem()`) work.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
  key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
  removeItem(key: string): void { this.store.delete(key); }
  setItem(key: string, value: string): void { this.store.set(key, String(value)); }
}
Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });

function mockParams() {
  return {
    setScreen: vi.fn(),
    setHomeTeam: vi.fn(),
    setAwayTeam: vi.fn(),
    setMatchContext: vi.fn(),
    setIsKnockout: vi.fn(),
    setIsTournamentEntry: vi.fn(),
    setIsCareerMode: vi.fn(),
    recordH2H: vi.fn(),
    notifySave: vi.fn(),
    setToastMsg: vi.fn(),
    evaluateAchievements: vi.fn(),
    unlockAchievement: vi.fn(),
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('handleStartCareer (D-01, D-13)', () => {
  it('seeds all 12 real leagues (6 top-flight + 6 second divisions) and creates season 1 league+cup together', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    // leagueDef must be one of the real allLeagues entries — handleStartCareer
    // indexes rosters by leagueDef.id against the real allLeagues import (D-01),
    // so a standalone test-fixture league id (not in allLeagues) would leave
    // rosters[leagueDef.id] unset. userTeam.id matches an existing static PL
    // team's id, simulating the TournamentSetupScreen flow where the user
    // picks one of the league's own teams (replace-by-id path in handleStartCareer).
    const leagueDef = getLeague('pl')!;
    const chosenStaticTeam = leagueDef.teams[0];
    const userTeam = makeTeam(chosenStaticTeam.id, 'Meu Time', 'MYT');
    act(() => {
      result.current.handleStartCareer(userTeam, leagueDef, 'Alex');
    });

    expect(result.current.careerState).not.toBeNull();
    expect(Object.keys(result.current.careerState!.rosters).length).toBe(12);
    expect(result.current.careerState!.season.cup.roundOf16.length).toBe(8);
    expect(result.current.careerState!.season.league.phase).toBe('playing');
    // .age is only populated by assignInitialAges on the seeded/aged clone path —
    // proves the replace-by-id branch ran on the passed-in userTeam, not a fresh
    // clone of the static league data's same-id team.
    expect(result.current.careerState!.rosters['pl'].find(t => t.id === userTeam.id)?.squad[0].age).toBeTypeOf('number');
  });
});

describe('D-14: single save slot', () => {
  it('overwrites the previous career on a second handleStartCareer call', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const firstTeam = makeTeam('first-team', 'Primeiro Time', 'FST');
    const secondTeam = makeTeam('second-team', 'Segundo Time', 'SCT');
    const firstLeagueDef = getLeague('pl')!;
    const secondLeagueDef = getLeague('laliga')!;

    act(() => {
      result.current.handleStartCareer(firstTeam, firstLeagueDef, 'Alex');
    });
    const firstLeagueId = result.current.careerState!.leagueId;
    expect(firstLeagueId).toBe(firstLeagueDef.id);

    act(() => {
      result.current.handleStartCareer(secondTeam, secondLeagueDef, 'Sam');
    });

    expect(result.current.careerState!.leagueId).toBe(secondLeagueDef.id);
    expect(result.current.careerState!.leagueId).not.toBe(firstLeagueId);
  });
});

describe('T-04.4-02: malformed fp:career recovery', () => {
  it('discards a syntactically valid but wrongly-shaped fp:career value on mount', async () => {
    localStorage.setItem('fp:career', JSON.stringify({ version: 1 }));

    const { result } = renderHook(() => useCareerManager(mockParams()));

    await act(async () => {});

    expect(result.current.careerState).toBeNull();
  });
});

function startPlCareer(result: { current: ReturnType<typeof useCareerManager> }) {
  const leagueDef = getLeague('pl')!;
  const chosenStaticTeam = leagueDef.teams[0];
  const userTeam = makeTeam(chosenStaticTeam.id, 'Meu Time', 'MYT');
  act(() => {
    result.current.handleStartCareer(userTeam, leagueDef, 'Alex');
  });
  const leagueId = result.current.careerState!.leagueId;
  const userTeamId = result.current.careerState!.season.league.userTeamId;
  const opponentTeamId = result.current.careerState!.rosters[leagueId].find(t => t.id !== userTeamId)!.id;
  return { leagueId, userTeamId, opponentTeamId };
}

describe('D-06: trade cap removido', () => {
  it('aceita a 4ª proposta de troca da temporada normalmente — não há mais teto de 3', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);

    // Math.random defaults evaluateTradeOffer's rng — mocking it to 0.01 guarantees
    // rng() < acceptChance on every call, since 0.01 is below even the clamp's floor
    // of 0.02, independent of the offer's actual favorability. This makes all 4
    // proposals deterministically accepted, no retry loop or flake risk.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);

    let lastResult: { accepted: boolean; reason: string } | undefined;
    for (let i = 0; i < 4; i++) {
      const state = result.current.careerState!;
      const userSquad = state.rosters[leagueId].find(t => t.id === userTeamId)!.squad;
      const oppSquad = state.rosters[leagueId].find(t => t.id === opponentTeamId)!.squad;
      const offeredPlayerId = userSquad[0].id;
      const requestedPlayerId = oppSquad[0].id;
      act(() => {
        lastResult = result.current.handleProposeTrade(offeredPlayerId, opponentTeamId, requestedPlayerId);
      });
    }

    // Só o aceite importa aqui (o teto de 3 trocas foi removido) — o "reason" reflete o
    // sinal do ovrDelta entre os jogadores reais da liga, que pode variar conforme os
    // dados estáticos, então não é o que este teste verifica.
    expect(lastResult?.accepted).toBe(true);

    randomSpy.mockRestore();
  });
});

describe('D-07: trade persistence', () => {
  it('permanently moves the traded players in both rosters and season.league.teams', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);

    const before = result.current.careerState!;
    const userSquad = before.rosters[leagueId].find(t => t.id === userTeamId)!.squad;
    const oppSquad = before.rosters[leagueId].find(t => t.id === opponentTeamId)!.squad;
    const offeredPlayerId = userSquad[0].id;
    const requestedPlayerId = oppSquad[0].id;

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    act(() => {
      result.current.handleProposeTrade(offeredPlayerId, opponentTeamId, requestedPlayerId);
    });
    randomSpy.mockRestore();

    const after = result.current.careerState!;
    const afterUserRoster = after.rosters[leagueId].find(t => t.id === userTeamId)!.squad;
    const afterOppRoster = after.rosters[leagueId].find(t => t.id === opponentTeamId)!.squad;
    expect(afterUserRoster.some(p => p.id === requestedPlayerId)).toBe(true);
    expect(afterUserRoster.some(p => p.id === offeredPlayerId)).toBe(false);
    expect(afterOppRoster.some(p => p.id === offeredPlayerId)).toBe(true);
    expect(afterOppRoster.some(p => p.id === requestedPlayerId)).toBe(false);

    const afterUserLeagueTeam = after.season.league.teams.find(t => t.id === userTeamId)!.squad;
    const afterOppLeagueTeam = after.season.league.teams.find(t => t.id === opponentTeamId)!.squad;
    expect(afterUserLeagueTeam.some(p => p.id === requestedPlayerId)).toBe(true);
    expect(afterUserLeagueTeam.some(p => p.id === offeredPlayerId)).toBe(false);
    expect(afterOppLeagueTeam.some(p => p.id === offeredPlayerId)).toBe(true);
    expect(afterOppLeagueTeam.some(p => p.id === requestedPlayerId)).toBe(false);
  });
});

function forceTerminalSeason(result: { current: ReturnType<typeof useCareerManager> }) {
  act(() => {
    result.current.setCareerState(prev => prev && ({
      ...prev,
      season: {
        ...prev.season,
        league: { ...prev.season.league, phase: 'done' as const },
        cup: { ...prev.season.cup, stage: 'champion' as const, championId: prev.season.league.userTeamId },
      },
    }));
  });
}

describe('D-13: season-advance gate', () => {
  it('is a no-op unless both league and cup are terminal, then advances once both are', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    act(() => {
      result.current.handleAdvanceSeason();
    });
    expect(result.current.careerState!.currentSeasonYear).toBe(1);

    forceTerminalSeason(result);

    act(() => {
      result.current.handleAdvanceSeason();
    });

    expect(result.current.careerState!.currentSeasonYear).toBe(2);
    expect(result.current.careerState!.history.length).toBe(1);
    expect(result.current.careerState!.season.tradesUsedThisSeason).toBe(0);
  });
});

describe('D-08, D-09: reputation', () => {
  it('increases manager reputation by the computed delta on a league+cup double', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    const reputationBefore = result.current.careerState!.manager.reputation;

    forceTerminalSeason(result);

    act(() => {
      result.current.handleAdvanceSeason();
    });

    const entry = result.current.careerState!.history[0];
    expect(entry.reputationDelta).toBeGreaterThan(0);

    // A reputação final soma o delta de liga/copa E a avaliação dos objetivos da
    // diretoria, cada um clampado em 0-100. O impacto dos objetivos é publicado na
    // mensagem de avaliação, então dá para conferir o valor exato.
    const boardMsg = result.current.careerState!.inbox!
      .find(m => m.subject.startsWith('Avaliação da Temporada'));
    expect(boardMsg).toBeDefined();
    const objDelta = Number(/Impacto na reputação: ([+-]?\d+)/.exec(boardMsg!.body)![1]);

    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    expect(result.current.careerState!.manager.reputation).toBe(
      clamp(clamp(reputationBefore + entry.reputationDelta) + objDelta)
    );
  });
});

function playUserFixtureWithEvents(
  result: { current: ReturnType<typeof useCareerManager> },
  userTeamId: string,
  events: MatchEvent[]
) {
  const league = result.current.careerState!.season.league;
  const fixture = league.fixtures[league.currentRound].find(
    f => f.homeTeamId === userTeamId || f.awayTeamId === userTeamId
  )!;
  const home = league.teams.find(t => t.id === fixture.homeTeamId)!;
  const away = league.teams.find(t => t.id === fixture.awayTeamId)!;

  act(() => {
    result.current.handlePlayCareerLeagueMatch(fixture, home, away);
  });

  const matchResult: MatchResult = {
    homeTeam: home, awayTeam: away, homeScore: 1, awayScore: 0,
    events,
    homePossession: 55, awayPossession: 45,
    homeStats: { shots: 5, shotsOnTarget: 2, fouls: 3, yellowCards: 0, redCards: 0 },
    awayStats: { shots: 3, shotsOnTarget: 1, fouls: 2, yellowCards: 0, redCards: 0 },
  };

  act(() => {
    result.current.handleCareerLeagueMatchResult(matchResult);
  });
}

describe('Fadiga e cartões pós-partida (Modo Carreira)', () => {
  it('aplica fadiga aos titulares e acumula 1 amarelo sem suspender', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);

    const userTeamBefore = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const starter = userTeamBefore.squad.find(p => p.position !== 'GK')!;

    playUserFixtureWithEvents(result, userTeamId, [
      { minute: 10, type: 'yellowCard', description: 'Cartão', teamId: userTeamId, playerId: starter.id },
    ]);

    const userTeamAfter = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const starterAfter = userTeamAfter.squad.find(p => p.id === starter.id)!;
    expect(starterAfter.yellowCardsThisSeason).toBe(1);
    expect(starterAfter.isSuspended).toBeFalsy();
    expect(starterAfter.currentFatigue).toBeGreaterThan(starter.currentFatigue);

    // goleiro titular não cansa
    const gkAfter = userTeamAfter.squad.find(p => p.position === 'GK')!;
    expect(gkAfter.currentFatigue).toBe(0);
  });

  it('suspende ao acumular 3 amarelos e libera ao avançar a rodada', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);

    const starterId = result.current.careerState!.season.league.teams
      .find(t => t.id === userTeamId)!.squad.find(p => p.position !== 'GK')!.id;

    // Fluxo real do jogo: 1 partida por rodada + avanço entre elas (uma partida já
    // registrada não pode ser re-registrada — guarda anti duplo resultado).
    for (let i = 0; i < 3; i++) {
      playUserFixtureWithEvents(result, userTeamId, [
        { minute: 20, type: 'yellowCard', description: 'Cartão', teamId: userTeamId, playerId: starterId },
      ]);
      if (i < 2) {
        // applyPostMatchInjuries tem chance aleatória de gerar mensagem obrigatória
        // (relatório de lesão) — marca tudo como lido antes de avançar, senão o avanço
        // é bloqueado e este teste dependeria de sorte.
        act(() => {
          result.current.handleMarkAllInboxRead();
        });
        act(() => {
          result.current.handleNextCareerLeagueRound();
        });
      }
    }

    const suspendedTeam = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const suspendedPlayer = suspendedTeam.squad.find(p => p.id === starterId)!;
    expect(suspendedPlayer.yellowCardsThisSeason).toBe(0); // reseta ao suspender
    expect(suspendedPlayer.isSuspended).toBe(true);
    expect(suspendedPlayer.suspendedRounds).toBe(1);

    act(() => {
      result.current.handleMarkAllInboxRead();
    });
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });

    const releasedTeam = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const releasedPlayer = releasedTeam.squad.find(p => p.id === starterId)!;
    expect(releasedPlayer.isSuspended).toBe(false);
    expect(releasedPlayer.suspendedRounds).toBeUndefined();
  });

  it('vermelho direto suspende por 1 jogo mesmo sem 3 amarelos', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);

    const starterId = result.current.careerState!.season.league.teams
      .find(t => t.id === userTeamId)!.squad.find(p => p.position !== 'GK')!.id;

    playUserFixtureWithEvents(result, userTeamId, [
      { minute: 60, type: 'redCard', description: 'Vermelho', teamId: userTeamId, playerId: starterId },
    ]);

    const team = result.current.careerState!.season.league.teams.find(t => t.id === userTeamId)!;
    const player = team.squad.find(p => p.id === starterId)!;
    expect(player.isSuspended).toBe(true);
    expect(player.suspendedRounds).toBe(1);
  });
});

describe('Finanças e Inbox (Modo Carreira)', () => {
  it('handleStartCareer define orçamento inicial, folha salarial e mensagem de boas-vindas', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    const state = result.current.careerState!;
    expect(state.finances).toBeDefined();
    expect(state.finances!.budget).toBeGreaterThan(0);
    expect(state.finances!.wageBill).toBeGreaterThan(0); // elenco já tem weeklyWage atribuído
    expect(state.finances!.weeklyIncome).toBeGreaterThan(0);

    expect(state.inbox).toHaveLength(2); // welcome + board objectives
    expect(state.inbox!.some(m => m.type === 'BOARD_UPDATE' && m.subject.includes('Bem-vindo'))).toBe(true);
    expect(state.inbox!.some(m => m.subject.includes('Objetivos'))).toBe(true);
    expect(state.inbox![0].isRead).toBe(false);
    expect(state.inbox![0].isMandatory).toBe(false);

    // valuation aplicada ao elenco do usuário
    const userTeam = state.season.league.teams.find(t => t.id === state.season.league.userTeamId)!;
    expect(userTeam.squad.every(p => typeof p.marketValue === 'number')).toBe(true);
    expect(userTeam.squad.every(p => typeof p.weeklyWage === 'number')).toBe(true);
  });

  it('handleNextCareerLeagueRound credita a renda semanal e debita a folha salarial do orçamento', () => {
    // Eventos aleatórios de carreira mexem no orçamento (25% de chance por rodada) e
    // deixariam esta conta exata intermitente — este teste é só sobre renda × folha.
    vi.spyOn(careerEvents, 'maybeGetCareerEvent').mockReturnValue(null);

    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId } = startPlCareer(result);

    const before = result.current.careerState!.finances!;
    const leg = result.current.careerState!.season.league;
    const fixture = leg.fixtures[leg.currentRound].find(f => f.homeTeamId === leg.userTeamId || f.awayTeamId === leg.userTeamId);
    const expectedTicketRevenue = fixture?.homeTeamId === leg.userTeamId ? getTicketRevenue(leagueId) : 0;

    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    const after = result.current.careerState!.finances!;

    expect(after.budget).toBe(before.budget + before.weeklyIncome + expectedTicketRevenue - after.wageBill);
    if (fixture?.homeTeamId === leg.userTeamId) {
      expect(expectedTicketRevenue).toBe(getTicketRevenue(leagueId));
    } else {
      expect(expectedTicketRevenue).toBe(0);
    }
  });

  it('bloqueia handleNextCareerLeagueRound enquanto houver mensagem obrigatória não lida', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { userTeamId } = startPlCareer(result);

    // Força uma lesão determinística (rng mockado): applyPostMatchInjuries usa
    // Math.random() < 0.15 pra decidir se ocorre, então 0 sempre lesiona.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);
    playUserFixtureWithEvents(result, userTeamId, []);
    randomSpy.mockRestore();

    const inboxAfterMatch = result.current.careerState!.inbox!;
    expect(inboxAfterMatch.some(m => m.type === 'INJURY_REPORT' && m.isMandatory && !m.isRead)).toBe(true);

    const roundBefore = result.current.careerState!.season.league.currentRound;
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    // bloqueado: a rodada não avançou
    expect(result.current.careerState!.season.league.currentRound).toBe(roundBefore);
    expect(params.setToastMsg).toHaveBeenCalledWith(expect.stringContaining('mensagens obrigatórias'));

    act(() => {
      result.current.handleMarkAllInboxRead();
    });
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    expect(result.current.careerState!.season.league.currentRound).toBe(roundBefore + 1);
  });

  it('handleMarkInboxRead marca só a mensagem indicada', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);
    const messageId = result.current.careerState!.inbox![0].id;

    act(() => {
      result.current.handleMarkInboxRead(messageId);
    });

    expect(result.current.careerState!.inbox![0].isRead).toBe(true);
  });
});

describe('Hall of Fame — fechamento de temporada (handleAdvanceSeason)', () => {
  it('registra artilheiro do usuário, aproveitamento e variação de orçamento no histórico', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);

    const starterId = result.current.careerState!.season.league.teams
      .find(t => t.id === userTeamId)!.squad.find(p => p.position !== 'GK')!.id;
    const starterName = result.current.careerState!.season.league.teams
      .find(t => t.id === userTeamId)!.squad.find(p => p.id === starterId)!.name;

    playUserFixtureWithEvents(result, userTeamId, [
      { minute: 15, type: 'goal', description: 'Gol!', teamId: userTeamId, scorer: starterName },
    ]);

    forceTerminalSeason(result);
    act(() => {
      result.current.handleAdvanceSeason();
    });

    const entry = result.current.careerState!.history[0];
    expect(entry.userTopScorer).toEqual({ name: starterName, goals: 1 });
    expect(entry.userWins).toBeTypeOf('number');
    expect(entry.userDraws).toBeTypeOf('number');
    expect(entry.userLosses).toBeTypeOf('number');
    expect((entry.userWins ?? 0) + (entry.userDraws ?? 0) + (entry.userLosses ?? 0)).toBeGreaterThanOrEqual(1);
    expect(entry.budgetDelta).toBeTypeOf('number');
    expect(entry.managerOfSeason).toBeTypeOf('boolean');

    // artilheiro reseta pra próxima temporada — não deve "vazar" gol da temporada anterior
    expect(result.current.careerState!.season.userGoalScorers).toEqual({});
  });

  it('sem gols do usuário na temporada, userTopScorer fica undefined', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    forceTerminalSeason(result);
    act(() => {
      result.current.handleAdvanceSeason();
    });

    expect(result.current.careerState!.history[0].userTopScorer).toBeUndefined();
  });

  it('credita premiação de liga + copa no orçamento ao fechar a temporada', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId } = startPlCareer(result);

    forceTerminalSeason(result);
    const state = result.current.careerState!;
    const standings = computeStandings(state.season.league.teams, state.season.league.fixtures);
    const leaguePosition = standings.findIndex(s => s.teamId === state.season.league.userTeamId) + 1;
    const cupResult = deriveCupResult(state.season.cup, state.season.league.userTeamId);
    const expectedPrize = getLeaguePrizeMoney(leagueId, leaguePosition) + getCupPrizeMoney(leagueId, cupResult);
    const budgetBefore = state.finances!.budget;

    act(() => {
      result.current.handleAdvanceSeason();
    });

    expect(result.current.careerState!.finances!.budget).toBe(budgetBefore + expectedPrize);
  });
});

describe('handleCareerBracketMatchResult — bilheteria', () => {
  it('credita bilheteria só quando o jogo da copa foi em casa', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);

    const cup = result.current.careerState!.season.cup;
    const matchIdx = cup.roundOf16.findIndex(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId);
    const match = cup.roundOf16[matchIdx];
    const home = cup.teams.find(t => t.id === match.homeTeamId)!;
    const away = cup.teams.find(t => t.id === match.awayTeamId)!;
    const isHome = match.homeTeamId === userTeamId;

    act(() => {
      result.current.handlePlayCareerBracketMatch(match, home, away, 'roundOf16', matchIdx);
    });

    const budgetBefore = result.current.careerState!.finances!.budget;
    const matchResult: MatchResult = {
      homeTeam: home, awayTeam: away, homeScore: 1, awayScore: 0,
      events: [],
      homePossession: 55, awayPossession: 45,
      homeStats: { shots: 5, shotsOnTarget: 2, fouls: 3, yellowCards: 0, redCards: 0 },
      awayStats: { shots: 3, shotsOnTarget: 1, fouls: 2, yellowCards: 0, redCards: 0 },
    };
    act(() => {
      result.current.handleCareerBracketMatchResult(matchResult);
    });

    const budgetAfter = result.current.careerState!.finances!.budget;
    const expectedTicket = isHome ? getTicketRevenue(leagueId) : 0;
    expect(budgetAfter).toBe(budgetBefore + expectedTicket);
  });
});

/** Deixa só 1 jogador na posição `pos` do time `teamId`, em todo lugar que guarda esse time. */
function stripToOnePlayerAtPosition(result: { current: ReturnType<typeof useCareerManager> }, teamId: string, pos: 'GK' | 'DEF' | 'MID' | 'FWD') {
  act(() => {
    result.current.setCareerState(prev => {
      if (!prev) return prev;
      const patchTeam = (t: Team): Team => {
        if (t.id !== teamId) return t;
        const kept = t.squad.find(p => p.position === pos)!;
        return { ...t, squad: [...t.squad.filter(p => p.position !== pos), kept] };
      };
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: prev.rosters[prev.leagueId].map(patchTeam) },
      };
    });
  });
}

// O fixture de usuário (startPlCareer/makeTeam) só tem 1 jogador por posição — qualquer
// venda/listagem seria bloqueada pela guarda de "último na posição" sem isso. Duplica um
// DEF e devolve o id do extra, pra testes que precisam de um jogador vendável de verdade.
// Espelha em rosters E season.league/cup.teams — do jeito que a produção sempre mantém os
// dois em sincronia — porque handleNextCareerLeagueRound lê o elenco de season.league.teams,
// não de rosters.
function addExtraDef(result: { current: ReturnType<typeof useCareerManager> }, teamId: string): string {
  let extraId = '';
  act(() => {
    result.current.setCareerState(prev => {
      if (!prev) return prev;
      const patchTeam = (t: Team): Team => {
        if (t.id !== teamId) return t;
        const def = t.squad.find(p => p.position === 'DEF')!;
        extraId = `${def.id}-extra`;
        return { ...t, squad: [...t.squad, { ...def, id: extraId }] };
      };
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: prev.rosters[prev.leagueId].map(patchTeam) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: prev.season.league.teams.map(patchTeam) },
          cup: { ...prev.season.cup, teams: prev.season.cup.teams.map(patchTeam) },
        },
      };
    });
  });
  return extraId;
}

function seedTransferOffer(
  result: { current: ReturnType<typeof useCareerManager> },
  meta: { playerId: string; offeringTeamId: string; amount: number },
) {
  act(() => {
    result.current.setCareerState(prev => prev && ({
      ...prev,
      inbox: [...(prev.inbox ?? []), {
        id: 'offer-1', date: 'T1', isRead: false, isMandatory: true as const, type: 'TRANSFER_OFFER' as const,
        subject: 'Proposta de teste', body: 'Corpo de teste', meta,
      }],
    }));
  });
}

describe('handleBuyPlayer', () => {
  it('compra bem-sucedida: orçamento cai, jogador muda de time em rosters e season.league.teams, TransferRecord adicionado', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    // assignInitialAges (rodado dentro de handleStartCareer pra jogadores estáticos sem
    // idade fixa) usa Math.random sem seed — em idade baixa (≤21) o ageMultiplier de
    // calculateMarketValue sobe pra 1.5x, o que ocasionalmente empurrava até a oferta
    // premium (1.5x o valor de mercado) pra acima do orçamento da PL, tornando esse teste
    // flaky. Fixa em 0.99 (idade máxima, ageMultiplier mínimo) só durante o setup, pra
    // garantir a margem de orçamento que o teste assume.
    const ageSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);
    ageSpy.mockRestore();

    const oppTeam = result.current.careerState!.rosters[leagueId].find(t => t.id === opponentTeamId)!;
    const player = oppTeam.squad.find(p => oppTeam.squad.filter(q => q.position === p.position).length > 2)!;
    const amount = Math.ceil((player.marketValue ?? 0) * 1.5); // premium-offer — aceite garantido, determinístico
    const budgetBefore = result.current.careerState!.finances!.budget;

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleBuyPlayer(player.id, opponentTeamId, amount);
    });

    expect(res).toEqual({ success: true, reason: 'premium-offer' });
    const after = result.current.careerState!;
    expect(after.finances!.budget).toBe(budgetBefore - amount);

    for (const teams of [after.rosters[leagueId], after.season.league.teams]) {
      const userTeamAfter = teams.find(t => t.id === userTeamId)!;
      const oppTeamAfter = teams.find(t => t.id === opponentTeamId)!;
      expect(userTeamAfter.squad.some(p => p.id === player.id)).toBe(true);
      expect(oppTeamAfter.squad.some(p => p.id === player.id)).toBe(false);
    }
    expect(after.transferHistory).toHaveLength(1);
    expect(after.transferHistory![0]).toMatchObject({ type: 'BUY', playerName: player.name, amount });
  });

  it('rejeita oferta abaixo do valor mínimo e não muda nada no estado', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, opponentTeamId } = startPlCareer(result);
    const before = result.current.careerState!;
    const oppTeam = before.rosters[leagueId].find(t => t.id === opponentTeamId)!;
    const player = oppTeam.squad.find(p => oppTeam.squad.filter(q => q.position === p.position).length > 2)!;
    const lowAmount = Math.floor((player.marketValue ?? 0) * 0.5);

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleBuyPlayer(player.id, opponentTeamId, lowAmount);
    });

    expect(res).toEqual({ success: false, reason: 'too-low' });
    expect(result.current.careerState).toBe(before);
  });

  it('bloqueia compra quando a janela de transferências está fechada', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, opponentTeamId } = startPlCareer(result);
    act(() => {
      result.current.setCareerState(prev => prev && ({
        ...prev, season: { ...prev.season, league: { ...prev.season.league, currentRound: 10 } },
      }));
    });
    const oppTeam = result.current.careerState!.rosters[leagueId].find(t => t.id === opponentTeamId)!;
    const player = oppTeam.squad[0];

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleBuyPlayer(player.id, opponentTeamId, (player.marketValue ?? 0) * 2);
    });

    expect(res).toEqual({ success: false, reason: 'window-closed' });
  });

  it('bloqueia compra quando o valor excede o orçamento', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, opponentTeamId } = startPlCareer(result);
    const oppTeam = result.current.careerState!.rosters[leagueId].find(t => t.id === opponentTeamId)!;
    const player = oppTeam.squad[0];
    const budget = result.current.careerState!.finances!.budget;

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleBuyPlayer(player.id, opponentTeamId, budget + 1_000_000);
    });

    expect(res).toEqual({ success: false, reason: 'insufficient-budget' });
  });

  it('bloqueia venda do último jogador do vendedor numa posição (ex: único goleiro)', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, opponentTeamId } = startPlCareer(result);
    stripToOnePlayerAtPosition(result, opponentTeamId, 'GK');
    const oppTeam = result.current.careerState!.rosters[leagueId].find(t => t.id === opponentTeamId)!;
    const gk = oppTeam.squad.find(p => p.position === 'GK')!;

    // handleBuyPlayer checa orçamento ANTES da guarda de posição. Os valores de mercado
    // são gerados aleatoriamente, então 2× pode estourar o orçamento e devolver
    // 'insufficient-budget' — limita a oferta ao caixa pra isolar a guarda de posição.
    const budget = result.current.careerState!.finances!.budget;
    const offer = Math.min((gk.marketValue ?? 0) * 2, budget);

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleBuyPlayer(gk.id, opponentTeamId, offer);
    });

    expect(res).toEqual({ success: false, reason: 'seller-last-at-position' });
  });
});

describe('handleListPlayerForSale / handleUnlistPlayerForSale', () => {
  it('coloca um jogador do próprio elenco na lista de venda', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);
    const extraId = addExtraDef(result, userTeamId);

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleListPlayerForSale(extraId);
    });

    expect(res).toEqual({ success: true, reason: 'listed' });
    expect(result.current.careerState!.transferListPlayerIds).toEqual([extraId]);
  });

  it('rejeita listar o mesmo jogador 2 vezes', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);
    const extraId = addExtraDef(result, userTeamId);
    act(() => { result.current.handleListPlayerForSale(extraId); });

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleListPlayerForSale(extraId);
    });

    expect(res).toEqual({ success: false, reason: 'already-listed' });
    expect(result.current.careerState!.transferListPlayerIds).toEqual([extraId]);
  });

  it('bloqueia listar o único jogador do usuário numa posição', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    stripToOnePlayerAtPosition(result, userTeamId, 'GK');
    const gk = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad.find(p => p.position === 'GK')!;

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleListPlayerForSale(gk.id);
    });

    expect(res).toEqual({ success: false, reason: 'last-at-position' });
    expect(result.current.careerState!.transferListPlayerIds ?? []).toEqual([]);
  });

  it('retira um jogador da lista de venda', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);
    const extraId = addExtraDef(result, userTeamId);
    act(() => { result.current.handleListPlayerForSale(extraId); });
    expect(result.current.careerState!.transferListPlayerIds).toEqual([extraId]);

    act(() => {
      result.current.handleUnlistPlayerForSale(extraId);
    });

    expect(result.current.careerState!.transferListPlayerIds).toEqual([]);
  });
});

describe('handleSignFreeAgent', () => {
  it('contrata um agente livre: orçamento cai pela luva, jogador entra no elenco e sai do pool', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    const player = result.current.careerState!.freeAgentPool![0];
    const budgetBefore = result.current.careerState!.finances!.budget;
    const signingBonus = 200_000;

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleSignFreeAgent(player.id, signingBonus);
    });

    expect(res).toEqual({ success: true, reason: 'signed' });
    const after = result.current.careerState!;
    expect(after.finances!.budget).toBe(budgetBefore - signingBonus);
    expect(after.freeAgentPool!.some(p => p.id === player.id)).toBe(false);
    const userTeamAfter = after.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(userTeamAfter.squad.some(p => p.id === player.id)).toBe(true);
    expect(after.transferHistory!.some(r => r.type === 'SIGN_FREE_AGENT' && r.playerName === player.name)).toBe(true);
  });

  it('invalid-player quando o id não existe no pool', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    let res: { success: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleSignFreeAgent('jogador-inexistente', 0);
    });

    expect(res).toEqual({ success: false, reason: 'invalid-player' });
  });
});

describe('handleAcceptTransferOffer / handleRejectTransferOffer', () => {
  it('aceitar: orçamento sobe, jogador vai pro time ofertante, mensagem some, TransferRecord SELL adicionado', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);
    // O fixture de usuário (startPlCareer/makeTeam) só tem 1 jogador por posição — qualquer
    // venda seria bloqueada pela guarda de "último na posição". Duplica o DEF pra ter uma
    // venda válida sem acionar a guarda (guarda coberta por um teste dedicado abaixo).
    act(() => {
      result.current.setCareerState(prev => {
        if (!prev) return prev;
        const patchTeam = (t: Team): Team => {
          if (t.id !== userTeamId) return t;
          const def = t.squad.find(p => p.position === 'DEF')!;
          return { ...t, squad: [...t.squad, { ...def, id: `${def.id}-extra` }] };
        };
        return { ...prev, rosters: { ...prev.rosters, [prev.leagueId]: prev.rosters[prev.leagueId].map(patchTeam) } };
      });
    });
    const userTeam = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!;
    const player = userTeam.squad.find(p => p.id.endsWith('-extra'))!;
    const amount = 5_000_000;
    seedTransferOffer(result, { playerId: player.id, offeringTeamId: opponentTeamId, amount });
    const budgetBefore = result.current.careerState!.finances!.budget;

    act(() => {
      result.current.handleAcceptTransferOffer('offer-1');
    });

    const after = result.current.careerState!;
    // Board Strictness: a diretoria retém 20% — o budget sobe só 80% do valor bruto.
    expect(after.finances!.budget).toBe(budgetBefore + netSellRevenue(amount));
    expect(after.inbox!.some(m => m.id === 'offer-1')).toBe(false);
    const userTeamAfter = after.rosters[leagueId].find(t => t.id === userTeamId)!;
    const oppTeamAfter = after.rosters[leagueId].find(t => t.id === opponentTeamId)!;
    expect(userTeamAfter.squad.some(p => p.id === player.id)).toBe(false);
    expect(oppTeamAfter.squad.some(p => p.id === player.id)).toBe(true);
    // TransferRecord.amount continua bruto (o que o comprador pagou) — retenção é só no budget.
    expect(after.transferHistory!.some(r => r.type === 'SELL' && r.amount === amount)).toBe(true);
  });

  it('recusar: mensagem some, nenhuma mudança financeira ou de elenco', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);
    const userTeam = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!;
    const player = userTeam.squad[0];
    seedTransferOffer(result, { playerId: player.id, offeringTeamId: opponentTeamId, amount: 5_000_000 });
    const budgetBefore = result.current.careerState!.finances!.budget;

    act(() => {
      result.current.handleRejectTransferOffer('offer-1');
    });

    const after = result.current.careerState!;
    expect(after.finances!.budget).toBe(budgetBefore);
    expect(after.inbox!.some(m => m.id === 'offer-1')).toBe(false);
    const userTeamAfter = after.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(userTeamAfter.squad.some(p => p.id === player.id)).toBe(true);
  });

  it('aceitar uma oferta obsoleta (jogador não existe mais) só descarta a mensagem, sem crash nem mutação financeira', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { opponentTeamId } = startPlCareer(result);
    seedTransferOffer(result, { playerId: 'jogador-fantasma', offeringTeamId: opponentTeamId, amount: 5_000_000 });
    const budgetBefore = result.current.careerState!.finances!.budget;

    act(() => {
      result.current.handleAcceptTransferOffer('offer-1');
    });

    const after = result.current.careerState!;
    expect(after.finances!.budget).toBe(budgetBefore);
    expect(after.inbox!.some(m => m.id === 'offer-1')).toBe(false);
  });

  it('bloqueia venda do último jogador do usuário numa posição', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);
    stripToOnePlayerAtPosition(result, userTeamId, 'GK');
    const userTeam = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!;
    const gk = userTeam.squad.find(p => p.position === 'GK')!;
    seedTransferOffer(result, { playerId: gk.id, offeringTeamId: opponentTeamId, amount: 5_000_000 });
    const budgetBefore = result.current.careerState!.finances!.budget;

    act(() => {
      result.current.handleAcceptTransferOffer('offer-1');
    });

    const after = result.current.careerState!;
    expect(after.finances!.budget).toBe(budgetBefore);
    expect(after.inbox!.some(m => m.id === 'offer-1')).toBe(false);
    const userTeamAfter = after.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(userTeamAfter.squad.some(p => p.id === gk.id)).toBe(true);
  });

  it('aceitar oferta de um time de OUTRA liga: jogador sai só de rosters[liga do usuário]/season, e entra em rosters[outra liga] — sem tocar season.league/cup.teams', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);
    const player = { id: addExtraDef(result, userTeamId) };
    const leagueId = result.current.careerState!.leagueId;
    const foreignTeam = result.current.careerState!.rosters['laliga'][0];
    const amount = 5_000_000;
    seedTransferOffer(result, { playerId: player.id, offeringTeamId: foreignTeam.id, amount });
    const budgetBefore = result.current.careerState!.finances!.budget;

    act(() => {
      result.current.handleAcceptTransferOffer('offer-1');
    });

    const after = result.current.careerState!;
    expect(after.finances!.budget).toBe(budgetBefore + netSellRevenue(amount));
    expect(after.inbox!.some(m => m.id === 'offer-1')).toBe(false);

    const userTeamAfter = after.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(userTeamAfter.squad.some(p => p.id === player.id)).toBe(false);
    expect(after.season.league.teams.find(t => t.id === userTeamId)!.squad.some(p => p.id === player.id)).toBe(false);
    expect(after.season.cup.teams.find(t => t.id === userTeamId)!.squad.some(p => p.id === player.id)).toBe(false);

    const foreignTeamAfter = after.rosters['laliga'].find(t => t.id === foreignTeam.id)!;
    expect(foreignTeamAfter.squad.some(p => p.id === player.id)).toBe(true);
    // A liga estrangeira nunca faz parte de season.league/cup.teams — só rosters.
    expect(after.season.league.teams.some(t => t.id === foreignTeam.id)).toBe(false);
    expect(after.transferHistory!.some(r => r.type === 'SELL' && r.toTeam === foreignTeam.name)).toBe(true);
  });

  it('vender um jogador que estava na lista de venda o remove da lista', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId, opponentTeamId } = startPlCareer(result);
    const extraId = addExtraDef(result, userTeamId);
    act(() => { result.current.handleListPlayerForSale(extraId); });
    expect(result.current.careerState!.transferListPlayerIds).toEqual([extraId]);
    seedTransferOffer(result, { playerId: extraId, offeringTeamId: opponentTeamId, amount: 5_000_000 });

    act(() => {
      result.current.handleAcceptTransferOffer('offer-1');
    });

    expect(result.current.careerState!.transferListPlayerIds).toEqual([]);
  });
});

describe('handleProposeTrade com dinheiro', () => {
  it('cashOffered maior que o orçamento é rejeitado sem consumir uma troca', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);
    const userSquad = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad;
    const oppSquad = result.current.careerState!.rosters[leagueId].find(t => t.id === opponentTeamId)!.squad;
    const budget = result.current.careerState!.finances!.budget;

    let res: { accepted: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleProposeTrade(userSquad[0].id, opponentTeamId, oppSquad[0].id, budget + 1);
    });

    expect(res).toEqual({ accepted: false, reason: 'insufficient-budget' });
    expect(result.current.careerState!.season.tradesUsedThisSeason).toBe(0);
  });

  it('troca aceita com dinheiro debita o orçamento e registra um TransferRecord TRADE', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId, opponentTeamId } = startPlCareer(result);
    const userSquad = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad;
    const oppSquad = result.current.careerState!.rosters[leagueId].find(t => t.id === opponentTeamId)!.squad;
    const budgetBefore = result.current.careerState!.finances!.budget;
    const cashOffered = 1_000_000;

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    let res: { accepted: boolean; reason: string } | undefined;
    act(() => {
      res = result.current.handleProposeTrade(userSquad[0].id, opponentTeamId, oppSquad[0].id, cashOffered);
    });
    randomSpy.mockRestore();

    expect(res!.accepted).toBe(true);
    const after = result.current.careerState!;
    expect(after.finances!.budget).toBe(budgetBefore - cashOffered);
    expect(after.transferHistory!.some(r => r.type === 'TRADE' && r.amount === cashOffered)).toBe(true);
  });
});

describe('ofertas de transferência da CPU (abertura de janela)', () => {
  it('gera uma oferta obrigatória com meta válido quando o roll de 30% é favorável', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);

    // Deixa um titular não-goleiro do usuário artificialmente muito forte, pra
    // garantir que ele bata a média de qualquer time CPU, independente de qual for sorteado.
    const boostedAttrs = { speed: 99, stamina: 99, passing: 99, finishing: 99, tackling: 99, dribbling: 99, vision: 99, positioning: 99 };
    act(() => {
      result.current.setCareerState(prev => {
        if (!prev) return prev;
        const patchTeam = (t: Team): Team => t.id !== userTeamId ? t : {
          ...t,
          squad: t.squad.map((p, i) => (i === 1 && p.position !== 'GK') ? { ...p, attributes: boostedAttrs } : p),
        };
        return {
          ...prev,
          season: {
            ...prev.season,
            league: { ...prev.season.league, currentRound: 17, teams: prev.season.league.teams.map(patchTeam) },
          },
        };
      });
    });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01); // sempre passa o roll de 0.3 e pega o 1º candidato
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    randomSpy.mockRestore();

    const inbox = result.current.careerState!.inbox!;
    const offer = inbox.find(m => m.type === 'TRANSFER_OFFER');
    expect(offer).toBeDefined();
    expect(offer!.isMandatory).toBe(true);
    expect(offer!.meta).toBeDefined();
    expect(offer!.meta!.amount).toBeGreaterThan(0);
  });

  it('sem sorte no roll de 30%, nenhuma oferta aparece (só a mensagem de janela aberta)', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);
    act(() => {
      result.current.setCareerState(prev => prev && ({
        ...prev, season: { ...prev.season, league: { ...prev.season.league, currentRound: 17 } },
      }));
    });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99); // sempre falha o roll de 0.3
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    randomSpy.mockRestore();

    const inbox = result.current.careerState!.inbox!;
    expect(inbox.some(m => m.type === 'TRANSFER_OFFER')).toBe(false);
    expect(inbox.some(m => m.subject.includes('Janela'))).toBe(true);
  });
});

describe('ofertas de transferência por jogadores na lista de venda (todo round com a janela aberta)', () => {
  it('gera oferta pro jogador listado quando o roll de 35% é favorável — o time ofertante nunca é o do usuário', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);
    const extraId = addExtraDef(result, userTeamId);
    act(() => { result.current.handleListPlayerForSale(extraId); });
    expect(result.current.careerState!.transferListPlayerIds).toEqual([extraId]);

    // Round 0 já está dentro da janela (rodadas 1-5) desde o início da carreira — não
    // precisa forçar currentRound=17 como no teste de oferta espontânea, que só dispara
    // na TRANSIÇÃO de fechada→aberta. O sorteio por jogador listado roda em toda rodada
    // com a janela aberta, incluindo a primeira.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01); // passa o roll de 0.35, pega o 1º candidato do pool
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    randomSpy.mockRestore();

    const inbox = result.current.careerState!.inbox!;
    const offer = inbox.find(m => m.type === 'TRANSFER_OFFER' && m.meta?.playerId === extraId);
    expect(offer).toBeDefined();
    expect(offer!.meta!.offeringTeamId).not.toBe(userTeamId);
    expect(offer!.meta!.amount).toBeGreaterThan(0);
  });

  it('sem sorte no roll de 35%, nenhuma oferta aparece pro jogador listado', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);
    const extraId = addExtraDef(result, userTeamId);
    act(() => { result.current.handleListPlayerForSale(extraId); });
    expect(result.current.careerState!.transferListPlayerIds).toEqual([extraId]);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.99); // sempre falha o roll de 0.35
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    randomSpy.mockRestore();

    const inbox = result.current.careerState!.inbox!;
    expect(inbox.some(m => m.type === 'TRANSFER_OFFER' && m.meta?.playerId === extraId)).toBe(false);
  });

  it('não gera 2ª oferta pro mesmo jogador listado enquanto a 1ª ainda não foi decidida', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId, opponentTeamId } = startPlCareer(result);
    const extraId = addExtraDef(result, userTeamId);
    act(() => { result.current.handleListPlayerForSale(extraId); });
    expect(result.current.careerState!.transferListPlayerIds).toEqual([extraId]);
    seedTransferOffer(result, { playerId: extraId, offeringTeamId: opponentTeamId, amount: 5_000_000 });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01); // passaria o roll se checasse de novo
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    randomSpy.mockRestore();

    const offersForPlayer = result.current.careerState!.inbox!.filter(m => m.type === 'TRANSFER_OFFER' && m.meta?.playerId === extraId);
    expect(offersForPlayer).toHaveLength(1);
  });

  it('não gera oferta pra um jogador que não está na lista de venda', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    const unlisted = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad[0];

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    act(() => {
      result.current.handleNextCareerLeagueRound();
    });
    randomSpy.mockRestore();

    const inbox = result.current.careerState!.inbox!;
    expect(inbox.some(m => m.type === 'TRANSFER_OFFER' && m.meta?.playerId === unlisted.id)).toBe(false);
  });
});

// Fase 1 — Contratos & Renovações
function setContractFor(result: { current: ReturnType<typeof useCareerManager> }, playerId: string, seasons: number) {
  act(() => {
    result.current.setCareerState(prev => {
      if (!prev) return prev;
      const patchSquad = (squad: Player[]) => squad.map(p => p.id === playerId ? { ...p, contractSeasonsLeft: seasons } : p);
      const patchTeam = (t: Team): Team => t.id === prev.season.league.userTeamId ? { ...t, squad: patchSquad(t.squad) } : t;
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: prev.rosters[prev.leagueId].map(patchTeam) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: prev.season.league.teams.map(patchTeam) },
          cup: { ...prev.season.cup, teams: prev.season.cup.teams.map(patchTeam) },
        },
      };
    });
  });
}

describe('handleRenewContract (Fase 1)', () => {
  // Oferta que satisfaz o pedido do jogador — salário que cobre a demanda anual.
  function acceptableOffer(player: Player, years = 1): { years: number; weeklyWage: number } {
    const marketValue = player.marketValue ?? calculateMarketValue(player);
    const weeklyWage = Math.ceil((marketValue * 0.11 * 1.15) / 52 / 100) * 100;
    return { years, weeklyWage };
  }

  it('renova: estende o contrato, debita o custo e atualiza os 3 espelhos', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    const playerId = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad[0].id;
    setContractFor(result, playerId, 1);

    const beforePlayer = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad.find(p => p.id === playerId)!;
    const options = acceptableOffer(beforePlayer, 2);
    const cost = renewalCost(beforePlayer, 2);
    const budgetBefore = getFinances(result.current.careerState!).budget;

    act(() => { result.current.handleRenewContract(playerId, options); });

    const after = result.current.careerState!;
    const afterPlayer = after.rosters[leagueId].find(t => t.id === userTeamId)!.squad.find(p => p.id === playerId)!;
    expect(afterPlayer.contractSeasonsLeft).toBe(3);
    expect(afterPlayer.lastRenewedSeasonYear).toBe(after.currentSeasonYear);
    expect(getFinances(after).budget).toBe(budgetBefore - cost);
    for (const mirror of [after.season.league.teams, after.season.cup.teams]) {
      const mirrored = mirror.find(t => t.id === userTeamId)!.squad.find(p => p.id === playerId)!;
      expect(mirrored.contractSeasonsLeft).toBe(3);
    }
  });

  it('bloqueia renovar na mesma temporada da última renovação (1 safra de espera)', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { leagueId, userTeamId } = startPlCareer(result);
    const playerId = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad[0].id;
    setContractFor(result, playerId, 3);
    // Simula renovação na safra atual.
    act(() => {
      result.current.setCareerState(prev => {
        if (!prev) return prev;
        const patchSquad = (squad: Player[]) => squad.map(p => p.id === playerId ? { ...p, lastRenewedSeasonYear: prev.currentSeasonYear } : p);
        const patchTeam = (t: Team): Team => t.id === prev.season.league.userTeamId ? { ...t, squad: patchSquad(t.squad) } : t;
        return {
          ...prev,
          rosters: { ...prev.rosters, [prev.leagueId]: prev.rosters[prev.leagueId].map(patchTeam) },
          season: {
            ...prev.season,
            league: { ...prev.season.league, teams: prev.season.league.teams.map(patchTeam) },
            cup: { ...prev.season.cup, teams: prev.season.cup.teams.map(patchTeam) },
          },
        };
      });
    });
    const beforePlayer = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad.find(p => p.id === playerId)!;
    const options = acceptableOffer(beforePlayer);
    const budgetBefore = getFinances(result.current.careerState!).budget;

    act(() => { result.current.handleRenewContract(playerId, options); });

    expect(getFinances(result.current.careerState!).budget).toBe(budgetBefore);
    expect(params.setToastMsg).toHaveBeenCalled();
  });

  it('recusa quando a proposta não satisfaz o jogador (negociação)', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { leagueId, userTeamId } = startPlCareer(result);
    const playerId = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad[0].id;
    setContractFor(result, playerId, 1);

    act(() => { result.current.handleRenewContract(playerId, { years: 1, weeklyWage: 100 }); });

    const player = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad.find(p => p.id === playerId)!;
    expect(player.contractSeasonsLeft).toBe(1);
    expect(params.setToastMsg).toHaveBeenCalled();
  });

  it('sem orçamento, não renova e avisa via toast', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { leagueId, userTeamId } = startPlCareer(result);
    const playerId = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad[0].id;
    setContractFor(result, playerId, 1);
    act(() => {
      result.current.setCareerState(prev => prev && ({ ...prev, finances: { ...getFinances(prev), budget: 0 } }));
    });
    const beforePlayer = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad.find(p => p.id === playerId)!;
    const options = acceptableOffer(beforePlayer);

    act(() => { result.current.handleRenewContract(playerId, options); });

    const player = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad.find(p => p.id === playerId)!;
    expect(player.contractSeasonsLeft).toBe(1);
    expect(params.setToastMsg).toHaveBeenCalled();
  });

  it('jogador inexistente é no-op', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { leagueId, userTeamId } = startPlCareer(result);
    const budgetBefore = getFinances(result.current.careerState!).budget;

    act(() => { result.current.handleRenewContract('nao-existe', { years: 1, weeklyWage: 1_000 }); });

    expect(getFinances(result.current.careerState!).budget).toBe(budgetBefore);
    expect(result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad.length).toBeGreaterThan(0);
    expect(params.setToastMsg).not.toHaveBeenCalled();
  });
});

describe('handleAdvanceSeason expira contratos (Fase 1)', () => {
  // A evolução de elenco (progressAllLeagues) aposenta jogadores 34+ de forma
  // probabilística via Math.random. Estes testes fixam UM jogador específico e
  // checam que ele sobrevive à temporada com o contrato decrementado. Sem travar
  // o RNG, quando esse jogador é 34+ a aposentadoria dispara de vez em quando e o
  // teste fica flaky (dependente da ordem de execução, já que Math.random não é
  // semeado por arquivo). Travamos em 0.999 — acima da chance máxima de
  // aposentadoria (0.9) — para garantir determinismo sem depender de idade/ordem.
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
  });

  it('remove quem chegou a 0 do elenco, coloca no mercado e gera a mensagem de saída', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    const player = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad[0];
    setContractFor(result, player.id, 1);
    forceTerminalSeason(result);

    act(() => { result.current.handleAdvanceSeason(); });

    const after = result.current.careerState!;
    const userSquad = after.rosters[leagueId].find(t => t.id === userTeamId)!.squad;
    expect(userSquad.some(p => p.id === player.id)).toBe(false);
    expect(getFreeAgentPool(after).some(p => p.id === player.id)).toBe(true);
    const departureMsg = after.inbox!.find(m => m.subject === 'Contratos encerrados');
    expect(departureMsg).toBeDefined();
    expect(departureMsg!.body).toContain(player.name);
  });

  it('decrementa o contrato dos que ficam e avisa quem vence na próxima temporada', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    const player = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad[0];
    setContractFor(result, player.id, 2);
    forceTerminalSeason(result);

    act(() => { result.current.handleAdvanceSeason(); });

    const after = result.current.careerState!;
    const afterPlayer = after.rosters[leagueId].find(t => t.id === userTeamId)!.squad.find(p => p.id === player.id);
    expect(afterPlayer).toBeDefined();
    expect(afterPlayer!.contractSeasonsLeft).toBe(1);
    const expiringMsg = after.inbox!.find(m => m.subject === 'Contratos a expirar');
    expect(expiringMsg).toBeDefined();
    expect(expiringMsg!.body).toContain(player.name);
  });
});

describe('Copas Continentais (integração no avanço de temporada)', () => {
  // Move o time do usuário para um índice de league.teams. Com nenhuma partida
  // jogada, computeStandings desempata pela ordem do array (sort estável), então
  // o índice vira a posição final — controle determinístico da classificação.
  function placeUserAt(result: { current: ReturnType<typeof useCareerManager> }, index: number) {
    act(() => {
      result.current.setCareerState(prev => {
        if (!prev) return prev;
        const teams = [...prev.season.league.teams];
        const userIdx = teams.findIndex(t => t.id === prev.season.league.userTeamId);
        const [u] = teams.splice(userIdx, 1);
        teams.splice(index, 0, u);
        return { ...prev, season: { ...prev.season, league: { ...prev.season.league, teams } } };
      });
    });
  }

  it('1º lugar na PL classifica pra Liga dos Campeões e monta o bracket com o usuário', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);
    placeUserAt(result, 0);
    forceTerminalSeason(result);
    act(() => { result.current.handleAdvanceSeason(); });

    const season = result.current.careerState!.season;
    expect(season.continentalCupId).toBe('ucl');
    expect(season.continentalCup).toBeDefined();
    expect(season.continentalCup!.teams).toHaveLength(16);
    expect(season.continentalCup!.teams.some(t => t.id === userTeamId)).toBe(true);
    expect(result.current.careerState!.inbox!.some(m => /Liga dos Campeões/.test(m.subject))).toBe(true);
  });

  it('última posição na PL não classifica (sem copa continental)', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);
    const teamCount = result.current.careerState!.season.league.teams.length;
    placeUserAt(result, teamCount - 1);
    forceTerminalSeason(result);
    act(() => { result.current.handleAdvanceSeason(); });

    expect(result.current.careerState!.season.continentalCup).toBeUndefined();
    expect(result.current.careerState!.season.continentalCupId).toBeUndefined();
  });

  it('vencer a copa continental credita a premiação ao fim da temporada', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    const uclDef = getContinentalCup('ucl')!;
    const rosters = result.current.careerState!.rosters;
    const userTeam = rosters[leagueId].find(t => t.id === userTeamId)!;
    const pool = getQualifiedTeams(rosters, allLeagues, uclDef, userTeamId);
    const bracket = { ...createContinentalBracket(userTeam, pool, uclDef, leagueId), stage: 'champion' as const, championId: userTeamId };
    act(() => {
      result.current.setCareerState(prev => prev && ({
        ...prev,
        season: { ...prev.season, continentalCup: bracket, continentalCupId: 'ucl', continentalCupDef: uclDef },
      }));
    });
    forceTerminalSeason(result);
    act(() => { result.current.handleAdvanceSeason(); });

    // Premiação de campeão da UCL = €15.0M — a mensagem de resultado registra o valor.
    expect(result.current.careerState!.inbox!.some(m => m.body.includes('€15.0M'))).toBe(true);
  });

  it('vencer liga + copa + UCL na mesma temporada destrava Rei da Europa e a Tríplice Coroa', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { leagueId, userTeamId } = startPlCareer(result);
    const uclDef = getContinentalCup('ucl')!;
    const rosters = result.current.careerState!.rosters;
    const userTeam = rosters[leagueId].find(t => t.id === userTeamId)!;
    const pool = getQualifiedTeams(rosters, allLeagues, uclDef, userTeamId);
    const bracket = { ...createContinentalBracket(userTeam, pool, uclDef, leagueId), stage: 'champion' as const, championId: userTeamId };
    act(() => {
      result.current.setCareerState(prev => prev && ({
        ...prev,
        season: { ...prev.season, continentalCup: bracket, continentalCupId: 'ucl', continentalCupDef: uclDef },
      }));
    });
    placeUserAt(result, 0);        // 1º na liga
    forceTerminalSeason(result);   // copa doméstica: championId = userTeam
    act(() => { result.current.handleAdvanceSeason(); });

    const unlocked = params.unlockAchievement.mock.calls.map(c => c[0]);
    expect(unlocked).toContain('continental_participant');
    expect(unlocked).toContain('continental_champion');
    expect(unlocked).toContain('treble_winner');
  });
});

describe('Mercado de Treinador (Fase 2)', () => {
  it('aceitar oferta troca de clube/liga, preserva manager+histórico e limpa as ofertas', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { userTeamId } = startPlCareer(result);
    const before = result.current.careerState!;
    expect(before.season.league.userTeamId).toBe(userTeamId);

    const targetClub = before.rosters['laliga'][0];
    const offer = {
      id: 'job-1', clubId: targetClub.id, leagueId: 'laliga', clubName: targetClub.name,
      reputationRequired: 0, offeredSeasonYear: before.currentSeasonYear,
    };
    act(() => { result.current.setCareerState(prev => prev && ({ ...prev, jobOffers: [offer] })); });

    params.setScreen.mockClear();
    act(() => { result.current.handleAcceptJobOffer('job-1'); });

    const after = result.current.careerState!;
    expect(after.leagueId).toBe('laliga');
    expect(after.season.league.userTeamId).toBe(targetClub.id);
    expect(after.manager.name).toBe('Alex');
    expect(after.currentSeasonYear).toBe(before.currentSeasonYear);
    expect(after.history).toEqual(before.history);
    expect(getJobOffers(after)).toEqual([]);
    expect(params.setScreen).toHaveBeenCalledWith('career-hub');
    expect(params.setToastMsg).toHaveBeenCalled();
  });

  it('recusar oferta remove apenas ela, sem mexer no resto', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { userTeamId } = startPlCareer(result);
    const before = result.current.careerState!;
    const targetClub = before.rosters['serieA'][0];
    const offer = {
      id: 'job-1', clubId: targetClub.id, leagueId: 'serieA', clubName: targetClub.name,
      reputationRequired: 0, offeredSeasonYear: before.currentSeasonYear,
    };
    act(() => { result.current.setCareerState(prev => prev && ({ ...prev, jobOffers: [offer] })); });

    act(() => { result.current.handleDeclineJobOffer('job-1'); });

    expect(getJobOffers(result.current.careerState!)).toEqual([]);
    expect(result.current.careerState!.leagueId).toBe(before.leagueId);
    expect(result.current.careerState!.season.league.userTeamId).toBe(userTeamId);
  });

  it('aceitar oferta inválida não derruba e avisa via toast', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    startPlCareer(result);
    // handleStartCareer já navega pra career-hub — limpa pra isolar o aceite.
    params.setScreen.mockClear();
    act(() => { result.current.setCareerState(prev => prev && ({
      ...prev,
      jobOffers: [{ id: 'job-x', clubId: 'nao-existe', leagueId: 'pl', clubName: 'X', reputationRequired: 0, offeredSeasonYear: 1 }],
    })); });

    act(() => { result.current.handleAcceptJobOffer('job-x'); });

    expect(result.current.careerState!.leagueId).toBe('pl');
    expect(params.setToastMsg).toHaveBeenCalled();
    expect(params.setScreen).not.toHaveBeenCalled();
  });
});

describe('Conversas com Atletas (Fase 4)', () => {
  it('responder conversa aplica moraleDelta no time (3 espelhos) e marca como respondida', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { leagueId, userTeamId } = startPlCareer(result);
    act(() => { result.current.setCareerState(prev => prev && ({
      ...prev,
      playerConversations: [{
        id: 'c1', playerId: 'user-fwd1', playerName: 'Atacante', topic: 'praise',
        message: 'Que fase!', seasonYear: 1, round: 0, responded: false,
      }],
    })); });

    const moraleBefore = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.morale ?? 0;

    act(() => { result.current.handleRespondConversation('c1', 0); }); // apoiar → +2

    const after = result.current.careerState!;
    const rosterTeam = after.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(rosterTeam.morale).toBe(moraleBefore + 2);
    // Espelhos: liga e copa também recebem o delta.
    expect(after.season.league.teams.find(t => t.id === userTeamId)!.morale).toBe(moraleBefore + 2);
    expect(after.season.cup.teams.find(t => t.id === userTeamId)!.morale).toBe(moraleBefore + 2);
    expect(getPlayerConversations(after).find(c => c.id === 'c1')!.responded).toBe(true);
    expect(params.setToastMsg).toHaveBeenCalled();
  });

  it('responder com resposta dura (idx 2) aplica -2', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    act(() => { result.current.setCareerState(prev => prev && ({
      ...prev,
      playerConversations: [{
        id: 'c2', playerId: 'user-fwd1', playerName: 'Atacante', topic: 'form',
        message: 'Má fase', seasonYear: 1, round: 0, responded: false,
      }],
    })); });

    act(() => { result.current.handleRespondConversation('c2', 2); });

    const after = result.current.careerState!;
    const rosterTeam = after.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(rosterTeam.morale).toBe(-2);
    expect(getPlayerConversations(after).find(c => c.id === 'c2')!.responded).toBe(true);
  });

  it('conversa já respondida é no-op (não reaplica moral)', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { leagueId, userTeamId } = startPlCareer(result);
    act(() => { result.current.setCareerState(prev => prev && ({
      ...prev,
      playerConversations: [{
        id: 'c3', playerId: 'user-fwd1', playerName: 'Atacante', topic: 'praise',
        message: 'Que fase!', seasonYear: 1, round: 0, responded: true,
      }],
    })); });
    const moraleBefore = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.morale ?? 0;

    act(() => { result.current.handleRespondConversation('c3', 0); });

    const rosterTeam = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(rosterTeam.morale ?? 0).toBe(moraleBefore);
    expect(params.setToastMsg).not.toHaveBeenCalled();
  });

  it('conversa inexistente é no-op', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    startPlCareer(result);

    act(() => { result.current.handleRespondConversation('nao-existe', 0); });

    expect(params.setToastMsg).not.toHaveBeenCalled();
  });

  it('save sem o campo playerConversations não quebra (getter backfill)', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);
    // Remove o campo pra simular save antigo.
    act(() => { result.current.setCareerState(prev => prev && ({
      ...prev,
      playerConversations: undefined,
    })); });
    expect(getPlayerConversations(result.current.careerState!)).toEqual([]);
  });

  it('avanço de rodada pode gerar conversa de contrato (contrato ≤1 no elenco)', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    const player = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad[0];
    setContractFor(result, player.id, 1);

    // Math.random baixa: passa o gate de 45% e escolhe o sinal estrutural.
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.01);
    act(() => { result.current.handleNextCareerLeagueRound(); });
    randomSpy.mockRestore();

    const convs = getPlayerConversations(result.current.careerState!);
    expect(convs.length).toBe(1);
    expect(convs[0].topic).toBe('contract');
    // O atleta escolhido tem contrato ≤1 no elenco (pode ser o GK setado ou outro).
    const convPlayer = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!.squad.find(p => p.id === convs[0].playerId);
    expect(convPlayer).toBeDefined();
    expect(convPlayer!.contractSeasonsLeft ?? 2).toBeLessThanOrEqual(1);
  });

  it('avanço de rodada sem sinal estrutural e com Math.random alta não gera conversa', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.9);
    act(() => { result.current.handleNextCareerLeagueRound(); });
    randomSpy.mockRestore();

    expect(getPlayerConversations(result.current.careerState!)).toEqual([]);
  });
});

describe('Imersão pré-jogo (Fase 3)', () => {
  function getRosterTeam(result: { current: ReturnType<typeof useCareerManager> }) {
    const st = result.current.careerState!;
    return st.rosters[st.leagueId].find(t => t.id === st.season.league.userTeamId)!;
  }

  it('treino Intenso: moral +3 e fadiga +25 nos 3 espelhos, marca rodada', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    startPlCareer(result);

    const before = getRosterTeam(result);
    const beforeMorale = before.morale ?? 0;
    const beforeFatigue = before.squad[0].currentFatigue;

    act(() => { result.current.handleApplyTraining('intense'); });

    const after = result.current.careerState!;
    const leagueId = after.leagueId;
    const userTeamId = after.season.league.userTeamId;
    const roster = after.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(roster.morale).toBe(beforeMorale + 3);
    expect(roster.squad[0].currentFatigue).toBe(beforeFatigue + 25);
    // Espelhos: liga e copa recebem o mesmo treino.
    expect(after.season.league.teams.find(t => t.id === userTeamId)!.morale).toBe(beforeMorale + 3);
    expect(after.season.cup.teams.find(t => t.id === userTeamId)!.squad[0].currentFatigue).toBe(beforeFatigue + 25);
    expect(after.preMatchDoneRound).toBe(after.season.league.currentRound);
    expect(params.setToastMsg).toHaveBeenCalled();
  });

  it('treino Descanso reduz fadiga sem cair abaixo de 0', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);

    act(() => { result.current.handleApplyTraining('rest'); });

    const after = getRosterTeam(result);
    expect(after.squad.every(p => p.currentFatigue >= 0)).toBe(true);
  });

  it('coletiva: abrir gera pergunta e responder aplica moraleDelta + marca rodada', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { leagueId, userTeamId } = startPlCareer(result);

    const opp = result.current.careerState!.rosters[leagueId].find(t => t.id !== userTeamId)!;
    act(() => { result.current.handleOpenPressConference(opp); });

    expect(result.current.pressQuestion).not.toBeNull();
    expect(result.current.pressQuestion!.responses.length).toBeGreaterThanOrEqual(2);

    const moraleBefore = getRosterTeam(result).morale ?? 0;
    act(() => { result.current.handleRespondPressConference(0); }); // +2

    const after = result.current.careerState!;
    const userTeam = after.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(userTeam.morale).toBe(moraleBefore + 2);
    expect(after.pressDoneRound).toBe(after.season.league.currentRound);
    expect(result.current.pressQuestion).toBeNull();
    expect(result.current.pressDone).toBe(true);
    expect(params.setToastMsg).toHaveBeenCalled();
  });

  it('responder com resposta dura (idx 2) aplica -2', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    const { leagueId, userTeamId } = startPlCareer(result);
    const opp = result.current.careerState!.rosters[leagueId].find(t => t.id !== userTeamId)!;
    act(() => { result.current.handleOpenPressConference(opp); });
    act(() => { result.current.handleRespondPressConference(2); });

    const userTeam = result.current.careerState!.rosters[leagueId].find(t => t.id === userTeamId)!;
    expect(userTeam.morale).toBe(-2);
  });

  it('coletiva fechada sem responder é no-op (sem moral, sem flag)', () => {
    const params = mockParams();
    const { result } = renderHook(() => useCareerManager(params));
    const { leagueId, userTeamId } = startPlCareer(result);
    const opp = result.current.careerState!.rosters[leagueId].find(t => t.id !== userTeamId)!;
    act(() => { result.current.handleOpenPressConference(opp); });
    const moraleBefore = getRosterTeam(result).morale ?? 0;

    act(() => { result.current.handleClosePressConference(); });

    expect(result.current.pressQuestion).toBeNull();
    expect(getRosterTeam(result).morale ?? 0).toBe(moraleBefore);
    expect(result.current.pressDone).toBe(false);
    expect(params.setToastMsg).not.toHaveBeenCalled();
  });

  it('avanço de temporada reseta os flags pré-jogo', () => {
    const { result } = renderHook(() => useCareerManager(mockParams()));
    startPlCareer(result);
    act(() => { result.current.setCareerState(prev => prev && ({
      ...prev, preMatchDoneRound: 5, pressDoneRound: 5,
    })); });

    forceTerminalSeason(result);
    act(() => { result.current.handleAdvanceSeason(); });

    expect(result.current.careerState!.preMatchDoneRound).toBeUndefined();
    expect(result.current.careerState!.pressDoneRound).toBeUndefined();
  });
});
