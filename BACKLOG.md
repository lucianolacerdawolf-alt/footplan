# Backlog FootPlan

Lista do que está pendente. Itens marcados com 🟢 são pequenos (<1h), 🟡 médios (1-3h), 🔴 grandes (3h+).

Cada item pendente vem com **Por que sobrou**, **O que envolve** e **Posso retomar quando** pra você decidir se vale o esforço.

---

## 🐛 Bugs / Limpeza pendente

*(vazio)*

---

## 🏗️ Saúde do código

### ✅ `App.tsx` — avaliado, não precisa mais de refactor grande

Uma tentativa anterior de refactor tinha sido descartada por risco alto sem ganho claro. Reavaliado de perto: o arquivo já foi bem decomposto em sessões anteriores — `screen`/`matchContext`/navegação centralizados em `useAppShell()`, e liga/copa/fluxo de jogo/online/resume cada um com hook dedicado (`useLeagueManager`, `useBracketManager`, `useGameFlow`, `useOnlineMatch`, `useResumePrompt`). Do que sobra (356 linhas), a maior parte é o `if/else` de roteamento entre telas (inerente a um app sem router) + um modal — não é mais um "god component". Extrair mais um hook por cima disso só moveria complexidade, não reduziria. Decisão: deixar como está.

---

## 📦 Features grandes

### 🔴 Mercado de Transferências completo

**Por que sobrou:** o Modo Carreira (entregue) só tem troca direta 1-por-1 sem dinheiro, limitada a 3 por temporada — decisão explícita de escopo pra manter a primeira versão simples. Orçamento, negociação e agentes livres ficaram de fora de propósito.

**O que envolve:**
1. Pool de agentes livres (jogadores sem clube, disponíveis pra contratar)
2. Orçamento por clube + negociação (proposta de valor, contraproposta)
3. UI de mercado dedicada (hoje é só a tela de troca direta)

**Posso retomar quando:** você quiser expandir as transferências além da troca direta — precisa de discussão de design antes de codar (orçamento inicial, como valorar jogadores, janela de mercado).

---

## ✅ Já entregue (referência)

- **Modo Carreira**: progressão multi-temporada (todas as 6 ligas evoluem junto), envelhecimento/evolução de jogadores, troca direta entre clubes (limitada a 3/temporada), reputação de técnico que afeta aceitação de trocas, liga+copa disputadas juntas por temporada, histórico de temporadas, save único (`fp:career`)
- **6 ligas europeias** com elencos reais (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Liga Portugal) + **6 copas nacionais** correspondentes
- **Sincronização de elenco ao vivo** via football-data.org (proxy Cloudflare Worker, cache 7 dias, fallback offline, algoritmo de matching por confiança sem colisões falsas)
- **PWA instalável** (manifest, service worker, ícones, safe-area insets pro notch/Dynamic Island no iOS, funciona offline)
- **Persistência de sessão de partida ao vivo** — sobrevive a F5, restaura em pausa
- **Motor de simulação em blocos**: substituições numa pausa do 2º tempo afetam o resto do jogo de verdade
- **5 substituições em até 3 janelas de parada** (não é mais um contador único)
- **3 presets de tática** com tooltips explicativos
- **Fix**: desarme agora muda a posse de fato (antes a narração e o resultado divergiam)
- **Fix**: fadiga recalibrada (sem mais quedas irreais de OVR durante a partida)
- **Fix**: OVR de goleiro gerado proceduralmente calibrado corretamente
- **Fix**: bola segue passador/receptor real do evento, com arco proporcional à distância
- **Fix**: layout mobile — campo, tabela de classificação e botões de nav (`min-width` fixo cortando texto) não estouram mais a tela pequena; `box-sizing: border-box` global elimina scroll vertical fantasma
- **UI**: label "Posse de Bola" padronizado, goleiro com anel na cor do time, jogadores não somem mais ao pausar, banner "Continuar" cobre todos os fluxos de entrada
- **Débito técnico**: removido Redux Toolkit não utilizado; `App.tsx`/`useBracketManager.ts` não importam mais direto do arquivo de dados legado (`data/premierLeague.ts`, agora só usado internamente por `data/leagues/premierLeague.ts`)
- **Performance**: code-splitting (`React.lazy`) de `MatchScreen`, `MatchStatsScreen` e `AchievementsScreen` — bundle inicial ~10.5% menor (gzip); auditoria de touch targets (tooltips, presets de tática, controle de velocidade) pro mínimo recomendado de toque no mobile
- **Testes de UI**: `@testing-library/react` + `jsdom` configurados (ambiente isolado por arquivo, motor continua em `node`); cobertura pras 3 telas de seleção de time, tabela de classificação, tela de estatísticas pós-jogo (artilheiros, melhor em campo, cartões, histórico) e chaveamento de copa (partida do usuário, simular outros, fase de campeão)
- Sistema de conquistas (15 achievements)
- Tema escuro, fade entre telas, som procedural (zero arquivos de áudio)
- Tela pós-jogo completa (MOTM, notas, gols, cartões, breakdown tático)
- Tutorial interativo, H2H detalhado, CPU varia tática por rodada e por liga
- 215 testes automatizados (motor + sincronização de elenco + componentes UI)
