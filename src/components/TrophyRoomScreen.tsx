import { useState } from 'react';
import type { CareerSeasonHistoryEntry, ClubFinances, TransferRecord, TransferRecordType } from '../engine/career';
import { CUP_RESULT_LABELS } from '../engine/careerLabels';
import { computeCareerSummary, careerHighlights } from '../engine/careerStats';
import { formatMoney } from '../utils/formatMoney';
import { playerOvr } from '../utils/playerOvr';
import { getContractSeasonsLeft } from '../engine/career';
import type { Player } from '../engine/types';
import FinancePanel from './FinancePanel';
import CareerSummaryPanel from './CareerSummaryPanel';
import styles from './TrophyRoomScreen.module.css';

interface Props {
  history: CareerSeasonHistoryEntry[];
  /** Só passado no Modo Carreira (única forma de uso desta tela hoje) — vira a aba "Meu Clube". */
  finances?: ClubFinances;
  /** Idem — extrato de compras/vendas/trocas/agentes livres da carreira inteira. */
  transfers?: TransferRecord[];
  /** Reputação atual do técnico — alimenta o tile de reputação do painel Minha Carreira. */
  reputation?: number;
  /** Elenco atual do usuário — usado pra listar contratos a expirar na gestão do clube. */
  userSquad?: Player[];
  /** Fase 1 — renova contrato por 1 temporada a partir da Central de Comandos. */
  onRenewContract?: (playerId: string) => void;
  // Identidade do clube (hero no topo da aba Meu Clube)
  userTeamName?: string;
  userTeamLogo?: string;
  stadium?: string;
  leagueName?: string;
  leagueFlag?: string;
  seasonYear?: number;
  // Patrocínio (gestão do clube — movido da Central)
  sponsorLabel?: string;
  sponsorName?: string;
  nextSponsorTier?: string | null;
  onRenegotiateSponsor?: () => void;
  /** Resumo da temporada em curso — só usado no estado vazio, pra tela não virar
   *  um beco quando ainda não há nenhuma temporada concluída. */
  currentSeason?: {
    leagueName: string;
    position: number;
    round: number;
    totalRounds: number;
    wins: number;
    draws: number;
    losses: number;
    cupStageLabel: string;
  };
}

function trophyIcon(entry: CareerSeasonHistoryEntry): string {
  if (entry.userLeaguePosition === 1) return '🥇';
  if (entry.cupResult === 'champion') return '🏆';
  if (entry.userLeaguePosition <= 3) return '🥈';
  return '📋';
}

const TRANSFER_ICON: Record<TransferRecordType, string> = {
  BUY: '🛒', SELL: '💰', SIGN_FREE_AGENT: '🆓', TRADE: '🔁',
};

/** BUY/SIGN_FREE_AGENT: o time do usuário sempre é `toTeam` (pagou pra contratar).
 *  SELL: o time do usuário sempre é `fromTeam` (recebeu pra vender).
 *  TRADE: `amount` é a compensação em dinheiro que o usuário pagou por cima da troca
 *  de jogadores (0 numa troca seca) — só mostra valor se houver compensação. */
function transferAmountDisplay(record: TransferRecord): { text: string; color?: string } | null {
  if (record.type === 'SELL') return { text: `+${formatMoney(record.amount)}`, color: '#22c55e' };
  if (record.type === 'TRADE' || record.type === 'SIGN_FREE_AGENT') {
    return record.amount > 0 ? { text: `-${formatMoney(record.amount)}`, color: '#ef4444' } : null;
  }
  return { text: `-${formatMoney(record.amount)}`, color: '#ef4444' };
}

