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

describe('careerResumeInfo', () => {
  const cs = (phase: 'playing' | 'done') => ({
    leagueId: 'premier-league',
    currentSeasonYear: 2,
    season: { league: { userTeamId: 'cp', currentRound: 3, phase, teams: [{ id: 'cp', name: 'Crystal Palace', logoUrl: 'x.png' }] } },
  }) as never;

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
