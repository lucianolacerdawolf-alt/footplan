import { useCallback } from 'react';
import type { Player, Team } from '@/engine/types';
import { computeWageBill, evaluateCashTransfer, netSellRevenue } from '@/engine/transferMarket';
import { formatMoney } from '@/utils/formatMoney';
import { createTransferAcceptedMessage, createTransferOutCompletedMessage, createTransferRejectedMessage } from '@/engine/inbox';
import { getFinances, getInbox, getTransferList, getTransferHistory, isTransferWindowOpen, evaluateTradeOffer, getFreeAgentPool, renewPlayerContract, canRenewContract, evaluateRenewalOffer, type CareerState, type InboxMessage, type TransferRecord, type ContractRenewalOptions } from '@/engine/career';

interface UseTransferManagerParams {
  careerState: CareerState | null;
  setCareerState: React.Dispatch<React.SetStateAction<CareerState | null>>;
  setToastMsg: (msg: string | null) => void;
}

export function useTransferManager({ careerState, setCareerState, setToastMsg }: UseTransferManagerParams) {
  function handleProposeTrade(offeredPlayerId: string, opponentTeamId: string, requestedPlayerId: string, cashOffered: number = 0): { accepted: boolean; reason: string } {
    if (!careerState) return { accepted: false, reason: 'no-career' };
    if (!isTransferWindowOpen(careerState.season.league.currentRound)) return { accepted: false, reason: 'window-closed' };
    if (cashOffered < 0) return { accepted: false, reason: 'invalid-players' };

    const finances = getFinances(careerState);
    if (cashOffered > finances.budget) return { accepted: false, reason: 'insufficient-budget' };

    // D-04: scoped to the user's own league — never search across all 6 leagues here,
    // even though all 6 are progressed together at season-advance.
    const leagueRoster = careerState.rosters[careerState.leagueId];
    const userTeamId = careerState.season.league.userTeamId;
    const userTeam = leagueRoster.find(t => t.id === userTeamId);
    const opponentTeam = leagueRoster.find(t => t.id === opponentTeamId);
    if (!userTeam || !opponentTeam) return { accepted: false, reason: 'invalid-players' };

    const offeredPlayer = userTeam.squad.find(p => p.id === offeredPlayerId);
    const requestedPlayer = opponentTeam.squad.find(p => p.id === requestedPlayerId);
    if (!offeredPlayer || !requestedPlayer) return { accepted: false, reason: 'invalid-players' };

    const result = evaluateTradeOffer(offeredPlayer, requestedPlayer, opponentTeam.squad, careerState.manager.reputation, Math.random, cashOffered);
    // A rejected offer does not consume a trade slot — the cap is charged only on
    // acceptance (Claude's Discretion resolution, see PLAN.md task 2 note on D-06).
    if (!result.accepted) return result;

    // D-07: permanent — mutates both this season's live teams AND the roster
    // source-of-truth, since the same league plays both league and cup concurrently.
    // Cláusula de performance não viaja na troca — quem sai não leva meta/bônus.
    const offeredPlayerWithoutGoal = { ...offeredPlayer, contractGoal: undefined };
    const swapSquad = (teams: Team[]): Team[] => teams.map(t => {
      if (t.id === userTeam.id) {
        return { ...t, squad: [...t.squad.filter(p => p.id !== offeredPlayerId), requestedPlayer] };
      }
      if (t.id === opponentTeam.id) {
        return { ...t, squad: [...t.squad.filter(p => p.id !== requestedPlayerId), offeredPlayerWithoutGoal] };
      }
      return t;
    });
    const newUserSquad = [...userTeam.squad.filter(p => p.id !== offeredPlayerId), requestedPlayer];
    const newWageBill = computeWageBill({ ...userTeam, squad: newUserSquad });
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    const record: TransferRecord = {
      id: crypto.randomUUID(), date: dateLabel, seasonYear: careerState.currentSeasonYear,
      type: 'TRADE', playerName: `${offeredPlayer.name} ↔ ${requestedPlayer.name}`, playerPosition: offeredPlayer.position,
      fromTeam: userTeam.name, toTeam: opponentTeam.name, amount: cashOffered,
    };

    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: swapSquad(prev.rosters[prev.leagueId]) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: swapSquad(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: swapSquad(prev.season.cup.teams) },
        },
        finances: { ...finances, budget: finances.budget - cashOffered, wageBill: newWageBill },
        transferHistory: [...getTransferHistory(prev), record],
        // O jogador trocado saiu do elenco — não faz mais sentido continuar na lista de venda.
        transferListPlayerIds: getTransferList(prev).filter(id => id !== offeredPlayerId),
      };
    });
    setToastMsg(`🔁 Troca aceita: ${offeredPlayer.name} ↔ ${requestedPlayer.name}${cashOffered > 0 ? ` + €${(cashOffered / 1_000_000).toFixed(1)}M` : ''}`);
    return result;
  }

  // Plain function, not useCallback: same synchronous-return contract as handleProposeTrade —

  function handleBuyPlayer(playerId: string, fromTeamId: string, amount: number): { success: boolean; reason: string } {
    if (!careerState) return { success: false, reason: 'no-career' };
    if (!isTransferWindowOpen(careerState.season.league.currentRound)) return { success: false, reason: 'window-closed' };

    const finances = getFinances(careerState);
    if (amount > finances.budget) return { success: false, reason: 'insufficient-budget' };

    const userTeam = careerState.rosters[careerState.leagueId].find(t => t.id === careerState.season.league.userTeamId);
    if (!userTeam) return { success: false, reason: 'invalid-team' };

    // O mercado cobre todas as ligas do jogo (não só a do usuário) — procura o vendedor
    // em qualquer roster. calculateMarketValue() é recalculado on-the-fly pra times de
    // fora da liga do usuário (nunca têm `marketValue` pré-atribuído, ver handleStartCareer).
    let sellerLeagueId: string | null = null;
    let sellerTeam: Team | undefined;
    for (const [lid, teams] of Object.entries(careerState.rosters)) {
      const found = teams.find(t => t.id === fromTeamId);
      if (found) { sellerLeagueId = lid; sellerTeam = found; break; }
    }
    if (!sellerTeam || !sellerLeagueId) return { success: false, reason: 'invalid-team' };

    const player = sellerTeam.squad.find(p => p.id === playerId);
    if (!player) return { success: false, reason: 'invalid-player' };

    // Nunca deixa o vendedor sem nenhum jogador na posição (ex: 0 goleiros quebraria a
    // simulação de partida) — vale pra qualquer time do jogo, não só da liga do usuário.
    // Com ≤2 (mas >1), evaluateCashTransfer já aplica um markup.
    const samePositionCount = sellerTeam.squad.filter(p => p.position === player.position).length;
    if (samePositionCount <= 1) return { success: false, reason: 'seller-last-at-position' };
    const sellerNeedsPlayer = samePositionCount <= 2;

    const evalResult = evaluateCashTransfer(player, amount, sellerNeedsPlayer);
    if (!evalResult.accepted) return { success: false, reason: evalResult.reason };

    const isSameLeague = sellerLeagueId === careerState.leagueId;
    const addToUser = (teams: Team[]): Team[] => teams.map(t => t.id === userTeam.id ? { ...t, squad: [...t.squad, player] } : t);
    // Time e liga vendedores só aparecem em season.league/cup.teams quando fazem parte
    // da própria liga do usuário (esses dois arrays são um espelho de rosters[leagueId]).
    const moveSquadSameLeague = (teams: Team[]): Team[] => teams.map(t => {
      if (t.id === sellerTeam!.id) return { ...t, squad: t.squad.filter(p => p.id !== playerId) };
      if (t.id === userTeam.id) return { ...t, squad: [...t.squad, player] };
      return t;
    });
    const newWageBill = computeWageBill({ ...userTeam, squad: [...userTeam.squad, player] });
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    const record: TransferRecord = {
      id: crypto.randomUUID(), date: dateLabel, seasonYear: careerState.currentSeasonYear,
      type: 'BUY', playerName: player.name, playerPosition: player.position,
      fromTeam: sellerTeam.name, toTeam: userTeam.name, amount,
    };

    setCareerState(prev => {
      if (!prev) return prev;
      const newRosters = isSameLeague
        ? { ...prev.rosters, [prev.leagueId]: moveSquadSameLeague(prev.rosters[prev.leagueId]) }
        : {
            ...prev.rosters,
            [sellerLeagueId!]: prev.rosters[sellerLeagueId!].map(t =>
              t.id === sellerTeam!.id ? { ...t, squad: t.squad.filter(p => p.id !== playerId) } : t
            ),
            [prev.leagueId]: addToUser(prev.rosters[prev.leagueId]),
          };
      return {
        ...prev,
        rosters: newRosters,
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: isSameLeague ? moveSquadSameLeague(prev.season.league.teams) : addToUser(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: isSameLeague ? moveSquadSameLeague(prev.season.cup.teams) : addToUser(prev.season.cup.teams) },
        },
        finances: { ...finances, budget: finances.budget - amount, wageBill: newWageBill },
        transferHistory: [...getTransferHistory(prev), record],
        inbox: [...getInbox(prev), createTransferAcceptedMessage(player.name, sellerTeam.name, userTeam.name, amount, dateLabel)],
      };
    });
    setToastMsg(`✅ ${player.name} contratado por €${(amount / 1_000_000).toFixed(1)}M`);
    return { success: true, reason: evalResult.reason };
  }

  // Sem vendedor CPU pra negociar — sempre aceita se orçamento e janela permitem.

  function handleSignFreeAgent(playerId: string, amount: number): { success: boolean; reason: string } {
    if (!careerState) return { success: false, reason: 'no-career' };
    if (!isTransferWindowOpen(careerState.season.league.currentRound)) return { success: false, reason: 'window-closed' };

    const finances = getFinances(careerState);
    if (amount > finances.budget) return { success: false, reason: 'insufficient-budget' };

    const pool = getFreeAgentPool(careerState);
    const player = pool.find(p => p.id === playerId);
    if (!player) return { success: false, reason: 'invalid-player' };

    const leagueRoster = careerState.rosters[careerState.leagueId];
    const userTeam = leagueRoster.find(t => t.id === careerState.season.league.userTeamId)!;
    const addToSquad = (teams: Team[]): Team[] => teams.map(t => t.id === userTeam.id ? { ...t, squad: [...t.squad, player] } : t);
    const newWageBill = computeWageBill({ ...userTeam, squad: [...userTeam.squad, player] });
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    const record: TransferRecord = {
      id: crypto.randomUUID(), date: dateLabel, seasonYear: careerState.currentSeasonYear,
      type: 'SIGN_FREE_AGENT', playerName: player.name, playerPosition: player.position,
      fromTeam: 'Free Agent', toTeam: userTeam.name, amount,
    };

    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: addToSquad(prev.rosters[prev.leagueId]) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: addToSquad(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: addToSquad(prev.season.cup.teams) },
        },
        finances: { ...finances, budget: finances.budget - amount, wageBill: newWageBill },
        freeAgentPool: getFreeAgentPool(prev).filter(p => p.id !== playerId),
        transferHistory: [...getTransferHistory(prev), record],
        inbox: [...getInbox(prev), createTransferAcceptedMessage(player.name, 'Agente Livre', userTeam.name, amount, dateLabel)],
      };
    });
    setToastMsg(`✅ ${player.name} assinou contrato`);
    return { success: true, reason: 'signed' };
  }

  // Colocar um jogador do próprio elenco na lista de venda — não escolhe comprador
  // nem preço, só torna o jogador elegível a ofertas de qualquer time do jogo (ver

  function handleListPlayerForSale(playerId: string): { success: boolean; reason: string } {
    if (!careerState) return { success: false, reason: 'no-career' };
    const userTeam = careerState.rosters[careerState.leagueId].find(t => t.id === careerState.season.league.userTeamId);
    if (!userTeam) return { success: false, reason: 'invalid-team' };
    const player = userTeam.squad.find(p => p.id === playerId);
    if (!player) return { success: false, reason: 'invalid-player' };
    if (getTransferList(careerState).includes(playerId)) return { success: false, reason: 'already-listed' };

    // Mesma guarda de handleBuyPlayer/handleAcceptTransferOffer — nunca deixa o
    // usuário sem nenhum jogador numa posição (ex: 0 goleiros quebra a partida).
    const samePositionCount = userTeam.squad.filter(p => p.position === player.position).length;
    if (samePositionCount <= 1) return { success: false, reason: 'last-at-position' };

    setCareerState(prev => prev ? { ...prev, transferListPlayerIds: [...getTransferList(prev), playerId] } : prev);
    setToastMsg(`📋 ${player.name} colocado na lista de venda`);
    return { success: true, reason: 'listed' };
  }

  const handleUnlistPlayerForSale = useCallback((playerId: string) => {
    setCareerState(prev => prev ? { ...prev, transferListPlayerIds: getTransferList(prev).filter(id => id !== playerId) } : prev);
  }, [setCareerState]);

  const handleAcceptTransferOffer = useCallback((messageId: string) => {
    if (!careerState) return;
    const message = getInbox(careerState).find(m => m.id === messageId);
    if (!message?.meta) return;
    const { playerId, offeringTeamId, amount } = message.meta;

    const userTeam = careerState.rosters[careerState.leagueId].find(t => t.id === careerState.season.league.userTeamId);
    const player = userTeam?.squad.find(p => p.id === playerId);
    // O time ofertante pode ser de qualquer uma das 12 ligas (mercado global) —
    // procura em todos os rosters, igual handleBuyPlayer.
    let offeringLeagueId: string | null = null;
    let offeringTeam: Team | undefined;
    for (const [lid, teams] of Object.entries(careerState.rosters)) {
      const found = teams.find(t => t.id === offeringTeamId);
      if (found) { offeringLeagueId = lid; offeringTeam = found; break; }
    }
    // Defensivo: a oferta pode estar obsoleta (jogador já vendido/trocado, ou
    // aposentado e substituído por um id novo via progressPlayer/generateReplacementPlayer
    // desde que a oferta chegou). Sem crash, sem mexer em dinheiro — só descarta.
    if (!userTeam || !offeringTeam || !offeringLeagueId || !player) {
      setCareerState(prev => prev ? { ...prev, inbox: getInbox(prev).filter(m => m.id !== messageId) } : prev);
      setToastMsg('⚠️ Esta proposta não é mais válida.');
      return;
    }
    // Guarda simétrica à de handleBuyPlayer — o usuário também precisa de uma escalação
    // válida (goleiro incluso) todo round.
    const samePositionCount = userTeam.squad.filter(p => p.position === player.position).length;
    if (samePositionCount <= 1) {
      setCareerState(prev => prev ? { ...prev, inbox: getInbox(prev).filter(m => m.id !== messageId) } : prev);
      setToastMsg(`⚠️ Não é possível vender ${player.name}: é o único jogador na posição.`);
      return;
    }

    const isSameLeague = offeringLeagueId === careerState.leagueId;
    // A cláusula de performance é por temporada no clube do usuário — quem sai por venda
    // não leva a meta nem o bônus pendente para o novo clube.
    const playerWithoutGoal = { ...player, contractGoal: undefined };
    const removeFromUser = (teams: Team[]): Team[] => teams.map(t => t.id === userTeam.id ? { ...t, squad: t.squad.filter(p => p.id !== playerId) } : t);
    const moveSquadSameLeague = (teams: Team[]): Team[] => teams.map(t => {
      if (t.id === userTeam.id) return { ...t, squad: t.squad.filter(p => p.id !== playerId) };
      if (t.id === offeringTeam!.id) return { ...t, squad: [...t.squad, playerWithoutGoal] };
      return t;
    });
    const finances = getFinances(careerState);
    const newWageBill = computeWageBill({ ...userTeam, squad: userTeam.squad.filter(p => p.id !== playerId) });
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    const record: TransferRecord = {
      id: crypto.randomUUID(), date: dateLabel, seasonYear: careerState.currentSeasonYear,
      type: 'SELL', playerName: player.name, playerPosition: player.position,
      fromTeam: userTeam.name, toTeam: offeringTeam.name, amount,
    };

    setCareerState(prev => {
      if (!prev) return prev;
      const newRosters = isSameLeague
        ? { ...prev.rosters, [prev.leagueId]: moveSquadSameLeague(prev.rosters[prev.leagueId]) }
        : {
            ...prev.rosters,
            [offeringLeagueId!]: prev.rosters[offeringLeagueId!].map(t =>
              t.id === offeringTeam!.id ? { ...t, squad: [...t.squad, playerWithoutGoal] } : t
            ),
            [prev.leagueId]: removeFromUser(prev.rosters[prev.leagueId]),
          };
      return {
        ...prev,
        rosters: newRosters,
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: isSameLeague ? moveSquadSameLeague(prev.season.league.teams) : removeFromUser(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: isSameLeague ? moveSquadSameLeague(prev.season.cup.teams) : removeFromUser(prev.season.cup.teams) },
        },
        // Board Strictness (EA FC): a diretoria retém 20% do valor de venda.
        finances: { ...finances, budget: finances.budget + netSellRevenue(amount), wageBill: newWageBill },
        transferHistory: [...getTransferHistory(prev), record],
        transferListPlayerIds: getTransferList(prev).filter(id => id !== playerId),
        inbox: [...getInbox(prev).filter(m => m.id !== messageId), createTransferOutCompletedMessage(player.name, offeringTeam!.name, amount, dateLabel)],
      };
    });
    setToastMsg(`💰 ${player.name} vendido por €${(amount / 1_000_000).toFixed(1)}M`);
  }, [careerState, setCareerState, setToastMsg]);

  const handleRejectTransferOffer = useCallback((messageId: string) => {
    if (!careerState) return;
    const message = getInbox(careerState).find(m => m.id === messageId);
    const dateLabel = `Temporada ${careerState.currentSeasonYear} · Rodada ${careerState.season.league.currentRound + 1}`;
    let rejectionMsg: InboxMessage[] = [];
    if (message?.meta) {
      const playerName = careerState.rosters[careerState.leagueId]
        .find(t => t.id === careerState.season.league.userTeamId)?.squad
        .find(p => p.id === message.meta!.playerId)?.name ?? '???';
      const offeringClub = Object.values(careerState.rosters).flat().find(t => t.id === message.meta!.offeringTeamId)?.name ?? '???';
      rejectionMsg = [createTransferRejectedMessage(playerName, offeringClub, dateLabel)];
    }
    setCareerState(prev => prev ? { ...prev, inbox: [...getInbox(prev).filter(m => m.id !== messageId), ...rejectionMsg] } : prev);
  }, [careerState, setCareerState]);

  // Fase 1 — Renovar contrato. Gestão interna do elenco: permitido a qualquer momento
  // (não depende da janela de transferências). Debitamos o custo (renewalCost + bônus de
  // assinatura) do orçamento, estendemos contractSeasonsLeft, aplicamos o salário negociado
  // e a cláusula de performance. Cooldown: quem renovou na safra atual só pode renovar de
  // novo na próxima. Negociação: a proposta precisa satisfazer o pedido do jogador
  // (evaluateRenewalOffer) — o modal já bloqueia recusas; aqui é a barreira de verdade.
  const handleRenewContract = useCallback((playerId: string, options: ContractRenewalOptions) => {
    if (!careerState) return;
    if (!Number.isInteger(options.years) || options.years < 1) return;

    const userTeam = careerState.rosters[careerState.leagueId].find(t => t.id === careerState.season.league.userTeamId);
    if (!userTeam) return;
    const player = userTeam.squad.find(p => p.id === playerId);
    if (!player) return;

    if (!canRenewContract(player, careerState.currentSeasonYear)) {
      setToastMsg(`⏳ ${player.name} renovou recentemente — só pode renovar de novo na próxima temporada.`);
      return;
    }

    const evaluation = evaluateRenewalOffer(player, options);
    if (!evaluation.accepted) {
      setToastMsg(`❌ ${evaluation.message}`);
      return;
    }

    const finances = getFinances(careerState);
    const { player: renewed, cost } = renewPlayerContract(player, options.years, options);
    if (cost > finances.budget) {
      setToastMsg(`⚠️ Sem orçamento para renovar ${player.name}: custa €${(cost / 1_000_000).toFixed(1)}M.`);
      return;
    }
    const renewedWithYear = { ...renewed, lastRenewedSeasonYear: careerState.currentSeasonYear };

    const replacePlayer = (squad: Player[]): Player[] => squad.map(p => p.id === playerId ? renewedWithYear : p);
    const applyToTeam = (teams: Team[]): Team[] => teams.map(t => t.id === userTeam.id ? { ...t, squad: replacePlayer(t.squad) } : t);
    const newWageBill = computeWageBill({ ...userTeam, squad: replacePlayer(userTeam.squad) });

    setCareerState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        rosters: { ...prev.rosters, [prev.leagueId]: applyToTeam(prev.rosters[prev.leagueId]) },
        season: {
          ...prev.season,
          league: { ...prev.season.league, teams: applyToTeam(prev.season.league.teams) },
          cup: { ...prev.season.cup, teams: applyToTeam(prev.season.cup.teams) },
        },
        finances: { ...finances, budget: finances.budget - cost, wageBill: newWageBill },
      };
    });
    const bonusText = options.signingBonus ? ` · ${formatMoney(options.signingBonus)} de bônus` : '';
    const goalText = options.contractGoal ? ` · meta ${options.contractGoal.target} gols` : '';
    setToastMsg(`📝 ${player.name} renovado por ${options.years} temporada${options.years > 1 ? 's' : ''}${bonusText}${goalText}`);
  }, [careerState, setCareerState, setToastMsg]);

  return {
    handleProposeTrade, handleBuyPlayer, handleSignFreeAgent, handleListPlayerForSale, handleUnlistPlayerForSale,
    handleAcceptTransferOffer, handleRejectTransferOffer, handleRenewContract,
  };
}