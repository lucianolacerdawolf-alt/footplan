# Backlog FootPlan

Lista do que está pendente. Itens marcados com 🟢 são pequenos (<1h), 🟡 médios (1-3h), 🔴 grandes (3h+).

---

## 🐛 Bugs / Limpeza pendente

- 🟢 **`public/fundo.png` tem 5.5 MB** — comprimir para WebP ou JPG de baixa qualidade. Recomendado: `cwebp -q 70 fundo.png -o fundo.webp` ou converter via TinyPNG. Carregamento inicial sofre. Após comprimir, ajustar `src/index.css` (`url('/fundo.png')` → `/fundo.webp`).

---

## 🎮 Gameplay / UX

- 🟡 **Substituições só no intervalo** — durante o 2º tempo não dá pra trocar jogador cansado. Exigiria pausar o replay; trabalho real.

---

## 🏗️ Saúde do código

- 🔴 **`App.tsx` tem 504 linhas e 40+ chamadas de hook** — virou god component. Extrair `useTournamentNavigation()` que retorne `{state, screen, handlers}` ajudaria muito. (Tentei na Fase 4 mas adiei pelo risco/benefício.)
- 🟡 **`matchEngine.ts` ainda tem 484 linhas** — `resolveAttack`, `resolveShot`, `applyFatigue`, `calculatePossession` poderiam virar arquivos próprios pra reduzir mais. Risco médio.
- 🟡 **Premier League hardcoded** em `data/premierLeague.ts` (573 linhas). Se quiser outras ligas, falta abstrair "liga ativa".
- 🟡 **Zero testes de componente** — engine tem 79 testes; falta cobrir UI (`MatchStatsScreen`, `BracketScreen`, etc) via React Testing Library.

---

## 📦 Features que ficaram da Fase 5 (não implementadas)

- 🔴 **5.1 Conquistas** — sistema de achievements ("Ganhar Copa invicto", "Hat-trick em uma partida", "10 jogos sem perder") + UI. Não implementado.
- 🔴 **5.2 Mercado de transferências** — entre temporadas, comprar 1 jogador free agent. Precisa de suporte a "temporadas" primeiro.

---

## ✅ Já entregue (referência)

- Fase 1: sons, toast, fade entre telas, H2H, loading state
- Fase 2: tela pós-jogo (Man of the Match, notas, scorers, cartões)
- Fase 3: tutorial, lesões, limite de 3 substituições
- Fase 4: refactor `usePersistedState`, `PlayableStage` centralizado, testes de calibração
- Fase 5.3: tema escuro fixo
- Fase 5.4: ajustes mobile
- Calibração: gols 1.4 → 2.74 por partida
- Retomar progresso ao voltar pra liga/copa
- Botão "Editar Táticas" entre rodadas (liga e copa)
- Botão único "Simular Outros" na copa
- Slider de velocidade do replay (1x/2x/4x)
- CPU varia tática entre rodadas
- Resumo de fadiga/lesão no header da liga
- `Math.random` substituído por RandomFn em `tournament.ts` e `commentary.ts`
- `Pitch.tsx`: removido `as any` (PlayerCoord exportado de steering.ts)
- `MatchScreen.tsx`: removido `eslint-disable` do useEffect (refs pra capturar estado)
- `TutorialOverlay`/`SetupScreen`: migrados pra `useLocalStorage`
- Modal Resume fecha com tecla `Escape`
- Badge de moral no SetupScreen (😄/😊/😐/😕/😟 com valor +/-)
- Lesões aplicadas pra CPU também (5% de chance em jogos simulados)
- Acessibilidade: roles ARIA em modais (resume, tutorial), `role="status"` em toast, aria-label em botões de velocidade, aria-label semântico em pills de H2H, alt descritivo em escudos não-decorativos
- `key={i}` substituído por chave composta com identidade real (`MatchStatsScreen` gols/cartões)
- Mando de campo no engine (+8% no ataque do mandante, teste de regressão incluído)
- H2H detalhado: `H2HRecord.log` com até 5 jogos completos (data + placar), exibido em `<details>` expansível no SetupScreen
- 29 testes novos: `tournament.test.ts` (16) e `playerRating.test.ts` (13). Total: 79 testes
- Refactor parcial do `matchEngine.ts`: constantes movidas pra `matchConfig.ts` (52 linhas), helpers puros pra `matchHelpers.ts` (59 linhas). matchEngine reduziu de 562 → 484 linhas
