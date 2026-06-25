# Backlog FootPlan

Lista do que está pendente. Itens marcados com 🟢 são pequenos (<1h), 🟡 médios (1-3h), 🔴 grandes (3h+).

---

## 🐛 Bugs / Limpeza pendente

- 🟢 **`public/fundo.png` tem 5.5 MB** — comprimir para WebP ou JPG de baixa qualidade. Recomendado: `cwebp -q 70 fundo.png -o fundo.webp` ou converter via TinyPNG. Carregamento inicial sofre. Após comprimir, ajustar `src/index.css` (`url('/fundo.png')` → `/fundo.webp`).
- 🟢 **`Pitch.tsx:185` usa `as any`** — tipar `coords` corretamente em `buildSteeringPlayers`.
- 🟢 **`MatchScreen.tsx:108` tem `eslint-disable react-hooks/exhaustive-deps`** — revisar dependências do effect e resolver propriamente.
- 🟢 **`localStorage` direto em `TutorialOverlay.tsx` e `SetupScreen.tsx:76`** — migrar pra `useLocalStorage` (já existe).
- 🟢 **Modal de Resume não fecha com `Escape`** — adicionar `useEffect` com keydown listener.
- 🟡 **Acessibilidade**: nenhum botão tem `aria-label` consistente. Escudos, toasts e modais ficam confusos pra screen readers.
- 🟡 **`key={i}` em listas** (`MatchStatsScreen`, `TutorialOverlay`, h2h-pills) — funciona porque são estáticas, mas é code smell. Trocar por `key={item.id}` ou similar.

---

## 🎮 Gameplay / UX

- 🟡 **Mando de campo não influencia o placar** — engine ignora quem é mandante. Real: ~+0.3 gols vantagem mandante. Adicionar `homeAdvantage` modifier em `resolveAttack`.
- 🟡 **Histórico H2H só guarda placar agregado** — não tem datas nem detalhes dos confrontos. Limita uso analítico. Estender `H2HRecord` com lista de últimos 5 jogos completos.
- 🟢 **Sem indicador visual de moral** — usuário não vê quando o time está em alta/baixa antes da partida. Badge no SetupScreen mostrando 😊 +6 / 😟 -4 etc.
- 🟢 **Lesões só do user** — CPU é imune, quebra a imersão da liga. Aplicar `applyPostMatchInjuries` em times CPU também (talvez com chance menor pra evitar plantéis dizimados).
- 🟡 **Substituições só no intervalo** — durante o 2º tempo não dá pra trocar jogador cansado. Exigiria pausar o replay; trabalho real.
- 🟢 **`generateLeagueSchedule` sorteia mando aleatório** — mas no ano seguinte cada confronto inverte mandante/visitante. Não tem temporadas múltiplas então não importa hoje.

---

## 🏗️ Saúde do código

- 🔴 **`App.tsx` tem 504 linhas e 40+ chamadas de hook** — virou god component. Extrair `useTournamentNavigation()` que retorne `{state, screen, handlers}` ajudaria muito. (Tentei na Fase 4 mas adiei pelo risco/benefício.)
- 🟡 **`matchEngine.ts` tem 562 linhas e `simularPartida` enorme** — extrair `runCycle`, `resolveAttack`, `applyCards` em arquivos separados.
- 🟡 **Sem testes para `tournament.ts`** — `recoverFatigue`, `applyPostMatchInjuries`, `randomizeCPUTactics`, `generateLeagueSchedule` são puras e fáceis de testar.
- 🟡 **Premier League hardcoded** em `data/premierLeague.ts` (573 linhas). Se quiser outras ligas, falta abstrair "liga ativa".
- 🟡 **Zero testes de componente** — pelo menos `MatchStatsScreen` e `playerRating` seria barato testar.
- 🟢 **`Math.random` em `commentary.ts:4`** — `pickRandom` ainda usa Math.random direto. Receber RandomFn injetável.

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
- `Math.random` substituído por RandomFn em `tournament.ts`
