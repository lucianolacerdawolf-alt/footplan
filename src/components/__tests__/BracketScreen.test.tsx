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

    expect(screen.getByText('Oitavas de Final')).toBeInTheDocument();
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

  it('"Simular Outros" aciona onSimulateOthers (com os outros 7 jogos pendentes)', async () => {
    const state = makeRoundOf16();
    const onSimulateOthers = vi.fn();
    render(
      <BracketScreen
        state={state}
        onPlayMatch={vi.fn()} onSimulateMatch={vi.fn()} onSimulateOthers={onSimulateOthers}
        onEditTactics={vi.fn()} onBack={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('Simular Outros'));
    await waitFor(() => expect(onSimulateOthers).toHaveBeenCalledTimes(1));
  });

  it('"Editar Táticas" e "Menu Principal" acionam os callbacks certos', () => {
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

    fireEvent.click(screen.getByText('← Editar Táticas'));
    expect(onEditTactics).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Menu Principal →'));
    expect(onBack).toHaveBeenCalledTimes(1);
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
