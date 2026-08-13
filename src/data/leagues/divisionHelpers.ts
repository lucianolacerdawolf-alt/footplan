import type { Team, Position, Formation } from '@/engine/types';
import { FORMATION_COUNTS } from '@/engine/constants';
import { generatePlayerWithSubtype, generateRandomName } from './generateTeam';
import { SECOND_DIVISION_CRESTS } from '../secondDivisionCrests';

function starOvr(teamOvr: number, slot: number): number {
  if (slot >= 11) {
    const benchOffsets = [-2, -3, -3, -4, -4, -5, -6];
    return teamOvr + benchOffsets[slot - 11];
  }
  const starterOffsets = [+4, +3, +2, +2, +1, +1, 0, 0, -1, -1, -2];
  return teamOvr + starterOffsets[slot];
}

type SlotDef = [Position, number, string]; // [position, jerseyNumber, subtype]

const STARTER_SLOTS: Record<string, SlotDef[]> = {
  '4-4-2':   [
    ['GK',1,'GK'],['DEF',2,'FB'],['DEF',3,'CB'],['DEF',4,'CB'],['DEF',5,'FB'],
    ['MID',6,'CM'],['MID',7,'CM'],['MID',8,'CM'],['MID',9,'CM'],
    ['FWD',10,'ST'],['FWD',11,'ST'],
  ],
  '4-3-3':   [
    ['GK',1,'GK'],['DEF',2,'FB'],['DEF',3,'CB'],['DEF',4,'CB'],['DEF',5,'FB'],
    ['MID',6,'CM'],['MID',7,'CM'],['MID',8,'CM'],
    ['FWD',9,'W'],['FWD',10,'ST'],['FWD',11,'W'],
  ],
  '4-2-3-1': [
    ['GK',1,'GK'],['DEF',2,'FB'],['DEF',3,'CB'],['DEF',4,'CB'],['DEF',5,'FB'],
    ['MID',6,'CDM'],['MID',7,'CDM'],
    ['MID',8,'CAM'],['MID',9,'CAM'],['MID',10,'CAM'],
    ['FWD',11,'ST'],
  ],
  '3-5-2':   [
    ['GK',1,'GK'],['DEF',2,'CB'],['DEF',3,'CB'],['DEF',4,'CB'],
    ['MID',5,'CM'],['MID',6,'CDM'],['MID',7,'CM'],['MID',8,'CM'],['MID',9,'CM'],
    ['FWD',10,'ST'],['FWD',11,'ST'],
  ],
  '5-3-2':   [
    ['GK',1,'GK'],['DEF',2,'FB'],['DEF',3,'CB'],['DEF',4,'CB'],['DEF',5,'CB'],['DEF',6,'FB'],
    ['MID',7,'CM'],['MID',8,'CM'],['MID',9,'CM'],
    ['FWD',10,'ST'],['FWD',11,'ST'],
  ],
  '3-4-3':   [
    ['GK',1,'GK'],['DEF',2,'CB'],['DEF',3,'CB'],['DEF',4,'CB'],
    ['MID',5,'W'],['MID',6,'CM'],['MID',7,'CM'],['MID',8,'W'],
    ['FWD',9,'W'],['FWD',10,'ST'],['FWD',11,'W'],
  ],
  '4-1-4-1': [
    ['GK',1,'GK'],['DEF',2,'FB'],['DEF',3,'CB'],['DEF',4,'CB'],['DEF',5,'FB'],
    ['MID',6,'CDM'],
    ['MID',7,'CM'],['MID',8,'CM'],['MID',9,'W'],['MID',10,'W'],
    ['FWD',11,'ST'],
  ],
  '4-4-1-1': [
    ['GK',1,'GK'],['DEF',2,'FB'],['DEF',3,'CB'],['DEF',4,'CB'],['DEF',5,'FB'],
    ['MID',6,'CM'],['MID',7,'CM'],['MID',8,'W'],['MID',9,'W'],
    ['MID',10,'CAM'],['FWD',11,'ST'],
  ],
  '3-4-2-1': [
    ['GK',1,'GK'],['DEF',2,'CB'],['DEF',3,'CB'],['DEF',4,'CB'],
    ['MID',5,'W'],['MID',6,'CM'],['MID',7,'CM'],['MID',8,'W'],
    ['MID',9,'CAM'],['MID',10,'CAM'],
    ['FWD',11,'ST'],
  ],
  '4-3-1-2': [
    ['GK',1,'GK'],['DEF',2,'FB'],['DEF',3,'CB'],['DEF',4,'CB'],['DEF',5,'FB'],
    ['MID',6,'CM'],['MID',7,'CM'],['MID',8,'CM'],
    ['MID',9,'CAM'],
    ['FWD',10,'ST'],['FWD',11,'ST'],
  ],
  '5-4-1':   [
    ['GK',1,'GK'],['DEF',2,'FB'],['DEF',3,'CB'],['DEF',4,'CB'],['DEF',5,'CB'],['DEF',6,'FB'],
    ['MID',7,'CM'],['MID',8,'CM'],['MID',9,'W'],['MID',10,'W'],
    ['FWD',11,'ST'],
  ],
};

