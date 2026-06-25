# Backlog FootPlan

Lista do que está pendente. Itens marcados com 🟢 são pequenos (<1h), 🟡 médios (1-3h), 🔴 grandes (3h+).

Cada item pendente vem com **Por que sobrou**, **O que envolve** e **Posso retomar quando** pra você decidir se vale o esforço.

---

## 🐛 Bugs / Limpeza pendente

### 🟢 `public/fundo.png` tem 5.5 MB

**Por que sobrou:** depende de ferramenta externa (compressor de imagem).

**O que envolve:**
- Rodar `cwebp -q 70 public/fundo.png -o public/fundo.webp` (precisa instalar `cwebp`)
- OU subir em TinyPNG / Squoosh.app, baixar versão otimizada
- Ajustar `src/index.css` linha 47: trocar `url('/fundo.png')` → `/fundo.webp`
- Deletar `fundo.png` original

**Posso retomar quando:** você gerar o arquivo otimizado e colocar na pasta. Eu ajusto o CSS e removo o antigo.

**Ganho esperado:** carregamento inicial muito mais rápido (5.5 MB → ~150 KB), especialmente no mobile/3G.

---

## 🎮 Gameplay / UX

### 🟡 Substituições durante o 2º tempo

**Por que sobrou:** o próprio plano original marcou como "trabalho real" (3h+).

**O que envolve:**
1. Pausar o `setInterval` do replay no `useMatchSimulation.startReplay` + congelar `clockSeconds`
2. Adicionar botão "Pausar" no `MatchScreen` durante o 2º tempo
3. Reaproveitar a UI de substituição do intervalo num modal flutuante
4. Re-instanciar o steering dos jogadores no `Pitch.tsx` (refs mutáveis: `playersRef`, `carriersRef`, `svgElsRef`)
5. Aplicar a nova escalação no `MatchState` mid-flight sem perder fadiga acumulada nem `state.cards`
6. Respeitar o limite de 3 subs já implementado (`subsHome`/`subsAway`)
7. Resumir o `setInterval` sem perder eventos pendentes nem dessincronizar `clockSeconds` com `Date.now()`

**Risco:** médio-alto — mexe no loop central da partida (`useMatchSimulation`) e no steering visual (`Pitch.tsx`). Testes não cobrem replay (cobrem o motor puro).

**Posso retomar quando:** você decidir que vale (vai dar ~3-4h de trabalho e debugging). Sugestão: testa antes em modo "Simular Partida" pra validar o pause/resume sem complicar com swap.

---

## 🏗️ Saúde do código

### 🔴 `App.tsx` god component (504 linhas, 40+ hooks)

**Por que sobrou:** tentei na Fase 4 e desisti — refactor grande em código que funciona = risco de regressão alto sem ganho funcional.

**O que envolve:**
- Extrair `useTournamentNavigation()` hook que retorne `{ screen, setScreen, matchContext, ... }`
- OU mover lógica de torneio pra `hooks/useLeague.ts` e `hooks/useBracket.ts`
- Reorganizar callbacks (`handleStartLeague`, `handlePlayLeagueMatch`, etc) em arquivos menores
- Decidir se mantém useState ou migra pra useReducer/Zustand
- Garantir que todos os fluxos continuam: regular vs CPU, league entry, league match, league simulate (round, user, opponent), bracket entry, bracket match, bracket simulate, resume modal, edit tactics, post-match routing

**Risco:** alto. Esse arquivo orquestra 8 telas e ~20 transições. Bug aqui quebra navegação inteira.

**Posso retomar quando:** você quiser pagar a dívida técnica. Sugestão: fazer com testes E2E (Playwright) cobrindo os 4 fluxos principais (partida única vs CPU, vs player, liga completa, copa completa) antes de mexer.

---

### 🟡 `matchEngine.ts` ainda em 484 linhas

**Por que sobrou:** próxima quebra (`resolveAttack`/`resolveShot`/`calculatePossession`) é cosmética com risco médio.

