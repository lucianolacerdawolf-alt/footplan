# Plano Detalhado: Cloud Save + Mercado com Dinheiro

> Data: Julho 2026
> **Status: ✅ ENTREGUE** (confirmado em 2026-07-31)
>
> As duas partes saíram: Cloud Save em `services/cloudSave.ts` + `useCloudSave`
> (ativo em `useCareerManager`), e o mercado com dinheiro em
> `TransferMarketScreen` + `engine/transferMarket.ts` + `engine/freeAgentPool.ts`.
> O documento fica como registro do planejamento original — o que foi
> simplificado em relação a ele está no `BACKLOG.md`.

---

## PARTE 1 — Cloud Save com Supabase (~4h)

### 1.1 Situação Atual

Toda persistência é em `localStorage` do navegador:
- `fp:career` — carreira (hook `usePersistedState` em `useCareerManager.ts:47`)
- `fp:leagueState:{id}` — liga
- `fp:bracketState` — copa
- `fp:achievements` — conquistas
- `fp:liveMatch` — partida em andamento
- `fp:rosterCache:{id}` — cache de elenco
- + 10 outras chaves auxiliares (h2h, history, replaySpeed, etc.)

Problemas: sem backup, sem cross-device, sem recuperação se limpar o cache.

### 1.2 Solução Proposta

Persistência híbrida: Supabase como fonte primária + localStorage como cache offline.
Apenas a chave `fp:career` será sincronizada — é o save completo com rosters (6 ligas), temporada, finanças, inbox e histórico.

### 1.3 Novos arquivos

| Arquivo | Descrição |
|---|---|
| `src/services/supabaseClient.ts` | Cliente Supabase + auth anônimo |
| `src/services/cloudSave.ts` | `saveCareer()` / `loadCareer()` com fallback localStorage |
| `src/hooks/useCloudSave.ts` | Hook React com debounce 2s, indicador de status e retry automático |
| `src/components/CloudSaveStatus.tsx` | Ícone no Hub: ☁️ sincronizado / 🔄 salvando / ⚠️ offline |

### 1.4 Schema Supabase (SQL)

```sql
CREATE TABLE careers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  manager_name TEXT NOT NULL,
  team_id TEXT NOT NULL,
  current_season INT DEFAULT 1,
  career_state JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX idx_careers_user ON careers(user_id);

ALTER TABLE careers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own career"
  ON careers FOR ALL USING (auth.uid() = user_id);
```

Snapshot de elencos (cache permanente — leitura preferida antes da API, ver `rosterCloud.ts`):

```sql
CREATE TABLE roster_snapshots (
  id TEXT PRIMARY KEY,
  rosters JSONB NOT NULL,          -- Record<leagueId, Team[]>
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO roster_snapshots (id, rosters) VALUES ('global', '{}');
ALTER TABLE roster_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read global snapshot"
  ON roster_snapshots FOR SELECT USING (true);
CREATE POLICY "write global snapshot"
  ON roster_snapshots FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

### 1.5 Fluxo de Auth

```
App mount → supabaseClient.init()
  → tenta restaurar sessão do localStorage ('fp:supabase_session')
  → se não tem → signInAnonymously() → salva sessão no localStorage
  → se falhar rede → modo offline (só localStorage), retry a cada 5 min
```

- **Login anônimo**: `supabase.auth.signInAnonymously()` — sem e-mail, sem senha
- O `user_id` anônimo é persistido no localStorage como `fp:supabase_user`
- Se o usuário limpar o cache, perde o vínculo (aviso na UI)
- **Recuperação opcional** (futura): botão "Vincular e-mail" pra criar conta permanente

### 1.6 Arquitetura de Save/Load

```
saveCareer(state):
  1. localStorage.setItem('fp:career', JSON) — sempre (imediato)
  2. supabase.upsert(career_state) — debounced 2s
     → sucesso: status = 'saved'
     → falha: status = 'offline', agenda retry

loadCareer():
  1. tenta supabase.select() primeiro
     → sucesso: retorna do cloud, atualiza localStorage
     → falha: cai pro localStorage
  2. localStorage.getItem('fp:career') como fallback
  3. se ambos falharem → null (nova carreira)
