const CRASH_KEY = 'fp:lastCrash';

// Produção não tinha nenhuma telemetria: um crash real só existia no console do
// usuário. Agora o último crash fica persistido (com versão) pra diagnóstico — e o
// console.error com versão ajuda quando o usuário manda print/screenshot.
export function recordCrash(error: unknown, source: 'boundary' | 'global'): void {
  const message = error instanceof Error ? error.message : String(error);
  try {
    localStorage.setItem(CRASH_KEY, JSON.stringify({
      message: message.slice(0, 500),
      version: __APP_VERSION__,
      source,
      at: new Date().toISOString(),
    }));
  } catch { /* noop */ }
  console.error(`[FootPlan v${__APP_VERSION__}] crash (${source}):`, error);
}

export function installCrashReporting(): void {
  window.addEventListener('error', e => recordCrash(e.error ?? e.message, 'global'));
  window.addEventListener('unhandledrejection', e => recordCrash(e.reason, 'global'));
}
