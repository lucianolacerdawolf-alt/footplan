import { memo, useMemo, type CSSProperties } from 'react';
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
import { Button, StatTile, Icon } from './ui';

interface Props {
  state: CareerState;
  league: LeagueDefinition;
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
  /** Data da última atualização dos elencos (snapshot no Supabase, atualizado fora do jogo
   *  via `npm run rosters:sync`). Só exibição — não há ação de sync no cliente. */
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

function CareerHubScreen({ state, league, onViewContinental, onPlayNext, onPlayNextCup, onPlayNextContinental, onAdvanceSeason, onNewCareer, onBack, onMarkInboxRead, onAcceptTransferOffer, onRejectTransferOffer, onNextRound, onViewLeague, onOpenJobMarket, jobOfferCount, onRespondConversation, onApplyTraining, onOpenPressConference, onAnswerPressConference, onClosePressConference, pressQuestion, pressDone, blockAdvanceReason, rosterLastUpdatedAt, cloudStatus, onRetryCloudSave }: Props) {
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
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Voltar">
          <Icon name="arrow-left" size={14} /> Voltar
        </Button>
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
              {userTeam.stadium && <><span>·</span><span className={styles.metaIcon}><Icon name="stadium" size={12} /> {userTeam.stadium}</span></>}
            </div>
            <div className={styles.managerRow}>
              <span className={styles.managerName}><Icon name="manager" size={13} /> {state.manager.name}</span>
              <span className={styles.managerRep}>
                <Icon name="star" size={13} /> {state.manager.reputation} rep
              </span>
              <span className={styles.sponsorBadge}>
                <Icon name="shirt" size={12} /> {sponsorName}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Corpo em duas colunas no desktop: AÇÃO (o que fazer agora) à esquerda,
          INFORMAÇÃO (contexto do clube/mundo) à direita. Em telas estreitas as
          colunas empilham e a ação vem primeiro. */}
      <div className={styles.body}>
        {/* ── Coluna de ação ────────────────────────────────────── */}
        <div className={styles.primaryCol}>
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

