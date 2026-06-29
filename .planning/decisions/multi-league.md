# Decision: Multi-League Support

## Context
Premier League data is hardcoded in `data/premierLeague.ts`. To support multiple leagues, design decisions are needed.

## Pending Questions

### 1. Where do league definitions live?
- **Option A:** Multiple files in `data/leagues/` (one per league: `premierLeague.ts`, `laLiga.ts`, etc.)
- **Option B:** Single file `data/leagues.ts` with all league data
- **Option C:** JSON files loaded at build time

### 2. How does the user select a league?
- **Option A:** New "Choose League" screen before HomeScreen
- **Option B:** Dropdown on HomeScreen
- **Option C:** Dropdown on TournamentSetupScreen

### 3. Does the league affect rules beyond teams?
- Number of rounds (38 vs 30 vs 34)
- European competition slots (Champions League, Europa League, Conference)
- Relegation (not currently implemented)
- Tiebreaker rules

### 4. How does save data work across leagues?
- Single save slot (changing league wipes progress)
- Separate saves per league (`fp:leagueState:pl`, `fp:leagueState:laliga`)
- Multi-slot save system

### 5. Does CPU behavior vary by league?
- More defensive in Serie A
- More attacking in Bundesliga
- Same behavior everywhere

---

**Status:** Awaiting user decisions
