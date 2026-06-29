# Roadmap

## Completed Milestones

### M1: Core Gameplay (Fases 1-3)
- Single match vs CPU and hot-seat
- Tactical setup (formation, mentality, intensity, defensive line, width)
- Match simulation engine with commentary
- Post-match stats (MOTM, ratings, goals, cards)
- Sounds (procedural crowd), toast notifications, screen transitions
- H2H tracking, tutorial overlay, injuries, 3→5 substitutions
- Online P2P multiplayer (WebRTC/PeerJS)

### M2: Tournaments (Fase 4)
- Premier League: 38 rounds, standings, fatigue, CPU tactics variation
- FA Cup: 16-team bracket, extra time, penalties
- Resume progress, edit tactics between rounds
- Replay speed control (2x/3x/4x)
- League season stats strip, formation visual preview
- Engine refactor (extract resolveAttack, resolveShot, calculatePossession)

### M3: Polish & Achievements (Fase 5)
- 15 achievements with unlock tracking
- Tactical feedback loop (pre-match, in-match, post-match)
- Calibration to real PL 2025/26 stats (goals, timing)
- Dark theme, mobile adjustments, accessibility (ARIA roles)
- Crowd sounds, dramatic pause on goals, momentum system
- Home advantage (+8% attack), morale system
- 163 tests covering engine, RNG, achievements, steering, tournaments

---

## Current Milestone: M4 — Code Health & Expansion

### Phase 4.1: App.tsx Refactor 🟡 (in progress)
**Goal:** Reduce App.tsx from 623 lines to <200 by extracting hooks.
- `useGameFlow.ts` — regular match flow (team select, match start, stats)
- `useLeagueFlow.ts` — league state, callbacks, navigation
- `useBracketFlow.ts` — bracket state, callbacks, navigation
- `useAppNavigation.ts` — screen routing, resume prompt, back/continue logic
- `useOnlineMatch.ts` — online lobby, WebRTC match flow

### Phase 4.2: Data-Driven Leagues 🟡
**Goal:** Support multiple leagues beyond hardcoded Premier League.
- **Needs user decisions:** See `.planning/decisions/multi-league.md`
- Extract league data to `data/leagues/` folder
- League-specific rules (rounds, European slots, CPU behavior)
- League selection UI
- Save isolation per league

### Phase 4.3: Mid-Match Substitutions 🟡
**Goal:** Allow substitutions during 2nd half without breaking replay loop.
- Pause/resume mechanism in `useMatchSimulation`
- Floating substitution modal in MatchScreen
- Preserve fatigue, cards, and steering state mid-flight

### Phase 4.4: Transfer Market (Backlog) 🔴
**Goal:** Multi-season progression with player transfers.
- Season concept and multi-season save
- Free agent pool
- Transfer market UI
- Season history

### Phase 4.5: UI Component Tests 🟡
**Goal:** Add component-level tests with @testing-library/react.
- MatchStatsScreen, LeagueScreen, BracketScreen
- Setup jsdom environment in vitest config

---

## Backlog (unscheduled)

- Playwright E2E tests for 4 main flows
- International leagues (La Liga, Serie A, Bundesliga)
- Custom team builder
- Player career mode
- AI difficulty levels beyond CPU tactics variation
