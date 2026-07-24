# ⚽ FootPlan — Simulador Tático de Futebol

Simulador de partidas com foco em **escolhas estratégicas** e **simulação baseada em dados**. Escolha entre **6 ligas europeias** (Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Liga Portugal) com elencos que sincronizam com dados reais, monte suas táticas e dispute partidas avulsas, uma temporada completa de pontos corridos, uma das 6 copas nacionais, ou jogue **online contra um amigo via P2P** — instalável como app (PWA), tudo no navegador, sem backend próprio.

🌐 **Jogue agora:**
- [footplan.pages.dev](https://footplan.pages.dev) (Cloudflare Pages)
- [lucianolacerdawolf-alt.github.io/footplan](https://lucianolacerdawolf-alt.github.io/footplan/) (GitHub Pages)

📱 **Instalar no celular:** abra qualquer um dos links acima no Chrome/Safari → menu → "Adicionar à tela inicial" / "Instalar app". Funciona offline depois do primeiro carregamento.

---

## 🎮 Modos de Jogo

| Modo | Descrição |
|------|-----------|
| **Jogar Online** | P2P via WebRTC (PeerJS). Crie uma sala (código de 4 letras), compartilhe com um amigo e jogem em tempo real com simulação determinística por seed. |
| **Partida Única** | Escolha 2 times de qualquer uma das 6 ligas, configure as táticas e jogue uma partida avulsa (vs CPU ou hot-seat). |
| **Campeonatos** | Temporada completa em qualquer uma das 6 ligas: 18-20 times, pontos corridos. Você controla seu time e simula os demais. Estado salvo automaticamente. |
| **Copas** | Copa eliminatória nacional correspondente à liga escolhida (FA Cup, Copa del Rey, DFB-Pokal, Coppa Italia, Coupe de France, Taça de Portugal). Oitavas → Quartas → Semis → Final. Prorrogação e pênaltis em caso de empate. |
| **Modo Carreira** | Progressão multi-temporada: todas as 6 ligas evoluem em paralelo, jogadores envelhecem/evoluem, reputação de técnico, trocas diretas entre clubes, histórico de temporadas. Ver seção dedicada abaixo. |
| **Conquistas** | 15 conquistas desbloqueáveis com progresso persistido. |

---

## ✨ Features Principais

### Ligas e Elencos
- **6 ligas europeias** com elencos reais calibrados (OVR, posições, atributos)
- **Sincronização de elenco ao vivo** via [football-data.org](https://www.football-data.org/): botão "🔄 Atualizar elencos" busca o elenco atual de cada time, mesclando com os dados estáticos — jogadores que saíram (transferência, aposentadoria) somem, contratações novas entram com atributos sintéticos calibrados pro OVR do time. Cache de 7 dias, sempre com fallback offline pros dados estáticos se a API falhar ou estiver sem chave configurada.

### Tática e Plantel
- **5 ajustes táticos** com impacto real no motor: formação (5 opções), mentalidade, intensidade, linha defensiva e amplitude
- **3 presets de tática** (Ofensivo / Equilibrado / Defensivo) com tooltips explicativos, disponíveis nos 4 pontos de edição de tática do jogo
- **Pré-jogo**: faixa de análise tática comparando seu time com o adversário
- **Pós-jogo**: breakdown tático mostrando os bônus/penalidades aplicados a cada time
- **Substituições e escalação manual** no SetupScreen
- **5 substituições por partida, distribuídas em até 3 janelas de parada** (pausa no 1º tempo, intervalo, pausa no 2º tempo) — trocas feitas durante uma pausa no 2º tempo agora têm efeito real no restante do jogo (motor roda em blocos, não pré-calcula o tempo inteiro de uma vez)
- **Tutorial interativo** na primeira partida
- **Botão "Editar Táticas"** disponível entre rodadas

### Impacto Tático Real
Cada escolha do jogador afeta diretamente a simulação:

| Configuração | Efeito |
|---|---|
| **4-2-3-1** | +15% ataque, +5% posse, -5% defesa |
| **5-3-2** | +15% defesa, -10% ataque |
| **Intensidade Alta** | +6% desarmes, mas +40% faltas e +50% lesões |
| **Linha Alta** | 30% chance de impedimento, mas +12% vulnerável a contra-ataque |
| **Jogo Aberto** | +8% ataque, defesa menos compacta |

### Simulação
- **Comentário tático no 1º minuto** explicando o confronto entre as formações
- **Diagrama de formação** antes do apito inicial
- **Bola segue o passador/receptor real** do evento de passe, com arco de trajetória proporcional à distância (não é mais um par aleatório de jogadores)
- **Desarme muda a posse de fato** — o time que rouba a bola assume o ataque no ciclo, consistente com a narração
- **Timing realista de gols**: poucos gols no início (ritmo de estudo), pico nos 80'-90' (desespero tático + fadiga)
- **Pausa dramática de 2s no gol** com explosão da torcida
- **Slider de velocidade** (1x / 2x / 3x / 4x)
- **Intervalo interativo** — trocar formação e fazer substituições
- **Prorrogação e pênaltis** nos torneios eliminatórios
- **CPU varia tática entre rodadas**, com `cpuProfile` diferente por liga (ex: Bundesliga mais intensa/vertical, Serie A mais defensiva)

### Motor de Simulação Avançado
- **Momentum**: gols dão +30 de impulso, decai por ciclo; time atrás nos minutos finais ganha urgência
- **Fadiga recalibrada**: sem mais quedas irreais de OVR durante a partida; recuperação parcial no intervalo
- **Lesões durante a partida**: chance após faltas + chance aleatória; replay pausa automaticamente
- **Escanteios → gol de cabeça**, **pênaltis durante o jogo**
- **Piso defensivo**: todo time tem defesa mínima, evitando goleadas irreais
- **Compressão de atributos** para evitar distorções em gaps extremos de OVR
- **Goleiro gerado proceduralmente calibrado** — atributos-chave (posicionamento/visão) recebem o boost correto, sem mais desviar do OVR alvo
- **Feedback sonoro**: torcida contínua, explosão no gol, reação em falta/cartão/trave — tudo gerado proceduralmente via Web Audio API (zero arquivos de áudio)

### Pós-jogo (MatchStatsScreen)
- **Man of the Match** com nota colorida, notas dos jogadores (4.0–10.0)
- **Lista de gols**, histórico de cartões, estatísticas completas (posse, chutes, faltas)
- **Breakdown tático**: ficha do que cada time usou e os bônus aplicados

### Modo Carreira
- **Progressão multi-temporada**: todas as 6 ligas evoluem em paralelo (não só a liga ativa) — jogadores envelhecem, evoluem/declinam por desempenho e idade, se aposentam e são substituídos por gerados proceduralmente
- **Reputação de técnico**: sobe com títulos/boa colocação, afeta a chance de clubes CPU aceitarem propostas de troca
- **Trocas diretas entre clubes**: 1-por-1 sem dinheiro, limitadas a 3 por temporada — CPU avalia a proposta por diferença de OVR, superávit de posição e sua reputação
- **Liga + copa disputadas juntas** a cada temporada, com histórico (posição, resultado da copa, trocas usadas, delta de reputação) por ano
- **Hub da carreira** (`CareerHubScreen`) como tela central: botão de destaque "⚽ Jogar" pula direto pra tática do próximo jogo da liga (some quando a temporada tá pronta pra avançar), "Ver Liga" abre só a classificação (consulta pura, sem controles de jogo — ver "Hub de Torneio" abaixo), "Ver Copa", "Propor Troca", histórico de temporadas
- **Save único** em `fp:career`, separado dos saves de Campeonatos/Copas avulsos — começar uma carreira nova pede confirmação se já existir uma em andamento

### Hub de Torneio
- **LeagueScreen** (dia de jogo): seu confronto da rodada (Jogar/Simular), outros jogos da rodada (Simular Todos), avançar rodada — sem a tabela, pra caber numa tela só no celular
- **LeagueTableScreen** (consulta pura): só a classificação, com zonas coloridas (Champions, Europa, Conference, Rebaixamento) e rolagem horizontal contida — tela separada, sem nenhum controle de jogo, acessada via link/botão a partir do LeagueScreen ou do Hub da carreira
- **BracketScreen**: mostra apenas a fase atual, botão único "Simular Outros"
- **Histórico H2H**: confrontos passados exibidos no SetupScreen

### Infraestrutura
- **PWA instalável**: manifest + service worker (`vite-plugin-pwa`), funciona offline após o primeiro carregamento, ícones 192/512px
- **Sessão de partida ao vivo sobrevive a F5**: estado completo da partida em andamento (placar, escalação, fadiga, substituições usadas, cronologia) é salvo em `localStorage` e restaurado automaticamente — sempre retomando em pausa, nunca auto-resumindo um replay ao vivo
- **Progresso de liga/copa** salvo automaticamente com banner "Continuar" na seleção de liga, cobrindo qualquer fluxo de entrada
- **Layout mobile**: `box-sizing: border-box` global, campo/tabelas contidos na largura da tela em vez de estourar

---

## 🖥 Fluxo de Telas

```
HomeScreen
├── Jogar Online → OnlineLobbyScreen → SetupScreen → MatchScreen → MatchStatsScreen
├── Partida Única → LeagueSelectScreen → TeamSelectionScreen → SetupScreen → MatchScreen → MatchStatsScreen
├── Campeonatos → LeagueSelectScreen → [Continuar?] → TournamentSetupScreen → SetupScreen → LeagueScreen ⇄ LeagueTableScreen
│                                                                                     ↓
│                                                          MatchScreen → MatchStatsScreen → LeagueScreen
├── Copas → CupSelectScreen → [Continuar?] → TournamentSetupScreen → SetupScreen → BracketScreen
│                                                                              ↓
│                                                   MatchScreen → MatchStatsScreen → BracketScreen
├── Modo Carreira → [tela de time, 1ª vez] → CareerHubScreen
│                     ├── ⚽ Jogar → SetupScreen → MatchScreen → MatchStatsScreen → LeagueScreen (rodada) ⇄ LeagueTableScreen
│                     ├── Ver Liga → LeagueTableScreen (consulta pura)
│                     ├── Ver Copa → BracketScreen → SetupScreen → MatchScreen → MatchStatsScreen → BracketScreen
│                     ├── Propor Troca → TradeProposalScreen
│                     └── Avançar Temporada → SeasonEndScreen → CareerHubScreen (temporada seguinte)
└── Conquistas → AchievementsScreen
```

Um F5 durante qualquer partida ao vivo restaura direto pra `MatchScreen` em pausa, na posição salva.

---

## ⚙️ Motor de Simulação

### Estrutura da Partida
- **1º Tempo**: 44 ciclos (~2 min cada, 0–88'), simulados em blocos
- **Intervalo**: overlay para trocar táticas e fazer substituições, com recuperação parcial de fadiga
- **2º Tempo**: mais 44 ciclos (45'–90'), também em blocos — permite que substituições feitas numa pausa afetem o restante do jogo
- **Prorrogação** (mata-mata): 2 × 7 ciclos
- **Pênaltis** (empate após prorrogação): 5 cobranças + morte súbita

### Fórmulas
```
Ataque  = Σ(Velocidade + Drible) × mentalidade × formação × moral × momentum × RNG
Defesa  = Σ(Desarme + Posicionamento) × formação × linha × amplitude × RNG + BASE_DEFENSE
Chute   = Finalização × mentalidade × RNG(0.65–1.35)
DefesaGK = PosicionamentoGK × RNG(0.65–1.35) + BASE_GK
```

### Distribuição de Gols

| Minutos | Multiplicador | Comportamento |
|---------|--------------|---------------|
| 0'-4' | 0.50× | Ritmo de estudo |
| 4'-15' | 0.72× | Menor incidência |
| 15'-30' | 0.90× | Aquecendo |
| 30'-45' | 1.02× | Leve pico pré-intervalo |
| 45'-55' | 0.82× | Volta morna |
| 55'-70' | 0.95× | Normal |
| 70'-80' | 1.12× | Acelerando |
| **80'-90'** | **1.28×** | **Pico: desespero + fadiga** |

> **Calibração**: ~2.2–2.7 gols/jogo em times equiparados. Travada por teste automatizado com 1000 partidas.

---

## 🛠 Tecnologia

| Camada | Stack |
|--------|-------|
| **Frontend** | React 19 + TypeScript (strict mode) |
| **Build** | Vite 8 |
| **Testes** | Vitest 3 (220 testes) + Testing Library (componentes) |
| **Estilo** | CSS Modules + App.css/index.css globais |
| **Renderização** | SVG (campo tático) + HTML/CSS |
| **Áudio** | Web Audio API (sons procedurais, zero arquivos) |
| **Estado** | React Hooks |
| **Persistência** | localStorage via `useLocalStorage` / `usePersistedState` |
| **Multiplayer** | PeerJS (WebRTC P2P) |
| **Dados de elenco ao vivo** | [football-data.org](https://www.football-data.org/) API v4, via proxy Cloudflare Worker (contorna CORS + esconde a chave) |
| **PWA** | `vite-plugin-pwa` (service worker + manifest) |
| **Deploy** | GitHub Pages (`gh-pages`) + Cloudflare Pages (`wrangler`) |

---

## 📂 Estrutura do Projeto

```
src/
├── engine/
│   ├── types.ts                # Player, Team, Strategy, MatchEvent, MatchResult
│   ├── matchEngine.ts           # Motor de simulação — beginMatchState/simularProximoBloco
│   │                             # (chunked) + funções de partida completa
│   ├── matchConfig.ts           # Constantes de tuning (ATK_CHANCE, INTENSITY_FATIGUE, etc)
│   ├── matchHelpers.ts          # effective(), compressAttr(), getStarters()
│   ├── resolveAttack.ts         # Resolução ataque vs defesa
│   ├── resolveShot.ts           # Resolução finalização vs goleiro
│   ├── calculatePossession.ts   # Cálculo de posse de bola
│   ├── commentary.ts            # Narração (gols, faltas, cartões, lesões, pênaltis)
│   ├── tacticalCommentary.ts    # Comentário tático contextual
│   ├── tacticPresets.ts         # 3 presets de tática (Ofensivo/Equilibrado/Defensivo)
│   ├── tacticExplanations.ts    # Textos explicativos usados nos tooltips e no tutorial
│   ├── tournament.ts            # Liga, Copa, fadiga, lesões, CPU tática
│   ├── career.ts                # Modo Carreira: progressão de jogador, trocas, reputação, temporada
│   ├── playerRating.ts          # Notas 4-10 e Man of the Match
│   ├── steering.ts              # Movimentação dos jogadores no SVG
│   ├── rng.ts                   # RNG com seed (SeededRng para multiplayer)
│   ├── achievements.ts          # 15 conquistas com condições
│   ├── constants.ts             # FORMATIONS, FORMATION_COUNTS
│   └── __tests__/               # 11 suítes de teste do motor
├── data/
│   └── leagues/                 # Uma liga por arquivo (premierLeague, laLiga, bundesliga,
│                                 # serieA, ligue1, ligaPortugal) + generateTeam.ts (gerador
│                                 # procedural calibrado) + types.ts (LeagueDefinition)
├── services/
│   ├── footballApi.ts           # Cliente football-data.org (direto ou via proxy)
│   └── rosterSync.ts            # Casa time estático × time remoto por nome (scoreMatch +
│                                 # atribuição gulosa), mescla elenco, cache 7 dias
├── components/
│   ├── HomeScreen                Menu principal
│   ├── LeagueSelectScreen        Escolha de liga (Campeonatos / Partida Única)
│   ├── CupSelectScreen           Escolha de copa
│   ├── OnlineLobbyScreen         Criar/entrar sala, seleção de time, código 4 letras
│   ├── TeamSelectionScreen       Seleção partida única
│   ├── TournamentSetupScreen     Seleção time para torneio
│   ├── SetupScreen               Táticas + escalação + H2H + análise tática
│   ├── MatchScreen               Campo, replay, pausa/subs (3 janelas), intervalo
│   ├── Pitch                     Campo SVG com bola animada e steering
│   ├── InfoTooltip / TacticLabel Tooltips explicativos de tática
│   ├── CommentaryFeed            Feed de comentários
│   ├── MatchStatsScreen          Pós-jogo: MOTM, notas, gols, cartões, stats, tática
│   ├── LeagueScreen               Dia de jogo: seu confronto da rodada, outros jogos, avançar rodada
│   ├── LeagueTableScreen          Classificação (consulta pura, sem controles de jogo)
│   ├── BracketScreen              Hub de copa
│   ├── CareerHubScreen            Hub do Modo Carreira: reputação, resumo da temporada, histórico
│   ├── TradeProposalScreen        Propor troca direta com clube adversário
│   ├── SeasonEndScreen            Resumo de fim de temporada + avançar
│   ├── AchievementsScreen         Grade de conquistas
│   ├── TutorialOverlay            Tutorial interativo
│   └── Toast                      Notificações
├── hooks/
│   ├── useMatchSimulation        Loop do replay em blocos, pause/resume, restauração de sessão
│   ├── useLiveRoster             Dispara/acompanha a sincronização de elenco ao vivo
│   ├── usePeerConnection         PeerJS: criar sala, conectar, enviar/receber
│   ├── useAchievements           Persistência e avaliação de conquistas
│   ├── useMatchHistory / useH2H  Histórico de partidas / head-to-head
│   ├── useAppShell / useGameFlow Navegação entre telas e orquestração de fluxo
│   ├── useLeagueManager / useBracketManager  Estado de liga / copa (Campeonatos)
│   ├── useCareerManager          Estado da carreira: progressão, trocas, avanço de temporada
│   └── useLocalStorage / usePersistedState   Persistência genérica
├── utils/
│   ├── liveMatchPersistence.ts  Serializa/restaura o estado ao vivo da partida (Maps/Sets)
│   ├── teamUtils.ts             cloneTeam
│   ├── audio.ts                 sfx: torcida, gol, falta, cartão, trave
│   └── playerOvr.ts             Cálculo de OVR
└── App.tsx / App.css / index.css / main.tsx

worker/
└── football-proxy.js            Cloudflare Worker — proxy CORS + esconde a chave da API
                                  (ver worker/README.md pra deploy)
```

---

## 🚀 Como Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run test     # 220 testes
```

### Sincronização de elenco ao vivo (opcional)

Sem configuração nenhuma, o jogo funciona 100% com os dados estáticos. Pra habilitar a sincronização com football-data.org:

```bash
cp .env.example .env
# preencha VITE_FOOTBALL_PROXY_URL (recomendado, ver worker/README.md) ou VITE_FOOTBALL_API_KEY
```

---

## 🧪 Testes

**220 testes** cobrindo:
- `matchEngine.test.ts` — invariantes, determinismo, cartões/expulsões, OVR
- `calibration.test.ts` — 1000 partidas: média de gols, dominância OVR, empates, mando de campo
- `tournament.test.ts` — fadiga, lesões, calendário, chaveamento, classificação
- `playerRating.test.ts` / `playerOvr.test.ts` — notas, MOTM, cálculo de overall
- `achievements.test.ts` / `steering.test.ts` / `tacticalCommentary.test.ts` / `resolveAttack.test.ts` / `resolveShot.test.ts` / `rng.test.ts`
- `rosterSync.test.ts` — sincronização de elenco: fallback sem chave, modo proxy, mesclagem, cache, erros de rede/rate-limit, e regressão específica pra colisões de nome (ex: "Barcelona" vs "RCD Espanyol de Barcelona")
- `useMatchSimulation.test.ts` — qual janela de pausa está ativa em cada momento da partida (substituições)
- `career.test.ts` / `useCareerManager.test.ts` — progressão de jogador, avaliação de troca (RNG determinístico), reputação, avanço de temporada
- Componentes (`@testing-library/react` + `jsdom`, isolado por arquivo): 3 telas de seleção de time, dia de jogo da liga (LeagueScreen) e classificação (LeagueTableScreen) como telas separadas, tela de estatísticas pós-jogo, chaveamento de copa (partida do usuário, simular outros, fase de campeão)

---

## 💾 Chaves do localStorage

| Chave | Conteúdo |
|---|---|
| `fp:leagueState:{ligaId}` | Estado da liga em andamento, por liga (Campeonatos) |
| `fp:bracketState` | Estado completo da copa (Copas) |
| `fp:career` | Save único da carreira: manager, temporada atual (liga+copa das 6 ligas), histórico |
| `fp:liveMatch` | Snapshot da partida ao vivo em andamento (sobrevive a F5) |
| `fp:selectedLeague` | Última liga selecionada, pra destacar na LeagueSelectScreen |
| `fp:rosterCache:{ligaId}` | Cache de 7 dias do elenco sincronizado via API |
| `fp:achievements` | Conquistas desbloqueadas + contador de partidas |
| `fp:history` | Últimas partidas avulsas |
| `fp:h2h` | Confrontos diretos entre times |
| `fp:tutorialSeen` | Flag do tutorial |
| `fp:replaySpeed` | Velocidade do replay (1-4) |

---

## 🗺 Backlog

Veja [`BACKLOG.md`](./BACKLOG.md) para o que ainda está pendente.

---

## 📝 Licença

MIT
