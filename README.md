# ⚽ FootPlan — Simulador de Gerenciamento Tático de Futebol

Simulador de partidas de futebol com foco em **escolhas estratégicas** e **simulação automatizada baseada em dados**. Escolha entre os 20 clubes da Premier League, defina formações e táticas, e assista à partida se desenrolar minuto a minuto em um campo tático interativo.

---

## 🎮 Funcionalidades

### 3 Telas de Fluxo
| Tela | Descrição |
|------|-----------|
| **Seleção de Times** | Escolha 2 times entre os 20 da Premier League. Toggle entre uniforme HOME/AWAY para cada time (cores oficiais). |
| **Configuração Tática** | Defina Formação (4-3-3, 4-4-2, 3-5-2...), Mentalidade (Posse, Contra-Ataque, Pressão Alta, Retranca) e Intensidade (Baixa, Média, Alta) para cada time. |
| **Partida** | Simulação com campo tático animado, placar, relógio e feed de comentários minuto a minuto. |

### Motor de Simulação (Match Engine)
- **Divisão em 2 tempos**: 1º tempo (0-45') + Intervalo com possibilidade de **mudar táticas** + 2º tempo (45-90')
- **Ciclos de 5 minutos**: 18 ciclos por partida
- **Cálculo de Posse**: Meio-campistas (Passe + Visão) × modificador de mentalidade × RNG
- **Ataque vs Defesa**: Atacantes (Velocidade + Drible) × RNG vs Defensores (Desarme + Posicionamento) + Goleiro × RNG
- **Finalização**: Finalização do atacante × modMentalidade × RNG vs Posicionamento do goleiro × RNG
- **Cansaço**: Atributos caem até 50% conforme o jogo avança. Intensidade alta = mais desgaste.
- **RNG (0.7~1.3)**: Garante imprevisibilidade — times fortes vencem mais, mas zebras acontecem.

### Campo Tático Interativo
- **Horizontal** (estilo TV), visão top-down com linhas, áreas e gols
- **Jogadores** coloridos conforme o uniforme escolhido (cada time tem cor primária e secundária oficiais da PL)
- **Bola** se move pelo campo conforme o lance (meio-campo → área → gol)
- **Movimentação tática**:
  - Times avançam/recuam conforme posse, ataque e defesa
  - Atração magnética dos jogadores à bola
  - Sistema anti-sobreposição (repulsão entre jogadores próximos)
  - Idle sway (oscilação sutil quando parados)
  - Rotação sutil em direção à bola
- **Animações**: transições de 0.6s com easing spring, flash no gol

### Intervalo Interativo
- Pausa automática aos 45 minutos
- Overlay sobre o campo com placar atual
- **Dropdowns para alterar Formação, Mentalidade e Intensidade** de ambos os times
- As mudanças **afetam o 2º tempo** (o motor recalcula com as novas táticas)

---

## 🛠 Tecnologia

| Camada | Stack |
|--------|-------|
| **Frontend** | React 19 + TypeScript |
| **Build** | Vite 8 |
| **Estilo** | CSS puro (variáveis CSS, tema claro/escuro) |
| **Renderização** | SVG (campo tático) + HTML/CSS |
| **Estado** | React Hooks (useState, useMemo, useRef, useCallback) |

---

## 📂 Estrutura do Projeto

```
src/
├── engine/
│   ├── types.ts           # Tipos: Player, Team, Strategy, MatchEvent, MatchResult
│   ├── matchEngine.ts     # Motor de simulação (1º/2º tempo, posse, ataque, gol, cansaço)
│   ├── commentary.ts      # Gerador de frases de comentário (variações por evento)
│   └── mockData.ts        # Dados mock (2 times fictícios, cloneTeam)
├── data/
│   └── premierLeague.ts   # 20 times da Premier League 2025/26 com 11 jogadores cada
├── components/
│   ├── TeamSelectionScreen.tsx  # Tela 1: seleção de times + toggle uniforme
│   ├── SetupScreen.tsx          # Tela 2: formação, mentalidade, intensidade
│   ├── MatchScreen.tsx          # Tela 3: campo, placar, simulação, intervalo
│   ├── Pitch.tsx                # Campo tático SVG (jogadores, bola, overlays)
│   └── CommentaryFeed.tsx       # Feed de comentários minuto a minuto
├── App.tsx / App.css / index.css / main.tsx
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

# Preview do build
npm run preview
```

