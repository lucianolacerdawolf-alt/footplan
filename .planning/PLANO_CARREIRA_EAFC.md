# Plano — Features de Modo Carreira inspiradas no EA Sports FC 26

> Origem: 8 fotos do modo Carreira de Treinador do EA FC 26 → ideias mapeadas
> contra o código do FootPlan. 5 lacunas reais escolhidas para execução (a
> Academia de Base ficou de fora, no roadmap).

## Status das fases

| Fase | Feature | Status |
|------|---------|--------|
| 5 | Painel "Minha Carreira" (retrospectiva) | ✅ **Concluída** (`824ffe7`) |
| 1 | Contratos & Renovações | ✅ **Concluída** |
| 2 | Mercado de Treinador (trocar de clube) | ✅ **Concluída** |
| 4 | Conversas com atletas | ✅ **Concluída** |
| 3 | Imersão pré-jogo (treino + coletiva + feed) | ✅ **Concluída** |

**Ordem de execução recomendada** (risco crescente, cada fase entregável sozinha):
Fase 5 → Fase 1 → **Fase 4** → Fase 3 → Fase 2. (A numeração é temática; todas as
5 lacunas mapeadas já foram entregues.)

**Objetivo geral:** dar profundidade de gestão (contratos), longevidade/ambição
(trocar de clube), imersão (rituais pré-jogo + conversas) e retrospectiva (painel de
carreira), reutilizando ao máximo o motor existente, sem quebrar saves antigos nem o
sync de nuvem.

## Padrões existentes a reutilizar (não reinventar)

- **Compat de save:** todo campo novo em `CareerState`/`Player` é opcional + acessado
  por getter com backfill defensivo — espelhar `getFinances`/`getInbox`/
  `getFreeAgentPool` (`src/engine/career.ts`). `isValidCareerState` não pode rejeitar
  saves sem os campos novos.
- **Dinheiro:** `calculateMarketValue`, `calculateWeeklyWage`, `computeWageBill`,
  `computeWeeklyIncome`, `initialBudget`, `getLeaguePrizeMoney`/`getCupPrizeMoney`
  (`src/engine/transferMarket.ts`).
- **Evolução/pool:** `progressPlayer`, `shouldRetire`, `progressAllLeagues`,
  `assignInitialAges`, `createCareerSeason` (career.ts); `refreshFreeAgentPool`,
  `generateFreeAgentPool` (`src/engine/freeAgentPool.ts`).
- **Moral/fadiga:** `applyMoraleToTeam`, `moraleDelta` (`src/engine/morale.ts`);
  `applyMatchFatigue` (`src/engine/fitness.ts`), `recoverFatigue` (tournament.ts);
  `getStarters`/`getStarterCount` (`src/engine/squadUtils.ts`).
- **Inbox:** `InboxMessage` + criadores em `src/engine/inbox.ts`; painel `InboxPanel`.
- **Hooks de carreira:** `useCareerManager` orquestra; sub-hooks em `src/hooks/career/`
  (`useCareerSeason`, `useTransferManager`, `useCareerMatchFlow`, `useCareerInbox`).
- **UI:** `CareerHubScreen`, `CareerTabBar` (abas), `AppScreens.tsx` (screenMap),
  `types/navigation.ts` (Screen). A aba **Elenco** reabre o `SetupScreen` no modo
  "Gerenciar Elenco" (`handleEditCareerLeagueTactics` → `renderSquad`); **Meu Clube**
  → `career-trophy-room`.

---

## Fase 5 — Painel "Minha Carreira" ✅ CONCLUÍDA (`824ffe7`)

Retrospectiva agregada da jornada, **derivada read-only** de `history` +
`transferHistory` + `manager.reputation` — sem novo estado persistente.

**Entregue:**
- `src/engine/careerStats.ts` (funções puras): `computeCareerSummary(history,
  reputationNow)` → `seasonsPlayed`, `leagueTitles`, `cupTitles`, `wins/draws/losses`,
  `goalsFor/Against`, `winPct`, `managerOfSeasonCount`, `bestLeaguePosition`,
  `reputationNow`; `careerHighlights(history, transfers)` → artilheiro de carreira,
  maior contratação (BUY), melhor temporada financeira.
- `src/components/CareerSummaryPanel.tsx` + `.module.css`: grade de *stat tiles*
  responsiva + destaques.
- Renderizado **no topo da Sala de Troféus** (`TrophyRoomScreen`, aba Meu Clube)
  quando há ≥1 temporada concluída — `reputation` passada via `AppScreens`.
- Testes: `src/engine/__tests__/careerStats.test.ts` (7) + ajustes em
  `TrophyRoomScreen.test.tsx` (escopo com `within`).

