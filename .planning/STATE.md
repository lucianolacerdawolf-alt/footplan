---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: ready_to_plan
stopped_at: Sessão 2026-07-31 — revisão dos fixes recentes, consolidação de duplicação, docs atualizados
last_updated: 2026-07-31T00:00:00.000Z
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

## O que foi feito na última sessão (2026-07-31)

### Revisão dos fixes recentes
Revisados os 7 commits desde `385ed78` — os dois de roster, os três de P2
(mercado/season-end/lobby), o teste de navegação e a limpeza de CSS. Todos
corretos: verificados por leitura de diff, execução dos testes de regressão, e
checagem ao vivo no app rodando.

### Achado: o bug do "jogador no clube errado" tem duas naturezas distintas
Chamando `fetchCompetitionTeams('pl')` direto no console (bypass de cache e
merge), confirmei que **Illan Meslier já vem listado como goleiro do Arsenal na
resposta crua da football-data.org**. Ou seja:

- Os dois defeitos **internos** corrigidos são reais e continuam corrigidos:
  `readCache` cego (`cc0e8ec`) e `apiFootball` usando `statistics[0]` em vez do
  clube atual (`d14d70b`).
- Mas a anedota específica que motivou a investigação **não vinha deles** — é
  dado ruim do provedor. Documentado em `PLANO_PENDENCIAS.md` como limitação
  conhecida, para não ser reaberto como bug nosso.

### Consolidação de duplicação sobrevivente da colisão entre sessões
- `goesViaMatchday()` estava exportado em `navigation.ts` e **sem nenhum uso** —
  `useGameFlow.ts` mantinha a lógica inline duplicada. Consolidado.
- `CUP_STAGE_LABELS` tinha duas definições idênticas (`engine/careerLabels.ts` e
  cópia local em `CareerHubScreen.tsx`). Passou a importar a compartilhada.

### Correção de documentação
`PROJECT.md` rotulava `apiFootball.ts` como "SportAPI7 (Sofascore)" — está
trocado: `apiFootball.ts` é API-Football v3 e `sportApi.ts` é o SportAPI7.
Corrigido, com a cobertura de liga de cada fonte anotada.

> Nota: a sessão anterior registrou "removido `src/engine/penalties.ts`", mas
> esse arquivo nunca existiu em nenhum commit do histórico (`git log --all
> --follow` vazio). Deve ter sido um arquivo local nunca versionado — sem
> impacto, mas a entrada anterior estava imprecisa.

## Sessão 2026-07-30 — auditorias e correções

- **Auditoria visual em duas rodadas.** 15 achados na primeira (4 dos quais se
  revelaram errados na verificação e estão registrados como tal), e as 6 telas
  que faltavam na segunda. Contraste e alvos de toque **zerados e medidos** em
  Home, Central, Mercado, Sala de Troféus, Conquistas e lobby.
- **Correções de fluxo de telas** (ondas 1-4 do `PLANO_FLUXO_TELAS.md`).
- **Conquistas** agrupadas por categoria, com dica no lugar de `'???'` e barra de
  progresso.
- **Objetivos da diretoria** passaram a mostrar progresso durante a temporada
  (`getObjectiveProgress` + `deriveCupProgress`).
- **Limpeza CSS**: `will-change` em 7 elementos animados e `contain: content` no
  feed de comentários.

## O que foi feito na sessão anterior (2026-07-25)

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
- CloudSave: botão removido do Hub. O sync em segundo plano **continua ativo** no
  código (`useCareerManager.ts:82` carrega, `:98` salva). A afirmação anterior de
  que "a tabela Supabase nunca foi criada" contradiz o `BACKLOG.md`, que diz o
  oposto — não dá pra verificar pelo repositório. Ver a nota em `BACKLOG.md`

## Pending / Ações

### ⚠ SportAPI7 — Mapeamento pendente (4 ligas)
A cota mensal reseta em **1º de agosto de 2026** (amanhã, a partir desta
atualização). Quando resetar, descobrir os `unique-tournament` IDs e `season`
IDs para:
- La Liga 2
- 2. Bundesliga
- Serie B
- Liga Portugal 2

**Como descobrir:** fazer GET em `/category/{N}/scheduled-events/2026-04-26` nas categorias dos países (Espanha, Alemanha, Itália, Portugal), extrair `tournament.uniqueTournament.id` e `season.id` dos eventos. Preencher `LEAGUE_MAP` em `src/services/sportApi.ts` e dar deploy.

### Worker Cloudflare
- Worker `footplan-football-proxy` atualizado com códigos das 2ª divisões no proxy (ELC, BL2, etc.) — deploy feito
- Os códigos que não funcionam (403) foram removidos do `footballApi.ts`

### Limitação conhecida — qualidade do dado de elenco
Verificado ao vivo em 2026-07-31: a football-data.org lista jogador em clube
errado em alguns casos (Illan Meslier aparece como goleiro do Arsenal na
resposta crua da API). O merge do FootPlan reflete fielmente o que a fonte
informa; não há correção possível do nosso lado sem uma heurística arriscada
(ex: "descartar goleiro além de N"), que cortaria elenco legítimo. **Não é bug
em aberto** — é limitação do tier gratuito do provedor.

## Blockers/Concerns

Nenhum bloqueador. A base está verde: build, lint sem erros, **393 testes, 0
falhas**.
