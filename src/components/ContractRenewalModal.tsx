import { useState } from 'react';
import type { Player, ContractGoal } from '../engine/types';
import type { ContractRenewalOptions } from '../engine/career';
import { canRenewContract, evaluateRenewalOffer } from '../engine/career';
import { calculateMarketValue, calculateWeeklyWage, renewalCost } from '../engine/transferMarket';
import { playerOvr } from '../utils/playerOvr';
import { formatMoney } from '../utils/formatMoney';
import { useModalFocus } from '../hooks/useModalFocus';
import styles from './ContractRenewalModal.module.css';

interface Props {
  player: Player;
  budget: number;
  currentSeasonYear: number;
  onConfirm: (options: ContractRenewalOptions) => void;
  onClose: () => void;
}

const SALARY_PRESETS: Array<{ label: string; multiplier: number }> = [
  { label: 'Manter', multiplier: 1 },
  { label: '+10%', multiplier: 1.1 },
  { label: '+20%', multiplier: 1.2 },
  { label: '+35%', multiplier: 1.35 },
  { label: '+50%', multiplier: 1.5 },
];

const SIGNING_BONUS_PRESETS: Array<{ label: string; fraction: number }> = [
  { label: 'Sem bônus', fraction: 0 },
  { label: '5%', fraction: 0.05 },
  { label: '10%', fraction: 0.1 },
  { label: '15%', fraction: 0.15 },
];

const GOAL_PRESETS: Array<{ label: string; target?: number; fraction: number }> = [
  { label: 'Sem meta', fraction: 0 },
  { label: '10 gols', target: 10, fraction: 0.05 },
  { label: '15 gols', target: 15, fraction: 0.1 },
  { label: '20 gols', target: 20, fraction: 0.15 },
];

function roundWage(value: number): number {
  return Math.round(value / 100) * 100;
}