**O que envolve:**
- Mover `resolveAttack` (37 linhas) pra `engine/resolveAttack.ts`
- Mover `resolveShot` (22 linhas) pra `engine/resolveShot.ts`
- Mover `calculatePossession` (30 linhas) pra `engine/calculatePossession.ts`
- Mover `applyFatigue` (10 linhas) pra `matchHelpers.ts`
- Resolver imports — essas funções dependem de `MENTALITY_MODIFIERS`, `FORMATION_COUNTS`, `DEFENSIVE_LINE_MOD`, `WIDTH_MOD`, `effective`, `getStarters`, `getPlayersByPosition`, `getGoalkeeper`, `pickRandom`, `makeRng`
- matchEngine cairia pra ~280 linhas

**Risco:** baixo-médio. Mover funções puras é seguro, mas pode introduzir bug silencioso (ex: trocar ordem de argumento) que passe nos testes de invariante mas mude estatísticas.

**Posso retomar quando:** quiser. Sugestão: rodar `calibration.test.ts` antes e depois pra confirmar que a média de gols não mudou.

---

### 🟡 Premier League hardcoded em `data/premierLeague.ts`

**Por que sobrou:** precisa de **design de API**, não só de código. Sem suas decisões, eu chutaria.

**Decisões necessárias (do usuário):**
- **Onde mora a lista de ligas?** Múltiplos arquivos em `data/leagues/` (uma por liga)? Um único arquivo `data/leagues.ts`?
- **Como o usuário escolhe?** Tela nova de "Escolher Liga" antes da HomeScreen? Dropdown na própria HomeScreen?
- **Liga afeta só os times?** Ou também regras (38 vs 30 rodadas, número de classificados pra Europa, etc)?
- **E o save?** Vincular `leagueState.leagueId`? O que acontece se trocar de liga com torneio em andamento? Apaga ou mantém separado?
- **CPU varia?** Bots têm comportamento diferente em ligas mais defensivas (italianas) vs ofensivas (alemãs)?

**O que envolve depois das decisões:**
- Criar interface `League { id, name, teams[], totalRounds, europeanSlots: { championsLeague, europaLeague, conferenceLeague }, ... }`
- Refatorar `generateLeagueSchedule` pra receber `totalRounds`
- Refatorar `computeStandings` pra usar `europeanSlots`
- Refatorar `LeagueScreen` (zonas coloridas hardcoded com `pos <= 4 ? Champions...`)
- Adicionar `leagueId` em `LeagueState` + lógica de save separado por liga

**Posso retomar quando:** você definir as decisões acima. Te mando perguntas via AskUserQuestion se quiser.

---

### 🟡 Zero testes de componente UI

**Por que sobrou:** dependência nova + ROI baixo.

