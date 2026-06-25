import type { Player, RandomFn } from './types';

// rng default usa Math.random, mas aceita RandomFn injetada (testes determinísticos).
function rng(arr: string[], random: RandomFn = Math.random): string {
  return arr[Math.floor(random() * arr.length)];
}

// =============================================================================
// Kickoff / Halftime / Fulltime
// =============================================================================

export function generateKickoff(homeName: string, awayName: string): string {
  return rng([
    `Apito inicial! ${homeName} começa com a bola.`,
    `Começa a partida! ${homeName} troca passes no campo de defesa.`,
    `Bola rolando! ${homeName} e ${awayName} iniciam o confronto.`,
  ]);
}

export function generateSecondHalf(): string {
  return rng([
    'Começa o segundo tempo! Times voltam sem alterações.',
    'Bola rolando para a etapa final!',
    'Segundo tempo iniciado. Quem leva a melhor?',
  ]);
}

export function generateHalftime(homeScore: number, awayScore: number): string {
  const result = homeScore === awayScore
    ? `empatam em ${homeScore}x${awayScore}`
    : homeScore > awayScore
      ? `com vantagem do mandante por ${homeScore}x${awayScore}`
      : `com vantagem do visitante por ${awayScore}x${homeScore}`;
  return `⏸️ Fim do primeiro tempo! Times ${result}.`;
}

export function generateFulltime(
  homeName: string, awayName: string,
  homeScore: number, awayScore: number
): string {
  const result = homeScore === awayScore
    ? `Empate em ${homeScore}x${homeScore}!`
    : homeScore > awayScore
      ? `Vitória de ${homeName} por ${homeScore}x${awayScore}!`
      : `Vitória de ${awayName} por ${awayScore}x${homeScore}!`;
  return `🏁 Apito final! ${result}`;
}

export function generateExtraTimeKickoff(): string {
  return rng([
    '⏰ Prorrogação! Mais 30 minutos para decidir o classificado.',
    '⏰ Empate no tempo normal — bola rolando para a prorrogação!',
    '⏰ Nervos à flor da pele! Começa a prorrogação.',
  ]);
}

export function generateExtraTimeMidpoint(): string {
  return rng([
    '🔄 Segundo tempo da prorrogação! Últimos 15 minutos.',
    '🔄 Intervalo da prorrogação. Falta pouco para a decisão.',
  ]);
}

export function generatePenaltyKick(teamName: string, playerName: string, scored: boolean): string {
  return scored
    ? rng([
        `⚽ GOOOL! ${playerName} converte para ${teamName}!`,
        `⚽ ${playerName} bate no canto e marca!`,
        `⚽ Que calma! ${playerName} não perdoa.`,
      ])
    : rng([
        `❌ ${playerName} (${teamName}) desperdiça o pênalti!`,
        `🧤 Defesa incrível! ${playerName} bateu e o goleiro pegou.`,
        `❌ Para fora! ${playerName} mandou por cima do travessão.`,
      ]);
}

export function generatePenaltyWin(teamName: string, hScore: number, aScore: number): string {
  return rng([
    `🏆 ${teamName} avança nos pênaltis por ${hScore}×${aScore}! Que emoção!`,
    `🏆 ${teamName} é o classificado! Decisão cruel nos pênaltis.`,
  ]);
}

// =============================================================================
// Posse / Passe / Desarme
// =============================================================================

export function generatePossession(teamName: string): string {
  return rng([
    `${teamName} mantém a posse de bola no meio-campo.`,
    `${teamName} troca passes com paciência.`,
    `${teamName} controla as ações no setor de meio-campo.`,
    `Posse de bola com ${teamName}, que busca espaços.`,
    `${teamName} trabalha a bola de pé em pé.`,
    `${teamName} gira a posse buscando infiltração.`,
    `A bola segue com ${teamName} no campo de ataque.`,
    `${teamName} constrói a jogada desde a defesa.`,
    `${teamName} avança em bloco pelo meio.`,
    `${teamName} explora o lado do campo com paciência.`,
    `Troca rápida de passes de ${teamName}.`,
    `${teamName} domina as ações no momento.`,
  ]);
}

