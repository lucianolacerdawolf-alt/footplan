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
  /** 'bold' = promete vitória (cobrada no resultado), 'calm' = +1 confiança da diretoria,
   *  'shield' = tira a pressão (derrota pesa metade na diretoria). */
  stance?: 'bold' | 'calm' | 'shield';
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
        { label: 'Sem tempo pra rivalidade: é só mais um jogo.', moraleDelta: -1 },
      ],
    },
    {
      question: 'O dérbi decide muito do moral da temporada. Como você vê esse jogo?',
      responses: [
        { label: 'A torcida merece essa vitória e vamos entregar.', moraleDelta: 2 },
        { label: 'Vai ser decidido nos detalhes.', moraleDelta: 0 },
        { label: 'Um jogo vale o mesmo que qualquer outro.', moraleDelta: -1 },
      ],
    },
  ],
  favorite: [
    {
      question: 'Vocês são apontados como favoritos. Isso traz pressão extra?',
      responses: [
        { label: 'Pressão é combustível. Vamos vencer.', moraleDelta: 2 },
        { label: 'Favoritismo não ganha jogo. Respeito todos.', moraleDelta: 0 },
        { label: 'Quem tem obrigação sente o peso dela.', moraleDelta: -1 },
      ],
    },
    {
      question: 'O elenco superior ao adversário. O que pode dar errado?',
      responses: [
        { label: 'Nada — estamos prontos e confiantes.', moraleDelta: 2 },
        { label: 'Qualquer descuido pode custar caro.', moraleDelta: 0 },
        { label: 'Muito pode dar errado se não tivermos foco.', moraleDelta: -1 },
      ],
    },
  ],
  underdog: [
    {
      question: 'O adversário é mais forte no papel. Qual a estratégia?',
      responses: [
        { label: 'Eles subestimam a gente — e vão se arrepender.', moraleDelta: 2 },
        { label: 'Vamos lutar por cada bola e ver o que acontece.', moraleDelta: 0 },
        { label: 'O favoritismo deles é justificado. Será difícil.', moraleDelta: -1 },
      ],
    },
    {
      question: 'Vocês entram como azarões. Como manter o grupo unido?',
      responses: [
        { label: 'Ninguém aqui se sente inferior. Mostramos isso.', moraleDelta: 2 },
        { label: 'Jogo a jogo, sem pensar em rótulos.', moraleDelta: 0 },
        { label: 'Se a torcida não acredita, o grupo também não.', moraleDelta: -1 },
      ],
    },
  ],
  neutral: [
    {
      question: 'Como o elenco chega para o próximo confronto?',
      responses: [
        { label: 'Cheios de confiança e prontos pra vencer.', moraleDelta: 2 },
        { label: 'Focados e respeitando o adversário.', moraleDelta: 0 },
        { label: 'Com algumas dúvidas no grupo.', moraleDelta: -1 },
      ],
    },
    {
      question: 'O que o torcedor pode esperar dessa partida?',
      responses: [
        { label: 'Um time agressivo que vai buscar o gol.', moraleDelta: 2 },
        { label: 'Um jogo equilibrado, decidido no detalhe.', moraleDelta: 0 },
        { label: 'Vai depender de quem estiver melhor no dia.', moraleDelta: -1 },
      ],
    },
  ],
};

/** Pergunta extra dos jogos grandes (dérbi, mata-mata, confronto direto no topo). */
const BIG_GAME: Omit<PressConferenceQuestion, 'id' | 'context'>[] = [
  {
    question: 'A diretoria e a torcida esperam muito deste jogo. Qual é o seu recado?',
    responses: [
      { label: 'Pode escrever: vamos ganhar.', moraleDelta: 2 },
      { label: 'Estamos preparados. O resto se resolve em campo.', moraleDelta: 0 },
      { label: 'Ninguém aqui tem obrigação de nada.', moraleDelta: -1 },
    ],
  },
  {
    question: 'Um resultado ruim hoje coloca o seu cargo em risco?',
    responses: [
      { label: 'Não vai ter resultado ruim.', moraleDelta: 2 },
      { label: 'Meu trabalho se mede pela temporada inteira.', moraleDelta: 0 },
      { label: 'Quem decide isso é a diretoria, não eu.', moraleDelta: -1 },
    ],
  },
  {
    question: 'Qual é a chave para vencer um jogo deste tamanho?',
    responses: [
      { label: 'Atitude. Vamos pra cima desde o primeiro minuto.', moraleDelta: 2 },
      { label: 'Paciência e concentração nos detalhes.', moraleDelta: 0 },
      { label: 'Sobreviver aos primeiros minutos, depois a gente vê.', moraleDelta: -1 },
    ],
  },
];

const STANCES = ['bold', 'calm', 'shield'] as const;
/** As respostas seguem sempre a mesma ordem: ousada, equilibrada, cautelosa. */
function withStances(base: Omit<PressConferenceQuestion, 'id' | 'context'>): Omit<PressConferenceQuestion, 'id' | 'context'> {
  return { ...base, responses: base.responses.map((r, i) => ({ ...r, stance: STANCES[i] })) };
}

/** Texto curto do efeito de uma resposta, pra mostrar no botão. */
export function responseEffectLabel(r: PressResponse): string {
  const moral = `${r.moraleDelta > 0 ? '+' : ''}${r.moraleDelta} moral`;
  if (r.stance === 'bold') return `${moral} · promete vitória`;
  if (r.stance === 'calm') return `${moral} · +1 diretoria`;
  if (r.stance === 'shield') return `${moral} · tira a pressão`;
  return moral;
}

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
  const base = withStances(pool[Math.floor(rng() * pool.length)]);
  return { id: `press-${context}-${Math.floor(rng() * 1e6)}`, context, ...base };
}

/** Coletiva completa: 1 pergunta, ou 2 em jogo grande (a 2ª vem do bloco de jogos grandes). */
export function generatePressConference(
  userTeam: Team,
  opponentTeam: Team,
  opts: { bigGame?: boolean } = {},
  rng: () => number = Math.random,
): PressConferenceQuestion[] {
  const first = generatePressConferenceQuestion(userTeam, opponentTeam, rng);
  if (!opts.bigGame) return [first];
  const extra = withStances(BIG_GAME[Math.floor(rng() * BIG_GAME.length)]);
  return [first, { id: `press-big-${Math.floor(rng() * 1e6)}`, context: first.context, ...extra }];
}

/** Responde a coletiva por índice; retorna a resposta (delta pra moral) ou null se inválido. */
export function respondToPressConference(question: PressConferenceQuestion, choiceIdx: number): PressResponse | null {
  return question.responses[choiceIdx] ?? null;
}