function closestPresetIndex(value: number, presets: number[]): number {
  let best = 0;
  let bestDist = Infinity;
  presets.forEach((v, i) => {
    const d = Math.abs(v - value);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  return best;
}

export default function ContractRenewalModal({ player, budget, currentSeasonYear, onConfirm, onClose }: Props) {
  const [years, setYears] = useState(1);
  const [salaryIdx, setSalaryIdx] = useState(0);
  const [bonusIdx, setBonusIdx] = useState(0);
  const [goalIdx, setGoalIdx] = useState(0);
  const [counterWageOverride, setCounterWageOverride] = useState<number | null>(null);
  const modalRef = useModalFocus<HTMLDivElement>(true, onClose);

  const canRenew = canRenewContract(player, currentSeasonYear);
  const marketValue = player.marketValue ?? calculateMarketValue(player);
  const baseWage = player.weeklyWage ?? calculateWeeklyWage(marketValue);

  const weeklyWage = counterWageOverride ?? roundWage(baseWage * SALARY_PRESETS[salaryIdx].multiplier);

  const bonusPreset = SIGNING_BONUS_PRESETS[bonusIdx];
  const signingBonus = Math.round(marketValue * bonusPreset.fraction);

  const goalPreset = GOAL_PRESETS[goalIdx];
  const contractGoal: ContractGoal | undefined = goalPreset.target != null
    ? { type: 'goals', target: goalPreset.target, bonus: Math.round(marketValue * goalPreset.fraction) }
    : undefined;

  const cost = renewalCost(player, years) + signingBonus;
  const offer: ContractRenewalOptions = { years, weeklyWage, signingBonus, contractGoal };

  const evaluation = canRenew
    ? evaluateRenewalOffer(player, offer)
    : { accepted: false as const, reaction: 'reject' as const, message: `${player.name} renovou recentemente — disponível na próxima temporada.` };
  const overBudget = cost > budget;

  const selectSalary = (i: number) => { setSalaryIdx(i); setCounterWageOverride(null); };

  const applyCounter = () => {
    if (!evaluation.counter) return;
    const c = evaluation.counter;
    setYears(c.years);
    setCounterWageOverride(c.weeklyWage);
    const wagePresets = SALARY_PRESETS.map(p => roundWage(baseWage * p.multiplier));
    setSalaryIdx(closestPresetIndex(c.weeklyWage, wagePresets));
    setBonusIdx(closestPresetIndex(c.signingBonus ?? 0, SIGNING_BONUS_PRESETS.map(p => Math.round(marketValue * p.fraction))));
    setGoalIdx(c.contractGoal
      ? GOAL_PRESETS.findIndex(g => g.target === c.contractGoal?.target)
      : 0);
  };

  const handleConfirm = () => {
    if (!canRenew || !evaluation.accepted || overBudget) return;
    onConfirm(offer);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div ref={modalRef} className={styles.card} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="renewal-modal-name">
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">✕</button>

        <div className={styles.header}>
          <div className={styles.ovrBadge}>
            <span className={styles.ovrNumber}>{playerOvr(player)}</span>
            <span className={styles.ovrLabel}>{player.position}</span>
          </div>
          <div className={styles.headerInfo}>
            <div className={styles.name} id="renewal-modal-name">{player.name}</div>
            <div className={styles.subtitle}>
              <span>#{player.number}</span>
              <span>{player.position}</span>
              {player.age !== undefined && <span>{player.age} anos</span>}
              <span>📋 {player.contractSeasonsLeft ?? 2} temp. restante{(player.contractSeasonsLeft ?? 2) > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>

        {!canRenew && (
          <div className={styles.cooldownBanner}>
            ⏳ {player.name} renovou recentemente. Só pode renovar de novo na próxima temporada.
          </div>
        )}

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Anos de contrato</span>
          <div className={styles.chipRow}>
            {[1, 2, 3, 4, 5].map(y => (
              <button
                key={y}
                type="button"
                className={`${styles.chip} ${years === y ? styles.chipActive : ''}`}
                onClick={() => setYears(y)}
                disabled={!canRenew}
              >
                {y} ano{y > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Salário semanal</span>
          <div className={styles.chipRow}>
            {SALARY_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                className={`${styles.chip} ${salaryIdx === i ? styles.chipActive : ''}`}
                onClick={() => selectSalary(i)}
                disabled={!canRenew}
              >
                {p.label}
              </button>
            ))}
          </div>
          <span className={styles.preview}>Novo salário: {formatMoney(weeklyWage)}/sem</span>
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Bônus de assinatura (à vista)</span>
          <div className={styles.chipRow}>
            {SIGNING_BONUS_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                className={`${styles.chip} ${bonusIdx === i ? styles.chipActive : ''}`}
                onClick={() => setBonusIdx(i)}
                disabled={!canRenew}
              >
                {p.label}
              </button>
            ))}
          </div>
          {signingBonus > 0 && <span className={styles.preview}>+{formatMoney(signingBonus)} no ato</span>}
        </div>

        <div className={styles.section}>
          <span className={styles.sectionTitle}>Meta de contrato (bônus no fim da temporada)</span>
          <div className={styles.chipRow}>
            {GOAL_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                className={`${styles.chip} ${goalIdx === i ? styles.chipActive : ''}`}
                onClick={() => setGoalIdx(i)}
                disabled={!canRenew}
              >
                {p.label}
              </button>
            ))}
          </div>
          {contractGoal && (
            <span className={styles.preview}>
              🎯 {contractGoal.target} gols → {formatMoney(contractGoal.bonus)} (liga + copa)
            </span>
          )}
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Custo da renovação</span>
            <span>{formatMoney(cost)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Orçamento disponível</span>
            <span>{formatMoney(budget)}</span>
          </div>
          {overBudget && <span className={styles.warn}>Ultrapassa o orçamento disponível.</span>}
        </div>

        <div className={`${styles.response} ${styles[`resp${evaluation.reaction}`]}`}>
          {evaluation.message}
          {evaluation.reaction === 'counter' && evaluation.counter && (
            <button type="button" className={styles.counterBtn} onClick={applyCounter} disabled={!canRenew}>
              ✅ Aceitar contraproposta
            </button>
          )}
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={!canRenew || !evaluation.accepted || overBudget}
          >
            Confirmar Renovação
          </button>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}
