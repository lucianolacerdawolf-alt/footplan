# Diário de bordo — FootPlan

Uma entrada por sessão de trabalho, a mais recente no topo: o que foi entregue, o que
foi decidido e por quê, o que ficou pendente e as armadilhas operacionais.

---

## 2026-11-20 (10) — 4 ligas novas: Eredivisie, Pro League, Saudi Pro League e MLS

### Entregue
- **Ligas** (`src/data/leagues/{eredivisie,proLeague,saudiProLeague,mls}.ts`), no padrão leve das 2ª divisões (`makeSecondDivisionTeam`):

  | Liga | Times | Vagas UEFA |
  |---|---|---|
  | Eredivisie | 18 | 2 UCL / 1 UEL / 1 UECL |
  | Bélgica | 16 | 1 / 1 / 1 |
  | Arábia | 18 | sem vaga |
  | MLS | 30 | sem vaga |

  Nenhuma tem par de divisão (`relegationSpots: 0`); a copa nacional completa com a própria liga.
- **Tabelas por liga atualizadas:** patrocinadores (pools novos por país), caixa inicial, premiação, bilheteria, peso da reputação, calibração de notas, ordem na seleção de ligas, scripts de camisa e escudo.
- **MLS** (`engine/conferenceSeason.ts`):
  - Leste e Oeste com 15 clubes cada. Turno e returno dentro da conferência; os dois que folgam na rodada se enfrentam; +4 rodadas só Leste × Oeste. Total: 34 rodadas, 34 jogos por clube.
  - Playoff com os 8 melhores de cada conferência (1×8, 4×5, 2×7, 3×6) e conferências separadas até a final. Reaproveita o fluxo das copas continentais (`MLS_PLAYOFF` em `continentalCups.ts`, fora de `CONTINENTAL_CUPS`), que a MLS não tem.
  - O playoff só abre depois da temporada regular (`cupSchedule` kind `'playoff'`). A temporada só fecha depois dele, e o campeão da liga é quem vence o playoff.
  - Não conta conquista nem reputação continental.
  - Tabela, setas e folha de resultados por conferência. Quem não se classifica recebe uma mensagem e não tem playoff.
- **Mercado:**
  - `veteranMarketBid`: jogador do usuário com 29+ na lista de venda recebe oferta da Arábia (60%, 1,3–1,8× o valor) ou da MLS (25%, 1,1–1,3×).
  - `leaguePriceFactor`: clubes holandeses e belgas vendem por 80% do valor (70% para jovens até 23). Vale no `evaluateCashTransfer` e na tela, com o aviso "Liga vitrine".
- **Elencos reais:** Eredivisie pela football-data (`DED`, também liberado no worker), Bélgica/Arábia/MLS pela Wikipedia (MLS com artigo de ano civil). Dry-run: 18/465, 16/472, 18/582, 30/696 times/jogadores, todos ao vivo. O `sync-leagues.ts` passou a usar a Wikipedia também.
- **Escudos:** `fetch-secondary-crests` com os países novos.
- **Economia (`economy-audit`, agora com as 4 ligas e o calendário real da MLS):** todas positivas. Al-Hilal: caixa €75M, +€6,4M/temporada. Inter Miami: +€3,3M/temporada.
- **Testes:** 11 novos (`newLeagues.test.ts`); 4 testes antigos ajustados de "12 ligas" para 16. 777 passando.

### Decidido e por quê
- **Playoff da MLS no slot da copa continental.** Ganha de graça a tela de chave, o próximo jogo na Central, a simulação dos outros e a premiação.
- **Desconto holandês/belga só na compra.** Fica fora do `calculateMarketValue` global, para não desvalorizar jogadores que já são do usuário.

### Escudos e logos (mesmo dia, depois da publicação das ligas)
- **Logos das 4 ligas:** vêm da Wikipedia/Wikimedia (pedido do usuário). Eredivisie pelo `pageimages`; Bélgica, Arábia e MLS pelo arquivo do infobox.
- **Escudos de 79 dos 82 clubes:**
  - 61 pelo `fetch-secondary-crests`, com os países do TheSportsDB corrigidos: "The Netherlands", "Saudi Arabia" (sem hífen), "United States", e aliases como "PSV Eindhoven" e "Al Hilal".
  - 18 pelo logo do infobox do artigo do clube na Wikipedia, gravados à mão no `secondDivisionCrests.ts`.
  - Sem escudo: Al-Ahli, Al-Najma e Charlotte FC (a Wikipedia limitou as buscas).