O servidor de desenvolvimento roda em `http://localhost:5173` e o preview em `http://localhost:4173`.

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

## 🧠 Modelo de Dados

### Jogador (`Player`)
```typescript
{
  id: string;              // identificador único
  name: string;            // nome
  number: number;          // número da camisa
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  attributes: {
    speed: number;         // 1-99
    stamina: number;       // 1-99
    passing: number;       // 1-99
    finishing: number;     // 1-99
    tackling: number;      // 1-99
    dribbling: number;     // 1-99
    vision: number;        // 1-99
    positioning: number;   // 1-99
  };
  currentFatigue: number;  // 0-100 (0 = descansado)
}
```

### Time (`Team`)
```typescript
{
  id: string;
  name: string;
  abbreviation: string;
  color: string;           // uniforme escolhido (hex)
  secondaryColor: string;  // uniforme alternativo (hex)
  squad: Player[];
  strategy: Strategy;
}
```

### Estratégia (`Strategy`)
```typescript
{
  formation: '4-3-3' | '4-4-2' | '3-5-2' | '4-2-3-1' | '5-3-2';
  mentality: 'possession' | 'counter-attack' | 'high-press' | 'defensive';
  intensity: 'low' | 'medium' | 'high';
}
```

---

## 🔢 Como a Probabilidade de Gol é Calculada

O gol ocorre após **duas verificações consecutivas**:

### 1. Embate Ataque vs Defesa
```
Ataque = Σ(atacantes: Velocidade + Drible) × modMentalidade × RNG(0.7~1.3)
Defesa = Σ(defensores: Desarme + Posicionamento) + PosicionamentoGoleiro × RNG(0.7~1.3)
```
Se `Ataque > Defesa` → chance de finalização criada.

### 2. Finalização vs Goleiro
```
Chute    = Finalização × modMentalidade × RNG(0.8~1.2)
DefesaGK = PosicionamentoGoleiro × RNG(0.8~1.2)
```
- `Chute > DefesaGK` → **GOL** ⚽
- `Chute ≤ 80% da DefesaGK` → **Na trave** 😱
- `Chute ≤ 50% da DefesaGK` → **Defesa do goleiro** 🛡️
- `Chute ≤ 50% e perdeu por muito` → **Para fora** ↗️

### Modificadores por Mentalidade
| Mentalidade | Passe | Visão | Veloc | Drible | Desarme | Posic | Finaliz | Cansaço |
|------------|-------|-------|-------|--------|---------|-------|---------|---------|
| Posse de Bola | +20% | +20% | -10% | +5% | -10% | -5% | 0% | 1.0x |
| Contra-Ataque | -15% | 0% | +20% | +15% | -10% | -10% | +10% | 1.0x |
| Pressão Alta | -5% | 0% | +5% | 0% | +15% | +15% | -5% | **1.3x** |
| Retranca | -10% | -10% | -15% | -15% | +25% | +25% | -15% | 0.8x |

### Cansaço por Intensidade (por ciclo de 5 min)
- **Baixa**: +2 pts | **Média**: +4 pts | **Alta**: +7 pts
- Jogadores com Stamina alta cansam menos. Cansaço reduz atributos em até 50%.

---

## 🏗 Decisões de Arquitetura

- **Sem backend**: Toda a simulação roda no navegador (React + TypeScript). Os dados dos times são estáticos.
- **Motor deterministicamente aleatório**: O RNG usa `Math.random()` para imprevisibilidade, mas a semente dos jogadores no campo usa hash determinístico para evitar flicker visual.
- **Estado imutável**: Times são clonados (`cloneTeam`) antes de cada simulação para evitar mutação de estado.
- **CSS transitions**: As movimentações no campo usam transições CSS (não requestAnimationFrame) para simplicidade e performance.

---

## 📝 Licença

MIT
