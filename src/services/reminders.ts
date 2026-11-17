import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// =============================================================================
// Lembretes locais (só no app Android/iOS — Capacitor LocalNotifications)
// =============================================================================
// Não precisa de servidor: o próprio aparelho agenda a notificação, repetindo todo dia.
// O usuário pode desligar no card "Metas de hoje". No navegador/PWA não há como avisar
// com o app fechado sem servidor de push, então aqui é no-op (ver BACKLOG).

const DAILY_GOALS_ID = 1001;
const FRIEND_ROUND_ID = 1002;
const PREF_KEY = 'fp:reminders';
const FRIEND_FLAG_KEY = 'fp:inFriendLeague';

export function remindersSupported(): boolean {
  return Capacitor.isNativePlatform();
}

export function remindersEnabled(): boolean {
  try { return localStorage.getItem(PREF_KEY) !== 'off'; } catch { return true; }
}

/** Marca se o usuário participa de alguma Liga entre Amigos (liga o lembrete de rodada). */
export function markInFriendLeague(inLeague: boolean): boolean {
  let changed = false;
  try {
    const before = localStorage.getItem(FRIEND_FLAG_KEY) === '1';
    changed = before !== inLeague;
    localStorage.setItem(FRIEND_FLAG_KEY, inLeague ? '1' : '0');
  } catch { /* noop */ }
  return changed;
}

function inFriendLeague(): boolean {
  try { return localStorage.getItem(FRIEND_FLAG_KEY) === '1'; } catch { return false; }
}

/** Hora/minuto LOCAL equivalente a 00:05 UTC (logo depois da virada da rodada da liga). */
export function localTimeOfUtcMidnight(offsetMinutes = new Date().getTimezoneOffset()): { hour: number; minute: number } {
  const totalLocal = ((5 - offsetMinutes) % 1440 + 1440) % 1440;
  return { hour: Math.floor(totalLocal / 60), minute: totalLocal % 60 };
}

/** (Re)agenda os lembretes conforme a preferência. Seguro chamar várias vezes. */
export async function syncReminders(): Promise<void> {
  if (!remindersSupported()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_GOALS_ID }, { id: FRIEND_ROUND_ID }] });
    if (!remindersEnabled()) return;
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted' && perm.display !== 'denied') perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;
    const notifications = [{
      id: DAILY_GOALS_ID,
      title: 'FootPlan',
      body: '🎯 Suas metas do dia estão esperando — não perca a sequência!',
      schedule: { on: { hour: 19, minute: 0 }, allowWhileIdle: true },
    }];
    if (inFriendLeague()) {
      notifications.push({
        id: FRIEND_ROUND_ID,
        title: 'Liga entre Amigos',
        body: '⚽ Rodada nova disputada — veja a tabela e ajuste a tática.',
        schedule: { on: localTimeOfUtcMidnight(), allowWhileIdle: true },
      });
    }
    await LocalNotifications.schedule({ notifications });
  } catch { /* sem permissão ou plugin indisponível: segue sem lembrete */ }
}

export async function setRemindersEnabled(on: boolean): Promise<void> {
  try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch { /* noop */ }
  await syncReminders();
}
