# Auditoria visual — FootPlan

**Auditoria:** 2026-07-29 · **Correções aplicadas:** 2026-07-30
**Base:** 21 capturas em `audit-20260729-183623/` (viewport mobile ~780px e desktop)
**Método:** leitura das capturas → confirmação no código → correção → verificação no app rodando.

## Situação

Os 15 achados foram tratados. **Quatro deles se revelaram errados ou exagerados
quando fui confirmar no código** — estão registrados na seção "Correções ao
próprio relatório", porque um relatório que esconde os próprios erros não serve
para consulta futura.

| # | Achado | Situação |
|---|---|---|
| 1 | Placar ilegível | ✅ Corrigido |
| 2 | Painel de pausa sem scrim | ✅ Corrigido |
| 3 | Formulário de táticas duplicado | ✅ Corrigido |
| 4 | Vermelho decorativo | ❌ Achado incorreto — era cor de clube |
| 5 | Três acentos competindo | ⚠️ Parcial — só o CTA âmbar era real; corrigido |
| 6 | Rótulo maior que o dado | ✅ Corrigido |
| 7 | Destaques com 3 goleiros | ✅ Corrigido, com teste |
| 8 | Espaço morto no Matchday | ✅ Corrigido |
| 9 | Cards com contratos diferentes | ✅ Corrigido |
| 10 | CTA fora de alcance | ✅ Corrigido |
| 11 | Contraste baixo | ✅ Corrigido na raiz |
| 12 | Topbar abarrotada | ✅ Corrigido |
| 13 | Alvos de toque pequenos | ⚠️ Achado incorreto — já havia 24px; melhorado a 32px |
| 14 | Três ênfases ciano | ⚠️ Exagerado — eram duas; ajustado o que restava |
| 15 | Emoji duplicado | ✅ Corrigido |

---

## Correções ao próprio relatório

### O "vermelho decorativo" (#4) era a cor do clube

Afirmei que vermelho estava sendo usado como cor de seleção e decoração, em
conflito com o ciano da marca. Errado. Ao conferir:

- `TournamentSetupScreen.tsx:147` — `style={{ borderColor: team.color }}`
- `MatchdayScreen.tsx` — a barra dos destaques usa `background: homeTeam.color`
- `MatchScreen.tsx` — a abreviação e a posse usavam `color: home.color`

Nas capturas o Arsenal aparecia com borda vermelha porque **o vermelho é a cor do
Arsenal**. Na tela de partida os dois times eram Union Berlin e Bayern, ambos de
vermelho. O app aplica cor de clube de forma consistente e semântica; eu li a
consequência (muito vermelho na tela) como se fosse a causa.

Os tokens confirmam a intenção: `--home: #3b82f6` e `--away: #ef4444` existem em
`index.css` justamente para diferenciar mando de campo.

### Os dígitos do placar (#1) não estavam cinza

