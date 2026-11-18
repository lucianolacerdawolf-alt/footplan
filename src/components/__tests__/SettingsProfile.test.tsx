// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsScreen from '../SettingsScreen';
import ProfileScreen from '../ProfileScreen';
import { clearAllGameData } from '../../utils/clearGameData';

describe('SettingsScreen', () => {
  it('troca a dificuldade pelos botões', () => {
    const onSet = vi.fn();
    render(<SettingsScreen difficulty="normal" onSetDifficulty={onSet} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Difícil' }));
    expect(onSet).toHaveBeenCalledWith('hard');
  });

  it('apagar dados pede confirmação antes', () => {
    render(<SettingsScreen difficulty="normal" onSetDifficulty={vi.fn()} onBack={vi.fn()} />);
    fireEvent.click(screen.getByText('Apagar dados do jogo'));
    expect(screen.getByText('Apagar tudo mesmo?')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Apagar tudo mesmo?')).not.toBeInTheDocument();
  });
});

describe('clearAllGameData', () => {
  it('remove só as chaves do jogo (fp:)', () => {
    const data: Record<string, string> = { 'fp:career': '1', 'fp:history': '2', 'outra': '3' };
    const ls = {
      get length() { return Object.keys(data).length; },
      key: (i: number) => Object.keys(data)[i] ?? null,
      removeItem: (k: string) => { delete data[k]; },
    } as unknown as Storage;
    expect(clearAllGameData(ls)).toBe(2);
    expect(Object.keys(data)).toEqual(['outra']);
  });
});

describe('ProfileScreen', () => {
  it('mostra técnico, carreira e números gerais', () => {
    const onAch = vi.fn();
    render(
      <ProfileScreen onBack={vi.fn()} matchesPlayed={12} achievementsUnlocked={5} achievementsTotal={23} dailyStreak={2}
        cloudBackup onAchievements={onAch}
        career={{ managerName: 'Luciano', reputation: 40, teamName: 'Crystal Palace', leagueName: 'Premier League', seasonYear: 2, seasonsDone: 1, leagueTitles: 0, cupTitles: 1, bestFinish: 7 }} />,
    );
    expect(screen.getByText('Luciano')).toBeInTheDocument();
    expect(screen.getByText('Crystal Palace')).toBeInTheDocument();
    expect(screen.getByText('7º')).toBeInTheDocument();
    expect(screen.getByText('5/23')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Conquistas'));
    expect(onAch).toHaveBeenCalledOnce();
  });

  it('sem carreira convida a começar', () => {
    render(<ProfileScreen onBack={vi.fn()} career={null} matchesPlayed={0} achievementsUnlocked={0} achievementsTotal={23} dailyStreak={0} cloudBackup={false} onAchievements={vi.fn()} />);
    expect(screen.getByText('Técnico')).toBeInTheDocument();
    expect(screen.getByText(/Comece uma carreira/)).toBeInTheDocument();
  });
});
