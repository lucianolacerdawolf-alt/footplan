# Plano de execução — Correções de fluxo de telas

**Criado:** 2026-07-29
**Origem:** auditoria de navegação sobre os 6 contextos do app (liga avulsa, copa
avulsa, carreira-liga, carreira-copa, online, amistoso).
**Estado da verificação:** todos os 16 itens foram confirmados no código antes de
entrar neste plano. Os 3 críticos já estão corrigidos e validados no app rodando.

---

## Como usar este documento

Cada item traz **Sintoma → Evidência → Causa → Mudança → Verificação → Pronto
quando**. As referências `arquivo:linha` foram conferidas em 2026-07-29; se o
arquivo mudou desde então, reconfirme com `grep` antes de editar — a linha muda,
o padrão de busca indicado não.

Cada onda é um commit (ou um por item, se preferir granularidade). Rodar ao fim
de cada onda:

```bash
npm run build && npx oxlint && npx vitest run
```

---

## Duas correções de premissa (achadas na verificação)

Antes de planejar, duas coisas que eu tinha assumido errado:

**1. `returnScreen` já existe.** Eu havia escrito que os itens 2.3 e 3.2
precisariam introduzir essa peça. Não precisam — ela já está no shell:
`useAppShell.ts:38` declara o estado, `App.tsx:53` o expõe, `AppScreens.tsx:84`
o recebe como prop e `AppScreens.tsx:215` já o consome no fluxo de
`league-select`. Os dois itens ficam bem mais baratos do que eu estimei: é
reusar, não construir.

**2. O branch morto do `matchday` já morreu.** A correção do crítico #2 trocou
todo o `onBack` do `matchday` por `setScreen('setup')`, o que já eliminou o
`else p.setScreen('setup')` inalcançável. Sobra do item 5.1 apenas o rótulo
`'Amistoso'` em `MatchdayScreen.tsx:60`, que continua inalcançável.

---

## Concluído (não refazer)

| # | Problema | Correção aplicada |
|---|---|---|
| C1 | `trade-propose` inalcançável — nenhum `setScreen('trade-propose')` no código | Botão "🔄 Propor Troca" nas abas do Mercado; `onBack` da troca volta pro Mercado |
| C2 | "Voltar" do `matchday` pulava o `setup` nos 4 contextos de torneio, descartando as táticas ajustadas | `onBack` do `matchday` → `setScreen('setup')` |
| C3 | Central da Carreira sem ação nenhuma a cada rodada jogada | "Avançar Rodada →" / "Simular resto da rodada no Escritório →", com o mesmo bloqueio de inbox obrigatória do Escritório |

---

# Onda 1 — Rótulos que mentem

**Por que primeiro:** nenhum destes muda navegação. São três mudanças de texto
condicional, de risco quase nulo, que corrigem a maior fonte de confusão
imediata. Dá pra fazer as três e validar numa passada só.

**Esforço:** ~1h. **Risco:** baixo.

---

### 1.1 — "Iniciar Partida →" não inicia partida

**Sintoma.** Nos contextos de liga e copa, o botão principal do `SetupScreen`
leva à prévia do `matchday`, não ao jogo. Logo depois aparece um segundo
"Iniciar Partida", agora no `matchday`. O usuário clica "iniciar partida" duas
vezes para iniciar uma partida.

**Evidência.**
- `SetupScreen.tsx:315` — `{isTacticsOnly ? 'Confirmar Táticas ✓' : 'Iniciar Partida →'}`
- `useGameFlow.ts:77-78` — `const goViaMatchday = matchContext === 'league' || matchContext === 'bracket'` e `setScreen(goViaMatchday ? 'matchday' : 'match')`

**Causa.** O rótulo foi escrito quando o `setup` levava direto ao `match`. A
inserção do `matchday` (commit `364eae4`) mudou o destino em 4 dos 6 contextos
sem mexer no texto.

**Mudança.** O `SetupScreen` precisa saber se o próximo passo é a prévia. Ele já
recebe `mode`, mas `mode` descreve o modo de jogo, não o contexto de navegação —
usar `mode` aqui acoplaria as duas coisas. Preferir uma prop nova explícita:

- Em `SetupScreen.tsx`, adicionar `goesToPreview?: boolean` às `Props`.
- Trocar o rótulo por um condicional de três casos:
  `isTacticsOnly ? 'Confirmar Táticas ✓' : goesToPreview ? 'Confirmar e Continuar →' : 'Iniciar Partida →'`
- Em `AppScreens.tsx`, no renderizador `'setup'`, passar
  `goesToPreview={p.matchContext === 'league' || p.matchContext === 'bracket'}`.

