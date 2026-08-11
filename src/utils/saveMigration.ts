// =============================================================================
// SAVE MIGRATION — versionamento de esquema dos saves
// =============================================================================
// Objetivo: quando um update futuro mudar o formato de algum save (carreira,
// liga, bracket...), os saves antigos NÃO podem quebrar em silêncio. Este módulo
// carimba uma versão de esquema no localStorage e roda, no boot, as migrações
// pendentes entre a versão gravada e a atual.
//
// Como adicionar uma migração no futuro:
//   1. Incremente SAVE_SCHEMA_VERSION (ex: 1 -> 2).
//   2. Registre em MIGRATIONS a função que leva do esquema anterior ao novo,
//      indexada pela versão de DESTINO (MIGRATIONS[2] transforma v1 -> v2).
//   3. Escreva a migração de forma defensiva: ela pode rodar sobre um save
//      ausente ou parcial — nunca deve lançar. Migração é bônus, jamais derruba
//      o boot do app.

export const SAVE_SCHEMA_VERSION = 1;

const VERSION_KEY = 'fp:schemaVersion';
const SAVE_PREFIX = 'fp:';

/** Transforma o localStorage de um esquema para o imediatamente seguinte. */
export type Migration = (ls: Storage) => void;

// Vazio nesta primeira release versionada: v1 é a linha de base. Migrações reais
// entram aqui a partir do v2. Ex: `2: migrateV1toV2,`
export const MIGRATIONS: Record<number, Migration> = {};

/** Existe algum save real do jogo (fora a própria chave de versão)? */
function hasExistingSave(ls: Storage): boolean {
  try {
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && k.startsWith(SAVE_PREFIX) && k !== VERSION_KEY) return true;
    }
  } catch { /* storage bloqueado (modo privado) — trata como vazio */ }
  return false;
}

/**
 * Versão de esquema com que o boot começa:
 *  - carimbo válido gravado  -> usa ele;
 *  - sem carimbo mas com save -> instalação anterior ao versionamento: baseline 0;
 *  - sem carimbo e sem save   -> instalação nova: já está no esquema atual (nada a migrar).
 */
function detectStartVersion(ls: Storage, current: number): number {
  try {
    const raw = ls.getItem(VERSION_KEY);
    if (raw !== null) {
      const n = Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0) return n;
    }
  } catch { /* noop */ }
  return hasExistingSave(ls) ? 0 : current;
}

/**
 * Roda, em ordem, todas as migrações pendentes e carimba a versão atual.
 * Nunca lança: qualquer falha numa migração é engolida para não impedir o boot.
 * Retorna a versão final gravada.
 */
export function runSaveMigrations(
  ls: Storage = localStorage,
  migrations: Record<number, Migration> = MIGRATIONS,
  current: number = SAVE_SCHEMA_VERSION,
): number {
  const from = detectStartVersion(ls, current);

  for (let target = from + 1; target <= current; target++) {
    const migrate = migrations[target];
    if (!migrate) continue;
    try {
      migrate(ls);
    } catch {
      // Migração é bônus — se falhar, seguimos e ainda carimbamos a versão para
      // não ficar tentando a mesma migração quebrada a cada boot.
    }
  }

  try {
    ls.setItem(VERSION_KEY, String(current));
  } catch { /* storage bloqueado — sem carimbo, mas o app segue */ }

  return current;
}
