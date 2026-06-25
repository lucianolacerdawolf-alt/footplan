# ⚽ FootPlan — Simulador Tático de Futebol

Simulador de partidas de futebol com foco em **escolhas estratégicas** e **simulação baseada em dados**. Escolha entre os 20 clubes da Premier League, defina formações e táticas, e assista à partida se desenrolar minuto a minuto em um campo tático interativo — ou dispute uma temporada completa de pontos corridos e uma copa eliminatória.

---

## 🎮 Modos de Jogo

| Modo | Descrição |
|------|-----------|
| **Partida Única** | Escolha 2 times, configure as táticas e jogue uma partida avulsa. |
| **Premier League** | Temporada completa com os 20 times em pontos corridos (38 rodadas × 10 jogos). Você controla seu time e simula os demais. |
| **FA Cup** | Copa eliminatória com 8 times (você + 7 sorteados). Quartas de Final → Semifinais → Final. Empates vão para prorrogação e pênaltis. |

---

## 🖥 Fluxo de Telas

```
HomeScreen
├── Partida Única → TeamSelectionScreen → SetupScreen → MatchScreen → MatchStatsScreen
├── Premier League → TournamentSetupScreen → LeagueScreen ↔ SetupScreen → MatchScreen → MatchStatsScreen
└── FA Cup         → TournamentSetupScreen → BracketScreen ↔ SetupScreen → MatchScreen → MatchStatsScreen
```

| Tela | Descrição |
|------|-----------|
| **HomeScreen** | Menu principal com 3 modos de jogo. |
| **TeamSelectionScreen** | Escolha 2 times. Toggle HOME/AWAY de uniforme. Conflito de cores detectado automaticamente. Seleção persistida via localStorage. |
| **TournamentSetupScreen** | Escolha seu time para Premier League ou FA Cup. Mesmo visual da tela de seleção. |
| **SetupScreen** | Formação, mentalidade e intensidade para cada time. Exibe elenco completo com OVR por posição. |
| **MatchScreen** | Campo SVG animado, placar, relógio, feed de comentários, intervalo interativo com troca de táticas. Suporte a prorrogação e pênaltis nos modos eliminatórios. |
| **MatchStatsScreen** | Estatísticas completas (posse, chutes, faltas, cartões). Histórico de partidas (modo partida única). |
| **LeagueScreen** | Hub da temporada: jogo do usuário, outros jogos, "Simular Todos", tabela de classificação colapsável. |
| **BracketScreen** | Hub da copa: chaveamento completo com todos os confrontos, placar e indicador de vencedor por fase. |

---

## ⚙️ Motor de Simulação

