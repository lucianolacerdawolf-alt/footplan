# ⚽ FootPlan — Simulador Tático de Futebol

Simulador de partidas com foco em **escolhas estratégicas** e **simulação baseada em dados**. Escolha entre os 20 clubes da Premier League 2025/26, monte suas táticas e dispute partidas avulsas, uma temporada completa de pontos corridos ou uma copa eliminatória — tudo no navegador, sem backend.

---

## 🎮 Modos de Jogo

| Modo | Descrição |
|------|-----------|
| **Partida Única** | Escolha 2 times, configure as táticas e jogue uma partida avulsa (vs CPU ou hot-seat). |
| **Premier League** | Temporada completa: 20 times, 38 rodadas, 10 jogos por rodada. Você controla seu time e simula os demais. Estado salvo automaticamente. |
| **FA Cup** | Copa eliminatória de 16 times (você + 15 sorteados). Oitavas → Quartas → Semis → Final. Prorrogação e pênaltis em caso de empate. |

---

## ✨ Features Principais

### Tática e Plantel
- **5 ajustes táticos** por time: formação (5 opções), mentalidade, intensidade, linha defensiva e amplitude
- **Substituições e escalação manual** no SetupScreen
- **Tutorial interativo** na primeira partida explicando cada controle
- **Botão "Editar Táticas"** disponível entre rodadas em Liga e Copa

### Simulação
- **Slider de velocidade do replay** (1x / 2x / 4x) — preferência persistida
- **Intervalo interativo** — trocar formação e fazer até **3 substituições** por time
- **Prorrogação e pênaltis** nos torneios eliminatórios
- **CPU varia tática entre rodadas** — adversários não jogam sempre igual
- **Sons** via Web Audio API (apito inicial/final, gol)

### Gestão de Plantel
- **Fadiga acumulada** durante a partida, reduzida entre rodadas
- **Lesões pós-partida** (1-3 rodadas fora) — substituto da mesma posição promovido automaticamente
- **Sistema de moral** (-10 a +10) — afeta o desempenho ofensivo

### Pós-jogo (MatchStatsScreen)
- **Man of the Match** destacado com nota colorida
- **Notas dos jogadores** (escala 4.0–10.0) baseadas em gols, cartões e resultado
- **Lista de gols** com marcador e minuto
- **Histórico de cartões** amarelos e vermelhos
- **Estatísticas completas**: posse, chutes, no alvo, faltas, cartões

### Hub de Torneio
- **LeagueScreen**: tabela de classificação em 2 colunas, zonas coloridas (Champions, Europa, Conference, Rebaixamento), badge de jogadores cansados/lesionados, botão "Simular Todos" para outros jogos da rodada
- **BracketScreen**: mostra apenas a fase atual (Oitavas/Quartas/Semis/Final), botão único **"Simular Outros"** processa todos os jogos não-usuário de uma vez
- **Histórico H2H**: confrontos passados (V/E/D, gols, últimos 5 jogos) exibidos no SetupScreen

### Persistência
- Liga e Copa **salvam progresso automaticamente** em localStorage
- Ao voltar ao menu e clicar no mesmo torneio, **modal pergunta** se quer continuar ou começar nova temporada
- Toast "✓ Progresso salvo" notifica cada gravação
- Histórico de partidas (modo avulso), seleção de times e preferências também persistidos

### UI/UX
- **Tema escuro** como padrão
- **Mobile-responsive** (breakpoint 640px)
- **Transição fade** entre telas (180ms)

---

## 🖥 Fluxo de Telas

```
HomeScreen
├── Partida Única → TeamSelectionScreen → SetupScreen → MatchScreen → MatchStatsScreen
├── Premier League → [Modal Continuar?] → TournamentSetupScreen
│                                        ↓
│                                    SetupScreen → LeagueScreen ⇄ SetupScreen
│                                                       ↓
│                                                  MatchScreen → MatchStatsScreen → LeagueScreen
└── FA Cup → [Modal Continuar?] → TournamentSetupScreen
                                  ↓
                              SetupScreen → BracketScreen ⇄ SetupScreen
                                                 ↓
                                            MatchScreen → MatchStatsScreen → BracketScreen
```

---

## ⚙️ Motor de Simulação

