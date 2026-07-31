# FootPlan — Project Overview

Simulador tático de futebol browser-based com foco em escolhas estratégicas e simulação baseada em dados.

**Live:** [footplan.pages.dev](https://footplan.pages.dev)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript ~6.0 (strict) |
| Build | Vite 8 |
| Testing | Vitest 3 (45 test files, 393 testes) |
| Linting | oxlint |
| Styling | CSS Modules + global CSS |
| Audio | Web Audio API (procedural, zero files) |
| State | React Hooks + localStorage |
| Multiplayer | PeerJS (WebRTC P2P) |
| Cloud Save | Supabase |
| Hosting | Cloudflare Pages |

## Architecture

```
src/
├── App.tsx                  # Root orchestrator (~461 lines)
├── components/              # 30+ screen/UI components + CSS Modules
│   ├── HomeScreen.tsx
│   ├── OnlineLobbyScreen.tsx
│   ├── TeamSelectionScreen.tsx
│   ├── TournamentSetupScreen.tsx
│   ├── SetupScreen.tsx       # Tactics, lineup, formation preview
│   ├── MatchScreen.tsx       # Match replay with pause/subs
│   ├── MatchScreen/          # Sub-components: HalftimePanel, PenaltyShootoutOverlay, TopBar
│   ├── CommentaryFeed.tsx
│   ├── MatchStatsScreen.tsx  # Post-match: MOTM, ratings, stats
│   ├── LeagueScreen.tsx      # League hub + fixtures
│   ├── LeagueTableScreen.tsx # Standings table
│   ├── LeagueSelectScreen.tsx
│   ├── BracketScreen.tsx     # Cup bracket
│   ├── CupSelectScreen.tsx
│   ├── AchievementsScreen.tsx
│   ├── CareerHubScreen.tsx   # Career dashboard
│   ├── CareerTabBar.tsx
│   ├── TransferMarketScreen.tsx
│   ├── TradeProposalScreen.tsx
│   ├── FinancePanel.tsx
│   ├── InboxPanel.tsx
│   ├── TrophyRoomScreen.tsx
│   ├── OpponentAnalysisModal.tsx
│   ├── PlayerDetailModal.tsx
│   ├── TutorialOverlay.tsx
│   ├── ErrorBoundary.tsx
│   ├── Toast.tsx
│   └── shared/              # TacticEditor, TacticPresets
├── data/leagues/             # 12 leagues (6 primeira + 6 segunda divisão)
│   ├── premierLeague.ts, championship.ts
│   ├── laLiga.ts, laLiga2.ts
│   ├── bundesliga.ts, bundesliga2.ts
│   ├── serieA.ts, serieB.ts
│   ├── ligue1.ts, ligue2.ts
│   ├── ligaPortugal.ts, ligaPortugal2.ts
│   ├── generateTeam.ts       # Procedural squad generator
│   └── index.ts
├── engine/                   # Core simulation (pure logic, well-tested)
│   ├── types.ts
│   ├── matchEngine.ts        # Main simulation (~904 lines)
│   ├── matchConfig.ts        # Difficulty, thresholds
│   ├── matchHelpers.ts       # Pure helpers (fatigue, starters, stats)
│   ├── resolveAttack.ts
│   ├── resolveShot.ts
│   ├── calculatePossession.ts
│   ├── commentary.ts         # Match event text generation
│   ├── tacticalCommentary.ts # Tactic-based commentary
│   ├── tournament.ts         # League, cup, fixture generation
│   ├── playerRating.ts
│   ├── rng.ts                # SeededRng for deterministic multiplayer
│   ├── achievements.ts       # 15 unlockable achievements
│   ├── career.ts             # Career progression logic
│   ├── careerEvents.ts
│   ├── transferMarket.ts     # Transfer market engine
│   ├── freeAgentPool.ts
│   ├── fitness.ts            # Fatigue management
│   ├── discipline.ts         # Cards/suspensions
│   ├── morale.ts
│   ├── sponsors.ts
│   ├── seasonClosure.ts
│   ├── inbox.ts
│   ├── boardObjectives.ts    # Metas da diretoria + progresso durante a temporada
│   ├── subSuggestions.ts
│   ├── bracketHelpers.ts
│   ├── squadUtils.ts         # rebalanceForFormation (usado no merge de elenco)
│   ├── careerLabels.ts       # CUP_STAGE_LABELS / CUP_RESULT_LABELS (fonte única)
│   ├── rivalries.ts          # Derby definitions
│   ├── constants.ts
│   ├── tacticPresets.ts
│   └── tacticExplanations.ts
├── hooks/                    # Custom React hooks
│   ├── useMatchSimulation.ts
│   ├── useCareerManager.ts   # Career state (~1019 lines)
│   ├── useLeagueManager.ts
│   ├── useBracketManager.ts
│   ├── useGameFlow.ts
│   ├── useAppShell.ts
│   ├── usePeerConnection.ts
│   ├── useOnlineMatch.ts
│   ├── useAchievements.ts
│   ├── useMatchHistory.ts
│   ├── useH2H.ts
│   ├── useCloudSave.ts
│   ├── useLiveRoster.ts
│   ├── useLocalStorage.ts
│   └── usePersistedState.ts
├── services/                 # External APIs (todas via proxy Cloudflare Worker)
│   ├── footballApi.ts        # football-data.org v4 — 1ªs divisões + Championship
│   ├── sportApi.ts           # SportAPI7 (Sofascore) — Championship, Ligue 2
│   ├── apiFootball.ts        # API-Football v3 — 2ªs divisões
│   ├── rosterSync.ts         # Merge elenco estático × ao vivo + cache validado
│   ├── cloudSave.ts
│   └── supabaseClient.ts
└── utils/
    ├── teamUtils.ts
    ├── gameAudio.ts           # Web Audio API (procedural)
    ├── playerOvr.ts
    ├── formatMoney.ts
    ├── countryFlags.ts
    ├── stadiums.ts
    ├── fireClick.ts
    └── liveMatchPersistence.ts
```

## Key Decisions

- **No backend**: everything runs in-browser with localStorage persistence
- **Deterministic multiplayer**: SeededRng ensures both peers see identical simulation
- **Procedural audio**: Web Audio API, no audio files to download
- **CSS Modules**: scoped styles per component, no CSS-in-JS or Tailwind
- **No router**: manual screen state machine in App.tsx
- **Pure engine**: all match logic is pure functions, testable without React
- **Cloud save**: Supabase for optional cross-device save/restore
- **Live roster sync**: três fontes (football-data.org, SportAPI7, API-Football) atrás
  do mesmo proxy Worker, com fallback offline-first pros elencos estáticos. O cache
  em localStorage é validado por `version` + `staticIds` da liga — cache divergente
  é descartado em vez de confiado (ver `rosterSync.ts`)
- **Limitação conhecida**: os dados de elenco vêm como a fonte informa. Verificado
  em 2026-07-31 que a football-data.org lista jogador em clube errado em alguns
  casos (ex: Illan Meslier no Arsenal) — não há correção possível do nosso lado
  sem heurística arriscada. Ver `.planning/PLANO_PENDENCIAS.md`