```

### 1.7 Checkpoints de Save (já existem no código)

Todos os 11 `setCareerState` em `useCareerManager.ts` são pontos de gravação.
O hook `useCloudSave` intercepta via o callback `onPersist` do `usePersistedState`:

| # | Função | Linha | Gatilho |
|---|---|---|---|
| 1 | `handleStartCareer` | 94 | Nova carreira |
| 2 | `handleSimulateUserCareerLeagueMatch` | 145 | Quick-sim liga |
| 3 | `handleSimulateCareerLeagueRound` | 154 | Simular rodada toda |
| 4 | `handleNextCareerLeagueRound` | 192 | Avançar rodada |
| 5 | `handleCareerLeagueMatchResult` | 230 | Jogou partida da liga |
| 6 | `handleSimulateOtherCareerBracketMatches` | 267 | Simular copa CPU |
| 7 | `handleSimulateCareerBracketMatch` | 281 | Quick-sim copa |
| 8 | `handleCareerBracketMatchResult` | 315 | Jogou partida da copa |
| 9 | `handleProposeTrade` | 369 | Troca concluída |
| 10 | `handleAdvanceSeason` | 437 | Fim de temporada |
| 11 | `handleMarkInboxRead` / `handleMarkAllInboxRead` | 453 / 460 | Mensagem lida |

### 1.8 Integração no CareerHubScreen

Adicionar `<CloudSaveStatus>` no header do Hub:

```
┌──────────────────────────────────────┐
│  👤 Técnico: Fulano  │  ☁️ Salvo     │  ← CloudSaveStatus aqui
│  ⭐ Reputação: 72                     │
├──────────────────────────────────────┤
│  <FinancePanel />                     │
│  <InboxPanel />                       │
│  ...                                  │
└──────────────────────────────────────┘
```

### 1.9 Configuração

Adicionar ao `.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 1.10 Estimativa

| Tarefa | Tempo |
|---|---|
| `supabaseClient.ts` + auth anônimo | 45min |
| `cloudSave.ts` + `useCloudSave.ts` | 1h |
| `CloudSaveStatus.tsx` | 30min |
| Integração no `useCareerManager` | 30min |
| Testes (mock do Supabase) | 45min |
| Docs + `.env.example` | 15min |
| **Total** | **~4h** |

---

## PARTE 2 — Mercado de Transferências com Dinheiro (~10h)

### 2.1 Situação Atual

- `calculateMarketValue()` já existe em `transferMarket.ts:5` — calcula valor por OVR, idade, posição
- `calculateWeeklyWage()` em `transferMarket.ts:14` — converte valor de mercado em salário
- `ClubFinances` (`career.ts:43`) já tem `budget`, `wageBill`, `weeklyIncome`
- Orçamento flui a cada rodada: `budget + weeklyIncome - wageBill` (`useCareerManager.ts:175`)
- `initialBudget(leagueId)` em `transferMarket.ts:42` — orçamento inicial por liga
- `evaluateTradeOffer()` é puramente OVR-delta sem dinheiro — `career.ts:248`
- `TradeProposalScreen` é troca 1-por-1 jogador (sem cash)
- `InboxMessage.type` já inclui `'TRANSFER_OFFER'` mas **não tem factory** correspondente
- Janela de transferências já funciona: rounds 1-5 e 19-24 (`isWindowOpen`)

### 2.2 O que muda no engine

#### 2.2.1 Nova função: `evaluateCashTransfer` (`transferMarket.ts`)

```typescript
function evaluateCashTransfer(
  player: Player,           // jogador alvo
  offeredAmount: number,    // quanto o comprador oferece
  sellerNeedsPlayer: boolean, // se o vendedor tem elenco curto na posição (≤2)
  rng?: () => number
): { accepted: boolean; reason: string }
```

