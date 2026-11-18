import { memo, useState } from 'react';
import type { Player } from '../engine/types';
import { playerOvr } from '../utils/playerOvr';
import { canPromote, scoutEstimate, YOUTH_PROMOTE_MIN_AGE, YOUTH_PROMOTE_MIN_OVR, YOUTH_RELEASE_AGE } from '../engine/youthAcademy';
import { Button } from './ui';
import styles from './YouthAcademyScreen.module.css';
import { ScreenHeader } from './ui';

interface Props {
  youthPlayers: Player[];
  squadSize: number;
  onPromote: (playerId: string) => void;
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

function YouthAcademyScreen({ youthPlayers, squadSize, onPromote, onBack }: Props) {
  const [confirming, setConfirming] = useState<Player | null>(null);
  const sorted = [...youthPlayers].sort((a, b) => scoutEstimate(b).max - scoutEstimate(a).max);

  return (
    <div className={`${styles.screen} app-screen`}>
      <ScreenHeader onBack={onBack} kicker="Modo Carreira" title="Categorias de Base" />

      <p className={styles.intro}>
        {youthPlayers.length} {youthPlayers.length === 1 ? 'jovem' : 'jovens'} na base · elenco profissional com {squadSize} jogadores.
        O olheiro estima o potencial; o real só aparece com o tempo.
      </p>

      {sorted.length === 0 && <p className={styles.empty}>Nenhum jovem na base. A próxima captação chega no fim da temporada.</p>}

      <ul className={styles.list}>
        {sorted.map(p => {
          const ovr = playerOvr(p);
          const est = scoutEstimate(p);
          const ready = canPromote(p);
          const left = Math.max(0, YOUTH_RELEASE_AGE - (p.age ?? 0));
          return (
            <li key={p.id} className={`${styles.card} ${ready ? styles.cardReady : ''}`}>
              <div className={styles.row}>
                <span className={styles.pos}>{POS_LABEL[p.position]}</span>
                <span className={styles.name}>{p.name}</span>
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
              <div className={styles.footer}>
                {ready ? (
                  <Button size="sm" onClick={() => setConfirming(p)}>Promover ao profissional</Button>
                ) : (
                  <span className={styles.hint}>
                    Sobe com {YOUTH_PROMOTE_MIN_AGE}+ anos e força {YOUTH_PROMOTE_MIN_OVR}+ · {left > 0 ? `dispensado em ${left} temporada${left > 1 ? 's' : ''} se não subir` : 'última temporada na base'}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {confirming && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true" aria-label="Confirmar promoção">
          <div className={styles.modal}>
            <p>Promover <strong>{confirming.name}</strong> ao elenco profissional? Ele assina contrato de 3 temporadas.</p>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setConfirming(null)}>Cancelar</Button>
              <Button onClick={() => { onPromote(confirming.id); setConfirming(null); }}>Promover</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(YouthAcademyScreen);
