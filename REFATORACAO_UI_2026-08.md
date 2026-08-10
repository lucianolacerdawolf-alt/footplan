# Refatoração de UI, Fluxo e Código — Agosto/2026

Branch: `refactor/ui-code-melhorias`
Baseline antes das mudanças: **573 testes verdes**, `tsc` e `oxlint` limpos.
Depois das mudanças: **573 testes verdes**, `tsc` e `oxlint` limpos. Zero regressão de teste.

Este documento cobre 10 melhorias aplicadas em resposta a uma análise de código,
fluxo de telas e design. Um único item da análise ficou **de fora a pedido**: tema
claro (era o item #10 da análise original).

A numeração `#N` abaixo é a da análise original, não a ordem de execução.

---

## Resumo executivo

| # | Item | Tipo | Arquivos principais |
|---|------|------|---------------------|
| #5 | Remover prop morta `onViewCup` | Código | `CareerHubScreen`, `AppScreens` |
| #3 | Tokenizar cores semânticas | Design | `index.css` + ~15 arquivos |
| #6 | Primitivos de UI (`Button`/`Card`/`StatTile`) | Código/Design | `src/components/ui/` |
| #11 | Componente de ícone SVG | Design | `src/components/ui/Icon.tsx` |
| #4 | Estilos inline → CSS modules | Código | `CareerHubScreen`, `FinancePanel` etc. |
| #9 | Grid desktop na Central | Layout | `CareerHubScreen.module.css` |
| #7 | Reorganizar a "God screen" | Fluxo | `CareerHubScreen.tsx` |
| #8 | Realocar sync de elencos | Fluxo | `CareerHubScreen.tsx` |
| #1 | Reduzir prop drilling | Código | `App.tsx`, `AppScreens.tsx`, `useCareerManager.ts` |
| #2 | Deduplicar lógica repetida | Código | `AppScreens.tsx` |

---

## #5 — Prop morta `onViewCup`

**O quê:** `CareerHubScreen` recebia `onViewCup` e a ignorava explicitamente
(`void onViewCup;`). Removida da interface, do call site em `AppScreens` e do corpo.

**Por quê:** prop passada e nunca usada confunde quem lê e sugere um caminho de
navegação que não existe (a copa é vista pela aba/`career-bracket`, não daqui).

---

## #3 — Cores semânticas tokenizadas

**O quê:** criados tokens em `src/index.css`:

```css
--win: #34d399;        /* vitória / positivo forte */
--draw: #9ca3af;       /* empate / neutro */
--loss: #f87171;       /* derrota / negativo */
--positive: #22c55e;   /* receita entrando */
--negative: #ef4444;   /* despesa saindo */
--warning: #f59e0b;    /* alerta / atenção */
--text-muted: #9ca3af; /* rótulos acessórios */
```

Substituídos os hex literais espalhados por `.tsx` (inline) e `.module.css`:
`CareerHubScreen`, `FinancePanel`, `TrophyRoomScreen`, `OpponentAnalysisModal`,
`SetupScreen`, `SquadSwapPanel`, `PenaltyShootoutOverlay`, `CareerSummaryPanel`,
`MatchdayScreen`, `LeagueTableScreen`, `SeasonEndScreen`, `SocialFeedCard`,
`LeagueScreen`, `JobMarketScreen`, `App.css`.

**Por quê:** a mesma paleta estava replicada como magic numbers em ~20 arquivos.
Centralizar dá consistência e prepara terreno para temas.

**Importante — zero mudança visual:** os valores dos tokens são idênticos aos hex
que já estavam em uso. A tokenização foi puramente estrutural.

**Deixado intencionalmente:**
- `ratingColor()` em `MatchStatsScreen` — escala local coesa (roxo/verde/azul/
  cinza/vermelho) de nota de jogador; não é a paleta semântica global.
- Cores de confete decorativo (gradientes em `MatchStatsScreen.module.css`).
- Cores de marca dos clubes/ligas (`data/leagues/*`), fixtures de teste e
  `services/native.ts` (config nativa).
- `#0ea5e9` (azul de patrocínio) e `#eab308` (amarelo de empate no
  `OpponentAnalysisModal`) — one-offs fora da paleta semântica.

**Como aplicar daqui pra frente:** use `var(--win|--loss|--draw|--positive|
--negative|--warning|--text-muted)` em vez de hex. Para cor dinâmica vinda de
dado (ex: cor de competição), passe como custom property inline (`style={{ '--cc': cor }}`)
e referencie no módulo — ver #4.

---

## #6 — Primitivos de UI

**O quê:** nova pasta `src/components/ui/` com:

- **`Button`** — variantes `primary | secondary | ghost | danger`, tamanhos
  `sm | md | lg`, `block`. Encaminha props nativas e `type="button"` por padrão.
  Alvo de toque mínimo 44px (WCAG 2.5.5).
- **`Card`** — superfície padrão (`accent`, `compact`), com `.title` de seção.
- **`StatTile`** — valor grande + rótulo, com tons `win/draw/loss/positive/negative`.
- **`Icon`** — ver #11.

Barrel em `src/components/ui/index.ts`.

**Por quê:** 27 CSS modules repetiam `card`/`statCard`/`playBtn`/`advanceBtn`/
`backBtn`. Um punhado de primitivos corta a duplicação e uniformiza o visual.

**Adoção inicial:** `CareerHubScreen` (StatTile nas quick-stats; Button em Jogar/
Avançar/Voltar/Tentar-de-novo/sync). Os demais componentes continuam com o CSS
próprio — **migração incremental** conforme cada tela for tocada. Não houve
big-bang de adoção para manter o risco baixo.

**Como aplicar:** `import { Button, Card, StatTile, Icon } from './ui';` (ou
caminho relativo equivalente). Preferir esses primitivos a criar novos
`.playBtn`/`.statCard`.

---

## #11 — Componente de ícone SVG

**O quê:** `src/components/ui/Icon.tsx` — set de ícones SVG inline 24×24,
`stroke=currentColor` (herda cor e tamanho do contexto). Nomes disponíveis:
`play, trophy, briefcase, refresh, cloud, cloud-off, star, calendar, stadium,
shirt, globe, bolt, medal, warning, bell, chart, manager, chevron-right,
arrow-left`.

Adotado no `CareerHubScreen` nos pontos de **interface** (voltar, técnico,
reputação, patrocínio, estádio, mercado de treinador, próxima partida, nuvem,
sync, alerta de diretoria).

**Por quê:** emoji renderiza diferente em cada SO/navegador e quebra a
consistência visual. SVG com `currentColor` é estável e acompanha o tema do texto.

**Acessibilidade:** sem `title` o ícone é `aria-hidden` (decorativo); com `title`
vira `role="img"` com rótulo.

**Deixado como emoji de propósito:** conteúdo expressivo (feed social, ícones de
status de objetivo ✅❌📌, artilheiro ⚽). Ali o emoji é conteúdo, não cromo de UI.

---

## #4 — Estilos inline → CSS modules

**O quê:** o caso mais grave era o bloco da copa continental no `CareerHubScreen`
— CSS inteiro inline, inclusive a cor da competição. Movido para
`.continentalRow`/`.continentalBtn` no módulo, com a **cor dinâmica** passada como
custom property (`style={{ '--cc': ccDef.color }}`) e consumida via
`var(--cc)`/`color-mix()`. `FinancePanel` teve os hex condicionais trocados por
`var(--token)` (a lógica dinâmica permanece inline, que é legítimo).

**Por quê:** CSS estático inline foge do design system, não reaproveita tokens e
polui o JSX.

**Deixado intencionalmente:** os estilos inline de `MatchScreen` (~35) e
`HalftimePanel` (~17) são majoritariamente **dinâmicos** (posições no campo,
animações, valores calculados) — inline é a ferramenta certa ali. Migrar só o que
for estático fica como follow-up de baixa prioridade.

---

## #9 — Grid desktop na Central de Carreira

**O quê:** em `≥900px`, o corpo da Central vira grid de 2 colunas
(`grid-template-columns: 1.1fr 0.9fr`) e `.screen` alarga para `max-width: 1040px`.
Em telas estreitas as colunas empilham.

**Por quê:** no desktop (largura fixa de 1126px) a tela era uma faixa vertical
estreita com muito vazio nas laterais e scroll longo.

---

## #7 — Reorganização da "God screen"

**O quê:** o `return` do `CareerHubScreen` foi reestruturado em duas colunas
semânticas:

- **Coluna de AÇÃO** (o que fazer agora): preparação pré-jogo, **próxima partida**,
  avançar rodada/temporada, conversas e **inbox**.
- **Coluna de INFORMAÇÃO** (contexto): quick-stats, progresso, status das
  competições (liga/copa/continental), objetivos da diretoria, mercado de
  treinador, feed social.

Em mobile as colunas empilham com a **ação primeiro** — alinhado ao foco pedido:
"próxima partida + inbox + avançar".

**Por quê:** eram ~14 cartões empilhados numa coluna só; muito scroll e muita
decisão numa tela. A separação ação × informação reduz a carga cognitiva e, no
desktop, aproveita a largura (ver #9).

**Nota:** nenhuma funcionalidade/condição foi removida — apenas reagrupada. Todas
as renderizações condicionais (temporada encerrada, rodada pendente, bloqueio por
mensagem obrigatória etc.) foram preservadas. Cobertas pelos 15 testes de
`CareerHubScreen.test.tsx`, todos verdes.

---

## #8 — Realocação do sync de elencos

**O quê:** "Atualizar Elencos via API" saiu do fluxo principal e foi para uma
seção **`Ajustes avançados`** recolhível (`<details>`) no rodapé da Central.

**Por quê:** é uma ação global/admin (sincroniza 12 ligas na API) que estava
competindo visualmente com as ações de jogo dentro de um save de carreira.

**Ponto em aberto:** o lar arquiteturalmente ideal seria a tela **Meu Clube**
(gestão) ou uma tela de configurações — o que exigiria plumbing de props novos.
A seção recolhível é o meio-termo de baixo risco. Migrar para Meu Clube fica
registrado como follow-up.

---

## #1 — Redução do prop drilling

**O quê:** o `useCareerManager` retornava ~50 campos que o `App.tsx`
desestruturava e **re-listava manualmente** em `screenProps` (bloco de ~50 linhas),
e a interface `AppScreensProps` declarava todos eles achatados.

Agora:
- `useCareerManager.ts` exporta `type UseCareerManagerReturn = ReturnType<typeof useCareerManager>`.
- `App.tsx` faz `const career = useCareerManager(...)` e passa `career` como um
  **único prop**.
- `AppScreensProps` troca os ~50 campos por `career: UseCareerManagerReturn`.
- As telas de carreira em `AppScreens` leem `p.career.<handler>`.

**Efeito:** o literal `screenProps` do `App.tsx` e a interface `AppScreensProps`
caíram de ~90 para ~40 campos cada. **Adicionar um handler de carreira agora toca
2 lugares (hook + tela), não mais 3.**

**Detalhe de estabilidade:** `career` é um objeto novo a cada render. Para os
callbacks memoizados que alimentam o `useGameFlow` (`careerLeagueSetter`/
`careerBracketSetter`), desestruturamos o setter estável do `useState`
(`const { setCareerState } = career`) e dependemos dele — senão os callbacks
recriariam a cada render e furariam a memoização.

**Escopo deliberado:** não foi introduzido React Context nem os leaf-components
foram convertidos para `useContext` — isso quebraria as interfaces de prop das
telas e seus testes, com risco alto para ganho marginal. O agrupamento em `career`
já resolve o pior da dor (a re-listagem manual). Context/nesting mais profundo
fica como evolução futura.

---

## #2 — Deduplicação de lógica repetida

**O quê:** os três renderers de mata-mata (`bracket`, `career-bracket`,
`career-continental`) repetiam o mesmo trecho: selecionar as partidas do estágio
atual e achar o índice da partida (`findIndex`). Extraído para um helper único em
`AppScreens.tsx`:

```ts
const stageMatchIndex = (bracket, match) =>
  getStageMatches(bracket).findIndex(m => m.id === match.id);
```

(reaproveitando o `getStageMatches` que já existia em `engine/bracketHelpers`).

**Escopo deliberado:** a duplicação mais profunda apontada na análise — os pares
de handlers paralelos liga↔carreira (`handlePlayLeagueMatch` vs
`handlePlayCareerLeagueMatch` etc.) — vive dentro dos hooks-gerenciadores
(`useLeagueManager`/`useCareerManager`/`useCareerMatchFlow`), cobertos por 70+
testes. Unificá-los é um refactor arquitetural maior, com risco real de regressão,
que **não** foi feito aqui. O adaptador `careerLeagueSetter`/`careerBracketSetter`
no `App.tsx` já é o caminho provável para essa unificação futura (deixar o fluxo de
liga operar sobre o estado da carreira via os mesmos setters). Recomendado tratar
como fase própria.

---

## Follow-ups recomendados (não feitos aqui)

1. **#2 profundo:** unificar os handlers paralelos liga↔carreira nos hooks
   (fase própria, com testes).
2. **#1 profundo:** avaliar React Context para o bundle de carreira, convertendo
   os leaf-components (e seus testes).
3. **#6 adoção:** migrar as demais telas para `Button`/`Card`/`StatTile`
   incrementalmente.
4. **#8:** mover o sync de elencos para a tela Meu Clube ou configurações.
5. **#10:** tema claro (explicitamente adiado a pedido).
6. **#4:** varrer estilos inline estáticos restantes em `MatchScreen`/`HalftimePanel`.

---

## Verificação

- `npx tsc -b --noEmit` → sem erros.
- `npx oxlint` → sem warnings/erros.
- `npx vitest run` → **573 passed**.
- Dev server (`vite`) sem erros de runtime/HMR após as mudanças.

---

# Segunda rodada (adoção de primitivos + investigação de memoização)

Branch: `refactor/primitivos-e-memo`.

## #1b — Consolidação do CTA "hero" no `Button`

**O quê:** adicionada a opção `glow` ao primitivo `Button` (brilho + micro-escala
no hover), replicando **exatamente** a classe global `.start-btn`. Os 8 usos de
`.start-btn` foram migrados para `<Button glow>`:

`SeasonEndScreen`, `MatchStatsScreen` (×2), `BracketScreen`, `LeagueScreen` (×2),
`SetupScreen`, `MatchScreen`.

A classe global `.start-btn` (base/hover/active) foi **removida** do `App.css`. O
único override que restava — o encolhimento mobile dentro de `.setup-topbar` — foi
reapontado para uma classe alvo `.setup-confirm-btn` passada via `className` no
`Button` do SetupScreen, preservando o comportamento em telas estreitas.

**Risco visual:** nulo — o CSS do `glow` é byte-a-byte igual ao antigo `.start-btn`.
Verificável no diff.

**Por quê:** `.start-btn` era o CTA mais reusado do app (8 telas) e vivia como
classe global solta. Agora é uma opção do primitivo.

## #2 — Memoização do bundle `career`: investigada e **não aplicada** (com razão)

A ideia original ("memoizar o retorno do `useCareerManager` para o `career` ser
estável") **não reduz re-renders** neste app, e seria trabalho sem efeito. Motivo,
confirmado lendo o código:

1. As telas são renderizadas por `renderScreen(screen, props)` →
   `screenMap[screen](props)`, chamado **incondicionalmente a cada render do App**.
   Isso cria elementos novos toda vez — as telas re-renderizam independentemente da
   estabilidade de `career`.
2. Os renderers em `screenMap` passam **arrow functions inline** como props
   (`onBack={() => …}`, `onViewLeague={() => …}` etc.), que mudam de identidade a
   cada render. Ou seja, mesmo aplicando `React.memo` nas telas, elas **não**
   conseguiriam pular o render.

**Conclusão:** o ganho real de performance exige a mudança arquitetural mais
profunda — estabilizar as props do `screenMap` (hoistar as arrows para
`useCallback`) **e** aplicar `React.memo` nas telas pesadas. É o mesmo território do
"#1 profundo" (Context) já adiado. Memoizar só o bundle seria uma micro-otimização
de efeito nulo hoje, então **não foi feita** — registrado aqui em vez de shipar
código inócuo.

**Recomendação (follow-up medido):** se/quando houver evidência de jank, atacar
apenas a `CareerHubScreen` (a mais pesada): hoistar suas ~4 props de callback
inline para `useCallback` no `App`, garantir `career` estável e envolvê-la em
`React.memo`. Só então a memoização paga.

## Verificação (segunda rodada)

- `tsc` e `oxlint` limpos; **573 testes verdes**; dev server sem erros.

---

# Terceira rodada — `React.memo` na CareerHubScreen (o #2 "de verdade")

Feito o ganho de performance real que a segunda rodada apontou como o caminho
correto.

**O quê:**
1. `CareerHubScreen` agora é `export default memo(CareerHubScreen)`.
2. As 4 arrow functions inline do renderer `career-hub` em `AppScreens`
   (`onViewContinental`, `onBack`, `onViewLeague`, `onOpenJobMarket`) foram
   hoistadas para `useCallback` estáveis no `App` (`goCareerContinental`,
   `exitCareer`, `goCareerLeague`, `goCareerJobMarket`) e passadas como props.

**Por que agora funciona** (o que faltava na 2ª rodada):
- Handlers do bundle `career` já são `useCallback` → referências estáveis.
- `state`/`league` são estáveis por referência (`careerState` só muda quando o
  estado da carreira muda — aí o re-render é **correto**; `getLeague` retorna do
  array estático `allLeagues`).
- `jobOfferCount`/`blockAdvanceReason` são primitivos → comparados por valor.
- As 4 arrows eram o único ponto instável — agora estáveis.

Com todas as props estáveis, o `memo` deixa a Central **pular re-renders** quando o
App re-renderiza por motivo alheio (toast de save, conquista, troca de outra parte
do estado).

**Prova empírica:** um teste temporário espiou `computeStandings` (chamada no
render da Central). Após o mount, dois re-renders do componente pai com props
idênticas **não** dispararam novas chamadas — confirmando que o `memo` barrou o
re-render (sem o `memo`, a contagem subiria). Teste removido após validar.

Também removido o `onViewCup` morto do `CareerHubScreen.test.tsx` (resquício do #5;
o `tsc -b` não cobre os testes, por isso não tinha acusado).

## Verificação (terceira rodada)

- `tsc`/`oxlint` limpos; **573 testes verdes**; prova de skip de render confirmada;
  dev server sem erros.