Lógica:
```
marketValue = calculateMarketValue(player)
minAccept = marketValue * 0.85      // CPU aceita 85%+ do valor
premium = marketValue * 1.5         // acima disso é "irrecusável"

if (offeredAmount >= premium) → accepted, reason: 'premium-offer'
else if (offeredAmount >= minAccept) → accepted, reason: 'value-met'
else if (sellerNeedsPlayer) → minAccept *= 1.3 (30% mais caro) → reavalia
else → rejected, reason: 'too-low'
```

#### 2.2.2 Pool de Agentes Livres (`src/engine/freeAgentPool.ts` — novo arquivo)

```typescript
function generateFreeAgentPool(): Player[]
function refreshFreeAgentPool(existing: Player[], currentSeasonYear: number): Player[]
```

- Gera 12-18 jogadores sem clube com OVR entre 65-82
- Atributos sintéticos (mesma lógica de `generateTeam.ts`)
- Distribuição de posições: 2 GK, 4-5 DEF, 4-5 MID, 3-4 FWD
- Renovado a cada abertura de janela de transferências
- Jogadores não contratados envelhecem/evoluem entre temporadas (mesma lógica de `progressCareerPlayers`)
- Armazenado em `CareerState.freeAgentPool: Player[]`

#### 2.2.3 Novos tipos (`career.ts`)

```typescript
// Adicionar ao CareerState:
interface CareerState {
  // ... campos existentes mantidos
  freeAgentPool?: Player[];               // agentes livres da janela atual
  transferHistory?: TransferRecord[];     // histórico de transações
}

interface TransferRecord {
  id: string;
  date: string;
  seasonYear: number;
  type: 'BUY' | 'SELL' | 'SIGN_FREE_AGENT';
  playerName: string;
  playerPosition: Position;
  fromTeam: string;      // clube de origem (ou 'Free Agent')
  toTeam: string;        // clube de destino
  amount: number;        // valor pago
}
```

#### 2.2.4 Novas factories de inbox (`inbox.ts`)

```typescript
function createTransferOfferMessage(
  offeringClub: string,
  playerName: string,
  position: Position,
  ovr: number,
  marketValue: number,
  offeredAmount: number,
  date: string
): InboxMessage  // type: 'TRANSFER_OFFER', isMandatory: true

function createTransferAcceptedMessage(
  playerName: string,
  fromClub: string,
  toClub: string,
  amount: number,
  date: string
): InboxMessage  // type: 'BOARD_UPDATE'

function createTransferRejectedMessage(
  playerName: string,
  requestingClub: string,
  date: string
): InboxMessage  // type: 'BOARD_UPDATE'

function createTransferOutCompletedMessage(
  playerName: string,
  toClub: string,
  amount: number,
  date: string
): InboxMessage  // type: 'BOARD_UPDATE'
```

#### 2.2.5 Ofertas de compra da CPU (nova lógica em `useCareerManager`)

Ao avançar rodada (`handleNextCareerLeagueRound`), se janela de transferências aberta:

```
30% de chance de gerar 1 oferta por janela (uma vez, ao abrir)
CPU escolhe um jogador do usuário que:
  - É titular (matchStatus === 'STARTING')
  - Tem OVR > média do time da CPU
  - Não é goleiro (GK mantido pelo time)
Valor oferecido: marketValue * random(0.85, 1.35)
Oferta chega como InboxMessage obrigatória com botões "Aceitar" / "Recusar"
```

#### 2.2.6 Board Strictness (retenção da diretoria) — `transferMarket.ts`

Inspirado no EA FC, a diretoria retém uma parte do valor das vendas:

```typescript
const BOARD_RETENTION = 0.80;  // 80% do valor da venda vai pro orçamento do técnico

function netSellRevenue(marketValue: number): number {
  return Math.round(marketValue * BOARD_RETENTION);
}
```

Impacto nos handlers:
- `handleAcceptTransferOffer`: `budget += netSellRevenue(amount)` em vez de `budget += amount`
- `handleProposeTrade` (venda com cash): o cash recebido também passa pela retenção

#### 2.2.7 Prize Money (premiações) — `transferMarket.ts`

Valores fixos por posição na liga + fase da copa, creditados no fim da temporada:

