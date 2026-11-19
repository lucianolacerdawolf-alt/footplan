import type { ClubFinances } from '../engine/career';
import { formatMoney } from '../utils/formatMoney';
import styles from './FinancePanel.module.css';

interface Props {
  finances: ClubFinances;
  sponsorLabel?: string;
  sponsorName?: string;
  /** Renda de bilheteria por jogo em casa (valor fixo da liga). O valor cheio é
   *  creditado a cada partida em casa; no saldo semanal entra a estimativa
   *  (~metade dos jogos são em casa → ticketRevenue / 2). */
  ticketRevenue?: number;
  // Patrocínio (tier + próximo nível) — economia do patrocínio.
  sponsorMultiplier?: number;
  nextTierLabel?: string | null;
  nextTierReputation?: number | null;
  currentReputation?: number;
  // Elenco (patrimônio + composição).
  squadValue?: number;
  squadSize?: number;
  avgOvr?: number;
  avgAge?: number;
  /** Rodadas que faltam na liga — pra projeção do caixa no fim da temporada. */
  roundsLeft?: number;
}

export default function FinancePanel({
  finances, sponsorLabel, sponsorName, ticketRevenue,
  sponsorMultiplier, nextTierLabel, nextTierReputation, currentReputation,
  squadValue, squadSize, avgOvr, avgAge, roundsLeft,
}: Props) {
  // Bilheteria estimada por semana: ~metade dos jogos são em casa, então a renda
  // por jogo em casa contribui em média com metade do valor a cada rodada. O bloco
  // "Por jogo em casa" mostra o valor cheio creditado a cada partida em casa.
  const estWeeklyTicket = ticketRevenue != null && ticketRevenue > 0 ? Math.round(ticketRevenue / 2) : 0;
  const weeklyIncomeTotal = finances.weeklyIncome + (finances.merchRevenue ?? 0) + estWeeklyTicket;
  const opex = finances.operatingCost ?? 0;
  const net = weeklyIncomeTotal - finances.wageBill - opex;
  const cap = finances.wageCap;
  const capPct = cap ? Math.min(100, Math.round((finances.wageBill / cap) * 100)) : 0;
  const projected = roundsLeft != null ? finances.budget + net * roundsLeft : null;
  const annualWage = finances.wageBill * 52;
  const annualIncome = weeklyIncomeTotal * 52;
  const wagePctOfIncome = annualIncome > 0 ? Math.round((annualWage / annualIncome) * 100) : 0;
  const canPromote = nextTierLabel != null && nextTierReputation != null;

  return (
    <div className={styles.panel}>
      <div className={styles.topRow}>
        <div className={styles.item}>
          <span className={styles.label}>💰 Orçamento</span>
          <span className={styles.value}>{formatMoney(finances.budget)}</span>
        </div>
        <div className={styles.item}>
          <span className={styles.label}>👔 Salários</span>
          <span className={styles.value}>{formatMoney(finances.wageBill)}/sem</span>
        </div>
      </div>

      {/* Balanço semanal recorrente (não inclui bilheteria) */}
      <div className={styles.breakdown}>
        <div className={styles.sectionLabel}>Balanço semanal</div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>📋 Patrocínio{sponsorLabel ? ` (${sponsorLabel})` : ''}</span>
          <span className={styles.rowValue} style={{ color: '#0ea5e9' }}>+{formatMoney(finances.weeklyIncome)}</span>
        </div>
        {sponsorName && (
          <div className={styles.rowSub}>👕 {sponsorName}</div>
        )}
        {estWeeklyTicket > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>🎟️ Bilheteria (est.)</span>
            <span className={styles.rowValue} style={{ color: 'var(--positive)' }}>+{formatMoney(estWeeklyTicket)}</span>
          </div>
        )}
        {finances.merchRevenue != null && finances.merchRevenue > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>👕 Merchandising</span>
            <span className={styles.rowValue} style={{ color: 'var(--positive)' }}>+{formatMoney(finances.merchRevenue)}</span>
          </div>
        )}
        <div className={styles.row}>
          <span className={styles.rowLabel}>👔 Salários</span>
          <span className={styles.rowValue} style={{ color: 'var(--negative)' }}>-{formatMoney(finances.wageBill)}</span>
        </div>
        {opex > 0 && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>🏢 Estrutura e funcionários</span>
            <span className={styles.rowValue} style={{ color: 'var(--negative)' }}>-{formatMoney(opex)}</span>
          </div>
        )}
        <div className={styles.divider} />
        <div className={styles.row}>
          <span className={styles.rowLabel}>📈 Saldo Semanal</span>
          <span className={styles.rowValue} style={{ color: net >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 800 }}>
            {net >= 0 ? '+' : ''}{formatMoney(net)}
          </span>
        </div>
      </div>

      {/* Teto salarial da diretoria + projeção do caixa */}
      {(cap || projected != null) && (
        <div className={styles.breakdown}>
          <div className={styles.sectionLabel}>Diretoria</div>
          {cap ? (
            <>
              <div className={styles.row}>
                <span className={styles.rowLabel}>📏 Teto salarial</span>
                <span className={styles.rowValue}>{formatMoney(finances.wageBill)} de {formatMoney(cap)}/sem</span>
              </div>
              <div className={styles.capBar} role="progressbar" aria-valuenow={capPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Folha em ${capPct}% do teto`}>
                <div className={`${styles.capFill} ${capPct >= 95 ? styles.capDanger : capPct >= 85 ? styles.capWarn : ''}`} style={{ width: `${capPct}%` }} />
              </div>
              <div className={styles.rowSub}>
                {capPct >= 100 ? 'No limite: a diretoria veta contratações e aumentos de salário.' : `Folga de ${formatMoney(cap - finances.wageBill)}/sem pra contratar ou renovar.`}
              </div>
            </>
          ) : null}
          {projected != null && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>🔮 Caixa no fim da temporada</span>
              <span className={styles.rowValue} style={{ color: projected >= 0 ? 'var(--positive)' : 'var(--negative)', fontWeight: 800 }}>≈ {formatMoney(projected)}</span>
            </div>
          )}
          {projected != null && <div className={styles.rowSub}>Sem contar prêmios e transferências. Fechar no vermelho custa reputação.</div>}
        </div>
      )}

      {/* Bilheteria — creditada por jogo em casa, fora do saldo semanal */}
      {ticketRevenue != null && ticketRevenue > 0 && (
        <div className={styles.breakdown}>
          <div className={styles.sectionLabel}>Por jogo em casa</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>🎟️ Bilheteria</span>
            <span className={styles.rowValue} style={{ color: 'var(--positive)' }}>+{formatMoney(ticketRevenue)}</span>
          </div>
          <div className={styles.rowSub}>Valor cheio a cada jogo em casa. No saldo semanal entra a estimativa (~metade dos jogos são em casa).</div>
        </div>
      )}

      {/* Patrocínio — tier atual e caminho pro próximo nível */}
      {sponsorLabel && (
        <div className={styles.breakdown}>
          <div className={styles.sectionLabel}>Patrocínio</div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>🏷️ Tier atual</span>
            <span className={styles.rowValue}>
              {sponsorLabel}{sponsorMultiplier != null ? ` ·×${sponsorMultiplier}` : ''}
            </span>
          </div>
          {canPromote ? (
            <div className={styles.row}>
              <span className={styles.rowLabel}>⬆️ Próximo: {nextTierLabel}</span>
              <span className={styles.rowValue} style={{ color: (currentReputation ?? 0) >= (nextTierReputation ?? 0) ? 'var(--positive)' : 'var(--text-secondary)' }}>
                {currentReputation ?? 0}/{nextTierReputation} rep.
              </span>
            </div>
          ) : (
            <div className={styles.rowSub}>Nível máximo — já é o melhor patrocínio.</div>
          )}
        </div>
      )}

      {/* Elenco — patrimônio e composição */}
      {(squadValue != null || squadSize != null) && (
        <div className={styles.breakdown}>
          <div className={styles.sectionLabel}>Elenco</div>
          {squadValue != null && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>💷 Valor do elenco</span>
              <span className={styles.rowValue} style={{ color: 'var(--text-primary)' }}>{formatMoney(squadValue)}</span>
            </div>
          )}
          {squadSize != null && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>👥 Composição</span>
              <span className={styles.rowValue}>
                {squadSize} jog.{avgOvr != null ? ` · OVR elenco ${avgOvr}` : ''}{avgAge != null ? ` · ${avgAge} anos` : ''}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Salários projetados por temporada */}
      <div className={styles.breakdown}>
        <div className={styles.sectionLabel}>Salários (anual)</div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>📅 Folha anual</span>
          <span className={styles.rowValue} style={{ color: 'var(--negative)' }}>{formatMoney(annualWage)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>📊 % da renda anual</span>
          <span className={styles.rowValue} style={{ color: wagePctOfIncome > 100 ? 'var(--warning)' : 'var(--text-secondary)' }}>
            {wagePctOfIncome}%
          </span>
        </div>
      </div>
    </div>
  );
}