          {nextMatch && !seasonReady && (
            <div className={styles.nextMatchCard}>
              <div className={styles.nextMatchLabel}>
                <Icon name={nextMatch.type === 'league' ? 'calendar' : nextMatch.type === 'continental' ? 'globe' : 'trophy'} size={14} /> Próxima Partida · {
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
              <Button size="lg" onClick={() => {
                if (nextMatch.type === 'league') onPlayNext();
                else if (nextMatch.type === 'continental') onPlayNextContinental();
                else onPlayNextCup();
              }}>
                <Icon name="play" size={16} /> Jogar
              </Button>
            </div>
          )}

          {awaitingRound && (
            <div className={styles.advanceRow}>
              {roundComplete ? (
                <>
                  <Button block onClick={onNextRound} disabled={!!blockAdvanceReason} title={blockAdvanceReason}>
                    Avançar Rodada →
                  </Button>
                  {blockAdvanceReason && <div className={styles.advanceStatus}><Icon name="bell" size={13} /> {blockAdvanceReason}</div>}
                </>
              ) : (
                <Button block variant="secondary" onClick={onViewLeague}>
                  Simular resto da rodada no Escritório →
                </Button>
              )}
            </div>
          )}

          {seasonReady ? (
            <div className={styles.advanceRow}>
              <Button block size="lg" onClick={onAdvanceSeason}>Avançar Temporada →</Button>
            </div>
          ) : (
            <div className={styles.advanceStatus}>Termine a liga e a copa pra avançar de temporada</div>
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
        </div>

        {/* ── Coluna de informação ──────────────────────────────── */}
        <div className={styles.secondaryCol}>
          {/* Quick Stats Row */}
          <div className={styles.quickStats}>
            <StatTile value={gamesPlayed} label="Jogos" />
            <StatTile value={record.wins} label="Vitórias" tone="win" />
            <StatTile value={record.draws} label="Empates" tone="draw" />
            <StatTile value={record.losses} label="Derrotas" tone="loss" />
            <StatTile value={record.goalsFor} label="Gols" />
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
            <span><Icon name="trophy" size={13} /> {league.cupName}: <strong>{cupStageLabel}</strong></span>
          </div>

          {state.season.continentalCup && state.season.continentalCupDef && (() => {
            const cc = state.season.continentalCup;
            const ccDef = state.season.continentalCupDef;
            const label = cc.stage === 'champion'
              ? (cc.championId === state.season.league.userTeamId ? '🏆 Campeão!' : 'Eliminado')
              : (CUP_STAGE_LABELS[cc.stage] ?? cc.stage);
            // A cor da competição é dado dinâmico (vem de ccDef) — entra como custom
            // property e o resto do estilo vive no módulo (.continentalRow/.continentalBtn).
            return (
              <div className={`${styles.compRow} ${styles.continentalRow}`} style={{ '--cc': ccDef.color } as CSSProperties}>
                <span>{ccDef.logo} {ccDef.name}: <strong>{label}</strong></span>
                <button className={styles.continentalBtn} onClick={onViewContinental}>
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
                  <Icon name="warning" size={12} /> {boardObj.streakBad >= 3 ? 'Última chance: ' : ''}Diretoria insatisfeita ({boardObj.streakBad} temporada{boardObj.streakBad > 1 ? 's' : ''} consecutiva{boardObj.streakBad > 1 ? 's' : ''} abaixo do esperado)
                </div>
              )}
            </div>
          )}

          <button className={styles.jobMarketCard} onClick={onOpenJobMarket}>
            <span className={styles.jobMarketIcon}><Icon name="briefcase" size={18} /></span>
            <span className={styles.jobMarketLabel}>
              Mercado de Treinador
              {jobOfferCount > 0 && <span className={styles.jobMarketBadge}>{jobOfferCount} oferta{jobOfferCount > 1 ? 's' : ''}</span>}
            </span>
            <span className={styles.jobMarketChevron}><Icon name="chevron-right" size={16} /></span>
          </button>

          {socialPosts.length > 0 && <SocialFeedCard posts={socialPosts} />}
        </div>
      </div>

      {/* Status do backup na nuvem — antes falhava 100% em silêncio (o hook expunha
          `status`/`retry`, mas nenhuma tela lia). `idle`/`loading` = nada a reportar
          (sem nuvem configurada ou ainda carregando). */}
      {(cloudStatus === 'saving' || cloudStatus === 'saved' || cloudStatus === 'offline') && (
        <div className={styles.cloudSaveRow} role="status" aria-live="polite">
          {cloudStatus === 'saving' && (
            <span className={styles.cloudSaveMuted}><Icon name="cloud" size={13} /> Salvando na nuvem…</span>
          )}
          {cloudStatus === 'saved' && (
            <span className={styles.cloudSaveMuted}><Icon name="cloud" size={13} /> Backup na nuvem em dia</span>
          )}
          {cloudStatus === 'offline' && (
            <>
              <span className={styles.cloudSaveOffline}>
                <Icon name="cloud-off" size={13} /> Backup na nuvem falhou — progresso salvo só neste dispositivo
              </span>
              {onRetryCloudSave && (
                <Button variant="secondary" size="sm" onClick={onRetryCloudSave}>
                  Tentar de novo
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Elencos vêm do snapshot no Supabase (atualizado fora do jogo via
          `npm run rosters:sync`). Só exibe a data — sem ação de sync no cliente. */}
      {rosterLastUpdatedAt && (
        <div className={styles.rosterSyncInfo}>
          <span className={styles.rosterSyncLabel}><Icon name="refresh" size={13} /> Elencos</span>
          <span className={styles.rosterSyncMeta}>
            Atualizados em {new Date(rosterLastUpdatedAt).toLocaleDateString('pt-BR')}
          </span>
        </div>
      )}

      <div className={styles.newCareerRow}>
        <button className={styles.newCareerBtn} onClick={onNewCareer}>
          Começar nova carreira noutra liga
        </button>
      </div>
    </div>
  );
}

// React.memo: a Central é a tela mais pesada da carreira e o App re-renderiza a
// cada toast/save. Com todas as props estáveis (handlers do bundle career são
// useCallback; navegação hoistada p/ callbacks estáveis no App; state/league por
// referência), o memo deixa a Central pular re-renders quando nada dela mudou.
export default memo(CareerHubScreen);
