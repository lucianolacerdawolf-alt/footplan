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
    // Demitido sem nenhuma proposta ficava preso (só restava recomeçar do zero):
    // a última proposta não pode ser recusada enquanto ele estiver sem clube.
    if (careerState?.sacked && getJobOffers(careerState).length <= 1) {
      setToastMsg('Você está sem clube: aceite uma das propostas ou comece uma nova carreira');
      return;
    }
    setCareerState(prev => prev ? { ...prev, jobOffers: getJobOffers(prev).filter(o => o.id !== offerId) } : prev);
  }, [careerState, setCareerState, setToastMsg]);

  return {
    handleAcceptJobOffer, handleDeclineJobOffer,
  };
}
