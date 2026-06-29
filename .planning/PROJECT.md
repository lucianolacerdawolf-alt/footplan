# FootPlan — Project Overview

Simulador tático de futebol browser-based com foco em escolhas estratégicas e simulação baseada em dados.

**Live:** [lucianolacerdawolf-alt.github.io/footplan](https://lucianolacerdawolf-alt.github.io/footplan/)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript ~6.0 (strict) |
| Build | Vite 8 |
| Testing | Vitest 3 (163 tests) |
| Linting | oxlint |
| Styling | CSS Modules + global CSS |
| Rendering | SVG (pitch) + HTML/CSS |
| Audio | Web Audio API (procedural, zero files) |
| State | React Hooks + localStorage |
| Multiplayer | PeerJS (WebRTC P2P) |
| Hosting | GitHub Pages |

## Architecture

```
src/
├── App.tsx                  # Root orchestrator (623 lines — target: <200)
├── components/              # 14 screen/UI components
│   ├── HomeScreen.tsx
│   ├── OnlineLobbyScreen.tsx
│   ├── TeamSelectionScreen.tsx
│   ├── TournamentSetupScreen.tsx
│   ├── SetupScreen.tsx       # Tactics, lineup, formation preview
│   ├── MatchScreen.tsx       # Match replay with pause/subs
│   ├── Pitch.tsx             # SVG field with ball animation
│   ├── CommentaryFeed.tsx
│   ├── MatchStatsScreen.tsx  # Post-match: MOTM, ratings, stats
│   ├── LeagueScreen.tsx      # Premier League hub + standings
│   ├── BracketScreen.tsx     # FA Cup bracket
│   ├── AchievementsScreen.tsx
│   ├── TutorialOverlay.tsx
│   └── Toast.tsx
├── data/
│   └── premierLeague.ts      # 20 PL 2025/26 teams with real rosters
├── engine/                   # Core simulation (pure logic, well-tested)
│   ├── types.ts
│   ├── matchEngine.ts
│   ├── matchConfig.ts
│   ├── matchHelpers.ts
│   ├── resolveAttack.ts
│   ├── resolveShot.ts
│   ├── calculatePossession.ts
│   ├── commentary.ts
│   ├── tacticalCommentary.ts
│   ├── tournament.ts         # League, cup, fatigue, CPU tactics
│   ├── playerRating.ts
│   ├── steering.ts           # Player movement on SVG pitch
│   ├── rng.ts                # SeededRng for deterministic multiplayer
│   ├── achievements.ts       # 15 unlockable achievements
│   └── constants.ts
├── hooks/                    # Custom React hooks
│   ├── useMatchSimulation.ts
│   ├── usePeerConnection.ts
│   ├── useAchievements.ts
│   ├── useMatchHistory.ts
│   ├── useH2H.ts
│   ├── useLocalStorage.ts
│   └── usePersistedState.ts
└── utils/
    ├── teamUtils.ts
    ├── audio.ts
    └── playerOvr.ts
```

## Key Decisions

- **No backend**: everything runs in-browser with localStorage persistence
- **Deterministic multiplayer**: SeededRng ensures both peers see identical simulation
- **Procedural audio**: Web Audio API, no audio files to download
- **CSS Modules**: scoped styles per component, no CSS-in-JS or Tailwind
- **No router**: manual screen state machine in App.tsx
- **Pure engine**: all match logic is pure functions, testable without React
