import { useMemo, useState } from 'react';
import type { Team } from '../engine/types';
import type { LeagueFixture } from '../engine/tournament';
import { computeStandings } from '../engine/tournament';
import styles from './PositionChart.module.css';

interface Props { teams: Team[]; fixtures: LeagueFixture[][]; teamId: string }

/** Posição do time ao fim de cada rodada jogada. */
export function positionHistory(teams: Team[], fixtures: LeagueFixture[][], teamId: string): number[] {
  const out: number[] = [];
  for (let r = 0; r < fixtures.length; r++) {
    if (!fixtures[r].some(f => f.played)) break;
    const st = computeStandings(teams, fixtures.slice(0, r + 1));
    out.push(st.findIndex(s => s.teamId === teamId) + 1);
  }
  return out;
}

const W = 320, H = 170, PL = 26, PR = 10, PT = 10, PB = 22;

/** Linha única (sem legenda — o título nomeia a série), eixo Y invertido: 1º no topo.
 *  Passar o dedo/mouse mostra a rodada e a posição; a lista abaixo é a versão em texto. */
export default function PositionChart({ teams, fixtures, teamId }: Props) {
  const hist = useMemo(() => positionHistory(teams, fixtures, teamId), [teams, fixtures, teamId]);
  const [hover, setHover] = useState<number | null>(null);
  const n = teams.length;
  if (hist.length < 2) return <p className={styles.empty}>O gráfico aparece depois de 2 rodadas jogadas.</p>;

  const x = (i: number) => PL + (i / Math.max(1, hist.length - 1)) * (W - PL - PR);
  const y = (pos: number) => PT + ((pos - 1) / Math.max(1, n - 1)) * (H - PT - PB);
  const path = hist.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ');
  const ticks = [1, Math.ceil(n / 2), n];
  const best = Math.min(...hist), worst = Math.max(...hist);
  const h = hover ?? hist.length - 1;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PL) / (W - PL - PR)) * (hist.length - 1));
    setHover(Math.max(0, Math.min(hist.length - 1, i)));
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Sua posição rodada a rodada</div>
      <div className={styles.readout} aria-live="polite">
        Rodada <b>{h + 1}</b>: <b>{hist[h]}º</b> lugar
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.svg} role="img"
        aria-label={`Posição por rodada: começou em ${hist[0]}º, melhor ${best}º, pior ${worst}º, agora ${hist[hist.length - 1]}º`}
        onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={PL} x2={W - PR} y1={y(t)} y2={y(t)} className={styles.grid} />
            <text x={PL - 6} y={y(t) + 3.5} className={styles.tick} textAnchor="end">{t}º</text>
          </g>
        ))}
        <text x={PL} y={H - 6} className={styles.tick}>R1</text>
        <text x={W - PR} y={H - 6} className={styles.tick} textAnchor="end">R{hist.length}</text>
        <path d={path} className={styles.line} />
        {hover !== null && <line x1={x(h)} x2={x(h)} y1={PT} y2={H - PB} className={styles.cross} />}
        <circle cx={x(h)} cy={y(hist[h])} r={4.5} className={styles.dot} />
      </svg>
      <div className={styles.summary}>
        Melhor: <b>{best}º</b> · Pior: <b>{worst}º</b> · Agora: <b>{hist[hist.length - 1]}º</b>
      </div>
      <details className={styles.table}>
        <summary>Ver em tabela</summary>
        <ol>{hist.map((p, i) => <li key={i}>Rodada {i + 1}: {p}º</li>)}</ol>
      </details>
    </div>
  );
}
