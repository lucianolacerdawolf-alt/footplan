// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeScreen from '../HomeScreen';
import { careerResumeInfo } from '../AppScreens';

const base = {
  onSingleMatch: vi.fn(), onQuickPlay: vi.fn(), onLeague: vi.fn(), onCup: vi.fn(),
  onAchievements: vi.fn(), onOnline: vi.fn(),
};

describe('HomeScreen — Continuar carreira', () => {
  it('sem carreira salva não mostra o card de destaque', () => {
    render(<HomeScreen {...base} onCareer={vi.fn()} />);
    expect(screen.queryByText('Continuar')).not.toBeInTheDocument();
  });

  it('com carreira salva mostra o card no topo e ele abre a carreira', () => {
    const onCareer = vi.fn();
    render(<HomeScreen {...base} onCareer={onCareer} careerResume={{ teamName: 'Crystal Palace', detail: 'Premier League · Temporada 1 · Rodada 4' }} />);
    expect(screen.getByText('Continuar')).toBeInTheDocument();
    expect(screen.getByText('Premier League · Temporada 1 · Rodada 4')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Continuar'));
    expect(onCareer).toHaveBeenCalledOnce();
  });
});

describe('HomeScreen — layout', () => {
  it('sem carreira oferece "Começar carreira"', () => {
    const onCareer = vi.fn();
    render(<HomeScreen {...base} onCareer={onCareer} />);
    fireEvent.click(screen.getByText('Começar carreira'));
    expect(onCareer).toHaveBeenCalledOnce();
  });

  it('mostra a posição na tabela e a forma recente', () => {
    render(<HomeScreen {...base} onCareer={vi.fn()} careerResume={{
      teamName: 'Arsenal', detail: 'Premier League · Temporada 1 · Rodada 4',
      position: 3, form: ['W', 'D', 'L'],
    }} />);
    expect(screen.getByText('3º na tabela')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Últimos jogos: vitória, empate, derrota' })).toBeInTheDocument();
  });

  it('antes do primeiro jogo não mostra posição nem forma', () => {
    render(<HomeScreen {...base} onCareer={vi.fn()} careerResume={{
      teamName: 'Arsenal', detail: 'Premier League · Temporada 1 · Rodada 1', position: null, form: [],
    }} />);
    expect(screen.queryByText(/na tabela/)).not.toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /Últimos jogos/ })).not.toBeInTheDocument();
  });

  it('mostra o próximo jogo com os dois clubes', () => {
    render(<HomeScreen {...base} onCareer={vi.fn()} careerResume={{
      teamName: 'Arsenal', detail: 'Premier League · Temporada 1 · Rodada 4',
      nextMatch: { home: { name: 'Arsenal' }, away: { name: 'Chelsea' } },
    }} />);
    expect(screen.getByText('Próximo jogo')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
  });

  it('os quatro modos chamam suas ações', () => {
    const h = { onSingleMatch: vi.fn(), onQuickPlay: vi.fn(), onLeague: vi.fn(), onCup: vi.fn() };
    render(<HomeScreen {...base} {...h} onCareer={vi.fn()} />);
    fireEvent.click(screen.getByText('Partida'));
    fireEvent.click(screen.getByText('Rápido'));
    fireEvent.click(screen.getByText('Campeonato'));
    fireEvent.click(screen.getByText('Copa'));
    expect(h.onSingleMatch).toHaveBeenCalledOnce();
    expect(h.onQuickPlay).toHaveBeenCalledOnce();
    expect(h.onLeague).toHaveBeenCalledOnce();
    expect(h.onCup).toHaveBeenCalledOnce();
  });

  it('Conquistas abre pelo ícone do topo', () => {
    const onAchievements = vi.fn();
    render(<HomeScreen {...base} onAchievements={onAchievements} onCareer={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Conquistas' }));
    expect(onAchievements).toHaveBeenCalledOnce();
  });

  it('Perfil e Configurações abrem pelos ícones do topo', () => {
    const onProfile = vi.fn();
    const onSettings = vi.fn();
    render(<HomeScreen {...base} onCareer={vi.fn()} onProfile={onProfile} onSettings={onSettings} />);
    fireEvent.click(screen.getByRole('button', { name: 'Perfil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Configurações' }));
    expect(onProfile).toHaveBeenCalledOnce();
    expect(onSettings).toHaveBeenCalledOnce();
    expect(screen.queryByRole('combobox', { name: 'Dificuldade das partidas' })).not.toBeInTheDocument();
  });
});

describe('careerResumeInfo', () => {
  const cs = (phase: 'playing' | 'done') => ({
    leagueId: 'premier-league',
    currentSeasonYear: 2,
    season: { league: { userTeamId: 'cp', currentRound: 3, phase, teams: [{ id: 'cp', name: 'Crystal Palace', logoUrl: 'x.png' }] } },
  }) as never;

  it('traz o próximo jogo da rodada atual com mandante à esquerda', () => {
    const state = {
      leagueId: 'premier-league',
      currentSeasonYear: 1,
      season: { league: {
        userTeamId: 'ars', currentRound: 1, phase: 'playing',
        teams: [{ id: 'ars', name: 'Arsenal', logoUrl: 'a.png' }, { id: 'che', name: 'Chelsea', logoUrl: 'c.png' }],
        fixtures: [[], [{ id: 'f', roundIndex: 1, homeTeamId: 'che', awayTeamId: 'ars', played: false }]],
      } },
    } as never;
    const r = careerResumeInfo(state)!;
    expect(r.nextMatch?.home.name).toBe('Chelsea');
    expect(r.nextMatch?.away.name).toBe('Arsenal');
  });

  it('traz posição e forma a partir dos jogos disputados', () => {
    const state = {
      leagueId: 'premier-league',
      currentSeasonYear: 1,
      season: { league: {
        userTeamId: 'ars', currentRound: 2, phase: 'playing',
        teams: [{ id: 'ars', name: 'Arsenal', logoUrl: '' }, { id: 'che', name: 'Chelsea', logoUrl: '' }],
        fixtures: [
          [{ id: 'a', roundIndex: 0, homeTeamId: 'ars', awayTeamId: 'che', homeScore: 2, awayScore: 0, played: true }],
          [{ id: 'b', roundIndex: 1, homeTeamId: 'che', awayTeamId: 'ars', homeScore: 1, awayScore: 1, played: true }],
        ],
      } },
    } as never;
    const r = careerResumeInfo(state)!;
    expect(r.position).toBe(1);
    expect(r.form).toEqual(['W', 'D']);
  });

  it('liga encerrada não tem próximo jogo', () => {
    expect(careerResumeInfo(cs('done'))!.nextMatch).toBeNull();
  });

  it('sem carreira devolve null', () => {
    expect(careerResumeInfo(null)).toBeNull();
  });

  it('monta time, temporada e rodada', () => {
    const r = careerResumeInfo(cs('playing'))!;
    expect(r.teamName).toBe('Crystal Palace');
    expect(r.detail).toMatch(/Temporada 2 · Rodada 4$/);
  });

  it('liga encerrada no lugar da rodada', () => {
    expect(careerResumeInfo(cs('done'))!.detail).toMatch(/Liga encerrada$/);
  });
});

describe('HomeScreen — nova carreira', () => {
  it('com carreira salva mostra "Nova carreira", que chama onNewCareer', () => {
    const onNewCareer = vi.fn();
    render(<HomeScreen {...base} onCareer={vi.fn()} onNewCareer={onNewCareer}
      careerResume={{ teamName: 'Crystal Palace', detail: 'Premier League · Temporada 1 · Rodada 4' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Nova\s*carreira/ }));
    expect(onNewCareer).toHaveBeenCalledOnce();
  });
  it('sem carreira salva não mostra o botão (o principal já é "Começar carreira")', () => {
    render(<HomeScreen {...base} onCareer={vi.fn()} onNewCareer={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Nova\s*carreira/ })).not.toBeInTheDocument();
  });
});
