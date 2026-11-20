import { useEffect } from 'react';
import { computeReputationDelta, GIANT_KILL_OVR_GAP, GIANT_KILL_REP_CAP } from '../engine/career';
import { useModalFocus } from '../hooks/useModalFocus';
import { Button } from './ui';
import styles from './ReputationPanel.module.css';

// =============================================================================
// Reputação do técnico — o que é, em que nível você está e como subir
// =============================================================================
// Antes era só "☆ 0 rep" em letra miúda no topo da Central, sem explicação. A
// reputação só muda no fim da temporada (e na demissão), então a tela mostra uma
// PRÉVIA: quanto entraria se a temporada acabasse hoje, pela posição atual.

const LEVELS = [
  { min: 0, label: 'Desconhecido' },
  { min: 15, label: 'Promissor' },
  { min: 30, label: 'Respeitado' },
  { min: 45, label: 'Reconhecido' },
  { min: 60, label: 'Renomado' },
  { min: 75, label: 'Elite' },
  { min: 90, label: 'Lenda' },
];

/** Marcos que a reputação destrava (patrocínio e mercado de treinador). */
const UNLOCKS = [
  { at: 15, text: 'Clubes de prestígio médio passam a te sondar' },
  { at: 25, text: 'Patrocínio Regional (receita ×1,4)' },
  { at: 30, text: 'Clubes de prestígio maior no mercado de treinador' },
  { at: 40, text: '2 propostas de emprego por temporada' },
  { at: 45, text: 'Clubes grandes passam a te sondar' },
  { at: 50, text: 'Patrocínio Nacional (receita ×1,8)' },
  { at: 60, text: 'Gigantes do continente te consideram' },
  { at: 75, text: 'Patrocínio Global (×2,5) e 3 propostas por temporada' },
];

export function reputationLevel(rep: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => { if (rep >= l.min) idx = i; });
  const next = LEVELS[idx + 1];
  return { index: idx, label: LEVELS[idx].label, nextLabel: next?.label ?? null, nextAt: next?.min ?? 100, from: LEVELS[idx].min };
}

interface Props {
  reputation: number;
  /** Posição atual na liga (null antes do 1º jogo). */
  leaguePosition: number | null;
  totalTeams: number;
  /** Soma das recompensas dos objetivos da diretoria ainda em aberto. */
  pendingObjectiveRep: number;
  /** Quantos +1 de "vitória sobre time mais forte" já vieram nesta temporada. */
  seasonGiantKills?: number;
  onClose: () => void;
}

export default function ReputationPanel({ reputation, leaguePosition, totalTeams, pendingObjectiveRep, seasonGiantKills, onClose }: Props) {
  const ref = useModalFocus<HTMLDivElement>(true, onClose);
  // O foco vai pro botão "Entendi" (último) e o navegador rolava a folha até o fim.
  useEffect(() => { const t = setTimeout(() => ref.current?.scrollTo({ top: 0 }), 0); return () => clearTimeout(t); }, [ref]);
  const lvl = reputationLevel(reputation);
  const span = Math.max(1, lvl.nextAt - lvl.from);
  const pct = lvl.nextLabel ? Math.round(((reputation - lvl.from) / span) * 100) : 100;
  const preview = leaguePosition
    ? computeReputationDelta({ leagueChampion: leaguePosition === 1, cupChampion: false, leaguePosition, totalTeams })
    : null;
  const third = Math.ceil(totalTeams / 3);
  const nextUnlock = UNLOCKS.find(u => u.at > reputation);

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Reputação" onClick={onClose}>
      <div className={styles.sheet} ref={ref} onClick={e => e.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.star} aria-hidden="true">★</span>
          <div className={styles.headText}>
            <span className={styles.kicker}>Sua reputação</span>
            <strong className={styles.value}>{reputation} <small>/ 100 · {lvl.label}</small></strong>
          </div>
        </div>

        <div className={styles.bar} role="img" aria-label={`${pct}% até ${lvl.nextLabel ?? 'o topo'}`}>
          <div className={styles.fill} style={{ width: `${pct}%` }} />
        </div>
        <div className={styles.barLabel}>
          {lvl.nextLabel ? <>Faltam <b>{lvl.nextAt - reputation}</b> para <b>{lvl.nextLabel}</b></> : 'Nível máximo'}
          {nextUnlock && <> · próximo desbloqueio em {nextUnlock.at}: {nextUnlock.text.toLowerCase()}</>}
        </div>

        <h3 className={styles.h3}>Como subir</h3>
        <p className={styles.note}>Durante a temporada:</p>
        <ul className={styles.rules}>
          <li><span>Vencer na liga um time bem mais forte (força {GIANT_KILL_OVR_GAP}+ acima)</span><b className={styles.pos}>+1</b></li>
        </ul>
        <p className={styles.note}>Até {GIANT_KILL_REP_CAP} por temporada{seasonGiantKills !== undefined ? <> · nesta: <b>{seasonGiantKills}/{GIANT_KILL_REP_CAP}</b></> : null}. No <b>fim de cada temporada</b>:</p>
        <ul className={styles.rules}>
          <li><span>Campeão da liga</span><b className={styles.pos}>+15</b></li>
          <li><span>Campeão da copa nacional</span><b className={styles.pos}>+10</b></li>
          <li><span>Campeão continental (Champions / Europa / Conference)</span><b className={styles.pos}>+15 / +10 / +7</b></li>
          <li><span>Terminar entre os {third} primeiros (sem ser campeão)</span><b className={styles.pos}>+3</b></li>
          <li><span>Cada objetivo da diretoria cumprido</span><b className={styles.pos}>+recompensa</b></li>
          <li><span>Terminar entre os {third} últimos</span><b className={styles.neg}>−3</b></li>
          <li><span>Objetivo da diretoria falhado</span><b className={styles.neg}>−penalidade</b></li>
          <li><span>Ser demitido</span><b className={styles.neg}>−8</b></li>
        </ul>

        <div className={styles.preview}>
          {preview === null
            ? 'Jogue a primeira rodada para ver a prévia da temporada.'
            : <>Se a temporada acabasse hoje ({leaguePosition}º lugar): <b className={preview >= 0 ? styles.pos : styles.neg}>{preview > 0 ? '+' : ''}{preview}</b> pela liga
              {pendingObjectiveRep > 0 && <>, e até <b className={styles.pos}>+{pendingObjectiveRep}</b> com os objetivos da diretoria em aberto (aba Temporada)</>}.</>}
        </div>

        <h3 className={styles.h3}>O que ela destrava</h3>
        <ul className={styles.unlocks}>
          {UNLOCKS.map(u => (
            <li key={u.at} className={reputation >= u.at ? styles.unlocked : ''}>
              <span className={styles.unlockAt}>{reputation >= u.at ? '✓' : u.at}</span>{u.text}
            </li>
          ))}
        </ul>

        <Button block onClick={onClose}>Entendi</Button>
      </div>
    </div>
  );
}
