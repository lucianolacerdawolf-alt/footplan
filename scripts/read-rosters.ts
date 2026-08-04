// Lê o snapshot gravado no Supabase e lista o que há por liga.
if (typeof globalThis.localStorage === 'undefined') {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();
    get length(): number { return this.store.size; }
    clear(): void { this.store.clear(); }
    getItem(key: string): string | null { return this.store.has(key) ? this.store.get(key)! : null; }
    key(index: number): string | null { return Array.from(this.store.keys())[index] ?? null; }
    removeItem(key: string): void { this.store.delete(key); }
    setItem(key: string, value: string): void { this.store.set(key, String(value)); }
  }
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });
}

import { loadRosterSnapshot } from '../src/services/rosterCloud';

async function main() {
  const snap = await loadRosterSnapshot();
  if (!snap) {
    console.log('Nenhum snapshot no Supabase.');
    return;
  }
  console.log('updatedAt:', snap.updatedAt);
  console.log('Ligas no snapshot:', Object.keys(snap.rosters).length);
  for (const [id, teams] of Object.entries(snap.rosters)) {
    const total = teams.reduce((s, t) => s + t.squad.length, 0);
    const sample = teams[0]?.squad[0]?.name ?? '-';
    console.log(`  ${id}: ${teams.length} times / ${total} jogadores (ex: ${sample})`);
  }
}

main().catch(err => { console.error(err); process.exitCode = 1; });
