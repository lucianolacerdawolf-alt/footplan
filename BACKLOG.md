# Backlog FootPlan

Lista do que está pendente. Itens marcados com 🟢 são pequenos (<1h), 🟡 médios (1-3h), 🔴 grandes (3h+).

Cada item pendente vem com **Por que sobrou**, **O que envolve** e **Posso retomar quando** pra você decidir se vale o esforço.

---

## 🐛 Bugs / Limpeza pendente

### 🟢 `src/data/premierLeague.ts` legado ainda referenciado

**Por que sobrou:** a migração pra `src/data/leagues/*` (6 ligas) não removeu o arquivo antigo — `App.tsx` e `useBracketManager.ts` ainda importam dele em paralelo ao `data/leagues/premierLeague.ts` novo.

**O que envolve:** confirmar se as duas fontes divergem (elenco/OVR diferentes) e, se não houver motivo pra manter as duas, apontar os dois call sites pra `data/leagues/premierLeague.ts` e apagar o arquivo legado.

**Posso retomar quando:** quiser eliminar a duplicação — risco baixo, mas precisa confirmar que nada depende do formato antigo primeiro.

---

### 🟢 Redux Toolkit instalado, mas sem uso

**Por que sobrou:** `@reduxjs/toolkit` e `react-redux` estão no `package.json` e `src/store/index.ts` existe, mas o `reducer` está vazio (`{}`) — nenhuma tela usa o store hoje. Ou é scaffolding de um começo de migração que não foi adiante, ou entrou por engano.

**O que envolve:** decidir entre (a) remover a dependência e `src/store/` se não há plano de usar, ou (b) migrar algum estado real pra lá se a intenção é reduzir prop drilling no `App.tsx`.

**Posso retomar quando:** você esclarecer a intenção original.

---

## 🏗️ Saúde do código

### 🔴 `App.tsx` god component

**Por que sobrou:** tentativa anterior de refactor foi descartada — risco de regressão alto sem ganho funcional imediato em código que funciona.

**O que envolve:**
- Extrair `useTournamentNavigation()` hook que retorne `{ screen, setScreen, matchContext, ... }`
- OU mover lógica de torneio pra hooks dedicados (parte já foi: `useLeagueManager`, `useBracketManager`, `useGameFlow`, `useAppShell` existem, mas `App.tsx` ainda orquestra a colagem entre eles)
- Garantir que todos os fluxos continuam: regular vs CPU, 6 ligas, 6 copas, online, resume de sessão ao vivo (F5)

**Risco:** alto — esse arquivo orquestra a navegação entre todas as telas.

**Posso retomar quando:** você quiser pagar a dívida técnica. Sugestão: cobrir os fluxos principais com um teste de integração leve antes de mexer.

---

### 🟡 Zero testes de componente UI

**Por que sobrou:** dependência nova (`@testing-library/react` + `jsdom`) + ROI historicamente baixo comparado ao ganho de cobrir o motor.

**O que envolve:**
- Configurar `vitest.config.ts` com `environment: 'jsdom'` (hoje é `'node'`, adequado só pro motor)
- Testes pros componentes com mais lógica: `MatchScreen` (janelas de substituição, restauração de sessão), `LeagueScreen` (zona da tabela colorida certa, scroll horizontal contido), `rosterSync`-dependent UI

**Posso retomar quando:** quiser cobertura formal de UI. Os 170 testes atuais cobrem o motor e a sincronização de elenco, não a camada visual.

---

## 📦 Features grandes

### 🔴 Modo Carreira (multi-temporada)

**Por que sobrou:** precisa de infraestrutura de temporadas múltiplas — hoje a liga acaba e a única opção é "Nova Temporada", que zera tudo.

**O que envolve (em ordem):**
1. **Conceito de temporada**: `Season { year, league: LeagueState, cup?: BracketState }` em vez dos estados soltos atuais
2. **Tela "Fim de Temporada"**: mostra resultado, oferece "Avançar pra próxima temporada"
3. **Progressão de jogadores**: idade, evolução/declínio de atributos entre temporadas
4. **Transferências simples**: pool de jogadores livres ou mercado básico entre times
5. **Persistência**: `fp:season` em vez de `fp:leagueState`/`fp:bracketState` soltos
6. **Histórico de temporadas**: campeão, sua posição, por ano

**Posso retomar quando:** você quiser que o jogo tenha progressão de longo prazo — é a próxima feature principal planejada.

---

## ✅ Já entregue (referência)

- **6 ligas europeias** com elencos reais (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Liga Portugal) + **6 copas nacionais** correspondentes
- **Sincronização de elenco ao vivo** via football-data.org (proxy Cloudflare Worker, cache 7 dias, fallback offline, algoritmo de matching por confiança sem colisões falsas)
- **PWA instalável** (manifest, service worker, ícones, funciona offline)
- **Persistência de sessão de partida ao vivo** — sobrevive a F5, restaura em pausa
- **Motor de simulação em blocos**: substituições numa pausa do 2º tempo afetam o resto do jogo de verdade
- **5 substituições em até 3 janelas de parada** (não é mais um contador único)
- **3 presets de tática** com tooltips explicativos
- **Fix**: desarme agora muda a posse de fato (antes a narração e o resultado divergiam)
- **Fix**: fadiga recalibrada (sem mais quedas irreais de OVR durante a partida)
- **Fix**: OVR de goleiro gerado proceduralmente calibrado corretamente
- **Fix**: bola segue passador/receptor real do evento, com arco proporcional à distância
- **Fix**: layout mobile — campo e tabela de classificação não estouram mais a tela; `box-sizing: border-box` global elimina scroll vertical fantasma
- **UI**: label "Posse de Bola" padronizado, goleiro com anel na cor do time, jogadores não somem mais ao pausar, banner "Continuar" cobre todos os fluxos de entrada
- Sistema de conquistas (15 achievements)
- Tema escuro, fade entre telas, som procedural (zero arquivos de áudio)
- Tela pós-jogo completa (MOTM, notas, gols, cartões, breakdown tático)
- Tutorial interativo, H2H detalhado, CPU varia tática por rodada e por liga
- 170 testes automatizados (motor + sincronização de elenco)
