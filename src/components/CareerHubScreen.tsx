import { useMemo } from 'react';
import type { CareerState } from '../engine/career';
import { getInbox, getSponsorName, getFinances, deriveCupProgress, getPlayerConversations, getPreMatchDoneRound, getTransferHistory } from '../engine/career';
import { getObjectives, getObjectiveProgress } from '../engine/boardObjectives';
import { computeUserSeasonRecord } from '../engine/seasonClosure';
import type { LeagueDefinition } from '../data/leagues/types';
import type { LeagueFixture } from '../engine/tournament';
import { computeStandings } from '../engine/tournament';
import { getStageMatches } from '../engine/bracketHelpers';
import { CUP_STAGE_LABELS } from '../engine/careerLabels';
import { playerOvr } from '../utils/playerOvr';
import { getStarterCount } from '../engine/squadUtils';
import { generateSocialFeed } from '../engine/socialFeed';
import type { TrainingChoice } from '../engine/training';
import { isTrainingDone } from '../engine/training';
import type { PressConferenceQuestion } from '../engine/pressConference';
import type { Team } from '../engine/types';
import type { CloudStatus } from '../hooks/useCloudSave';
import InboxPanel from './InboxPanel';
import ConversationsPanel from './ConversationsPanel';
import PreMatchPrepCard from './PreMatchPrepCard';
import SocialFeedCard from './SocialFeedCard';
import styles from './CareerHubScreen.module.css';
import { crestSrc } from '../utils/crest';

interface Props {
  state: CareerState;
  league: LeagueDefinition;
  onViewCup: () => void;
  /** Abre a chave da copa continental (career-continental). */
  onViewContinental: () => void;
  onPlayNext: () => void;
  onPlayNextCup: () => void;
  /** Joga o próximo jogo da copa continental do usuário. */
  onPlayNextContinental: () => void;
  onAdvanceSeason: () => void;
  onNewCareer: () => void;
  onBack: () => void;
  onMarkInboxRead: (id: string) => void;
  onAcceptTransferOffer: (id: string) => void;
  onRejectTransferOffer: (id: string) => void;
  /** Avança a rodada da liga direto da Central, sem passar pelo Escritório. */
  onNextRound: () => void;
  /** Fase 2 — abre o mercado de treinador (trocar de clube). */
  onOpenJobMarket: () => void;
  /** Nº de ofertas de emprego em aberto (pra badge na Central). */
  jobOfferCount: number;
  /** Fase 4 — responde uma conversa com atleta (aplica moral no time). */
  onRespondConversation?: (convId: string, choiceIdx: number) => void;
  /** Fase 3a — aplica o treino pré-jogo escolhido. */
  onApplyTraining?: (choice: TrainingChoice) => void;
  /** Fase 3b — abre a coletiva de imprensa com o adversário. */
  onOpenPressConference?: (opponentTeam: Team) => void;
  /** Fase 3b — responde a pergunta da coletiva. */
  onAnswerPressConference?: (choiceIdx: number) => void;
  /** Fase 3b — fecha a coletiva sem responder. */
  onClosePressConference?: () => void;
  /** Fase 3b — pergunta ativa da coletiva (null = fechada). */
  pressQuestion?: PressConferenceQuestion | null;
  /** Fase 3b — coletiva já feita na rodada atual. */
  pressDone?: boolean;
  /** Abre o Escritório (tela da liga) — usado quando ainda faltam jogos da rodada. */
  onViewLeague: () => void;
  /** Motivo pra bloquear o avanço de rodada (ex: mensagem obrigatória não lida). */
  blockAdvanceReason?: string;
  /** Atualiza os elencos das 12 ligas via API (busca ao vivo + grava no Supabase). */
  onSyncRosters?: () => void;
  rosterSyncing?: boolean;
  rosterLastUpdatedAt?: string | null;
  /** Estado do backup na nuvem (Supabase). `undefined`/`idle` = sem nuvem configurada. */
  cloudStatus?: CloudStatus;
  /** Reenvia o último save que falhou pra nuvem (aparece quando `cloudStatus === 'offline'`). */
  onRetryCloudSave?: () => void;
}

