import { useCallback } from 'react';
import { applyClubChange } from '@/engine/jobMarket';
import { getJobOffers, type CareerState } from '@/engine/career';
import type { Screen } from '@/types/navigation';

interface UseCareerJobMarketParams {
  careerState: CareerState | null;
  setCareerState: React.Dispatch<React.SetStateAction<CareerState | null>>;
  setScreen: (s: Screen) => void;
  setToastMsg: (msg: string | null) => void;
}

export function useCareerJobMarket({ careerState, setCareerState, setScreen, setToastMsg }: UseCareerJobMarketParams) {
  const handleAcceptJobOffer = useCallback((offerId: string) => {
    if (!careerState) return;
    const offer = getJobOffers(careerState).find(o => o.id === offerId);
    if (!offer) return;
    const next = applyClubChange(careerState, offer);
    if (!next) {
      setToastMsg('⚠️ Não foi possível mudar de clube agora. Tente outra oferta.');
      return;
    }
    setCareerState(next);
    setToastMsg(`🏟️ Novo desafio: você assume o ${offer.clubName}!`);
    setScreen('career-hub');
  }, [careerState, setCareerState, setScreen, setToastMsg]);

  const handleDeclineJobOffer = useCallback((offerId: string) => {
    setCareerState(prev => prev ? { ...prev, jobOffers: getJobOffers(prev).filter(o => o.id !== offerId) } : prev);
  }, [setCareerState]);

  return {
    handleAcceptJobOffer, handleDeclineJobOffer,
  };
}