**Atenção.** A condição tem que ser o **contexto**, não o modo. Amistoso, jogo
rápido e online não passam pelo `matchday` (`useGameFlow.ts:77`), então nesses o
rótulo atual está correto e deve continuar.

**Duplicação.** A expressão `matchContext === 'league' || matchContext === 'bracket'`
passa a existir em dois lugares (`useGameFlow.ts:77` e o novo ponto em
`AppScreens.tsx`). Extrair para um helper — `goesViaMatchday(matchContext)` em
`src/types/navigation.ts` — e usar nos dois. Se um dia o `matchday` for
estendido (item 5.1), há um único lugar para mudar.

**Verificação.**
1. Carreira → Central → "⚽ Jogar" (jogo de liga) → o botão do setup deve ler "Confirmar e Continuar →".
2. Partida Única → escolher times → o botão deve continuar lendo "Iniciar Partida →".
3. Aba Elenco (que usa `isTournamentEntry`) → deve continuar lendo "Confirmar Táticas ✓".

**Pronto quando.** Os 3 rótulos acima conferem e `npm run build` passa.

---

### 1.2 — Fim de temporada usa rótulos de modo avulso

**Sintoma.** Ao encerrar liga ou copa **em carreira**, o botão diz "Nova
Partida" / "Jogar Novamente", mas leva de volta à Central da Carreira. No modo
avulso o mesmo botão realmente vai pra Home começar outra partida.

**Evidência.**
- `LeagueScreen.tsx:102` — `<button className="start-btn" onClick={onBack}>Nova Partida</button>`
- `BracketScreen.tsx:116` — `<button className="start-btn" onClick={onBack}>Jogar Novamente</button>`
- Em carreira o `onBack` desses dois é `p.setScreen('career-hub')` (`AppScreens.tsx:538` e `:572`); no modo avulso é `p.goHome` (`AppScreens.tsx:291` e `:323`).

**Causa.** Um único rótulo servindo dois destinos. As telas já sabem distinguir
os modos: recebem `hideTopNav`, que só é `true` em carreira (`AppScreens.tsx:540`,
`:573`).

**Mudança.** Em ambas as telas, trocar o texto do botão por
`hideTopNav ? '← Voltar à Central' : <rótulo atual>`.

**Nota de nomenclatura.** `hideTopNav` descreve aparência, não modo — usá-lo
como proxy de "estou em carreira" é o que já se faz em 6 pontos dessas duas
telas (`LeagueScreen.tsx:87,121,140`, `BracketScreen.tsx:99,166,172`), então
seguir o padrão existente é o menor mal. Se em algum momento surgir um terceiro
modo, o refactor certo é uma prop `mode` explícita — anotar como dívida, não
fazer agora.

**Verificação.** Carreira → simular a liga até o fim → a tela de campeão deve
mostrar "← Voltar à Central" e levar à Central. Campeonatos (avulso) → simular
até o fim → deve continuar "Nova Partida" e levar à Home.

**Pronto quando.** Os dois modos mostram o rótulo certo e cada botão vai ao
destino que anuncia.

---

### 1.3 — `matchday` não diz onde o usuário está, na copa

**Sintoma.** Na prévia de um jogo de copa, o usuário vê só o badge "Copa" — sem
a fase (Oitavas/Quartas/Semi/Final) e sem o nome da competição. Na liga aparece
"Liga · Rodada N", mas sem o nome da liga e, em carreira, sem a temporada.

**Evidência.**
- `AppScreens.tsx:422-426` — `roundLabel` só é calculado quando `p.matchContext === 'league'`; nos demais fica `undefined`.
- `MatchdayScreen.tsx:58-60` — `contextLabel` é o literal `'Liga'` / `'Copa'` / `'Amistoso'`.
- Os dados existem: `BracketState` tem `stage` e `cupName` (`tournament.ts:66,68`), e a carreira tem `season.cup` e `currentSeasonYear`.

**Causa.** O `MatchdayScreen` foi escrito derivando o rótulo do `matchContext`
cru, que só distingue liga/copa/amistoso e não carrega nome nem fase.

**Mudança.** Mover a formatação para o `AppScreens`, que tem acesso a todo o
estado, e deixar o `MatchdayScreen` só exibir:

- Em `MatchdayScreen.tsx`, trocar `matchContext: MatchContext` por
  `contextLabel: string` (o componente não precisa mais conhecer o contexto).
  Remover o cálculo de `contextLabel` interno — isso já resolve o rótulo morto
  `'Amistoso'` do item 5.1.