**O que envolve:**
- Instalar `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
- Configurar `vitest.config.ts` com `environment: 'jsdom'` + setup file
- Escrever testes pra componentes complexos: `MatchStatsScreen` (renderiza MOTM com a maior nota?), `BracketScreen` (mostra só fase atual?), `LeagueScreen` (zona da tabela colorida certa?)
- Manter os testes — eles quebram com mudança visual mesmo sem regressão real

**ROI:** baixo. O motor (`engine/*`) já tem 79 testes blindando a lógica. Testes de UI tradicionalmente:
- Cobrem casos óbvios (já visíveis no Storybook ou inspeção manual)
- Quebram em todo refactor visual (false positive)
- Não pegam bugs sutis de UX (timing, hover state, etc) — pra isso precisaria E2E (Playwright)

**Posso retomar quando:** você quiser cobertura formal pra mostrar pra terceiros (PR review, contratação, certificação). Senão, testes manuais + os 79 do engine bastam.

---

## 📦 Features que ficaram da Fase 5 (não implementadas)

### 🔴 5.1 Conquistas / Achievements

**Por que sobrou:** feature grande, baixa prioridade em jogo single-player.

**O que envolve:**
- `engine/achievements.ts` com tipo `Achievement { id, name, description, icon, condition: (state) => boolean, unlockedAt?: Date }`
- Lista hardcoded: "Ganhar Copa invicto", "Hat-trick em uma partida", "10 jogos sem perder", "Ganhar liga", "Marcar 3+ gols em 5 jogos seguidos", "Aplicar 5-0", etc
- Hook `useAchievements` persistindo em `fp:achievements`
- Avaliar conquistas após cada partida (em `handleLeagueMatchResult`, `handleBracketMatchResult`, `handleViewStats`)
- Toast "🏆 Conquista desbloqueada: X" quando desbloqueia
- Tela `AchievementsScreen` listando todas (desbloqueadas + bloqueadas com hint)
- Botão "Conquistas" no HomeScreen

**Posso retomar quando:** quiser dar mais loop de engajamento. Provavelmente faz mais sentido depois de implementar temporadas múltiplas (5.2 abaixo).

---

### 🔴 5.2 Mercado de transferências

**Por que sobrou:** precisa de **infraestrutura de temporadas múltiplas** primeiro — hoje a liga acaba e a opção é "Nova Temporada", que zera tudo.

**O que envolve (em ordem):**
1. **Conceito de temporada**: `Season { year, league: LeagueState, cup?: BracketState }` em vez dos estados soltos atuais
2. **Tela "Fim de Temporada"** após o último jogo: mostra resultado, oferece "Avançar pra próxima temporada"
3. **Pool de jogadores livres**: ~50 jogadores fictícios gerados ou hardcoded em `data/freeAgents.ts`
4. **Tela de mercado**: lista jogadores livres, OVR, "valor de mercado" virtual, botão "Contratar"
5. **Limite de movimentação**: 1 contratação + 1 dispensa por temporada (pra não virar FIFA)
6. **Persistência**: `fp:season` em vez de `fp:leagueState`/`fp:bracketState`
7. **Histórico de temporadas**: lista das anteriores (campeão, sua posição)

**Posso retomar quando:** você quiser que o jogo tenha progressão de longo prazo. Cuidado: muda fluxo principal, vai mexer em `App.tsx` (já god component).

---

## ✅ Já entregue (referência)

- Fase 1: sons, toast, fade entre telas, H2H, loading state
- Fase 2: tela pós-jogo (Man of the Match, notas, scorers, cartões)
- Fase 3: tutorial, lesões, limite de 3 substituições
- Fase 4: refactor `usePersistedState`, `PlayableStage` centralizado, testes de calibração
- Fase 5.3: tema escuro fixo
- Fase 5.4: ajustes mobile
- Calibração: gols 1.4 → 2.74 por partida
- Retomar progresso ao voltar pra liga/copa
- Botão "Editar Táticas" entre rodadas (liga e copa)
- Botão único "Simular Outros" na copa
- Slider de velocidade do replay (1x/2x/4x)
- CPU varia tática entre rodadas
- Resumo de fadiga/lesão no header da liga
- `Math.random` substituído por RandomFn em `tournament.ts` e `commentary.ts`
- `Pitch.tsx`: removido `as any` (PlayerCoord exportado de steering.ts)
- `MatchScreen.tsx`: removido `eslint-disable` do useEffect (refs pra capturar estado)
- `TutorialOverlay`/`SetupScreen`: migrados pra `useLocalStorage`
- Modal Resume fecha com tecla `Escape`
- Badge de moral no SetupScreen (😄/😊/😐/😕/😟 com valor +/-)
- Lesões aplicadas pra CPU também (5% de chance em jogos simulados)
- Acessibilidade: roles ARIA em modais (resume, tutorial), `role="status"` em toast, aria-label em botões de velocidade, aria-label semântico em pills de H2H, alt descritivo em escudos não-decorativos
- `key={i}` substituído por chave composta com identidade real (`MatchStatsScreen` gols/cartões)
- Mando de campo no engine (+8% no ataque do mandante, teste de regressão incluído)
- H2H detalhado: `H2HRecord.log` com até 5 jogos completos (data + placar), exibido em `<details>` expansível no SetupScreen
- 29 testes novos: `tournament.test.ts` (16) e `playerRating.test.ts` (13). Total: 79 testes
- Refactor parcial do `matchEngine.ts`: constantes movidas pra `matchConfig.ts` (52 linhas), helpers puros pra `matchHelpers.ts` (59 linhas). matchEngine reduziu de 562 → 484 linhas