- `crests:download`: 83 imagens novas, 0 falhas, servidas localmente.
- **Armadilhas:**
  - Parar a tarefa em segundo plano NÃO matou o `vite-node` filho (Windows). Duas execuções simultâneas do gerador estouraram a cota do TheSportsDB. Matar pelo `CommandLine` antes de rodar de novo.
  - O Wikimedia/Wikipedia devolve 429 depois de muitas chamadas seguidas. Espaçar as chamadas ou esperar.
  - `python -I` ignora `PYTHONIOENCODING`, e o console cp1252 quebra com "✓". Usar ASCII nos prints.

### Pendente
- **Publicar elencos:** a tarefa diária das 10h publica as 4 ligas no Supabase sozinha.
- **Escudos que faltam:** Al-Ahli, Al-Najma e Charlotte FC. Até lá, o jogo usa os elencos gerados (offline).
- **Worker:** o proxy (`worker/football-proxy.js`) precisa de deploy para liberar o `DED` no cliente. O sync roda direto com a chave, sem o proxy.
- **Calibração de notas:** o `ref` das 4 ligas foi estimado; re-medir a mediana bruta depois do 1º sync publicado.
- **Modo Campeonato:** a MLS não tem playoff; o campeão é o 1º da tabela geral. O playoff existe só na carreira.
- **Mercado de Treinador:** as ligas novas entram como qualquer liga, sem regra especial de "carreira alternativa" (o usuário não pediu).

---

## 2026-11-20 (9) — Lanternas começam com 20–30 e patrocínio inicial pelo clube

### Entregue
- **Reputação inicial (v2):** `15 + 15 × peso + 30 × peso × tamanho`. Lanterna da Premier 30, meio ~45, maior 60. Segundas divisões vão de ~20 a ~35. Ninguém começa do zero, como o usuário pediu.
- **Patrocínio de largada pelo tamanho do clube:** `tierForReputation(reputação inicial)` dá local <25, regional 25+, nacional 50+, global 75+. É gravado em `finances.sponsorStartTier`.
  - A receita é relativa ao nível de largada do próprio clube (`tierFactor(..., startTier)`), então começar "regional" numa liga de padrão "nacional" não tira dinheiro. A receita continua vindo da base do clube.
  - O patrocínio nunca cai abaixo do nível de largada (`tierAbove` no fim da temporada). Antes, médios e pequenos das ligas grandes perdiam €3–6M/temporada no fim da 1ª.
- **Saves:** `reputationSeedVersion = 2` reajusta uma vez, só para cima, quem já tinha sido ajustado na v1. Save de teste: 42 → 50, com o aviso de subida de nível. Saves antigos sem `sponsorStartTier` usam o nível padrão da liga como piso.
- `economy-audit`: nenhum clube perde patrocínio na temporada 2.
- +2 testes. 766 passando.

### Decidido e por quê
- **Nível de patrocínio pela reputação inicial, com receita relativa à largada do clube.** Dar nível maior aos grandes multiplicando a receita (×1,39 do global) enriqueceria demais os grandes (+€16M/temporada). Assim o nível mostra o porte do clube, e o dinheiro continua proporcional a ele.

---

## 2026-11-20 (8) — Reputação inicial pelo tamanho do clube

### Entregue
- **Problema:** todo técnico começava com reputação 0, até no Arsenal.
- **Novo `engine/reputation.ts`:** `initialReputation = 5 + 55 × peso da liga × tamanho do clube na liga` (ranking por força média). Maior da Premier ≈ 60, meio ≈ 30-40, lanterna 5, maior da Championship ≈ 30.
- **Carreira nova:** já nasce com essa reputação; os objetivos da diretoria também partem dela.
- **Trocar de clube (`applyClubChange`):** a reputação nunca cai, e um clube maior empurra até 80% do patamar dele (`reputationAfterMove`).
- **Saves antigos:** ajuste único em `seedReputation` (chamado dentro de `ensureEconomy`, que roda em todo carregamento, local e nuvem). A reputação só sobe até o patamar do clube atual, e a flag `reputationSeeded` impede repetir. No save de teste (Crystal Palace), foi de 0 → 42.
- **`computeMerchRevenue`:** agora proporcional ao clube (10% da receita base × reputação/100). Ver "Decidido".
- O `ReputationPanel` explica de onde vem o ponto de partida.
- `economy-audit` agora mostra reputação inicial, patrocínio na temporada 2 e produtos.
- +2 testes; o teste de `applyClubChange` foi atualizado para a regra nova. 764 passando.

