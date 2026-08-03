import { getAvgOvr } from '../utils/teamUtils';
import { getDerbyName } from './rivalries';
import type { Team } from './types';

// =============================================================================
// FASE 3b — COLETIVA DE IMPRENSA
// =============================================================================
// Uma pergunta por contexto (dérbi, favorito, azarão, neutro), 2-3 respostas
// cada uma com moraleDelta aplicado via applyMoraleToTeam pelo hook.

export type PressContext = 'derby' | 'favorite' | 'underdog' | 'neutral';

export interface PressResponse {
  label: string;
  moraleDelta: number;
}

export interface PressConferenceQuestion {
  id: string;
  context: PressContext;
  question: string;
  responses: PressResponse[];
}

const QUESTIONS: Record<PressContext, Omit<PressConferenceQuestion, 'id' | 'context'>[]> = {
  derby: [
    {
      question: 'É um clássico! Como o vestiário encara a pressão de enfrentar o maior rival?',
      responses: [
        { label: 'Somos fortes e vamos dominar o jogo.', moraleDelta: 2 },
        { label: 'Respeitamos o rival, mas jogamos o nosso futebol.', moraleDelta: 0 },
        { label: 'Sem tempo pra rivalidade: é só mais um jogo.', moraleDelta: -2 },
      ],
    },
    {
      question: 'O dérbi decide muito do moral da temporada. Como você vê esse jogo?',
      responses: [
        { label: 'A torcida merece essa vitória e vamos entregar.', moraleDelta: 2 },
        { label: 'Vai ser decidido nos detalhes.', moraleDelta: 0 },
        { label: 'Um jogo vale o mesmo que qualquer outro.', moraleDelta: -2 },
      ],
    },
  ],
  favorite: [
    {
      question: 'Vocês são apontados como favoritos. Isso traz pressão extra?',
      responses: [
        { label: 'Pressão é combustível. Vamos vencer.', moraleDelta: 2 },
        { label: 'Favoritismo não ganha jogo. Respeito todos.', moraleDelta: 0 },
        { label: 'Quem tem obrigação sente o peso dela.', moraleDelta: -2 },
      ],
    },
    {
      question: 'O elenco superior ao adversário. O que pode dar errado?',
      responses: [
        { label: 'Nada — estamos prontos e confiantes.', moraleDelta: 2 },
        { label: 'Qualquer descuido pode custar caro.', moraleDelta: 0 },
        { label: 'Muito pode dar errado se não tivermos foco.', moraleDelta: -2 },
      ],
    },
  ],
  underdog: [
    {
      question: 'O adversário é mais forte no papel. Qual a estratégia?',
      responses: [
        { label: 'Eles subestimam a gente — e vão se arrepender.', moraleDelta: 2 },
        { label: 'Vamos lutar por cada bola e ver o que acontece.', moraleDelta: 0 },
        { label: 'O favoritismo deles é justificado. Será difícil.', moraleDelta: -2 },
      ],
    },
    {
      question: 'Vocês entram como azarões. Como manter o grupo unido?',
      responses: [
        { label: 'Ninguém aqui se sente inferior. Mostramos isso.', moraleDelta: 2 },
        { label: 'Jogo a jogo, sem pensar em rótulos.', moraleDelta: 0 },
        { label: 'Se a torcida não acredita, o grupo também não.', moraleDelta: -2 },
      ],
    },
  ],
  neutral: [
    {
      question: 'Como o elenco chega para o próximo confronto?',
      responses: [
        { label: 'Cheios de confiança e prontos pra vencer.', moraleDelta: 2 },
        { label: 'Focados e respeitando o adversário.', moraleDelta: 0 },
        { label: 'Com algumas dúvidas no grupo.', moraleDelta: -2 },
      ],
    },
    {
      question: 'O que o torcedor pode esperar dessa partida?',
      responses: [
        { label: 'Um time agressivo que vai buscar o gol.', moraleDelta: 2 },
        { label: 'Um jogo equilibrado, decidido no detalhe.', moraleDelta: 0 },
        { label: 'Vai depender de quem estiver melhor no dia.', moraleDelta: -2 },
      ],
    },
  ],
};

/** Determina o contexto da coletiva: dérbi > favorito/azarão por OVR médio > neutro. */
export function getPressContext(userTeam: Team, opponentTeam: Team): PressContext {
  if (getDerbyName(userTeam.id, opponentTeam.id)) return 'derby';
  const userAvg = getAvgOvr(userTeam);
  const oppAvg = getAvgOvr(opponentTeam);
  if (userAvg >= oppAvg + 3) return 'favorite';
  if (oppAvg >= userAvg + 3) return 'underdog';
  return 'neutral';
}

/** Gera 1 pergunta de coletiva por contexto. */
export function generatePressConferenceQuestion(
  userTeam: Team,
  opponentTeam: Team,
  rng: () => number = Math.random,
): PressConferenceQuestion {
  const context = getPressContext(userTeam, opponentTeam);
  const pool = QUESTIONS[context];
  const base = pool[Math.floor(rng() * pool.length)];
  return { id: `press-${context}-${Math.floor(rng() * 1e6)}`, context, ...base };
}

/** Responde a coletiva por índice; retorna a resposta (delta pra moral) ou null se inválido. */
export function respondToPressConference(question: PressConferenceQuestion, choiceIdx: number): PressResponse | null {
  return question.responses[choiceIdx] ?? null;
}
