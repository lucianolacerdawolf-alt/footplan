import { writeFileSync } from 'node:fs';

/** Grava a reserva offline do app (ver rosterCloud.loadBundledSnapshot). */
export function writeRosterBundle(rosters: Record<string, unknown>, updatedAt: string, file = 'public/rosters-snapshot.json'): void {
  writeFileSync(file, JSON.stringify({ updatedAt, rosters }));
}
