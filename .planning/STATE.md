---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: ready_to_plan
stopped_at: Sessão pós 04.4 — 6 ligas de acesso + SportAPI7 + refino mobile + mercado (comprar/vender/agentes livres) + remoção limite 3 trocas
last_updated: 2026-07-25T15:00:00.000Z
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
- **Live:** [footplan.pages.dev](https://footplan.pages.dev)

## Current Position

- **Milestone:** M4 — Code Health & Expansion
- **Status:** Pronto pra próxima sessão

## O que foi feito na última sessão (2026-07-25)

### 6 Ligas de Acesso (2ª divisão)
- Championship (24 times), La Liga 2 (22), 2. Bundesliga (18), Serie B (20), Ligue 2 (18), Liga Portugal 2 (18)
- 120 times com elencos gerados proceduralmente (OVR por time, distribuição estrelas/reservas, subtipos de posição: CB/FB/CDM/CAM/W/ST)
- Ordenadas lado a lado com a 1ª divisão do mesmo país no LeagueSelectScreen
- Orçamentos, premiações e bilheteria por liga

### Sincronização com APIs reais
- **football-data.org**: 1ªs divisões + Championship → nomes reais, logos, idades
- **SportAPI7 (Sofascore via RapidAPI)**: Championship + Ligue 2 → nomes reais, valor mercado EUR, data nascimento
- Cache 24h (SportAPI7) / 7 dias (football-data.org)
- Auto-sync ao entrar na tela de seleção de time (substituiu botão manual)
- Logos dos times preenchidos do `crest` da API

### Mercado de Transferências
- Removido limite de 3 trocas por temporada
- Removido botão "Propor Troca" do Hub
- Nova aba "💰 Vender Jogadores" no Mercado
- Comprar / Vender / Agentes Livres funcionando com dinheiro

### Refino Mobile
- Slots de time empilhados verticalmente em telas estreitas
- Alvos de toque ≥ 36px (botões voltar, uniforme, elenco, velocidade)
- Fontes mínimas ≥ 10px (relógio "MIN", subtítulos, labels)
- Scoreboard não aumenta no mobile (28px)
- Breakpoint 400px para telas muito pequenas
- Commentary feed com margem lateral reduzida

### Outros
- Fórmula de valor de mercado exponencial (OVR 60=€170K, 80=€16M, 90=€170M)
- Comentários da partida: mais recente no topo
- Time adversário CPU bloqueado na pausa/intervalo
- Botões JOGAR e SIMULAR em todos os modos
- Tabs "Táticas" / "Gerenciar Elenco" no setup, pausa e intervalo
- CloudSave removido do Hub (tabela Supabase nunca foi criada)

## Pending / Ações

### ⚠ SportAPI7 — Mapeamento pendente (4 ligas)
Quando a cota mensal resetar (1º de agosto), descobrir os `unique-tournament` IDs e `season` IDs para:
- La Liga 2
- 2. Bundesliga
- Serie B
- Liga Portugal 2

**Como descobrir:** fazer GET em `/category/{N}/scheduled-events/2026-04-26` nas categorias dos países (Espanha, Alemanha, Itália, Portugal), extrair `tournament.uniqueTournament.id` e `season.id` dos eventos. Preencher `LEAGUE_MAP` em `src/services/sportApi.ts` e dar deploy.

### Worker Cloudflare
- Worker `footplan-football-proxy` atualizado com códigos das 2ª divisões no proxy (ELC, BL2, etc.) — deploy feito
- Os códigos que não funcionam (403) foram removidos do `footballApi.ts`

## Blockers/Concerns

Nenhum.
