import type { InboxMessage } from './career';
import type { Position } from './types';

function makeMessage(partial: Omit<InboxMessage, 'id' | 'isRead'>): InboxMessage {
  return { ...partial, id: crypto.randomUUID(), isRead: false };
}

export function createInjuryMessage(playerName: string, rounds: number, date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: true, type: 'INJURY_REPORT',
    subject: `Lesão: ${playerName}`,
    body: `${playerName} sofreu uma lesão e ficará fora por ${rounds} rodada${rounds > 1 ? 's' : ''}.`,
  });
}

export function createMatchPreviewMessage(opponentName: string, isHome: boolean, roundLabel: string, date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: false, type: 'MATCH_PREVIEW',
    subject: `Prévia: ${roundLabel}`,
    body: `Seu próximo jogo é ${isHome ? 'em casa' : 'fora'} contra ${opponentName}.`,
  });
}

export function createTransferWindowMessage(date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: false, type: 'BOARD_UPDATE',
    subject: 'Janela de transferências aberta',
    body: 'A diretoria liberou a janela de transferências para esta temporada.',
  });
}

export function createWelcomeMessage(managerName: string, budget: number, date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: false, type: 'BOARD_UPDATE',
    subject: 'Bem-vindo à diretoria',
    body: `Boa sorte na temporada, ${managerName}. Orçamento inicial de transferências: €${(budget / 1_000_000).toFixed(1)}M.`,
  });
}

export function createTransferOfferMessage(
  offeringClub: string,
  playerId: string,
  playerName: string,
  position: Position,
  ovr: number,
  marketValue: number,
  offeredAmount: number,
  offeringTeamId: string,
  date: string,
): InboxMessage {
  return makeMessage({
    date, isMandatory: true, type: 'TRANSFER_OFFER',
    subject: `Proposta do ${offeringClub}`,
    body: `O ${offeringClub} oferece €${(offeredAmount / 1_000_000).toFixed(1)}M por ${playerName} (${position}, OVR ${ovr}). Valor de mercado: €${(marketValue / 1_000_000).toFixed(1)}M.`,
    meta: { playerId, offeringTeamId, amount: offeredAmount },
  });
}

export function createTransferAcceptedMessage(playerName: string, fromClub: string, toClub: string, amount: number, date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: false, type: 'BOARD_UPDATE',
    subject: `Transferência concluída: ${playerName}`,
    body: `${playerName} foi transferido do ${fromClub} para o ${toClub} por €${(amount / 1_000_000).toFixed(1)}M.`,
  });
}

export function createTransferRejectedMessage(playerName: string, otherClub: string, date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: false, type: 'BOARD_UPDATE',
    subject: `Proposta recusada: ${playerName}`,
    body: `A proposta envolvendo ${playerName} e o ${otherClub} foi recusada.`,
  });
}

export function createTransferOutCompletedMessage(playerName: string, toClub: string, amount: number, date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: false, type: 'BOARD_UPDATE',
    subject: `${playerName} vendido`,
    body: `${playerName} foi vendido para o ${toClub} por €${(amount / 1_000_000).toFixed(1)}M. O valor foi creditado ao orçamento.`,
  });
}

export function createDerbyPreviewMessage(opponentName: string, derbyName: string, isHome: boolean, date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: false, type: 'MATCH_PREVIEW',
    subject: `Dérbi: ${derbyName}`,
    body: `Atenção para o clássico! Seu time enfrenta ${opponentName} ${isHome ? 'em casa' : 'fora de casa'} no ${derbyName}. A torcida espera entrega total!`,
  });
}

function formatNameList(names: string[]): string {
  const head = names.slice(0, 4).join(', ');
  const more = names.length > 4 ? ` e mais ${names.length - 4}` : '';
  return `${head}${more}`;
}

/** Aviso não-obrigatório de início de temporada — elenco com contrato vencendo (≤1 temporada). */
export function createContractExpiringMessage(playerNames: string[], date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: false, type: 'BOARD_UPDATE',
    subject: 'Contratos a expirar',
    body: `${formatNameList(playerNames)} ${playerNames.length > 1 ? 'têm' : 'tem'} contrato vencendo ao fim desta temporada. Renove antes que ${playerNames.length > 1 ? 'deixem' : 'deixe'} o clube.`,
  });
}

/** Comunica o fim de temporada — jogadores cujo contrato venceu saíram para o mercado. */
export function createContractDepartureMessage(playerNames: string[], date: string): InboxMessage {
  return makeMessage({
    date, isMandatory: false, type: 'BOARD_UPDATE',
    subject: 'Contratos encerrados',
    body: `${formatNameList(playerNames)} ${playerNames.length > 1 ? 'deixaram o clube e entraram' : 'deixou o clube e entrou'} no mercado de agentes livres ao fim do contrato.`,
  });
}

export function hasMandatoryUnread(inbox: InboxMessage[]): boolean {
  return inbox.some(m => m.isMandatory && !m.isRead);
}

export function countUnread(inbox: InboxMessage[]): number {
  return inbox.filter(m => !m.isRead).length;
}