- Em `AppScreens.tsx`, no renderizador `'matchday'`, montar:
  - **Copa:** `contextLabel` = `cupName` (de `careerState.season.cup.cupName` ou `bracketState.cupName`); `roundLabel` = label do estágio, reusando o mapa de labels que a `CareerHubScreen` já tem (`CUP_STAGE_LABELS`) — extrair esse mapa para `src/engine/tournament.ts` ou um módulo de labels, para não duplicar.
  - **Liga:** `contextLabel` = nome da liga (`selectedLeague?.name` ou `getLeague(careerState.leagueId)?.name`); `roundLabel` = `Rodada N / total`.
  - **Carreira:** acrescentar `· Temporada ${careerState.currentSeasonYear}` ao `contextLabel`.

**Verificação.** Carreira → jogo de copa → a prévia deve mostrar o nome da copa
(ex: "DFB-Pokal") e a fase ("Quartas de Final"). Carreira → jogo de liga → deve
mostrar "Bundesliga · Temporada 1" e "Rodada 2 / 34". Copa avulsa → nome da copa
e fase.

**Pronto quando.** Os 4 contextos de torneio mostram competição e fase/rodada, e
o literal `'Amistoso'` não existe mais no `MatchdayScreen`.

---

# Onda 2 — Estado que vaza

**Por que antes dos cliques desperdiçados:** vazamento de estado é a classe de
bug que produz sintoma mais confuso — o usuário vê "Modo Carreira" numa partida
avulsa e não tem como saber por quê. E o 2.3 é a causa raiz que o 2.1 e o 2.2
tornam invisível.

**Esforço:** ~2h. **Risco:** médio (mexe em ciclo de vida de estado global).

---

### 2.1 — `isCareerMode` vaza ao desistir da seleção de liga

**Sintoma.** Abrir "Modo Carreira" na Home, ver a lista de ligas, desistir e
voltar. A Home parece normal, mas o app continua "em carreira": uma Partida
Única iniciada depois mostra o subtítulo "Modo Carreira".

**Evidência.**
- `App.tsx:261-262` — `handleCareerFromHome` chama `setIsCareerMode(true)` **antes** de o usuário escolher qualquer coisa.
- `useAppShell.ts:48` — a flag é persistida em `fp:isCareerMode` e só é limpa dentro de `goHome` (`useAppShell.ts:40-52`).
- `AppScreens.tsx:206` — o `onBack` da `league-select` é `{ p.setReturnScreen(null); p.setScreen('home'); }` — não passa por `goHome`, logo não limpa a flag.

**Causa.** A flag é ligada na *intenção* de entrar em carreira, não na
*entrada*. Qualquer saída que não seja `goHome` a deixa ligada.

**Mudança.** Duas opções; preferir a primeira, que ataca a causa:

- **(a) Ligar a flag só quando a carreira realmente começa.** Remover
  `setIsCareerMode(true)` de `handleCareerFromHome` e movê-lo para
  `handleStartCareer` (`useCareerManager.ts`, junto do `setScreen('career-hub')`).
  Cuidado: `handleCareerFromHome` também trata o caso de carreira já existente
  (`App.tsx:263` — `if (careerState) { setScreen('career-hub'); return; }`); esse
  ramo **precisa** manter a flag ligada. Então a remoção vale só para o caminho
  que segue para `league-select`.
- **(b) Paliativo:** trocar o `onBack` da `league-select` por `p.goHome()`.
  Resolve o sintoma mas deixa a janela aberta para qualquer outra saída futura.

Fazer (a). O item 2.2 aplica (b) de todo jeito, como padronização.

**Verificação.**
1. Home → Modo Carreira → Voltar → Partida Única → o subtítulo **não** deve dizer "Modo Carreira".
2. Inspecionar `localStorage.getItem('fp:isCareerMode')` — deve ser `null` após voltar.
3. Com carreira existente: Home → Modo Carreira → deve ir direto pra Central e a flag deve estar ligada.

**Pronto quando.** Os 3 cenários acima passam. O cenário 3 é o que a mudança
pode quebrar — não deixar de testar.

---

### 2.2 — Três "Voltar para a Home" com semânticas diferentes

**Sintoma.** Dependendo de qual tela você usa para voltar ao menu principal, o
app limpa ou não a liga selecionada, o contexto de partida e as flags de modo.

**Evidência.** Em `AppScreens.tsx`:
- Cru (`setScreen('home')`): `:180` (cup-select), `:206` (league-select), `:262` (online-lobby).
- Via `goHome`: `:257`, `:272`, `:291`, `:323`, `:453`, `:465`, `:482`.

**Causa.** As três telas cruas foram escritas antes de `goHome` existir e nunca
foram migradas.

