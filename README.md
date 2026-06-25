# ⚽ FootPlan — Simulador Tático de Futebol

Simulador de partidas com foco em **escolhas estratégicas** e **simulação baseada em dados**. Escolha entre os 20 clubes da Premier League 2025/26, monte suas táticas e dispute partidas avulsas, uma temporada completa de pontos corridos, uma copa eliminatória, ou jogue **online contra um amigo via P2P** — tudo no navegador, sem backend.

🌐 **Jogue agora:** [lucianolacerdawolf-alt.github.io/footplan](https://lucianolacerdawolf-alt.github.io/footplan/)

---

## 🎮 Modos de Jogo

| Modo | Descrição |
|------|-----------|
| **Jogar Online** | P2P via WebRTC (PeerJS). Crie uma sala (código de 4 letras), compartilhe com um amigo e jogem em tempo real com simulação determinística por seed. |
| **Partida Única** | Escolha 2 times, configure as táticas e jogue uma partida avulsa (vs CPU ou hot-seat). |
| **Premier League** | Temporada completa: 20 times, 38 rodadas, 10 jogos por rodada. Você controla seu time e simula os demais. Estado salvo automaticamente. Estatísticas da temporada em tempo real. |
| **FA Cup** | Copa eliminatória de 16 times (você + 15 sorteados). Oitavas → Quartas → Semis → Final. Prorrogação e pênaltis em caso de empate. |

---

## ✨ Features Principais

### Tática e Plantel
- **5 ajustes táticos** com impacto real no motor: formação (5 opções), mentalidade, intensidade, linha defensiva e amplitude
- **Pré-jogo**: faixa de análise tática comparando seu time com o adversário
- **Pós-jogo**: breakdown tático mostrando os bônus/penalidades aplicados a cada time
- **Substituições e escalação manual** no SetupScreen
- **Substituições durante o 2º tempo**: botão ⏸ pausa o replay e abre o modal de substituição (time do jogador por padrão, com toggle para ver o adversário)
- **5 substituições** por time (limite oficial da PL)
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
- **Timing realista de gols**: poucos gols no início (ritmo de estudo), pico nos 80'-90' (desespero tático + fadiga)
- **Pausa dramática de 2s no gol** com explosão da torcida
- **Slider de velocidade** (2x / 3x / 4x) com tempos calibrados: 2x=1min30s, 3x=1min, 4x=45s por tempo
- **Intervalo interativo** — trocar formação e fazer substituições
- **Prorrogação e pênaltis** nos torneios eliminatórios
- **CPU varia tática entre rodadas**

### Motor de Simulação Avançado
- **Momentum**: gols dão +30 de impulso, decai 8/ciclo; time atrás nos minutos finais ganha urgência (+18% ataques)
- **Lesões durante a partida**: 8% após faltas + chance aleatória; replay pausa automaticamente
- **Escanteios → gol de cabeça** (10% de chance)
- **Pênaltis durante o jogo** (3% das faltas)
- **Piso defensivo**: todo time tem defesa mínima, evitando goleadas irreais
- **Compressão de atributos** para evitar distorções em gaps extremos de OVR
- **Feedback sonoro**: torcida contínua (murmúrio), explosão no gol, reação em falta/cartão/trave

### Som
- **Torcida ambiente** durante toda a partida (murmúrio procedural via Web Audio API)
- Explosão no gol, apito de falta, reação a cartões, gasp em bola na trave
- **Zero arquivos de áudio** — tudo gerado proceduralmente

### Pós-jogo (MatchStatsScreen)
- **Man of the Match** com nota colorida
- **Notas dos jogadores** (escala 4.0–10.0)
- **Lista de gols** com marcador e minuto
- **Histórico de cartões**
- **Estatísticas completas**: posse, chutes, no alvo, faltas, cartões
- **Breakdown tático**: ficha do que cada time usou e os bônus aplicados

### Conquistas (Achievements)
- **15 conquistas** desbloqueáveis: Estreia, Hat-Trick, Muralha, Goleada, Virada Épica, Campeão, Rei da Copa, Invencível, Embalado, etc.
- **Toast** “🏆 Conquista desbloqueada!” ao conquistar
- **Tela dedicada** mostrando todas (desbloqueadas + bloqueadas)
- Persistência em `fp:achievements`

### Hub de Torneio
- **LeagueScreen**: tabela de classificação com zonas coloridas (Champions, Europa, Conference, Rebaixamento), estatísticas da temporada (total de gols, média, % casa/empate, seus gols, clean sheets)
- **BracketScreen**: mostra apenas a fase atual, botão único "Simular Outros"
- **Histórico H2H**: confrontos passados exibidos no SetupScreen

### Persistência
- Liga e Copa salvam automaticamente em localStorage
- Modal "Continuar?" ao retornar para um torneio em andamento
- Toast "✓ Progresso salvo"
- Histórico de partidas, seleção de times, conquistas e preferências persistidos

### UI/UX
- **Tema escuro** como padrão
- **Mobile-responsive** (breakpoint 640px)
- **Transição fade** entre telas
- Layout compacto com botões próximos aos títulos

---

## 🖥 Fluxo de Telas

```
HomeScreen
├── Jogar Online → OnlineLobbyScreen → SetupScreen → MatchScreen → MatchStatsScreen
├── Partida Única → TeamSelectionScreen → SetupScreen → MatchScreen → MatchStatsScreen
├── Premier League → [Modal Continuar?] → TournamentSetupScreen → SetupScreen → LeagueScreen
│                                                                          ↓
│                                               MatchScreen → MatchStatsScreen → LeagueScreen
├── FA Cup → [Modal Continuar?] → TournamentSetupScreen → SetupScreen → BracketScreen
│                                                                         ↓
│                                               MatchScreen → MatchStatsScreen → BracketScreen
└── Conquistas → AchievementsScreen
```

---

## ⚙️ Motor de Simulação

### Estrutura da Partida
- **1º Tempo**: 44 ciclos (~2 min cada, 0–88')
- **Intervalo**: overlay para trocar táticas e fazer substituições
- **2º Tempo**: mais 44 ciclos (45'–90')
- **Prorrogação** (mata-mata): 2 × 7 ciclos
- **Pênaltis** (empate após prorrogação): 5 cobranças + morte súbita

### Fórmulas
```
Ataque  = Σ(Velocidade + Drible) × mentalidade × formação × moral × momentum × RNG
Defesa  = Σ(Desarme + Posicionamento) × formação × linha × amplitude × RNG + BASE_DEFENSE
Chute   = Finalização × mentalidade × RNG(0.65–1.35)
DefesaGK = PosicionamentoGK × RNG(0.65–1.35) + BASE_GK
```

### Distribuição de Gols (calibrada com dados reais PL 2025/26)

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
| **Testes** | Vitest 3 (79 testes) |
| **Estilo** | CSS Modules + App.css/index.css globais |
| **Renderização** | SVG (campo tático) + HTML/CSS |
| **Áudio** | Web Audio API (sons procedurais, zero arquivos) |
| **Estado** | React Hooks |
| **Persistência** | localStorage via `useLocalStorage` e `usePersistedState` |
| **Multiplayer** | PeerJS (WebRTC P2P) |

---

## 📂 Estrutura do Projeto

```
src/
├── engine/
│   ├── types.ts              # Player, Team, Strategy, MatchEvent, MatchResult
│   ├── matchEngine.ts        # Motor de simulação com momentum, lesões, timing
│   ├── matchConfig.ts        # Constantes de tuning (ATK_CHANCE, BASE_DEFENSE, etc)
│   ├── matchHelpers.ts       # effective(), compressAttr(), getStarters()
│   ├── resolveAttack.ts      # Resolução ataque vs defesa
│   ├── resolveShot.ts        # Resolução finalização vs goleiro
│   ├── calculatePossession.ts# Cálculo de posse de bola
│   ├── commentary.ts         # Narração (gols, faltas, cartões, lesões, pênaltis)
│   ├── tacticalCommentary.ts # Comentário tático contextual
│   ├── tournament.ts         # Liga, Copa, fadiga, lesões, CPU tática
│   ├── playerRating.ts       # Notas 4-10 e Man of the Match
│   ├── steering.ts           # Movimentação dos jogadores no SVG
│   ├── rng.ts                # RNG com seed (SeededRng para multiplayer)
│   ├── achievements.ts       # 15 conquistas com condições
│   ├── constants.ts          # FORMATIONS, FORMATION_COUNTS
│   └── __tests__/            # 4 suítes de teste (79 testes)
├── data/
│   └── premierLeague.ts      # 20 times da PL 2025/26 com elencos reais
├── components/
│   ├── HomeScreen            # Menu principal
│   ├── OnlineLobbyScreen     # Criar/entrar sala, seleção de time, código 4 letras
│   ├── TeamSelectionScreen   # Seleção partida única
│   ├── TournamentSetupScreen # Seleção time para torneio
│   ├── SetupScreen           # Táticas + escalação + H2H + análise tática
│   ├── MatchScreen           # Campo, replay, pausa/subs, intervalo, formação
│   ├── Pitch                 # Campo SVG com bola animada e steering
│   ├── CommentaryFeed        # Feed de comentários
│   ├── MatchStatsScreen      # Pós-jogo: MOTM, notas, gols, cartões, stats, tática
│   ├── LeagueScreen          # Hub Premier League + stats da temporada
│   ├── BracketScreen         # Hub FA Cup
│   ├── AchievementsScreen    # Grade de conquistas
│   ├── TutorialOverlay       # Tutorial interativo
│   └── Toast                 # Notificações
├── hooks/
│   ├── useMatchSimulation    # Loop do replay com pause/resume e som
│   ├── usePeerConnection     # PeerJS: criar sala, conectar, enviar/receber
│   ├── useAchievements       # Persistência e avaliação de conquistas
│   ├── useMatchHistory       # Histórico de partidas
│   ├── useH2H                # Head-to-head entre times
│   ├── useLocalStorage       # Hook genérico
│   └── usePersistedState     # Persistência + callback pós-mount
├── utils/
│   ├── teamUtils.ts          # cloneTeam
│   ├── audio.ts              # sfx: torcida, gol, falta, cartão, trave
│   └── playerOvr.ts          # Cálculo de OVR
└── App.tsx / App.css / index.css / main.tsx
```

---

## 🚀 Como Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # gera dist/
npm run test     # 79 testes
```

---

## 🧪 Testes

**79 testes** cobrindo:
- `matchEngine.test.ts` — invariantes, determinismo, cartões/expulsões, OVR
- `calibration.test.ts` — 1000 partidas: média de gols, dominância OVR, empates, mando de campo, distribuição de placares
- `tournament.test.ts` — fadiga, lesões, calendário, chaveamento, classificação
- `playerRating.test.ts` — notas, MOTM, artilheiros, cartões
- `playerOvr.test.ts` — cálculo de overall

---

## 💾 Chaves do localStorage

| Chave | Conteúdo |
|---|---|
| `fp:leagueState` | Estado completo da liga |
| `fp:bracketState` | Estado completo da copa |
| `fp:achievements` | Conquistas desbloqueadas + contador de partidas |
| `fp:history` | Últimas 20 partidas avulsas |
| `fp:h2h` | Confrontos diretos entre times |
| `fp:homeId` / `fp:awayId` | Times selecionados |
| `fp:mode` | Modo (cpu/player) |
| `fp:tutorialSeen` | Flag do tutorial |
| `fp:replaySpeed` | Velocidade do replay (1-4) |

---

## 🗺 Backlog

Veja [`BACKLOG.md`](./BACKLOG.md) para o que ainda está pendente.

---

## 📝 Licença

MIT
