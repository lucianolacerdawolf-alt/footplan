# Backlog FootPlan

Lista do que está pendente. Itens marcados com 🟢 são pequenos (<1h), 🟡 médios (1-3h), 🔴 grandes (3h+).

Cada item pendente vem com **Por que sobrou**, **O que envolve** e **Posso retomar quando** pra você decidir se vale o esforço.

---

## 🐛 Bugs / Limpeza pendente

*(vazio)*

---

## 🏗️ Saúde do código

### ✅ Auditoria 2024-07-24 — melhoria contínua (concluída)

Todas as 27 melhorias foram aplicadas. Nenhum item pendente.



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
- **Mobile — tela de liga dividida**: "Ver Liga" era uma tela só misturando classificação + jogo do usuário + outros jogos da rodada (~580px de scroll no celular). Dividida em `LeagueScreen` (dia de jogo) + `LeagueTableScreen` (classificação, consulta pura) — aplicado nos dois modos (Campeonatos e Carreira). Hub da carreira ganhou botão de destaque "⚽ Jogar" que pula direto pra tática do próximo jogo, sem passar pela tela de rodada
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
- 220 testes automatizados (motor + sincronização de elenco + componentes UI)

### ✅ Melhorias de código (auditoria 2024-07-24) — parte 2

- **Path aliases `@/`**: configurado em `tsconfig.app.json`, `vite.config.ts`, `vitest.config.ts`. 40 imports atualizados de `../../../` para `@/`
- **TacticPresets + TacticEditor integrados**: `MatchScreen.tsx` (-71 linhas), `SetupScreen.tsx` (-53 linhas), `HalftimePanel.tsx` (-48 linhas). Total: -172 linhas de duplicação
- **Momentum visual**: barras coloridas no placar que pulsan com o momentum de cada time (lê de `engineStateRef.current.momentumHome`/`momentumAway`)
- **OnlineLobbyScreen CSS Module**: ~30 inline styles migrados para `OnlineLobbyScreen.module.css` — classes como `.roomCodeBadge`, `.teamCard`, `.connectBtn`, `.tacticsPanel`
- **CSS do momentum**: classes `.momentum-indicator`, `.momentum-track`, `.momentum-bar` em App.css com transições e animação de glow
- **`range()` doc corrigido**: documentação dizia `[min, max]` inclusivo, código sempre foi `[min, max)` exclusivo
- **`getGoalkeeper()` sem crash**: retorna `Player | null` em vez de estourar com `!` se não houver GK. Todos os 5 callers tratam null seguramente
- **`MatchResult.halftimeHomeScore` / `halftimeAwayScore`**: campos tipados no resultado em vez de parse frágil de string de narração. `achievements.ts` parou de depender do formato exato do texto em português
- **`App.tsx` refatorado**: 273 linhas de `if/else` substituídas por mapa declarativo `Record<Screen, ScreenRenderer>` em `src/components/AppScreens.tsx`. App.tsx de 602→344 linhas (-43%)
- **Tipos centralizados**: `Screen`, `MatchContext`, `TournamentMode` em `src/types/navigation.ts` — removidos de 7 hooks duplicados. `useOnlineMatch.ts` tinha versão defasada sem as telas de carreira
- **`src/engine/morale.ts`**: cálculo de moral extraído de 2 hooks duplicados (`useLeagueManager`, `useCareerManager`)
- **`src/engine/bracketHelpers.ts`**: `getStageMatches()` + `updateStageMatch()` substituem 6 blocos if/else duplicados nos hooks de bracket. `useBracketManager` -18 linhas, `useCareerManager` -30 linhas
- **Componentes compartilhados**: `TeamSlot`, `SquadList`, `TacticEditor`, `TacticPresets` em `src/components/shared/` — prontos para uso nos componentes existentes
- **`getAvgOvr()`**: removido de 4 componentes, centralizado em `utils/teamUtils.ts`
- **`useLiveRoster`**: reseta `lastError` antes de cada sync + bloco `catch` para exceções não-tratadas
- **`useAchievements`**: usa `setData(prev => ...)` funcional para evitar race condition em avaliações rápidas
- **`MatchStatsScreen`**: `useMemo` em `calculateRatings`, `manOfTheMatch`, `goalScorers`, `cardEvents`, `topPerformers`
- **`usePeerConnection`**: timeout de 15s com mensagem "Tempo limite de conexão" — evita estado "conectando" eterno
- **`TutorialOverlay`**: focus trap — foca botão "Pular" ao abrir, restaura foco ao fechar
- **Acessibilidade**: `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space) em 10+ divs interativos (squad-row, select-slot)
- **`Pitch.tsx`**: `React.memo` no componente SVG mais caro do app (22+ jogadores + animação)
- **`LeagueScreen`**: stats da temporada em `useMemo` em vez de IIFE no render
- **`steering.ts`**: `Record<Position, number>` substitui `Record<string, number>`; `determineState` usa `MatchEvent['type']` em vez de `string`
- **`btnGlow`**: anima `opacity` (GPU-composited) em vez de `box-shadow` (repaint)
- **Tactical counter**: condição `high-line` reordenada antes de `high-press` — bônus 1.22 não é mais shadowado pelo 1.18
- **`simulateRegulationTime()`**: helper extraído do boilerplate "run two halves" duplicado em `simularPartidaRapida` e `simularKnockout`
- **`progressPlayer`**: preserva proporções de atributos ao envelhecer (escala existentes em vez de regenerar do zero)