**Mudança.** Trocar as três por `p.goHome()`. Em `:206` (league-select) o
`setReturnScreen(null)` precisa ser preservado — ou incorporado ao `goHome`, que
é o lugar natural para ele, já que `goHome` é justamente "zerar o contexto".
Avaliar mover `setReturnScreen(null)` para dentro de `goHome` em
`useAppShell.ts:40` e simplificar os três call sites.

**Atenção — online.** `:262` é o lobby online. Trocar por `goHome` muda o
comportamento: hoje o `onBack` cru não desconecta o peer, e o `onGoHome` (que já
é `p.goHome`) também não. A desconexão é tratada no item 4.1 — **não** tentar
resolver aqui, só padronizar a limpeza de estado.

**Verificação.** Para cada uma das três telas: entrar, voltar, e conferir que
`fp:selectedLeague`, `fp:isCareerMode` e `fp:mode` saíram do localStorage.

**Pronto quando.** Nenhum `setScreen('home')` cru sobra em `AppScreens.tsx`
(`grep -n "setScreen('home')" src/components/AppScreens.tsx` sem resultados).

---

### 2.3 — Jogo Rápido volta para telas que o usuário nunca visitou

**Sintoma.** Jogo Rápido → durante ou após a partida, "Voltar" → cai numa tela
de táticas que o usuário nunca viu → "Voltar" de novo → cai numa lista de times
de uma liga que quase nunca é a que foi sorteada.

**Evidência.**
- `App.tsx:248-258` — `handleQuickPlay` sorteia liga e times, mas **não** chama `setSelectedLeague`; vai direto pra `setScreen('match')`.
- `AppScreens.tsx:397` — `matchBackScreen` para contexto `regular` é `'setup'`.
- `AppScreens.tsx:359` — o `onBack` do `setup` em contexto `regular` vai pra `'select'`.
- `AppScreens.tsx:253` — o `select` lista os times de `p.selectedLeague ?? getLeague('pl')` — ou seja, Premier League por padrão, independentemente da liga sorteada.

**Causa.** O Jogo Rápido é um atalho que salta duas telas na ida, mas a volta
percorre o caminho completo, passando por telas cujo estado nunca foi montado.

**Mudança.** Duas partes:

- **Coerência de dados:** em `handleQuickPlay`, chamar
  `setSelectedLeague(league)` com a liga sorteada. Isso conserta o `select` (e
  qualquer outra tela que dependa de `selectedLeague`) sem tocar em navegação.
- **Coerência de navegação:** usar o `returnScreen` que já existe. Em
  `handleQuickPlay`, `setReturnScreen('home')`; no renderizador `'match'`
  (`AppScreens.tsx:397`), quando `matchContext === 'regular'` e
  `p.returnScreen === 'home'`, o `matchBackScreen` deve ser `'home'`.

Fazer as duas — a primeira sozinha ainda deixa o usuário passando por um setup
que ele não pediu.

**Verificação.** Jogo Rápido → Voltar → deve cair na Home, não no setup. Depois:
Partida Única → escolher liga → o `select` deve continuar listando a liga
escolhida (não regredir).

**Pronto quando.** O Voltar do Jogo Rápido vai à Home e o fluxo de Partida Única
não muda.

---

### 2.4 — A aba "Elenco" sempre devolve o usuário ao Escritório

**Sintoma.** Estando em Transferências ou Meu Clube, tocar na aba Elenco e
depois voltar leva ao Escritório — uma terceira tela, que não é de onde o
usuário veio.

**Evidência.**
- `App.tsx:392` — a aba Elenco chama `handleEditCareerLeagueTactics`.
- `useCareerManager.ts:150-159` — esse handler abre o `setup` com `setIsTournamentEntry(true)`.
- `AppScreens.tsx:355` — o `onBack` do `setup`, em carreira com contexto `league`, vai sempre pra `career-league`.

**Causa.** O `onBack` do `setup` deriva o destino do *contexto de partida*, que
para o Elenco é sempre `'league'` — mas o Elenco não foi aberto a partir de um
jogo de liga, e sim de uma aba.

**Mudança.** Usar `returnScreen` (já existente):
- Em `App.tsx:392`, antes de chamar `handleEditCareerLeagueTactics`, gravar a
  tela atual: `setReturnScreen(screen)`.
- Em `AppScreens.tsx:353-360`, no `onBack` do `setup`: se `p.isTournamentEntry`
  e `p.returnScreen` estiver preenchido, ir para `p.returnScreen` e limpá-lo
  (`setReturnScreen(null)`); senão manter a lógica atual.

