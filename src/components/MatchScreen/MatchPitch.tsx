import { memo, useMemo } from 'react';
import type { MatchEvent, Team } from '../../engine/types';
import styles from './MatchPitch.module.css';

// =============================================================================
// Campo 2D visto de cima — acompanha o fluxo de eventos da narração.
// =============================================================================
// Não é uma simulação física: cada evento (posse, ataque, finalização, gol…) leva a
// bola pra uma zona plausível do campo e os blocos dos dois times se deslocam junto.
// Dá vida à partida sem mexer na engine. Mandante ataca pra direita.

const W = 100;
const H = 64;

/** Hash estável → [0, 1), pra posições variarem por evento sem flicker entre renders. */
function h01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}

function parseFormation(f: string): number[] {
  const lines = f.split('-').map(n => parseInt(n, 10)).filter(n => n > 0);
  return lines.length > 0 ? lines : [4, 3, 3];
}

/** Posições (x, y) dos 11 de um time, com o bloco deslocado em direção à bola. */
function teamDots(formation: string, side: 'home' | 'away', ballX: number): Array<{ x: number; y: number; gk: boolean }> {
  const lines = parseFormation(formation);
  const shift = (ballX - W / 2) * 0.28;
  const dots: Array<{ x: number; y: number; gk: boolean }> = [];
  const gkX = 5 + Math.max(0, shift * 0.15);
  dots.push({ x: side === 'home' ? gkX : W - gkX, y: H / 2, gk: true });
  lines.forEach((count, li) => {
    // linhas de 20 (defesa) a 46 (ataque) no campo do próprio time, + deslocamento
    const baseX = 20 + (li / Math.max(1, lines.length - 1)) * 26 + shift * (side === 'home' ? 1 : -1);
    const x = side === 'home' ? baseX : W - baseX;
    for (let i = 0; i < count; i++) {
      const y = ((i + 1) / (count + 1)) * H;
      dots.push({ x: Math.min(W - 3, Math.max(3, x)), y, gk: false });
    }
  });
  return dots;
}

/** Zona da bola pro evento. `homeId` decide pra que lado "atacar". */
function ballFor(event: MatchEvent | null, homeId: string): { x: number; y: number } {
  if (!event || ['kickoff', 'halftime', 'fulltime', 'extraTimeKickoff'].includes(event.type)) return { x: W / 2, y: H / 2 };
  const key = `${event.minute}:${event.type}:${event.description}`;
  const r = h01(key);
  const y = 8 + r * (H - 16);
  const attackingHome = event.teamId === homeId;
  // x "na direção do ataque" do time que gerou o evento
  const toward = (fromCenter: number) => attackingHome ? W / 2 + fromCenter : W / 2 - fromCenter;
  switch (event.type) {
    case 'possession': case 'pass': return { x: toward(-6 + r * 16), y };
    case 'tackle': case 'foul': case 'yellowCard': case 'redCard': case 'injury': return { x: toward(-4 + r * 20), y };
    case 'attack': case 'offside': return { x: toward(26 + r * 12), y };
    case 'corner': return { x: toward(48), y: r < 0.5 ? 1.5 : H - 1.5 };
    case 'goal': case 'penalty': return { x: toward(48.5), y: H / 2 - 3 + r * 6 };
    case 'miss': return { x: toward(49), y: r < 0.5 ? H / 2 - 9 : H / 2 + 9 };
    case 'post': return { x: toward(48), y: r < 0.5 ? H / 2 - 4 : H / 2 + 4 };
    case 'save': return { x: toward(45), y: H / 2 - 2 + r * 4 };
    default: return { x: toward(r * 10), y };
  }
}

interface Props {
  home: Team;
  away: Team;
  event: MatchEvent | null;
}

function MatchPitch({ home, away, event }: Props) {
  const ball = useMemo(() => ballFor(event, home.id), [event, home.id]);
  const homeDots = useMemo(() => teamDots(home.strategy.formation, 'home', ball.x), [home.strategy.formation, ball.x]);
  const awayDots = useMemo(() => teamDots(away.strategy.formation, 'away', ball.x), [away.strategy.formation, ball.x]);
  const isGoal = event?.type === 'goal' || (event?.type === 'penalty' && event.description.includes('⚽'));

  return (
    <div className={styles.wrap} aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.pitch} preserveAspectRatio="xMidYMid meet">
        {/* faixas do gramado */}
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={i * 10} y={0} width={10} height={H} className={i % 2 ? styles.stripeA : styles.stripeB} />
        ))}
        {/* linhas */}
        <g className={styles.lines}>
          <rect x={0.5} y={0.5} width={W - 1} height={H - 1} />
          <line x1={W / 2} y1={0.5} x2={W / 2} y2={H - 0.5} />
          <circle cx={W / 2} cy={H / 2} r={8} />
          <rect x={0.5} y={H / 2 - 18} width={15} height={36} />
          <rect x={W - 15.5} y={H / 2 - 18} width={15} height={36} />
          <rect x={0.5} y={H / 2 - 8} width={5} height={16} />
          <rect x={W - 5.5} y={H / 2 - 8} width={5} height={16} />
        </g>
        <rect x={-0.5} y={H / 2 - 4} width={1.2} height={8} className={styles.goal} />
        <rect x={W - 0.7} y={H / 2 - 4} width={1.2} height={8} className={styles.goal} />

        {homeDots.map((d, i) => (
          <circle key={`h${i}`} cx={d.x} cy={d.y} r={d.gk ? 1.9 : 1.7} className={styles.player}
            style={{ fill: d.gk ? home.secondaryColor : home.color, stroke: d.gk ? home.color : home.secondaryColor }} />
        ))}
        {awayDots.map((d, i) => (
          <circle key={`a${i}`} cx={d.x} cy={d.y} r={d.gk ? 1.9 : 1.7} className={styles.player}
            style={{ fill: d.gk ? away.secondaryColor : away.color, stroke: d.gk ? away.color : away.secondaryColor }} />
        ))}
        <circle cx={ball.x} cy={ball.y} r={1.1} className={styles.ball} />
      </svg>
      {isGoal && <div className={styles.goalFlash}>GOL!</div>}
    </div>
  );
}

export default memo(MatchPitch);
