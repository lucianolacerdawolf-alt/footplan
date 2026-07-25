# Plano de Funcionalidades — FootPlan v2

> Documento de planejamento para as 5 novas funcionalidades do FootPlan.
> Data: Julho 2024

## Status

| # | Funcionalidade | Status |
|---|---|---|
| 1 | Squad Management | ✅ Entregue — `SquadManagementScreen` + `FormationPitch`, clique-a-clique (sem `dnd-kit`) |
| 2 | Cloud Save (Supabase) | ⬜ Pendente — único item independente que falta |
| 3 | Hub + Inbox + Finanças | ✅ Entregue — mercado com dinheiro/CPU-por-valor explicitamente fora de escopo (ver `BACKLOG.md`) |
| 4 | Condição Física (Stamina) e Cartões | ✅ Entregue — `fitness.ts` + `discipline.ts` |
| 5 | Histórico e Hall of Fame | ✅ Entregue — `seasonClosure.ts` + `TrophyRoomScreen` (artilheiro de liga/copa e assistência ficaram fora, ver nota no tipo `CareerSeasonHistoryEntry`) |

Detalhes de cada item, incluindo o que foi simplificado/adiado em relação ao plano original, estão no [`BACKLOG.md`](./BACKLOG.md#-já-entregue-referência) e nas seções abaixo (mantidas como registro do planejamento original).

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
O `SetupScreen` atual troca jogadores clicando em linhas de texto genéricas (número + nome + posição + OVR). A formação é escolhida via `<select>`. O tipo `Player` não tem status de partida — o motor simplesmente pega os 11 primeiros do array `team.squad` (`squad.slice(0, N)`). Não há validação visual de formação.

> **Correção**: o `SetupScreen.tsx` já tem lógica de seleção não-trivial — `rebalanceSquad()` reordena o squad quando a formação muda, `autoBenchInjured()` banca lesionados automaticamente, e há troca clique-a-clique (`swapPlayers`/`handleSwapHome`/`handleSwapAway`) restrita à mesma posição. O que falta não é a lógica de seleção, é a **UI visual** (campo + drag-and-drop).

### Risco: Dependência de Ordem de Array
Pelo menos 7 arquivos hoje tratam "titular" como `squad.slice(0, N)` por **ordem do array**, não por um campo explícito: `src/utils/teamUtils.ts`, `src/engine/playerRating.ts`, `src/components/LeagueScreen.tsx`, `src/components/MatchScreen.tsx` (2 pontos), `src/engine/tournament.ts`, `src/components/MatchScreen/HalftimePanel.tsx`, além do próprio `SetupScreen.tsx`. Introduzir `matchStatus`/`gridSlot` como fonte de verdade exige ou (a) manter os dois sincronizados — risco de bug se o campo disser `STARTING` mas a ordem do array disser outra coisa —, ou (b) migrar todos esses call-sites para ler o campo em vez da posição no array. Esse é o maior risco oculto desta funcionalidade e deve ser resolvido antes de escrever a UI.

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
}
```

> **Nota de escopo**: os campos `yellowCardsThisSeason`/`isSuspended`/`suspendedRounds` (usados por #4) e `marketValue`/`weeklyWage` (usados por #3) foram movidos para as seções das features que realmente os consomem — eles não têm relação com a tela de escalação em si. Isso quebra a dependência artificial de #3/#4 em relação a #1: só a "Integração Visual" de #4 (mostrar suspensão/fadiga no campo) genuinamente precisa da UI de #1 pronta; o resto pode avançar em paralelo. Ver seção 6 para a ordem revisada.

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

> **Correção sobre reaproveitamento do `Pitch.tsx`**: só o SVG chrome (grama, linhas, `viewBox="0 0 120 70"`) e o espaço de coordenadas são realmente reaproveitáveis — cerca de 20-30% do arquivo (561 linhas). O restante é loop de animação via `requestAnimationFrame`, física de steering e eventos de bola, específicos da simulação ao vivo. O `FormationPitch.tsx` será majoritariamente um componente novo, não um refactor do `Pitch.tsx`.

### Estimativa
~~4 horas~~ **6-8 horas** (revisado — inclui a migração de dependência de ordem de array descrita acima)

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
| Fim de partida | Após `handleCareerLeagueMatchResult`/`handleCareerBracketMatchResult` (`useCareerManager.ts`) |
| Avançar rodada | Após `handleNextCareerLeagueRound` (`useCareerManager.ts:140`) |
| Avançar temporada | Após handleAdvanceSeason |
| Propor troca | Após trade confirmado |
| Sair da carreira | Ao voltar pra HomeScreen |

> **Correções**:
> - `handleNextLeagueRound` é a função do modo Campeonatos (não-carreira), em `useLeagueManager.ts`. O equivalente correto no Modo Carreira é **`handleNextCareerLeagueRound`**.
> - O gatilho de "fim de partida" não deve ser `MatchStatsScreen` — esse componente é puramente apresentacional (só recebe `onContinue`, não escreve estado). O `setCareerState` já acontece antes, em `handleCareerLeagueMatchResult`/`handleCareerBracketMatchResult`, chamado a partir de `App.tsx` antes de exibir a tela de stats. É lá que o checkpoint deve entrar.
> - `handleAdvanceSeason` usa uma exceção documentada no código: chama `setCareerState` com um objeto literal em vez do padrão `prev => ...`. Vale revisar se isso interage bem com o debounce (2s) do `useCloudSave` proposto.

### Configuração
- URL e anon_key do Supabase em variáveis de ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Adicionar ao `.env.example`

### Estimativa
~3 horas (razoável para a integração básica; o fluxo de "perder vínculo se limpar cache" e a vinculação de e-mail opcional tendem a consumir mais tempo que o previsto se forem feitos com cuidado)

---

## 3. Hub com Inbox, Finanças e Mercado

### Situação Atual
`CareerHubScreen` é um menu de navegação simples: resumo da temporada + 5 ações (Jogar, Ver Liga, Ver Copa, Propor Troca, Avançar Temporada) organizadas em 3 blocos de UI (card de resumo, card de próxima partida, linha de navegação — não uma única linha de 5 botões). O mercado de transferências é o `TradeProposalScreen` com troca 1-por-1 sem dinheiro.

> **Notas adicionais**:
> - O Hub já mostra um indicador "Janela de transferências: Aberta/Fechada" (`isWindowOpen`) — pode ser reaproveitado diretamente no `FinancePanel` proposto.
> - O Hub já renderiza um **grid de histórico de temporadas** (ano, posição, resultado de copa, reputação). Isso é, na prática, uma versão primitiva do que a funcionalidade #5 (Hall of Fame) propõe como tela dedicada — decidir explicitamente se esse grid migra para o `TrophyRoomScreen` ou se os dois convivem.

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

### Novos Campos no Tipo `Player` (src/engine/types.ts)
```typescript
interface Player {
  // ... campos existentes mantidos
  marketValue?: number;     // valor de mercado (calculado)
  weeklyWage?: number;      // salário semanal
}
```
*(movido da seção 1 — não depende da tela de escalação, só do motor de valuation abaixo)*

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

> **Correção importante**: não existe *nenhum* conceito de dinheiro no motor hoje. Trocas são resolvidas por `evaluateTradeOffer` com base em delta de OVR, excedente de posição e reputação — sem valor monetário. Introduzir `budget`/`marketValue` exige **reescrever essa lógica de aceite da CPU do zero**, não apenas adicionar UI de mercado.

> **Sugestão de de-risking**: por ser agora o maior item do plano e reescrever uma lógica que já funciona, vale (a) prototipar `calculateMarketValue` + o novo limiar de aceite da CPU isoladamente (fora da UI) antes de construir as 3 telas novas, e (b) manter o `TradeProposalScreen` atual como fallback em vez de substituição total imediata — reduz o risco de regressão na única forma de negociar jogadores que existe hoje.

### Estimativa
~~6 horas~~ **10-12 horas** (revisado — a reescrita do motor de aceite de trocas com dinheiro + o bloqueio de "avançar rodada" por mensagens obrigatórias somam mais que o previsto)

---

## 4. Condição Física (Stamina) e Cartões

### Situação Atual
- `Player.currentFatigue` (0-100) existe mas é resetado via `cloneTeam(preserveFatigue=false)` entre partidas
- `Player.injuredRounds` existe pra lesões durante a partida
- `effective()` no motor reduz atributos por fadiga: `attr * (1 - fatigue / 200)` → 50% de redução a 100 de fadiga
- Não há acúmulo de cartões amarelos entre jogos, nem suspensão automática

> **Achado importante**: `handleNextCareerLeagueRound` (`src/hooks/useCareerManager.ts:140`) **já chama `recoverFatigue(leg.teams)`** (definida em `src/engine/tournament.ts:275`) a cada avanço de rodada. Antes de implementar `recoverSquadFatigue`/`applyMatchFatigue` do zero, é preciso ler `recoverFatigue` e decidir se esta feature deve **estender** essa função existente ou genuinamente **substituí-la** — construir uma paralela sem reconciliar pode resultar em dois sistemas de recuperação de fadiga conflitantes.

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

### Novos Campos no Tipo `Player` (src/engine/types.ts)
```typescript
interface Player {
  // ... campos existentes mantidos
  yellowCardsThisSeason?: number;  // acúmulo pra suspensão
  isSuspended?: boolean;           // suspenso por acúmulo de cartão
  suspendedRounds?: number;        // jogos restantes de suspensão
}
```
*(movido da seção 1 — não depende da tela de escalação; só a exibição do overlay de suspensão em "Integração Visual" abaixo precisa da UI de #1 pronta)*

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
~~2 horas~~ **4 horas** (revisado — inclui investigar/reconciliar com `recoverFatigue` existente e atualizar os mesmos arquivos dependentes de ordem de array para filtrar suspensos na escalação)

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

> **Dependência oculta**: calcular `userTopScorer`/`userTopAssister` exige rastrear gols/assistências ao longo da temporada — isso toca o fluxo de registro de resultado de partida (`handleCareerLeagueMatchResult`), não só o fechamento de temporada. A coleta precisa acontecer partida a partida, não só dentro de `closeSeason`.

> **Sugestão**: o hook de coleta em `handleCareerLeagueMatchResult` é barato e independente da `TrophyRoomScreen` — vale adiantá-lo (mesmo em paralelo com #1/#2) para acumular dados reais ao longo de várias rodadas/temporadas de teste durante o desenvolvimento, em vez de só validar tudo no fim quando a tela for construída.

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
~~3 horas~~ **4 horas** (revisado — só é válida ~3h se a coleta incremental de estatísticas por partida já estiver disponível, o que hoje não está)

---

## 6. Ordem de Execução

> **Ordem revisada**: a versão original tratava "Squad Management primeiro" como bloqueio de #3/#4 por causa de campos do `Player` — mas esses campos foram desacoplados (ver notas nas seções 1, 3 e 4) e não exigem a tela de escalação pronta. A ordem abaixo prioriza (a) o menor risco/maior valor de segurança primeiro (Cloud Save protege contra perda de dados desde já) e (b) o maior risco técnico logo em seguida, pra descobrir problemas cedo em vez de no fim do cronograma.

| Ordem | # | Funcionalidade | Tempo (original) | Tempo (revisado) | Dependência real | Arquivos Novos |
|---|---|---------------|-------|-------|-------------|----------------|
| **1º** | 2 | Cloud Save | ~3h | 3h | Nenhuma | 4 (client + save + hook + status) |
| **2º** | 1 | Squad Management | ~4h | **6-8h** | Nenhuma | 3 (screen + pitch + utils) |
| **3º** | 4 | Stamina + Cartões | ~2h | **4h** | UI de #1 só p/ a "Integração Visual" | 2 (fitness + discipline) |
| **4º** | 3 | Hub + Inbox + Finanças | ~6h | **10-12h** | Nenhuma (prototipar valuation isolado) | 5 (hub refactor + 3 panels + market) |
| **5º** | 5 | Hall of Fame | ~3h | **4h** | Hook de stats pode começar cedo; tela fica por último | 2 (trophy screen + closure) |

**Total estimado original: ~18 horas**
**Total estimado revisado: ~27-31 horas** (após validação contra o código atual — ver notas de risco em cada seção)

### Por que esta ordem?

1. **Cloud Save primeiro** — como é trabalho solo (não há equipe pra rodar tarefas de fato em paralelo), "paralelizável" só significa "sem dependência"; vale bancar essa vitória rápida e de baixo risco (protege contra perda de save agora) antes de entrar nos itens mais incertos.
2. **Squad Management em seguida** — é o item de maior risco técnico (migração da dependência de ordem de array descrita na seção 1), então resolver essa incerteza cedo evita que ela contamine o resto do cronograma.
3. **Stamina + Cartões depois** — a lógica de motor (`fitness.ts`/`discipline.ts`) é independente e poderia até vir antes de #1; só a exibição visual de suspensão/fadiga no campo depende da UI de #1 já existir.
4. **Hub + Mercado** — agora o maior item do plano; não tem dependência real de dados de #1, mas reescreve uma lógica que já funciona (`evaluateTradeOffer`), então vale prototipar a valuation isoladamente antes de emendar nas 3 telas novas.
5. **Hall of Fame por último** — só a `TrophyRoomScreen` e o fechamento de temporada precisam esperar; o hook de coleta de estatísticas por partida pode ser adiantado em paralelo com qualquer uma das etapas acima.

---

## Perguntas em Aberto

| # | Pergunta | Opções | Recomendação (após análise do código atual) |
|---|----------|--------|-----------------------------------------------|
| 1 | Squad Management: **drag-and-drop** (dnd-kit) ou **clique para selecionar** + botão "Mover"? | Drag-and-drop é mais intuitivo mas adiciona ~15KB de dependência | Começar pelo padrão clique-a-clique — já existe e funciona no `SetupScreen.tsx`, zero dependência nova. Migrar para `dnd-kit` depois se a UX pedir. |
| 2 | Supabase: **crio o projeto agora** e deixo URL/anon_key no .env pra você preencher, ou **deixo o código pronto** placeholder? | Recomendo criar o projeto e eu configuro as migrations | Criar o projeto e validar save/load isoladamente (teste manual) antes de integrar nos checkpoints reais — seria a primeira dependência de backend do projeto. |
| 3 | Mercado: **substituir completamente** o TradeProposalScreen atual ou **manter coexistente**? | Recomendo substituir — o sistema com dinheiro é superior | Concordo em substituir, mas registrar que isso é uma reescrita de `evaluateTradeOffer` (lógica de aceite da CPU), não apenas uma troca de tela. |
| 4 | Cartões: acúmulo de 3 amarelos conta **só a liga** ou **liga + copa**? | FIFA conta separado; Football Manager conta junto | Sem precedente no código atual (não há acumulação cross-match hoje) — decisão de design pura, sem restrição técnica de nenhum dos dois lados. |
| 5 | Ordem: **começar pelo Squad Management** ou prefere começar pelo **Hall of Fame** (mais visual)? | Squad Management é o alicerce técnico | Revisado — ver seção 6: os campos de `Player` não são mais um bloqueio real (foram desacoplados por feature), então a ordem passou a ser Cloud Save → Squad Management → Stamina/Cartões → Hub/Mercado → Hall of Fame, priorizando segurança (save) e risco técnico (array) primeiro. |
