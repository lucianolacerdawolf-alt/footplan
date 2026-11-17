import { describe, it, expect } from 'vitest';
import { teamStadium } from '../stadiums';

describe('teamStadium', () => {
  it('usa o estádio real quando o sync gravou', () => {
    expect(teamStadium({ id: 'cry', name: 'Crystal Palace', stadium: 'Selhurst Park', capacity: 25486 }))
      .toEqual({ name: 'Selhurst Park', capacity: 25486 });
  });

  it('sem dado real: nome estável por clube e sem capacidade inventada', () => {
    const a = teamStadium({ id: 'cry', name: 'Crystal Palace' });
    const b = teamStadium({ id: 'cry', name: 'Crystal Palace' });
    expect(a).toEqual(b);
    expect(a.capacity).toBeUndefined();
  });
});
