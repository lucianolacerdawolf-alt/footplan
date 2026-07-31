import { useEffect } from 'react';
import type { Screen, MatchContext, TournamentMode } from '../types/navigation';
import { onHardwareBack, exitApp } from '../services/native';

/** `home-reset` = o `goHome()` do useAppShell (limpa liga/times/flags salvos),
 *  não um simples setScreen('home'). `stay` = engole o botão sem navegar. */
export type BackTarget = Screen | 'home-reset' | 'exit' | 'stay';

export interface BackNavContext {
  isCareerMode: boolean;
  hasCareerState: boolean;
  tournamentMode: TournamentMode;
  matchContext: MatchContext;
  isTournamentEntry: boolean;
  returnScreen: Screen | null;
}

/** Destino do botão físico de voltar por tela. Espelha os `onBack` do
 *  `screenMap` em AppScreens.tsx — o teste de completude garante que toda
 *  `Screen` tem entrada aqui, mas manter os dois em sincronia é manual: ao
 *  mudar um `onBack` lá, mude aqui também. */
export const backTargets: Record<Screen, (c: BackNavContext) => BackTarget> = {
  // Raiz: não há pra onde voltar.
  'home': () => 'exit',

  'league-select': (c) => (c.isCareerMode && c.hasCareerState ? 'career-hub' : 'home-reset'),
  'cup-select': () => 'home-reset',
  'select': () => 'league-select',
  'online-lobby': () => 'home',
  'tournament-setup': (c) => (c.tournamentMode === 'bracket' ? 'cup-select' : 'league-select'),

  'league': () => 'home-reset',
  'league-table': () => 'league',
  'bracket': () => 'home-reset',
  'achievements': () => 'home-reset',
  'stats': () => 'home-reset',

  'setup': (c) => {
    if (c.isTournamentEntry && c.returnScreen) return c.returnScreen;
    if (c.isCareerMode && c.matchContext === 'league') return 'career-league';
    if (c.isCareerMode && c.matchContext === 'bracket') return 'career-bracket';
    if (c.matchContext === 'league') return 'league';
    if (c.matchContext === 'bracket') return 'bracket';
    if (c.matchContext === 'online') return 'online-lobby';
    return 'select';
  },

  'matchday': () => 'setup',

  // Partida em andamento: sair daqui perde o jogo. O botão de voltar da tela
  // continua existindo — o que não pode é um toque acidental no botão físico
  // abandonar a partida sem confirmação.
  'match': () => 'stay',

  'career-hub': () => 'home-reset',
  'career-league': () => 'career-hub',
  'career-league-table': () => 'career-league',
  'career-bracket': () => 'career-hub',
  'career-trophy-room': () => 'career-hub',
  'transfer-market': () => 'career-hub',
  'trade-propose': () => 'transfer-market',
  'season-end': () => 'career-hub',
};

interface Params extends BackNavContext {
  screen: Screen;
  setScreen: (s: Screen) => void;
  goHome: () => void;
  /** Overlay aberto sobre a tela — se houver, voltar fecha ele em vez de navegar. */
  overlayOpen?: boolean;
  onCloseOverlay?: () => void;
}

export function useAndroidBackButton(p: Params): void {
  const {
    screen, setScreen, goHome, overlayOpen, onCloseOverlay,
    isCareerMode, hasCareerState, tournamentMode, matchContext, isTournamentEntry, returnScreen,
  } = p;

  useEffect(() => {
    return onHardwareBack(() => {
      if (overlayOpen) { onCloseOverlay?.(); return; }

      const target = backTargets[screen]({
        isCareerMode, hasCareerState, tournamentMode, matchContext, isTournamentEntry, returnScreen,
      });

      if (target === 'stay') return;
      if (target === 'exit') { exitApp(); return; }
      if (target === 'home-reset') { goHome(); return; }
      setScreen(target);
    });
  }, [
    screen, setScreen, goHome, overlayOpen, onCloseOverlay,
    isCareerMode, hasCareerState, tournamentMode, matchContext, isTournamentEntry, returnScreen,
  ]);
}
