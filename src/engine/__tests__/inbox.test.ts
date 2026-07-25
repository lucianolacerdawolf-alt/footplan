import { describe, it, expect } from 'vitest';
import {
  createInjuryMessage, createMatchPreviewMessage, createTransferWindowMessage, createWelcomeMessage,
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