### Decidido e por quê
- **Produtos proporcionais ao clube.** A auditoria mostrou que a renda de produtos era €6K por ponto de reputação, igual em qualquer liga. Com a reputação inicial, um grande da Serie B faturaria €6,2M/temporada em produtos contra €1,3M de lucro normal. Agora dá €0,2M nele e €3,6M num grande da Premier.
- **Sem bloquear subir de nível no ajuste do save.** O aviso "Sua reputação subiu de nível" pode aparecer uma vez no primeiro carregamento, e isso é esperado.

### Pendente / observado
- **Patrocínio de clube médio/pequeno das ligas grandes cai de nível no fim da 1ª temporada:** o nível inicial "nacional" pede reputação 50. Isso já acontecia antes (com reputação 0 caía para todos, inclusive os grandes); agora os grandes mantêm. Vale revisar se o nível inicial deveria depender do clube.

---

## 2026-11-20 (7) — Modal de renovação não fechava

### Entregue
- **Bug:** em Meu Clube → Contratos (`TrophyRoomScreen`), confirmar a renovação salvava o contrato, mas o modal continuava aberto. O `onConfirm` só chamava `onRenewContract` e nunca limpava o `renewingPlayer`. A versão da tela de Elenco (`SetupScreen.confirmRenewal`) já fechava.
- Agora o modal fecha ao confirmar. Quando a renovação é barrada (teto salarial, orçamento), o toast explica o motivo.
- O teste de renovação do `TrophyRoomScreen` passou a checar que o modal some. 762 passando.

---

## 2026-11-20 (6) — Fim do botão "Simular Todos"

### Entregue
- Com os outros jogos já automáticos (desde a entrada 1), os botões "Simular Todos" (liga) e "Simular Outros" (copas) só confundiam. Saíram. No lugar fica o aviso "Saem quando seu jogo terminar" (ou "Simulando…").
- O teste do `BracketScreen` agora cobre o comportamento novo: nada roda antes do seu jogo e a simulação dispara sozinha depois dele. 762 passando. Visto no app (liga da carreira).

### Decidido e por quê
- **Sem "simular os outros antes do meu jogo".** Na vida real os jogos da rodada são simultâneos, e a partida ao vivo já simula os outros quando começa (o ticker da rodada).

---

## 2026-11-20 (5) — Fora de posição não mudava a força

### Entregue
- **Bug:** o usuário trocava a posição e a força continuava igual. A causa é que `playerOvr` limita o resultado pelo MAIOR atributo do jogador, então craques davam o mesmo número em qualquer função (Saka 88 de atacante = 88 de zagueiro). O motor, que lê atributos direto, também não sentia diferença.
- Novo `engine/outOfPosition.ts`: o improvisado perde 10% dos atributos numa linha vizinha, 22% pulando uma linha e 40% envolvendo goleiro. `asPlayedInRole` é usado no `playerOvr` (tela) e no `getPlayersByPosition` (porta de entrada do motor), então a tela e a partida usam a mesma conta.
- Ex.: Saka 88 vira 79 de meia e 69 de zagueiro. Visto no app: Sarr 88 → 62 na zaga.
- O `calculateMarketValue` usa a posição de origem: improvisar não desvaloriza ninguém.
- +2 testes (762 passando).

### Decidido e por quê
- **Penalizar os atributos, e não só o número da tela.** Assim o efeito chega na partida.
- **Percentuais escolhidos para dar uma queda visível de 8-25 pontos:** improvisar tem custo claro, mas jogar um meia na zaga ainda é viável.

---

## 2026-11-20 (4) — Barra de oferta do Mercado

### Entregue
- **Agente livre:** a barra (a "luva") saiu. Ela não mudava nada: o `handleSignFreeAgent` assina sempre e só debitava o valor escolhido. Agora o card diz "sem custo de transferência — você paga só o salário" e assina por €0.
- **Comprar de clube:** a barra ganhou rótulo ("Sua oferta ao X · N% do valor"), uma marca verde no mínimo que o clube aceita e uma linha que responde na hora "✓ Aceitam" / "✗ Recusam: o mínimo é €X". Quando é o último jogador da posição, avisa que não vendem e trava o botão. O botão mostra o valor ("Oferecer €X").
- A regra exibida é a mesma de `evaluateCashTransfer`: 85% do valor; 110,5% se o vendedor tem só 2 na posição. O mínimo é calculado com `calculateMarketValue`, como no motor.
- +2 testes de tela (760 passando).

### Decidido e por quê
- **Tirar a luva em vez de dar efeito a ela.** Dar efeito exigiria criar uma regra nova de recusa para agentes livres. Uma barra que custa dinheiro sem fazer nada era pior que nenhuma.
- **Selo "Oferta Irrecusável" (150%) removido.** Pela regra, 150% não muda nada em relação ao mínimo aceito.