export function generatePass(teamName: string, passer: Player, receiver: Player): string {
  return rng([
    `${passer.name} toca para ${receiver.name} (${teamName}).`,
    `Bola de ${passer.name} para ${receiver.name}, que domina.`,
    `${passer.name} aciona ${receiver.name} no ataque do ${teamName}.`,
    `Lindo passe de ${passer.name} para ${receiver.name}!`,
    `${passer.name} serve ${receiver.name} em profundidade.`,
    `${receiver.name} recebe de ${passer.name} e avança.`,
  ]);
}

export function generateTackle(teamName: string, tackler: Player): string {
  return rng([
    `${tackler.name} (${teamName}) desarma com precisão!`,
    `Desarme firme de ${tackler.name} e ${teamName} recupera a bola.`,
    `${tackler.name} corta o lance e ${teamName} respira.`,
    `Boa recuperação de ${tackler.name}! ${teamName} retoma a posse.`,
    `${tackler.name} antecipa e rouba a bola para ${teamName}.`,
    `Corte providencial de ${tackler.name}. Bola com ${teamName}.`,
  ]);
}

// =============================================================================
// Ataque / Finalização
// =============================================================================

export function generateAttack(teamName: string, attacker: Player): string {
  return rng([
    `${teamName} avança! ${attacker.name} parte para cima da defesa.`,
    `Ataque perigoso de ${teamName}! ${attacker.name} conduz a jogada.`,
    `${attacker.name} (${teamName}) acelera e leva perigo à área adversária.`,
    `${teamName} chega com perigo pelas costas da defesa!`,
    `${attacker.name} tenta a jogada individual pelo ${teamName}.`,
    `Jogada rápida de ${teamName} puxada por ${attacker.name}.`,
  ]);
}

export function generateGoal(teamName: string, scorer: Player, minute: number, score: string): string {
  if (minute >= 85) {
    return rng([
      `⚽ GOOOOOOL NOS ACRÉSCIMOS! ${scorer.name} decide para ${teamName}! ${score}`,
      `⚽ GOL AGONIZANTE! ${scorer.name} (${teamName}) nos instantes finais! ${score}`,
    ]);
  }
  if (minute >= 75) {
    return rng([
      `⚽ GOOOOOOL! ${scorer.name} marca nos minutos finais para ${teamName}! ${score}`,
      `⚽ GOL! ${scorer.name} balança as redes e muda o jogo! ${score}`,
    ]);
  }
  return rng([
    `⚽ GOOOOOOL! ${scorer.name} marca para ${teamName}! ${score}`,
    `⚽ GOOOOOOL de ${teamName}! ${scorer.name} balança as redes! ${score}`,
    `⚽ É GOL! ${scorer.name} finaliza com precisão para ${teamName}! ${score}`,
    `⚽ GOLAAAAÇO! ${scorer.name} (${teamName}) não perdoa! ${score}`,
    `⚽ GOL! ${scorer.name} aproveita e manda pro fundo da rede! ${score}`,
  ]);
}

export function generateMiss(teamName: string, attacker: Player): string {
  return rng([
    `${attacker.name} (${teamName}) finaliza, mas a bola vai para fora.`,
    `Chute de ${attacker.name} passa raspando a trave!`,
    `${attacker.name} arrisca de longe... por cima do gol!`,
    `Oportunidade desperdiçada! ${attacker.name} não acerta o alvo.`,
    `${attacker.name} tenta de fora da área... sem direção.`,
    `Que perigo! ${attacker.name} quase abre o placar.`,
  ]);
}

