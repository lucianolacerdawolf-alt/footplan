# Backlog FootPlan

Lista do que está pendente. Itens marcados com 🟢 são pequenos (<1h), 🟡 médios (1-3h), 🔴 grandes (3h+).

Cada item pendente vem com **Por que sobrou**, **O que envolve** e **Posso retomar quando** pra você decidir se vale o esforço.

---

## 🐛 Bugs / Limpeza pendente

### ✅ Pênaltis: narração fora de ordem + crash potencial + lookup de fadiga frágil — CORRIGIDO (2026-09)

**O que era:** três defeitos no fluxo de pênaltis do `matchEngine.ts`:
1. **Narração não batia com a simulação** — o log de eventos recomputava o cobrador com `Math.floor(idx/2) % len`, que diverge da simulação na morte súbita (a rodada continua de 5 em diante). O feed narrava um jogador diferente do que realmente chutou.
2. **Crash potencial** — com todos os jogadores de linha expulsos, `i % 0` virava NaN e `takePenalty(undefined)` crashava em `shooter.attributes`.
3. **Lookup de fadiga frágil** — o pênalti durante o jogo buscava fadiga em `fatigueHome.get(id) ?? fatigueAway.get(id)` em vez do mapa do time correto (só funcionava porque ids de jogador são únicos entre times).

**Correção.** `PenaltyResult.kicks` agora registra o `shooterId` de cada cobrança (simulação e overlay interativo), e o log de eventos usa esse id em vez de recomputar o índice. Guarda no início de `simularPenaltisInterno` para time sem cobradores (perde por W.O., sem crash). Fadiga do pênalti em jogo usa o mapa do time correto. 2 testes de regressão novos em `matchEngine.test.ts` (cobrador narrado = cobrador simulado, incl. morte súbita; e sobrevivência sem jogadores de linha). Suíte: 591 testes, 0 falhas.

### ✅ Cloud Save falha em silêncio absoluto — CORRIGIDO (2026-08-04)

**Por que sobrou:** encontrado na revisão de docs de 2026-07-31, ao investigar uma contradição entre `BACKLOG.md` e `STATE.md` sobre a tabela Supabase.

**O que envolvia:** `useCloudSave` já expunha `status` (`'saving' | 'saved' | 'offline'`) e `retry`, mas `useCareerManager` só consumia `loadFromCloud` e `enqueueCloudSave`. Nenhuma tela lia o status. Se o save na nuvem falhasse — tabela ausente, credencial errada, rede caída — o usuário nunca ficava sabendo.

**Correção.** `useCareerManager` passou a expor `cloudStatus`/`retryCloudSave`, threadados por `App.tsx` → `AppScreens.tsx` até a `CareerHubScreen`, que agora mostra um indicador discreto de backup na nuvem: `saving`/`saved` em cinza, `offline` em âmbar com botão **"Tentar de novo"** (chama o `retry` que já existia). `idle`/`loading` não renderizam nada — sem ruído pra quem joga offline (sem Supabase configurado). 4 testes novos em `CareerHubScreen.test.tsx` cobrem os quatro estados. Suíte: 564 testes, 0 falhas.

> Contexto: a config do Supabase foi verificada ao vivo em 2026-08-04 — RLS ligado nas duas tabelas, `careers` com policy "own career" (`user_id = auth.uid()`), `roster_snapshots` com read aberto e write `ALL` a anônimo (decisão em aberto, ver diagnóstico de produção).

### 🟡 Elenco ao vivo pode vir com jogador no clube errado (limitação do provedor)

**Por que sobrou:** não é bug nosso. Verificado em 2026-07-31 chamando `fetchCompetitionTeams('pl')` direto e inspecionando a resposta crua: a football-data.org lista Illan Meslier como goleiro do Arsenal antes de qualquer código do FootPlan tocar o dado.

**O que envolve:** mitigar exigiria heurística (ex: "descartar goleiro além de N por time"), com risco de cortar elenco legítimo. Alternativa mais segura seria cruzar com uma segunda fonte antes de aceitar, o que multiplica chamadas e cota.