```typescript
const PRIZE_MONEY: Record<string, { league: Record<number, number>; cup: Record<string, number> }> = {
  pl:    { league: { 1: 8_000_000, 2: 5_000_000, 3: 3_500_000, 4: 2_500_000, 5: 1_500_000, 6: 1_000_000 }, cup: { champion: 2_000_000, 'runner-up': 1_200_000, semifinal: 600_000 } },
  laliga: { league: { 1: 7_000_000, 2: 4_500_000, 3: 3_000_000, 4: 2_000_000, 5: 1_200_000, 6: 800_000 },  cup: { champion: 1_500_000, 'runner-up': 1_000_000, semifinal: 500_000 } },
  serieA: { league: { 1: 6_000_000, 2: 4_000_000, 3: 2_800_000, 4: 1_800_000, 5: 1_000_000, 6: 700_000 },  cup: { champion: 1_200_000, 'runner-up': 800_000, semifinal: 400_000 } },
  bundesliga: { league: { 1: 6_500_000, 2: 4_200_000, 3: 3_000_000, 4: 2_000_000, 5: 1_200_000, 6: 800_000 }, cup: { champion: 1_500_000, 'runner-up': 1_000_000, semifinal: 500_000 } },
  ligue1: { league: { 1: 5_000_000, 2: 3_000_000, 3: 2_000_000, 4: 1_500_000, 5: 800_000, 6: 500_000 },     cup: { champion: 1_000_000, 'runner-up': 700_000, semifinal: 350_000 } },
  ligaPortugal: { league: { 1: 2_500_000, 2: 1_500_000, 3: 1_000_000, 4: 700_000, 5: 400_000, 6: 250_000 },   cup: { champion: 500_000, 'runner-up': 300_000, semifinal: 150_000 } },
};

function getLeaguePrizeMoney(leagueId: string, position: number): number {
  return PRIZE_MONEY[leagueId]?.league[position] ?? 0;
}

function getCupPrizeMoney(leagueId: string, result: string): number {
  return PRIZE_MONEY[leagueId]?.cup[result] ?? 0;
}
```

Creditado em `handleAdvanceSeason`:
```typescript
const leaguePrize = getLeaguePrizeMoney(state.leagueId, leaguePosition);
const cupPrize = getCupPrizeMoney(state.leagueId, cupResult);
finances.budget += leaguePrize + cupPrize;
```

#### 2.2.8 Ticket Sales (bilheteria) — `transferMarket.ts`

Valor fixo por jogo em casa, creditado ao avançar rodada:

```typescript
const TICKET_REVENUE_PER_HOME_MATCH: Record<string, number> = {
  pl: 800_000, laliga: 700_000, serieA: 500_000,
  bundesliga: 600_000, ligue1: 400_000, ligaPortugal: 200_000,
};

function getTicketRevenue(leagueId: string): number {
  return TICKET_REVENUE_PER_HOME_MATCH[leagueId] ?? 200_000;
}
```

Creditado em `handleNextCareerLeagueRound` (se o próximo jogo é em casa) e `handleCareerBracketMatchResult` (se a partida da copa foi em casa).

#### 2.2.9 Fórmula final do orçamento

```
budget =
  initialBudget
  + prizeMoney (liga + copa, creditado no fim da temporada)
  + ticketSales (a cada jogo em casa na liga e copa)
  + netSellRevenue (80% do valor de venda de jogadores)
  + (weeklyIncome × roundsPlayed)
  - playerBoughtCost (compras e contratações de agentes livres)
  - (wageBill × roundsPlayed)
```

### 2.3 Novos componentes UI

#### 2.3.1 `TransferMarketScreen.tsx` (novo — ~250 linhas)

Tela principal de mercado com 2 abas:

