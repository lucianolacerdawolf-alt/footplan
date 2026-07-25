import { useState } from 'react';
import type { Team, Player } from '../engine/types';
import { getAvgOvr } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import { formatMoney } from '../utils/formatMoney';
import { calculateMarketValue } from '../engine/transferMarket';

interface Props {
  userTeam: Team;
  opponentTeams: Team[];
  budget: number;
  onBack: () => void;
  onPropose: (offeredPlayerId: string, opponentTeamId: string, requestedPlayerId: string, cashOffered?: number) => { accepted: boolean; reason: string };
}

function getResultMessage(result: { accepted: boolean; reason: string }): string {
  if (result.reason === 'window-closed') return 'A janela de transferências está fechada.';
  if (result.reason === 'insufficient-budget') return 'Orçamento insuficiente pra cobrir o valor em dinheiro oferecido.';
  const favorable = result.reason === 'value-favorable';
  if (result.accepted) {
    return favorable
      ? 'A proposta favorecia o adversário em valor — aceitaram sem hesitar.'
      : 'Mesmo não sendo a proposta mais vantajosa pra eles, aceitaram.';
  }
  return favorable
    ? 'A proposta favorecia o adversário em valor, mas ainda assim recusaram.'
    : 'A proposta não favorecia o adversário em valor — recusaram.';
}

function PlayerRow({ player, selected, onClick }: { player: Player; selected: boolean; onClick: () => void }) {
  return (
    <button
      className={`team-tile ${selected ? 'picked-home selected' : ''}`}
      onClick={onClick}
    >
      <span className="tile-name">{player.name}</span>
      <span className="p-pos">{player.position}</span>
      <span className="tile-ovr">{playerOvr(player)}</span>
      <span className="tile-value">{formatMoney(player.marketValue ?? calculateMarketValue(player))}</span>
    </button>
  );
}

export default function TradeProposalScreen({ userTeam, opponentTeams, budget, onBack, onPropose }: Props) {
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [offeredPlayerId, setOfferedPlayerId] = useState<string | null>(null);
  const [requestedPlayerId, setRequestedPlayerId] = useState<string | null>(null);
  const [cashOffered, setCashOffered] = useState(0);
  const [result, setResult] = useState<{ accepted: boolean; reason: string } | null>(null);

  const resetToStep1 = () => {
    setOpponentId(null);
    setOfferedPlayerId(null);
    setRequestedPlayerId(null);
    setCashOffered(0);
  };

  const handleConfirm = () => {
    if (!offeredPlayerId || !opponentId || !requestedPlayerId) return;
    const res = onPropose(offeredPlayerId, opponentId, requestedPlayerId, cashOffered);
    setResult(res);
    setOfferedPlayerId(null);
    setRequestedPlayerId(null);
    setCashOffered(0);
  };

  const opponentTeam = opponentId ? opponentTeams.find(t => t.id === opponentId) ?? null : null;

  return (
    <div className="team-select-screen">
      <div className="top-nav">
        <button className="slot-nav-btn" onClick={onBack}>← Voltar</button>
        <header className="app-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <h1>FootPlan</h1>
          <p className="subtitle">Propor Troca</p>
        </header>
      </div>

          {!opponentTeam ? (
            <>
              <div className="select-instruction">Escolha o time adversário</div>
              <div className="team-grid">
                {[...opponentTeams].sort((a, b) => a.name.localeCompare(b.name)).map(team => (
                  <button
                    key={team.id}
                    className="team-tile"
                    onClick={() => setOpponentId(team.id)}
                  >
                    <img className="tile-crest" src={team.logoUrl} alt={team.name} />
                    <span className="tile-name">{team.name}</span>
                    <span className="tile-ovr">{getAvgOvr(team)}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="select-instruction">
                <span>Trocando com {opponentTeam.name}</span>{' '}
                <a href="#" onClick={e => { e.preventDefault(); resetToStep1(); }}>Trocar de time</a>
              </div>

              <div className="select-summary">
                <div className={`select-slot home-slot ${offeredPlayerId ? 'filled' : ''}`}>
                  <span className="slot-empty">Seu Jogador</span>
                </div>
                <span className="select-vs">⇄</span>
                <div className={`select-slot away-slot ${requestedPlayerId ? 'filled' : ''}`}>
                  <span className="slot-empty">Jogador Deles</span>
                </div>
              </div>

              <div className="select-instruction">Seu Jogador</div>
              <div className="team-grid">
                {userTeam.squad.map(p => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    selected={p.id === offeredPlayerId}
                    onClick={() => setOfferedPlayerId(p.id === offeredPlayerId ? null : p.id)}
                  />
                ))}
              </div>

              <div className="select-instruction">Jogador Deles</div>
              <div className="team-grid">
                {opponentTeam.squad.map(p => (
                  <PlayerRow
                    key={p.id}
                    player={p}
                    selected={p.id === requestedPlayerId}
                    onClick={() => setRequestedPlayerId(p.id === requestedPlayerId ? null : p.id)}
                  />
                ))}
              </div>

              {offeredPlayerId && requestedPlayerId && (() => {
                const offered = userTeam.squad.find(p => p.id === offeredPlayerId)!;
                const requested = opponentTeam.squad.find(p => p.id === requestedPlayerId)!;
                const offeredValue = offered.marketValue ?? calculateMarketValue(offered);
                const requestedValue = requested.marketValue ?? calculateMarketValue(requested);
                const diff = requestedValue - offeredValue;
                return (
                  <div className="select-instruction" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span>💰 Diferença de valor: {diff >= 0 ? '+' : ''}{formatMoney(diff)}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="range" min={0} max={budget} step={100_000}
                        value={Math.min(cashOffered, budget)}
                        onChange={e => setCashOffered(Number(e.target.value))}
                        style={{ flex: 1 }}
                        aria-label="Compensar com dinheiro"
                      />
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        Compensar: {formatMoney(cashOffered)}
                      </span>
                    </span>
                  </div>
                );
              })()}

              <div className="select-action">
                <button
                  className="slot-nav-btn slot-nav-btn-primary"
                  disabled={!offeredPlayerId || !requestedPlayerId || cashOffered > budget}
                  onClick={handleConfirm}
                >
                  Propor Troca
                </button>
              </div>

              {result && (
                <div className="select-instruction">
                  {result.accepted ? '✅ Troca aceita!' : '❌ Troca recusada.'}{' '}
                  {getResultMessage(result)}
                </div>
              )}
            </>
          )}
    </div>
  );
}