const BENCH_SLOTS: SlotDef[] = [
  ['GK',12,'GK'],['DEF',13,'CB'],['MID',14,'CM'],['FWD',15,'ST'],
  ['DEF',16,'FB'],['MID',17,'CAM'],['FWD',18,'W'],
];

// Guarda de consistência: os slots por formação precisam bater com FORMATION_COUNTS
// (engine/constants.ts) — sem isso, uma formação nova num lugar mas não no outro
// cairia no fallback silencioso `?? STARTER_SLOTS['4-4-2']` em makeSecondDivisionTeam.
for (const [formation, slots] of Object.entries(STARTER_SLOTS)) {
  const counts = FORMATION_COUNTS[formation as Formation];
  const tally = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
  for (const [pos] of slots) tally[pos]++;
  if (!counts || counts.GK !== tally.GK || counts.DEF !== tally.DEF || counts.MID !== tally.MID || counts.FWD !== tally.FWD) {
    throw new Error(`STARTER_SLOTS divergente de FORMATION_COUNTS para a formação ${formation}`);
  }
}

// Derivado de STARTER_SLOTS (mesma ordem de declaração) — não é uma lista paralela.
const FORMATIONS = Object.keys(STARTER_SLOTS) as Formation[];

function pickFormation(teamId: string): Formation {
  const idx = teamId.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return FORMATIONS[idx % FORMATIONS.length];
}

export function makeSecondDivisionTeam(
  id: string, name: string, abbr: string, color: string, secondary: string, ovr: number,
): Team {
  const formation = pickFormation(id);
  const slots = STARTER_SLOTS[formation] ?? STARTER_SLOTS['4-4-2'];
  const xi = slots.map(([pos, num, subtype], i) =>
    generatePlayerWithSubtype(`${id}-${num}`, generateRandomName(), num, pos, starOvr(ovr, i), subtype)
  );
  const bench = BENCH_SLOTS.map(([pos, num, subtype], i) =>
    generatePlayerWithSubtype(`${id}-${num}`, generateRandomName(), num, pos, starOvr(ovr, 11 + i), subtype)
  );
  return {
    id, name, abbreviation: abbr, color, secondaryColor: secondary,
    // Badge real do TheSportsDB (ver scripts/fetch-secondary-crests.ts), servido local
    // após crests:download. Vazio pros poucos sem match — nesse caso o sync ao vivo ainda
    // pode preencher (guarda em rosterSync: só sobrescreve logoUrl vazio).
    logoUrl: SECOND_DIVISION_CRESTS[id] ?? '',
    squad: [...xi, ...bench],
    strategy: { formation, mentality: 'counter-attack', intensity: 'medium', defensiveLine: 'normal', width: 'normal' },
  };
}
