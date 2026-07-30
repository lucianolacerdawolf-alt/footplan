# FootPlan — Project Overview

Simulador tático de futebol browser-based com foco em escolhas estratégicas e simulação baseada em dados.

**Live:** [footplan.pages.dev](https://footplan.pages.dev)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript ~6.0 (strict) |
| Build | Vite 8 |
| Testing | Vitest 3 (~30 test files) |
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
│   ├── boardObjectives.ts
│   ├── subSuggestions.ts
│   ├── bracketHelpers.ts
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
├── services/                 # External APIs
│   ├── apiFootball.ts        # SportAPI7 (Sofascore)
│   ├── footballApi.ts        # football-data.org
│   ├── sportApi.ts
│   ├── rosterSync.ts
│   ├── cloudSave.ts
│   └── supabaseClient.ts
└── utils/
    ├── teamUtils.ts
    ├── gameAudio.ts           # Web Audio API (procedural)
    ├── playerOvr.ts
    ├── formatMoney.ts
    ├── countryFlags.ts
    ├── stadiums.ts
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
- **Live roster sync**: football-data.org + SportAPI7 (Sofascore) for real player names, logos, market values
