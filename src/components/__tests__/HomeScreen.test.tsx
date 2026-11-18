// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeScreen from '../HomeScreen';
import { careerResumeInfo } from '../AppScreens';

const base = {
  onSingleMatch: vi.fn(), onQuickPlay: vi.fn(), onLeague: vi.fn(), onCup: vi.fn(),
  onAchievements: vi.fn(), onOnline: vi.fn(), difficulty: 'normal' as const, onSetDifficulty: vi.fn(),
};

describe('HomeScreen — Continuar carreira', () => {
  it('sem carreira salva não mostra o card de destaque', () => {
    render(<HomeScreen {...base} onCareer={vi.fn()} />);
    expect(screen.queryByText('Continuar carreira')).not.toBeInTheDocument();
  });

  it('com carreira salva mostra o card no topo e ele abre a carreira', () => {
    const onCareer = vi.fn();
    render(<HomeScreen {...base} onCareer={onCareer} careerResume={{ teamName: 'Crystal Palace', detail: 'Premier League · Temporada 1 · Rodada 4' }} />);
    expect(screen.getByText('Continuar carreira')).toBeInTheDocument();
    expect(screen.getByText('Premier League · Temporada 1 · Rodada 4')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Continuar carreira'));
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

  it('mostra o próximo jogo com os dois clubes', () => {
    render(<HomeScreen {...base} onCareer={vi.fn()} careerResume={{
      teamName: 'Arsenal', detail: 'Premier League · Temporada 1 · Rodada 4',
      nextMatch: { home: { name: 'Arsenal' }, away: { name: 'Chelsea' } },
    }} />);
    expect(screen.getByText('Próximo jogo')).toBeInTheDocument();
    expect(screen.getByText('Chelsea')).toBeInTheDocument();
  });

  it('Partida e Competições expõem as 4 ações originais', () => {
    const h = { onSingleMatch: vi.fn(), onQuickPlay: vi.fn(), onLeague: vi.fn(), onCup: vi.fn() };
    render(<HomeScreen {...base} {...h} onCareer={vi.fn()} />);
    fireEvent.click(screen.getByText('Escolher times'));
    fireEvent.click(screen.getByText('Jogo rápido'));
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

  it('troca a dificuldade', () => {
    const onSetDifficulty = vi.fn();
    render(<HomeScreen {...base} onSetDifficulty={onSetDifficulty} onCareer={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Difícil' }));
    expect(onSetDifficulty).toHaveBeenCalledWith('hard');
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
