# Pendências — checklist priorizado

**Criado:** 2026-07-30 · **Base:** `f1dceae`
**Contexto:** o que sobrou depois das duas rodadas de auditoria visual, das
correções de fluxo e da revisão dos commits da madrugada.

Ordenado por **impacto no usuário**, não por esforço. O item 1 sozinho vale mais
que todos os outros somados.

---

## P0 — Quebra a premissa do jogo

### 1. Jogadores atribuídos ao clube errado

- [ ] Reproduzir de forma determinística (teste ou script `npx tsx`)
- [ ] Rastrear o caminho do dado: elenco estático → sync da API → `rosters[liga]` → tela
- [ ] Identificar onde a associação jogador→clube se rompe, com `arquivo:linha`
- [ ] Corrigir
- [ ] Decidir se a correção invalida os caches já gravados (`fp:rosterCache:*`) e, se sim, migrar
- [ ] Teste de regressão

**Evidência.** Numa prévia Arsenal × Aston Villa, os destaques traziam **Illan
Meslier** (goleiro do Leeds) pelo Arsenal, e **Marco Bizot** e **João Gomes**
(Wolves) pelo Aston Villa. Os jogadores existem e são reais — estão no clube
errado.

**Onde investigar.** `src/services/rosterSync.ts`, `src/hooks/useLiveRoster.ts`,
`handleMarketRosterSynced` em `useCareerManager.ts`, e o merge entre elenco
estático (`src/data/leagues/*.ts`) e a resposta da API.

**Pista, não diagnóstico.** O agente que investigava parou por limite de conta.
O último registro foi que a lista de times é estática mas os elencos são
mesclados ao vivo, e que ia checar colisão de chave de cache no proxy Cloudflare
Worker. Isso é hipótese — tratar como ponto de partida, não como causa.

**Hipóteses a testar.** Merge casando por índice de array em vez de por id (uma
resposta com ordem ou tamanho diferente desloca todo mundo); `fp:rosterCache:<liga>`
lido/escrito com a chave de outra liga; id de time da API confundido com o id
interno (`pl-t0`); vazamento entre 1ª e 2ª divisão.

> Por que P0: o jogo se vende por "elencos reais". Com jogador no time errado,
> nada mais na tela tem credibilidade — nem OVR, nem destaque, nem transferência.

---

## P1 — Trabalho já feito que se perdeu

Os dois itens abaixo **foram implementados, funcionaram e foram revertidos** pela
sessão concorrente. Reaplicar é refazer, não inventar — o desenho já está
validado.

### 2. Objetivos da diretoria sem progresso

- [ ] `getObjectiveProgress()` em `boardObjectives.ts` — status (`atingido` /
      `no-caminho` / `fora`) + frase curta do estado atual
- [ ] `deriveCupProgress()` em `career.ts` — fase alcançada **até agora** e se já
      foi eliminado (`deriveCupResult` só responde com a copa encerrada)
- [ ] Usar na `CareerHubScreen`: ícone por status e detalhe sob o rótulo
- [ ] `.objectiveProgress` no CSS module
- [ ] Testes dos três tipos de meta (posição, copa, orçamento)

**Problema.** Todo objetivo aparece como "📌 pendente" até o último dia da
temporada, mesmo com `leaguePosition` e o estágio da copa já disponíveis. O
usuário descobre que falhou quando já não dá para reagir.

**Estado atual.** Sobrou uma referência solta de `getObjectiveProgress` no
engine; `deriveCupProgress`, o uso na tela, o CSS e os testes foram revertidos.

### 3. Conquistas sem categoria nem dica

- [ ] `AchievementCategory` + `ACHIEVEMENT_CATEGORY_LABELS` em `achievements.ts`
- [ ] Classificar as 15 conquistas (partida / campanha / disciplina / marcos)
- [ ] Agrupar por categoria na tela, com contador por grupo
- [ ] Barra de progresso geral (% concluído)
- [ ] **Trocar `'???'` pelo campo `hint`**, que já existe em todas as 15 e nunca
      foi usado
- [ ] CSS de agrupamento

**Problema.** 15 cards numa lista plana, e as bloqueadas mostram `'???'` na
descrição — não dizem o que fazer. O dado para resolver isso já está no modelo.

**Estado atual.** Revertido por inteiro, inclusive o CSS.

---

## P2 — Lacunas de verificação

### 4. Tela de fim de temporada nunca verificada ao vivo

- [ ] Chegar até ela (liga + copa concluídas) e medir contraste e alvos de toque
- [ ] Conferir se os rótulos de modo avulso vs carreira estão corretos

Foi corrigida pela varredura de código (`SeasonEndScreen.module.css`, 3 regras de
`opacity`), mas **nunca foi medida**. É a única das telas auditadas sem
verificação empírica.

### 5. Mercado não indica a liga navegada

- [ ] Mostrar a liga corrente no cabeçalho ou perto do filtro

Ao filtrar por time de outra liga, o contexto some — a lista lateral é a única
pista e ela rola para fora da tela.

### 6. Lobby online sem estado de erro visível

- [ ] Exibir erro na UI quando a sala não existe ou a conexão falha

Hoje o campo aceita qualquer código e a falha só aparece no console.

---

## P3 — Dívida anotada

### 7. Emoji duplicado em `commentary.ts`

- [ ] Decidir: tirar o prefixo das strings ou remover o ícone do `CommentaryFeed`

Mesmo mecanismo que corrigi em `tacticalCommentary.ts`: o `CommentaryFeed` já
renderiza ícone via `EVENT_ICONS[event.type]`, e as strings trazem outro. Ficou
de fora porque ali o emoji tem valor expressivo (`⚽ GOOOOL!`) e são muitas
strings — é decisão de tom, não bug.

### 8. `hideTopNav` como proxy de "estou em carreira"

- [ ] Se surgir um terceiro modo, trocar por uma prop `mode` explícita

Usado assim em 8 pontos de `LeagueScreen` e `BracketScreen`. Funciona hoje; só
não escala.

### 9. Nenhum teste de navegação

- [ ] Teste sobre o `screenMap` afirmando que todo `onBack` leva a tela alcançável

As correções de fluxo (ondas 1-4) são exatamente o tipo de regressão que um teste
assim pegaria — e nenhuma delas tem cobertura.

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

`f1dceae` · build verde · lint sem erros · **369 testes, 0 falhas**

Contraste e alvos de toque estão **zerados e medidos** em Home, Central da
Carreira, Mercado, Sala de Troféus, Conquistas e lobby online.
