type CareerEvent = {
  id: string;
  subject: string;
  body: string;
  budgetDelta: number; // positivo = ganhou dinheiro, negativo = perdeu
};

const EVENTS: CareerEvent[] = [
  {
    id: 'sponsor',
    subject: '💰 Novo Patrocinador',
    body: 'A diretoria fechou um contrato de patrocínio pontual.',
    budgetDelta: 1_200_000,
  },
  {
    id: 'tv-rights',
    subject: '📺 Direitos de TV',
    body: 'A liga renegociou os direitos de transmissão — sua cota subiu.',
    budgetDelta: 800_000,
  },
  {
    id: 'merchandise',
    subject: '👕 Vendas de Camisa',
    body: 'A nova camisa está vendendo muito bem — receita extra de licenciamento.',
    budgetDelta: 500_000,
  },
  {
    id: 'fan-protest',
    subject: '📢 Protesto da Torcida',
    body: 'Resultados ruins irritaram a torcida organizada. Clima pesado no vestiário.',
    budgetDelta: 0,
  },
  {
    id: 'youth-scout',
    subject: '🌟 Joia da Base',
    body: 'O olheiro descobriu um jovem talento na base. Ele já treina com o elenco principal.',
    budgetDelta: 0,
  },
  {
    id: 'tax',
    subject: '📋 Imposto Surpresa',
    body: 'A receita federal cobrou impostos atrasados sobre luvas de contratações antigas.',
    budgetDelta: -600_000,
  },
  {
    id: 'stadium-fix',
    subject: '🏟️ Reforma do Estádio',
    body: 'A federação exigiu melhorias na iluminação. Despesa inesperada.',
    budgetDelta: -400_000,
  },
  {
    id: 'bonus',
    subject: '🎯 Bônus por Desempenho',
    body: 'Os jogadores receberam bônus contratuais por metas de performance atingidas.',
    budgetDelta: -350_000,
  },
  {
    id: 'prize',
    subject: '🏅 Prêmio Fair Play',
    body: 'Sua equipe foi reconhecida pelo fair play e recebeu um prêmio da federação.',
    budgetDelta: 300_000,
  },
  {
    id: 'injury-crisis',
    subject: '🤕 Mini-Crise de Lesões',
    body: 'O departamento médico está sobrecarregado — três jogadores do elenco sentiram desconforto muscular.',
    budgetDelta: 0,
  },
  {
    id: 'morale-boost',
    subject: '📈 Moral nas Alturas',
    body: 'Uma sequência de bons resultados elevou o astral do elenco. Todos treinam com mais intensidade.',
    budgetDelta: 0,
  },
  {
    id: 'player-demand',
    subject: '🗣️ Jogador Pede Aumento',
    body: 'Um dos titulares bateu na porta da diretoria pedindo revisão salarial.',
    budgetDelta: -250_000,
  },
  {
    id: 'sponsor-offer',
    subject: '🤝 Marca Concorrente',
    body: 'Uma marca maior quer estampar a camisa — oferece bônus de assinatura se você fechar agora.',
    budgetDelta: 900_000,
  },
  {
    id: 'performance-clause',
    subject: '📊 Cláusula de Performance',
    body: 'O patrocinador ativou a cláusula de bônus por bons resultados recentes.',
    budgetDelta: 500_000,
  },
  {
    id: 'sponsor-scandal',
    subject: '📰 Escândalo do Patrocinador',
    body: 'A marca foi envolvida em polêmica — a imagem do clube sofre e a receita cai temporariamente.',
    budgetDelta: -450_000,
  },
];

/** Chance de evento a cada rodada da carreira: 25%. `rng` injetável pra testes determinísticos. */
export function maybeGetCareerEvent(rng: () => number = Math.random): CareerEvent | null {
  if (rng() > 0.25) return null;
  return EVENTS[Math.floor(rng() * EVENTS.length)];
}
