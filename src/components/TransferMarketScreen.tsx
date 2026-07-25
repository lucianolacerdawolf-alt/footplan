import { useState } from 'react';
import type { Team, Player, Position } from '../engine/types';
import { getAvgOvr } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import { formatMoney } from '../utils/formatMoney';
import { calculateMarketValue } from '../engine/transferMarket';
import styles from './TransferMarketScreen.module.css';

interface Props {
  userTeam: Team;
  cpuTeams: Team[];
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

export default function TransferMarketScreen({ userTeam, cpuTeams, freeAgents, budget, isWindowOpen, onBack, onBuyPlayer, onSellPlayer, onSignFreeAgent }: Props) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'free-agents'>('buy');
  const [positionFilter, setPositionFilter] = useState<'ALL' | Position>('ALL');
  const [sortBy, setSortBy] = useState<SortKey>('ovr');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [multiplier, setMultiplier] = useState(1);
  const [feedback, setFeedback] = useState<{ playerId: string; message: string; success: boolean } | null>(null);
  const [sellTargetId, setSellTargetId] = useState<string | null>(null);

  const applyFilter = (players: Player[]) =>
    sortPlayers(positionFilter === 'ALL' ? players : players.filter(p => p.position === positionFilter), sortBy);

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

  const cheapestVisible = activeTab === 'buy'
    ? Math.min(...cpuTeams.flatMap(t => applyFilter(t.squad).map(p => p.marketValue ?? calculateMarketValue(p))), Infinity)
    : Math.min(...applyFilter(freeAgents).map(p => p.marketValue ?? calculateMarketValue(p)), Infinity);

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
        <button className={`${styles.tabBtn} ${activeTab === 'buy' ? styles.active : ''}`} onClick={() => { setActiveTab('buy'); setExpandedId(null); }}>
          🛒 Comprar Jogadores
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'sell' ? styles.active : ''}`} onClick={() => { setActiveTab('sell'); setExpandedId(null); }}>
          💰 Vender Jogadores
        </button>
        <button className={`${styles.tabBtn} ${activeTab === 'free-agents' ? styles.active : ''}`} onClick={() => { setActiveTab('free-agents'); setExpandedId(null); }}>
          🆓 Agentes Livres ({freeAgents.length})
        </button>
      </div>

      {!isWindowOpen ? (
        <div className={styles.closedBanner}>
          🔒 Janela de transferências fechada. Abre nas rodadas 1-5 e 19-24.
        </div>
      ) : (
        <>
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

          {cheapestVisible === Infinity && (
            <div className={styles.emptyState}>
              {activeTab === 'free-agents' ? 'Nenhum agente livre disponível no momento.' : 'Nenhum jogador encontrado com esse filtro.'}
            </div>
          )}
          {cheapestVisible !== Infinity && cheapestVisible > budget && (
            <div className={styles.emptyState}>Orçamento insuficiente para contratar qualquer jogador visível.</div>
          )}

          {activeTab === 'buy' && (
            <div className={styles.teamGroups}>
              {[...cpuTeams].sort((a, b) => getAvgOvr(b) - getAvgOvr(a)).map(team => {
                const squad = applyFilter(team.squad);
                if (squad.length === 0) return null;
                return (
                  <div key={team.id} className={styles.teamGroup}>
                    <div className={styles.teamGroupHeader}>
                      <img src={team.logoUrl} alt="" className={styles.teamCrest} />
                      <span className={styles.teamName}>{team.name}</span>
                      <span className={styles.teamAvgOvr}>OVR {getAvgOvr(team)}</span>
                    </div>
                    {squad.map(p => {
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
                          {expandedId === p.id && renderOfferCard(p, marketValue, 'buy', () => handleBuy(p, team.id))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'sell' && (
            <>
              {!sellTargetId ? (
                <div className={styles.teamGroups}>
                  <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', padding: '8px 0' }}>Escolha o time comprador</div>
                  {[...cpuTeams].sort((a, b) => a.name.localeCompare(b.name)).map(team => (
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
                    Vendendo para {cpuTeams.find(t => t.id === sellTargetId)!.name}{' '}
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
