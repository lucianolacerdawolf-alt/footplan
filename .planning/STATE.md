---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: ready_to_plan
stopped_at: Phase 04.4 complete (7/7); Fase 4.6 (UI tests) e mobile UX (split de LeagueScreen) entregues ad-hoc; docs atualizados — ready to discuss Phase 4.5
last_updated: 2026-07-24T13:00:00.000Z
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 9
  completed_plans: 7
  percent: 17
---

# STATE.md — Project Status

## Project Reference

- **What:** Simulador tático de futebol browser-based (FootPlan)
- **Core Value:** Escolhas estratégicas e simulação baseada em dados
- **Live:** [lucianolacerdawolf-alt.github.io/footplan](https://lucianolacerdawolf-alt.github.io/footplan/)

## Current Position

Phase: 04.4 (Modo Carreira) — CONCLUÍDA (7/7 plans), verificada manualmente em browser
Plan: N/A — fase fechada

- **Milestone:** M4 — Code Health & Expansion
- **Phase:** 4.6 (UI Component Tests) concluída; 4.5 (Transfer Market Completo) é a próxima grande, ainda não planejada
- **Status:** Sem trabalho em andamento — pronto pra próxima sessão

## Progress

```
M1 ████████████ Core Gameplay ✓
M2 ████████████ Tournaments ✓
M3 ████████████ Polish & Achievements ✓
M4 ███████████░ Refactor & Expansion (Modo Carreira + testes UI + mobile UX entregues; falta 4.5)
```

## O que foi feito em M4 (até 2026-07-24)

### Fase 4.1 — App.tsx Refactor ✓
- App.tsx reduzido de 623 → ~320 linhas; hooks extraídos (`useAppShell`, `useBracketManager`, `useLeagueManager`, `useGameFlow`, `useOnlineMatch`)

### Fase 4.2 — Data-Driven Leagues ✓
- 6 ligas europeias com elencos reais (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Liga Portugal), `cpuProfile` por liga, OVR calibrado (`base = ovr - 7`)

### Fase 4.3 — Mid-Match Substitutions ✓
- 5 substituições em até 3 janelas de parada; `simularSegundoTempo` roda em blocos, então trocas na pausa do 2º tempo afetam o resto do jogo de verdade

### Fase 4.4 — Modo Carreira ✓ (7/7 plans)
- Progressão multi-temporada (todas as 6 ligas evoluem em paralelo), envelhecimento/evolução de jogadores, troca direta entre clubes (limitada a 3/temporada), reputação de técnico, liga+copa juntas por temporada, histórico, save único `fp:career`
- Verificação manual pós-execução achou e corrigiu um gap real: fluxo de "começar nova carreira" (confirmação de sobrescrita) estava construído mas inalcançável — faltava o ponto de entrada no Hub

### Fase 4.6 — UI Component Tests ✓
- `@testing-library/react` + `jsdom` (ambiente isolado por arquivo). Cobertura: 3 telas de seleção de time, LeagueScreen/LeagueTableScreen, MatchStatsScreen, BracketScreen

### Débito técnico + performance (fora da numeração de fase) ✓
- Removido Redux Toolkit não utilizado e `data/premierLeague.ts` legado
- Code-splitting (`React.lazy`) de MatchScreen/MatchStatsScreen/AchievementsScreen
- PWA instalável (manifest, service worker, ícones, safe-area insets)

### Mobile UX — tela de liga dividida (2026-07-24, sessão ad-hoc, sem plano GSD formal) ✓
- `LeagueScreen` fazia 3 coisas numa tela só (classificação + jogo do usuário + outros jogos) — ~580px de scroll no celular. Dividida em `LeagueScreen` (dia de jogo) + `LeagueTableScreen` (nova, consulta pura), aplicado nos dois modos (Campeonatos e Carreira)
- Hub da carreira ganhou botão de destaque "⚽ Jogar" — pula direto pra tática do próximo jogo da liga, sem passar pela tela de rodada

## Pending / Backlog

- **Fase 4.5 — Transfer Market Completo**: orçamento, negociação, agentes livres — expande além da troca direta simples do Modo Carreira. Precisa de discussão de design antes de planejar/codar.
- Ver `BACKLOG.md` na raiz do projeto pra lista completa e priorizada (é a fonte de verdade voltada pro usuário; este arquivo é o snapshot interno do GSD).

## Blockers/Concerns

Nenhum.

## Session Continuity

Last session: 2026-07-24 (sessão de mobile UX — split da tela de liga + investigação de warning de hook order no console, confirmado artefato de dev server, não é bug real)
Stopped at: Docs atualizados (README/BACKLOG/STATE), nada em andamento
Resume: próxima feature grande é Fase 4.5 (Transfer Market) — precisa de discussão de design (`/gsd:discuss-phase`) antes de planejar
