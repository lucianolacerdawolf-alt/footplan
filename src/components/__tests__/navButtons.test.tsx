// @vitest-environment jsdom
//
// Smoke test estrutural pras 3 telas que compartilham `.team-select-screen` e
// `.slot-nav-btn` (OnlineLobbyScreen, TeamSelectionScreen, TournamentSetupScreen) —
// confirma que os botões de nav renderizam com o texto esperado. jsdom não tem motor
// de layout de verdade (getBoundingClientRect sempre retorna zero), então isso NÃO
// substitui a verificação visual de overflow em CSS (o bug de `min-width: 155px`
// cortando "Menu Principal"/"Entrar" só foi pego testando num navegador real) — serve
// só de rede de segurança pra regressão estrutural (texto sumir, botão não montar).
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamSelectionScreen from '../TeamSelectionScreen';
import TournamentSetupScreen from '../TournamentSetupScreen';
import OnlineLobbyScreen from '../OnlineLobbyScreen';
import type { UsePeerConnectionReturn } from '../../hooks/usePeerConnection';
import { testTeams, makeLeague } from './testFixtures';

function makePeer(overrides: Partial<UsePeerConnectionReturn> = {}): UsePeerConnectionReturn {
  return {
    state: 'idle', roomId: null, error: null, isHost: false, peerConnected: false,
    createRoom: vi.fn(), joinRoom: vi.fn(), send: vi.fn(), setOnData: vi.fn(), disconnect: vi.fn(),
    ...overrides,
  };
}

describe('telas de seleção de time — botões de nav', () => {
  it('TeamSelectionScreen (Partida Única) mostra Voltar e Menu Principal', () => {
    render(
      <TeamSelectionScreen teams={testTeams} leagueName="Liga Teste" onConfirm={vi.fn()} onBack={vi.fn()} onGoHome={vi.fn()} />
    );
    expect(screen.getByText('← Voltar')).toBeInTheDocument();
    expect(screen.getByText('Menu Principal')).toBeInTheDocument();
  });

  it('TournamentSetupScreen (liga/copa) mostra Voltar e Menu Principal', () => {
    render(
      <TournamentSetupScreen mode="league" league={makeLeague()} onBack={vi.fn()} onGoHome={vi.fn()} onStart={vi.fn()} />
    );
    expect(screen.getByText('← Voltar')).toBeInTheDocument();
    expect(screen.getByText('Menu Principal')).toBeInTheDocument();
  });

  it('OnlineLobbyScreen mostra Voltar, Menu Principal, Criar Sala e Entrar', () => {
    render(
      <OnlineLobbyScreen onStartMatch={vi.fn()} onBack={vi.fn()} onGoHome={vi.fn()} peer={makePeer()} />
    );
    expect(screen.getByText('← Voltar')).toBeInTheDocument();
    expect(screen.getByText('Menu Principal')).toBeInTheDocument();
    expect(screen.getByText(/Criar Sala/)).toBeInTheDocument();
    expect(screen.getByText('Entrar')).toBeInTheDocument();
  });
});