**Atenção.** `returnScreen` já é usado pelo fluxo de `league-select`
(`AppScreens.tsx:215`). Confirmar que os dois usos não colidem — o de
`league-select` é gravado em `handleCareerFromHome` (`App.tsx:265`) e consumido
em `:215`. Como o Elenco só é acessível de dentro da carreira já iniciada, os
ciclos de vida não se sobrepõem, mas **limpar sempre após consumir** é o que
garante isso. Se colidirem, a saída é um segundo campo (`tacticsReturnScreen`).

**Verificação.** Carreira → Transferências → aba Elenco → Voltar → deve voltar a
Transferências. Repetir de Meu Clube e da Central. E: Central → "⚽ Jogar" →
setup → Voltar → deve continuar indo pro Escritório (não regredir).

**Pronto quando.** As 3 origens do Elenco voltam para si mesmas e o fluxo de
jogo não muda.

---

# Onda 3 — Cliques desperdiçados

**Por que depois do estado:** estas mudanças adicionam atalhos. Se o estado
ainda vaza, um atalho novo só espalha o vazamento mais rápido.

**Esforço:** ~2-3h. **Risco:** médio (2.1 cria um handler novo no engine de carreira).

---

### 3.1 — "Jogar" da Central se comporta diferente entre liga e copa

**Sintoma.** Mesmo botão, mesmo rótulo "⚽ Jogar", dois comportamentos: se o
próximo jogo é de liga, vai direto pra tela de táticas; se é de copa, só abre o
chaveamento e o usuário tem que localizar o próprio card e clicar "Jogar" de
novo.

**Evidência.**
- `CareerHubScreen.tsx:282-287` — `if (nextMatch.type === 'league') onPlayNext(); else onViewCup();`
- `AppScreens.tsx:475` — `onViewCup` é só `() => p.setScreen('career-bracket')`.
- `useCareerManager.ts:173-182` — `handlePlayNextCareerMatch` faz o trabalho completo para a liga: acha o fixture pendente do usuário e delega pra `handlePlayCareerLeagueMatch`.
- **Agravante:** `CareerHubScreen.tsx:47-64` — `determineNextMatch` checa a copa **primeiro**, então o caso de 2 cliques extras é o mais comum, não a exceção.

Confirmado ao vivo durante a validação do crítico C3: o "⚽ Jogar" levou à tela
de chaveamento em vez da partida.

**Causa.** Existe o atalho para a liga (`handlePlayNextCareerMatch`) e não
existe o equivalente para a copa.

**Mudança.** Criar `handlePlayNextCareerCupMatch` em `useCareerManager.ts`,
espelhando `handlePlayNextCareerMatch` (`:173-182`):

```
1. Se não há careerState, sai.
2. cupState = careerState.season.cup
3. stageMatches = getStageMatches(cupState)        // já importado no arquivo
4. matchIdx = stageMatches.findIndex(m => !m.played && (m.homeTeamId === userId || m.awayTeamId === userId))
5. Se matchIdx < 0 → setScreen('career-bracket') e retorna (mesmo fallback do
   irmão de liga, que faz setScreen('career-league') quando não acha fixture).
6. Resolver home/away em cupState.teams e chamar
   handlePlayCareerBracketMatch(match, home, away, cupState.stage, matchIdx).
```

`handlePlayCareerBracketMatch` (`useCareerManager.ts:388-395`) já cuida de
`pendingCareerBracketStage`, `pendingCareerBracketIdx`, `saveLiveMatchMeta` e do
`setScreen('setup')` — não duplicar nada disso.

Expor o handler no retorno do hook (junto de `:960`), tipá-lo em
`AppScreensProps` e passar à `CareerHubScreen` como novo prop
`onPlayNextCup`. Em `CareerHubScreen.tsx:283`, trocar `onViewCup()` por
`onPlayNextCup()`.

**Cuidado com o tipo do estágio.** `handlePlayCareerBracketMatch` espera
`PlayableStage`, que não inclui `'champion'`. `determineNextMatch` já só retorna
match de copa quando `cup.stage !== 'champion'` (`CareerHubScreen.tsx:47`), mas
o handler novo é chamável de fora desse guard — validar o estágio dentro dele e
sair pelo fallback do passo 5 se não for jogável.

**Manter `onViewCup`.** Ele continua sendo usado pelo card de copa e pela aba —
não remover.

**Verificação.** Carreira, com jogo de copa pendente → Central → "⚽ Jogar" →
deve ir direto ao setup da partida de copa (não ao chaveamento). Jogar até o
fim → o resultado deve ser registrado no chaveamento corretamente (é aqui que um
`matchIdx` errado apareceria).