type NextMatch =
  | { type: 'league'; fixture: LeagueFixture; homeName: string; awayName: string; round: number; opponentTeamId: string }
  | { type: 'cup'; homeName: string; awayName: string; stage: string; stageLabel: string; opponentTeamId: string }
  | { type: 'continental'; homeName: string; awayName: string; stage: string; stageLabel: string; opponentTeamId: string; cupShortName: string; cupLogo: string }
  | null;

function determineNextMatch(state: CareerState): NextMatch {
  const { season } = state;
  const { league, cup } = season;
  const userId = league.userTeamId;

  // Prioridade: copa continental → copa doméstica → liga.
  const cc = season.continentalCup;
  if (cc && cc.stage !== 'champion') {
    const stageMatches = getStageMatches(cc);
    const userMatch = stageMatches.find(m =>
      !m.played && (m.homeTeamId === userId || m.awayTeamId === userId));
    if (userMatch) {
      const homeTeam = cc.teams.find(t => t.id === userMatch.homeTeamId);
      const awayTeam = cc.teams.find(t => t.id === userMatch.awayTeamId);
      const opponentTeamId = userMatch.homeTeamId === userId ? userMatch.awayTeamId : userMatch.homeTeamId;
      if (!opponentTeamId) {
        return null;
      }
      return {
        type: 'continental',
        homeName: homeTeam?.name ?? '???',
        awayName: awayTeam?.name ?? '???',
        stage: cc.stage,
        stageLabel: CUP_STAGE_LABELS[cc.stage] ?? cc.stage,
        opponentTeamId,
        cupShortName: season.continentalCupDef?.shortName ?? 'Continental',
        cupLogo: season.continentalCupDef?.logo ?? '🌍',
      };
    }
  }

  if (cup.stage !== 'champion') {
    const stageMatches = getStageMatches(cup);
    const userMatch = stageMatches.find(m =>
      !m.played &&
      (m.homeTeamId === userId || m.awayTeamId === userId)
    );
    if (userMatch) {
      const homeTeam = cup.teams.find(t => t.id === userMatch.homeTeamId);
      const awayTeam = cup.teams.find(t => t.id === userMatch.awayTeamId);
      const opponentTeamId = userMatch.homeTeamId === userId ? userMatch.awayTeamId : userMatch.homeTeamId;
      if (!opponentTeamId) {
        return null;
      }
      return {
        type: 'cup',
        homeName: homeTeam?.name ?? '???',
        awayName: awayTeam?.name ?? '???',
        stage: cup.stage,
        stageLabel: CUP_STAGE_LABELS[cup.stage] ?? cup.stage,
        opponentTeamId,
      };
    }
  }

  if (league.phase !== 'done') {
    const round = league.fixtures[league.currentRound];
    const fixture = round.find(f =>
      (f.homeTeamId === userId || f.awayTeamId === userId) && !f.played
    );
    if (fixture) {
      const home = league.teams.find(t => t.id === fixture.homeTeamId);
      const away = league.teams.find(t => t.id === fixture.awayTeamId);
      return {
        type: 'league',
        fixture,
        homeName: home?.name ?? '???',
        awayName: away?.name ?? '???',
        round: league.currentRound,
        opponentTeamId: fixture.homeTeamId === userId ? fixture.awayTeamId : fixture.homeTeamId,
      };
    }
  }

  return null;
}