export function generatePost(teamName: string, attacker: Player): string {
  return rng([
    `😱 Na trave! ${attacker.name} (${teamName}) acerta o poste!`,
    `${attacker.name} carimba a trave! Que azar de ${teamName}!`,
    `Bola no poste! ${attacker.name} quase marcou um golaço.`,
    `${attacker.name} explode no travessão! ${teamName} por muito pouco.`,
  ]);
}

export function generateSave(teamName: string, goalkeeper: Player): string {
  return rng([
    `🛡️ Defesa! ${goalkeeper.name} (${teamName}) faz grande intervenção!`,
    `${goalkeeper.name} salva ${teamName} com uma defesa espetacular!`,
    `O goleiro ${goalkeeper.name} (${teamName}) evita o gol!`,
    `🛡️ ${goalkeeper.name} voa no ângulo e salva ${teamName}!`,
    `Defesaça de ${goalkeeper.name}! ${teamName} segue vivo.`,
  ]);
}

// =============================================================================
// Bola parada / Infrações
// =============================================================================

export function generateCorner(teamName: string): string {
  return rng([
    `Escanteio para ${teamName}. Bola na área!`,
    `${teamName} cobra escanteio. Todo mundo na área.`,
    `Córner para ${teamName}. Oportunidade de bola parada.`,
    `${teamName} força o escanteio. Bola vai ser levantada.`,
  ]);
}

export function generateFoul(teamName: string, fouler: Player): string {
  return rng([
    `Falta de ${fouler.name} (${teamName}). Jogo paralisado.`,
    `${fouler.name} comete falta. Cobrança para o adversário.`,
    `Infração de ${fouler.name}. ${teamName} perde a posse.`,
    `${fouler.name} chega atrasado. Falta marcada.`,
  ]);
}

export function generateOffside(teamName: string, player: Player): string {
  return rng([
    `Impedimento! ${player.name} (${teamName}) estava adiantado.`,
    `Bandeira sobe! ${player.name} em posição irregular.`,
    `${player.name} (${teamName}) é flagrado em impedimento.`,
    `Lance anulado! ${player.name} partiu antes da linha da bola.`,
  ]);
}

export function generateYellowCard(teamName: string, player: Player): string {
  return rng([
    `🟨 Cartão amarelo para ${player.name} (${teamName}).`,
    `O árbitro adverte ${player.name} com cartão amarelo.`,
    `${player.name} (${teamName}) recebe amarelo por entrada dura.`,
  ]);
}

export function generateRedCard(teamName: string, player: Player): string {
  return rng([
    `🟥 Cartão vermelho! ${player.name} (${teamName}) é expulso!`,
    `Expulsão! ${player.name} deixa ${teamName} com um a menos.`,
    `O juiz mostra o vermelho para ${player.name}! ${teamName} em apuros.`,
  ]);
}

// =============================================================================
// Comentários contextuais (momento da partida)
// =============================================================================

export function generateContextual(minute: number, diff: number, homeName: string, awayName: string): string | null {
  // Fim de jogo próximo
  if (minute === 85) {
    return `⏰ Faltam 5 minutos! O jogo está pegando fogo!`;
  }
  if (minute === 80) {
    if (diff === 0) return `Últimos 10 minutos. Tudo igual no placar!`;
    if (diff > 0) return `${homeName} administra a vantagem nos minutos finais.`;
    return `${awayName} pressiona em busca do empate!`;
  }

  // Metade do tempo
  if (minute === 22 || minute === 67) {
    if (diff === 0) return `Jogo equilibrado. Nenhum time consegue se impor.`;
    if (diff > 0) return `${homeName} merece a vantagem até aqui.`;
    return `${awayName} surpreende e controla bem a partida.`;
  }

  // Início de tempo
  if (minute === 48) {
    return `Voltamos para o segundo tempo. ${diff === 0 ? 'Quem sai na frente?' : 'O placar pode mudar!'}`;
  }

  return null;
}
