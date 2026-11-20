import { useRef, useState } from 'react';
import { useDragSwap } from '../hooks/useDragSwap';
import type { Formation, Player, Team } from '../engine/types';
import { pitchRows } from '../utils/pitchRows';
import { FORMATIONS, FORMATION_COUNTS } from '../engine/constants';
import { isPlayerUnavailable, isOutOfPosition, moveIntoSlot, naturalPosition, playAs } from '../engine/squadUtils';
import { playerOvr } from '../utils/playerOvr';
import styles from './FormationPitch.module.css';
import { shirtBadge, shirtTag } from '../utils/shirtNumbers';

// =============================================================================
// Campinho da escalação — formação desenhada com os titulares
// =============================================================================
// Dois jeitos de trocar:
//  • toque num titular → os reservas da mesma posição aparecem embaixo → toque troca;
//  • ARRASTE um jogador (titular ou reserva da faixa de baixo) e solte em cima de outro.
// Arrastando pra cima de alguém de OUTRA posição, o jogador assume a vaga e a função do
// outro ("fora de posição"): a força é recalculada pra nova função e o selo laranja
// avisa. Goleiro só troca com goleiro. Quem vai pro banco volta à posição de origem.

function shortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : name;
}

const POS_LABEL: Record<Player['position'], string> = { GK: 'goleiro', DEF: 'defensor', MID: 'meia', FWD: 'atacante' };

interface Props {
  team: Team;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Troca dois jogadores de lugar no elenco (índices no squad). */
  onSwap: (benchIdx: number, starterIdx: number) => void;
  onFormation?: (f: Formation) => void;
  /** Troca com mudança de função (fora de posição): recebe o elenco já reorganizado. */
  onSquadChange?: (squad: Player[]) => void;
  /** "Escalar melhores": monta o time mais forte disponível na formação atual. */
  onAutoPick?: () => void;
  disabled?: boolean;
}

/** Cansaço visível no campinho: só a partir de 40% (abaixo disso não pesa no jogo). */
function fatigueTone(f: number): 'mid' | 'high' | null {
  return f >= 70 ? 'high' : f >= 40 ? 'mid' : null;
}

