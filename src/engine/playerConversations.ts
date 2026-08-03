import type { Player, Team } from './types';
import {
  getContractSeasonsLeft, getPlayerConversations, getTransferList,
  type CareerState, type ConversationTopic, type PlayerConversation,
} from './career';
import { getStarters, isPlayerUnavailable } from './squadUtils';
import { playerOvr } from '../utils/playerOvr';
import { getDerbyName } from './rivalries';
import { shuffle } from './rng';

// =============================================================================
// FASE 4 — CONVERSAS COM ATLETAS
// =============================================================================
// 0-1 conversa por rodada a partir de sinais que já existem no estado da
// carreira (titular alto-OVR fora do XI, lista de venda, contrato ≤1, derrota
// pesada/dérbi). Ao responder, cada tópico tem 2-3 respostas com moraleDelta
// aplicado via applyMoraleToTeam no hook.

/** OVR mínimo de um "titular alto-OVR" que pode reclamar de estar no banco. */
const BENCH_OVR_THRESHOLD = 78;

/** Conversa que gera um novo vínculo. */
export interface ConversationResponse {
  label: string;
  moraleDelta: number;
}

/** Contexto de geração — sinais de onde olhar e em que rodada/temporada. */
export interface ConversationContext {
  seasonYear: number;
  round: number;
  /** Resultado do último jogo do usuário (liga), se houver. */
  lastResult?: { userScore: number; oppScore: number; opponentId: string };
  /** Força geração mesmo sem sinal estrutural (pós-jogo). */
  force?: boolean;
}

/** Mensagens faladas pelo atleta, por tópico. {player} é interpolado no nome. */
const TOPIC_MESSAGES: Record<ConversationTopic, string[]> = {
  bench: [
    'Trabalho duro todo dia e ainda assim fico fora do time titular, {player}. Quero uma chance de mostrar meu valor.',
    'Meu OVR é dos melhores do elenco, {player}. Por que sigo no banco?',
    'Sei que posso contribuir mais do que estou mostrando, {player}. Me bota pra jogar.',
  ],
  form: [
    'Depois desse resultado, o clima no vestiário tá pesado. O grupo precisa de uma resposta.',
    'Essa sequência tá ruim e a torcida tá cobrando. Vamos reagir, treinador.',
    'O time não tá rendendo o que deveria. Alguma coisa precisa mudar.',
  ],
  praise: [
    'Que fase, treinador! O time tá voando e a torcida tá empolgada. Vamos manter isso!',
    'Grande jogo do elenco. Se continuar assim, a gente briga pelo título!',
    'O vestiário tá com moral lá em cima. Esse é o caminho, professor!',
  ],
  'transfer-listed': [
    'Ouvi dizer que meu nome tá na lista de transferências. É verdade, treinador?',
    'Fui colocado à venda sem ninguém me avisar. Quero entender o que tá acontecendo.',
    'Se não contam mais comigo, prefiro saber logo pra planejar meu futuro.',
  ],
  contract: [
    'Meu contrato tá chegando ao fim. O clube já pensou em renovar, treinador?',
    'Queria saber se ainda fazem planos pra mim na próxima temporada.',
    'Preciso de uma definição sobre meu futuro aqui no clube.',
  ],
};

/** Respostas possíveis do treinador por tópico — apoiar +2, honesto 0, duro -2. */
export const CONVERSATION_RESPONSES: Record<ConversationTopic, ConversationResponse[]> = {
  bench: [
    { label: 'Você vai ter suas chances. Continue treinando forte.', moraleDelta: 2 },
    { label: 'Vou te observar no próximo jogo e decidir depois.', moraleDelta: 0 },
    { label: 'Quem joga é quem mais merece. Prove que você merece.', moraleDelta: -2 },
  ],
  form: [
    { label: 'Vamos sair dessa juntos. Acredito no elenco.', moraleDelta: 2 },
    { label: 'Sem pânico. Foco no próximo jogo e tudo se resolve.', moraleDelta: 0 },
    { label: 'O resultado fala por si. Melhorem ou mudanças vêm.', moraleDelta: -2 },
  ],
  praise: [
    { label: 'Continue assim, você está voando!', moraleDelta: 2 },
    { label: 'Elogio não ganha título. Foco no que vem pela frente.', moraleDelta: 0 },
    { label: 'Não se empolga, que a temporada é longa.', moraleDelta: -2 },
  ],
  'transfer-listed': [
    { label: 'Esquece isso, você fica. Tirei você da lista.', moraleDelta: 2 },
    { label: 'O mercado tá de olho, mas nada decidido ainda.', moraleDelta: 0 },
    { label: 'Se quer sair, terá que mostrar serviço até lá.', moraleDelta: -2 },
  ],
  contract: [
    { label: 'Vou conversar com a diretoria. Você fica.', moraleDelta: 2 },
    { label: 'Estamos avaliando o elenco pra próxima temporada.', moraleDelta: 0 },
    { label: 'Contrato é contrato. Mostre valor pra ganhar a renovação.', moraleDelta: -2 },
  ],
};