**Pronto quando.** Liga e copa levam ambos ao setup em 1 clique, e o resultado
da copa é gravado no lugar certo do bracket.

---

### 3.2 — Eliminado da copa, o usuário simula estágio por estágio

**Sintoma.** Eliminado nas oitavas, o usuário precisa clicar "Simular Outros" a
cada estágio — até 4 vezes — só para desbloquear o avanço de temporada. E nada
diz que é isso que está faltando.

**Evidência.**
- `BracketScreen.tsx:139-143` — "Simular Outros" só aparece por bloco de estágio e avança um por vez.
- `useCareerManager.ts:397-401` — `handleSimulateOtherCareerBracketMatches` roda `simulateAllCpuBracketMatches` uma vez, sem avançar estágio.
- `matchHandlers.ts:63` — `simulateAllCpuBracketMatches(state)`; `tournament.ts:191` — `advanceBracket(state)`.
- `CareerHubScreen.tsx:93` — `seasonReady` exige `cup.stage === 'champion'`.

**Causa.** O avanço de estágio é um passo manual separado da simulação, e o
usuário eliminado não tem mais nada a decidir — só a burocracia sobrou.

**Mudança.** Duas partes:

- **Engine/hook:** criar `handleSimulateCareerCupToEnd` em `useCareerManager.ts`
  que itere `simulateAllCpuBracketMatches` + `advanceBracket` até
  `stage === 'champion'`. Guardar contra loop infinito: limitar as iterações ao
  número de estágios restantes (4) e sair se um passo não alterar o estágio.
- **UI:** no `BracketScreen`, expor "Simular até o fim da copa" **apenas quando
  o time do usuário já estiver eliminado** — derivável de `state`: não há match
  não jogado com o `userTeamId` em nenhum estágio a partir do atual, e
  `championId !== userTeamId`. Extrair isso como `isUserEliminated(state)` em
  `tournament.ts`, com teste unitário — é lógica fácil de errar.

**Complementa o C3.** Com isso, a Central passa a ter ação também quando o que
falta é a copa. Considerar mostrar o mesmo botão na Central quando
`isUserEliminated` e a liga já estiver `done`.

**Verificação.** Carreira → perder na primeira fase da copa → simular a copa até
o fim em 1 clique → `seasonReady` deve liberar. Cenário oposto: com o usuário
ainda vivo na copa, o botão **não** deve aparecer.

**Pronto quando.** `isUserEliminated` tem teste, o botão aparece só quando deve,
e a copa chega a `champion` em 1 clique.

---

# Onda 4 — Online e mata-mata

**Por que quase no fim:** o 4.1 mexe em ciclo de vida de conexão P2P e é o único
item que não dá para validar com um navegador só. O 4.2 precisa de uma decisão
antes de virar código.

**Esforço:** ~3h (a maior parte em teste manual do online). **Risco:** alto no 4.1.

---

### 4.1 — Depois de uma partida online não há revanche nem desconexão

**Sintoma.** Terminada a partida online, a tela de estatísticas só oferece
"Menu". Sair pela Home não encerra a conexão peer. Para jogar de novo é preciso
refazer todo o pareamento.

**Evidência.**
- `useOnlineMatch.ts:34-41` — `handleOnlineMatchResult` faz `setScreen('stats')`.
- `AppScreens.tsx:447` — na `stats`, `isTournament` é `p.matchContext !== 'regular' && p.matchContext !== 'online'`, logo **falso** para online.
- `AppScreens.tsx:455` — `onContinue={isTournament ? p.handleContinueTournament : undefined}` → sem `onContinue` no online.
- `usePeerConnection.ts:192` expõe `disconnect`, mas ele só é chamado em `OnlineLobbyScreen.tsx:137,142,164` — nenhum caminho pós-partida chama.

**Causa.** O contexto `online` foi deliberadamente excluído de `isTournament`
(ele não tem "próxima rodada"), e com isso perdeu o único gancho de continuação.
A desconexão nunca foi ligada a nada fora do lobby.

**Mudança.** Duas partes, independentes:

- **Revanche:** em `AppScreens.tsx`, no renderizador `'stats'`, tratar online
  como caso próprio em vez de deixá-lo cair no `undefined`:
  `onContinue` = `() => p.setScreen('online-lobby')` quando
  `p.matchContext === 'online'`, com `continueLabel = 'Voltar ao Lobby'`.
  Não reusar `isTournament` — online não é torneio e misturar os dois vai
  reintroduzir o bug.
