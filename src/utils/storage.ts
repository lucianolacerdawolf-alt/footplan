const EVICTABLE_PREFIX = 'fp:rosterCache:';
export const STORAGE_FAILURE_EVENT = 'fp:storage-failed';
const NOTIFY_THROTTLE_MS = 60_000;

let lastNotifiedAt = 0;

export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED' || err.code === 22)
  );
}

// Caches de roster são regeneráveis (basta re-sincronizar) e ocupam ~1 MB — o
// primeiro candidato a liberar espaço quando o save da carreira (1.3 MB+) não cabe.
function evictRegenerableCaches(): void {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(EVICTABLE_PREFIX)) localStorage.removeItem(k);
    }
  } catch { /* noop */ }
}

function notifyFailure(): void {
  const now = Date.now();
  if (now - lastNotifiedAt < NOTIFY_THROTTLE_MS) return;
  lastNotifiedAt = now;
  window.dispatchEvent(new CustomEvent(STORAGE_FAILURE_EVENT));
}

// setItem pode lançar (quota cheia, modo privado, storage bloqueado). Antes era
// engolido em silêncio: o usuário jogava horas, recarregava e perdia tudo sem aviso.
// Agora: evicta caches regeneráveis, tenta de novo e, se ainda falhar, avisa a UI
// (evento com throttle — falha repetida a cada state change não pode virar spam).
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    evictRegenerableCaches();
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      notifyFailure();
      return false;
    }
  }
}

export function onStorageFailure(handler: () => void): () => void {
  window.addEventListener(STORAGE_FAILURE_EVENT, handler);
  return () => window.removeEventListener(STORAGE_FAILURE_EVENT, handler);
}
