import { useState } from 'react';
import type { Team, Formation } from '../engine/types';
import { FORMATIONS } from '../engine/constants';
import { getStarterCount, swapSquadPlayers, rebalanceForFormation, isPlayerUnavailable } from '../engine/squadUtils';
import { playerOvr } from '../utils/playerOvr';
import FormationPitch from './FormationPitch';
import styles from './SquadManagementScreen.module.css';

interface Props {
  team: Team;
  onSave: (team: Team) => void;
  onClose: () => void;
}

export default function SquadManagementScreen({ team: initialTeam, onSave, onClose }: Props) {
  const [team, setTeam] = useState<Team>(initialTeam);
  const [selected, setSelected] = useState<string | null>(null);

  const starterCount = getStarterCount(team.strategy.formation);
  const bench = team.squad.slice(starterCount);
  const realIdx = (id: string) => team.squad.findIndex(p => p.id === id);
  const selectedIdx = selected ? realIdx(selected) : -1;
  const selectedIsBench = selectedIdx >= starterCount;

  const eligibleIds = selected
    ? new Set(
        team.squad
          .filter((p, i) => (i >= starterCount) !== selectedIsBench && p.position === team.squad[selectedIdx].position)
          .map(p => p.id)
      )
    : undefined;

  const handlePick = (id: string) => {
    const idx = realIdx(id);
    const isBench = idx >= starterCount;
    if (isBench && isPlayerUnavailable(team.squad[idx])) return; // suspenso/lesionado — não pode ser escalado
    if (selected && selectedIsBench !== isBench && team.squad[selectedIdx].position === team.squad[idx].position) {
      setTeam(swapSquadPlayers(team, selectedIdx, idx));
      setSelected(null);
    } else {
      setSelected(prev => (prev === id ? null : id));
    }
  };

  const handleFormation = (f: Formation) => {
    setTeam(prev => rebalanceForFormation(prev, f));
    setSelected(null);
  };

  return (
    <div className={styles.overlay} role="presentation">
      <div className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="sq-mgmt-title">
        <div className={styles.header}>
          <img src={team.logoUrl} alt="" className={styles.crest} />
          <div className={styles.headerInfo}>
            <h2 id="sq-mgmt-title">{team.name}</h2>
            <span className={styles.headerSub}>Gerenciar Elenco</span>
          </div>
          <select
            className={styles.formationSelect}
            value={team.strategy.formation}
            onChange={e => handleFormation(e.target.value as Formation)}
            aria-label="Formação"
          >
            {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar sem salvar">✕</button>
        </div>

        <div className={styles.body}>
          <FormationPitch team={team} selectedId={selected} eligibleIds={eligibleIds} onSelectPlayer={handlePick} />

          <div className={styles.benchPanel}>
            <div className={styles.benchTitle}>Reservas ({bench.length})</div>
            <div className={styles.benchList}>
              {bench.map(p => {
                const isSelected = p.id === selected;
                const isEligible = eligibleIds?.has(p.id);
                const unavailable = isPlayerUnavailable(p);
                const fatigueDot = p.currentFatigue > 80 ? styles.fatigueHigh : p.currentFatigue > 50 ? styles.fatigueMedium : null;
                return (
                  <div
                    key={p.id}
                    className={`${styles.benchRow} ${isSelected ? styles.selected : ''} ${isEligible ? styles.eligible : ''} ${unavailable ? styles.unavailable : ''}`}
                    role="button"
                    tabIndex={0}
                    aria-disabled={unavailable}
                    title={p.isSuspended ? 'Suspenso' : p.injuredRounds ? `Lesionado (${p.injuredRounds}j)` : undefined}
                    onClick={() => handlePick(p.id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePick(p.id); } }}
                  >
                    {fatigueDot && <span className={`${styles.fatigueDot} ${fatigueDot}`} aria-hidden="true" />}
                    <span className={styles.num}>#{p.number}</span>
                    <span className={styles.name}>{p.name}</span>
                    {p.injuredRounds ? <span className={styles.injury}>🤕 {p.injuredRounds}j</span> : null}
                    {p.isSuspended ? <span className={styles.injury}>🚫 {p.suspendedRounds ?? 1}j</span> : null}
                    <span className={`${styles.pos} ${styles[`pos${p.position}`]}`}>{p.position}</span>
                    <span className={styles.ovr}>{playerOvr(p)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <span className={styles.hint}>
            {selected ? 'Escolha um jogador da mesma posição pra trocar' : 'Toque num jogador pra selecionar'}
          </span>
          <button className={styles.saveBtn} onClick={() => onSave(team)}>Salvar Escalação ✓</button>
        </div>
      </div>
    </div>
  );
}