```
┌──────────────────────────────────────┐
│  ← Voltar               💰 €18.5M   │
├──────────────────────────────────────┤
│  [🛒 Comprar Jogadores]  [🆓 Agentes Livres] │  ← abas
├──────────────────────────────────────┤
│  Filtrar: [Todos] [GK] [DEF] [MID] [FWD]     │
│  Ordenar: [OVR ↓] [Valor ↑] [Nome A-Z]       │
├──────────────────────────────────────┤
│  ┌──────────────────────────────────┐ │
│  │ 🏴 Arsenal                 OVR 84│ │
│  │ 7 | Saka | FWD | 86 | €5.2M    │ │
│  │     [Comprar]                    │ │  ← expande slider de oferta
│  │  ┌─────────────────────────────┐│ │
│  │  │ Oferecer: €─── [slider 0.7-1.5×] ││ │
│  │  │ Valor oferta: €5.2M         ││ │
│  │  │ [Confirmar Oferta] [Cancelar]││ │
│  │  └─────────────────────────────┘│ │
│  └──────────────────────────────────┘ │
│  ┌──────────────────────────────────┐ │
│  │ 🏴 Chelsea                OVR 82│ │
│  │ 24| James | DEF | 82 | €3.1M   │ │
│  │     [Comprar]                    │ │
│  └──────────────────────────────────┘ │
│  ...                                  │
└──────────────────────────────────────┘
```

**Aba Comprar Jogadores**: lista todos os jogadores de todos os clubes CPU, agrupados por time (ordenado por OVR médio do time). Mostra nome, número, posição, OVR e valor de mercado.

**Aba Agentes Livres**: mesma estrutura mas com o pool `freeAgentPool`. Ordenado por OVR decrescente.

**Slider de oferta**: ao clicar "Comprar", expande inline:
- Slider de `0.7×` a `1.5×` o `marketValue` (steps de 0.05×)
- Mostra valor calculado em €
- Bloqueia confirmação se `offeredAmount > budget`
- Se `offeredAmount >= marketValue * 1.5`, mostra badge "Oferta Irrecusável"

**Edge cases**:
- Transfer window fechada: banner "Janela de transferências fechada. Abre nas rodadas 1-5 e 19-24."
- Budget insuficiente para qualquer jogador: "Orçamento insuficiente para contratar."
- Sem agentes livres: "Nenhum agente livre disponível no momento."
- Confirmada a compra: toast de sucesso e recálculo do budget

#### 2.3.2 Modificar `TradeProposalScreen.tsx` (existente — +50 linhas)

Adicionar componente de cash à troca 1-por-1 existente:

```
┌──────────────────────────────────────┐
│  Troca Direta                        │
├──────────────────────────────────────┤
│  Seu Jogador:                        │
│  10 | Fulano | FWD | OVR 78 | €3.2M  │  ← valor de mercado adicionado
│                                      │
│  Jogador Deles:                      │
│  9  | Ciclano | FWD | OVR 82 | €5.8M │
│                                      │
│  💰 Diferença de valor: +€2.6M       │  ← NOVO
│  ┌─────────────────────────────────┐ │
│  │ Compensar com: €─── [slider]    │ │  ← NOVO (0 a budget)
│  │ Valor total da oferta: €3.2M    │ │  ← marketValue + cash
│  └─────────────────────────────────┘ │
│                                      │
│  [Propor Troca]                      │
└──────────────────────────────────────┘
```

A avaliação da CPU passa a usar `marketValue` no lugar de OVR-delta:
```
valorOferta = offeredPlayer.marketValue + cashOffered
valorAlvo = requestedPlayer.marketValue

se valorOferta >= valorAlvo * 0.85 → aceita
com bônus de reputação (+0.15 na chance) e excedente de posição (+0.15)
```

Mantém o limite de 3 trocas por temporada (`tradesUsedThisSeason`).

#### 2.3.3 Modificar `InboxPanel.tsx` (existente — +25 linhas)

Adicionar botões de ação inline em mensagens do tipo `TRANSFER_OFFER`:

```
┌──────────────────────────────────────┐
│ 📋 Proposta do Arsenal               │
│ O Arsenal oferece €5.8M por Bukayo   │
│ Saka (FWD, OVR 86).                  │
│ Valor de mercado: €5.2M              │
│                                      │
│ [✓ Aceitar Oferta]  [✗ Recusar]     │  ← NOVO: action buttons
└──────────────────────────────────────┘
```

Props do `InboxPanel` ganham:
```typescript
onAcceptTransferOffer?: (messageId: string) => void;
onRejectTransferOffer?: (messageId: string) => void;
```

