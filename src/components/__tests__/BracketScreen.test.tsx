// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BracketScreen from '../BracketScreen';
import { createBracket, type BracketState } from '@/engine/tournament';
import { makeTeam } from './testFixtures';

const userTeam = makeTeam('user', 'Time Usuário', 'USR');
const others = Array.from({ length: 15 }, (_, i) => makeTeam(`opp${i}`, `Adversário ${i}`, `A${i}`));

function makeRoundOf16(): BracketState {
  // rng fixo — createBracket sempre coloca o time do usuário em roundOf16[0] (teams[0]),
  // independente da ordem do shuffle (ver src/engine/tournament.ts:154-155).
  return createBracket(userTeam, others, 'Copa Teste', 'test-league', () => 0.5);
}

describe('BracketScreen — fase de mata-mata', () => {
  it('renderiza as 8 partidas das oitavas com botão "Jogar" só na partida do usuário', () => {
    const state = makeRoundOf16();
    render(
      <BracketScreen
        state={state}
        onPlayMatch={vi.fn()} onSimulateMatch={vi.fn()} onSimulateOthers={vi.fn()}
        onEditTactics={vi.fn()} onBack={vi.fn()}
      />
    );

    expect(screen.getAllByText('Oitavas de Final').length).toBeGreaterThan(0);
    expect(screen.getAllByText('vs')).toHaveLength(8);
    expect(screen.getByText('Jogar')).toBeInTheDocument();
    expect(screen.getByText('USR')).toBeInTheDocument();
  });

  it('clicar em "Jogar" aciona onPlayMatch com a partida e os dois times corretos', () => {
    const state = makeRoundOf16();
    const onPlayMatch = vi.fn();
    render(
      <BracketScreen
        state={state}
        onPlayMatch={onPlayMatch} onSimulateMatch={vi.fn()} onSimulateOthers={vi.fn()}
        onEditTactics={vi.fn()} onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Jogar'));
    expect(onPlayMatch).toHaveBeenCalledTimes(1);
    const [match, home, away] = onPlayMatch.mock.calls[0];
    expect(match.id).toBe('r16-1');
    expect(home.id).toBe('user');
    expect(away.id).toBe(state.roundOf16[0].awayTeamId);
  });

  it('sem botão "Simular Outros": antes do seu jogo nada roda; depois dele, os outros saem sozinhos', async () => {
    const state = makeRoundOf16();
    const onSimulateOthers = vi.fn();
    const props = { onPlayMatch: vi.fn(), onSimulateMatch: vi.fn(), onSimulateOthers, onEditTactics: vi.fn(), onBack: vi.fn() };
    const { rerender } = render(<BracketScreen state={state} {...props} />);
    expect(screen.queryByText('Simular Outros')).not.toBeInTheDocument();
    expect(screen.getByText('Saem quando seu jogo terminar')).toBeInTheDocument();
    expect(onSimulateOthers).not.toHaveBeenCalled();

    const played = { ...state.roundOf16[0], played: true, homeScore: 2, awayScore: 0, winnerId: state.roundOf16[0].homeTeamId };
    rerender(<BracketScreen state={{ ...state, roundOf16: [played, ...state.roundOf16.slice(1)] }} {...props} />);
    await waitFor(() => expect(onSimulateOthers).toHaveBeenCalledTimes(1));
  });

  it('"Táticas" e "Voltar" acionam os callbacks certos', () => {
    const state = makeRoundOf16();
    const onEditTactics = vi.fn();
    const onBack = vi.fn();
    render(
      <BracketScreen
        state={state}
        onPlayMatch={vi.fn()} onSimulateMatch={vi.fn()} onSimulateOthers={vi.fn()}
        onEditTactics={onEditTactics} onBack={onBack}
      />
    );

    fireEvent.click(screen.getByText('Táticas'));
    expect(onEditTactics).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByLabelText('Voltar'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('na carreira (hideTopNav) esconde "Táticas" mas mantém o Voltar — a chave é subtela de Competições', () => {
    const state = makeRoundOf16();
    render(
      <BracketScreen
        state={state}
        onPlayMatch={vi.fn()} onSimulateMatch={vi.fn()} onSimulateOthers={vi.fn()}
        onEditTactics={vi.fn()} onBack={vi.fn()}
        hideTopNav
      />
    );
    expect(screen.queryByText('Táticas')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Voltar')).toBeInTheDocument();
  });

  it('tela de campeão mostra o time campeão e sinaliza eliminação quando o usuário não venceu', () => {
    const base = makeRoundOf16();
    const championState: BracketState = {
      ...base,
      stage: 'champion',
      championId: others[0].id,
      teams: [userTeam, ...others],
    };
    render(
      <BracketScreen
        state={championState}
        onPlayMatch={vi.fn()} onSimulateMatch={vi.fn()} onSimulateOthers={vi.fn()}
        onEditTactics={vi.fn()} onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Adversário 0')).toBeInTheDocument();
    expect(screen.getByText('Campeão da Copa Teste')).toBeInTheDocument();
    expect(screen.getByText(/foi eliminado/)).toBeInTheDocument();
  });

  it('tela de campeão não mostra mensagem de eliminação quando o usuário é o campeão', () => {
    const base = makeRoundOf16();
    const championState: BracketState = {
      ...base,
      stage: 'champion',
      championId: userTeam.id,
      teams: [userTeam, ...others],
    };
    render(
      <BracketScreen
        state={championState}
        onPlayMatch={vi.fn()} onSimulateMatch={vi.fn()} onSimulateOthers={vi.fn()}
        onEditTactics={vi.fn()} onBack={vi.fn()}
      />
    );

    expect(screen.getByText('Time Usuário')).toBeInTheDocument();
    expect(screen.queryByText(/foi eliminado/)).not.toBeInTheDocument();
  });
});
