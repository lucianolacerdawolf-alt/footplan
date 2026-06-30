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

### Phase 4.3: Mid-Match Substitutions 🔴 Backlog
**Goal:** Permitir substituições durante o 2° tempo sem quebrar o replay loop.
- Pause/resume mechanism em `useMatchSimulation`
- Floating substitution modal no MatchScreen
- Preservar fadiga, cartões e steering state mid-flight

### Phase 4.4: Modo Carreira 🔴 Planejado (próxima sessão)
**Goal:** Progressão multi-temporada com identidade de técnico.
- Múltiplas temporadas com histórico persistente
- Progressão de jogadores (OVR sobe/desce por desempenho e idade)
- Transferências simples entre temporadas (free agents ou troca direta)
- Histórico de temporadas com replay de classificações
- Salvar estado de carreira separado por liga/time

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

- PWA (vite-plugin-pwa) — aguardando ícones 192px/512px do usuário
- Playwright E2E tests para 4 fluxos principais
- Custom team builder
- AI difficulty levels além da variação de táticas do CPU
- Seleções nacionais (Copas do Mundo / Eurocopas)