Ações disparam handlers em `useCareerManager` que atualizam budget, elencos e removem a mensagem.

### 2.4 Novos handlers em `useCareerManager.ts`

| Handler | Descrição | Assinatura |
|---|---|---|
| `handleBuyPlayer` | Compra jogador de clube CPU com dinheiro | `(playerId: string, fromTeamId: string, amount: number) => void` |
| `handleSignFreeAgent` | Contrata agente livre | `(playerId: string, amount: number) => void` |
| `handleAcceptTransferOffer` | Aceita oferta da CPU por um jogador seu | `(inboxMessageId: string) => void` |
| `handleRejectTransferOffer` | Recusa oferta da CPU | `(inboxMessageId: string) => void` |
| `handleProposeTrade` | Modificado — aceita cash opcional | `(offeredPlayerId: string, opponentTeamId: string, requestedPlayerId: string, cashOffered?: number) => { accepted: boolean, reason: string }` |

Fluxo de `handleBuyPlayer`:
```
1. Validar: budget >= amount, janela aberta
2. budget -= amount
3. Remover jogador do time de origem (rosters + season.league.teams + season.cup.teams)
4. Adicionar jogador ao time do usuário (id, number, name preservados)
5. Adicionar TransferRecord ao transferHistory
6. Gerar InboxMessage de confirmação
7. setCareerState → dispara cloud save
```

Fluxo de `handleAcceptTransferOffer`:
```
1. Recuperar dados da oferta do InboxMessage
2. budget += amount
3. Remover jogador do time do usuário
4. Adicionar ao time da CPU ofertante
5. Adicionar TransferRecord (SELL)
6. Remover mensagem do inbox
7. Se o jogador era titular, rebalancear escalação
8. setCareerState
```

### 2.5 Novas regras de budget

```
handleBuyPlayer / handleSignFreeAgent:
  budget -= amount
  wageBill recalculado com novo elenco (computeWageBill)

handleAcceptTransferOffer:
  budget += netSellRevenue(amount)     // 80% de retenção (Board Strictness)
  wageBill recalculado com elenco reduzido

handleProposeTrade com cash:
  budget -= cashOffered (se houver)
  wageBill recalculado após swap

handleNextCareerLeagueRound:
  se jogo em casa → budget += getTicketRevenue(leagueId)

handleCareerBracketMatchResult:
  se jogo em casa → budget += getTicketRevenue(leagueId)

handleAdvanceSeason:
  budget += getLeaguePrizeMoney(leagueId, position)
  budget += getCupPrizeMoney(leagueId, cupResult)
```

### 2.6 Progressão de jogadores

- Jogadores do `freeAgentPool` envelhecem, evoluem/declinam e se aposentam entre temporadas
- Mesma lógica de `progressCareerPlayers` (`career.ts`)
- Jogadores aposentados são substituídos por novos gerados proceduralmente (mantendo a distribuição de posições)
- Ao renovar o pool na janela seguinte, jogadores que envelheceram demais (>38 anos) são removidos e novos são gerados

### 2.7 Arquivos afetados — resumo

