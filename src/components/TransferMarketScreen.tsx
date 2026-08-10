import { useState, useEffect, useRef } from 'react';
import type { Team, Player, Position } from '../engine/types';
import { allLeagues } from '../data/leagues';
import { getAvgOvr } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import { formatMoney } from '../utils/formatMoney';
import { calculateMarketValue } from '../engine/transferMarket';
import { syncLeagueRoster } from '../services/rosterSync';
import PlayerDetailModal from './PlayerDetailModal';
import styles from './TransferMarketScreen.module.css';
import { crestSrc } from '../utils/crest';

interface Props {
  userTeam: Team;
  /** Liga do usuário — seus jogos de liga/copa rodam aqui; o mercado de compra
   *  agora cobre todas as ligas do jogo, não só esta. */
  userLeagueId: string;
  /** Elencos de todas as 12 ligas, indexados por id de liga. */
  rosters: Record<string, Team[]>;
  freeAgents: Player[];
  /** Ids do próprio elenco atualmente na lista de venda. */
  transferListPlayerIds: string[];
  budget: number;
  isWindowOpen: boolean;
  onBuyPlayer: (playerId: string, fromTeamId: string, amount: number) => { success: boolean; reason: string };
  onListPlayerForSale: (playerId: string) => { success: boolean; reason: string };
  onUnlistPlayerForSale: (playerId: string) => void;
  onSignFreeAgent: (playerId: string, amount: number) => { success: boolean; reason: string };
  /** Só a liga da carreira sincroniza automaticamente (D-04) — ao navegar pra outra liga
   *  aqui no Mercado, sincroniza ela sob demanda (uma vez, cache de 7 dias) pra trazer
   *  nome/idade/nacionalidade reais também pros times de fora da liga do usuário. */
  onRosterSynced?: (leagueId: string, teams: Team[]) => void;
  /** Abre a tela de proposta de troca (jogador por jogador, com ou sem dinheiro).
   *  É o único caminho de entrada dela — sem isso a tela fica inalcançável. */
  onProposeTrade?: () => void;
}

const POSITIONS: Position[] = ['GK', 'DEF', 'MID', 'FWD'];
type SortKey = 'ovr' | 'value' | 'name';

interface SearchHit { player: Player; team: Team; leagueId: string }

const MAX_SEARCH_RESULTS = 40;

function leagueMeta(leagueId: string) {
  return allLeagues.find(l => l.id === leagueId);
}

function resultMessage(reason: string): string {
  switch (reason) {
    case 'premium-offer': return '🎉 Oferta irrecusável — negócio fechado!';
    case 'value-met': return '✅ Oferta aceita!';
    case 'signed': return '✅ Contrato assinado!';
    case 'too-low': return '❌ Recusada — valor muito abaixo do mercado.';
    case 'window-closed': return 'A janela de transferências está fechada.';
    case 'insufficient-budget': return 'Orçamento insuficiente pra essa oferta.';
    case 'seller-last-at-position': return 'Esse time não pode vender: ficaria sem nenhum jogador na posição.';
    case 'last-at-position': return 'Não é possível colocar à venda: você ficaria sem nenhum jogador nessa posição.';
    case 'listed': return '📋 Jogador colocado na lista de venda!';
    case 'already-listed': return 'Esse jogador já está na lista de venda.';
    case 'invalid-player': case 'invalid-team': return 'Jogador ou time inválido.';
    default: return 'Não foi possível concluir a operação.';
  }
}

function sortPlayers<T extends Player>(players: T[], sortBy: SortKey): T[] {
  return [...players].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'value') return (b.marketValue ?? calculateMarketValue(b)) - (a.marketValue ?? calculateMarketValue(a));
    return playerOvr(b) - playerOvr(a);
  });
}

