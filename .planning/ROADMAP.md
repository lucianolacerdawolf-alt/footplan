# Roadmap

## Completed Milestones

### M1: Core Gameplay (Fases 1-3) ✓
- Single match vs CPU and hot-seat
- Tactical setup (formation, mentality, intensity, defensive line, width)
- Match simulation engine with commentary
- Post-match stats (MOTM, ratings, goals, cards)
- Sounds (procedural crowd), toast notifications, screen transitions
- H2H tracking, tutorial overlay, injuries, 3→5 substitutions
- Online P2P multiplayer (WebRTC/PeerJS)

### M2: Tournaments (Fase 4) ✓
- Premier League: 38 rounds, standings, fatigue, CPU tactics variation
- FA Cup: 16-team bracket, extra time, penalties
- Resume progress, edit tactics between rounds
- Replay speed control (2x/3x/4x)
- League season stats strip, formation visual preview
- Engine refactor (extract resolveAttack, resolveShot, calculatePossession)

### M3: Polish & Achievements (Fase 5) ✓
- 15 achievements with unlock tracking
- Tactical feedback loop (pre-match, in-match, post-match)
- Calibration to real PL 2025/26 stats (goals, timing)
- Dark theme, mobile adjustments, accessibility (ARIA roles)
- Crowd sounds, dramatic pause on goals, momentum system
- Home advantage (+8% attack), morale system
- 163 tests covering engine, RNG, achievements, steering, tournaments

---

## Current Milestone: M4 — Code Health & Expansion

### Phase 4.1: App.tsx Refactor ✅ CONCLUÍDA
**Goal:** Reduzir App.tsx de 623 linhas para <400 extraindo hooks.
- `useAppShell.ts` — screen state, matchContext, returnScreen, goHome
- `useLeagueManager.ts` — liga state + todos os callbacks de liga
- `useBracketManager.ts` — bracket state + todos os callbacks de copa
- `useGameFlow.ts` — fluxo de partida regular (seleção, início, stats)
- `useOnlineMatch.ts` — lobby online, fluxo WebRTC
- `LeagueSelectScreen` como tela raiz do fluxo de navegação

### Phase 4.2: Data-Driven Leagues ✅ CONCLUÍDA
**Goal:** Suportar múltiplas ligas além da Premier League hardcoded.
- `data/leagues/` com tipos, índice e 5 ligas
- **5 ligas europeias com elencos reais 2024/25:**
  - Premier League (20 times, via legado `data/premierLeague.ts`)
  - La Liga (20 times, `data/leagues/laLiga.ts`)
  - Bundesliga (18 times, `data/leagues/bundesliga.ts`)
  - Serie A (20 times, `data/leagues/serieA.ts`)
  - Ligue 1 (18 times, `data/leagues/ligue1.ts`)
- `cpuProfile` por liga (pressing, defensive line, tempo, passing focus)
- OVR calibrado: `base = ovr - 7` (fix crítico — formula antiga deflatava ~24 pts)
- Badges verificados via HTTP HEAD contra `r2.thesportsdb.com`
- Fix: `cpuProfile` passado corretamente ao modo copa (`useBracketManager`)
- Fix: `returnScreen` restaurado ao voltar à `LeagueSelectScreen`

### Phase 4.3: Mid-Match Substitutions ✅ CONCLUÍDA (entregue antes da numeração M4)
**Goal:** Permitir substituições durante o 2° tempo sem quebrar o replay loop.
- `pausesRemaining`/`subsUsedByWindow` em `useMatchSimulation` — 5 subs distribuídas em até 3 janelas de parada
- `simularSegundoTempo` roda em blocos, então uma troca na pausa do 2° tempo afeta o resto do jogo de verdade
- Fadiga, cartões e steering state preservados entre pausas

### Phase 4.4: Modo Carreira ✅ CONCLUÍDA (7/7 plans)
**Goal:** Progressão multi-temporada com identidade de técnico.
- Múltiplas temporadas com histórico persistente
- Progressão de jogadores (OVR sobe/desce por desempenho e idade)
- Transferências simples entre temporadas (troca direta 1-por-1, sem dinheiro — mercado com orçamento fica pra Fase 4.5)
- Histórico de temporadas com posição/campeão/resultado de copa por ano
- Save único de carreira em chave isolada (`fp:career`), separado de `fp:leagueState:{id}`/`fp:bracketState`

**Plans:** 7/7 plans complete
Plans:
- [x] 04.4-01-PLAN.md — Career engine: player aging/progression, trade evaluation, reputation, season builder (pure functions)
- [x] 04.4-02-PLAN.md — HomeScreen/LeagueSelectScreen/TournamentSetupScreen reuse-via-flag + manager-name capture
- [x] 04.4-03-PLAN.md — Screen/MatchContext union unification across 5 hooks + isCareerMode flag
- [x] 04.4-04-PLAN.md — useCareerManager part 1: start career (seeds all 6 leagues) + league-leg handlers
- [x] 04.4-05-PLAN.md — New screens: CareerHubScreen, TradeProposalScreen, SeasonEndScreen
- [x] 04.4-06-PLAN.md — useCareerManager part 2: cup-leg handlers + trades + season advance
- [x] 04.4-07-PLAN.md — App.tsx wiring: hook call, adapter setters, screen routing, entry flow, overwrite confirmation

### Phase 4.5: Transfer Market Completo 🔴 Backlog
**Goal:** Mercado de transferências entre temporadas.
- Pool de agentes livres
- UI de mercado
- Orçamento e negociação

### Phase 4.6: UI Component Tests 🔴 Backlog
**Goal:** Testes de componente com @testing-library/react.
- MatchStatsScreen, LeagueScreen, BracketScreen
- Setup jsdom environment no vitest config

---

## Backlog (não agendado)

- Playwright E2E tests para 4 fluxos principais
- Custom team builder
- AI difficulty levels além da variação de táticas do CPU
- Seleções nacionais (Copas do Mundo / Eurocopas)
