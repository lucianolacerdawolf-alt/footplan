// =============================================================================
// HTTP — fetch com timeout compartilhado
// =============================================================================
// Um upstream travado (rede lenta/sem resposta) pendurava os fetches dos 3
// clientes de dados indefinidamente — o usuário via "sincronizando…" para sempre.
// Todos os fetches de serviço devem usar fetchWithTimeout.

export const HTTP_TIMEOUT_MS = 15_000;

/** fetch com timeout (default 15s) — lança AbortError se o upstream não responder. */
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = HTTP_TIMEOUT_MS,
): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
