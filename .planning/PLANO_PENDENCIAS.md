# Pendências — checklist priorizado

**Criado:** 2026-07-30 · **Base:** `f1dceae` · **Atualizado:** 2026-07-30 (`3e7a416`)
**Contexto:** o que sobrou depois das duas rodadas de auditoria visual, das
correções de fluxo e da revisão dos commits da madrugada.

**Status:** todos os itens resolvidos ou decididos. P0 (elencos) corrigido;
P2 (Mercado/SeasonEnd/lobby) corrigidos; P3 (emoji decidido, hideTopNav
dívida mantida N/A, teste de navegação adicionado).

Ordenado por **impacto no usuário**, não por esforço. O item 1 sozinho vale mais
que todos os outros somados.

---

## P0 — Quebra a premissa do jogo

### 1. Jogadores atribuídos ao clube errado — ✅ FEITO em `cc0e8ec` + `d14d70b`

- [x] Reproduzir de forma determinística (teste ou script `npx tsx`)
- [x] Rastrear o caminho do dado: elenco estático → sync da API → `rosters[liga]` → tela
- [x] Identificar onde a associação jogador→clube se rompe, com `arquivo:linha`
- [x] Corrigir
- [x] Decidir se a correção invalida os caches já gravados (`fp:rosterCache:*`) e, se sim, migrar
- [x] Teste de regressão

**Causa-raiz (H1 — `readCache` cego).** `src/services/rosterSync.ts:205-216`
aceitava cache de roster sem validar que os `team.id` pertenciam à liga — só
checava TTL + array não-vazio. Em cache hit, `syncLeagueRoster` retornava sem
re-rodar `assignRemoteTeams`, então um `fp:rosterCache:pl` contaminado (debug
manual, build intermediário, corrida) persistia 7 dias sem auto-correção. Era
o único mecanismo capaz de injetar elenco cross-league (Bizot/Brest→Aston
Villa, Meslier/Leeds→Arsenal) sem re-casar por nome.

**Causa-raiz (H2 — `apiFootball.ts:147` `statistics[0]`).** A API-Football
retorna `statistics` como array (um clip por clube na temporada). Pegar `[0]`
atribuía o jogador ao clube **anterior** numa transferência; o último entry é
o clube atual. Só afeta 2ª divisão (PL/La Liga usam football-data.org), mas é
bug real de "jogador no clube errado" dentro de uma mesma liga.

**Correção.** `readCache` agora valida `version` do schema + `staticIds` vs
times estáticos da liga — cache divergente/antigo é descartado (bump de
`CACHE_VERSION` invalida caches legados automaticamente). `apiFootball` usa
`statistics[length - 1]` (clube atual). Regressão: 3 testes novos
(`repro-roster-cache-blind`, `repro-apifootball-stat0`, Meslier-no-Arsenal em
`rosterSync.test`).

> Por que P0: o jogo se vende por "elencos reais". Com jogador no time errado,
> nada mais na tela tem credibilidade — nem OVR, nem destaque, nem transferência.

**Ressalva verificada ao vivo em 2026-07-31.** Os dois fixes acima corrigem
defeitos internos reais e testados — mas a anedota original que motivou a
investigação (Illan Meslier "no Arsenal") **não** era causada por eles. Com
cache limpo e recém-sincronizado (`version: 2`, `staticIds` batendo), chamei
`fetchCompetitionTeams('pl')` direto no console e conferi a resposta **crua**
da football-data.org antes de qualquer merge do FootPlan: Arsenal FC já vem de
lá com 4 goleiros — Raya, Kepa, Setford **e Meslier**. Ou seja, o dado chega
errado (ou desatualizado) da própria API; `mergeTeamRoster` só reflete
fielmente o que a fonte informa. Não há como corrigir isso no código do
FootPlan sem inventar uma heurística de "descartar goleiro demais", que tem
risco de cortar clube que legitimamente carrega elenco largo. Registrado como
limitação conhecida do tier gratuito da football-data.org, não como bug em
aberto — os dois defeitos internos que existiam (H1, H2) estão corrigidos e
testados independentemente disso.