| Arquivo | Tipo | O que muda |
|---|---|---|
| `src/services/supabaseClient.ts` | **Novo** | Cliente Supabase + auth anônimo |
| `src/services/cloudSave.ts` | **Novo** | Save/load com fallback localStorage |
| `src/hooks/useCloudSave.ts` | **Novo** | Hook React: debounce, status, retry |
| `src/components/CloudSaveStatus.tsx` | **Novo** | Ícone de status no Hub |
| `src/engine/freeAgentPool.ts` | **Novo** | Geração de agentes livres |
| `src/components/TransferMarketScreen.tsx` | **Novo** | UI de mercado com abas |
| `src/engine/transferMarket.ts` | Modificar | + `evaluateCashTransfer()`, `netSellRevenue()`, `getLeaguePrizeMoney()`, `getCupPrizeMoney()`, `getTicketRevenue()`, constantes `PRIZE_MONEY` e `TICKET_REVENUE_PER_HOME_MATCH` |
| `src/engine/career.ts` | Modificar | + `TransferRecord`, `freeAgentPool` no `CareerState` |
| `src/engine/inbox.ts` | Modificar | + 4 factories de mensagem |
| `src/hooks/useCareerManager.ts` | Modificar | + 4 handlers; modificar `handleProposeTrade`; ofertas CPU; wire cloud save |
| `src/components/CareerHubScreen.tsx` | Modificar | + `<CloudSaveStatus>`; botão "Mercado" |
| `src/components/TradeProposalScreen.tsx` | Modificar | + cash slider; mostrar valores de mercado |
| `src/components/InboxPanel.tsx` | Modificar | + botões inline para `TRANSFER_OFFER` |
| `.env.example` | Modificar | + `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

### 2.8 Ordem de implementação

| Etapa | O que | Tempo |
|---|---|---|
| **E1** | `freeAgentPool.ts` — geração e refresh de agentes livres | 45min |
| **E2** | Tipos novos (`TransferRecord`, `freeAgentPool` no `CareerState`) | 15min |
| **E3** | `evaluateCashTransfer` + **Board Strictness** + **Prize Money** + **Ticket Sales** em `transferMarket.ts` | 1h15 |
| **E4** | Factories de inbox (4 novas) em `inbox.ts` | 30min |
| **E5** | Handlers de compra/venda/oferta + **netSellRevenue nos handlers de venda** + **ticket credit no avançar rodada** + **prize no fim da temporada** em `useCareerManager.ts` | 2h |
| **E6** | Ofertas da CPU (geração ao avançar rodada) | 1h |
| **E7** | `TransferMarketScreen.tsx` — UI completa com abas e slider | 2h |
| **E8** | Modificar `TradeProposalScreen` — cash slider + valores | 45min |
| **E9** | Modificar `InboxPanel` — botões de ação inline | 30min |
| **E10** | Integrar no `CareerHubScreen` (botão "Mercado") | 15min |
| **E11** | Testes (`transferMarket.test.ts`, `freeAgentPool.test.ts`, componentes) | 1h30 |
| **E12** | Atualizar `README.md`, `BACKLOG.md` e `PLANO_FEATURES.md` | 15min |
| **Total Mercado** | | **~11h** |

### 2.9 Estimativa Cloud Save

| Tarefa | Tempo |
|---|---|
| `supabaseClient.ts` + auth anônimo | 45min |
| `cloudSave.ts` + `useCloudSave.ts` | 1h |
| `CloudSaveStatus.tsx` | 30min |
| Integração no `useCareerManager` | 30min |
| Testes (mock do Supabase) | 45min |
| Docs + `.env.example` | 15min |
| **Total Cloud Save** | | **~4h** |

---

## Ordem Global Recomendada

| Ordem | Feature | Tempo | Por que |
|---|---|---|---|
| **1º** | Cloud Save | ~4h | Vitória rápida, baixo risco, protege dados antes de mexer no sistema de trocas |
| **2º** | Mercado c/ Dinheiro | ~11h | Board Strictness + Prize Money + Ticket Sales adicionam ~1h; resto igual |

**Total combinado: ~15 horas**

---

## Decisões em Aberto

| # | Pergunta | Opções | Recomendação |
|---|---|---|---|
| 1 | `TradeProposalScreen`: manter coexistindo ou substituir tudo pelo `TransferMarketScreen`? | Coexistir / Substituir | **Coexistir** — troca 1-por-1 ainda é útil (jogador por jogador com cash opcional); mercado é pra compra direta |
| 2 | Ofertas da CPU: você quer receber propostas dos clubes CPU pelos seus jogadores? | Sim / Não | **Sim** — adiciona dinamismo e faz o inbox ter mais utilidade |
| 3 | Supabase: já tem projeto ou deixo placeholder? | Criar agora / Placeholder | **Criar agora** — é a primeira dependência de backend, vale validar save/load isolado antes de integrar nos checkpoints |
| 4 | Free agent pool: quantos jogadores? | 12 / 18 / 24 | **12-18** — suficiente pra ter opções sem poluir a UI |
