import { describe, it, expect } from 'vitest';
import { localTimeOfUtcMidnight, remindersSupported } from '../reminders';

describe('lembretes', () => {
  it('00:05 UTC vira a hora local certa', () => {
    expect(localTimeOfUtcMidnight(180)).toEqual({ hour: 21, minute: 5 });   // Brasília (UTC-3)
    expect(localTimeOfUtcMidnight(0)).toEqual({ hour: 0, minute: 5 });      // UTC
    expect(localTimeOfUtcMidnight(-60)).toEqual({ hour: 1, minute: 5 });    // Lisboa no verão (UTC+1)
  });

  it('fora do app nativo é no-op', () => {
    expect(remindersSupported()).toBe(false);
  });
});
