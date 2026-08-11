// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { runSaveMigrations, type Migration } from '../saveMigration';

// Mesmo padrão de storage.test.ts: memory storage stubado (o localStorage do Node 26
// é experimental e quebrado).
function makeMemoryStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  } as Storage;
}

const VERSION_KEY = 'fp:schemaVersion';

describe('runSaveMigrations', () => {
  it('instalação nova (sem save): carimba a versão atual sem rodar migração', () => {
    const ls = makeMemoryStorage();
    let ran = false;
    const migrations: Record<number, Migration> = { 1: () => { ran = true; } };

    expect(runSaveMigrations(ls, migrations, 1)).toBe(1);
    expect(ls.getItem(VERSION_KEY)).toBe('1');
    expect(ran).toBe(false); // nada a migrar numa instalação limpa
  });

  it('instalação anterior ao versionamento (tem save, sem carimbo): entra como baseline 0 e migra até a atual', () => {
    const ls = makeMemoryStorage({ 'fp:career': '{"old":true}' });
    const order: number[] = [];
    const migrations: Record<number, Migration> = {
      1: () => order.push(1),
      2: () => order.push(2),
    };

    expect(runSaveMigrations(ls, migrations, 2)).toBe(2);
    expect(order).toEqual([1, 2]);       // rodou em ordem, da baseline 0 até 2
    expect(ls.getItem(VERSION_KEY)).toBe('2');
  });

  it('roda apenas as migrações pendentes a partir do carimbo gravado', () => {
    const ls = makeMemoryStorage({ [VERSION_KEY]: '1', 'fp:career': '{}' });
    const order: number[] = [];
    const migrations: Record<number, Migration> = {
      1: () => order.push(1), // já aplicada — não deve rodar
      2: () => order.push(2),
      3: () => order.push(3),
    };

    expect(runSaveMigrations(ls, migrations, 3)).toBe(3);
    expect(order).toEqual([2, 3]);
    expect(ls.getItem(VERSION_KEY)).toBe('3');
  });

  it('é idempotente: já na versão atual, não roda nada', () => {
    const ls = makeMemoryStorage({ [VERSION_KEY]: '2', 'fp:career': '{}' });
    let ran = false;
    const migrations: Record<number, Migration> = { 2: () => { ran = true; } };

    expect(runSaveMigrations(ls, migrations, 2)).toBe(2);
    expect(ran).toBe(false);
  });

  it('carimbo corrompido é tratado como ausente (baseline por presença de save)', () => {
    const ls = makeMemoryStorage({ [VERSION_KEY]: 'lixo', 'fp:career': '{}' });
    const order: number[] = [];
    const migrations: Record<number, Migration> = { 1: () => order.push(1) };

    expect(runSaveMigrations(ls, migrations, 1)).toBe(1);
    expect(order).toEqual([1]);
  });

  it('migração que lança não derruba o boot: segue e ainda carimba a versão', () => {
    const ls = makeMemoryStorage({ 'fp:career': '{}' });
    const order: number[] = [];
    const migrations: Record<number, Migration> = {
      1: () => { throw new Error('migração quebrada'); },
      2: () => order.push(2),
    };

    expect(() => runSaveMigrations(ls, migrations, 2)).not.toThrow();
    expect(order).toEqual([2]);          // v2 ainda rodou apesar da v1 falhar
    expect(ls.getItem(VERSION_KEY)).toBe('2');
  });
});