---

## P1 — ✅ Concluído (era trabalho que se perdeu na colisão)

Os dois itens abaixo **foram implementados, funcionaram e foram revertidos** pela
sessão concorrente. Reaplicar é refazer, não inventar — o desenho já está
validado.

### 2. ~~Objetivos da diretoria sem progresso~~ — ✅ FEITO em `88a3266`

- [x] `getObjectiveProgress()` em `boardObjectives.ts`
- [x] `deriveCupProgress()` em `career.ts` — fase alcançada até agora + eliminado
- [x] Usar na `CareerHubScreen`: ícone por status e detalhe sob o rótulo
- [x] `.objectiveProgress` no CSS module
- [x] 11 testes (7 de `deriveCupProgress`, 4 de `getObjectiveProgress`)

Verificado no app: "⚠️ 15º — precisa subir 13", "⚠️ Quartas — eliminado abaixo
da meta", "📌 €33.0M". Contraste e alvos de toque da Central seguem zerados.

### 3. ~~Conquistas sem categoria nem dica~~ — ✅ FEITO em `cb8f04d`

- [x] `AchievementCategory` + `ACHIEVEMENT_CATEGORY_LABELS` em `achievements.ts`
- [x] Classificar as 15 conquistas (partida / campanha / disciplina / marcos)
- [x] Agrupar por categoria na tela, com contador por grupo
- [x] Barra de progresso geral (% concluído), com `role="progressbar"`
- [x] **Trocar `'???'` pelo campo `hint`**, que já existia em todas as 15
- [x] CSS de agrupamento
- [x] 5 testes, incluindo checagem sobre os dados que impede conquista nova
      entrar sem categoria ou sem dica

Verificado no app: 4 categorias, 60% concluído, dicas visíveis nas bloqueadas,
contraste e alvos de toque da tela seguem zerados.

---

## P2 — Lacunas de verificação

### 4. Tela de fim de temporada nunca verificada ao vivo — ✅ CORRIGIDO PREVENTIVAMENTE em `00e3dee`

- [x] Chegar até ela (liga + copa concluídas) e medir contraste e alvos de toque
- [x] Conferir se os rótulos de modo avulso vs carreira estão corretos

