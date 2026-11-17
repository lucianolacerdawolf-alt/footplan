/**
 * Teste manual da Liga entre Amigos com um 2º jogador (login anônimo próprio).
 * Uso: npx vite-node scripts/dev-friend-league-guest.ts <CODIGO> [timeId]
 * Entra na liga com o código, mostra os membros e tenta gravar as rodadas devidas.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  clear(): void { this.store.clear(); }
  getItem(k: string): string | null { return this.store.get(k) ?? null; }
  key(i: number): string | null { return [...this.store.keys()][i] ?? null; }
  removeItem(k: string): void { this.store.delete(k); }
  setItem(k: string, v: string): void { this.store.set(k, String(v)); }
}
if (typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true, writable: true });
}

import { findFriendLeagueByCode, joinFriendLeague, loadFriendLeague, settleDueRounds } from '../src/services/friendLeagueService';

async function main() {
  const [code, wantedTeam] = process.argv.slice(2);
  if (!code) throw new Error('Uso: npx vite-node scripts/dev-friend-league-guest.ts <CODIGO> [timeId]');
  const league = await findFriendLeagueByCode(code);
  if (!league) throw new Error(`Liga ${code} não encontrada`);
  let data = await loadFriendLeague(league.id);
  const taken = new Set(data.members.map(m => m.teamId));
  const team = league.teams.find(t => t.id === wantedTeam) ?? league.teams.find(t => !taken.has(t.id))!;
  if (!data.members.some(m => m.userId === data.myUserId)) {
    await joinFriendLeague(league.id, team.id, 'Bruno');
    console.log(`Entrou como Bruno com ${team.name}`);
  }
  data = await loadFriendLeague(league.id);
  console.log('Membros:', data.members.map(m => `${m.managerName}=${m.teamId}`).join(', '));
  const written = await settleDueRounds(data);
  data = await loadFriendLeague(league.id);
  console.log(`Rodadas gravadas agora: ${written} · total gravadas: ${data.rounds.size}`);
}

main().catch(e => { console.error('❌', e instanceof Error ? e.message : e); process.exitCode = 1; });
