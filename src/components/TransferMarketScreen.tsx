import { useState } from 'react';
import type { Team, Player, Position } from '../engine/types';
import { allLeagues } from '../data/leagues';
import { getAvgOvr } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import { formatMoney } from '../utils/formatMoney';
import { calculateMarketValue } from '../engine/transferMarket';
import styles from './TransferMarketScreen.module.css';

interface Props {
  userTeam: Team;
  /** Liga do usuário — seus jogos de liga/copa rodam aqui; o mercado de compra
   *  agora cobre todas as ligas do jogo, não só esta. */
  userLeagueId: string;
  /** Elencos de todas as 12 ligas, indexados por id de liga. */
  rosters: Record<string, Team[]>;
  freeAgents: Player[];
  budget: number;
  isWindowOpen: boolean;
  onBack: () => void;
  onBuyPlayer: (playerId: string, fromTeamId: string, amount: number) => { success: boolean; reason: string };
  onSellPlayer: (playerId: string, toTeamId: string, amount: number) => { success: boolean; reason: string };
  onSignFreeAgent: (playerId: string, amount: number) => { success: boolean; reason: string };
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

export default function TransferMarketScreen({ userTeam, userLeagueId, rosters, freeAgents, budget, isWindowOpen, onBack, onBuyPlayer, onSellPlayer, onSignFreeAgent }: Props) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'free-agents'>('buy');
  const [positionFilter, setPositionFilter] = useState<'ALL' | Position>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('ovr');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [feedback, setFeedback] = useState<{ playerId: string; message: string; success: boolean } | null>(null);
  const [sellTargetId, setSellTargetId] = useState<string | null>(null);

  // Comprar: navegação Liga → Time → Jogador, ou busca direta pelo nome (bypassa a navegação).
  const [buyLeagueId, setBuyLeagueId] = useState<string | null>(null);
  const [buyTeamId, setBuyTeamId] = useState<string | null>(null);
  const [buySearch, setBuySearch] = useState('');

  const sameLeagueTeams = rosters[userLeagueId].filter(t => t.id !== userTeam.id);

