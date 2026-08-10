import { useState, useMemo } from 'react';
import type { Team } from '../engine/types';
import type { H2HRecord } from '../hooks/useH2H';
import { FORMATION_COUNTS } from '../engine/constants';
import { FORMATION_BONUS, getTacticalHardCounter } from '../engine/matchConfig';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '../engine/types';
import { playerOvr } from '../utils/playerOvr';
import { isPlayerUnavailable } from '../engine/squadUtils';
import { useModalFocus } from '../hooks/useModalFocus';
import styles from './OpponentAnalysisModal.module.css';
import { crestSrc } from '../utils/crest';

interface Props {
  opponent: Team;
  userTeam: Team;
  h2h: H2HRecord | null;
  onClose: () => void;
}

const OVR_TIERS: Array<{ min: number; label: string; cls: string }> = [
  { min: 85, label: 'Elite', cls: styles.tierElite },
  { min: 78, label: 'Bom', cls: styles.tierGood },
  { min: 70, label: 'Médio', cls: styles.tierAvg },
  { min: 0, label: 'Fraco', cls: styles.tierWeak },
];

function getOvrTier(ovr: number) {
  return OVR_TIERS.find(t => ovr >= t.min) ?? OVR_TIERS[OVR_TIERS.length - 1];
}

function avgOvr(team: Team): number {
  if (team.squad.length === 0) return 0;
  return Math.round(team.squad.reduce((s, p) => s + playerOvr(p), 0) / team.squad.length);
}

