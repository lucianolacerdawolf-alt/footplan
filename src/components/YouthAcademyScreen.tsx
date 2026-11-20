import { memo, useState } from 'react';
import type { Player } from '../engine/types';
import { playerOvr } from '../utils/playerOvr';
import { canPromote, scoutEstimate, seasonsUntilReady, YOUTH_PROMOTE_MIN_AGE, YOUTH_PROMOTE_MIN_OVR, YOUTH_RELEASE_AGE, YOUTH_MAX_LOANS } from '../engine/youthAcademy';
import { Button } from './ui';
import styles from './YouthAcademyScreen.module.css';
import { ScreenHeader } from './ui';

interface Props {
  youthPlayers: Player[];
  squadSize: number;
  onPromote: (playerId: string) => void;
  /** Jovem com treino focado nesta temporada (um por vez). */
  focusId?: string;
  onFocus?: (playerId: string) => void;
  onRelease?: (playerId: string) => void;
  /** Jovens emprestados nesta temporada (voltam no fim dela). */
  loanIds?: string[];
  onToggleLoan?: (playerId: string) => void;
  onBack: () => void;
}

const POS_LABEL: Record<Player['position'], string> = { GK: 'GK', DEF: 'DEF', MID: 'MID', FWD: 'FWD' };

/** Os 2 atributos mais relevantes por posição (resumo do card). */
function keyAttrs(p: Player): string {
  const a = p.attributes;
  switch (p.position) {
    case 'GK': return `Posic. ${a.positioning} · Passe ${a.passing}`;
    case 'DEF': return `Desarme ${a.tackling} · Posic. ${a.positioning}`;
    case 'MID': return `Passe ${a.passing} · Visão ${a.vision}`;
    default: return `Finaliz. ${a.finishing} · Veloc. ${a.speed}`;
  }
}

function readyText(p: Player): string {
  const n = seasonsUntilReady(p);
  if (n === null) return 'O olheiro acha difícil ele chegar ao profissional';
  return `Previsão: pronto em ~${n} temporada${n > 1 ? 's' : ''}`;
}

type Confirm = { kind: 'promote' | 'release'; player: Player };

function YouthAcademyScreen({ youthPlayers, squadSize, onPromote, focusId, onFocus, onRelease, loanIds = [], onToggleLoan, onBack }: Props) {
  const [confirming, setConfirming] = useState<Confirm | null>(null);
  const sorted = [...youthPlayers].sort((a, b) => scoutEstimate(b).max - scoutEstimate(a).max);
  const focused = youthPlayers.find(p => p.id === focusId);

  return (
    <div className={`${styles.screen} app-screen fit-screen`}>
      <ScreenHeader onBack={onBack} kicker="Modo Carreira" title="Categorias de Base" />

      <p className={styles.intro}>
        {youthPlayers.length} {youthPlayers.length === 1 ? 'jovem' : 'jovens'} na base · elenco profissional com {squadSize} jogadores.
        Sobem ao profissional com {YOUTH_PROMOTE_MIN_AGE}+ anos e força {YOUTH_PROMOTE_MIN_OVR}+. Evoluem um pouco a cada rodada e dão o salto maior na virada da temporada.
      </p>

      {onFocus && youthPlayers.length > 0 && (
        <div className={styles.focusBox}>
          🎯 <strong>Treino focado:</strong>{' '}
          {focused
            ? <>{focused.name} — evolui uma etapa a mais no fim da temporada.</>
            : <>escolha 1 jovem para evoluir mais rápido nesta temporada.</>}
        </div>
      )}

      {sorted.length === 0 && <p className={styles.empty}>Nenhum jovem na base. A próxima captação chega no fim da temporada.</p>}

      <ul className={`${styles.list} fit-scroll`}>
        {sorted.map(p => {
          const ovr = playerOvr(p);
          const est = scoutEstimate(p);
          const ready = canPromote(p);
          const left = Math.max(0, YOUTH_RELEASE_AGE - (p.age ?? 0));
          const isFocus = p.id === focusId;
          const onLoan = loanIds.includes(p.id);
          return (
            <li key={p.id} className={`${styles.card} ${ready ? styles.cardReady : ''} ${isFocus ? styles.cardFocus : ''}`}>
              <div className={styles.row}>
                <span className={styles.pos}>{POS_LABEL[p.position]}</span>
                <span className={styles.name}>{isFocus && '🎯 '}{onLoan && '✈️ '}{p.name}</span>
                <span className={styles.age}>{p.age} anos</span>
                <span className={styles.ovr} aria-label={`força ${ovr}`}>{ovr}</span>
              </div>
              <div className={styles.attrs}>{keyAttrs(p)}</div>
              <div className={styles.potentialRow}>
                <span className={styles.potLabel}>Potencial (olheiro)</span>
                <div className={styles.potBar} role="img" aria-label={`potencial estimado entre ${est.min} e ${est.max}`}>
                  <div className={styles.potNow} style={{ width: `${ovr}%` }} />
                  <div className={styles.potRange} style={{ left: `${est.min}%`, width: `${Math.max(2, est.max - est.min)}%` }} />
                </div>
                <span className={styles.potValue}>{est.min}–{est.max}</span>
              </div>
              <div className={styles.hint}>
                {onLoan
                  ? 'Emprestado até o fim da temporada: joga e evolui ~3× mais rápido por rodada.'
                  : ready
                  ? 'Pronto para subir ao profissional.'
                  : <>{readyText(p)} · {left > 0 ? `dispensado em ${left} temporada${left > 1 ? 's' : ''} se não subir` : 'última temporada na base'}</>}
              </div>
              <div className={styles.footer}>
                {ready && !onLoan && <Button size="sm" onClick={() => setConfirming({ kind: 'promote', player: p })}>Promover</Button>}
                {onFocus && !ready && !onLoan && (
                  <Button size="sm" variant={isFocus ? 'primary' : 'secondary'} onClick={() => onFocus(p.id)}>
                    {isFocus ? '🎯 Em treino focado' : 'Treino focado'}
                  </Button>
                )}
                {onToggleLoan && !ready && (
                  <Button size="sm" variant="secondary" disabled={!onLoan && loanIds.length >= YOUTH_MAX_LOANS}
                    title={!onLoan && loanIds.length >= YOUTH_MAX_LOANS ? `Máximo de ${YOUTH_MAX_LOANS} empréstimos` : undefined}
                    onClick={() => onToggleLoan(p.id)}>
                    {onLoan ? 'Cancelar empréstimo' : '✈️ Emprestar'}
                  </Button>
                )}
                {onRelease && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirming({ kind: 'release', player: p })}>Dispensar</Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {confirming && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label={confirming.kind === 'promote' ? 'Confirmar promoção' : 'Confirmar dispensa'}>
          <div className={styles.modal}>
            {confirming.kind === 'promote'
              ? <p>Promover <strong>{confirming.player.name}</strong> ao elenco profissional? Ele assina contrato de 3 temporadas.</p>
              : <p>Dispensar <strong>{confirming.player.name}</strong> da base? Ele sai do clube e não volta.</p>}
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setConfirming(null)}>Cancelar</Button>
              <Button onClick={() => {
                if (confirming.kind === 'promote') onPromote(confirming.player.id);
                else onRelease?.(confirming.player.id);
                setConfirming(null);
              }}>{confirming.kind === 'promote' ? 'Promover' : 'Dispensar'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(YouthAcademyScreen);
