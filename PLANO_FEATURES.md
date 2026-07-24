# Plano de Funcionalidades — FootPlan v2

> Documento de planejamento para as 5 novas funcionalidades do FootPlan.
> Data: Julho 2024

---

## Índice

1. [Tela de Táticas e Elenco (Squad Management)](#1-tela-de-táticas-e-elenco)
2. [Cloud Save com Supabase](#2-cloud-save-com-supabase)
3. [Hub com Inbox, Finanças e Mercado](#3-hub-com-inbox-finanças-e-mercado)
4. [Condição Física (Stamina) e Cartões](#4-condição-física-stamina-e-cartões)
5. [Histórico e Hall of Fame](#5-histórico-e-hall-of-fame)
6. [Ordem de Execução](#6-ordem-de-execução)

---

## 1. Tela de Táticas e Elenco

### Situação Atual
O `SetupScreen` atual troca jogadores clicando em linhas de texto genéricas (número + nome + posição + OVR). A formação é escolhida via `<select>`. O tipo `Player` não tem status de partida — o motor simplesmente pega os 11 primeiros do array `team.squad`. Não há validação visual de formação.

### Solução Proposta
Criar uma tela dedicada de gerenciamento de elenco com campo tático visual e drag-and-drop.

### Novos Arquivos
```
src/components/SquadManagementScreen.tsx  — tela principal de escalação
src/components/MatchScreen/FormationPitch.tsx  — campo SVG com slots arrastáveis
src/engine/squadUtils.ts  — validação (11 titulares, 1 GK) + helpers de slot
```

### Novos Campos no Tipo `Player` (src/engine/types.ts)
```typescript
interface Player {
  // ... campos existentes mantidos (id, name, number, position, attributes, etc.)
  matchStatus?: 'STARTING' | 'BENCH' | 'RESERVE';  // status de escalação
  gridSlot?: number;        // índice do slot no campo (0-10)
  yellowCardsThisSeason?: number;  // acúmulo pra suspensão
  isSuspended?: boolean;    // suspenso por acúmulo de cartão
  marketValue?: number;     // valor de mercado (calculado)
  weeklyWage?: number;      // salário semanal
}
```

### Fluxo da Tela
1. **Campo visual**: SVG reaproveitando lógica do `Pitch.tsx`, mostrando os 11 slots da formação
2. **Slots de posição**: coordenadas pré-definidas por formação (`FORMATION_SLOTS` em `squadUtils.ts`)
   ```typescript
   const FORMATION_SLOTS: Record<Formation, Array<{x: number, y: number, pos: Position}>> = {
     '4-4-2': [
       {x: 8, y: 50, pos: 'GK'},
       {x: 25, y: 15, pos: 'DEF'}, {x: 25, y: 35, pos: 'DEF'},
       {x: 25, y: 65, pos: 'DEF'}, {x: 25, y: 85, pos: 'DEF'},
       {x: 50, y: 20, pos: 'MID'}, {x: 50, y: 40, pos: 'MID'},
       {x: 50, y: 60, pos: 'MID'}, {x: 50, y: 80, pos: 'MID'},
       {x: 78, y: 35, pos: 'FWD'}, {x: 78, y: 65, pos: 'FWD'},
     ],
     // ... demais formações
   };
   ```
3. **Lista de reservas** abaixo do campo com os jogadores restantes
4. **Troca de formação**: ao selecionar nova formação, os 11 titulares reposicionam automaticamente nos slots
5. **Validação ao confirmar**: exatamente 11 titulares + 1 goleiro. Se inválido, toast de erro.

### Integração com SetupScreen Atual
- `SetupScreen` ganha um botão "Gerenciar Elenco" que abre `SquadManagementScreen`
- Ao voltar, o elenco editado substitui o array `team.squad` (com `matchStatus` atualizado)
- O `setupScreen` continua existindo pra ajustes rápidos de tática (mentalidade, intensidade, etc.)

### Bibliotecas
- **dnd-kit** (~15KB gzip): biblioteca de drag-and-drop para React, acessível e performática
  - `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`
- Alternativa sem dependência: clicar no jogador → seleciona → clicar no slot → move. Mais simples mas menos intuitivo.

### Estimativa
~4 horas

---

## 2. Cloud Save com Supabase

### Situação Atual
Toda persistência é em `localStorage` do navegador:
- `fp:career` — carreira
- `fp:leagueState:{id}` — liga
- `fp:bracketState` — copa
- `fp:achievements` — conquistas
- `fp:liveMatch` — partida em andamento
- `fp:rosterCache:{id}` — cache de elenco

Problemas: sem backup, sem cross-device, sem recuperação se limpar o cache.

### Solução Proposta
Persistência híbrida: Supabase como fonte primária + localStorage como cache offline.

### Novos Arquivos
```
src/services/supabaseClient.ts   — cliente Supabase + auth anônimo
src/services/cloudSave.ts        — funções save/load com fallback localStorage
src/hooks/useCloudSave.ts        — hook React com debounce (2s) e indicador de status
src/components/CloudSaveStatus.tsx — ícone de status (nuvem verde/amarela/cinza)
```

### Schema do Banco (Supabase)
```sql
-- Tabela única com JSONB — sem tabelas relacionais complexas
CREATE TABLE careers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  manager_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  current_season INT DEFAULT 1,
  career_state JSONB NOT NULL,   -- o objeto CareerState inteiro serializado
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_careers_user ON careers(user_id);

-- RLS: usuário só vê a própria carreira
ALTER TABLE careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own career"
  ON careers FOR ALL USING (auth.uid() = user_id);
```

### Arquitetura de Persistência
```
                   ┌─────────────────────┐
                   │  MatchStatsScreen    │
                   │  (fechar partida)    │
                   └────────┬────────────┘
                            │ checkpoint automático
                   ┌────────▼────────────┐
                   │   useCloudSave      │
                   │   .save(state)      │
                   └────────┬────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
    ┌─────────▼──────────┐    ┌──────────▼──────────┐
    │  supabase.upsert() │    │ localStorage.set()   │
    │  (primário)        │    │  (fallback offline)  │
    └─────────┬──────────┘    └─────────────────────┘
              │
    ┌─────────▼──────────┐
    │  Sucesso?          │
    │  Sim → Toast "✓"   │
    │  Não → Toast "Off" │
    └────────────────────┘
```

### Fluxo de Autenticação
- **Login anônimo**: `supabase.auth.signInAnonymously()` — sem e-mail, sem senha
- O `user_id` anônimo é persistido no localStorage como `fp:supabase_user`
- Se o usuário limpar o cache, perde o vínculo (aviso na UI)
- **Recuperação opcional**: botão "Vincular e-mail" pra criar conta permanente

### Checkpoints de Save
| Gatilho | Momento |
|---------|---------|
| Fim de partida | Ao fechar MatchStatsScreen |
| Avançar rodada | Após handleNextLeagueRound |
| Avançar temporada | Após handleAdvanceSeason |
| Propor troca | Após trade confirmado |
| Sair da carreira | Ao voltar pra HomeScreen |

### Configuração
- URL e anon_key do Supabase em variáveis de ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Adicionar ao `.env.example`

### Estimativa
~3 horas

---

## 3. Hub com Inbox, Finanças e Mercado

### Situação Atual
`CareerHubScreen` é um menu de navegação simples: resumo da temporada + 5 botões (Jogar, Ver Liga, Ver Copa, Propor Troca, Avançar Temporada). O mercado de transferências é o `TradeProposalScreen` com troca 1-por-1 sem dinheiro.

### Solução Proposta
Transformar o Hub em um painel de controle de clube: caixa de entrada de mensagens no centro, painel financeiro no topo, e mercado reformulado com dinheiro.

### Novos Arquivos
```
src/components/CareerHubScreen.tsx     — refatorado para painel completo
src/components/InboxPanel.tsx          — lista de mensagens estilo e-mail
src/components/FinancePanel.tsx        — resumo financeiro (budget, folha, renda)
src/components/TransferMarketScreen.tsx — novo mercado com busca e valores
src/engine/transferMarket.ts           — lógica de valuation e negociação
```

### Novos Tipos
```typescript
// Em src/engine/career.ts
interface ClubFinances {
  budget: number;         // saldo pra transferências (~20M, varia por liga)
  wageBill: number;       // soma dos salários semanais do elenco
  weeklyIncome: number;   // renda de bilheteria + patrocínio + premiação
}

interface InboxMessage {
  id: string;
  date: string;
  isRead: boolean;
  isMandatory: boolean;   // precisa ser respondida pra avançar o tempo
  type: 'TRANSFER_OFFER' | 'BOARD_UPDATE' | 'INJURY_REPORT' | 'MATCH_PREVIEW';
  subject: string;
  body: string;
  actions?: { label: string; triggerId: string }[];
}

// Adicionar ao CareerState:
interface CareerState {
  // ... campos existentes
  finances?: ClubFinances;
  inbox?: InboxMessage[];
}
```

### Valuation de Jogadores
```typescript
function calculateMarketValue(player: Player, age: number): number {
  const baseOvr = playerOvr(player);
  // Jogadores jovens valem mais (potencial de crescimento)
  const ageMultiplier = age <= 21 ? 1.5 : age <= 25 ? 1.3 : age <= 28 ? 1.1 : age <= 31 ? 0.9 : 0.6;
  // Posição afeta valor
  const positionMultiplier = player.position === 'FWD' ? 1.2 : player.position === 'GK' ? 0.7 : 1.0;
  return Math.round(baseOvr * ageMultiplier * positionMultiplier * 50000);
}
```

### Regras do Mercado
1. **Saldo**: `budget + valor_do_seu_jogador >= valor_do_alvo` → troca possível
2. **CPU avalia**: aceita se `valor_oferecido >= valor_alvo * 0.85` (margem de 15%)
3. **Jogadores livres**: aparecem quando `budget >= marketValue` (sem troca, só compra)
4. **Janela de transferências**: rounds 1-5 e 19-24 (já implementado)

### Inbox
- **Mensagens obrigatórias**: propostas de troca da CPU, avisos da diretoria
- O botão "Avançar Rodada" fica bloqueado enquanto houver mensagens obrigatórias não lidas
- Mensagens informativas: preview da partida, relatório de lesão, notícias da liga

### Layout do Hub (wireframe)
```
┌──────────────────────────────────────┐
│  💰 Budget: €18.5M  │  Folha: €2.1M  │
├──────────────────────────────────────┤
│  📨 Caixa de Entrada          (3)    │
│  ┌──────────────────────────────────┐ │
│  │ ⚽ Prévia: Rodada 12              │ │
│  │ 📋 Proposta do PSG por Neymar    │ │
│  │ 🏥 Lesão: De Bruyne (2 jogos)    │ │
│  └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│  📅 Próxima Partida: Liga (Rodada 12)│
│  Seu Time vs Rival                   │
│  [⚽ Jogar]                          │
├──────────────────────────────────────┤
│  [Ver Liga] [Ver Copa] [Mercado]    │
│  [Avançar Temporada]                 │
└──────────────────────────────────────┘
```

### Estimativa
~6 horas

---

## 4. Condição Física (Stamina) e Cartões

### Situação Atual
- `Player.currentFatigue` (0-100) existe mas é resetado via `cloneTeam(preserveFatigue=false)` entre partidas
- `Player.injuredRounds` existe pra lesões durante a partida
- `effective()` no motor reduz atributos por fadiga: `attr * (1 - fatigue / 200)` → 50% de redução a 100 de fadiga
- Não há acúmulo de cartões amarelos entre jogos, nem suspensão automática

### Solução Proposta
Implementar fadiga persistente entre partidas + sistema disciplinar.

### Novos Arquivos
```
src/engine/fitness.ts      — fadiga pós-jogo + recuperação entre rodadas
src/engine/discipline.ts   — processamento de cartões + suspensão
```

### Lógica de Fadiga

**Pós-jogo (aplicada no match handler):**
```typescript
// Em src/engine/fitness.ts
const FATIGUE_PER_MINUTE = 0.4;  // ~40 pontos de fadiga pra 90 minutos

function applyMatchFatigue(player: Player, minutesPlayed: number): Player {
  return {
    ...player,
    currentFatigue: Math.min(100, player.currentFatigue + minutesPlayed * FATIGUE_PER_MINUTE),
  };
}
```

**Recuperação entre rodadas (chamada ao avançar rodada):**
```typescript
const RECOVERY_PER_DAY = 14;  // ~14 pontos de recuperação por dia de descanso

function recoverSquadFatigue(team: Team, daysSinceLastMatch: number): Team {
  return {
    ...team,
    squad: team.squad.map(p => ({
      ...p,
      currentFatigue: Math.max(0, p.currentFatigue - daysSinceLastMatch * RECOVERY_PER_DAY),
    })),
  };
}
```

| Dias de descanso | Recuperação | Exemplo (fadiga 80 → X) |
|-----------------|-------------|--------------------------|
| 3 (meio de semana) | 42 pts | 80 → 38 |
| 7 (semana cheia) | 98 pts | 80 → 0 |

### Lógica de Cartões

**Processamento pós-jogo:**
```typescript
// Em src/engine/discipline.ts
function processPlayerCards(
  player: Player,
  matchYellowCards: number,  // quantos amarelos levou NESTA partida
  matchRedCard: boolean      // levou vermelho direto?
): Player {
  let updated = { ...player };

  // Vermelho direto → 1 jogo de suspensão
  if (matchRedCard) {
    updated.isSuspended = true;
    updated.suspendedRounds = 1;
  }

  // Acumula amarelos da partida
  updated.yellowCardsThisSeason = (updated.yellowCardsThisSeason ?? 0) + matchYellowCards;

  // 3 amarelos no total → 1 jogo de suspensão + reseta contador
  if ((updated.yellowCardsThisSeason ?? 0) >= 3) {
    updated.isSuspended = true;
    updated.suspendedRounds = (updated.suspendedRounds ?? 0) + 1;
    updated.yellowCardsThisSeason = 0;
  }

  return updated;
}
```

**Liberação de suspensão (ao avançar rodada):**
```typescript
function clearSuspensions(team: Team): Team {
  return {
    ...team,
    squad: team.squad.map(p => {
      if (!p.isSuspended || !p.suspendedRounds) return p;
      const remaining = p.suspendedRounds - 1;
      return {
        ...p,
        isSuspended: remaining > 0,
        suspendedRounds: remaining > 0 ? remaining : undefined,
      };
    }),
  };
}
```

### Integração Visual (SquadManagement)
- Jogador com `isSuspended === true` → overlay cinza, tooltip "Suspenso", não pode ser escalado
- Jogador com `currentFatigue > 80` → barra de stamina vermelha, tooltip "Fadiga Alta"
- Jogador com `currentFatigue > 50` → barra de stamina amarela, tooltip "Fadiga Média"
- Jogador com `injuredRounds > 0` → ícone de lesão, tooltip "Lesionado (X jogos)"

### Estimativa
~2 horas

---

## 5. Histórico e Hall of Fame

### Situação Atual
`CareerSeasonHistoryEntry` existe com:
- `year`, `leagueId`, `leagueChampionId`, `userLeaguePosition`
- `cupResult`, `tradesUsed`, `reputationDelta`

`SeasonEndScreen` mostra o campeão, sua posição, resultado da copa, e reputação. Botão "Começar Temporada X+1".

### Solução Proposta
Enriquecer o histórico com estatísticas detalhadas + tela de troféus visual.

### Novos Arquivos
```
src/components/TrophyRoomScreen.tsx   — nova tela de troféus e estatísticas
src/engine/seasonClosure.ts           — rotina de fechamento de temporada
```

### Novos Campos no Histórico
```typescript
// Em src/engine/career.ts
interface CareerSeasonHistoryEntry {
  // ... campos existentes mantidos
  year: number;
  leagueId: string;
  leagueChampionId: string;
  userLeaguePosition: number;
  cupResult: 'champion' | 'runner-up' | 'semifinal' | 'quarterfinal' | 'roundOf16' | 'not-played';
  tradesUsed: number;
  reputationDelta: number;

  // NOVOS:
  userTopScorer?: { name: string; goals: number };
  userTopAssister?: { name: string; assists: number };
  leagueTopScorer?: { name: string; goals: number; teamId: string };
  cupTopScorer?: { name: string; goals: number };
  userWins?: number;
  userDraws?: number;
  userLosses?: number;
  userGoalsFor?: number;
  userGoalsAgainst?: number;
  managerOfSeason?: boolean;   // eleito melhor técnico
  budgetDelta?: number;        // variação financeira na temporada
}
```

### Rotina de Fechamento (`closeSeason` em `seasonClosure.ts`)
```typescript
function closeSeason(
  state: CareerState,
  leagueTopScorer: { name: string; goals: number; teamId: string },
  userStats: { wins: number; draws: number; losses: number; gf: number; ga: number }
): { history: CareerSeasonHistoryEntry; state: CareerState } {
  // 1. Determinar artilheiro do usuário (varre fixtures)
  // 2. Determinar resultado da copa
  // 3. Calcular managerOfSeason (top 4 + copa final = eleito)
  // 4. Calcular delta financeiro
  // 5. Montar entry e adicionar ao history
  // 6. Retornar entry + state atualizado
}
```

### TrophyRoomScreen
- **Grid de temporadas**: cards com ano, ícone do troféu (🥇 liga, 🏆 copa, 🥈 vice), posição final
- **Ao clicar no card**: expande mostrando stats detalhadas (artilheiro, campanha, finanças)
- **Linha do tempo de reputação**: gráfico simples mostrando evolução ao longo das temporadas
- **Acessível via CareerHub**: botão "🏆 Troféus" no hub

### Layout do TrophyRoom
```
┌──────────────────────────────────────┐
│           🏆 Sala de Troféus         │
│                                      │
│  ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ 🥇2024 │ │ 🏆2025 │ │  2026  │   │
│  │ 1º PL  │ │ Campeão│ │ 3º PL  │   │
│  │ Copa SF│ │ Copa F │ │ Copa QF│   │
│  └────────┘ └────────┘ └────────┘   │
│                                      │
│  Reputação: ────▲───▲──────────▲───  │
│            50  80  95         120    │
└──────────────────────────────────────┘
```

### Estimativa
~3 horas

---

## 6. Ordem de Execução

| # | Funcionalidade | Tempo | Dependências | Arquivos Novos |
|---|---------------|-------|-------------|----------------|
| **1** | Squad Management | ~4h | Nenhuma | 3 (screen + pitch + utils) |
| **4** | Stamina + Cartões | ~2h | Player fields (#1) | 2 (fitness + discipline) |
| **2** | Cloud Save | ~3h | Nenhuma | 4 (client + save + hook + status) |
| **3** | Hub + Inbox + Finanças | ~6h | Valuation (#1) + Finances | 5 (hub refactor + 3 panels + market) |
| **5** | Hall of Fame | ~3h | Season closure | 2 (trophy screen + closure) |

**Total estimado: ~18 horas**

### Por que esta ordem?

1. **Squad Management primeiro** porque cria os novos campos no `Player` que as funcionalidades 3 e 4 dependem
2. **Stamina + Cartões em seguida** porque usa imediatamente os campos novos e fecha o ciclo de gameplay
3. **Cloud Save paralelizável** — não depende de nada, executa em paralelo com #1/#4
4. **Hub + Mercado depois** porque precisa do valuation dos jogadores (campos do #1) e do sistema financeiro
5. **Hall of Fame por último** porque depende do fechamento de temporada que só faz sentido com todas as outras features prontas

---

## Perguntas em Aberto

| # | Pergunta | Opções |
|---|----------|--------|
| 1 | Squad Management: **drag-and-drop** (dnd-kit) ou **clique para selecionar** + botão "Mover"? | Drag-and-drop é mais intuitivo mas adiciona ~15KB de dependência |
| 2 | Supabase: **crio o projeto agora** e deixo URL/anon_key no .env pra você preencher, ou **deixo o código pronto** placeholder? | Recomendo criar o projeto e eu configuro as migrations |
| 3 | Mercado: **substituir completamente** o TradeProposalScreen atual ou **manter coexistente**? | Recomendo substituir — o sistema com dinheiro é superior |
| 4 | Cartões: acúmulo de 3 amarelos conta **só a liga** ou **liga + copa**? | FIFA conta separado; Football Manager conta junto |
| 5 | Ordem: **começar pelo Squad Management** ou prefere começar pelo **Hall of Fame** (mais visual)? | Squad Management é o alicerce técnico |