**Posso retomar quando:** só se virar incômodo real. Os dois defeitos *internos* que existiam já foram corrigidos (`cc0e8ec`, `d14d70b`).

### 🟡 Re-sincronizar elencos no Supabase — 5 segundas divisões (limite diário API-Football)

**Por que sobrou:** em 2026-08-03, o `npm run rosters:sync` gravou o snapshot global das 12 ligas em `roster_snapshots` (`id = 'global'`), mas só **7** vieram ao vivo (football-data.org): pl, laliga, ligue1, serieA, bundesliga, championship, ligaPortugal. As outras 5 (laliga2, bundesliga2, serieB, ligue2, ligaPortugal2) dependem da **API-Football**, que estourou o **limite diário de 100 requisições** (e `laliga2` respondeu 403) — entraram como elencos **estáticos**.

**O que envolve:** quando o limite diário da API-Football resetar (dia seguinte), rodar de novo:

```bash
npm run rosters:sync
```

O script busca as 12 ligas ao vivo, grava o cache local de cada uma e sobrescreve o snapshot no Supabase (`roster_snapshots`, linha `global`). Nada mais muda — o app já lê do Supabase antes de bater na API.

**Como confirmar que deu certo:** `npx vite-node scripts/read-rosters.ts` deve mostrar as 5 ligas (laliga2, bundesliga2, serieB, ligue2, ligaPortugal2) com jogadores reais (ex: nomes de atletas conhecidos), em vez dos gerados sinteticamente. Se `laliga2` seguir com 403, é restrição da conta naquela competição — registrar e seguir.

**Posso retomar quando:** a partir do dia seguinte à última execução (o limite diário reseta), ~1 minuto pra rodar.

---

## 🚀 Produção — checklist do GUIA_PRODUCAO.md

Itens de infra externa que o [GUIA_PRODUCAO.md](GUIA_PRODUCAO.md) lista pro lançamento. Estado marcado conforme **verificável pelo repositório**; o que depende de console/servidor externo fica como "a verificar" com o passo exato.

| # | Item | Estado | Como verificar / o que fazer |
|---|------|--------|------------------------------|
| 1 | **Supabase: fechar RLS de `roster_snapshots`** | 🟡 A verificar | Rodar [`scripts/sql/harden-rls-roster-snapshots.sql`](scripts/sql/harden-rls-roster-snapshots.sql) no SQL Editor. Script idempotente; ao final deve sobrar só a política de SELECT. Verificação externa: `SELECT policy_name, cmd FROM pg_policies WHERE tablename = 'roster_snapshots';` |
| 2 | **Re-sync global dos elencos (5 segundas divisões)** | 🟡 Pendente | Ver item "Re-sincronizar elencos no Supabase" acima — mesmo esforço. `SUPABASE_SERVICE_ROLE_KEY=... npm run rosters:sync` |
| 3 | **Worker: secrets** | 🟡 Parcial | `.env` documenta que `RAPIDAPI_KEY` já foi setada (`npx wrangler secret put RAPIDAPI_KEY`). **`FOOTBALL_API_KEY` a confirmar** (`npx wrangler secret put FOOTBALL_API_KEY`). Verificação externa: `npx wrangler secret list` |
| 4 | **Worker: rate limit em produção** | 🟡 Pendente de deploy | O código do rate limit (20 req/min por IP) **já está** em `worker/football-proxy.js`. Falta o `npx wrangler deploy` pra valer. Verificação externa: bater no proxy >20x/min e ver 429 |
| 5 | **PeerServer próprio (multiplayer)** | 🔴 Pendente | `.env` **sem** `VITE_PEER_*` → jogo ainda usa o broker público `0.peerjs.com` (sem SLA). Subir servidor (Render/Fly/Railway ou docker) + rebuild do site com as 4 vars |
| 6 | **Android: keystore de release + AAB** | 🔴 Pendente | `android/keystore.properties` **não existe** (`Test-Path` = False). Sem ele o build.gradle só gera debug. Criar keystore, preencher o properties, `gradlew bundleRelease`, bump de `versionCode`/`versionName` |
| 7 | **Play Store: URL de política de privacidade** | ✅ Pronto | `public/privacy.html` + `public/terms.html` existem e estão linkados na Home (`HomeScreen.tsx:114`). Só falta a URL no formulário de publicação |
| 8 | **Visibilidade de crash** | ✅ Pronto | `ErrorBoundary` com versão + link de issue; `fp:lastCrash` persistido; logs globais com versão (descrito no GUIA_PRODUCAO §5, já em código) |

