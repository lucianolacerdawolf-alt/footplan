// =============================================================================
// SISTEMA DE COMENTÁRIOS - Variações de texto para eventos da partida
// =============================================================================

import type { Player } from './types';

function rng(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateKickoff(homeName: string, awayName: string): string {
  return rng([
    `Apito inicial! ${homeName} começa com a bola.`,
    `Começa a partida! ${homeName} troca passes no campo de defesa.`,
    `Bola rolando! ${homeName} e ${awayName} iniciam o confronto.`,
  ]);
}

export function generatePossession(teamName: string): string {
  return rng([
    `${teamName} mantém a posse de bola no meio-campo.`,
    `${teamName} troca passes com paciência.`,
    `${teamName} controla as ações no setor de meio-campo.`,
    `Posse de bola com ${teamName}, que busca espaços.`,
  ]);
}

export function generateAttack(teamName: string, attacker: Player): string {
  return rng([
    `${teamName} avança! ${attacker.name} parte para cima da defesa.`,
    `Ataque perigoso de ${teamName}! ${attacker.name} conduz a jogada.`,
    `${attacker.name} (${teamName}) acelera e leva perigo à área adversária.`,
    `${teamName} chega com perigo pelas costas da defesa!`,
  ]);
}

export function generateGoal(teamName: string, scorer: Player): string {
  return rng([
    `⚽ GOOOOOOL! ${scorer.name} marca para ${teamName}!`,
    `⚽ GOOOOOOL de ${teamName}! ${scorer.name} balança as redes!`,
    `⚽ É GOL! ${scorer.name} finaliza com precisão e abre o placar para ${teamName}!`,
    `⚽ GOLAAAAÇO! ${scorer.name} (${teamName}) não perdoa!`,
  ]);
}

export function generateMiss(teamName: string, attacker: Player): string {
  return rng([
    `${attacker.name} (${teamName}) finaliza, mas a bola vai para fora.`,
    `Chute de ${attacker.name} passa raspando a trave!`,
    `${attacker.name} arrisca de longe... por cima do gol!`,
    `Oportunidade desperdiçada! ${attacker.name} não acerta o alvo.`,
  ]);
}

export function generatePost(teamName: string, attacker: Player): string {
  return rng([
    `😱 Na trave! ${attacker.name} (${teamName}) acerta o poste!`,
    `${attacker.name} carimba a trave! Que azar de ${teamName}!`,
    `Bola no poste! ${attacker.name} quase marcou um golaço.`,
  ]);
}

export function generateSave(teamName: string, goalkeeper: Player): string {
  return rng([
    `🛡️ Defesa! ${goalkeeper.name} (${teamName}) faz grande intervenção!`,
    `${goalkeeper.name} salva ${teamName} com uma defesa espetacular!`,
    `O goleiro ${goalkeeper.name} (${teamName}) evita o gol!`,
  ]);
}

export function generateHalftime(homeScore: number, awayScore: number): string {
  const result = homeScore === awayScore
    ? `empatam em ${homeScore}x${awayScore}`
    : homeScore > awayScore
      ? `com vitória parcial do time da casa por ${homeScore}x${awayScore}`
      : `com vitória parcial do time visitante por ${awayScore}x${homeScore}`;
  return `⏸️ Fim do primeiro tempo! Times ${result}.`;
}

export function generateFulltime(
  homeName: string, awayName: string,
  homeScore: number, awayScore: number
): string {
  const result = homeScore === awayScore
    ? `Empate em ${homeScore}x${awayScore}!`
    : homeScore > awayScore
      ? `Vitória de ${homeName} por ${homeScore}x${awayScore}!`
      : `Vitória de ${awayName} por ${awayScore}x${homeScore}!`;
  return `🏁 Apito final! ${result}`;
}

export function generateSecondHalf(): string {
  return 'Começa o segundo tempo! Times voltam sem alterações.';
}
