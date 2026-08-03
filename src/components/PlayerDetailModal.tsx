import type { Player } from '../engine/types';
import { playerOvr } from '../utils/playerOvr';
import { calculateMarketValue, calculateWeeklyWage } from '../engine/transferMarket';
import { formatMoney } from '../utils/formatMoney';
import { countryFlagEmoji } from '../utils/countryFlags';
import { useModalFocus } from '../hooks/useModalFocus';
import styles from './PlayerDetailModal.module.css';

interface Props {
  player: Player;
  teamName?: string;
  leagueFlag?: string;
  onClose: () => void;
}

const POSITION_LABELS: Record<Player['position'], string> = {
  GK: 'Goleiro', DEF: 'Zagueiro/Lateral', MID: 'Meio-Campo', FWD: 'Atacante',
};

/** Cada bloco de atributo mostrado no modal — agrupamento temático dos 8 atributos
 *  brutos do motor (não são as sub-categorias do FIFA/EA FC, que tem stats que o
 *  FootPlan não modela, tipo "Curva" ou "Reação" separado de "Controle de bola"). */
const ATTRIBUTE_GROUPS: Array<{ label: string; key: keyof Player['attributes'] }> = [
  { label: 'Velocidade', key: 'speed' },
  { label: 'Finalização', key: 'finishing' },
  { label: 'Passe', key: 'passing' },
  { label: 'Drible', key: 'dribbling' },
  { label: 'Desarme', key: 'tackling' },
  { label: 'Posicionamento', key: 'positioning' },
  { label: 'Visão', key: 'vision' },
  { label: 'Resistência', key: 'stamina' },
];

function tierClass(value: number): string {
  if (value >= 85) return styles.tierElite;
  if (value >= 75) return styles.tierGood;
  if (value >= 60) return styles.tierAvg;
  return styles.tierWeak;
}

export default function PlayerDetailModal({ player, teamName, leagueFlag, onClose }: Props) {
  const ovr = playerOvr(player);
  const marketValue = player.marketValue ?? calculateMarketValue(player);
  const weeklyWage = player.weeklyWage ?? calculateWeeklyWage(marketValue);
  const modalRef = useModalFocus<HTMLDivElement>(true, onClose);

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div ref={modalRef} className={styles.card} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="player-modal-name">
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">✕</button>

        <div className={styles.header}>
          <div className={`${styles.ovrBadge} ${tierClass(ovr)}`}>
            <span className={styles.ovrNumber}>{ovr}</span>
            <span className={styles.ovrLabel}>{player.position}</span>
          </div>
          <div className={styles.headerInfo}>
            <div className={styles.name} id="player-modal-name">
              {player.nationality && (
                <span className={styles.nameFlag} title={player.nationality}>
                  {countryFlagEmoji(player.nationality) ?? '🌍'}
                </span>
              )}
              {player.name}
            </div>
            <div className={styles.subtitle}>
              <span>#{player.number}</span>
              <span>{POSITION_LABELS[player.position]}</span>
              {player.age !== undefined && <span>{player.age} anos</span>}
              {player.nationality && <span>{player.nationality}</span>}
            </div>
            {teamName && <div className={styles.teamName}>{leagueFlag ? `${leagueFlag} ` : ''}{teamName}</div>}
          </div>
        </div>

        <div className={styles.attrGrid}>
          {ATTRIBUTE_GROUPS.map(({ label, key }) => {
            // Math.round defensivo — os 8 atributos são sempre inteiros por convenção em
            // todo o resto do jogo; arredonda aqui também caso algum dado antigo (de antes
            // de um fix na geração) ainda tenha vazado casas decimais.
            const value = Math.round(player.attributes[key]);
            return (
              <div key={key} className={styles.attrCell}>
                <span className={`${styles.attrValue} ${tierClass(value)}`}>{value}</span>
                <span className={styles.attrLabel}>{label}</span>
              </div>
            );
          })}
        </div>

        <div className={styles.financeRow}>
          <div className={styles.financeItem}>
            <span className={styles.financeLabel}>Valor de Mercado</span>
            <span className={styles.financeValue}>{formatMoney(marketValue)}</span>
          </div>
          <div className={styles.financeItem}>
            <span className={styles.financeLabel}>Salário Semanal</span>
            <span className={styles.financeValue}>{formatMoney(weeklyWage)}</span>
          </div>
        </div>

        {(player.isSuspended || (player.injuredRounds ?? 0) > 0) && (
          <div className={styles.statusBanner}>
            {player.isSuspended && '🟥 Suspenso'}
            {player.isSuspended && (player.injuredRounds ?? 0) > 0 && ' · '}
            {(player.injuredRounds ?? 0) > 0 && `🤕 Lesionado (${player.injuredRounds} rodada${(player.injuredRounds ?? 0) > 1 ? 's' : ''})`}
          </div>
        )}
      </div>
    </div>
  );
}
