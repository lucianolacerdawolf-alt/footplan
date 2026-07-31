import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/** Verdadeiro só dentro do APK. No navegador (dev, PWA, Cloudflare Pages) tudo
 *  aqui vira no-op — nenhuma tela precisa saber em qual plataforma está. */
export const isNative = Capacitor.isNativePlatform();

/** Ajusta a status bar e derruba o splash. Chamado uma vez, no boot.
 *  Sem o `hide()` explícito o splash fica preso — `launchAutoHide: false` no
 *  capacitor.config.ts é de propósito: esconder no primeiro paint do React
 *  evita o flash de tela vazia entre o splash sumir e o app montar. */
export async function initNativeShell(): Promise<void> {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#060b14' });
  } catch { /* dispositivo sem status bar controlável */ }
  try {
    await SplashScreen.hide();
  } catch { /**/ }
}

/** Registra o handler do botão físico de voltar. Retorna a função de cleanup. */
export function onHardwareBack(handler: () => void): () => void {
  if (!isNative) return () => {};
  const pending = CapApp.addListener('backButton', handler);
  return () => { void pending.then(h => h.remove()); };
}

/** Fecha o app (só faz sentido na tela raiz). */
export function exitApp(): void {
  if (!isNative) return;
  void CapApp.exitApp();
}

/** Vibração curta de confirmação. No-op no web. */
export function tapFeedback(): void {
  if (!isNative) return;
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}