Descrevi "dígitos cinza-escuro sobre fundo escuro". `.score-num` usa
`var(--text-primary)` (#dde6f0), que dá ~13:1 sobre `--surface`. A captura pegou
o meio da animação `goalFlash`, que interpola a cor até `--accent-2` (âmbar).

**O crítico #1 seguia válido, mas por outro motivo:** o problema era a
`.score-label` (abreviação do time), com `opacity: 0.45` aplicado sobre a cor do
clube. Cores de clube vão de `#000000` a `#FFFFFF`, então tingir texto de 11px a
45% de opacidade sobre fundo escuro tornava ilegível qualquer clube de cor escura.

### Os alvos de toque (#13) já estavam tratados

Afirmei que os botões "?" estavam "bem abaixo dos 44px". Havia já um
`::before` de 24×24 em `App.css`, com comentário citando o mínimo do WCAG 2.5.8 —
tecnicamente conforme em AA. O problema real ali era outro: `opacity: 0.55` no
glifo, derrubando o contraste.

### As "três ênfases ciano" (#14) eram duas

`.ht-tab.active` e `.preset-btn.active` usavam tratamento **idêntico** (contorno
ciano), e o botão primário usava preenchimento sólido. Isso é um sistema coerente
de dois níveis, não três estilos competindo. O que sobrava de real era menor: aba
e preset ficarem indistinguíveis entre si, sem sinalizar que um é navegação e o
outro é escolha de valor.

---

## O que foi corrigido

### 1. Placar legível — `App.css`, `MatchScreen.tsx`

A cor do clube fica na borda de 3px de `.score-side.home/.away` e nas barras de
momentum e posse. A abreviação e o percentual de posse deixaram de ser tingidos e
passaram a `--text-primary` em opacidade cheia.

Medido no app: `#dde6f0`, `opacity: 1`, 12px — ~13:1 sobre `--surface`.

### 2. Scrim do painel de pausa — `App.css`

`.halftime-overlay` foi de `rgba(0,0,0,0.65)` para `rgba(3,6,12,0.88)` com
`backdrop-filter: blur(3px)` (e o prefixo `-webkit-`). A 65% ainda passavam 35%
do feed de comentários, e em tema escuro com texto ciano isso aparecia como
frases cortadas colando nas bordas do card.

A comemoração de gol mantém o scrim leve de propósito — ali ver o jogo por trás é
a intenção, e não há formulário para ler.

### 3. Formulário de táticas unificado — `MatchScreen.tsx`

O formulário inline de ~50 linhas foi substituído por `<TacticEditor>`, o mesmo
que o `HalftimePanel` já usava. A pausa no meio do jogo passou de 5 para 7 campos
— Escanteio e Falta agora existem nas duas pausas.

Efeito colateral bom: caíram 4 imports que só existiam para alimentar a cópia
(`FORMATIONS`, `MENTALITY_LABELS`, `TacticLabel` e cinco tipos de tática).

Verificado no app: `.halftime-inner` tem 7 `<select>` na pausa de meio de jogo.

### 5. CTA primário coerente — `MatchdayScreen.module.css`

`.playBtn` usava `linear-gradient(#f59e0b, #d97706)` hardcoded — âmbar, que os
tokens reservam para "gols, troféus" — enquanto o CTA primário do resto do app é
ciano. Passou a `var(--accent)`, com altura e fonte um pouco maiores.

Verificado: `background-color: rgb(6, 182, 212)`, sem gradiente.

### 6. Hierarquia rótulo/valor — `App.css`

A causa era mais específica do que eu supunha: os rótulos do `TacticEditor` são
filhos diretos de `.tactic-card`, mas a única regra existente era
`.setup-select label` — que nunca casava, porque `setup-select` está no `<select>`
e não num wrapper. Sem regra, os rótulos herdavam os 16px da raiz e ficavam
maiores que o valor dentro do campo.

Adicionadas regras `.tactic-card label` (10px, uppercase, secundário) e
`.tactic-card select.setup-select` (14px, 600, `min-height: 38px`).

Medido: rótulo 10px `#6b8faa`, valor 14px `#dde6f0`.

### 7. Destaques sem excesso de goleiros — `MatchdayScreen.tsx`

Nova `pickHighlights()` exportada: separa jogadores de linha de goleiros, ordena
cada grupo por OVR e só completa com **um** goleiro se o elenco não tiver
jogadores de linha suficientes. O OVR de GK é calibrado em outra escala e
dominava o topo do elenco.

Coberto por 5 testes em `src/components/__tests__/matchdayHighlights.test.ts`,
incluindo o caso de regressão (elenco com 3 goleiros de OVR 97-99).

### 8. Espaço morto no Matchday — `MatchdayScreen.tsx`

A causa não era layout: a seção de histórico é escondida quando não há
confrontos anteriores, o que abria um buraco de várias centenas de pixels em todo
primeiro encontro. Em vez de centralizar o conteúdo (que arriscaria o scroll em
telas cheias), a seção passou a ter estado vazio explícito: "Primeiro encontro
entre X e Y. O retrospecto começa a contar a partir desta partida."

### 9. Contrato único nos cards — `MatchdayScreen.tsx`

Os três cards agora seguem rótulo-em-cima / valor-embaixo: ESTÁDIO, CLIMA,
FORMAÇÕES. Antes a segunda linha era usada para três coisas diferentes (detalhe
do valor, nome da categoria e outro valor). A mentalidade passou a usar
`MENTALITY_LABELS` em vez de um ternário de quatro ramos inline.

### 10. CTA sempre alcançável — `App.css`

`.select-action` ganhou `position: sticky; bottom: 0` com gradiente de fundo. A
grade tem 20-24 clubes e passa de 3000px no celular; o usuário escolhia no fim da
lista e tinha que rolar tudo de volta. O botão reassume a posição natural quando
a página chega ao fim.

### 11. Contraste na raiz — `index.css`, `App.css`

A causa era sistêmica: **20 regras aplicavam `opacity: 0.3–0.45` a texto**. Em
tema escuro isso empurra o texto para o fundo. `--text-secondary` (#5a7a96) a 45%
sobre `--surface` ficava em torno de 1.9:1.

Duas mudanças:
- `--text-secondary` foi de `#5a7a96` para `#6b8faa` — ~4.9:1 sobre `--surface` e
  ~5.6:1 sobre `--bg`, acima do mínimo AA de 4.5:1 para texto pequeno. Os rótulos
  do app são quase todos 10-12px, então precisavam do piso.
- Novo `--text-tertiary: #4d6b85`, só para texto realmente acessório
  (separadores, "vs"), nunca para informação.
- As 18 regras de `opacity` em texto passaram a usar token de cor. As duas que
  sobraram são `:disabled`, onde esmaecer é o comportamento correto.

### 12. Topbar em uma linha no mobile — `App.css`

O `flex-wrap: wrap` fazia "FCU vs BAY" quebrar em três linhas empilhadas,
colidindo com as formações e os controles de velocidade. Agora `nowrap`, com o
título encolhendo por ellipsis, e as formações escondidas abaixo de 400px — elas
já aparecem no Matchday e no painel de táticas.

### 13. Botões de ajuda — `App.css`

Área de toque de 24×24 para 32×32 (são 7 por tela de táticas, lado a lado com
selects), e o `opacity: 0.55` do glifo trocado por `color: var(--text-secondary)`.

### 14. Aba distinta do preset — `App.css`

`.ht-tab.active` passou a marcar com sublinhado de 2px em ciano e contorno
transparente; o pill de contorno fica reservado ao preset. Navegação e escolha de
valor deixam de ter a mesma aparência.

### 15. Emoji único por comentário — `tacticalCommentary.ts`

As 16 strings de `pool.push` começavam com emoji (📋 🔥 ⚡ 🔄 🛡️), e tanto o
`.tacticalCard` do Matchday quanto o `CommentaryFeed` já renderizam ícone próprio
— o feed via `EVENT_ICONS[event.type]`. Resultado: dois ícones lado a lado, o
segundo parecendo caractere perdido no meio da linha. Os prefixos saíram das
strings; quem decide apresentação é o componente.

**Nota:** o mesmo padrão existe em `commentary.ts` (`⚽ GOL!`, `🟨 Cartão...`).
Ali o emoji tem valor expressivo no feed e a mudança seria muito maior, então
ficou de fora — anotado como dívida, não corrigido.

---

## Verificação

`npm run build` verde, `oxlint` sem erros, **368 testes passando** (+5 de
`pickHighlights`).

Conferido no app rodando, em carreira do Bayern na Bundesliga:
- Placar: `#dde6f0`, opacidade 1, 12px
- Scrim da pausa: `rgba(3,6,12,0.88)` + `blur(3px)`
- Pausa de meio de jogo: 7 campos de tática, com ESCANTEIO e FALTA
- CTA do Matchday: `rgb(6,182,212)`
- Cards: ESTÁDIO / CLIMA / FORMAÇÕES
- Estado vazio do histórico renderizando
- Rótulo 10px `#6b8faa` contra valor 14px `#dde6f0`
- Aba ativa com sublinhado de 2px ciano

O banner de sugestões de substituição também foi visto funcionando pela primeira
vez ("→ Dayot Upamecano (OVR 90) · mais solidez defensiva") — é o mesmo JSX que
antes quebrava com `c.candidates.length`.

---

## Ainda em aberto

**Seis telas nunca foram capturadas** e seguem sem auditoria: Central da
Carreira, Mercado de Transferências, Sala de Troféus, Conquistas, lobby online e
fim de temporada. Duas delas são as mais usadas do modo principal. Vale uma
segunda rodada de capturas antes de considerar a auditoria da UI completa.

**Uma observação fora de escopo de UI, levantada pelas capturas:** em
`E3-matchday.png` os destaques do Aston Villa incluíam Marco Bizot e João Gomes,
e os do Arsenal incluíam Illan Meslier — nenhum deles joga nesses clubes. Se a
sincronização de elencos via API está atribuindo jogadores ao clube errado, isso
é mais grave que qualquer item desta lista. Não investiguei; fica registrado.

**Dívida anotada:** os prefixos de emoji em `commentary.ts` duplicam os ícones do
feed, pelo mesmo mecanismo do item 15.

`audit-20260729-183623/C4-career-hub.png` está rotulado errado: é a tela de
seleção de time, não a Central.

---

# Segunda rodada — as seis telas que faltavam

**Data:** 2026-07-30

As telas que a primeira auditoria não alcançou foram auditadas agora. Em vez de
capturar imagem, medi **estilos computados no app rodando**: razão de contraste
WCAG (considerando `opacity` acumulada e o fundo real composto) e altura de todo
elemento interativo. Isso dá número em vez de impressão — e foi assim que a
primeira rodada me levou a erro em quatro achados.

Cobertas: Central da Carreira, Mercado de Transferências, Sala de Troféus,
Conquistas, lobby online. Mais a Home, que não estava na lista mas entrou na
varredura. A tela de fim de temporada continua sem verificação ao vivo — exige
temporada e copa concluídas; foi corrigida pela varredura de código.

## O que a medição encontrou

| Tela | Falhas de contraste | Alvos < 32px | Pior caso |
|---|---|---|---|
| Central da Carreira | 20 | 2 | `⚽ Jogar` a **2.43:1** |
| Conquistas | 25 | 1 | data do desbloqueio a **1.54:1** |
| Sala de Troféus | 6 | 0 | rótulos a 2.95:1 |
| Lobby online | 3 | 0 | `Criar Sala` e `Entrar` a **2.43:1** |
| Home | 2 | 3 | dificuldade ativa a 2.43:1 |
| Mercado | 0 | 0 | — |

## Duas causas sistêmicas, não 56 problemas

O número de ocorrências enganava: quase tudo vinha de duas origens.

### Botão primário com texto branco sobre ciano

O `2.43:1` que apareceu na Central, no lobby e na Home é sempre o mesmo padrão:
`background: var(--accent); color: #fff`. Branco sobre `#06b6d4` dá ~2.4:1 —
reprova AA no **CTA mais importante de várias telas**.

Corrigido para texto escuro (`#04222a`) sobre o mesmo ciano: ~7:1, sem perder a
cor da marca. Aplicado em `App.css` e em 6 CSS modules.

### `opacity` em texto, agora dentro dos CSS modules

A primeira rodada corrigiu isso no `App.css`, mas os módulos têm a própria
paleta e ficaram de fora. Eram **96 regras em 17 arquivos** usando
`opacity: 0.2–0.7` para esmaecer texto — o que em tema escuro empurra o texto
para o fundo. A data de desbloqueio das Conquistas, a 1.54:1, era o extremo.

Todas passaram a usar `var(--text-secondary)`. A varredura preserva
`:disabled`, `::placeholder`, `:hover` e pseudo-elementos decorativos, onde
esmaecer é o comportamento correto.

Além disso, os CSS modules usavam cinzas hardcoded (`#6b7280` a 3.67:1,
`#4b5563` a 2.42:1) que nunca viram os tokens — também trocados.

### Alvos de toque

Seis controles abaixo de 32px de altura, o pior sendo "Começar nova carreira"
com **21px**. Os três botões de dificuldade da Home tinham 24px. Todos subiram
para 34px.

## Verificação

Reauditadas as mesmas telas após as correções: **0 falhas de contraste e 0 alvos
abaixo de 32px em todas**.

O único item restante no relatório automático — a aba ativa do Mercado a
"1.00:1" — é artefato do medidor: o texto é `#06b6d4` e o botão tem
`background: rgba(6,182,212,0.1)`, que meu caminhador de fundo capturou como se
fosse opaco. Composto sobre `--bg`, o fundo real é `rgb(6,28,39)` e a razão
verdadeira fica em ~7:1.

Build verde, lint sem erros, 368 testes passando.

## Melhorias propostas (não implementadas)

Estas são de produto, não de acessibilidade — não mexi sem combinar:

1. **Central da Carreira: o painel de objetivos não mostra progresso.** Cada
   objetivo aparece como "📌 pendente" até o fim da temporada. Como já existem
   `leaguePosition` e o estágio da copa, dava para mostrar "Top 4 — atualmente
   em 6º" e antecipar a cobrança em vez de revelar tudo no último dia.

2. **Conquistas: 15 itens sem agrupamento nem progresso parcial.** Bloqueadas
   mostram "???" na descrição, o que esconde o que fazer. Agrupar por categoria
   e mostrar progresso ("3/10 vitórias") daria direção.

3. **Sala de Troféus vazia é um beco.** Com "Nenhuma temporada concluída ainda"
   e mais nada, a tela não diz o que falta nem oferece ação. Um resumo da
   temporada em curso resolveria.

4. **Mercado: nenhuma indicação de qual liga está sendo navegada** fora da lista
   lateral. Ao filtrar por time de outra liga, o contexto se perde.

5. **Lobby online sem estado de erro visível para sala inexistente** — o campo
   aceita qualquer código e a falha só aparece no console.