### Estrutura da Partida
- **1º Tempo**: 45 ciclos de ~1 min cada (0–45')
- **Intervalo**: overlay para trocar táticas e fazer substituições (max 3)
- **2º Tempo**: mais 45 ciclos (45'–90')
- **Prorrogação** (mata-mata em empate): 2 × 7 ciclos (90'–104')
- **Pênaltis** (empate após prorrogação): 5 cobranças + morte súbita

### Cálculo de Gol — Duas Verificações

**1. Ataque vs Defesa**
```
Ataque = Σ(atacantes: Velocidade + Drible) × modMentalidade × moral × RNG(0.7–1.3)
Defesa = Σ(defensores: Desarme + Posicionamento) × modFormação × linha × amplitude × RNG(0.7–1.3)
```

**2. Finalização vs Goleiro** (se passou da defesa)
```
Chute    = Finalização × modMentalidade × RNG(0.8–1.2)
DefesaGK = PosicionamentoGK × RNG(0.8–1.2)
```
- `Chute > DefesaGK` → **GOL** ⚽
- `Chute ≤ 80%` → **Na trave** 😱
- `Chute ≤ 50%` → **Defesa do goleiro** 🛡️
- Abaixo → **Para fora** ↗️

> **Calibração**: ~2.74 gols/jogo em times equiparados (alinhado com Premier League ~2.85). Travada por teste automatizado.

### Modificadores por Mentalidade

| Mentalidade | Passe | Visão | Veloc | Drible | Desarme | Posic | Finaliz | Cansaço |
|------------|-------|-------|-------|--------|---------|-------|---------|---------|
| Posse de Bola | +20% | +20% | -10% | 0% | -10% | -5% | +5% | 1.1× |
| Contra-Ataque | -15% | -5% | +25% | +10% | -15% | -10% | -5% | 0.9× |
| Pressão Alta | -5% | 0% | +5% | 0% | +20% | +15% | -5% | **1.35×** |
| Retranca | -10% | -15% | -10% | -15% | +30% | +35% | -20% | 0.7× |

### Sistemas de Plantel

- **Cansaço por intensidade** (por ciclo): Baixa +2, Média +4, Alta +7 (escalado por mentalidade)
- **Recuperação entre rodadas**: -60 pontos de fadiga (capado em 0)
- **Lesão pós-partida**: 15% de chance para o time do usuário; jogador sorteado dos titulares fica 1-3 rodadas fora
- **Moral**: vitória +2, derrota -2 (capado em ±10); multiplica força ofensiva em `1 + (moral/100)`

### Simulação Rápida (CPU vs CPU)
- `simularPartidaRapida` — executa o motor sem gerar replay visual
- `simularRodadaAuto` — simula todos os outros jogos de uma rodada
- `simularBracketMatch` — simula um confronto eliminatório (incluindo prorrogação e pênaltis)

---

## 🛠 Tecnologia

| Camada | Stack |
|--------|-------|
| **Frontend** | React 19 + TypeScript (strict mode) |
| **Build** | Vite 8 |
| **Testes** | Vitest 3 (50 testes — engine, calibração, utils) |
| **Estilo** | CSS Modules para componentes + App.css/index.css globais |
| **Renderização** | SVG (campo tático) + HTML/CSS |
| **Áudio** | Web Audio API (sem arquivos externos) |
| **Estado** | React Hooks (useState, useReducer-like patterns via hooks) |
| **Persistência** | localStorage via `useLocalStorage` e `usePersistedState` |

---

## 📂 Estrutura do Projeto

```
src/
├── engine/
│   ├── types.ts             # Player, Team, Strategy, MatchEvent, MatchResult, PenaltyResult
│   ├── matchEngine.ts       # Motor de simulação minuto a minuto
│   ├── tournament.ts        # Liga, Copa, fadiga, lesões, randomização CPU
│   ├── playerRating.ts      # Cálculo de nota 4-10 e Man of the Match
│   ├── commentary.ts        # Gerador de frases de comentário
│   ├── steering.ts          # Movimentação dos jogadores no campo SVG
│   ├── constants.ts         # FORMATIONS, FORMATION_COUNTS, etc
│   └── __tests__/           # matchEngine.test.ts + calibration.test.ts
├── data/
│   └── premierLeague.ts     # 20 times com elencos completos
├── components/
│   ├── HomeScreen           # Menu principal
│   ├── TeamSelectionScreen  # Seleção partida única
│   ├── TournamentSetupScreen# Seleção time para torneio
│   ├── SetupScreen          # Táticas + escalação + H2H
│   ├── MatchScreen          # Campo, replay, intervalo, slider velocidade
│   ├── Pitch                # Campo SVG + steering
│   ├── CommentaryFeed       # Feed de comentários
│   ├── MatchStatsScreen     # Pós-jogo: MOTM, notas, gols, cartões, stats
│   ├── LeagueScreen         # Hub Premier League
│   ├── BracketScreen        # Hub FA Cup
│   ├── TutorialOverlay      # Tutorial 5 passos (primeira partida)
│   └── Toast                # Notificações
├── hooks/
│   ├── useMatchSimulation   # Loop central do replay com speed control
│   ├── useMatchHistory      # Histórico de partidas
│   ├── useH2H               # Histórico head-to-head entre times
│   ├── useLocalStorage      # Hook genérico
│   └── usePersistedState    # Persistência + callback de pós-mount
├── utils/
│   ├── teamUtils.ts         # cloneTeam
│   ├── audio.ts             # sfx: whistleStart, goal, whistleEnd
│   └── playerOvr.ts         # Cálculo de OVR
└── App.tsx / App.css / index.css / main.tsx
```

---

## 🚀 Como Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run test
npm run preview
```

---

## 🧪 Testes

```bash
npm run test
```

**50 testes** cobrindo:
- `matchEngine.test.ts` — invariantes (placar não negativo, posse soma 100, determinismo, cartões/expulsões)
- `calibration.test.ts` — 1000-jogo loops garantindo média de gols 2.0–3.5, dominância de OVR alto, faixa de empates 10–45%, distribuição de placares
- `playerOvr.test.ts` — cálculo de overall

---

## 💾 Chaves do localStorage

| Chave | Conteúdo |
|---|---|
| `fp:leagueState` | Estado completo da liga em andamento |
| `fp:bracketState` | Estado completo da copa em andamento |
| `fp:history` | Últimas 20 partidas avulsas |
| `fp:h2h` | Confrontos diretos entre times |
| `fp:homeId` / `fp:awayId` | Times selecionados (partida única) |
| `fp:homeUniform` / `fp:awayUniform` | Uniformes |
| `fp:mode` | Modo (cpu/player) |
| `fp:tutorialSeen` | Flag do tutorial (1 = já visto) |
| `fp:replaySpeed` | Velocidade do replay (1, 2 ou 4) |

---

## 🗺 Backlog

Veja [`BACKLOG.md`](./BACKLOG.md) para o que ainda está pendente: bugs conhecidos, melhorias de gameplay e refactors planejados.

---

## 📝 Licença

MIT
