import { memo, useMemo } from 'react';
import type { MatchEvent, Team } from '../../engine/types';
import { getStarterCount } from '../../engine/squadUtils';
import { pitchRows } from '../../utils/pitchRows';
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

function shirtNumbers(team: Team): number[] {
  const starters = team.squad.slice(0, getStarterCount(team.strategy.formation));
  return pitchRows(team.strategy.formation, starters).flat().map(p => p.number);
}

/** Texto preto ou branco conforme a cor da camisa. */
function numberInk(hex: string | undefined): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.6 ? '#0b1220' : '#fff';
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

/** Jogador citado no lance: o artilheiro em gols; senão o 1º nome do elenco do time que
 *  agiu que aparece no texto da narração (o mais longo primeiro, pra "Bruno Fernandes"
 *  não virar "Bruno"). */
export function protagonistName(event: MatchEvent | null, home: Team, away: Team): string | null {
  if (!event) return null;
  if (event.type === 'goal' && event.scorer) return event.scorer;
  const team = event.teamId === home.id ? home : event.teamId === away.id ? away : null;
  if (!team) return null;
  const names = team.squad.map(p => p.name).sort((a, b) => b.length - a.length);
  let best: { name: string; at: number } | null = null;
  for (const n of names) {
    const at = event.description.indexOf(n);
    if (at >= 0 && (!best || at < best.at)) best = { name: n, at };
  }
  return best?.name ?? null;
}

/** Último nome (ou o nome inteiro, se curto) pro rótulo caber no campo. */
function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 && name.length > 12 ? parts[parts.length - 1] : name;
}

function MatchPitch({ home, away, event }: Props) {
  const ball = useMemo(() => ballFor(event, home.id), [event, home.id]);
  const homeDots = useMemo(() => teamDots(home.strategy.formation, 'home', ball.x), [home.strategy.formation, ball.x]);
  const awayDots = useMemo(() => teamDots(away.strategy.formation, 'away', ball.x), [away.strategy.formation, ball.x]);
  // Números das camisas na mesma ordem dos pontos (GK, defesa, meio…, ataque) — igual ao
  // campinho da tela de táticas.
  const homeNums = useMemo(() => shirtNumbers(home), [home]);
  const awayNums = useMemo(() => shirtNumbers(away), [away]);
  const isGoal = event?.type === 'goal' || (event?.type === 'penalty' && event.description.includes('⚽'));
  // Quem está com a bola: o jogador do time que agiu mais perto dela (anel), com o nome
  // de quem a narração citou.
  const actingHome = event?.teamId === home.id;
  const actingDots = event?.teamId ? (actingHome ? homeDots : awayDots) : null;
  const carrier = useMemo(() => {
    if (!actingDots) return -1;
    let idx = -1, best = Infinity;
    actingDots.forEach((d, i) => { const dist = (d.x - ball.x) ** 2 + (d.y - ball.y) ** 2; if (dist < best) { best = dist; idx = i; } });
    return idx;
  }, [actingDots, ball.x, ball.y]);
  const name = protagonistName(event, home, away);
  const labelX = Math.min(W - 12, Math.max(12, ball.x));
  const labelY = ball.y < 8 ? ball.y + 6 : ball.y - 3.2;

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

        {([['h', home, homeDots, homeNums], ['a', away, awayDots, awayNums]] as const).map(([k, t, dots, nums]) =>
          dots.map((d, i) => {
            const fill = d.gk ? t.secondaryColor : t.color;
            return (
              <g key={`${k}${i}`} className={styles.playerG} style={{ transform: `translate(${d.x}px, ${d.y}px)` }}>
                <circle r={2.3} className={styles.player} style={{ fill, stroke: d.gk ? t.color : t.secondaryColor }} />
                {nums[i] != null && (
                  <text className={styles.num} textAnchor="middle" dy="0.8" style={{ fill: numberInk(fill) }}>{nums[i]}</text>
                )}
              </g>
            );
          }),
        )}
        {carrier >= 0 && actingDots && (
          <circle cx={actingDots[carrier].x} cy={actingDots[carrier].y} r={3.3} className={styles.carrierRing} />
        )}
        <circle cx={ball.x} cy={ball.y} r={1.1} className={styles.ball} />
        {name && !isGoal && (
          <text x={labelX} y={labelY} className={styles.nameLabel} textAnchor="middle">{shortName(name)}</text>
        )}
      </svg>
      {isGoal && <div className={styles.goalFlash}>GOL!</div>}
    </div>
  );
}

export default memo(MatchPitch);
