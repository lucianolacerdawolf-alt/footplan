import { useRef, useState } from 'react';
import type { Formation, Player, Team } from '../engine/types';
import { pitchRows } from '../utils/pitchRows';
import { FORMATIONS, FORMATION_COUNTS } from '../engine/constants';
import { isPlayerUnavailable } from '../engine/squadUtils';
import { playerOvr } from '../utils/playerOvr';
import styles from './FormationPitch.module.css';
import { shirtBadge, shirtTag } from '../utils/shirtNumbers';

// =============================================================================
// Campinho da escalação — formação desenhada com os titulares
// =============================================================================
// Dois jeitos de trocar:
//  • toque num titular → os reservas da mesma posição aparecem embaixo → toque troca;
//  • ARRASTE um jogador (titular ou reserva da faixa de baixo) e solte em cima de outro.
// O motor não tem "jogador fora de posição": a formação é montada pela posição de cada
// um, então a troca só vale entre jogadores da mesma posição (GK↔GK, DEF↔DEF…). Entre
// dois titulares da mesma linha, arrastar troca o lugar deles na linha.

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

const POS_LABEL: Record<Player['position'], string> = { GK: 'goleiro', DEF: 'defensor', MID: 'meia', FWD: 'atacante' };
const DRAG_THRESHOLD = 8;

interface Props {
  team: Team;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Troca dois jogadores de lugar no elenco (índices no squad). */
  onSwap: (benchIdx: number, starterIdx: number) => void;
  onFormation?: (f: Formation) => void;
  disabled?: boolean;
}

interface DragState {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  active: boolean;
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

  const [drag, setDrag] = useState<DragState | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Depois de um arrasto o navegador ainda dispara o click — ignora esse.
  const suppressClick = useRef(false);

  const flash = (msg: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(msg);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  };

  const targetAt = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y)?.closest('[data-player-id]');
    return el?.getAttribute('data-player-id') ?? null;
  };

  const dropOn = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const a = team.squad.findIndex(p => p.id === fromId);
    const b = team.squad.findIndex(p => p.id === toId);
    if (a < 0 || b < 0) return;
    const pa = team.squad[a];
    const pb = team.squad[b];
    if (a >= starterCount && b >= starterCount) { flash('Solte o reserva em cima de um titular.'); return; }
    if (pa.position !== pb.position) {
      flash(`${shortName(pa.name)} é ${POS_LABEL[pa.position]} — só troca com outro ${POS_LABEL[pa.position]}.`);
      return;
    }
    const incoming = a >= starterCount ? pa : b >= starterCount ? pb : null;
    if (incoming && isPlayerUnavailable(incoming)) {
      flash(`${shortName(incoming.name)} está ${incoming.isSuspended ? 'suspenso' : 'lesionado'}.`);
      return;
    }
    // onSwap(bench, starter): quando os dois são titulares a ordem não importa.
    if (a >= starterCount) onSwap(a, b); else onSwap(b, a);
    onSelect(null);
  };

  const dragProps = (p: Player) => ({
    'data-player-id': p.id,
    onPointerDown: (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return;
      // Captura já no toque: com mouse, um movimento rápido saía do botão antes do limiar.
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      setDrag({ id: p.id, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false });
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag || drag.id !== p.id) return;
      const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD;
      setDrag({ ...drag, x: e.clientX, y: e.clientY, active: drag.active || moved });
      if (drag.active || moved) {
        const t = targetAt(e.clientX, e.clientY);
        setOverId(t && t !== p.id ? t : null);
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!drag || drag.id !== p.id) return;
      if (drag.active) {
        suppressClick.current = true;
        const t = targetAt(e.clientX, e.clientY);
        if (t) dropOn(p.id, t);
      }
      setDrag(null);
      setOverId(null);
    },
    onPointerCancel: () => { setDrag(null); setOverId(null); },
  });

  const consumeSuppressed = () => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  };

  const dragged = drag?.active ? team.squad.find(p => p.id === drag.id) : null;

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
              const isDragging = dragged?.id === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  {...dragProps(p)}
                  className={`${styles.player} ${p.id === selectedId ? styles.selected : ''} ${overId === p.id ? styles.dropTarget : ''} ${isDragging ? styles.dragging : ''}`}
                  disabled={disabled}
                  onClick={() => {
                    if (consumeSuppressed()) return;
                    // Com um titular selecionado, tocar noutro da mesma posição troca os dois de lugar.
                    if (selected && p.id !== selected.id && p.position === selected.position) { dropOn(selected.id, p.id); return; }
                    onSelect(p.id === selectedId ? null : p.id);
                  }}
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

      {notice && <div className={styles.notice} role="status">{notice}</div>}

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
        !disabled && <div className={styles.hint}>Arraste um jogador para cima de outro da mesma posição, ou toque num titular para ver os reservas</div>
      )}

      {!disabled && bench.length > 0 && (
        <div className={styles.benchStrip} aria-label="Reservas">
          {bench.map(p => {
            const out = isPlayerUnavailable(p);
            return (
              <button
                key={p.id}
                type="button"
                {...dragProps(p)}
                className={`${styles.benchChip} ${dragged?.id === p.id ? styles.dragging : ''} ${out ? styles.benchChipOut : ''}`}
                onClick={() => {
                  if (consumeSuppressed()) return;
                  if (selected) { dropOn(p.id, selected.id); return; }
                  flash(`Arraste ${shortName(p.name)} até um ${POS_LABEL[p.position]} no campo.`);
                }}
                aria-label={`Reserva ${p.name}, ${p.position}, ${playerOvr(p)}`}
              >
                <span className={`${styles.chipPos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                <span className={styles.chipName}>{shortName(p.name)}</span>
                <span className={styles.chipOvr}>{out ? (p.isSuspended ? '🚫' : '🤕') : playerOvr(p)}</span>
              </button>
            );
          })}
        </div>
      )}

      {dragged && drag && (
        <div className={styles.ghost} style={{ left: drag.x, top: drag.y }} aria-hidden="true">
          <span className={`${styles.shirt} ${styles[`pos${dragged.position}`]}`}>{shirtBadge(dragged)}</span>
          <span className={styles.name}>{shortName(dragged.name)}</span>
        </div>
      )}
    </div>
  );
}