### Publicado
- **Site:** `footplan.pages.dev` publicado às ~16:40. Conferido: o chunk `TransferMarketScreen` no ar tem o texto novo e não tem mais a "Luva de contratação".

### Pendente
- Não visto no app: a janela de transferências está fechada no save de teste. A tela está coberta por teste de componente.

---

## 2026-11-20 (3) — Arrastar titular para outra posição

### Entregue
- O usuário não conseguia arrastar um titular para a vaga de outro titular de posição diferente. Isso era a regra "só mesma posição", não um bug. Agora o jogador solto em cima de outro de outra posição assume a vaga **e a função** dele: passa a jogar "fora de posição".
- `Player.naturalPosition` guarda a posição de origem. `position` vira a função que ele cumpre no time, e o `playerOvr` já recalcula a força pelos pesos da nova função (ex.: Sarr atacante 88 → 77 de meia).
- Helpers em `squadUtils`: `moveIntoSlot`, `playAs`, `restoreNatural`, `isOutOfPosition`. Quem vai pro banco, "Escalar melhores" e a troca de formação devolvem todos à posição de origem.
- No campinho: selo laranja com a posição de origem, força em laranja e aviso com o antes/depois.
- Goleiro só troca com goleiro. +3 testes (758 passando). Visto no app: ida e volta funcionam.

### Decidido e por quê
- **Reaproveitar `position` como função em vez de mexer no motor.** O motor e o OVR já leem `position`, então a penalidade sai de graça pelos atributos (atacante na zaga tem desarme baixo). Mexer no motor seria uma mudança muito maior.

### Publicado
- **Site:** `footplan.pages.dev` publicado às 16:15 com tudo de hoje (`npm run build` + `npx --yes wrangler pages deploy dist --project-name=footplan` no terminal do usuário). Conferido: o bundle no ar tem "Escalar melhores" e "fora de posição".

### Pendente
- **APK:** continua na versão antiga até rodar `npm run android:apk`. Não existe deploy automático no push (o CI só testa).
- **Improviso persiste no save:** um jogador escalado fora de posição continua assim nas telas de mercado e elenco até ir pro banco ou até "Escalar melhores".

### Armadilhas
- **`npx wrangler` sem `--yes` trava:** o npx para no "Ok to proceed? (y)", e a aba do terminal não aceita resposta enquanto o comando roda. Usar `npx --yes`.
- **Coordenadas do navegador interno em modo celular:** o frame do screenshot (469px) é 1,25× o CSS (375px). Para arrastar, pegue a posição real com `getBoundingClientRect` e multiplique.

---

## 2026-11-20 (2) — Melhorias sugeridas a partir dos 9 pontos

### Entregue
- **Partida:** escudos na faixa de placares da rodada (`LiveScoreTicker`). No apito final aparece um resumo (`FinalWhistleCard`: gols, finalizações, melhor em campo) no lugar da linha de gols.
- **Elenco:** drag-and-drop virou um hook (`useDragSwap`) usado no campinho e no painel de substituições da pausa/intervalo. Na partida o arrasto é pela alça ⠿, para não travar a rolagem da lista no celular. O campinho mostra barra de cansaço (40%+) e um aviso de 2 amarelos. Novo botão "Escalar melhores" (`bestLineup`): mais fortes disponíveis por posição, descontando o cansaço.
- **Rodada:** depois da simulação automática, o `RoundResultsSheet` mostra todos os placares e quem subiu ou caiu na tabela.
- **Classificação:** filtro Geral/Casa/Fora e aba "Campanha" com gráfico da posição por rodada (`PositionChart`, com hover e versão em tabela).
- **Mercado:** filtro de preço (inclui "cabe no caixa"), aba "Jogadores da liga" dentro de cada liga e o time mais forte no card de cada liga.
- **Central:** a Preparação vira uma linha só depois de treino e coletiva feitos. Filtro Tudo/Atletas/Diretoria nas mensagens. Botão "Ver adversário" no card do próximo jogo.
- **Base:** evolução a cada rodada (`youthRoundGrowth`: ~15% do que falta para o potencial por temporada; foco 2×, empréstimo 3×). Empréstimo de até 2 jovens por temporada (`youthLoanIds`): evoluem mais rápido e ganham a etapa extra no fim. Enquanto emprestados, não podem ser promovidos.
- **Reputação:** título continental agora rende reputação (UCL +15, UEL +10, UECL +7). Vencer na liga um time 4+ de força acima dá +1, até 5 por temporada (`seasonGiantKills`). Aviso quando sobe de nível (guardado em `localStorage` por nome de técnico).
- +8 testes (`improvementsNov20.test.ts`); 755 passando.

