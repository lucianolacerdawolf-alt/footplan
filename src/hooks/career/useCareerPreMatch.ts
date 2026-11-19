import { useState, useCallback } from 'react';
import { getPressDoneRound, type CareerState } from '@/engine/career';
import { applyTrainingChoice, TRAINING_PRESETS, type TrainingChoice } from '@/engine/training';
import { generatePressConference, respondToPressConference, type PressConferenceQuestion } from '@/engine/pressConference';
import { clampConfidence, CONFIDENCE_START, type PressStance } from '@/engine/boardConfidence';
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
  // Fila da coletiva: 1 pergunta, ou 2 em jogo grande. A da frente é a que aparece.
  const [pressQueue, setPressQueue] = useState<PressConferenceQuestion[]>([]);
  const [pressTotal, setPressTotal] = useState(0);
  const [pressOpponentId, setPressOpponentId] = useState<string | null>(null);
  const pressQuestion = pressQueue[0] ?? null;

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

  /** Fase 3b — abre a coletiva de imprensa (1 pergunta; 2 em jogo grande). */
  const handleOpenPressConference = useCallback((opponentTeam: Team, bigGame = false) => {
    if (!careerState) return;
    const userTeam = careerState.rosters[careerState.leagueId]?.find(t => t.id === careerState.season.league.userTeamId);
    if (!userTeam) return;
    const qs = generatePressConference(userTeam, opponentTeam, { bigGame });
    setPressQueue(qs);
    setPressTotal(qs.length);
    setPressOpponentId(opponentTeam.id);
  }, [careerState]);

  const handleClosePressConference = useCallback(() => { setPressQueue([]); setPressTotal(0); }, []);

  /** Fase 3b — responde a pergunta da frente: moral no elenco e efeito na diretoria
   *  (promessa de vitória / tirar a pressão ficam guardadas pro resultado do jogo). */
  const handleRespondPressConference = useCallback((choiceIdx: number) => {
    if (!careerState || !pressQuestion) return;
    const response = respondToPressConference(pressQuestion, choiceIdx);
    if (!response) return;
    const userTeamId = careerState.season.league.userTeamId;
    const patch = (t: Team) => applyMoraleToTeam(t, t.morale ?? 0, response.moraleDelta);
    const isLast = pressQueue.length <= 1;
    const opponentId = pressOpponentId;
    setCareerState(prev => {
      if (!prev) return prev;
      const round = prev.season.league.currentRound;
      // Promessa vale mais que "tirar a pressão": a ousada de qualquer pergunta prevalece.
      let pressStance = prev.pressStance?.round === round && prev.pressStance.opponentId === opponentId ? prev.pressStance : undefined;
      if (opponentId && (response.stance === 'bold' || response.stance === 'shield')) {
        const stance: PressStance = pressStance?.stance === 'bold' ? 'bold' : response.stance;
        pressStance = { round, opponentId, stance };
      }
      return {
        ...prev,
        ...(isLast ? { pressDoneRound: round } : {}),
        pressStance,
        boardConfidence: response.stance === 'calm'
          ? clampConfidence((prev.boardConfidence ?? CONFIDENCE_START) + 1) : prev.boardConfidence,
        rosters: { ...prev.rosters, [prev.leagueId]: patchUserTeam(prev.rosters[prev.leagueId], userTeamId, patch) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: patchUserTeam(prev.season.league.teams, userTeamId, patch) },
          cup: { ...prev.season.cup, teams: patchUserTeam(prev.season.cup.teams, userTeamId, patch) },
        },
      };
    });
    setToastMsg(`🎙️ ${response.label} (moral ${response.moraleDelta > 0 ? '+' : ''}${response.moraleDelta})`);
    setPressQueue(q => q.slice(1));
  }, [careerState, pressQuestion, pressQueue.length, pressOpponentId, setCareerState, setToastMsg]);

  const pressDone = !!careerState
    && !!careerState.season?.league
    && getPressDoneRound(careerState) === careerState.season.league.currentRound;

  return {
    handleApplyTraining, handleOpenPressConference, handleClosePressConference, handleRespondPressConference,
    pressQuestion, pressDone,
    /** Pergunta atual / total da coletiva aberta (ex.: 1 de 2). */
    pressStep: pressQuestion ? { index: pressTotal - pressQueue.length + 1, total: pressTotal } : null,
  };
}