export default function TransferMarketScreen({ userTeam, userLeagueId, rosters, freeAgents, transferListPlayerIds, budget, isWindowOpen, onBuyPlayer, onListPlayerForSale, onUnlistPlayerForSale, onSignFreeAgent, onRosterSynced, onProposeTrade }: Props) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'free-agents'>('buy');
  const [positionFilter, setPositionFilter] = useState<'ALL' | Position>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('ovr');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [feedback, setFeedback] = useState<{ playerId: string; message: string; success: boolean } | null>(null);
  const [detailPlayer, setDetailPlayer] = useState<{ player: Player; teamName?: string; leagueFlag?: string } | null>(null);

  // Comprar: navegação Liga → Time → Jogador, ou busca direta pelo nome (bypassa a navegação).
  const [buyLeagueId, setBuyLeagueId] = useState<string | null>(null);
  const [buyTeamId, setBuyTeamId] = useState<string | null>(null);
  const [buySearch, setBuySearch] = useState('');
  const [syncingLeagueId, setSyncingLeagueId] = useState<string | null>(null);
  const rostersRef = useRef(rosters);
  rostersRef.current = rosters;
  const syncedLeagueIdsRef = useRef<Set<string>>(new Set());

  // Ao entrar numa liga que não é a da carreira (nunca sincroniza sozinha, ver D-04),
  // busca o elenco ao vivo uma vez por sessão — nome/idade/nacionalidade reais passam a
  // aparecer pra qualquer time que o usuário navegue no Mercado, não só o da própria liga.
  useEffect(() => {
    if (!buyLeagueId || buyLeagueId === userLeagueId) return;
    if (syncedLeagueIdsRef.current.has(buyLeagueId)) return;
    const meta = allLeagues.find(l => l.id === buyLeagueId);
    if (!meta) return;
    syncedLeagueIdsRef.current.add(buyLeagueId);
    setSyncingLeagueId(buyLeagueId);
    const leagueToSync = { ...meta, teams: rostersRef.current[buyLeagueId] ?? meta.teams };
    syncLeagueRoster(leagueToSync)
      .then(result => {
        if (result.source === 'live' || result.source === 'cache' || result.source === 'cloud') {
          onRosterSynced?.(buyLeagueId, result.league.teams);
        }
      })
      .finally(() => setSyncingLeagueId(prev => (prev === buyLeagueId ? null : prev)));
  }, [buyLeagueId, userLeagueId, onRosterSynced]);

  const switchTab = (tab: 'buy' | 'sell' | 'free-agents') => {
    setActiveTab(tab); setExpandedId(null); setFeedback(null);
    setBuyLeagueId(null); setBuyTeamId(null); setBuySearch('');
  };

  const applyFilter = (players: Player[]) =>
    sortPlayers(positionFilter === 'ALL' ? players : players.filter(p => p.position === positionFilter), sortBy);

  const filterHits = (hits: SearchHit[]) =>
    positionFilter === 'ALL' ? hits : hits.filter(h => h.player.position === positionFilter);

  const sortHits = (hits: SearchHit[]) => [...hits].sort((a, b) => {
    if (sortBy === 'name') return a.player.name.localeCompare(b.player.name);
    if (sortBy === 'value') return (b.player.marketValue ?? calculateMarketValue(b.player)) - (a.player.marketValue ?? calculateMarketValue(a.player));
    return playerOvr(b.player) - playerOvr(a.player);
  });

  const handleExpand = (playerId: string, defaultMultiplier: number) => {
    setFeedback(null);
    setExpandedId(prev => (prev === playerId ? null : playerId));
    setMultiplier(defaultMultiplier);
  };

  const handleBuy = (player: Player, teamId: string) => {
    const marketValue = player.marketValue ?? calculateMarketValue(player);
    const amount = Math.round(marketValue * multiplier);
    const res = onBuyPlayer(player.id, teamId, amount);
    setFeedback({ playerId: player.id, message: resultMessage(res.reason), success: res.success });
    if (res.success) setExpandedId(null);
  };

  const handleSign = (player: Player) => {
    const marketValue = player.marketValue ?? calculateMarketValue(player);
    const amount = Math.round(marketValue * multiplier);
    const res = onSignFreeAgent(player.id, amount);
    setFeedback({ playerId: player.id, message: resultMessage(res.reason), success: res.success });
    if (res.success) setExpandedId(null);
  };

  const handleList = (player: Player) => {
    const res = onListPlayerForSale(player.id);
    setFeedback({ playerId: player.id, message: resultMessage(res.reason), success: res.success });
    if (res.success) setExpandedId(null);
  };

  const renderInfoBtn = (p: Player, ctx?: { teamName?: string; leagueFlag?: string }) => (
    <button
      type="button"
      className={styles.infoBtn}
      onClick={e => { e.stopPropagation(); setDetailPlayer({ player: p, ...ctx }); }}
      aria-label={`Ver detalhes de ${p.name}`}
      title="Ver detalhes"
    >
      ⓘ
    </button>
  );

  const searchQuery = buySearch.trim();
  const allHits: SearchHit[] = searchQuery.length < 2 ? [] : Object.entries(rosters).flatMap(([leagueId, teams]) =>
    teams
      .filter(team => team.id !== userTeam.id)
      .flatMap(team => team.squad
        .filter(player => player.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .map(player => ({ player, team, leagueId })))
  );
  const visibleHits = sortHits(filterHits(allHits)).slice(0, MAX_SEARCH_RESULTS);

  const buyTeam = buyLeagueId && buyTeamId ? rosters[buyLeagueId]?.find(t => t.id === buyTeamId) ?? null : null;
  const buyTeamSquad = buyTeam ? applyFilter(buyTeam.squad) : [];

  // Mensagens de "sem resultado"/"orçamento insuficiente" ficam escopadas à lista
  // realmente visível no momento (busca, elenco do time selecionado, ou agentes livres) —
  // nada disso se aplica enquanto o usuário só está navegando por ligas/times.
  const showFilterBar = (activeTab === 'buy' && (searchQuery.length >= 2 || !!buyTeam)) || activeTab === 'sell' || activeTab === 'free-agents';
  const visiblePlayerValues: number[] =
    activeTab === 'buy' && searchQuery.length >= 2 ? filterHits(allHits).map(h => h.player.marketValue ?? calculateMarketValue(h.player))
    : activeTab === 'buy' && buyTeam ? buyTeamSquad.map(p => p.marketValue ?? calculateMarketValue(p))
    : activeTab === 'sell' ? applyFilter(userTeam.squad).map(p => p.marketValue ?? calculateMarketValue(p))
    : activeTab === 'free-agents' ? applyFilter(freeAgents).map(p => p.marketValue ?? calculateMarketValue(p))
    : [];
  const cheapestVisible = Math.min(...visiblePlayerValues, Infinity);

  const renderOfferCard = (player: Player, marketValue: number, mode: 'buy' | 'sign', onConfirm: () => void) => {
    const min = mode === 'buy' ? 0.7 : 0;
    const max = mode === 'buy' ? 1.5 : 0.3;
    const amount = Math.round(marketValue * multiplier);
    const overBudget = amount > budget;
    return (
      <div className={styles.offerCard}>
        <div className={styles.offerRow}>
          <input
            type="range" min={min} max={max} step={0.05}
            value={multiplier}
            onChange={e => setMultiplier(Number(e.target.value))}
            className={styles.slider}
            aria-label={mode === 'buy' ? 'Multiplicador da oferta' : 'Luva de contratação'}
          />
          <span className={styles.offerAmount}>{formatMoney(amount)}</span>
        </div>
        {mode === 'buy' && multiplier >= 1.5 && <span className={styles.irresistibleBadge}>Oferta Irrecusável</span>}
        <div className={styles.offerActions}>
          <button className={styles.confirmBtn} disabled={overBudget} onClick={onConfirm}>
            {mode === 'buy' ? 'Confirmar Oferta' : 'Assinar Contrato'}
          </button>
          <button className={styles.cancelBtn} onClick={() => setExpandedId(null)}>Cancelar</button>
        </div>
        {overBudget && <span className={styles.warnText}>Ultrapassa o orçamento disponível.</span>}
        {feedback?.playerId === player.id && (
          <span className={feedback.success ? styles.successText : styles.warnText}>{feedback.message}</span>
        )}
      </div>
    );
  };

  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.header}>
        <h1 className={styles.title}>🛒 Mercado</h1>
        {activeTab === 'buy' && buyLeagueId && leagueMeta(buyLeagueId) && (
          <span className={styles.leagueBadge} aria-label={`Navegando em ${leagueMeta(buyLeagueId)!.name}`}>
            <img src={leagueMeta(buyLeagueId)!.logo} alt="" className={styles.leagueBadgeLogo} />
            <span className={styles.leagueBadgeName}>{leagueMeta(buyLeagueId)!.name}</span>
          </span>
        )}
        <span className={styles.budget}>{formatMoney(budget)}</span>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tabBtn} ${activeTab === 'buy' ? styles.active : ''}`} onClick={() => switchTab('buy')}>
          🛒 Comprar Jogadores
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'sell' ? styles.active : ''}`} onClick={() => switchTab('sell')}>
          💰 Vender Jogadores
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'free-agents' ? styles.active : ''}`} onClick={() => switchTab('free-agents')}>
          🆓 Agentes Livres ({freeAgents.length})
        </button>
        {onProposeTrade && (
          <button className={styles.tabBtn} onClick={onProposeTrade}>
            🔄 Propor Troca
          </button>
        )}
      </div>

      {!isWindowOpen ? (
        <div className={styles.closedBanner}>
          🔒 Janela de transferências fechada. Abre nas rodadas 1-5 e 19-24.
        </div>
      ) : (
        <>
          {activeTab === 'buy' && (
            <div className={styles.searchBar}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="🔍 Buscar jogador pelo nome, em todas as ligas…"
                value={buySearch}
                onChange={e => { setBuySearch(e.target.value); setExpandedId(null); }}
              />
              {buySearch && <button className={styles.filterBtn} onClick={() => setBuySearch('')}>✕</button>}
            </div>
          )}

          {showFilterBar && (
            <div className={styles.filterBar}>
              <div className={styles.filterGroup}>
                <button className={`${styles.filterBtn} ${positionFilter === 'ALL' ? styles.active : ''}`} onClick={() => setPositionFilter('ALL')}>Todos</button>
                {POSITIONS.map(pos => (
                  <button key={pos} className={`${styles.filterBtn} ${positionFilter === pos ? styles.active : ''}`} onClick={() => setPositionFilter(pos)}>{pos}</button>
                ))}
              </div>
              <select className={styles.sortSelect} value={sortBy} onChange={e => setSortBy(e.target.value as SortKey)} aria-label="Ordenar">
                <option value="ovr">OVR ↓</option>
                <option value="value">Valor ↓</option>
                <option value="name">Nome A-Z</option>
              </select>
            </div>
          )}

          {showFilterBar && cheapestVisible === Infinity && (
            <div className={styles.emptyState}>
              {activeTab === 'free-agents' ? 'Nenhum agente livre disponível no momento.'
                : activeTab === 'buy' && searchQuery.length >= 2 ? `Nenhum jogador encontrado com "${searchQuery}".`
                : 'Nenhum jogador encontrado com esse filtro.'}
            </div>
          )}
          {showFilterBar && activeTab !== 'sell' && cheapestVisible !== Infinity && cheapestVisible > budget && (
            <div className={styles.emptyState}>Orçamento insuficiente para contratar qualquer jogador visível.</div>
          )}

          {activeTab === 'buy' && (
            <>
              {searchQuery.length >= 2 ? (
                <div className={styles.teamGroup}>
                  {visibleHits.map(({ player: p, team, leagueId }) => {
                    const marketValue = p.marketValue ?? calculateMarketValue(p);
                    const league = leagueMeta(leagueId);
                    return (
                      <div key={p.id} className={styles.playerRow}>
                        <div className={styles.playerRowFlex}>
                          <button className={styles.playerRowHeader} onClick={() => handleExpand(p.id, 1)}>
                            <span className={styles.playerName}>{p.name}</span>
                            <span className={styles.searchHitSource}>{league?.flag} {team.abbreviation}</span>
                            <span className={`${styles.playerPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                            <span className={styles.playerOvr}>{playerOvr(p)}</span>
                            <span className={styles.playerValue}>{formatMoney(marketValue)}</span>
                          </button>
                          {renderInfoBtn(p, { teamName: team.name, leagueFlag: league?.flag })}
                        </div>
                        {expandedId === p.id && renderOfferCard(p, marketValue, 'buy', () => handleBuy(p, team.id))}
                      </div>
                    );
                  })}
                  {filterHits(allHits).length > MAX_SEARCH_RESULTS && (
                    <div className={styles.searchHint}>Mostrando os {MAX_SEARCH_RESULTS} primeiros — refine sua busca pra ver mais.</div>
                  )}
                </div>
              ) : searchQuery.length === 1 ? (
                <div className={styles.emptyState}>Digite ao menos 2 letras pra buscar.</div>
              ) : !buyLeagueId ? (
                <div className={styles.leagueGrid}>
                  {allLeagues.map(l => (
                    <button key={l.id} className={styles.leagueCard} onClick={() => setBuyLeagueId(l.id)}>
                      <img src={l.logo} alt={l.name} className={styles.leagueLogo} />
                      <span className={styles.leagueName}>{l.name}{l.id === userLeagueId ? ' (sua liga)' : ''}</span>
                      <span className={styles.leagueMeta}>{(rosters[l.id] ?? l.teams).length} times</span>
                    </button>
                  ))}
                </div>
              ) : !buyTeam ? (
                <>
                  <button className={styles.backLink} onClick={() => setBuyLeagueId(null)}>← Ligas</button>
                  {syncingLeagueId === buyLeagueId && (
                    <div className={styles.syncHint}>🔄 Sincronizando elenco desta liga…</div>
                  )}
                  <div className={styles.teamGroups}>
                    {[...(rosters[buyLeagueId] ?? [])]
                      .filter(t => t.id !== userTeam.id)
                      .sort((a, b) => getAvgOvr(b) - getAvgOvr(a))
                      .map(team => (
                        <div key={team.id} className={styles.teamGroup}>
                          <button className={styles.playerRowHeader} onClick={() => setBuyTeamId(team.id)} style={{ width: '100%', justifyContent: 'flex-start' }}>
                            <img src={crestSrc(team.logoUrl)} alt="" className={styles.teamCrest} />
                            <span className={styles.teamName}>{team.name}</span>
                            <span className={styles.teamAvgOvr}>OVR {getAvgOvr(team)}</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <>
                  <button className={styles.backLink} onClick={() => setBuyTeamId(null)}>← {buyTeam.name}</button>
                  <div className={styles.teamGroup}>
                    {buyTeamSquad.map(p => {
                      const marketValue = p.marketValue ?? calculateMarketValue(p);
                      return (
                        <div key={p.id} className={styles.playerRow}>
                          <div className={styles.playerRowFlex}>
                            <button className={styles.playerRowHeader} onClick={() => handleExpand(p.id, 1)}>
                              <span className={styles.playerNum}>#{p.number}</span>
                              <span className={styles.playerName}>{p.name}</span>
                              <span className={`${styles.playerPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                              <span className={styles.playerOvr}>{playerOvr(p)}</span>
                              <span className={styles.playerValue}>{formatMoney(marketValue)}</span>
                            </button>
                            {renderInfoBtn(p, { teamName: buyTeam.name, leagueFlag: leagueMeta(buyLeagueId)?.flag })}
                          </div>
                          {expandedId === p.id && renderOfferCard(p, marketValue, 'buy', () => handleBuy(p, buyTeam.id))}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'sell' && (
            <>
              {transferListPlayerIds.length > 0 && (
                <div className={styles.teamGroup}>
                  <div className={styles.teamGroupHeader}>
                    <span className={styles.teamName}>📋 Na Lista de Venda</span>
                  </div>
                  {applyFilter(userTeam.squad.filter(p => transferListPlayerIds.includes(p.id))).map(p => {
                    const marketValue = p.marketValue ?? calculateMarketValue(p);
                    return (
                      <div key={p.id} className={styles.playerRow}>
                        <div className={styles.playerRowFlex}>
                          <div className={styles.playerRowHeader}>
                            <span className={styles.playerNum}>#{p.number}</span>
                            <span className={styles.playerName}>{p.name}</span>
                            <span className={`${styles.playerPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                            <span className={styles.playerOvr}>{playerOvr(p)}</span>
                            <span className={styles.playerValue}>{formatMoney(marketValue)}</span>
                          </div>
                          {renderInfoBtn(p, { teamName: userTeam.name })}
                        </div>
                        <div className={styles.listedRow}>
                          <span className={styles.listedHint}>⏳ Aguardando propostas de qualquer time…</span>
                          <button className={styles.filterBtn} onClick={() => onUnlistPlayerForSale(p.id)}>Retirar</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={styles.teamGroup}>
                <div className={styles.teamGroupHeader}>
                  <span className={styles.teamName}>Seu Elenco</span>
                </div>
                {applyFilter(userTeam.squad.filter(p => !transferListPlayerIds.includes(p.id))).map(p => {
                  const marketValue = p.marketValue ?? calculateMarketValue(p);
                  return (
                    <div key={p.id} className={styles.playerRow}>
                      <div className={styles.playerRowFlex}>
                        <button className={styles.playerRowHeader} onClick={() => handleExpand(p.id, 1)}>
                          <span className={styles.playerNum}>#{p.number}</span>
                          <span className={styles.playerName}>{p.name}</span>
                          <span className={`${styles.playerPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                          <span className={styles.playerOvr}>{playerOvr(p)}</span>
                          <span className={styles.playerValue}>{formatMoney(marketValue)}</span>
                        </button>
                        {renderInfoBtn(p, { teamName: userTeam.name })}
                      </div>
                      {expandedId === p.id && (
                        <div className={styles.offerCard}>
                          <p className={styles.listHint}>Ao colocar à venda, qualquer time do jogo pode fazer uma oferta — você decide aceitar ou recusar quando ela chegar na caixa de entrada.</p>
                          <div className={styles.offerActions}>
                            <button className={styles.confirmBtn} onClick={() => handleList(p)}>Colocar à Venda</button>
                            <button className={styles.cancelBtn} onClick={() => setExpandedId(null)}>Cancelar</button>
                          </div>
                          {feedback?.playerId === p.id && (
                            <span className={feedback.success ? styles.successText : styles.warnText}>{feedback.message}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'free-agents' && (
            <div className={styles.teamGroup}>
              {applyFilter(freeAgents).map(p => {
                const marketValue = p.marketValue ?? calculateMarketValue(p);
                return (
                  <div key={p.id} className={styles.playerRow}>
                    <div className={styles.playerRowFlex}>
                      <button className={styles.playerRowHeader} onClick={() => handleExpand(p.id, 0)}>
                        <span className={styles.playerNum}>{p.age}a</span>
                        <span className={styles.playerName}>{p.name}</span>
                        <span className={`${styles.playerPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                        <span className={styles.playerOvr}>{playerOvr(p)}</span>
                        <span className={styles.playerValue}>{formatMoney(marketValue)}</span>
                      </button>
                      {renderInfoBtn(p)}
                    </div>
                    {expandedId === p.id && renderOfferCard(p, marketValue, 'sign', () => handleSign(p))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {detailPlayer && (
        <PlayerDetailModal
          player={detailPlayer.player}
          teamName={detailPlayer.teamName}
          leagueFlag={detailPlayer.leagueFlag}
          onClose={() => setDetailPlayer(null)}
        />
      )}
    </div>
  );
}