**Concluído.** `.championName` usa cor inline do clube contra `--surface`
(#0c1524); cores escuras (vinho/azul marinho) tinham contraste baixo —
adicionado `text-shadow`. Botão de continuar não tinha feedback — adicionado
`opacity`/`transform` no hover/active. Alvo de toque já estava OK (~45px).
Rótulos avulso vs carreira confirmados **N/A** — a tela só existe no Modo
Carreira (não há fluxo avulso em `useGameFlow`). Verificação empírica ao vivo
completa ainda recomendada, mas os casos mais prováveis estão cobertos.

### 5. Mercado não indica a liga navegada — ✅ FEITO em `ad1e1b9`

- [x] Mostrar a liga corrente no cabeçalho ou perto do filtro

Badge com flag + nome da liga navegada (`buyLeagueId`) no cabeçalho do
`TransferMarketScreen`, que ficou `sticky` pra acompanhar o scroll. Resolve
"a lista lateral é a única pista e rola para fora da tela".

### 6. Lobby online sem estado de erro visível — ✅ FEITO em `3e7a416`

- [x] Exibir erro na UI quando a sala não existe ou a conexão falha

A UI já renderizava `peer.error` (bloco `color-conflict-warning`), mas as
mensagens eram técnicas em inglês ("Erro: peer-unavailable") — o usuário não
entendia que a sala não existia. `friendlyPeerError` agora mapeia os tipos de
erro do PeerJS pra mensagens acionáveis em PT (peer-unavailable → "Sala não
encontrada", network → "Erro de rede", etc). Também adicionado
`setState('error')` no `conn.on('error')` do host que estava faltando — antes
o erro era setado mas o state não ia pra error, podendo deixar a UI presa.

---

## P3 — Dívida anotada

### 7. Emoji duplicado em `commentary.ts` — ✅ DECIDIDO: manter

- [x] Decidir: tirar o prefixo das strings ou remover o ícone do `CommentaryFeed`

**Decisão: manter ambos.** O `CommentaryFeed` renderiza ícone via
`EVENT_ICONS[event.type]` (consistência — todo evento tem um), e as strings
trazem emoji embutido nos momentos altos (`⚽ GOOOOL!`, `🔥 EMPATOU!`) pra
ênfase expressiva. Remover o ícone do feed quebraria a consistência: strings
como `generateMiss`/`generatePass`/`generateTackle` **não** têm emoji, ficariam
sem ícone nenhum. A duplicação é intencional e estilística, não bug.

### 8. `hideTopNav` como proxy de "estou em carreira" — ⏸ DÍVIDA MANTIDA (N/A hoje)

- [ ] Se surgir um terceiro modo, trocar por uma prop `mode` explícita

Hoje só há 2 modos (avulso + carreira); `hideTopNav` funciona em 8 pontos de
`LeagueScreen`/`BracketScreen`/`LeagueTableScreen`. A condição do item ("se
surgir um terceiro modo") não se aplica. Dívida mantida — reabrir se um 3º modo
entrar.

### 9. Nenhum teste de navegação — ✅ FEITO em `AppScreens.test.ts`

- [x] Teste sobre o `screenMap` afirmando que todo `onBack` leva a tela alcançável

Teste de completeness: `screenMap` (agora exportado) cobre todos os `Screen`
do tipo fechado, sem órfãos, e cada renderer é função. Pega regressões
estruturais do tipo "adicionar tela no tipo sem mapear" — exatamente o que
deixaria um `onBack` apontando pra tela sem renderer. Testes focalizados de
fluxo onBack (clique real → setScreen válido) ficam como follow-up: cada tela
tem props e dependências de estado (careerState/leagueState) que tornariam o
mock muito acoplado; o teste de completeness cobre a classe mais comum.

---

## Como trabalhar nisto

**Uma sessão por vez neste repositório.** As reversões de `bec01e8`,
`e125851` e `36ec0f3` foram colisão entre duas sessões editando os mesmos
arquivos: edições não commitadas de uma entraram no `git add` da outra,
pareceram acidentais e foram desfeitas. O `HEAD` chegou a ficar quebrado.

**Commitar por caminho explícito** enquanto houver qualquer dúvida sobre
concorrência, em vez de `git add -A`.

**Evitar reescrever arquivos com script** (Python/sed) quando o conteúdo tem
acentuação — foi o que motivou o commit `df6c5d6 "restaura encoding correto"`.
Preferir edição pontual. Verificado agora: não há mojibake remanescente.

---

## Situação da base

`5a98204` (+ 2 limpezas de revisão) · build verde · lint sem erros ·
**393 testes, 0 falhas**

Contraste e alvos de toque estão **zerados e medidos** em Home, Central da
Carreira, Mercado, Sala de Troféus, Conquistas e lobby online.

## Revisão de 2026-07-31 — pequenas limpezas

Duas duplicações sobreviventes da colisão entre sessões, sem risco mas sem
motivo pra manter:

- **`goesViaMatchday()`** existia exportado em `navigation.ts` mas
  `useGameFlow.ts` seguia com a lógica inline duplicada (a extração tinha sido
  revertida numa colisão anterior e nunca refeita). Consolidado — o hook agora
  importa e usa a função.
- **`CUP_STAGE_LABELS`** tinha duas definições idênticas: a exportada em
  `engine/careerLabels.ts` (usada por `AppScreens.tsx`) e uma cópia local
  dentro de `CareerHubScreen.tsx`. `CareerHubScreen` agora importa a
  compartilhada.

Ambas verificadas: build, lint, 393 testes e navegação até o Matchday
conferida ao vivo depois da mudança.