export default function OpponentAnalysisModal({ opponent, userTeam, h2h, onClose }: Props) {
  const [tab, setTab] = useState<'visao-geral' | 'elenco' | 'tatica'>('visao-geral');
  const modalRef = useModalFocus<HTMLDivElement>(true, onClose);
  const ovr = avgOvr(opponent);
  const tier = getOvrTier(ovr);

  const topPlayers = useMemo(() =>
    [...opponent.squad]
      .sort((a, b) => playerOvr(b) - playerOvr(a))
      .slice(0, 3),
    [opponent.squad]
  );

  const unavailable = opponent.squad.filter(isPlayerUnavailable);
  const tired = opponent.squad.filter(p => p.currentFatigue > 70);

  const formationCounts = FORMATION_COUNTS[opponent.strategy.formation];
  const formationBonus = FORMATION_BONUS[opponent.strategy.formation];

  const counter = getTacticalHardCounter(
    userTeam.strategy.mentality, userTeam.strategy.defensiveLine,
    opponent.strategy.mentality, opponent.strategy.defensiveLine,
  );

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div ref={modalRef} className={styles.card} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="opp-analysis-title">
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar">✕</button>

        <div className={styles.header}>
          <img src={crestSrc(opponent.logoUrl)} alt="" className={styles.crest} />
          <div id="opp-analysis-title">
            <div className={styles.teamName} style={{ color: opponent.color }}>{opponent.name}</div>
            <div className={styles.teamOvr}>
              OVR médio <span className={tier.cls}>{ovr}</span> · {tier.label}
            </div>
          </div>
        </div>

        <div className={styles.tabs}>
          {(['visao-geral', 'elenco', 'tatica'] as const).map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.active : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'visao-geral' ? 'Visão Geral' : t === 'elenco' ? 'Elenco' : 'Tática'}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {tab === 'visao-geral' && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Formação Base</div>
                <div className={styles.formationDisplay}>
                  <span className={styles.formationName}>{opponent.strategy.formation}</span>
                  <span className={styles.formationCounts}>
                    {formationCounts.DEF} DEF · {formationCounts.MID} MID · {formationCounts.FWD} FWD
                  </span>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Perfil Tático</div>
                <div className={styles.tacticGrid}>
                  <div className={styles.tacticItem}>
                    <span className={styles.tacticLabel}>Mentalidade</span>
                    <span className={styles.tacticValue}>{MENTALITY_LABELS[opponent.strategy.mentality]}</span>
                  </div>
                  <div className={styles.tacticItem}>
                    <span className={styles.tacticLabel}>Intensidade</span>
                    <span className={styles.tacticValue}>{INTENSITY_LABELS[opponent.strategy.intensity]}</span>
                  </div>
                  <div className={styles.tacticItem}>
                    <span className={styles.tacticLabel}>Linha Defensiva</span>
                    <span className={styles.tacticValue}>{DEFENSIVE_LINE_LABELS[opponent.strategy.defensiveLine]}</span>
                  </div>
                  <div className={styles.tacticItem}>
                    <span className={styles.tacticLabel}>Amplitude</span>
                    <span className={styles.tacticValue}>{WIDTH_LABELS[opponent.strategy.width]}</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Forças e Fraquezas</div>
                <div className={styles.statsRow}>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Ataque</div>
                    <div className={styles.statBar}>
                      <div className={styles.statFill} style={{ width: `${Math.round(formationBonus.atk * 100)}%`, background: formationBonus.atk >= 1.05 ? 'var(--positive)' : formationBonus.atk >= 0.95 ? '#eab308' : 'var(--negative)' }} />
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Defesa</div>
                    <div className={styles.statBar}>
                      <div className={styles.statFill} style={{ width: `${Math.round(formationBonus.def * 100)}%`, background: formationBonus.def >= 1.05 ? 'var(--positive)' : formationBonus.def >= 0.95 ? '#eab308' : 'var(--negative)' }} />
                    </div>
                  </div>
                  <div className={styles.statCard}>
                    <div className={styles.statLabel}>Posse</div>
                    <div className={styles.statBar}>
                      <div className={styles.statFill} style={{ width: `${Math.round(formationBonus.possession * 100)}%`, background: formationBonus.possession >= 1.05 ? 'var(--positive)' : formationBonus.possession >= 0.95 ? '#eab308' : 'var(--negative)' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Recomendação Tática</div>
                <div className={styles.recommendation}>
                  {counter.atkBonus > 1 ? (
                    <p>💪 <strong>Sua tática atual tem vantagem</strong> sobre a defesa adversária (+{Math.round((counter.atkBonus - 1) * 100)}% ataque). Mantenha ou reforce o ataque.</p>
                  ) : counter.defBonus > 1 ? (
                    <p>🛡️ <strong>Adversário neutraliza seu ataque</strong> — sua retranca segura o jogo (+{Math.round((counter.defBonus - 1) * 100)}% defesa).</p>
                  ) : opponent.strategy.defensiveLine === 'high' ? (
                    <p>🏃 O adversário usa <strong>linha alta</strong>. Tente mudar para <strong>contra-ataque</strong> pra explorar o espaço nas costas.</p>
                  ) : opponent.strategy.mentality === 'high-press' ? (
                    <p>⚡ O adversário faz <strong>pressão alta</strong>. Use <strong>posse de bola</strong> ou jogue <strong>pelas laterais</strong> pra escapar.</p>
                  ) : opponent.strategy.mentality === 'defensive' ? (
                    <p>🧱 Adversário <strong>retranqueiro</strong>. Aumente a <strong>amplitude</strong> e use <strong>pressão alta</strong> pra forçar erros.</p>
                  ) : (
                    <p>⚖️ Confronto equilibrado. Ajustes finos de <strong>intensidade</strong> e <strong>linha defensiva</strong> farão a diferença.</p>
                  )}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Jogadores-Chave</div>
                <div className={styles.keyPlayers}>
                  {topPlayers.map(p => (
                    <div key={p.id} className={styles.keyPlayer}>
                      <span className={styles.keyPlayerPos}>{p.position}</span>
                      <span className={styles.keyPlayerName}>{p.name}</span>
                      <span className={`${styles.keyPlayerOvr} ${getOvrTier(playerOvr(p)).cls}`}>{playerOvr(p)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Condição do Elenco</div>
                <div className={styles.conditionGrid}>
                  <div className={`${styles.conditionCard} ${unavailable.length > 0 ? styles.conditionBad : styles.conditionGood}`}>
                    <span className={styles.conditionIcon}>🚫</span>
                    <span className={styles.conditionNum}>{unavailable.length}</span>
                    <span className={styles.conditionDesc}>indisponível{unavailable.length !== 1 ? 'eis' : ''}</span>
                  </div>
                  <div className={`${styles.conditionCard} ${tired.length > 0 ? styles.conditionWarn : styles.conditionGood}`}>
                    <span className={styles.conditionIcon}>😓</span>
                    <span className={styles.conditionNum}>{tired.length}</span>
                    <span className={styles.conditionDesc}>cansado{tired.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              {h2h && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Histórico de Confrontos</div>
                  <div className={styles.h2hGrid}>
                    <div className={styles.h2hCard}><span className={styles.h2hNum} style={{ color: 'var(--positive)' }}>{h2h.wins}</span><span className={styles.h2hLabel}>Vitórias</span></div>
                    <div className={styles.h2hCard}><span className={styles.h2hNum} style={{ color: '#eab308' }}>{h2h.draws}</span><span className={styles.h2hLabel}>Empates</span></div>
                    <div className={styles.h2hCard}><span className={styles.h2hNum} style={{ color: 'var(--negative)' }}>{h2h.losses}</span><span className={styles.h2hLabel}>Derrotas</span></div>
                  </div>
                  {h2h.log && h2h.log.length > 0 && (
                    <div className={styles.h2hLog}>
                      {h2h.log.map((m, i) => (
                        <span key={i} className={`${styles.h2hPill} ${m.result === 'W' ? styles.h2hWin : m.result === 'D' ? styles.h2hDraw : styles.h2hLoss}`}>
                          {m.gf}–{m.ga}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'elenco' && (
            <div className={styles.squadList}>
              {[...opponent.squad]
                .sort((a, b) => playerOvr(b) - playerOvr(a))
                .map((p, i) => {
                  const unavail = isPlayerUnavailable(p);
                  return (
                    <div key={p.id} className={`${styles.squadRow} ${unavail ? styles.squadUnavail : ''}`}>
                      <span className={styles.squadIdx}>{i + 1}</span>
                      <span className={styles.squadPos}>{p.position}</span>
                      <span className={styles.squadName}>{p.name}</span>
                      <span className={`${styles.squadOvr} ${getOvrTier(playerOvr(p)).cls}`}>{playerOvr(p)}</span>
                      {p.currentFatigue > 50 && <span className={styles.squadTag}>😓 {p.currentFatigue}%</span>}
                      {p.injuredRounds && p.injuredRounds > 0 && <span className={styles.squadTag}>🤕 {p.injuredRounds}j</span>}
                      {p.isSuspended && <span className={styles.squadTag}>⛔ suspenso</span>}
                    </div>
                  );
                })}
            </div>
          )}

          {tab === 'tatica' && (
            <>
              <div className={styles.section}>
                <div className={styles.sectionTitle}>Formação {opponent.strategy.formation}</div>
                <div className={styles.pitchPreview}>
                  {Array.from({ length: 11 }, (_, i) => {
                    let pos: string;
                    let row: number;
                    let col: number;
                    const gk = i === 0;
                    if (gk) { pos = '🧤'; row = 90; col = 50; }
                    else if (i <= formationCounts.DEF) { pos = '🛡️'; row = 68; col = (i - 1) / (formationCounts.DEF - 1) * 80 + 10; }
                    else if (i <= formationCounts.DEF + formationCounts.MID) { pos = '⚙️'; row = 40; col = (i - 1 - formationCounts.DEF) / (formationCounts.MID - 1) * 80 + 10; }
                    else { pos = '⚽'; row = 12; col = (i - 1 - formationCounts.DEF - formationCounts.MID) / (formationCounts.FWD - 1) * 80 + 10; }
                    return <span key={i} className={styles.pitchDot} style={{ top: `${row}%`, left: `${col}%` }} title={`Jogador ${i + 1}`}>{pos}</span>;
                  })}
                  <div className={styles.pitchField}>
                    <span className={styles.pitchLabel}>⚽ ATaque →</span>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Comparação de Formações</div>
                <div className={styles.comparisonTable}>
                  <div className={styles.compHeader}>
                    <span className={styles.compEmpty} />
                    <span className={styles.compCol}>Você<br/>{userTeam.strategy.formation}</span>
                    <span className={styles.compCol}>Oponente<br/>{opponent.strategy.formation}</span>
                  </div>
                  {(['atk', 'def', 'possession'] as const).map(stat => {
                    const userVal = FORMATION_BONUS[userTeam.strategy.formation][stat];
                    const oppVal = FORMATION_BONUS[opponent.strategy.formation][stat];
                    const label = stat === 'atk' ? 'Ataque' : stat === 'def' ? 'Defesa' : 'Posse';
                    return (
                      <div key={stat} className={styles.compRow}>
                        <span className={styles.compLabel}>{label}</span>
                        <span className={`${styles.compVal} ${userVal >= oppVal ? styles.compBetter : styles.compWorse}`}>
                          {Math.round(userVal * 100)}%
                        </span>
                        <span className={`${styles.compVal} ${oppVal >= userVal ? styles.compBetter : styles.compWorse}`}>
                          {Math.round(oppVal * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {counter.atkBonus > 1 && (
                <div className={styles.section}>
                  <div className={styles.sectionTitle}>Contra-Tática Efetiva</div>
                  <div className={styles.recommendation}>
                    <p>💪 Seu <strong>{MENTALITY_LABELS[userTeam.strategy.mentality]}</strong> com linha <strong>{DEFENSIVE_LINE_LABELS[userTeam.strategy.defensiveLine]}</strong> tem <strong>+{Math.round((counter.atkBonus - 1) * 100)}% de ataque</strong> contra {MENTALITY_LABELS[opponent.strategy.mentality]} do oponente.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
