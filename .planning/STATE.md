---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: M4 — Code Health & Expansion
status: "Fase 4.2 concluída — 5 ligas europeias com elencos reais 2024/25"
stopped_at: navegação corrigida + badges Ligue 1 verificados (2026-06-30)
last_updated: "2026-06-30"
progress:
  total_phases: 5
  completed_phases: 2
  percent: 40
---

# STATE.md — Project Status

## Project Reference

- **What:** Simulador tático de futebol browser-based (FootPlan)
- **Core Value:** Escolhas estratégicas e simulação baseada em dados
- **Live:** [lucianolacerdawolf-alt.github.io/footplan](https://lucianolacerdawolf-alt.github.io/footplan/)

## Current Position

- **Milestone:** M4 — Code Health & Expansion
- **Phase:** 4.3 — Mid-Match Substitutions (backlog) / Modo Carreira (planejado)
- **Status:** Fases 4.1 e 4.2 concluídas. Próximo passo: planejar Modo Carreira (nova sessão)

## Progress

```
M1 ████████████ Core Gameplay ✓
M2 ████████████ Tournaments ✓
M3 ████████████ Polish & Achievements ✓
M4 ████████░░░░ Refactor & Expansion (65%)
```

## O que foi feito em M4 (até 2026-06-30)

### Fase 4.1 — App.tsx Refactor ✓
- App.tsx reduzido de 623 → ~320 linhas
- Hooks extraídos: `useAppShell`, `useBracketManager`, `useLeagueManager`, `useGameFlow`, `useOnlineMatch`
- `LeagueSelectScreen` como tela raiz do fluxo (usuário escolhe o modo primeiro, depois a liga)

### Fase 4.2 — Data-Driven Leagues ✓
- 5 ligas europeias com elencos reais 2024/25:
  - **Premier League** (20 times) — dados via `data/premierLeague.ts` legado
  - **La Liga** (20 times) — `data/leagues/laLiga.ts`
  - **Bundesliga** (18 times) — `data/leagues/bundesliga.ts`
  - **Serie A** (20 times) — `data/leagues/serieA.ts`
  - **Ligue 1** (18 times) — `data/leagues/ligue1.ts`
- `cpuProfile` (pressingMod, defensiveLineMod, tempoMod, passingFocusMod) por liga
- Bug corrigido: `cpuProfile` agora passado ao modo copa (`useBracketManager`)
- OVR calibrado com fórmula `base = ovr - 7` (era `ovr - 30` — causava deflação de ~24 pts)
- Todos os badges verificados via HEAD request contra `r2.thesportsdb.com`
- Fix de navegação: `returnScreen` restaurado ao voltar para `LeagueSelectScreen`

## Pending / Backlog

- **Modo Carreira** — planejado para próxima sessão (múltiplas temporadas, progressão de jogadores, transferências simples)
- **4.3 Substituições mid-match** — pausar partida, trocar jogadores fora de posição
- **4.4 Transfer Market** — mercado completo entre temporadas
- **4.5 UI Component Tests** — @testing-library/react para telas principais
- **PWA** — vite-plugin-pwa, aguardando ícones 192px/512px do usuário

## Blockers/Concerns

Nenhum.

## Session Continuity

Last session: 2026-06-30
Stopped at: badges Ligue 1 corrigidos + loop de navegação resolvido
Resume: começar planejando Modo Carreira