- **Desconexão:** chamar `peer.disconnect()` ao sair de um contexto online para
  a Home. O ponto certo **não** é o `goHome` genérico (que roda em contextos sem
  peer). Preferir um efeito de limpeza no `useOnlineMatch` ou um wrapper
  `leaveOnline()` usado pelos botões de saída em contexto online.

**Risco.** Desconectar cedo demais mata a partida do outro jogador. Desconectar
tarde demais deixa a sala fantasma. Testar as duas pontas.

**Verificação — precisa de dois navegadores de verdade.**
1. Pareamento, partida completa, host clica "Voltar ao Lobby" → deve voltar ao lobby, e o convidado não deve travar.
2. Mesma coisa pelo convidado.
3. Um dos lados vai pra Home → conferir em `usePeerConnection` que o estado sai de conectado; a sala não deve ficar aberta.
4. Regressão: partida amistosa e de torneio → o `onContinue` delas não deve mudar.

**Pronto quando.** Os 4 cenários passam com dois clientes reais. Se não houver
como testar com dois clientes, **não fazer a parte da desconexão** — entregar só
a revanche e registrar a outra metade como pendente.

---

### 4.2 — Mata-mata pode terminar sem nenhum botão de ação

**Sintoma.** Em teoria, um jogo eliminatório pode chegar ao fim sem nenhum botão
na barra de ações — sem "Estatísticas", sem "Continuar", sem nada.

**Evidência.**
- `MatchScreen.tsx:1037` — o guard é `phase === 'done' && (isKnockout ? knockoutResult : result)`.
- `MatchScreen.tsx:1048-1053` — o `else` só renderiza algo se `started && phase === 'simulating'`, que é falso em `done`.
- `MatchScreen.tsx:339-341` — `handlePenaltyComplete` faz `setShowPenaltyShootout(false)` e **só depois** o early-return `if (!h || !a || !state || !storedResult) return;`. Nesse caminho o overlay fecha e `knockoutResult` nunca é preenchido.

**Prova de que é código morto hoje.** O rótulo `MatchScreen.tsx:1040` é
`isKnockout && !knockoutResult ? '⏳ Calculando...' : '📊 Estatísticas'`. Mas
para entrar nesse branch o guard da linha 1037 já exigiu `knockoutResult`
truthy quando `isKnockout`. Logo `!knockoutResult` é sempre falso e
"⏳ Calculando..." é **inalcançável**. Alguém previu o estado e o guard o
impede de aparecer.

**Decisão necessária antes de codar.** Duas leituras possíveis:
- **(a)** O early-return de `:341` é alcançável (os refs podem estar nulos) → o
  guard está escondendo uma tela travada, e a correção é afrouxá-lo.
- **(b)** O early-return é puramente defensivo e nunca dispara → não há bug de
  usuário, e a correção é remover o rótulo morto.

**Como decidir.** Instrumentar temporariamente o early-return de `:341` com um
`console.error` e jogar ~20 mata-matas que vão a pênaltis (copa avulsa, simular
até empatar). Se nunca disparar, é (b).

**Mudança se (a).** Trocar o guard de `:1037` por `phase === 'done'` e deixar o
botão de estatísticas desabilitado enquanto `knockoutResult` for nulo — o rótulo
"⏳ Calculando..." passa a ser alcançável e faz sentido.

**Mudança se (b).** Remover o `isKnockout && !knockoutResult ? '⏳ Calculando...' :`
do rótulo e mover o early-return de `handlePenaltyComplete` para **antes** do
`setShowPenaltyShootout(false)`, para que o estado inconsistente não consiga
fechar o overlay.

**Pronto quando.** Ou o botão aparece desabilitado no estado intermediário (a),
ou não há mais código inalcançável e o overlay não fecha em estado inválido (b).

---

### 4.3 — Sem pausas restantes, o "Voltar" fica travado

**Sintoma.** Durante a simulação, o "Voltar" fica desabilitado. O botão de pausa
também, depois das 2 pausas. A única saída é "⚡ Simular até o fim" — renderizado
com `fontSize: 11, opacity: 0.7`, ou seja, visualmente rebaixado exatamente
quando é a única rota disponível.

**Evidência.**
- `TopBar.tsx:27` — `<button className="back-btn" onClick={onBack} disabled={simulating && !paused}>`
- `TopBar.tsx:36-40` — o botão de pausa tem `disabled={pausesRemaining <= 0 && !paused}`; começa em 2 (`useMatchSimulation.ts:55`).
- `MatchScreen.tsx:1050` — o `style={{ fontSize: 11, opacity: 0.7 }}` do "Simular até o fim".

**Causa.** O estilo do botão é fixo, escrito para quando ele é uma opção
secundária. Não reage a ter se tornado a única.

