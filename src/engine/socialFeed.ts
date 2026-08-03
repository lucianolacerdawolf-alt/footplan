import { getAvgOvr } from '../utils/teamUtils';
import { getDerbyName } from './rivalries';
import type { Team } from './types';

// =============================================================================
// FASE 3c — FEED SOCIAL (FC HUB)
// =============================================================================
// Posts de tempero a partir do contexto (último resultado, classificação,
// contratações, dérbi). Sem efeito de jogo — só reação da torcida/imprensa.

export interface SocialPost {
  id: string;
  author: string;
  handle: string;
  content: string;
  likes: number;
}

export interface SocialFeedInput {
  userTeam: Team;
  opponentName: string;
  userPosition: number;
  totalTeams: number;
  /** Resultado do último jogo do usuário, se houver. */
  lastResult?: { userScore: number; oppScore: number };
  /** Nome do jogador mais caro contratado nesta temporada, se houver. */
  marqueeSigning?: string;
  seasonYear: number;
}

const HASHTAG = (teamName: string) => `#${teamName.replace(/\W+/g, '')}`;

/** Gera 3-4 posts de tempero determinísticos a partir do contexto. */
export function generateSocialFeed(input: SocialFeedInput): SocialPost[] {
  const posts: SocialPost[] = [];
  const tag = HASHTAG(input.userTeam.name);
  const third = Math.ceil(input.totalTeams / 3);

  // 1. Resultado do último jogo.
  if (input.lastResult) {
    const won = input.lastResult.userScore > input.lastResult.oppScore;
    const drew = input.lastResult.userScore === input.lastResult.oppScore;
    posts.push(won
      ? {
          id: 's-result-win',
          author: 'Jornal do Futebol',
          handle: '@jornalfut',
          content: `Placar da rodada: vitória tranquila do ${input.userTeam.name} por ${input.lastResult.userScore}×${input.lastResult.oppScore}. Torcida aprova! ${tag}`,
          likes: 2140,
        }
      : drew
        ? {
            id: 's-result-draw',
            author: 'Zona Mista',
            handle: '@zonamista',
            content: `Empate ${input.lastResult.userScore}×${input.lastResult.oppScore} para o ${input.userTeam.name}. Falta matar o jogo, dizem os analistas. ${tag}`,
            likes: 830,
          }
        : {
            id: 's-result-loss',
            author: 'Radar Esportivo',
            handle: '@radaresp',
            content: `Tropeço do ${input.userTeam.name}: derrota por ${input.lastResult.oppScore}×${input.lastResult.userScore}. A torcida cobra reação. ${tag}`,
            likes: 1510,
          });
  }

  // 2. Posição na tabela.
  const topThird = input.userPosition <= third;
  const bottomThird = input.userPosition > input.totalTeams - third;
  if (topThird) {
    posts.push({
      id: 's-table-top',
      author: 'Mesa Redonda',
      handle: '@mesaredonda',
      content: `O ${input.userTeam.name} está em ${input.userPosition}º lugar — dentro da zona que garante algo grande nesta temporada. ${tag}`,
      likes: 980,
    });
  } else if (bottomThird) {
    posts.push({
      id: 's-table-bottom',
      author: 'Painel da Torcida',
      handle: '@paineltorcida',
      content: `Situação delicada: ${input.userTeam.name} aparece na ${input.userPosition}ª posição. A pressão aumenta sobre o técnico. ${tag}`,
      likes: 1260,
    });
  } else {
    posts.push({
      id: 's-table-mid',
      author: 'Tabela e Contexto',
      handle: '@tabelactx',
      content: `Meio da tabela: ${input.userTeam.name} ocupa a ${input.userPosition}ª posição. Temporada de altos e baixos. ${tag}`,
      likes: 540,
    });
  }

  // 3. Contratação de destaque.
  if (input.marqueeSigning) {
    posts.push({
      id: 's-signing',
      author: 'Mercado FC',
      handle: '@mercadofc',
      content: `Chegou reforçado: ${input.marqueeSigning} é o novo reforço do ${input.userTeam.name}. Diretoria promete mais por aí. ${tag}`,
      likes: 1720,
    });
  }

  // 4. Dérbi / adversário.
  if (getDerbyName(input.userTeam.id, input.userTeam.id) === null) {
    posts.push({
      id: 's-rival',
      author: 'Clássicos',
      handle: '@classicos',
      content: `Próximo desafio do ${input.userTeam.name}: ${input.opponentName}. Força máxima para buscar os três pontos. ${tag}`,
      likes: 640,
    });
  }

  // Sempre garante pelo menos 3 posts (backfill neutro).
  while (posts.length < 3) {
    posts.push({
      id: `s-backfill-${posts.length}`,
      author: 'Comunidade do Clube',
      handle: '@comunidadefc',
      content: `Temporada ${input.seasonYear} em andamento — siga o ${input.userTeam.name} de perto. ${tag}`,
      likes: 210,
    });
  }

  return posts.slice(0, 4);
}

/** OVR médio do adversário (usado só pra contexto de elenco no feed, quando disponível). */
export function opponentAvgOvr(opponent: Team): number {
  return getAvgOvr(opponent);
}