function pickMessage(topic: ConversationTopic, playerName: string, rng: () => number): string {
  const pool = TOPIC_MESSAGES[topic];
  const raw = pool[Math.floor(rng() * pool.length)];
  return raw.replaceAll('{player}', playerName);
}

/** Jogador não lesionado/suspenso com OVR mínimo (elegível pra reclamar). */
function availableHighOvr(player: Player): boolean {
  return !isPlayerUnavailable(player) && playerOvr(player) >= BENCH_OVR_THRESHOLD;
}

/**
 * Sinais estruturais (não precisam de resultado): titular alto-OVR no banco,
 * jogador na lista de venda, contrato ≤1 temporada. Retorna um (atleta, tópico)
 * ou null se nenhum sinal existe no elenco atual.
 */
function structuralTrigger(userTeam: Team, state: CareerState, rng: () => number): { player: Player; topic: ConversationTopic } | null {
  const starterIds = new Set(getStarters(userTeam).map(p => p.id));
  const transferList = new Set(getTransferList(state));

  const bench = userTeam.squad.filter(p => !starterIds.has(p.id) && availableHighOvr(p));
  const listed = userTeam.squad.filter(p => transferList.has(p.id) && !isPlayerUnavailable(p));
  const expiring = userTeam.squad.filter(p => getContractSeasonsLeft(p) <= 1 && !isPlayerUnavailable(p));

  const options: Array<{ player: Player; topic: ConversationTopic }> = [];
  if (bench.length > 0) options.push({ player: shuffle(bench, rng)[0], topic: 'bench' });
  if (listed.length > 0) options.push({ player: shuffle(listed, rng)[0], topic: 'transfer-listed' });
  if (expiring.length > 0) options.push({ player: shuffle(expiring, rng)[0], topic: 'contract' });
  if (options.length === 0) return null;
  return options[Math.floor(rng() * options.length)];
}

/**
 * Escolhe o atleta que abre a conversa: prefere um titular (não-GK) de maior OVR
 * — é quem costuma reclamar de fase/banco. Fallback: qualquer jogador disponível.
 */
function pickSpeaker(userTeam: Team, rng: () => number): Player {
  const starters = getStarters(userTeam).filter(p => p.position !== 'GK' && !isPlayerUnavailable(p));
  if (starters.length === 0) return shuffle(userTeam.squad.filter(p => !isPlayerUnavailable(p)), rng)[0];
  return shuffle(starters, rng).sort((a, b) => playerOvr(b) - playerOvr(a))[0];
}

/**
 * Gera 0-1 conversa para a rodada. Prioridade:
 *  1. Resultado recente — dérbi perdido ou derrota pesada (≥2 de margem) → 'form';
 *     vitória por ≥2 → 'praise'. O post-match sempre pode gerar (force).
 *  2. Sinais estruturais (banco/lista/contrato) — 45% de chance por rodada.
 * Nunca gera 2 conversas na mesma rodada: verifica getPlayerConversations.
 */
export function maybeGenerateConversation(
  state: CareerState,
  ctx: ConversationContext,
  rng: () => number = Math.random,
): PlayerConversation | null {
  const userTeam = state.rosters[state.leagueId]?.find(t => t.id === state.season.league.userTeamId);
  if (!userTeam) return null;
  // Compat de save: getter com backfill; nunca acessa o campo direto.
  if (getPlayerConversations(state).some(c => c.round === ctx.round && !c.responded)) return null;

  const last = ctx.lastResult;

  if (last) {
    const derbyName = getDerbyName(userTeam.id, last.opponentId);
    const margin = last.userScore - last.oppScore;
    const isDerbyLoss = !!derbyName && margin < 0;
    const heavyLoss = margin <= -2;
    const bigWin = margin >= 2;
    const topic: ConversationTopic | null = isDerbyLoss || heavyLoss ? 'form'
      : bigWin ? 'praise'
      : null;
    if (topic) {
      const speaker = pickSpeaker(userTeam, rng);
      return {
        id: `conv-${ctx.seasonYear}-${ctx.round}-${speaker.id}-${Math.floor(rng() * 1e6)}`,
        playerId: speaker.id,
        playerName: speaker.name,
        topic,
        message: pickMessage(topic, speaker.name, rng),
        seasonYear: ctx.seasonYear,
        round: ctx.round,
        responded: false,
      };
    }
  }

  if (ctx.force || rng() < 0.45) {
    const trigger = structuralTrigger(userTeam, state, rng);
    if (trigger) {
      return {
        id: `conv-${ctx.seasonYear}-${ctx.round}-${trigger.player.id}-${Math.floor(rng() * 1e6)}`,
        playerId: trigger.player.id,
        playerName: trigger.player.name,
        topic: trigger.topic,
        message: pickMessage(trigger.topic, trigger.player.name, rng),
        seasonYear: ctx.seasonYear,
        round: ctx.round,
        responded: false,
      };
    }
  }

  return null;
}

/** Responde uma conversa por índice de escolha; retorna a resposta (delta pra moral) ou null se inválido. */
export function respondToConversation(conv: PlayerConversation, choiceIdx: number): ConversationResponse | null {
  const options = CONVERSATION_RESPONSES[conv.topic];
  return options[choiceIdx] ?? null;
}
