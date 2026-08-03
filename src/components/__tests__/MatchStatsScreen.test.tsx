// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MatchStatsScreen from '../MatchStatsScreen';
import type { MatchResult, MatchEvent, TeamStats } from '@/engine/types';
import type { MatchRecord } from '@/hooks/useMatchHistory';
import { testTeams } from './testFixtures';

const [home, away] = testTeams;

const emptyStats: TeamStats = { shots: 0, shotsOnTarget: 0, fouls: 0, yellowCards: 0, redCards: 0 };

function makeResult(overrides: Partial<MatchResult> = {}): MatchResult {
  const events: MatchEvent[] = [
    { minute: 10, type: 'goal', description: 'Gol!', teamId: home.id, scorer: 'Time A Atacante' },
    { minute: 55, type: 'goal', description: 'Gol!', teamId: home.id, scorer: 'Time A Atacante' },
    { minute: 30, type: 'yellowCard', description: 'Cartão', teamId: away.id, playerId: 't2-def' },
  ];
  return {
    homeTeam: home,
    awayTeam: away,
    homeScore: 2,
    awayScore: 0,
    events,
    homePossession: 60,
    awayPossession: 40,
    homeStats: { shots: 10, shotsOnTarget: 5, fouls: 3, yellowCards: 0, redCards: 0 },
    awayStats: { shots: 4, shotsOnTarget: 1, fouls: 6, yellowCards: 1, redCards: 0 },
    ...overrides,
  };
}

describe('MatchStatsScreen', () => {
  it('mostra placar, artilheiro, melhor em campo e cartões', () => {
    render(
      <MatchStatsScreen result={makeResult()} history={[]} onMenu={vi.fn()} onClearHistory={vi.fn()} />
    );

    expect(screen.getAllByText(home.abbreviation).length).toBeGreaterThan(0);
    expect(screen.getAllByText(away.abbreviation).length).toBeGreaterThan(0);

    // Artilheiro aparece no bloco de gols (2 gols do mesmo jogador → 2 linhas).
    expect(screen.getAllByText('Time A Atacante').length).toBeGreaterThan(0);

    // Melhor em Campo: 2 gols do time vencedor cravam a nota no teto (6.5 base + 0.5 vitória + 1.5×2 gols = 10.0).
    expect(screen.getByText('Melhor em Campo')).toBeInTheDocument();
    expect(screen.getAllByText('10.0').length).toBeGreaterThan(0);

    // Cartão amarelo do zagueiro do time visitante, com aria-label descritivo.
    expect(screen.getByLabelText(/Cartão amarelo para Time B Zagueiro aos 30 minutos/)).toBeInTheDocument();

    // Posse de bola tem label próprio (bug de mobile corrigido antes — não pode regredir).
    // Aparece também no efeito tático de cada time (mentalidade "Posse de Bola" da fixture).
    expect(screen.getAllByText('Posse de Bola').length).toBeGreaterThan(0);
    expect(screen.getByText('10')).toBeInTheDocument(); // chutes do time da casa
  });

  it('sem onContinue, mostra "Escolher Times" e aciona onMenu', () => {
    const onMenu = vi.fn();
    render(
      <MatchStatsScreen result={makeResult()} history={[]} onMenu={onMenu} onClearHistory={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Escolher Times'));
    expect(onMenu).toHaveBeenCalledTimes(1);
  });

  it('com onContinue, usa o continueLabel customizado em vez de "Escolher Times"', () => {
    const onContinue = vi.fn();
    render(
      <MatchStatsScreen
        result={makeResult()} history={[]} onMenu={vi.fn()} onClearHistory={vi.fn()}
        onContinue={onContinue} continueLabel="Próxima Rodada →"
      />
    );
    expect(screen.queryByText('Escolher Times')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Próxima Rodada →'));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renderiza histórico de partidas e aciona onClearHistory', () => {
    const onClearHistory = vi.fn();
    const record: MatchRecord = {
      id: 'r1', date: '01/01', homeTeam: home, awayTeam: away,
      homeScore: 1, awayScore: 1, homePossession: 50, awayPossession: 50,
      homeStats: emptyStats, awayStats: emptyStats,
    };
    render(
      <MatchStatsScreen result={makeResult()} history={[record]} onMenu={vi.fn()} onClearHistory={onClearHistory} />
    );

    expect(screen.getByText('Histórico')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Limpar histórico'));
    expect(onClearHistory).toHaveBeenCalledTimes(1);
  });

  it('vitória fora de casa mostra Vitória quando userTeamId é o visitante', () => {
    render(
      <MatchStatsScreen
        result={makeResult({ homeScore: 1, awayScore: 3 })}
        history={[]} onMenu={vi.fn()} onClearHistory={vi.fn()}
        userTeamId={away.id}
      />
    );
    expect(screen.getByText('Vitória')).toBeInTheDocument();
    expect(screen.queryByText('Derrota')).not.toBeInTheDocument();
  });

  it('empate fora de casa mostra Empate quando userTeamId é o visitante', () => {
    render(
      <MatchStatsScreen
        result={makeResult({ homeScore: 2, awayScore: 2 })}
        history={[]} onMenu={vi.fn()} onClearHistory={vi.fn()}
        userTeamId={away.id}
      />
    );
    expect(screen.getByText('Empate')).toBeInTheDocument();
  });

  it('derrota fora de casa mostra Derrota quando userTeamId é o visitante', () => {
    render(
      <MatchStatsScreen
        result={makeResult({ homeScore: 3, awayScore: 0 })}
        history={[]} onMenu={vi.fn()} onClearHistory={vi.fn()}
        userTeamId={away.id}
      />
    );
    expect(screen.getByText('Derrota')).toBeInTheDocument();
  });

  it('sem userTeamId, mantém o comportamento legado com o time da casa como referência', () => {
    render(
      <MatchStatsScreen
        result={makeResult({ homeScore: 1, awayScore: 3 })}
        history={[]} onMenu={vi.fn()} onClearHistory={vi.fn()}
      />
    );
    expect(screen.getByText('Derrota')).toBeInTheDocument();
  });
});
