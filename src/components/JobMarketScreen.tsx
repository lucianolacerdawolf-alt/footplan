import { useState } from 'react';
import type { JobOffer } from '../engine/career';
import type { Team } from '../engine/types';
import { getLeague } from '../data/leagues';
import styles from './JobMarketScreen.module.css';

interface Props {
  offers: JobOffer[];
  reputation: number;
  currentClubName: string;
  rosters: Record<string, Team[]>;
  onAccept: (offerId: string) => void;
  onDecline: (offerId: string) => void;
  onBack: () => void;
}

export default function JobMarketScreen({ offers, reputation, currentClubName, rosters, onAccept, onDecline, onBack }: Props) {
  const [pendingOffer, setPendingOffer] = useState<JobOffer | null>(null);

  return (
    <div className={`${styles.screen} app-screen`}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack} aria-label="Voltar">
          ← Voltar
        </button>
        <div className={styles.headerTitle}>
          <h1 className={styles.title}>💼 Mercado de Treinador</h1>
          <span className={styles.subtitle}>Sua reputação: <strong>{reputation} ⭐</strong></span>
        </div>
      </header>

      {offers.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📭</div>
          <p className={styles.emptyText}>Nenhuma oferta no momento.</p>
          <p className={styles.emptyHint}>Conquiste títulos e suba sua reputação para atrair clubes maiores.</p>
        </div>
      ) : (
        <div className={styles.offerList}>
          {offers.map(offer => {
            const league = getLeague(offer.leagueId);
            const team = Object.values(rosters).flat().find(t => t.id === offer.clubId);
            return (
              <div key={offer.id} className={styles.offerCard}>
                <div className={styles.offerTop}>
                  <div className={styles.offerCrest}>
                    <img src={team?.logoUrl ?? ''} alt={offer.clubName} className={styles.crestImg} />
                  </div>
                  <div className={styles.offerInfo}>
                    <span className={styles.offerClub}>{offer.clubName}</span>
                    <span className={styles.offerLeague}>
                      {league ? `${league.flag} ${league.name}` : 'Liga desconhecida'}
                    </span>
                  </div>
                  <span className={styles.offerReq}>Exige {offer.reputationRequired} ⭐</span>
                </div>
                <div className={styles.offerActions}>
                  <button className={styles.declineBtn} onClick={() => onDecline(offer.id)}>
                    Recusar
                  </button>
                  <button className={styles.acceptBtn} onClick={() => setPendingOffer(offer)}>
                    Aceitar →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingOffer && (
        <div className={styles.overlay} onClick={() => setPendingOffer(null)} role="presentation">
          <div className={styles.modal} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="job-confirm-title">
            <div className={styles.modalIcon} aria-hidden="true">🏟️</div>
            <div className={styles.modalTitle} id="job-confirm-title">Mudar de clube?</div>
            <div className={styles.modalBody}>
              Você vai deixar o <strong>{currentClubName}</strong> para assumir o{' '}
              <strong>{pendingOffer.clubName}</strong>. Sua reputação e histórico seguem,
              mas finanças, patrocínio e objetivos da diretoria começam do zero — e a decisão
              é <strong>irreversível</strong>.
            </div>
            <div className={styles.modalActions}>
              <button className={styles.declineBtn} onClick={() => setPendingOffer(null)}>
                Cancelar
              </button>
              <button className={styles.acceptBtn} onClick={() => { setPendingOffer(null); onAccept(pendingOffer.id); }}>
                Confirmar Troca
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
