import { useCallback, useEffect, useRef } from 'react';
import { getPlayerConversations, type CareerState } from '@/engine/career';
import { maybeGenerateConversation, respondToConversation, type ConversationContext } from '@/engine/playerConversations';
import { applyMoraleToTeam } from '@/engine/morale';
import type { Team } from '@/engine/types';

interface UseCareerConversationsParams {
  careerState: CareerState | null;
  setCareerState: React.Dispatch<React.SetStateAction<CareerState | null>>;
  setToastMsg: (msg: string | null) => void;
}

function patchUserTeamMorale(teams: Team[], userTeamId: string, delta: number): Team[] {
  return teams.map(t => t.id === userTeamId
    ? applyMoraleToTeam(t, t.morale ?? 0, delta)
    : t);
}

export function useCareerConversations({ careerState, setCareerState, setToastMsg }: UseCareerConversationsParams) {
  // Espelho do estado mais recente em ref: a decisão de gerar é tomada fora do
  // updater (o motor usa Math.random — seria impuro dentro do updater), mas o
  // snapshot do closure podia NÃO conter a conversa que acabou de ser gerada no
  // mesmo tick (ex: resultado + avanço de rodada gerava 2 conversas na rodada).
  const careerStateRef = useRef(careerState);
  useEffect(() => { careerStateRef.current = careerState; }, [careerState]);

  /**
   * Tenta gerar 0-1 conversa pra rodada atual (liga). Chamado depois de resultado
   * de partida e no avanço de rodada. Nada é gerado se já houver conversa não
   * respondida na mesma rodada — o motor garante ≤1/rodada.
   */
  const handleMaybeGenerateConversation = useCallback((ctx: ConversationContext) => {
    const latest = careerStateRef.current;
    if (!latest) return;
    if (getPlayerConversations(latest).some(c => c.round === ctx.round && !c.responded)) return;
    const conv = maybeGenerateConversation(latest, ctx);
    if (!conv) return;
    // Guarda final contra duplo disparo no mesmo tick: se o updater anterior já
    // gravou uma conversa da rodada, não grava de novo.
    setCareerState(prev => {
      if (!prev) return prev;
      if (getPlayerConversations(prev).some(c => c.round === ctx.round && !c.responded)) return prev;
      return { ...prev, playerConversations: [...getPlayerConversations(prev), conv] };
    });
  }, [setCareerState]);

  const handleRespondConversation = useCallback((convId: string, choiceIdx: number) => {
    if (!careerState) return;
    const conv = getPlayerConversations(careerState).find(c => c.id === convId);
    if (!conv || conv.responded) return;
    const response = respondToConversation(conv, choiceIdx);
    if (!response) return;
    const userTeamId = careerState.season.league.userTeamId;

    setCareerState(prev => {
      if (!prev) return prev;
      const squadPatch = (teams: Team[]) => patchUserTeamMorale(teams, userTeamId, response.moraleDelta);
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: squadPatch(prev.rosters[prev.leagueId]) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: squadPatch(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: squadPatch(prev.season.cup.teams) },
        },
        playerConversations: getPlayerConversations(prev).map(c => c.id === convId ? { ...c, responded: true } : c),
      };
    });

    const delta = response.moraleDelta;
    const arrow = delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '0';
    setToastMsg(`💬 ${conv.playerName}: ${response.label} (moral ${arrow})`);
  }, [careerState, setCareerState, setToastMsg]);

  return { handleMaybeGenerateConversation, handleRespondConversation };
}
