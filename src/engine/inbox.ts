import type { InboxMessage } from './career';

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

export function hasMandatoryUnread(inbox: InboxMessage[]): boolean {
  return inbox.some(m => m.isMandatory && !m.isRead);
}

export function countUnread(inbox: InboxMessage[]): number {
  return inbox.filter(m => !m.isRead).length;
}