export default function CareerHubScreen({ state, league, onViewCup, onViewContinental, onPlayNext, onPlayNextCup, onPlayNextContinental, onAdvanceSeason, onNewCareer, onBack, onMarkInboxRead, onAcceptTransferOffer, onRejectTransferOffer, onNextRound, onViewLeague, onOpenJobMarket, jobOfferCount, onRespondConversation, onApplyTraining, onOpenPressConference, onAnswerPressConference, onClosePressConference, pressQuestion, pressDone, blockAdvanceReason, onSyncRosters, rosterSyncing, rosterLastUpdatedAt, cloudStatus, onRetryCloudSave }: Props) {
  void onViewCup;
  const inbox = getInbox(state);
  const finances = getFinances(state);
  const standings = computeStandings(state.season.league.teams, state.season.league.fixtures);
  const userPosition = standings.findIndex(s => s.teamId === state.season.league.userTeamId) + 1;
  const cupStageLabel = CUP_STAGE_LABELS[state.season.cup.stage] ?? state.season.cup.stage;
  const seasonReady = state.season.league.phase === 'done' && state.season.cup.stage === 'champion';
  const nextMatch = determineNextMatch(state);
  const trainingDone = isTrainingDone(getPreMatchDoneRound(state), state.season.league.currentRound);

  // Sem próxima partida e sem temporada encerrada, a Central ficava sem nenhuma
  // ação: o "Avançar Rodada" só existia no Escritório. Acontece toda rodada, assim
  // que o usuário joga o jogo dele.
  const currentRoundFixtures = state.season.league.fixtures[state.season.league.currentRound];
  const roundComplete = currentRoundFixtures?.every(f => f.played) ?? false;
  const awaitingRound = !nextMatch && !seasonReady && state.season.league.phase !== 'done';
  const sponsorName = getSponsorName(state);
  const boardObj = getObjectives(state);
  const cupProgress = deriveCupProgress(state.season.cup, state.season.league.userTeamId);

  const userTeam = useMemo(() =>
    state.rosters[state.leagueId]?.find(t => t.id === state.season.league.userTeamId),
    [state.rosters, state.leagueId, state.season.league.userTeamId]);

  const record = useMemo(() =>
    computeUserSeasonRecord(state.season.league),
    [state.season.league]);

  const avgOvr = useMemo(() => {
    if (!userTeam) return 0;
    const starters = userTeam.squad.slice(0, getStarterCount(userTeam.strategy.formation));
    return Math.round(starters.reduce((s, p) => s + playerOvr(p), 0) / starters.length);
  }, [userTeam]);

  // Fase 1 — contratos a expirar agora vivem na aba "Meu Clube" (gestão do clube),
  // junto de finanças/transferências; a Central ficou enxuta e focada no jogo.

  const totalRounds = state.season.league.fixtures.length;
  const currentRound = state.season.league.currentRound;
  const progressPct = totalRounds > 0 ? Math.round((currentRound / totalRounds) * 100) : 0;
  const gamesPlayed = record.wins + record.draws + record.losses;

  const topScorer = useMemo(() => {
    const tally = state.season.userGoalScorers ?? {};
    const entries = Object.entries(tally);
    if (entries.length === 0) return null;
    return entries.reduce((best, cur) => cur[1] > best[1] ? cur : best);
  }, [state.season.userGoalScorers]);

  // Fase 3c — feed social (FC Hub): resultado do último jogo do usuário, posição,
  // contratação de destaque e adversário — tudo derivado read-only do estado.
  const lastUserResult = useMemo(() => {
    const userId = state.season.league.userTeamId;
    for (let r = state.season.league.fixtures.length - 1; r >= 0; r--) {
      const round = state.season.league.fixtures[r];
      const played = round.find(f => f.played && (f.homeTeamId === userId || f.awayTeamId === userId));
      if (played && played.homeScore != null && played.awayScore != null) {
        const userHome = played.homeTeamId === userId;
        return {
          userScore: userHome ? played.homeScore : played.awayScore,
          oppScore: userHome ? played.awayScore : played.homeScore,
        };
      }
    }
    return undefined;
  }, [state.season.league.fixtures, state.season.league.userTeamId]);

  const marqueeSigning = useMemo(() => {
    const transfers = getTransferHistory(state);
    const buys = transfers.filter(t => t.type === 'BUY' && t.seasonYear === state.currentSeasonYear);
    if (buys.length === 0) return undefined;
    return buys.sort((a, b) => b.amount - a.amount)[0].playerName;
  }, [state]);

  const opponentTeam = useMemo(() => {
    if (!nextMatch) return null;
    return state.season.league.teams.find(t => t.id === nextMatch.opponentTeamId)
      ?? state.season.cup.teams.find(t => t.id === nextMatch.opponentTeamId)
      ?? state.season.continentalCup?.teams.find(t => t.id === nextMatch.opponentTeamId)
      ?? null;
  }, [nextMatch, state.season.league.teams, state.season.cup.teams, state.season.continentalCup]);

  const socialPosts = useMemo(() => {
    if (!userTeam) return [];
    return generateSocialFeed({
      userTeam,
      opponentName: opponentTeam?.name ?? 'adversário',
      userPosition,
      totalTeams: state.season.league.teams.length,
      lastResult: lastUserResult,
      marqueeSigning,
      seasonYear: state.currentSeasonYear,
    });
  }, [userTeam, opponentTeam, userPosition, state.season.league.teams.length, lastUserResult, marqueeSigning, state.currentSeasonYear]);

  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Voltar">
          ← Voltar
        </button>
      </div>

      {/* Club Identity Hero */}
      {userTeam && (
        <div className={styles.clubHero}>
          <div className={styles.clubCrest}>
            <img src={crestSrc(userTeam.logoUrl)} alt={userTeam.name} className={styles.crestImg} />
          </div>
          <div className={styles.clubInfo}>
            <h1 className={styles.clubName}>{userTeam.name}</h1>
            <div className={styles.clubMeta}>
              <span>{league.flag} {league.name}</span>
              <span>·</span>
              <span>Temporada {state.currentSeasonYear}</span>
              {userTeam.stadium && <><span>·</span><span>🏟️ {userTeam.stadium}</span></>}
            </div>
            <div className={styles.managerRow}>
              <span className={styles.managerName}>👔 {state.manager.name}</span>
              <span className={styles.managerRep}>
                ⭐ {state.manager.reputation} rep
              </span>
              <span className={styles.sponsorBadge}>
                👕 {sponsorName}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className={styles.quickStats}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{gamesPlayed}</span>
          <span className={styles.statLabel}>Jogos</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#34d399' }}>{record.wins}</span>
          <span className={styles.statLabel}>Vitórias</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#9ca3af' }}>{record.draws}</span>
          <span className={styles.statLabel}>Empates</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue} style={{ color: '#f87171' }}>{record.losses}</span>
          <span className={styles.statLabel}>Derrotas</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{record.goalsFor}</span>
          <span className={styles.statLabel}>Gols</span>
        </div>
      </div>

      {/* Season Progress + Position */}
      {!seasonReady && (
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <span>Progresso da Temporada</span>
            <span>{currentRound}/{totalRounds} rodadas ({progressPct}%)</span>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
          <div className={styles.progressFooter}>
            <span>{userPosition}º lugar · {userTeam ? `OVR titular médio: ${avgOvr}` : ''}</span>
            {topScorer && <span>⚽ Artilheiro: {topScorer[0]} ({topScorer[1]} gols)</span>}
          </div>
        </div>
      )}

      {/* Competition Status */}
      <div className={styles.compRow}>
        <span>🏆 {league.cupName}: <strong>{cupStageLabel}</strong></span>
      </div>

      {state.season.continentalCup && state.season.continentalCupDef && (() => {
        const cc = state.season.continentalCup;
        const ccDef = state.season.continentalCupDef;
        const label = cc.stage === 'champion'
          ? (cc.championId === state.season.league.userTeamId ? '🏆 Campeão!' : 'Eliminado')
          : (CUP_STAGE_LABELS[cc.stage] ?? cc.stage);
        return (
          <div className={styles.compRow} style={{ borderLeft: `3px solid ${ccDef.color}`, paddingLeft: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <span>{ccDef.logo} {ccDef.name}: <strong>{label}</strong></span>
            <button
              onClick={onViewContinental}
              style={{ background: 'transparent', border: `1px solid ${ccDef.color}88`, color: ccDef.color, borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
            >
              Ver chave →
            </button>
          </div>
        );
      })()}

      {boardObj && boardObj.objectives.length > 0 && (
        <div className={styles.objectivesCard}>
          <div className={styles.objectivesTitle}>Objetivos da Diretoria</div>
          {boardObj.objectives.map(obj => {
            const isAchieved = obj.achieved === true;
            const isFailed = obj.achieved === false;
            const isPending = obj.achieved === undefined;
            // Enquanto a temporada corre, mostra onde o time está em relação à meta.
            // Sem isto tudo ficava "📌 pendente" até o último dia, e o usuário só
            // descobria que falhou quando já não dava pra reagir.
            const prog = isPending
              ? getObjectiveProgress(obj, userPosition, cupProgress.stage, cupProgress.eliminated, finances.budget)
              : null;
            const icon = isAchieved ? '✅'
              : isFailed ? '❌'
              : prog?.status === 'atingido' ? '✅'
              : prog?.status === 'fora' ? '⚠️'
              : '📌';
            return (
              <div key={obj.id} className={`${styles.objectiveRow} ${isAchieved ? styles.objAchieved : isFailed ? styles.objFailed : ''}`}>
                <span className={styles.objectiveIcon}>{icon}</span>
                <span className={styles.objectiveLabel}>
                  {obj.label}
                  {prog && <span className={styles.objectiveProgress}>{prog.detail}</span>}
                </span>
                <span className={styles.objectiveReward}>
                  {isPending ? `+${obj.reward} rep` : isAchieved ? `+${obj.reward}` : `-${obj.penalty}`}
                </span>
              </div>
            );
          })}
          {boardObj.objectives.some(o => o.achieved === undefined) && (
            <div className={styles.objectivesPending}>Em andamento — avaliação ao fim da temporada</div>
          )}
          {boardObj.streakBad >= 2 && (
            <div className={styles.objectivesWarning}>
              ⚠️ {boardObj.streakBad >= 3 ? 'Última chance: ' : ''}Diretoria insatisfeita ({boardObj.streakBad} temporada{boardObj.streakBad > 1 ? 's' : ''} consecutiva{boardObj.streakBad > 1 ? 's' : ''} abaixo do esperado)
            </div>
          )}
        </div>
      )}

      <button className={styles.jobMarketCard} onClick={onOpenJobMarket}>
        <span className={styles.jobMarketIcon} aria-hidden="true">💼</span>
        <span className={styles.jobMarketLabel}>
          Mercado de Treinador
          {jobOfferCount > 0 && <span className={styles.jobMarketBadge}>{jobOfferCount} oferta{jobOfferCount > 1 ? 's' : ''}</span>}
        </span>
        <span className={styles.jobMarketChevron}>→</span>
      </button>

      {onSyncRosters && (
        <div className={styles.rosterSyncCard}>
          <div className={styles.rosterSyncInfo}>
            <span className={styles.rosterSyncLabel}>🔄 Elencos</span>
            {rosterLastUpdatedAt && (
              <span className={styles.rosterSyncMeta}>
                Última atualização: {new Date(rosterLastUpdatedAt).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
          <button
            className={styles.rosterSyncBtn}
            onClick={onSyncRosters}
            disabled={rosterSyncing}
            title="Buscar elencos atualizados das 12 ligas na API e salvar na nuvem"
          >
            {rosterSyncing ? 'Sincronizando...' : 'Atualizar Elencos via API'}
          </button>
        </div>
      )}

      {/* Status do backup na nuvem — antes falhava 100% em silêncio (o hook expunha
          `status`/`retry`, mas nenhuma tela lia). `idle`/`loading` = nada a reportar
          (sem nuvem configurada ou ainda carregando). */}
      {(cloudStatus === 'saving' || cloudStatus === 'saved' || cloudStatus === 'offline') && (
        <div className={styles.cloudSaveRow} role="status" aria-live="polite">
          {cloudStatus === 'saving' && (
            <span className={styles.cloudSaveMuted}>☁️ Salvando na nuvem…</span>
          )}
          {cloudStatus === 'saved' && (
            <span className={styles.cloudSaveMuted}>☁️ Backup na nuvem em dia</span>
          )}
          {cloudStatus === 'offline' && (
            <>
              <span className={styles.cloudSaveOffline}>
                ⚠️ Backup na nuvem falhou — progresso salvo só neste dispositivo
              </span>
              {onRetryCloudSave && (
                <button className={styles.cloudRetryBtn} onClick={onRetryCloudSave}>
                  Tentar de novo
                </button>
              )}
            </>
          )}
        </div>
      )}

      {onRespondConversation && (
        <ConversationsPanel
          conversations={getPlayerConversations(state)}
          onRespond={onRespondConversation}
        />
      )}

      <InboxPanel
        messages={inbox}
        onMarkRead={onMarkInboxRead}
        onAcceptTransferOffer={onAcceptTransferOffer}
        onRejectTransferOffer={onRejectTransferOffer}
      />

      {nextMatch && !seasonReady && opponentTeam && onApplyTraining && onOpenPressConference && (
        <PreMatchPrepCard
          trainingDone={trainingDone}
          pressDone={!!pressDone}
          opponentName={opponentTeam.name}
          onTraining={onApplyTraining}
          onOpenPress={() => onOpenPressConference(opponentTeam)}
          pressQuestion={pressQuestion ?? null}
          onAnswerPress={onAnswerPressConference ?? (() => {})}
          onClosePress={onClosePressConference ?? (() => {})}
        />
      )}

      {socialPosts.length > 0 && <SocialFeedCard posts={socialPosts} />}

      {nextMatch && !seasonReady && (
        <div className={styles.nextMatchCard}>
          <div className={styles.nextMatchLabel}>
            {nextMatch.type === 'league' ? '📅' : nextMatch.type === 'continental' ? nextMatch.cupLogo : '🏆'} Próxima Partida · {
              nextMatch.type === 'league' ? `Liga (Rodada ${nextMatch.round + 1})`
              : nextMatch.type === 'continental' ? `${nextMatch.cupShortName} (${nextMatch.stageLabel})`
              : `Copa (${nextMatch.stageLabel})`
            }
          </div>
          <div className={styles.nextMatchTeams}>
            <strong>{nextMatch.homeName}</strong>
            <span className={styles.nextMatchVs}>vs</span>
            <strong>{nextMatch.awayName}</strong>
          </div>
          <button className={styles.playBtn} onClick={() => {
            if (nextMatch.type === 'league') onPlayNext();
            else if (nextMatch.type === 'continental') onPlayNextContinental();
            else onPlayNextCup();
          }}>
            ⚽ Jogar
          </button>
        </div>
      )}

      {awaitingRound && (
        <div className={styles.advanceRow}>
          {roundComplete ? (
            <>
              <button
                className={styles.advanceBtn}
                onClick={onNextRound}
                disabled={!!blockAdvanceReason}
                title={blockAdvanceReason}
              >
                Avançar Rodada →
              </button>
              {blockAdvanceReason && <div className={styles.advanceStatus}>🔔 {blockAdvanceReason}</div>}
            </>
          ) : (
            <button className={styles.advanceBtn} onClick={onViewLeague}>
              Simular resto da rodada no Escritório →
            </button>
          )}
        </div>
      )}

      {seasonReady ? (
        <div className={styles.advanceRow}>
          <button className={styles.advanceBtn} onClick={onAdvanceSeason}>Avançar Temporada →</button>
        </div>
      ) : (
        <div className={styles.advanceStatus}>Termine a liga e a copa pra avançar de temporada</div>
      )}

      <div className={styles.newCareerRow}>
        <button className={styles.newCareerBtn} onClick={onNewCareer}>
          Começar nova carreira noutra liga
        </button>
      </div>
    </div>
  );
}