**Desvios do plano original (registrados):**
- **Não** criou tela nova `career-my-career`: virou painel dentro do
  `career-trophy-room` (menos navegação, melhor UX, o plano já permitia "sub-aba de
  Meu Clube").
- `clubsManaged` e `reputationPeak` **adiados**: `history` não guarda o `clubId` do
  usuário por temporada e a reputação absoluta por temporada não é armazenada — voltam
  quando a Fase 2 (multi-clube) enriquecer o histórico.

---

## Fase 1 — Contratos & Renovações ✅ CONCLUÍDA

**Entregue:**
- `Player.contractSeasonsLeft?: number` (opcional, só populado na carreira) + getter
  `getContractSeasonsLeft` com backfill (`DEFAULT_CONTRACT_SEASONS = 2`).
- `assignInitialContracts` (career.ts) — 1–4 temporadas com peso em 2–3, idempotente,
  aplicado nas 12 ligas no `handleStartCareer` (junto de `assignInitialAges`).
- `expireContracts(userTeam)` (career.ts) — no fechamento da temporada decrementa o
  contrato de todo o elenco do usuário; quem chega a 0 sai do elenco (sem contrato,
  valores recalculados) e entra no mercado. `renewPlayerContract(player, years)` — helper
  puro que estende + recalcula salário pelo valor atual, usado pelo hook e pelo UI.
- `renewalCost(player, years)` (transferMarket.ts) — `round(marketValue × 0.10 × years)`,
  clampado a ≥0; renovações a qualquer momento (decisão: gestão interna, não transferência).
- `refreshFreeAgentPool` ganhou `newEntrants` (as saídas entram no pool sem re-envelhecer —
  já evoluíram junto do elenco) e **nunca corta os recém-chegados** (um jogador real não
  pode sumir só porque o pool estava cheio).
- `handleRenewContract(playerId, years)` (useTransferManager) — valida orçamento, debita o
  custo, estende contrato e recomputa a folha nos 3 espelhos do elenco (rosters + league +
  cup). `handleAdvanceSeason` (useCareerSeason) integra `expireContracts` antes do
  `createCareerSeason` e emite 2 mensagens (`BOARD_UPDATE` não-obrigatórias): **Contratos
  encerrados** (saídas) e **Contratos a expirar** (≤1 temporada do novo elenco).
- UI: badge `📋 N temp.` + destaque ⏳ (≤1) e botão **Renovar** na visão **Gerenciar Elenco**
  (`SetupScreen.renderSquad`, prop `onRenewContract` só no modo elenco da carreira — nunca na
  preparação de partida), com sync do clone local via `renewPlayerContract`. Card **"Contratos
  a expirar"** na `CareerHubScreen` com renovação direta.
- Testes: `src/engine/__tests__/contracts.test.ts` (11) + casos em `transferMarket.test.ts`
  (3), `inbox.test.ts` (3) e `useCareerManager.test.ts` (5). Suíte: **444** (422 + 22).

**Desvios do plano original (registrados):**
- `expireContracts` retorna `{ squad, departures }` (não `{ squad, pool, departures }`) — a
  montagem do pool fica no caller via `refreshFreeAgentPool(..., departures)`: evita
  re-envelhecer as saídas e evita o ciclo de import career.ts↔freeAgentPool.ts.
- `progressPlayer` agora **preserva `contractSeasonsLeft`** (achado crítico: ele reconstruía
  o jogador com campos fixos — sem isso o contrato sumiria a cada avanço de temporada).
- Renovar é **+1 ano por toque** (decisão aprovada); o card do hub e o botão do elenco usam
  o mesmo `handleRenewContract(playerId, 1)`.

---

## Fase 4 — Conversas com atletas (diálogos afetando moral) ✅ CONCLUÍDA

A moral hoje é **do time** (`Team.morale`, -10..+10), não por jogador. As
conversas usam essa moral de time, integrada ao efeito moral→ataque do motor.

**Entregue:**
- **Modelo:** `CareerState.playerConversations?: PlayerConversation[]` (opcional —
  compat com saves antigos); `PlayerConversation { id, playerId, playerName, topic,
  message, seasonYear, round, responded }`. `topic`: `'bench'`, `'form'`,
  `'praise'`, `'transfer-listed'`, `'contract'`. Getter `getPlayerConversations`
  com backfill `[]` (`src/engine/career.ts`).
- **Engine** (`src/engine/playerConversations.ts`):
  - `maybeGenerateConversation(state, ctx, rng)` — 0–1 conversa/rodada. Prioridade:
    resultado recente (dérbi perdido → `form`; derrota por ≥2 → `form`; vitória por
    ≥2 → `praise`) e, na falta, sinais estruturais (titular ≥78 OVR fora do XI →
    `bench`; na `transferListPlayerIds` → `transfer-listed`; contrato ≤1 →
    `contract`) com 45% de chance. Nunca gera em rodada que já tem conversa não
    respondida. `getDerbyName` dispara o tom de dérbi.
  - `CONVERSATION_RESPONSES` — por tópico, 3 respostas com `moraleDelta` (apoiar +2,
    honesto 0, duro −2). `respondToConversation(conv, choiceIdx)` retorna a escolha.
- **Hooks** (`src/hooks/career/useCareerConversations.ts`):
  - `handleMaybeGenerateConversation(ctx)` — usado pelo `useCareerMatchFlow` em
    `handleCareerLeagueMatchResult` (pós-jogo) e `handleNextCareerLeagueRound`
    (sinais estruturais da rodada seguinte). `≤1/rodada` garantido no motor.
  - `handleRespondConversation(convId, choiceIdx)` — aplica `moraleDelta` via
    `applyMoraleToTeam` nos 3 espelhos (rosters + league + cup), marca `responded` e
    dá toast.
- **UI:** painel **"Conversas com Atletas"** (`ConversationsPanel.tsx` + módulo CSS)
  na `CareerHubScreen` (acima da inbox), reusando o visual do `InboxPanel`: jogador +
  badge de não-respondidas; ao abrir, fala + 3 respostas → toast de moral.
- Testes: `src/engine/__tests__/playerConversations.test.ts` (13) + casos em
  `useCareerManager.test.ts` (7) e `CareerHubScreen.test.tsx` (3). Suíte: **477**.

**Desvios do plano original (registrados):**
- Conversa de `bench` exige OVR ≥78 no banco (não "titular no banco" absoluto — o
  motor não rastreia titularidade individual, só o XI por posição).
- `handleRespondConversation` vive em hook novo (`useCareerConversations`), não no
  `useCareerInbox` — a geração também é exposta ali e injetada no
  `useCareerMatchFlow` via prop (sem acoplar o match flow ao hook).

---

## Fase 3 — Imersão pré-jogo (treino + coletiva + feed) ✅ CONCLUÍDA

Três subpartes modulares; (a) e (b) tocam moral/fadiga (valor real de sim), (c) é
tempero. As três foram entregues.

**(a) Treino pré-jogo** — `src/engine/training.ts`: `TrainingChoice = 'intense' |
'light' | 'rest'`; `TRAINING_PRESETS` com `moraleDelta`/`fatigueDelta` (Intenso +3
moral/+25 fadiga, Leve +1/−10, Descanso −2/−30, clamps [-10,10] e [0,100]);
`applyTrainingChoice(team, choice)` aplica nos 3 espelhos; `isTrainingDone`.
Estado: `preMatchDoneRound?: number` (getter `getPreMatchDoneRound`) — evita repetir
na mesma rodada. UI: card **"Preparação Pré-Jogo"** na `CareerHubScreen` (visível
quando há próxima partida) com os 3 botões de treino + coletiva.

**(b) Coletiva de imprensa** — `src/engine/pressConference.ts`: `getPressContext`
(dérbi via `getDerbyName` > favorito/azarão via `getAvgOvr` > neutro);
`generatePressConferenceQuestion(userTeam, opponentTeam, rng)` → 1 pergunta por
contexto com 2-3 respostas (`PressResponse { label, moraleDelta }`);
`respondToPressConference(q, choiceIdx)`. Estado: `pressDoneRound?: number`.
UI: modal na `PreMatchPrepCard` (padrão de `TutorialOverlay`) → toast de moral.

**(c) Feed social (FC Hub)** — `src/engine/socialFeed.ts`:
`generateSocialFeed(input)` → 3-4 posts de tempero (último resultado, posição na
tabela, contratação de destaque, adversário) — sem efeito de jogo. UI: card rolável
**"📱 FC Hub"** na `CareerHubScreen`. Derivado read-only do estado (sem persistência).

**Hooks** (`src/hooks/career/useCareerPreMatch.ts`): `handleApplyTraining(choice)`,
`handleOpenPressConference(opponentTeam)`, `handleRespondPressConference(choiceIdx)`,
`handleClosePressConference()`. Aplicam fadiga/moral nos 3 espelhos
(rosters + league + cup). `handleAdvanceSeason` reseta os flags pré-jogo (as rodadas
zeram no novo calendário).

Testes: `src/engine/__tests__/preMatch.test.ts` (15) + casos em
`useCareerManager.test.ts` (6) e `CareerHubScreen.test.tsx` (4). Suíte: **502**.

**Desvios do plano original (registrados):**
- Treino é aplicado imediatamente ao escolher no card da Central (antes de apertar
  Jogar), em vez de dentro do `handlePlayCareerLeagueMatch` — mais simples e o flag
  `preMatchDoneRound` já impede repetição na mesma rodada.
- Coletiva tem 2 perguntas por contexto (não 1), escolhidas por rng — mantém o
  "1 pergunta por abertura" do plano, só amplia a variedade.
- Feed gera posts com dados determinísticos do estado (sem rng) — estável entre
  renders, sem estado novo.

---

## Fase 2 — Mercado de Treinador (trocar de clube)

**Modelo de dados**
- `CareerState.jobOffers?: JobOffer[]`; `JobOffer { id, clubId, leagueId, clubName,
  reputationRequired, offeredSeasonYear }`. `history` já guarda `leagueId` por
  temporada; opcional adicionar `clubId` na entrada (habilita `clubsManaged` na Fase 5).

**Engine** (novo `src/engine/jobMarket.ts`)
- `generateJobOffers(state, rng)`: no fim de temporada, com base em `manager.reputation`
  + desempenho, rola 0–3 ofertas. Elegibilidade por "prestígio" do clube (`getAvgOvr`
  sobre `state.rosters[liga]`) casado à faixa de reputação. Exclui o clube atual.
- `applyClubChange(state, offer)`: reconstrói a carreira no novo clube reutilizando
  `createCareerSeason(newUserTeam, rosters[offer.leagueId], getLeague(offer.leagueId))`.
  **Preserva** `manager` (nome + reputação), `history`, `rosters`, `currentSeasonYear`,
  `freeAgentPool`. **Reseta** `leagueId`, `finances`, `sponsorTier`/`sponsorName`,
  `boardObjectives`, `transferListPlayerIds`, `season`. Limpa `jobOffers`. Resultado
  precisa passar `isValidCareerState`.

**Hooks** (novo `src/hooks/career/useCareerJobMarket.ts`)
- `handleAcceptJobOffer(offerId)`: `applyClubChange` + `setCareerState` + toast +
  `setScreen('career-hub')`. Confirmação obrigatória (modal) — deixar o clube é
  irreversível. `handleDeclineJobOffer(offerId)`.
- Geração das ofertas dentro de `handleAdvanceSeason`, anexando em `jobOffers`.

**UI** — nova tela **`career-job-market`** (novo `Screen` + `screenMap`), acessível
pela aba **Escritório** e como card no hub/fim de temporada quando há ofertas. Lista:
escudo, clube, liga, reputação exigida, **Aceitar** (modal) / **Recusar**. Badge de
"ofertas" no hub.

**Testes** — ofertas só acima do limiar de reputação; aceitar troca liga/clube/
calendário e zera finanças/patrocínio/objetivos; manager+reputação+history preservados;
`jobOffers` limpo; `isValidCareerState` verdadeiro; sync de nuvem OK.

---

## Cross-cutting (todas as fases)

- **Compat de save + nuvem:** campos novos opcionais; getters com backfill; nada de
  acesso direto. `isValidCareerState` aceita saves sem os campos novos; o `CareerState`
  resultante continua válido (ver `useCareerCloudReconciliation.test.ts`).
- **Mobile:** telas novas usam `.app-screen`/padrões de card já responsivos (ver fix do
  SetupScreen, `f31f704`). Sem overflow horizontal; alvos de toque ≥36px.
- **i18n/tom:** textos em pt-BR, mesmo tom do resto (inbox, toasts).

## Verificação (end-to-end)

1. **Testes unitários** por função de engine nova (Vitest), seguindo
   `src/engine/__tests__/career.test.ts` e `seasonClosure.test.ts`.
2. **Testes de hook** (`renderHook`/`act`), no estilo de
   `src/hooks/__tests__/useCareerManager.test.ts` (usar `startPlCareer`).
3. **Browser (dev server)**: iniciar carreira, avançar temporadas e validar cada fase.
   Navegar via `javascript_tool` (`el.click()`) — cliques por coordenada não são
   confiáveis com o painel do browser não exibido. ⚠️ O dev server tem Supabase real
   configurado (`.env`): criar carreiras de teste **grava na nuvem** — use um contexto
   isolado/deslogado ou limpe a sessão antes.
4. `npm run build` verde e suíte de testes verde (422 no fim da Fase 5) + os novos.

## Fora de escopo (roadmap, não pedido agora)
- Academia de Base (juvenis + olheiros + plano de desenvolvimento).
- Escalações salvas múltiplas para alternar por adversário.