  const switchTab = (tab: 'buy' | 'sell' | 'free-agents') => {
    setActiveTab(tab); setExpandedId(null); setFeedback(null);
    setBuyLeagueId(null); setBuyTeamId(null); setBuySearch(''); setSellTargetId(null);
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

  const handleSell = (player: Player) => {
    if (!sellTargetId) return;
    const marketValue = player.marketValue ?? calculateMarketValue(player);
    const amount = Math.round(marketValue * multiplier);
    const res = onSellPlayer(player.id, sellTargetId, amount);
    setFeedback({ playerId: player.id, message: resultMessage(res.reason), success: res.success });
    if (res.success) setExpandedId(null);
  };

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
  const showFilterBar = (activeTab === 'buy' && (searchQuery.length >= 2 || !!buyTeam)) || (activeTab === 'sell' && !!sellTargetId) || activeTab === 'free-agents';
  const visiblePlayerValues: number[] =
    activeTab === 'buy' && searchQuery.length >= 2 ? filterHits(allHits).map(h => h.player.marketValue ?? calculateMarketValue(h.player))
    : activeTab === 'buy' && buyTeam ? buyTeamSquad.map(p => p.marketValue ?? calculateMarketValue(p))
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
        <button className="back-btn-secondary" onClick={onBack}>← Voltar</button>
        <h1 className={styles.title}>🛒 Mercado</h1>
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
          {showFilterBar && cheapestVisible !== Infinity && cheapestVisible > budget && (
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
                        <button className={styles.playerRowHeader} onClick={() => handleExpand(p.id, 1)}>
                          <span className={styles.playerName}>{p.name}</span>
                          <span className={styles.searchHitSource}>{league?.flag} {team.abbreviation}</span>
                          <span className={`${styles.playerPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                          <span className={styles.playerOvr}>{playerOvr(p)}</span>
                          <span className={styles.playerValue}>{formatMoney(marketValue)}</span>
                        </button>
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
                      <span className={styles.leagueFlag}>{l.flag}</span>
                      <span className={styles.leagueName}>{l.name}{l.id === userLeagueId ? ' (sua liga)' : ''}</span>
                      <span className={styles.leagueMeta}>{(rosters[l.id] ?? l.teams).length} times</span>
                    </button>
                  ))}
                </div>
              ) : !buyTeam ? (
                <>
                  <button className={styles.backLink} onClick={() => setBuyLeagueId(null)}>← Ligas</button>
                  <div className={styles.teamGroups}>
                    {[...(rosters[buyLeagueId] ?? [])]
                      .filter(t => t.id !== userTeam.id)
                      .sort((a, b) => getAvgOvr(b) - getAvgOvr(a))
                      .map(team => (
                        <div key={team.id} className={styles.teamGroup}>
                          <button className={styles.playerRowHeader} onClick={() => setBuyTeamId(team.id)} style={{ width: '100%', justifyContent: 'flex-start' }}>
                            <img src={team.logoUrl} alt="" className={styles.teamCrest} />
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
                          <button className={styles.playerRowHeader} onClick={() => handleExpand(p.id, 1)}>
                            <span className={styles.playerNum}>#{p.number}</span>
                            <span className={styles.playerName}>{p.name}</span>
                            <span className={`${styles.playerPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                            <span className={styles.playerOvr}>{playerOvr(p)}</span>
                            <span className={styles.playerValue}>{formatMoney(marketValue)}</span>
                          </button>
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
              {!sellTargetId ? (
                <div className={styles.teamGroups}>
                  <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', padding: '8px 0' }}>Escolha o time comprador</div>
                  {[...sameLeagueTeams].sort((a, b) => a.name.localeCompare(b.name)).map(team => (
                    <div key={team.id} className={styles.teamGroup}>
                      <button className={styles.playerRowHeader} onClick={() => setSellTargetId(team.id)} style={{ width: '100%', justifyContent: 'flex-start' }}>
                        <img src={team.logoUrl} alt="" className={styles.teamCrest} />
                        <span className={styles.teamName}>{team.name}</span>
                        <span className={styles.teamAvgOvr}>OVR {getAvgOvr(team)}</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, padding: '4px 0' }}>
                    Vendendo para {sameLeagueTeams.find(t => t.id === sellTargetId)!.name}{' '}
                    <button className={styles.filterBtn} onClick={() => setSellTargetId(null)}>Trocar time</button>
                  </div>
                  <div className={styles.teamGroup}>
                    <div className={styles.teamGroupHeader}>
                      <span className={styles.teamName}>Seu Elenco</span>
                    </div>
                    {applyFilter(userTeam.squad).map(p => {
                      const marketValue = p.marketValue ?? calculateMarketValue(p);
                      return (
                        <div key={p.id} className={styles.playerRow}>
                          <button className={styles.playerRowHeader} onClick={() => handleExpand(p.id, 1)}>
                            <span className={styles.playerNum}>#{p.number}</span>
                            <span className={styles.playerName}>{p.name}</span>
                            <span className={`${styles.playerPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                            <span className={styles.playerOvr}>{playerOvr(p)}</span>
                            <span className={styles.playerValue}>{formatMoney(marketValue)}</span>
                          </button>
                          {expandedId === p.id && (
                            <div className={styles.offerCard}>
                              <div className={styles.offerRow}>
                                <input
                                  type="range" min={0.5} max={1.5} step={0.05}
                                  value={multiplier}
                                  onChange={e => setMultiplier(Number(e.target.value))}
                                  className={styles.slider}
                                  aria-label="Preço de venda"
                                />
                                <span className={styles.offerAmount}>{formatMoney(Math.round(marketValue * multiplier))}</span>
                              </div>
                              <div className={styles.offerActions}>
                                <button className={styles.confirmBtn} onClick={() => handleSell(p)}>
                                  Confirmar Venda
                                </button>
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
            </>
          )}

          {activeTab === 'free-agents' && (
            <div className={styles.teamGroup}>
              {applyFilter(freeAgents).map(p => {
                const marketValue = p.marketValue ?? calculateMarketValue(p);
                return (
                  <div key={p.id} className={styles.playerRow}>
                    <button className={styles.playerRowHeader} onClick={() => handleExpand(p.id, 0)}>
                      <span className={styles.playerNum}>{p.age}a</span>
                      <span className={styles.playerName}>{p.name}</span>
                      <span className={`${styles.playerPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                      <span className={styles.playerOvr}>{playerOvr(p)}</span>
                      <span className={styles.playerValue}>{formatMoney(marketValue)}</span>
                    </button>
                    {expandedId === p.id && renderOfferCard(p, marketValue, 'sign', () => handleSign(p))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
