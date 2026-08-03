import { useState, useCallback } from 'react';
import { getPressDoneRound, type CareerState } from '@/engine/career';
import { applyTrainingChoice, TRAINING_PRESETS, type TrainingChoice } from '@/engine/training';
import { generatePressConferenceQuestion, respondToPressConference, type PressConferenceQuestion } from '@/engine/pressConference';
import { applyMoraleToTeam } from '@/engine/morale';
import type { Team } from '@/engine/types';

interface UseCareerPreMatchParams {
  careerState: CareerState | null;
  setCareerState: React.Dispatch<React.SetStateAction<CareerState | null>>;
  setToastMsg: (msg: string | null) => void;
}

function patchUserTeam(teams: Team[], userTeamId: string, patch: (t: Team) => Team): Team[] {
  return teams.map(t => t.id === userTeamId ? patch(t) : t);
}

export function useCareerPreMatch({ careerState, setCareerState, setToastMsg }: UseCareerPreMatchParams) {
  const [pressQuestion, setPressQuestion] = useState<PressConferenceQuestion | null>(null);

  /** Fase 3a — aplica o treino pré-jogo (fadiga↔moral) nos 3 espelhos do elenco. */
  const handleApplyTraining = useCallback((choice: TrainingChoice) => {
    if (!careerState) return;
    const userTeamId = careerState.season.league.userTeamId;
    const patch = (t: Team) => applyTrainingChoice(t, choice);
    const preset = TRAINING_PRESETS[choice];
    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        preMatchDoneRound: prev.season.league.currentRound,
        rosters: { ...prev.rosters, [prev.leagueId]: patchUserTeam(prev.rosters[prev.leagueId], userTeamId, patch) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: patchUserTeam(prev.season.league.teams, userTeamId, patch) },
          cup: { ...prev.season.cup, teams: patchUserTeam(prev.season.cup.teams, userTeamId, patch) },
        },
      };
    });
    setToastMsg(`🏋️ ${preset.label}: moral ${preset.moraleDelta > 0 ? '+' : ''}${preset.moraleDelta}, fadiga ${preset.fatigueDelta > 0 ? '+' : ''}${preset.fatigueDelta}`);
  }, [careerState, setCareerState, setToastMsg]);

  /** Fase 3b — abre a coletiva de imprensa (gera 1 pergunta por contexto). */
  const handleOpenPressConference = useCallback((opponentTeam: Team) => {
    if (!careerState) return;
    const userTeam = careerState.rosters[careerState.leagueId]?.find(t => t.id === careerState.season.league.userTeamId);
    if (!userTeam) return;
    setPressQuestion(generatePressConferenceQuestion(userTeam, opponentTeam));
  }, [careerState]);

  const handleClosePressConference = useCallback(() => setPressQuestion(null), []);

  /** Fase 3b — responde a coletiva, aplica moraleDelta e marca como feita na rodada. */
  const handleRespondPressConference = useCallback((choiceIdx: number) => {
    if (!careerState || !pressQuestion) return;
    const response = respondToPressConference(pressQuestion, choiceIdx);
    if (!response) return;
    const userTeamId = careerState.season.league.userTeamId;
    const patch = (t: Team) => applyMoraleToTeam(t, t.morale ?? 0, response.moraleDelta);
    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pressDoneRound: prev.season.league.currentRound,
        rosters: { ...prev.rosters, [prev.leagueId]: patchUserTeam(prev.rosters[prev.leagueId], userTeamId, patch) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: patchUserTeam(prev.season.league.teams, userTeamId, patch) },
          cup: { ...prev.season.cup, teams: patchUserTeam(prev.season.cup.teams, userTeamId, patch) },
        },
      };
    });
    setToastMsg(`🎙️ ${response.label} (moral ${response.moraleDelta > 0 ? '+' : ''}${response.moraleDelta})`);
    setPressQuestion(null);
  }, [careerState, pressQuestion, setCareerState, setToastMsg]);

  const pressDone = !!careerState
    && !!careerState.season?.league
    && getPressDoneRound(careerState) === careerState.season.league.currentRound;

  return {
    handleApplyTraining, handleOpenPressConference, handleClosePressConference, handleRespondPressConference,
    pressQuestion, pressDone,
  };
}