export default function TrophyRoomScreen({ history, finances, transfers, currentSeason, reputation, userSquad, onRenewContract, userTeamName, userTeamLogo, stadium, leagueName, leagueFlag, seasonYear, sponsorLabel, sponsorName, nextSponsorTier, onRenegotiateSponsor }: Props) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const ordered = [...history].sort((a, b) => a.year - b.year);
  const transfersRecent = transfers ? [...transfers].reverse() : [];
  // Painel "Minha Carreira" — só faz sentido com ao menos 1 temporada concluída.
  const summary = ordered.length > 0 ? computeCareerSummary(history, reputation ?? 0) : null;
  const highlights = ordered.length > 0 ? careerHighlights(history, transfers ?? []) : null;
  // Fase 1 — contrato vencendo (≤1 temporada) pra renovação rápida na gestão do clube.
  const expiringContracts = userSquad
    ? userSquad.filter(p => getContractSeasonsLeft(p) <= 1)
    : [];

  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.header}>
        <h1 className={styles.title}>🏆 Sala de Troféus</h1>
      </div>

      {/* Identidade do clube */}
      {userTeamName && (
        <div className={styles.clubHero}>
          {userTeamLogo && <img src={userTeamLogo} alt="" className={styles.crest} />}
          <div className={styles.clubInfo}>
            <h2 className={styles.clubName}>{userTeamName}</h2>
            <div className={styles.clubMeta}>
              {leagueFlag && <span>{leagueFlag}</span>}
              {leagueName && <span>{leagueName}</span>}
              {seasonYear != null && <span>· Temporada {seasonYear}</span>}
              {stadium && <span>· 🏟️ {stadium}</span>}
            </div>
          </div>
        </div>
      )}

      {summary && highlights && <CareerSummaryPanel summary={summary} highlights={highlights} />}

      {finances && <FinancePanel
        finances={finances}
        sponsorLabel={sponsorLabel}
        sponsorName={sponsorName}
      />}

      {onRenegotiateSponsor && nextSponsorTier && (
        <button className={styles.sponsorBtn} onClick={onRenegotiateSponsor}>
          📋 Negociar patrocínio → novo tier
        </button>
      )}

      {userSquad && (
        <div className={styles.contractSection}>
          <div className={styles.repLabel}>📋 Gestão de Contratos</div>
          {expiringContracts.length > 0 ? (
            <div className={styles.contractCard}>
              <div className={styles.contractTitle}>Contratos a expirar</div>
              {expiringContracts.map(p => (
                <div key={p.id} className={styles.contractRow}>
                  <span className={styles.contractName}>{p.name}</span>
                  <span className={`${styles.contractPos} pos-${p.position.toLowerCase()}`}>{p.position}</span>
                  <span className={styles.contractOvr}>{playerOvr(p)} OVR</span>
                  <span className={styles.contractCount}>{getContractSeasonsLeft(p)} temp.</span>
                  {onRenewContract && (
                    <button
                      className={styles.contractBtn}
                      onClick={() => onRenewContract(p.id)}
                      title={`Renovar contrato de ${p.name} por 1 temporada`}
                    >
                      Renovar
                    </button>
                  )}
                </div>
              ))}
              <div className={styles.repLabel}>Contratos vencem ao fim da temporada.</div>
            </div>
          ) : (
            <div className={styles.contractEmpty}>
              Nenhum contrato vencendo — elenco seguro nesta temporada.
            </div>
          )}
        </div>
      )}

      {transfersRecent.length > 0 && (
        <div className={styles.transferSection}>
          <div className={styles.repLabel}>📜 Histórico de Transferências</div>
          <div className={styles.transferList}>
            {transfersRecent.map(record => {
              const amountDisplay = transferAmountDisplay(record);
              return (
                <div key={record.id} className={styles.transferRow}>
                  <span className={styles.transferIcon} aria-hidden="true">{TRANSFER_ICON[record.type]}</span>
                  <div className={styles.transferInfo}>
                    <span className={styles.transferPlayer}>
                      <span>{record.playerName}</span>
                      <span className={`sq-pos pos-${record.playerPosition.toLowerCase()}`}>{record.playerPosition}</span>
                    </span>
                    <span className={styles.transferRoute}>{record.fromTeam} → {record.toTeam}</span>
                    <span className={styles.transferDate}>{record.date}</span>
                  </div>
                  {amountDisplay && (
                    <span className={styles.transferAmount} style={{ color: amountDisplay.color }}>
                      {amountDisplay.text}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ordered.length === 0 ? (
        /* Antes era só "Nenhuma temporada concluída ainda." — a tela não dizia o
         * que falta nem por onde ir. Com a temporada em curso resumida, o vazio
         * passa a ser um ponto de partida em vez de um beco. */
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden="true">🏆</div>
          <p className={styles.emptyTitle}>A galeria ainda está vazia</p>
          {currentSeason ? (
            <>
              <p className={styles.emptyText}>
                Sua primeira temporada entra aqui quando <strong>{currentSeason.leagueName}</strong> e
                a copa terminarem. Situação hoje:
              </p>
              <div className={styles.emptyStats}>
                <div className={styles.emptyStat}>
                  <span className={styles.emptyStatValue}>{currentSeason.position}º</span>
                  <span className={styles.emptyStatLabel}>na liga</span>
                </div>
                <div className={styles.emptyStat}>
                  <span className={styles.emptyStatValue}>
                    {currentSeason.round}/{currentSeason.totalRounds}
                  </span>
                  <span className={styles.emptyStatLabel}>rodadas</span>
                </div>
                <div className={styles.emptyStat}>
                  <span className={styles.emptyStatValue}>
                    {currentSeason.wins}V {currentSeason.draws}E {currentSeason.losses}D
                  </span>
                  <span className={styles.emptyStatLabel}>campanha</span>
                </div>
                <div className={styles.emptyStat}>
                  <span className={styles.emptyStatValue}>{currentSeason.cupStageLabel}</span>
                  <span className={styles.emptyStatLabel}>na copa</span>
                </div>
              </div>
            </>
          ) : (
            <p className={styles.emptyText}>
              Conclua uma temporada de liga e copa para ver o histórico aqui.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {ordered.map(entry => {
              const isExpanded = expandedYear === entry.year;
              const wdl = entry.userWins != null
                ? `${entry.userWins}V ${entry.userDraws}E ${entry.userLosses}D`
                : null;
              return (
                <button
                  key={entry.year}
                  className={`${styles.card} ${isExpanded ? styles.expanded : ''}`}
                  onClick={() => setExpandedYear(prev => (prev === entry.year ? null : entry.year))}
                  aria-expanded={isExpanded}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardIcon} aria-hidden="true">{trophyIcon(entry)}</span>
                    <span className={styles.cardYear}>{entry.year}</span>
                  </div>
                  <div className={styles.cardLine}>{entry.userLeaguePosition}º na liga</div>
                  <div className={styles.cardLine}>{CUP_RESULT_LABELS[entry.cupResult]}</div>
                  {entry.managerOfSeason && <div className={styles.motsTag}>⭐ Técnico da Temporada</div>}

                  {isExpanded && (
                    <div className={styles.details}>
                      {entry.userTopScorer && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Artilheiro</span>
                          <span className={styles.detailValue}>{entry.userTopScorer.name} ({entry.userTopScorer.goals})</span>
                        </div>
                      )}
                      {wdl && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Campanha</span>
                          <span className={styles.detailValue}>{wdl}</span>
                        </div>
                      )}
                      {entry.userGoalsFor != null && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Gols</span>
                          <span className={styles.detailValue}>{entry.userGoalsFor} pró · {entry.userGoalsAgainst} contra</span>
                        </div>
                      )}
                      {entry.budgetDelta != null && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Finanças</span>
                          <span className={styles.detailValue} style={{ color: entry.budgetDelta >= 0 ? '#22c55e' : '#ef4444' }}>
                            {entry.budgetDelta >= 0 ? '+' : ''}{formatMoney(entry.budgetDelta)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className={styles.repSection}>
            <div className={styles.repLabel}>Reputação por temporada</div>
            <div className={styles.repRow}>
              {ordered.map(entry => (
                <span
                  key={entry.year}
                  className={styles.repChip}
                  style={{ color: entry.reputationDelta >= 0 ? '#22c55e' : '#ef4444' }}
                  title={`Temporada ${entry.year}`}
                >
                  {entry.reputationDelta >= 0 ? '+' : ''}{entry.reputationDelta}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