### Decidido e por quê
- **Arrastar na partida só pela alça ⠿.** Com `touch-action: none` na linha inteira, a lista de substituições (que rola) ficava presa no celular.
- **Evolução por rodada soma à da virada.** O salto do fim continua sendo 35% do que falta, que agora é menos. O crescimento total fica um pouco maior, mas fica visível ao longo da temporada.
- **Reputação de "time mais forte" só na liga e com teto.** Copas dariam muitos confrontos desiguais, e o teto evita inflar a reputação.

### Pendente
- **Push:** os commits do dia ainda não foram enviados, aguardando o ok do usuário.
- **Ainda não visto no app:** cansaço no campinho (ninguém cansado no save de teste), arrasto pela alça na pausa, folha de resultados da rodada e a grade do Mercado (janela fechada).

### Armadilhas
- **Screenshot do navegador interno cortado em 375px:** o corte parece estouro horizontal, mas não é. Conferir com `scrollWidth` antes de "consertar".
- **Ferramenta de navegação:** chamar `navigate` no mesmo lote que outra ação foi recusado pelo classificador. Enviar sozinha.

---

## 2026-11-20 — Ajustes dos testes no celular

### Entregue (commit `f1f9060`)
- **Partida:** os botões do fim de jogo (Estatísticas/Continuar) não somem mais atrás do campo. A causa era a área dos botões com `flex-shrink: 1` numa tela de `100dvh`: com o campo e a narração, ela ficava com 0px. Agora quem encolhe é a narração (`App.css`). O placar ganhou os escudos dos dois times.
- **Elenco:** dá para arrastar e soltar jogadores no campinho (`FormationPitch`), com pointer events (funciona com mouse e toque). Os reservas aparecem numa faixa abaixo do campo e também podem ser arrastados.
- **Rodada automática:** quando o jogo do usuário termina, os outros jogos da rodada (`LeagueScreen`) ou da fase (`BracketScreen`) são simulados sozinhos. O botão manual continua.
- **Classificação:** no celular aparecem sigla, V/E/D e SG, mais uma seta ▲▼ comparando com a rodada anterior. Tocar num time abre o detalhe: gols, aproveitamento, casa/fora, últimos 5 jogos e próximo jogo.
- **Mercado:** grade de ligas `auto-fill minmax(96px)`, que dá 3 por linha no celular (antes caía para 1 abaixo de 420px).
- **Central / Mensagens:** os painéis não encolhem mais dentro de `.hubPanel` (`> * { flex-shrink: 0 }`). Antes Conversas e Caixa de Entrada mostravam só a 1ª linha. Novo botão "Marcar lidas", que pula as mensagens obrigatórias.
- **Base:** treino focado (`youthFocusId` no `CareerState`: 1 jovem por temporada evolui uma etapa a mais em `refreshYouthPool`), opção de dispensar e previsão de quando sobe (`seasonsUntilReady`). +3 testes.
- **Oponente:** na aba Elenco, o botão "Oponente" mostrava o próprio time. Agora `SetupScreen` recebe `opponentOverride` com o próximo adversário real; quando não há próximo jogo, recebe `null` e o botão some.
- **Reputação:** novo `ReputationPanel`, um selo tocável na Central com nível, progresso, regras de ganho/perda, prévia "se a temporada acabasse hoje" e desbloqueios.

### Decidido e por quê
- **Arrastar só entre jogadores da mesma posição.** O motor monta a formação pela posição de cada jogador e não tem o conceito de "fora de posição". Trocar zagueiro com atacante quebraria as linhas. Nesse caso aparece um aviso explicando.
- **Prévia da reputação.** A reputação só muda no fim da temporada (ou na demissão), então sem a prévia o usuário não via o efeito do que faz durante a temporada.
- **Regra de promoção da base inalterada** (18+ anos e OVR 55+). Em vez de afrouxar a regra, foram criadas ações que valem desde a temporada 1.

### Pendente
- **Push do `f1f9060` (e deste diário):** aguardando o ok do usuário. O pedido de push veio de um plugin, não do usuário.
- **Grade de ligas do Mercado:** não foi vista no app, porque a janela de transferências estava fechada no save de teste.

### Armadilhas
- **Telas `fit-screen` / `100dvh`:** um filho com `flex-shrink: 1` e `overflow: hidden` some sem erro. Esse foi o padrão dos bugs dos botões e das mensagens. Ao criar painel novo, defina quem rola e quem não encolhe.
- **Vite servindo arquivo velho:** voltou a acontecer com o `AppScreens.tsx`. Compare o `fetch('/src/...')` com o disco e dê `touch` antes de depurar.
