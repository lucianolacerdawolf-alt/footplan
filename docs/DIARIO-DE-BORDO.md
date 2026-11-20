# Diário de bordo — FootPlan

Uma entrada por sessão de trabalho, a mais recente no topo: o que foi entregue, o que
foi decidido e por quê, o que ficou pendente e as armadilhas operacionais.

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