### Estrutura da Partida
- **1º Tempo**: 23 ciclos de 2 min cada (0–45')
- **Intervalo**: pausa automática com overlay para trocar táticas
- **2º Tempo**: mais 23 ciclos (45'–90')
- **Prorrogação** (mata-mata em empate): 2 × 7 ciclos (90'–104')
- **Pênaltis** (empate após prorrogação): 5 cobranças + morte súbita

### Cálculo de Gol — Duas Verificações Consecutivas

**1. Ataque vs Defesa**
```
Ataque = Σ(atacantes: Velocidade + Drible) × modMentalidade × RNG(0.7–1.3)
Defesa = Σ(defensores: Desarme + Posicionamento) + PosicionamentoGK × RNG(0.7–1.3)
```
Se `Ataque > Defesa` → chance de finalização criada.

**2. Finalização vs Goleiro**
```
Chute    = Finalização × modMentalidade × RNG(0.8–1.2)
DefesaGK = PosicionamentoGK × RNG(0.8–1.2)
```
- `Chute > DefesaGK` → **GOL** ⚽
- `Chute ≤ 80% da DefesaGK` → **Na trave** 😱
- `Chute ≤ 50% da DefesaGK` → **Defesa do goleiro** 🛡️
- Abaixo disso → **Para fora** ↗️

### Modificadores por Mentalidade
| Mentalidade | Passe | Visão | Veloc | Drible | Desarme | Posic | Finaliz | Cansaço |
|------------|-------|-------|-------|--------|---------|-------|---------|---------|
| Posse de Bola | +20% | +20% | -10% | +5% | -10% | -5% | 0% | 1.0× |
| Contra-Ataque | -15% | 0% | +20% | +15% | -10% | -10% | +10% | 1.0× |
| Pressão Alta | -5% | 0% | +5% | 0% | +15% | +15% | -5% | **1.3×** |
| Retranca | -10% | -10% | -15% | -15% | +25% | +25% | -15% | 0.8× |

### Cansaço por Intensidade (por ciclo de 2 min)
- **Baixa**: +2 pts | **Média**: +4 pts | **Alta**: +7 pts
- Jogadores com Stamina alta cansam menos. Cansaço reduz todos os atributos em até 50%.

### Pênaltis
- Taxa de conversão base: ~75% (`chute × 1.35 > defesa`)
- 5 cobranças por time + morte súbita em caso de empate
- Registro individual de cada cobrança no feed de comentários

### Simulação Rápida (CPU vs CPU)
- `simularPartidaRapida` — executa o mesmo motor sem gerar eventos visuais
- `simularRodadaAuto` — simula todos os jogos não controlados pelo usuário em uma rodada da liga
- `simularBracketMatch` — simula um confronto eliminatório incluindo prorrogação e pênaltis

---

## 🏆 Modos de Torneio

### Premier League (Pontos Corridos)
- 20 times, 38 rodadas, calendário gerado pelo **método do círculo** (round-robin)
- Cada rodada: 10 jogos (1 do usuário + 9 simulados pela CPU)
- Tabela de classificação em tempo real: Pts / J / V / E / D / GP / GC / SG
- Classificação de desempate: pontos → saldo de gols → gols pró

### FA Cup (Eliminatória)
- 8 times (usuário + 7 sorteados da Premier League)
- Fases: Quartas de Final (4 jogos) → Semifinais (2 jogos) → Final (1 jogo)
- Empates resolvidos com prorrogação (2 × 7 ciclos) e, se necessário, pênaltis
- Progresso automático para a próxima fase quando todos os jogos são concluídos

---

## 🎨 Campo Tático Interativo

- **Horizontal** (estilo transmissão de TV), visão top-down com linhas, áreas e gols
- **Jogadores** coloridos conforme o uniforme escolhido
- **Bola** se move pelo campo conforme o lance (meio-campo → área → gol)
- **Movimentação tática**: times avançam/recuam conforme posse e fase do jogo
- **Anti-sobreposição**: repulsão entre jogadores próximos
- **Idle sway**: oscilação sutil quando parados
- **Animações**: transições CSS com easing spring, flash dourado no gol
- **Expulsões**: jogadores removidos visivelmente do campo após cartão vermelho

---

## 🛠 Tecnologia

| Camada | Stack |
|--------|-------|
| **Frontend** | React 19 + TypeScript (strict mode) |
| **Build** | Vite 8 |
| **Testes** | Vitest 3 (separado em `vitest.config.ts`) |
| **Estilo** | CSS puro + CSS Modules para componentes escopados |
| **Renderização** | SVG (campo) + HTML/CSS |
| **Estado** | React Hooks — useState, useRef, useCallback, useEffect |
| **Persistência** | localStorage (time selecionado, modo, uniforme) |

---

## 📂 Estrutura do Projeto

```
src/
├── engine/
│   ├── types.ts           # Tipos: Player, Team, Strategy, MatchEvent, MatchResult, PenaltyResult
│   ├── matchEngine.ts     # Motor: tempos, posse, gol, cansaço, prorrogação, pênaltis
│   ├── commentary.ts      # Gerador de frases (gols, faltas, pênaltis, prorrogação...)
│   ├── tournament.ts      # Liga (round-robin, standings) + Copa (bracket, advanceBracket)
│   └── steering.ts        # Sistema de movimentação dos jogadores no campo
├── data/
│   └── premierLeague.ts   # 20 times da Premier League com elencos de 11 jogadores
├── components/
│   ├── HomeScreen.tsx           # Menu principal (3 modos)
│   ├── TeamSelectionScreen.tsx  # Seleção de 2 times (partida única)
│   ├── TournamentSetupScreen.tsx# Seleção do time do usuário (torneios)
│   ├── SetupScreen.tsx          # Formação, mentalidade, intensidade
│   ├── MatchScreen.tsx          # Campo, placar, simulação, intervalo, prorrogação, pênaltis
│   ├── Pitch.tsx                # Campo tático SVG + movimentação dos jogadores
│   ├── CommentaryFeed.tsx       # Feed de comentários em tempo real
│   ├── MatchStatsScreen.tsx     # Estatísticas pós-jogo + histórico
│   ├── LeagueScreen.tsx         # Hub da Premier League entre partidas
│   └── BracketScreen.tsx        # Hub da FA Cup entre partidas
├── hooks/
│   ├── useMatchSimulation.ts    # Hook central da simulação de partida
│   ├── useMatchHistory.ts       # Histórico de partidas (localStorage)
│   └── useLocalStorage.ts       # Hook genérico de persistência
├── utils/
│   ├── teamUtils.ts       # cloneTeam
│   └── playerOvr.ts       # Cálculo de OVR do jogador
└── App.tsx / App.css / index.css / main.tsx
```

---

## 🚀 Como Rodar

```bash
# Instalar dependências
npm install

# Desenvolvimento (hot reload)
npm run dev

# Build de produção
npm run build

# Rodar testes
npm run test

# Preview do build
npm run preview
```

O servidor de desenvolvimento roda em `http://localhost:5173`.

---

## 🧠 Modelo de Dados

### Jogador (`Player`)
```typescript
{
  id: string;
  name: string;
  number: number;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  attributes: {
    speed, stamina, passing, finishing,
    tackling, dribbling, vision, positioning; // todos 1–99
  };
  currentFatigue: number; // 0–100
}
```

### Time (`Team`)
```typescript
{
  id: string;
  name: string;
  abbreviation: string;
  logoUrl: string;
  color: string;          // uniforme principal (hex)
  secondaryColor: string; // uniforme alternativo (hex)
  squad: Player[];
  strategy: Strategy;
}
```

### Resultado (`MatchResult`)
```typescript
{
  homeTeam, awayTeam: Team;
  homeScore, awayScore: number;
  homePossession, awayPossession: number;
  homeStats, awayStats: { shots, shotsOnTarget, fouls, yellowCards, redCards };
  wentToExtraTime?: boolean;
  extraTimeHomeScore?, extraTimeAwayScore?: number;
  penaltyResult?: { homeScore, awayScore, winner, kicks[] };
  winner?: Team;
}
```

---

## 🎨 Premier League 2025/26 — Cores dos Times

| Time | Cor Primária | Cor Secundária |
|------|-------------|----------------|
| Arsenal | `#EF0107` 🔴 | `#FFFFFF` ⚪ |
| Aston Villa | `#670E36` 🟤 | `#95BFE5` 🔵 |
| Bournemouth | `#DA291C` 🔴 | `#000000` ⚫ |
| Brentford | `#E30613` 🔴 | `#FFFFFF` ⚪ |
| Brighton | `#0057AD` 🔵 | `#FFFFFF` ⚪ |
| Chelsea | `#034694` 🔵 | `#FFFFFF` ⚪ |
| Crystal Palace | `#1B458F` 🔵 | `#C4122E` 🔴 |
| Everton | `#003399` 🔵 | `#FFFFFF` ⚪ |
| Fulham | `#FFFFFF` ⚪ | `#000000` ⚫ |
| Ipswich Town | `#0033A0` 🔵 | `#FFFFFF` ⚪ |
| Leicester City | `#003090` 🔵 | `#FFFFFF` ⚪ |
| Liverpool | `#C8102E` 🔴 | `#00B2A9` 🟢 |
| Manchester City | `#6CABDD` 🔵 | `#1C2C4C` 🔵 |
| Manchester United | `#DA291C` 🔴 | `#000000` ⚫ |
| Newcastle United | `#241F20` ⚫ | `#FFFFFF` ⚪ |
| Nottingham Forest | `#DD0000` 🔴 | `#FFFFFF` ⚪ |
| Southampton | `#D71920` 🔴 | `#FFFFFF` ⚪ |
| Tottenham | `#132257` 🔵 | `#FFFFFF` ⚪ |
| West Ham United | `#7A263A` 🟤 | `#95BFE5` 🔵 |
| Wolves | `#FDB913` 🟡 | `#000000` ⚫ |

---

## 🏗 Decisões de Arquitetura

- **Sem backend**: Toda a simulação roda no navegador. Os dados dos times são estáticos em TypeScript.
- **Estado de torneio em memória React**: O estado da Liga/Copa fica em `useState` do App — objetos `Team` com elencos completos são grandes demais para localStorage.
- **RNG injetável**: O motor recebe uma função `random` como parâmetro, facilitando testes determinísticos.
- **Estado imutável**: Times são clonados (`cloneTeam`) antes de cada simulação para evitar mutação.
- **Prorrogação em-place**: `resolveKnockoutTiebreak` modifica o `MatchState` atual (já em memória) sem recriar a partida. Guarda `knockoutResolvedRef` para garantir execução única.
- **Build separado**: `vite.config.ts` (produção) e `vitest.config.ts` (testes) usam imports diferentes para evitar conflito de tipos Vite 8 × Vitest 3.
- **CSS Modules** para componentes com escopo visual próprio (MatchStatsScreen, LeagueScreen, BracketScreen, TournamentSetupScreen). App.css para classes globais compartilhadas.

---

## 📝 Licença

MIT