export default function FormationPitch({ team, selectedId, onSelect, onSwap, onSquadChange, onFormation, onAutoPick, disabled }: Props) {
  const formation = team.strategy.formation;
  const counts = FORMATION_COUNTS[formation];
  const starterCount = 1 + counts.DEF + counts.MID + counts.FWD;
  const starters = team.squad.slice(0, starterCount);
  const bench = team.squad.slice(starterCount);
  const rows = pitchRows(formation, starters).reverse(); // ataque em cima
  const selectedIdx = selectedId ? team.squad.findIndex(p => p.id === selectedId) : -1;
  const selected = selectedIdx >= 0 && selectedIdx < starterCount ? team.squad[selectedIdx] : null;
  const options = selected ? bench.filter(p => p.position === selected.position) : [];

  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (msg: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(msg);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  };

  const dropOn = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const a = team.squad.findIndex(p => p.id === fromId);
    const b = team.squad.findIndex(p => p.id === toId);
    if (a < 0 || b < 0) return;
    const pa = team.squad[a];
    const pb = team.squad[b];
    if (a >= starterCount && b >= starterCount) { flash('Solte o reserva em cima de um titular.'); return; }
    const incoming = a >= starterCount ? pa : b >= starterCount ? pb : null;
    if (incoming && isPlayerUnavailable(incoming)) {
      flash(`${shortName(incoming.name)} está ${incoming.isSuspended ? 'suspenso' : 'lesionado'}.`);
      return;
    }
    if (pa.position !== pb.position) {
      if (pa.position === 'GK' || pb.position === 'GK') { flash('Goleiro só troca com goleiro.'); return; }
      if (!onSquadChange) {
        flash(`${shortName(pa.name)} é ${POS_LABEL[pa.position]} — só troca com outro ${POS_LABEL[pa.position]}.`);
        return;
      }
      const next = moveIntoSlot(team, a, b);
      onSquadChange(next.squad);
      onSelect(null);
      // Conta o que mudou pra quem entrou em campo numa função nova.
      const mover = b < starterCount ? pa : pb;
      const role = b < starterCount ? pb.position : pa.position;
      const before = playerOvr(playAs(mover, naturalPosition(mover)));
      const after = playerOvr(playAs(mover, role));
      flash(role === naturalPosition(mover)
        ? `${shortName(mover.name)} voltou a jogar de ${POS_LABEL[role]}.`
        : `${shortName(mover.name)} agora joga de ${POS_LABEL[role]} (fora de posição): força ${before} → ${after}.`);
      return;
    }
    // onSwap(bench, starter): quando os dois são titulares a ordem não importa.
    if (a >= starterCount) onSwap(a, b); else onSwap(b, a);
    onSelect(null);
  };

  const { dragProps: dragFor, consumeClick: consumeSuppressed, draggingId, ghost, overId } = useDragSwap(dropOn, disabled);
  const dragProps = (p: Player) => dragFor(p.id);
  const dragged = draggingId ? team.squad.find(p => p.id === draggingId) : null;

  return (
    <div className={styles.wrap}>
      {onAutoPick && !disabled && (
        <div className={styles.toolsRow}>
          <button type="button" className={styles.autoBtn} onClick={() => { onAutoPick(); onSelect(null); flash('Time mais forte escalado (descontando cansaço, sem lesionados/suspensos).'); }}>
            ⚡ Escalar melhores
          </button>
          <span className={styles.legend}><span className={styles.legendBar} /> cansaço <span className={styles.legendCard} /> 2 amarelos</span>
        </div>
      )}
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
                  title={isOutOfPosition(p) ? `Fora de posição: é ${POS_LABEL[naturalPosition(p)]}, jogando de ${POS_LABEL[p.position]} (força ${playerOvr(playAs(p, naturalPosition(p)))} na posição dele)` : undefined}
                  aria-label={`${p.name}, ${p.position}${isOutOfPosition(p) ? ` (fora de posição, é ${naturalPosition(p)})` : ''}, ${playerOvr(p)}${out ? ', indisponível' : ''}${(p.currentFatigue ?? 0) >= 40 ? `, cansaço ${Math.round(p.currentFatigue ?? 0)}%` : ''}`}
                >
                  <span className={`${styles.shirt} ${styles[`pos${p.position}`]}`}>
                    {shirtBadge(p)}
                    {out && <span className={styles.alert} aria-hidden="true">!</span>}
                    {isOutOfPosition(p) && <span className={styles.oop} aria-hidden="true">{naturalPosition(p)}</span>}
                    {!out && (p.yellowCardsThisSeason ?? 0) >= 2 && <span className={styles.cardWarn} title={`${p.yellowCardsThisSeason} amarelos — mais um e é suspenso`} aria-hidden="true" />}
                  </span>
                  <span className={styles.name}>{shortName(p.name)}</span>
                  <span className={`${styles.ovr} ${isOutOfPosition(p) ? styles.ovrOop : ''}`}>{playerOvr(p)}</span>
                  {fatigueTone(p.currentFatigue ?? 0) && (
                    <span className={`${styles.fatigue} ${styles[`fatigue_${fatigueTone(p.currentFatigue ?? 0)}`]}`} title={`Cansaço ${Math.round(p.currentFatigue ?? 0)}%`}>
                      <span style={{ width: `${Math.min(100, p.currentFatigue ?? 0)}%` }} />
                    </span>
                  )}
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
        !disabled && <div className={styles.hint}>Arraste um jogador para cima de outro para trocar (em outra posição, ele passa a jogar fora de posição), ou toque num titular para ver os reservas</div>
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

      {dragged && ghost && (
        <div className={styles.ghost} style={{ left: ghost.x, top: ghost.y }} aria-hidden="true">
          <span className={`${styles.shirt} ${styles[`pos${dragged.position}`]}`}>{shirtBadge(dragged)}</span>
          <span className={styles.name}>{shortName(dragged.name)}</span>
        </div>
      )}
    </div>
  );
}
