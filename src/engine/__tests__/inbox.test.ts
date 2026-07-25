import { describe, it, expect } from 'vitest';
import {
  createInjuryMessage, createMatchPreviewMessage, createTransferWindowMessage, createWelcomeMessage,
  createTransferOfferMessage, createTransferAcceptedMessage, createTransferRejectedMessage, createTransferOutCompletedMessage,
  hasMandatoryUnread, countUnread,
} from '../inbox';

describe('fábricas de mensagem', () => {
  it('mensagem de lesão é obrigatória e começa não lida', () => {
    const m = createInjuryMessage('Fulano', 2, 'T1 · R3');
    expect(m.type).toBe('INJURY_REPORT');
    expect(m.isMandatory).toBe(true);
    expect(m.isRead).toBe(false);
    expect(m.body).toContain('Fulano');
    expect(m.body).toContain('2');
  });

  it('prévia de partida e janela de transferência não são obrigatórias', () => {
    expect(createMatchPreviewMessage('Rival', true, 'Rodada 5', 'T1 · R5').isMandatory).toBe(false);
    expect(createTransferWindowMessage('T1 · R1').isMandatory).toBe(false);
    expect(createWelcomeMessage('Alex', 20_000_000, 'T1').isMandatory).toBe(false);
  });

  it('cada mensagem recebe um id único', () => {
    const a = createInjuryMessage('X', 1, 'T1');
    const b = createInjuryMessage('X', 1, 'T1');
    expect(a.id).not.toBe(b.id);
  });
});

describe('mensagens do mercado de transferências', () => {
  it('oferta de transferência é obrigatória e carrega meta estruturado', () => {
    const m = createTransferOfferMessage('Arsenal', 'p1', 'Fulano', 'FWD', 88, 20_000_000, 22_000_000, 'arsenal-id', 'T1 · R5');
    expect(m.type).toBe('TRANSFER_OFFER');
    expect(m.isMandatory).toBe(true);
    expect(m.isRead).toBe(false);
    expect(m.meta).toEqual({ playerId: 'p1', offeringTeamId: 'arsenal-id', amount: 22_000_000 });
    expect(m.body).toContain('Arsenal');
    expect(m.body).toContain('Fulano');
    expect(m.subject).toContain('Arsenal');
  });

  it('aceite/recusa/venda concluída são informativas (BOARD_UPDATE) e não carregam meta', () => {
    const accepted = createTransferAcceptedMessage('Fulano', 'Chelsea', 'Você', 5_000_000, 'T1');
    const rejected = createTransferRejectedMessage('Fulano', 'Arsenal', 'T1');
    const sold = createTransferOutCompletedMessage('Fulano', 'Chelsea', 5_000_000, 'T1');

    for (const m of [accepted, rejected, sold]) {
      expect(m.type).toBe('BOARD_UPDATE');
      expect(m.isMandatory).toBe(false);
      expect(m.meta).toBeUndefined();
      expect(m.body).toContain('Fulano');
    }
  });
});

describe('hasMandatoryUnread / countUnread', () => {
  it('detecta mensagem obrigatória não lida', () => {
    const inbox = [createInjuryMessage('X', 1, 'T1')];
    expect(hasMandatoryUnread(inbox)).toBe(true);
  });

  it('mensagem obrigatória já lida não bloqueia', () => {
    const inbox = [{ ...createInjuryMessage('X', 1, 'T1'), isRead: true }];
    expect(hasMandatoryUnread(inbox)).toBe(false);
  });

  it('mensagens não-obrigatórias não bloqueiam mesmo sem ler', () => {
    const inbox = [createTransferWindowMessage('T1'), createWelcomeMessage('Alex', 1, 'T1')];
    expect(hasMandatoryUnread(inbox)).toBe(false);
  });

  it('countUnread conta só as não lidas', () => {
    const inbox = [
      createTransferWindowMessage('T1'),
      { ...createWelcomeMessage('Alex', 1, 'T1'), isRead: true },
    ];
    expect(countUnread(inbox)).toBe(1);
  });
});
