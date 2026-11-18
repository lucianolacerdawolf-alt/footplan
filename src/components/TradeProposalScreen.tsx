import { memo, useMemo, useState } from 'react';
import type { Team, Player } from '../engine/types';
import { getAvgOvr } from '../utils/teamUtils';
import { playerOvr } from '../utils/playerOvr';
import { formatMoney } from '../utils/formatMoney';
import { calculateMarketValue } from '../engine/transferMarket';
import { crestSrc } from '../utils/crest';
import { ScreenHeader } from './ui';

interface Props {
  userTeam: Team;
  /** Elenco inteiro da liga do usuário (fatia estável do estado). Os adversários
   *  são derivados aqui dentro — antes vinha um `.filter()` inline do screenMap,
   *  novo array a cada render, o que furava o React.memo desta tela. */
  leagueRoster: Team[];
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

function TradeProposalScreen({ userTeam, leagueRoster, budget, onBack, onPropose }: Props) {
  const opponentTeams = useMemo(
    () => leagueRoster.filter(t => t.id !== userTeam.id),
    [leagueRoster, userTeam.id],
  );
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

  const [pickSide, setPickSide] = useState<'mine' | 'theirs'>('mine');
  const opponentTeam = opponentId ? opponentTeams.find(t => t.id === opponentId) ?? null : null;

  return (
    <div className="team-select-screen fit-screen">
      <ScreenHeader onBack={onBack} kicker="Mercado" title="Propor troca" />

          {!opponentTeam ? (
            <>
              <div className="select-instruction">Escolha o time adversário</div>
              <div className="team-grid fit-scroll">
                {[...opponentTeams].sort((a, b) => a.name.localeCompare(b.name)).map(team => (
                  <button
                    key={team.id}
                    className="team-tile"
                    onClick={() => setOpponentId(team.id)}
                    aria-label={`${team.name}, força ${getAvgOvr(team)}`}
                  >
                    <img className="tile-crest" src={crestSrc(team.logoUrl)} alt="" />
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

              {/* Os dois escolhidos ficam no topo e só UMA lista aparece por vez (antes as
                  duas listas de ~29 jogadores ficavam empilhadas). */}
              <div className="trade-picks" role="tablist">
                {([['mine', 'Seu jogador', offeredPlayerId ? userTeam.squad.find(p => p.id === offeredPlayerId)?.name : null],
                   ['theirs', 'Jogador deles', requestedPlayerId ? opponentTeam.squad.find(p => p.id === requestedPlayerId)?.name : null]] as const)
                  .map(([side, label, chosen]) => (
                    <button key={side} role="tab" aria-selected={pickSide === side}
                      className={`trade-pick ${pickSide === side ? 'on' : ''} ${chosen ? 'filled' : ''}`} onClick={() => setPickSide(side)}>
                      <span className="trade-pick-label">{label}</span>
                      <span className="trade-pick-name">{chosen ?? 'Toque pra escolher'}</span>
                    </button>
                  ))}
              </div>

              <div className="team-grid trade-list fit-scroll">
                {(pickSide === 'mine' ? userTeam.squad : opponentTeam.squad).map(p => {
                  const sel = pickSide === 'mine' ? offeredPlayerId : requestedPlayerId;
                  const setSel = pickSide === 'mine' ? setOfferedPlayerId : setRequestedPlayerId;
                  return (
                    <PlayerRow
                      key={p.id}
                      player={p}
                      selected={p.id === sel}
                      onClick={() => {
                        setSel(p.id === sel ? null : p.id);
                        // Escolheu o seu: já mostra a lista deles.
                        if (pickSide === 'mine' && p.id !== sel && !requestedPlayerId) setPickSide('theirs');
                      }}
                    />
                  );
                })}
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

export default memo(TradeProposalScreen);
