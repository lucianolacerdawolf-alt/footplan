import { useState, useCallback, useEffect } from 'react';

type Screen =
  | 'league-select' | 'cup-select' | 'home' | 'select' | 'setup' | 'match' | 'stats'
  | 'tournament-setup' | 'league' | 'bracket' | 'achievements' | 'online-lobby'
  | 'career-hub' | 'career-league' | 'career-bracket' | 'trade-propose' | 'season-end';
type TournamentMode = 'league' | 'bracket';

interface UseResumePromptParams {
  setScreen: (s: Screen) => void;
  setTournamentMode: (m: TournamentMode) => void;
  setLeagueState: () => void;
  setBracketState: () => void;
}

export function useResumePrompt({
  setScreen, setTournamentMode, setLeagueState, setBracketState,
}: UseResumePromptParams) {
  const [resumePrompt, setResumePrompt] = useState<'league' | 'bracket' | null>(null);

  useEffect(() => {
    if (!resumePrompt) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setResumePrompt(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resumePrompt]);

  const handleResumeContinue = useCallback(() => {
    const target = resumePrompt;
    setResumePrompt(null);
    if (target === 'league') setScreen('league');
    else if (target === 'bracket') setScreen('bracket');
  }, [resumePrompt, setScreen]);

  const handleResumeNew = useCallback(() => {
    const target = resumePrompt;
    setResumePrompt(null);
    if (target === 'league') { setLeagueState(); setTournamentMode('league'); }
    else if (target === 'bracket') { setBracketState(); setTournamentMode('bracket'); }
    setScreen('tournament-setup');
  }, [resumePrompt, setLeagueState, setBracketState, setTournamentMode, setScreen]);

  return { resumePrompt, setResumePrompt, handleResumeContinue, handleResumeNew };
}
