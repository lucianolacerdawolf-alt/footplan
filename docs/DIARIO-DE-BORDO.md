# Diário de bordo — FootPlan

Uma entrada por sessão de trabalho, a mais recente no topo: o que foi entregue, o que
foi decidido e por quê, o que ficou pendente e as armadilhas operacionais.

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
