import { useEffect, useRef, useState } from 'react';
import styles from './IntroSplash.module.css';

export const INTRO_SEEN_KEY = 'fp:introSeen';

/** Mostrar a abertura? Só na primeira vez, e nunca pra quem pediu menos movimento. */
export function shouldShowIntro(): boolean {
  try {
    if (localStorage.getItem(INTRO_SEEN_KEY)) return false;
  } catch { return false; }
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  } catch { /* sem matchMedia: segue */ }
  return true;
}

function markSeen() {
  try { localStorage.setItem(INTRO_SEEN_KEY, '1'); } catch { /* noop */ }
}

/** Duração total (ms) — a saída começa em EXIT_AT. Mantida em sincronia com o CSS. */
const EXIT_AT = 2900;
const TOTAL = 3300;

// Formação no campo (viewBox 0 0 200 300, ataque pra cima): goleiro, defesa, meio, ataque.
const PLAYERS: Array<[number, number]> = [
  [100, 268],
  [40, 225], [80, 232], [120, 232], [160, 225],
  [60, 175], [100, 185], [140, 175],
  [45, 118], [100, 105], [155, 118],
];
// Trajeto da bola: zagueiro → volante → meia → ponta → centroavante → gol.
const PASS = 'M80 232 L100 185 L140 175 L155 118 L100 105 L100 22';

/**
 * Abertura curtinha da primeira vez: o campo se desenha, os jogadores entram numa
 * formação, a bola troca passes até o gol e a marca aparece. Toque em qualquer lugar pula.
 * Tudo em SVG + CSS (sem vídeo, nada pra baixar).
 */
export default function IntroSplash({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    markSeen();
    onDone();
  };

  useEffect(() => {
    // Timers além das animações: se o navegador pausar a animação (aba em segundo
    // plano), a abertura termina do mesmo jeito.
    const t1 = window.setTimeout(() => setLeaving(true), EXIT_AT);
    const t2 = window.setTimeout(finish, TOTAL);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const skip = () => { setLeaving(true); window.setTimeout(finish, 250); };

  return (
    <div
      className={`${styles.intro} ${leaving ? styles.leaving : ''}`}
      onClick={skip}
      role="dialog"
      aria-modal="true"
      aria-label="Abertura do FootPlan"
    >
      <button className={styles.skip} onClick={e => { e.stopPropagation(); skip(); }}>Pular</button>

      <svg className={styles.pitch} viewBox="0 0 200 300" aria-hidden="true">
        <g className={styles.lines}>
          <rect x="10" y="10" width="180" height="280" rx="4" pathLength="1" />
          <line x1="10" y1="150" x2="190" y2="150" pathLength="1" />
          <circle cx="100" cy="150" r="26" pathLength="1" />
          <rect x="55" y="10" width="90" height="40" pathLength="1" />
          <rect x="55" y="250" width="90" height="40" pathLength="1" />
          <rect x="82" y="4" width="36" height="6" pathLength="1" />
        </g>
        <path className={styles.passLine} d={PASS} pathLength="1" />
        {PLAYERS.map(([x, y], i) => (
          <circle key={i} className={styles.player} cx={x} cy={y} r="6"
            style={{ animationDelay: `${450 + i * 45}ms` }} />
        ))}
        {/* animateMotion (SVG nativo): roda igual no Chrome, Safari e WebView do Android. */}
        <circle className={styles.ball} cx="0" cy="0" r="4" opacity="0">
          <set attributeName="opacity" to="1" begin="1s" fill="freeze" />
          <animateMotion path={PASS} begin="1s" dur="1s" fill="freeze" />
        </circle>
        <circle className={styles.goalFlash} cx="100" cy="14" r="10" />
      </svg>

      <div className={styles.brand}>
        <h1 className={styles.wordmark}>Foot<span>Plan</span></h1>
        <p className={styles.tagline}>Simulador tático</p>
      </div>
    </div>
  );
}
