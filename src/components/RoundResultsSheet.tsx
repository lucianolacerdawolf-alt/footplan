import { useMemo } from 'react';
import type { Team } from '../engine/types';
import type { LeagueFixture } from '../engine/tournament';
import { computeStandings } from '../engine/tournament';
import { crestSrc } from '../utils/crest';
import { useModalFocus } from '../hooks/useModalFocus';
import { Button } from './ui';
import styles from './RoundResultsSheet.module.css';

interface Props {
  round: number;
  fixtures: LeagueFixture[][];
  teams: Team[];
  userTeamId: string;
  onClose: () => void;
}

/** Resultados da rodada que acabou de ser simulada sozinha: todos os placares e quanto
 *  cada time subiu ou caiu na tabela — antes os outros jogos saíam em silêncio. */
export default function RoundResultsSheet({ round, fixtures, teams, userTeamId, onClose }: Props) {
  const ref = useModalFocus<HTMLDivElement>(true, onClose);
  const byId = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams]);
  const { moves, userPos } = useMemo(() => {
    const before = computeStandings(teams, fixtures.slice(0, round));
    const after = computeStandings(teams, fixtures.slice(0, round + 1));
    const posBefore = new Map(before.map((s, i) => [s.teamId, i + 1]));
    const m = new Map(after.map((s, i) => [s.teamId, round === 0 ? 0 : (posBefore.get(s.teamId) ?? i + 1) - (i + 1)]));
    return { moves: m, userPos: after.findIndex(s => s.teamId === userTeamId) + 1 };
  }, [teams, fixtures, round, userTeamId]);
  const userMove = moves.get(userTeamId) ?? 0;

  const crest = (id: string) => <img src={crestSrc(byId.get(id)?.logoUrl)} alt="" className={styles.crest} />;
  const move = (id: string) => {
    const m = moves.get(id) ?? 0;
    return m === 0 ? null : <span className={m > 0 ? styles.up : styles.down}>{m > 0 ? '▲' : '▼'}{Math.abs(m)}</span>;
  };

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div ref={ref} className={styles.card} role="dialog" aria-modal="true" aria-label={`Resultados da rodada ${round + 1}`} onClick={e => e.stopPropagation()}>
        <div className={styles.kicker}>Rodada {round + 1} · resultados</div>
        <div className={styles.userLine}>
          Você está em <b>{userPos}º</b>
          {userMove !== 0 && <span className={userMove > 0 ? styles.up : styles.down}> {userMove > 0 ? `▲ subiu ${userMove}` : `▼ caiu ${-userMove}`}</span>}
          {userMove === 0 && round > 0 && <span className={styles.muted}> (manteve a posição)</span>}
        </div>
        <ul className={styles.list}>
          {(fixtures[round] ?? []).map(f => {
            const mine = f.homeTeamId === userTeamId || f.awayTeamId === userTeamId;
            return (
              <li key={f.id} className={mine ? styles.mine : ''}>
                <span className={styles.side}>{move(f.homeTeamId)}{byId.get(f.homeTeamId)?.abbreviation}{crest(f.homeTeamId)}</span>
                <span className={styles.score}>{f.played ? `${f.homeScore} – ${f.awayScore}` : 'vs'}</span>
                <span className={`${styles.side} ${styles.away}`}>{crest(f.awayTeamId)}{byId.get(f.awayTeamId)?.abbreviation}{move(f.awayTeamId)}</span>
              </li>
            );
          })}
        </ul>
        <Button block onClick={onClose}>Ok</Button>
      </div>
    </div>
  );
}