> **Como manter atualizado:** a cada item concluído, marcar aqui e não reabrir depois. Itens 5 e 6 são os únicos bloqueados por trabalho real (infra nova + keystore/Play).

---

## 🏗️ Saúde do código

### ✅ Refatoração de UI, fluxo e design — 2026-08-10 (concluída)

Resposta a uma análise de código/fluxo/design. **9 melhorias** aplicadas (tudo menos tema claro, adiado a pedido). Detalhe completo em [`REFATORACAO_UI_2026-08.md`](REFATORACAO_UI_2026-08.md).

- **Design system:** tokens semânticos de cor (`--win/--draw/--loss/--positive/--negative/--warning/--text-muted` em `index.css`) substituindo ~20 arquivos com hex solto (zero mudança visual); primitivos em `src/components/ui/` (`Button` com variantes + `glow`, `Card`, `StatTile`, `Icon` SVG); ícones de interface migrados de emoji pra SVG na Central; CTA "hero" (`.start-btn`, 8 telas) consolidado em `<Button glow>` e a classe global removida.
- **Fluxo/layout:** `CareerHubScreen` reorganizada de "God screen" (14 cards empilhados) pra 2 colunas ação×informação, com grid desktop ≥900px; sync de elencos movido pra "Ajustes avançados" recolhível.
- **Arquitetura:** bundle do `useCareerManager` agrupado num único prop `career` (screenProps/`AppScreensProps` caíram de ~90 → ~40 campos); navegação de carreira consolidada num objeto estável `nav` (`CareerNav`); helper de índice de mata-mata deduplicado (`BracketScreen` computa o índice internamente).
- **Performance:** `React.memo` em **todas as 9 telas de carreira** (CareerHub, TransferMarket, JobMarket, SeasonEnd, LeagueTable, LeagueScreen, BracketScreen, TradeProposal, TrophyRoom). TrophyRoom usa comparador custom (o `currentSeason` é comparado por valor). Skips confirmados empiricamente.

Suíte: 573 testes, 0 falhas. `tsc`/`oxlint` limpos.