**Mudança.** Preferir a de menor risco: remover o rebaixamento visual quando
`pausesRemaining === 0` — estilo condicional em `MatchScreen.tsx:1050`.

A alternativa (permitir o Voltar com diálogo de confirmação de abandono) é mais
invasiva: mexe no guard do `TopBar`, precisa de um diálogo novo e tem que
decidir o que fazer com a partida abandonada em liga/copa (o fixture fica
pendente? conta como derrota?). Não fazer agora — anotar como proposta separada.

**Verificação.** Partida → gastar as 2 pausas → o "Simular até o fim" deve estar
em destaque normal. Com pausas sobrando, deve continuar discreto.

**Pronto quando.** O botão muda de peso visual conforme é ou não a única saída.

---

# Onda 5 — Decisão de produto

**Esforço:** 15min de decisão + 30min de código. **Risco:** baixo.

---

### 5.1 — `matchday` nunca acontece em amistoso, jogo rápido e online

**Sintoma.** Só liga e copa passam pela prévia. Amistoso, Jogo Rápido e online
vão direto ao jogo.

**Evidência.**
- `useGameFlow.ts:77` — `goViaMatchday` cobre apenas `'league'` e `'bracket'`.
- `App.tsx:257` — `handleQuickPlay` faz `setScreen('match')` direto.
- `useOnlineMatch.ts` — `handleStartOnlineMatch` também vai direto pra `match`.
- Resíduo: `MatchdayScreen.tsx:60` — o rótulo `'Amistoso'` é inalcançável.

**Já resolvido em parte.** O `else p.setScreen('setup')` inalcançável do
`onBack` do `matchday` deixou de existir com a correção do C2.

**Precisa de decisão.** A prévia (estádio, clima, H2H, destaques) faz parte da
experiência de um amistoso, ou é ritual de competição?
- **Se for ritual de competição:** o item 1.3 já remove o rótulo `'Amistoso'` ao
  trocar `matchContext` por `contextLabel`. Nada mais a fazer — fechar o item.
- **Se for para todos:** estender `goesViaMatchday` (o helper criado no 1.1) a
  `'regular'`; e então corrigir o fallback do online, porque hoje o `setup` em
  contexto online levaria a `'select'` (`AppScreens.tsx:359`), que é o lugar
  errado — deveria ser `'online-lobby'`.

**Recomendação.** Ritual de competição. O Jogo Rápido existe justamente para
pular cerimônia ("vai direto pro jogo", diz o próprio card na Home); adicionar
uma tela de prévia nele contradiz o propósito do modo.

**Pronto quando.** A decisão está registrada e o rótulo morto não existe mais.

---

# Ordem de execução

| Ordem | Onda | Itens | Depende de | Esforço |
|---|---|---|---|---|
| 1 | Rótulos | 1.1, 1.2, 1.3 | — | ~1h |
| 2 | Estado | 2.1 → 2.2 → 2.3 → 2.4 | 2.2 depois de 2.1 (mesma causa) | ~2h |
| 3 | Cliques | 3.1, 3.2 | — | ~2-3h |
| 4 | Online/KO | 4.3 → 4.2 → 4.1 | 4.2 precisa da instrumentação | ~3h |
| 5 | Decisão | 5.1 | 1.1 (helper) e 1.3 (rótulo) | ~45min |

**Dentro da Onda 4, fazer 4.3 primeiro** (é o mais barato e independente), depois
4.2 (que precisa da coleta de dados), e 4.1 por último, porque é o único que
exige dois clientes reais.

**A Onda 5 fecha sozinha** se a decisão for "ritual de competição" e a Onda 1 já
tiver sido feita — nesse caso é só registrar.

---

# Fora do escopo deste plano

**Auditoria visual.** Espaçamento, tipografia, contraste e alvos de toque não
foram avaliados: o agente de auditoria de UI foi interrompido por limite mensal
de gasto da conta antes de produzir o relatório. Esses achados são independentes
dos daqui e podem ser executados em paralelo. Para rodar, é preciso levantar o
limite em claude.ai/settings/usage.

**Dívidas anotadas de passagem, não planejadas:**
- `hideTopNav` é usado como proxy de "estou em carreira" em 8 pontos de
  `LeagueScreen` e `BracketScreen`. Se surgir um terceiro modo, trocar por uma
  prop `mode` explícita.
- Nenhuma das telas de fluxo tem teste de navegação. Os itens 2.x e 3.x são
  exatamente o tipo de regressão que um teste de `screenMap` pegaria — vale
  considerar um teste que, para cada `Screen`, afirme que o `onBack` leva a uma
  tela alcançável.
