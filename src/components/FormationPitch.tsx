import type { Formation, Team } from '../engine/types';
import { pitchRows } from '../utils/pitchRows';
import { FORMATIONS, FORMATION_COUNTS } from '../engine/constants';
import { isPlayerUnavailable } from '../engine/squadUtils';
import { playerOvr } from '../utils/playerOvr';
import styles from './FormationPitch.module.css';
import { shirtBadge, shirtTag } from '../utils/shirtNumbers';

// =============================================================================
// Campinho da escalação — formação desenhada com os titulares
// =============================================================================
// Toque num titular pra selecionar; os reservas da mesma posição aparecem logo
// abaixo e um toque troca os dois. Trocar a formação pelos chips redesenha o campo.

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

interface Props {
  team: Team;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Troca o reserva (índice no squad) com o titular (índice no squad). */
  onSwap: (benchIdx: number, starterIdx: number) => void;
  onFormation?: (f: Formation) => void;
  disabled?: boolean;
}

export default function FormationPitch({ team, selectedId, onSelect, onSwap, onFormation, disabled }: Props) {
  const formation = team.strategy.formation;
  const counts = FORMATION_COUNTS[formation];
  const starterCount = 1 + counts.DEF + counts.MID + counts.FWD;
  const starters = team.squad.slice(0, starterCount);
  const bench = team.squad.slice(starterCount);
  const rows = pitchRows(formation, starters).reverse(); // ataque em cima
  const selectedIdx = selectedId ? team.squad.findIndex(p => p.id === selectedId) : -1;
  const selected = selectedIdx >= 0 && selectedIdx < starterCount ? team.squad[selectedIdx] : null;
  const options = selected ? bench.filter(p => p.position === selected.position) : [];

  return (
    <div className={styles.wrap}>
      {onFormation && (
        <div className={styles.formations} role="group" aria-label="Formação">
          {FORMATIONS.map(f => (
            <button
              key={f}
              type="button"
              className={`${styles.chip} ${f === formation ? styles.chipActive : ''}`}
              aria-pressed={f === formation}
              disabled={disabled}
              onClick={() => onFormation(f)}
            >{f}</button>
          ))}
        </div>
      )}

      <div className={styles.pitch} aria-label={`Escalação ${formation}`}>
        <span className={styles.halfLine} aria-hidden="true" />
        <span className={styles.circle} aria-hidden="true" />
        <span className={styles.boxTop} aria-hidden="true" />
        <span className={styles.boxBottom} aria-hidden="true" />
        {rows.map((row, r) => (
          <div key={r} className={styles.row}>
            {row.map(p => {
              const out = isPlayerUnavailable(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.player} ${p.id === selectedId ? styles.selected : ''}`}
                  disabled={disabled}
                  onClick={() => onSelect(p.id === selectedId ? null : p.id)}
                  aria-label={`${p.name}, ${p.position}, ${playerOvr(p)}${out ? ', indisponível' : ''}`}
                >
                  <span className={`${styles.shirt} ${styles[`pos${p.position}`]}`}>
                    {shirtBadge(p)}
                    {out && <span className={styles.alert} aria-hidden="true">!</span>}
                  </span>
                  <span className={styles.name}>{shortName(p.name)}</span>
                  <span className={styles.ovr}>{playerOvr(p)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selected ? (
        <div className={styles.bench}>
          <div className={styles.benchTitle}>
            Trocar {shortName(selected.name)} ({playerOvr(selected)}) por:
          </div>
          {options.length === 0 ? (
            <div className={styles.benchEmpty}>Nenhum reserva de {selected.position} no elenco.</div>
          ) : (
            <div className={styles.benchList}>
              {options.map(p => {
                const diff = playerOvr(p) - playerOvr(selected);
                const out = isPlayerUnavailable(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={styles.benchPlayer}
                    disabled={out}
                    onClick={() => { onSwap(team.squad.findIndex(q => q.id === p.id), selectedIdx); }}
                  >
                    <span className={styles.benchName}>{shirtTag(p)} {p.name}</span>
                    <span className={styles.benchOvr}>
                      {out ? (p.isSuspended ? '🚫' : '🤕') : playerOvr(p)}
                      {!out && diff !== 0 && <span className={diff > 0 ? styles.up : styles.down}> {diff > 0 ? `+${diff}` : diff}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        !disabled && <div className={styles.hint}>Toque num titular pra trocar por um reserva</div>
      )}
    </div>
  );
}
