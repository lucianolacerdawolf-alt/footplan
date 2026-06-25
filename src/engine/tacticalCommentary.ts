export function generateTacticalComment(
  homeName: string, awayName: string,
  homeFormation: string, awayFormation: string,
  homeMentality: string, awayMentality: string,
  homeDefLine: string, awayDefLine: string,
): string {
  const pool: string[] = [];

  // Formation insights
  if (homeFormation === '4-2-3-1' && awayFormation === '4-4-2') {
    pool.push(`📋 O 4-2-3-1 do ${homeName} tem superioridade numérica no meio contra o 4-4-2 do ${awayName}.`);
  }
  if (homeFormation === '3-5-2') {
    pool.push(`📋 Com 3-5-2, ${homeName} congestiona o meio-campo e força ${awayName} a jogar pelas pontas.`);
  }
  if (homeFormation === '5-3-2') {
    pool.push(`📋 ${homeName} monta uma retranca com 5-3-2 — ${awayName} terá que furar um muro defensivo.`);
  }
  if (awayFormation === '4-3-3' && homeFormation === '4-4-2') {
    pool.push(`📋 O 4-3-3 do ${awayName} sobrecarrega os lados, testando a defesa do ${homeName}.`);
  }

  // Mentality insights
  if (homeMentality === 'high-press') {
    pool.push(`🔥 ${homeName} pressiona alto! ${awayName} sofre para sair jogando.`);
  }
  if (homeMentality === 'counter-attack') {
    pool.push(`⚡ ${homeName} espera o erro e ataca em velocidade. Postura claramente reativa.`);
  }
  if (homeMentality === 'possession') {
    pool.push(`🔄 ${homeName} controla a posse com paciência, esperando a brecha na defesa do ${awayName}.`);
  }
  if (homeMentality === 'defensive') {
    pool.push(`🛡️ ${homeName} joga com linhas baixas. ${awayName} precisa de criatividade para furar.`);
  }
  if (awayMentality === 'high-press' && homeMentality === 'possession') {
    pool.push(`⚠️ A pressão alta do ${awayName} incomoda a saída de bola do ${homeName}.`);
  }

  // Defensive line insights
  if (homeDefLine === 'high' && awayMentality === 'counter-attack') {
    pool.push(`🎯 Linha alta do ${homeName} contra o contra-ataque do ${awayName} — risco de bola nas costas!`);
  }
  if (homeDefLine === 'low') {
    pool.push(`🧱 ${homeName} com linha baixa. Difícil de ser vazado, mas sofre com chutes de longe.`);
  }
  if (awayDefLine === 'high') {
    pool.push(`📏 ${awayName} joga com linha alta. Se ${homeName} acertar o passe em profundidade, é perigo.`);
  }

  // Matchup highlights
  if ((homeFormation === '4-3-3' || homeFormation === '4-2-3-1') && awayFormation === '5-3-2') {
    pool.push(`⚔️ ${homeName} precisa de jogo pelos lados para abrir a defesa de 5 do ${awayName}.`);
  }
  if (homeFormation === '3-5-2' && (awayFormation === '4-3-3' || awayFormation === '4-4-2')) {
    pool.push(`🔄 A vantagem numérica no meio dá a ${homeName} o controle da partida.`);
  }

  if (pool.length === 0) {
    pool.push(`⚽ ${homeName} e ${awayName} se estudam no início. Quem vai se impor primeiro?`);
    pool.push(`🏟️ Partida equilibrada nos primeiros minutos. Os times se respeitam.`);
  }

  return pool[Math.floor(Math.random() * pool.length)];
}