**Follow-ups não feitos:** tema claro (#10, adiado); dedup profundo dos handlers liga↔carreira nos hooks; estilos inline estáticos restantes em `MatchScreen`/`HalftimePanel`; adoção incremental dos primitivos nas telas ainda não migradas.

### ✅ Auditoria 2026-07-24 — melhoria contínua (concluída)

Todas as 27 melhorias foram aplicadas. Nenhum item pendente.



---

## 📦 Features grandes

### ✅ Mercado de Transferências com dinheiro — CONCLUÍDO

TransferMarketScreen com 4 abas (Comprar Jogadores, Vender Jogadores, Agentes Livres, Propor Troca), avaliação determinística por threshold de valor de mercado, multiplicador via slider, retenção de 20% da diretoria em vendas, histórico de transferências. Busca por nome cobre as 12 ligas; navegação liga → time → jogador com badge da liga corrente no cabeçalho.

### ✅ Cloud Save (Supabase) — CONCLUÍDO no código

Cliente Supabase com auth anônimo, save/load automático em segundo plano, cache offline-first com fallback pra localStorage. O código está ativo: `useCareerManager.ts:82` carrega da nuvem no mount e `:98` enfileira save a cada mudança de estado; `services/cloudSave.ts` faz upsert na tabela `careers`.

> ⚠️ **Contradição entre docs, não resolvida.** Este arquivo afirmava "Tabela `careers` criada no projeto Supabase", enquanto `.planning/STATE.md` afirmava "CloudSave removido do Hub (tabela Supabase nunca foi criada)". A parte de "removido do Hub" **é verdadeira** — não existe botão de nuvem na `CareerHubScreen`. Já a existência da tabela é infra externa, impossível de verificar pelo repositório. **Confirmar no painel do Supabase.**
>
> **Se a tabela não existir, a falha é 100% silenciosa.** Verificado no código: `useCloudSave.ts:30` captura o erro e seta `status: 'offline'`, mas `useCareerManager.ts:66` só extrai `loadFromCloud` e `enqueueCloudSave` — **nunca lê `status`**, e nunca chama `retry`. Ou seja, nenhum ponto da UI mostra que o backup em nuvem está falhando. O usuário acredita ter save na nuvem e não tem.

### 🟡 SportAPI7 — Mapeamento pendente (4 ligas)

**Por que sobrou:** cota mensal gratuita da SportAPI7 (RapidAPI) estourou durante desenvolvimento. Faltam os `uniqueTournament` IDs de La Liga 2, 2. Bundesliga, Serie B e Liga Portugal 2.

**O que envolve:** quando a cota resetar (**1º de agosto de 2026**), descobrir os IDs via `GET /category/{N}/scheduled-events/2026-04-26` e preencher `LEAGUE_MAP` em `src/services/sportApi.ts`.

**Já feito (2026-09):** a rota de discovery `category/{N}/scheduled-events/{date}` foi liberada no allowlist do worker proxy (`worker/football-proxy.js`) — agora dá pra descobrir os IDs via proxy (que tem a chave RapidAPI) em vez de depender de console externo. Falta só: `npx wrangler deploy` do worker + descobrir os IDs + preencher `LEAGUE_MAP`.

**Posso retomar quando:** a partir de 1º de agosto de 2026 — 10 minutos pra resolver.

---

## ✅ Já entregue (referência)

- **Modo Carreira — Squad Management**: escalação visual (`SquadManagementScreen` + `FormationPitch`), clique-a-clique pra trocar titular/reserva da mesma posição, troca de formação preserva quem já é titular e nunca escala suspenso/lesionado
- **Modo Carreira — Fadiga e Cartões**: desgaste real persiste entre partidas (antes `currentFatigue` era escrito mas nunca lido de volta após o jogo), 3 amarelos na temporada ou 1 vermelho direto suspendem por 1 jogo, liberado ao avançar rodada/estágio
- **Modo Carreira — Finanças e Inbox**: orçamento inicial por liga, folha salarial pelo valor de mercado do elenco, renda semanal, caixa de entrada com mensagens obrigatórias (lesão) bloqueando "Avançar Rodada" até serem lidas
- **Modo Carreira — Sala de Troféus**: histórico de temporada enriquecido (artilheiro, W/D/L, gols, delta de orçamento, técnico da temporada), `TrophyRoomScreen` com cards expansíveis por ano
- **Partida em texto**: removido o campo visual animado (`Pitch.tsx`) de todas as partidas — placar, posse, momentum, timeline de gols e feed de comentário já cobriam a narração; véspera de jogo agora mostra as formações em texto em vez de diagrama SVG
- **Velocidade de replay recalibrada**: progressão geométrica (1×/2×/4×/8×) em vez de linear — 4x roda um tempo de 45' em ~15s reais, antes eram ~30s
- **Som removido**: `utils/audio.ts` (Web Audio API procedural) e todas as chamadas `sfx.*` tirados — feedback sonoro ainda não estava bom o suficiente
- **Modo Carreira (base)**: progressão multi-temporada (todas as 12 ligas evoluem junto), envelhecimento/evolução de jogadores, mercado de transferências com dinheiro, reputação de técnico, liga+copa disputadas juntas por temporada, histórico de temporadas, save único (`fp:career`)
- **Mobile — tela de liga dividida**: "Ver Liga" era uma tela só misturando classificação + jogo do usuário + outros jogos da rodada (~580px de scroll no celular). Dividida em `LeagueScreen` (dia de jogo) + `LeagueTableScreen` (classificação, consulta pura) — aplicado nos dois modos (Campeonatos e Carreira). Hub da carreira ganhou botão de destaque "⚽ Jogar" que pula direto pra tática do próximo jogo, sem passar pela tela de rodada
- **12 ligas europeias** (6 de 1ª divisão + 6 de acesso: Championship, La Liga 2, 2. Bundesliga, Serie B, Ligue 2, Liga Portugal 2) com elencos gerados por OVR do time e subtipos de posição (CB/FB/CDM/CAM/W/ST)
- **Sincronização de elenco ao vivo** via football-data.org (proxy Cloudflare Worker) + SportAPI7 (Sofascore via RapidAPI) — nomes reais, idades, logos, valores de mercado EUR
- **Mercado de Transferências**: 3 abas (Comprar/Vender/Agentes Livres), slider de multiplicador, retenção de 20% da diretoria, avaliação determinística por threshold
- **OVR por subtipo de posição**: detecção automática de CB/FB/CDM/CM/CAM/W/ST com pesos específicos por função
- **Bônus de elite no OVR**: acima de média ponderada 78, bônus adicional cresce com a distância até o teto (+6) — separa "muito bom" de "referência mundial" sem mexer no OVR de ninguém abaixo disso (zero recalibração necessária em `generatePlayer()`/`calculateMarketValue()`)
- **Fix**: botão de "Iniciar Carreira"/"Iniciar Temporada" ficava clicável durante a sincronização de elenco ao vivo — corrida entre o clique e o fetch podia iniciar a carreira com dados estáticos (sem idade real), fazendo jogadores famosos tipo Lewandowski saírem com idade aleatória em vez da real. Botão agora desabilita até o sync terminar
- **Cloud Save (Supabase)**: auth anônimo, save/load automático, cache offline-first
- **PWA instalável** (manifest, service worker, ícones, safe-area insets pro notch/Dynamic Island no iOS, funciona offline)
- **Persistência de sessão de partida ao vivo** — sobrevive a F5, restaura em pausa
- **Motor de simulação em blocos**: substituições numa pausa do 2º tempo afetam o resto do jogo de verdade
- **5 substituições em até 3 janelas de parada** (não é mais um contador único)
- **3 presets de tática** com tooltips explicativos
- **Fix**: desarme agora muda a posse de fato (antes a narração e o resultado divergiam)
- **Fix**: fadiga recalibrada (sem mais quedas irreais de OVR durante a partida)
- **Fix**: OVR de goleiro gerado proceduralmente calibrado corretamente
- **Fix**: bola segue passador/receptor real do evento, com arco proporcional à distância
- **Fix**: layout mobile — campo, tabela de classificação e botões de nav (`min-width` fixo cortando texto) não estouram mais a tela pequena; `box-sizing: border-box` global elimina scroll vertical fantasma
- **UI**: label "Posse de Bola" padronizado, goleiro com anel na cor do time, jogadores não somem mais ao pausar, banner "Continuar" cobre todos os fluxos de entrada
- **Débito técnico**: removido Redux Toolkit não utilizado; `App.tsx`/`useBracketManager.ts` não importam mais direto do arquivo de dados legado (`data/premierLeague.ts`, agora só usado internamente por `data/leagues/premierLeague.ts`)
- **Performance**: code-splitting (`React.lazy`) de `MatchScreen`, `MatchStatsScreen` e `AchievementsScreen` — bundle inicial ~10.5% menor (gzip); auditoria de touch targets (tooltips, presets de tática, controle de velocidade) pro mínimo recomendado de toque no mobile
- **Testes de UI**: `@testing-library/react` + `jsdom` configurados (ambiente isolado por arquivo, motor continua em `node`); cobertura pras 3 telas de seleção de time, tabela de classificação, tela de estatísticas pós-jogo (artilheiros, melhor em campo, cartões, histórico) e chaveamento de copa (partida do usuário, simular outros, fase de campeão)
- Sistema de conquistas (15 achievements)
- Tema escuro, fade entre telas
- Tela pós-jogo completa (MOTM, notas, gols, cartões, breakdown tático)
- Tutorial interativo, H2H detalhado, CPU varia tática por rodada e por liga
- 346 testes automatizados (motor + sincronização de elenco + componentes UI + Modo Carreira)

### ✅ Melhorias de código (auditoria 2026-07-24) — parte 2

- **Path aliases `@/`**: configurado em `tsconfig.app.json`, `vite.config.ts`, `vitest.config.ts`. 40 imports atualizados de `../../../` para `@/`
- **TacticPresets + TacticEditor integrados**: `MatchScreen.tsx` (-71 linhas), `SetupScreen.tsx` (-53 linhas), `HalftimePanel.tsx` (-48 linhas). Total: -172 linhas de duplicação
- **Momentum visual**: barras coloridas no placar que pulsan com o momentum de cada time (lê de `engineStateRef.current.momentumHome`/`momentumAway`)
- **OnlineLobbyScreen CSS Module**: ~30 inline styles migrados para `OnlineLobbyScreen.module.css` — classes como `.roomCodeBadge`, `.teamCard`, `.connectBtn`, `.tacticsPanel`
- **CSS do momentum**: classes `.momentum-indicator`, `.momentum-track`, `.momentum-bar` em App.css com transições e animação de glow
- **`range()` doc corrigido**: documentação dizia `[min, max]` inclusivo, código sempre foi `[min, max)` exclusivo
- **`getGoalkeeper()` sem crash**: retorna `Player | null` em vez de estourar com `!` se não houver GK. Todos os 5 callers tratam null seguramente
- **`MatchResult.halftimeHomeScore` / `halftimeAwayScore`**: campos tipados no resultado em vez de parse frágil de string de narração. `achievements.ts` parou de depender do formato exato do texto em português
- **`App.tsx` refatorado**: 273 linhas de `if/else` substituídas por mapa declarativo `Record<Screen, ScreenRenderer>` em `src/components/AppScreens.tsx`. App.tsx de 602→344 linhas (-43%)
- **Tipos centralizados**: `Screen`, `MatchContext`, `TournamentMode` em `src/types/navigation.ts` — removidos de 7 hooks duplicados. `useOnlineMatch.ts` tinha versão defasada sem as telas de carreira
- **`src/engine/morale.ts`**: cálculo de moral extraído de 2 hooks duplicados (`useLeagueManager`, `useCareerManager`)
- **`src/engine/bracketHelpers.ts`**: `getStageMatches()` + `updateStageMatch()` substituem 6 blocos if/else duplicados nos hooks de bracket. `useBracketManager` -18 linhas, `useCareerManager` -30 linhas
- **Componentes compartilhados**: `TeamSlot`, `SquadList`, `TacticEditor`, `TacticPresets` em `src/components/shared/` — prontos para uso nos componentes existentes
- **`getAvgOvr()`**: removido de 4 componentes, centralizado em `utils/teamUtils.ts`
- **`useLiveRoster`**: reseta `lastError` antes de cada sync + bloco `catch` para exceções não-tratadas
- **`useAchievements`**: usa `setData(prev => ...)` funcional para evitar race condition em avaliações rápidas
- **`MatchStatsScreen`**: `useMemo` em `calculateRatings`, `manOfTheMatch`, `goalScorers`, `cardEvents`, `topPerformers`
- **`usePeerConnection`**: timeout de 15s com mensagem "Tempo limite de conexão" — evita estado "conectando" eterno
- **`TutorialOverlay`**: focus trap — foca botão "Pular" ao abrir, restaura foco ao fechar
- **Acessibilidade**: `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space) em 10+ divs interativos (squad-row, select-slot)
- **`Pitch.tsx`**: `React.memo` no componente SVG mais caro do app (22+ jogadores + animação)
- **`LeagueScreen`**: stats da temporada em `useMemo` em vez de IIFE no render
- **`steering.ts`**: `Record<Position, number>` substitui `Record<string, number>`; `determineState` usa `MatchEvent['type']` em vez de `string`
- **`btnGlow`**: anima `opacity` (GPU-composited) em vez de `box-shadow` (repaint)
- **Tactical counter**: condição `high-line` reordenada antes de `high-press` — bônus 1.22 não é mais shadowado pelo 1.18
- **`simulateRegulationTime()`**: helper extraído do boilerplate "run two halves" duplicado em `simularPartidaRapida` e `simularKnockout`
- **`progressPlayer`**: preserva proporções de atributos ao envelhecer (escala existentes em vez de regenerar do zero)
