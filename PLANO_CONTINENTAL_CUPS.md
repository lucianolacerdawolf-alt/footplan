# Plano — Competições Continentais

> Data: Julho 2026
> Status: ✅ Concluído em 2026-08-04 (commit `129ac74`) — publicado em produção
> Esforço: ~7-8h
>
> **Entregue com diferenças do plano original:** classificação das outras 11 ligas
> por OVR médio com backfill até 16 (UEL/UECL somam <16 vagas); sem "modo fantasma"
> (não classificou = sem copa naquela temporada); roteamento do resultado por
> discriminador `pendingCareerBracketKind` (copa doméstica e continental compartilham
> `matchContext: 'bracket'`). Bônus: a fiação das 5 conquistas continentais exigiu
> ligar a avaliação de conquistas ao Modo Carreira (que antes não avaliava nenhuma),
> então as conquistas existentes também passaram a destravar na carreira.

---

## Visão Geral

Ao fim de cada temporada, os melhores colocados de cada liga se classificam para 3 competições continentais:
- **Liga dos Campeões** (UCL) — 4 melhores de cada liga top
- **Liga Europa** (UEL) — próximos colocados
- **Liga Conferência** (UECL) — vagas restantes

O time do usuário participa se terminar na zona de classificação. A competição acontece ao longo da temporada seguinte (intercalada com liga e copa doméstica), usando o mesmo formato mata-mata de 16 times do `createBracket` existente. Apenas o time do usuário é jogável; os demais confrontos são simulados.

Referências: Football Manager (Champions League na carreira), FIFA/EA FC (continental cups no Career Mode).

---

## Arquivos novos (2)

| Arquivo | Descrição |
|---|---|
| `src/engine/continentalCups.ts` | Definições das copas, qualificação, geração de bracket, prize money |
| `src/components/ContinentalQualifiedScreen.tsx` | Tela de apresentação da classificação (anúncio no season-end) |

## Arquivos modificados (9)

| Arquivo | O que muda |
|---|---|
| `src/engine/career.ts` | + `continentalCup?: BracketState`, `continentalCupId?: string` no `CareerState.season` |
| `src/engine/transferMarket.ts` | + `getContinentalPrizeMoney()` |
| `src/engine/achievements.ts` | + 5 conquistas continentais |
| `src/hooks/useCareerManager.ts` | + 4 handlers continentais, qualificação no `handleAdvanceSeason` |
| `src/types/navigation.ts` | `'career-continental'` no `Screen` (ou reutilizar `'career-bracket'`) |
| `src/components/AppScreens.tsx` | + screen entry continental |
| `src/components/CareerHubScreen.tsx` | + card "Competição Continental" com status |
| `src/components/BracketScreen.tsx` | Aceitar prop opcional `cupColor`/`cupLogo` para branding |
| `src/components/SeasonEndScreen.tsx` | + anúncio de classificação continental |

---

## Definições das competições

```typescript
// Em continentalCups.ts
export interface ContinentalCupDef {
  id: 'ucl' | 'uel' | 'uecl';
  name: string;              // 'Liga dos Campeões', 'Liga Europa', 'Liga Conferência'
  shortName: string;         // 'UCL', 'UEL', 'UECL'
  logo: string;              // emoji
  color: string;
  totalTeams: 16;
  qualificationKey: 'championsLeague' | 'europaLeague' | 'conferenceLeague';
  prizeMoney: {
    champion: number;
    runnerUp: number;
    semifinal: number;
    quarterfinal: number;
    roundOf16: number;
  };
}

export const CONTINENTAL_CUPS: ContinentalCupDef[] = [
  {
    id: 'ucl', name: 'Liga dos Campeões', shortName: 'UCL',
    logo: '🏆', color: '#1d9bf0', totalTeams: 16,
    qualificationKey: 'championsLeague',
    prizeMoney: {
      champion: 15_000_000, runnerUp: 8_000_000,
      semifinal: 4_000_000, quarterfinal: 2_000_000,
      roundOf16: 1_000_000,
    },
  },
  {
    id: 'uel', name: 'Liga Europa', shortName: 'UEL',
    logo: '🥈', color: '#e85d04', totalTeams: 16,
    qualificationKey: 'europaLeague',
    prizeMoney: {
      champion: 8_000_000, runnerUp: 4_000_000,
      semifinal: 2_000_000, quarterfinal: 1_000_000,
      roundOf16: 500_000,
    },
  },
  {
    id: 'uecl', name: 'Liga Conferência', shortName: 'UECL',
    logo: '🥉', color: '#38a169', totalTeams: 16,
    qualificationKey: 'conferenceLeague',
    prizeMoney: {
      champion: 4_000_000, runnerUp: 2_000_000,
      semifinal: 1_000_000, quarterfinal: 500_000,
      roundOf16: 250_000,
    },
  },
];
```

**Nota**: `LeagueDefinition.europeanSlots` já existe em `src/data/leagues/types.ts` para todas as 12 ligas (ex: PL tem `{ championsLeague: 4, europaLeague: 2, conferenceLeague: 1 }`). Isso define quantos times de cada liga se classificam. Esses dados **não precisam ser alterados** — já estão prontos.

---

## Detalhamento das Etapas

### E1 — `continentalCups.ts` (~1.5h)

```typescript
/**
 * Determina qual copa continental o time do usuário disputa,
 * com base na posição final na liga e nos slots de classificação.
 */
export function determineUserContinentalCup(
  league: LeagueDefinition,
  leaguePosition: number,
): ContinentalCupDef | null {
  const slots = league.europeanSlots;
  if (leaguePosition <= slots.championsLeague) {
    return CONTINENTAL_CUPS.find(c => c.id === 'ucl')!;
  }
  if (leaguePosition <= slots.championsLeague + slots.europaLeague) {
    return CONTINENTAL_CUPS.find(c => c.id === 'uel')!;
  }
  if (leaguePosition <= slots.championsLeague + slots.europaLeague + slots.conferenceLeague) {
    return CONTINENTAL_CUPS.find(c => c.id === 'uecl')!;
  }
  return null; // não classificado
}

/**
 * Coleta os times qualificados para uma copa continental.
 * Estratégia: para cada liga, pega os top N times conforme europeanSlots.
 * Os times das ligas que o usuário não joga são pegos diretamente dos rosters
 * (ordem por OVR médio do time como aproximação da posição final).
 */
export function getQualifiedTeams(
  rosters: Record<string, Team[]>,
  allLeagues: LeagueDefinition[],
  cupDef: ContinentalCupDef,
  rng?: () => number,
): Team[] {
  const qualified: Team[] = [];

  for (const league of allLeagues) {
    const leagueTeams = rosters[league.id] ?? league.teams;
    const slotCount = league.europeanSlots[cupDef.qualificationKey];
    if (slotCount <= 0) continue;

    // Ordena times por OVR médio como proxy da posição na tabela
    const sorted = [...leagueTeams]
      .filter(t => !qualified.some(q => q.id === t.id)) // evita duplicatas
      .sort((a, b) => getAvgOvr(b) - getAvgOvr(a));

    qualified.push(...sorted.slice(0, slotCount));
  }

  return qualified.slice(0, cupDef.totalTeams);
}

/**
 * Cria o bracket mata-mata continental.
 * Reutiliza createBracket() existente — basta passar os 16 times qualificados.
 * O time do usuário (se classificado) é tratado como o "userTeam" do bracket.
 */
export function createContinentalBracket(
  qualifiedTeams: Team[],
  userTeamId: string | null,
  cupDef: ContinentalCupDef,
  rng?: () => number,
): BracketState {
  const userTeam = qualifiedTeams.find(t => t.id === userTeamId);
  const others = qualifiedTeams
    .filter(t => t.id !== userTeamId)
    .slice(0, cupDef.totalTeams - (userTeam ? 1 : 0));

  if (!userTeam) {
    // Usuário não classificado — simulação fantasma (não interage)
    const placeholder = others[0];
    return createBracket(placeholder, others.slice(1), cupDef.name, cupDef.id, rng);
  }

  return createBracket(userTeam, others, cupDef.name, cupDef.id, rng);
}

export function getContinentalPrizeMoney(
  cupId: string,
  stage: 'champion' | 'runner-up' | 'semifinal' | 'quarterfinal' | 'roundOf16',
): number {
  const cup = CONTINENTAL_CUPS.find(c => c.id === cupId);
  if (!cup) return 0;
  return cup.prizeMoney[stage] ?? 0;
}
```

### E2 — Tipos no `CareerState` (~15min)

```typescript
// Em career.ts, interface CareerState, dentro de season:
season: {
  league: LeagueState;
  cup: BracketState;
  tradesUsedThisSeason: number;
  budgetAtSeasonStart?: number;
  userGoalScorers?: Record<string, number>;
  // NOVOS:
  continentalCup?: BracketState;       // bracket da copa continental
  continentalCupId?: string;           // 'ucl' | 'uel' | 'uecl'
  continentalCupDef?: ContinentalCupDef; // referência pra prize money
};
```

### E3 — Qualificação no `handleAdvanceSeason` (~1h)

A qualificação acontece no **fim da temporada N**, e o torneio é disputado **durante a temporada N+1**.

```typescript
// Dentro de handleAdvanceSeason, APÓS progressAllLeagues e ANTES de createCareerSeason:

// Determinar se o usuário classificou
const userCupDef = determineUserContinentalCup(
  getLeague(careerState.leagueId)!, leaguePosition,
);

let continentalBracket: BracketState | undefined;
if (userCupDef) {
  const qualified = getQualifiedTeams(
    evolvedRosters, allLeagues, userCupDef,
  );
  continentalBracket = createContinentalBracket(
    qualified, careerState.season.league.userTeamId, userCupDef,
  );
  objectiveMessages.push(createContinentalQualificationMessage(
    userCupDef.name, date,
  ));
}

// No setCareerState — a copa continental vai junto com a nova temporada:
season: {
  league: nextLeague, cup: nextCup, tradesUsedThisSeason: 0,
  budgetAtSeasonStart: finances.budget, userGoalScorers: {},
  continentalCup: continentalBracket,
  continentalCupId: userCupDef?.id,
  continentalCupDef: userCupDef,
},
```

**Nota sobre times de outras ligas**: Como apenas a liga do usuário tem fixtures e standings computáveis, usamos OVR médio como proxy da posição final das demais ligas. Isso é uma simplificação aceitável — times com OVR mais alto tendem a terminar no topo. Se o usuário jogar em uma segunda divisão e terminar em posição de classificação, ele também se qualifica (os slots existem no `LeagueDefinition` de cada liga).

### E4 — Handlers de partida continental (~1h)

No `useCareerManager.ts`, 4 novos handlers (análogos aos de copa doméstica):

```typescript
handlePlayContinentalMatch(match, home, away) {
  // Guard: continentalCup precisa existir e não estar em 'champion'
  // setPending + cloneTeam + setHomeTeam/setAwayTeam
  // setMatchContext('bracket'), setIsKnockout(true)
  // saveLiveMatchMeta({ matchContext: 'bracket', ... })
  // setScreen('setup')
}

handleSimulateContinentalMatch(stage, matchIdx) {
  // Quick-sim: simularBracketMatch(home, away)
  // atualiza continentalCup com o resultado
}

handleSimulateOtherContinentalMatches() {
  // Simula todos os jogos da fase atual exceto o do usuário
}

handleContinentalMatchResult(result) {
  // Grava resultado no continentalCup
  // advanceBracket se a fase terminou
  // Se stage === 'champion', verifica championId
}
```

**Integração no CareerHub**: A lógica de `determineNextMatch` precisa considerar a copa continental. Ordem de prioridade:
1. Jogo da continental pendente → mostrar primeiro
2. Jogo da copa doméstica pendente
3. Jogo da liga pendente

### E5 — UI (~1.5h)

**CareerHubScreen — card continental:**

Entre o card de objetivos e o card de próxima partida:

```tsx
{(() => {
  const cc = state.season.continentalCup;
  const ccDef = state.season.continentalCupDef;
  if (!cc || !ccDef) return null;
  const stageLabel = cc.stage === 'champion'
    ? (cc.championId === state.season.league.userTeamId ? '🏆 Campeão!' : 'Eliminado')
    : CUP_STAGE_LABELS[cc.stage] ?? cc.stage;
  return (
    <div className={styles.continentalCard}
         style={{ borderColor: ccDef.color + '44', background: ccDef.color + '11' }}>
      <span>{ccDef.logo} {ccDef.shortName}</span>
      <span>{stageLabel}</span>
      <button onClick={() => setScreen('career-continental')}>Ver Bracket</button>
    </div>
  );
})()}
```

**AppScreens.tsx — tela continental:**

Reutilizar `BracketScreen` com uma pequena adaptação. A tela `'career-continental'` passa o `continentalCup` como `state` e os handlers continentais:

```typescript
'career-continental': (p) => {
  if (!p.careerState?.season.continentalCup || !p.careerState?.season.continentalCupDef) return null;
  return (
    <BracketScreen
      state={p.careerState.season.continentalCup}
      cupColor={p.careerState.season.continentalCupDef.color}
      onPlayMatch={/* handlePlayContinentalMatch */}
      onSimulateMatch={/* handleSimulateContinentalMatch */}
      onSimulateOthers={/* handleSimulateOtherContinentalMatches */}
      onEditTactics={/* handleEditCareerLeagueTactics */}
      onBack={() => p.setScreen('career-hub')}
      hideTopNav
    />
  );
},
```

**BracketScreen — prop nova opcional:**

```typescript
interface Props {
  // ... existentes
  cupColor?: string;  // cor do header/card da copa (azul UCL, laranja UEL, verde UECL)
}
```

Usado para tingir o banner superior do bracket com a cor da competição, diferenciando visualmente da copa doméstica.

**SeasonEndScreen — anúncio de classificação:**

Adicionar uma seção condicional: se o usuário se classificou pra uma copa continental, mostrar um card de celebração:

```tsx
{continentalCupDef && (
  <div className={styles.continentalQualified}>
    <span>🌟 Classificado para {continentalCupDef.name}!</span>
    <span>A competição começa na próxima temporada.</span>
  </div>
)}
```

### E6 — Prize money (~30min)

```typescript
// Em transferMarket.ts:
export function getContinentalPrizeMoney(
  cupId: string,
  result: 'champion' | 'runner-up' | 'semifinal' | 'quarterfinal' | 'roundOf16',
): number {
  const cup = CONTINENTAL_CUPS.find(c => c.id === cupId);
  if (!cup) return 0;
  return cup.prizeMoney[result] ?? 0;
}
```

Creditado no orçamento ao fim da temporada (junto com liga + copa doméstica), dentro do `handleAdvanceSeason`:

```typescript
// Após determinar o resultado da copa continental:
const continentalPrize = state.season.continentalCup && state.season.continentalCupId
  ? (() => {
      const cc = state.season.continentalCup!;
      let result: 'champion' | 'runner-up' | 'semifinal' | 'quarterfinal' | 'roundOf16';
      if (cc.championId === state.season.league.userTeamId) result = 'champion';
      else if (cc.final.homeTeamId === userTeamId || cc.final.awayTeamId === userTeamId) result = 'runner-up';
      else if (cc.semiFinals.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId)) result = 'semifinal';
      else if (cc.quarterFinals.some(m => m.homeTeamId === userTeamId || m.awayTeamId === userTeamId)) result = 'quarterfinal';
      else result = 'roundOf16';
      return getContinentalPrizeMoney(state.season.continentalCupId!, result);
    })()
  : 0;

// financiado:
finances.budget += continentalPrize;
```

### E7 — Achievements continentais (~1h)

5 novas conquistas em `src/engine/achievements.ts`:

```typescript
{
  id: 'continental_champion',
  name: 'Rei da Europa',
  description: 'Vença a Liga dos Campeões',
  icon: '🏆',
  hint: 'Vencer a UCL no Modo Carreira',
  // condition: matchContext === 'bracket' && continentalCupId === 'ucl'
  //   && bracketState.stage === 'champion' && bracketState.championId === userTeamId
},
{
  id: 'europa_king',
  name: 'Conquistador',
  description: 'Vença a Liga Europa',
  icon: '🥈',
  hint: 'Vencer a UEL no Modo Carreira',
},
{
  id: 'conference_king',
  name: 'Gigante das Copas',
  description: 'Vença a Liga Conferência',
  icon: '🥉',
  hint: 'Vencer a UECL no Modo Carreira',
},
{
  id: 'treble_winner',
  name: 'Tríplice Coroa',
  description: 'Vença liga, copa doméstica e Champions League na mesma temporada',
  icon: '👑',
  hint: 'Vencer os 3 troféus na mesma temporada do Modo Carreira',
},
{
  id: 'continental_participant',
  name: 'No Mapa da Europa',
  description: 'Classifique-se para uma competição continental',
  icon: '🌍',
  hint: 'Terminar na zona de classificação da sua liga',
},
```

**Avaliação**: O `evaluateAchievements` existente recebe `AchievementEvalInput` que tem `matchContext`, `result`, `userTeamId`. Para conquistas continentais, precisamos adicionar um campo opcional `continentalState?: BracketState` ao input e verificar as condições correspondentes.

### E8 — Navegação (~30min)

- Adicionar `'career-continental'` ao `Screen` em `navigation.ts`
- Entry no `screenMap` em `AppScreens.tsx` (reutiliza `BracketScreen`)
- `CareerTabBar`: mapear `'career-continental'` → `'escritorio'` (mesma aba que liga/copa)
- `CAREER_TAB_SCREENS`: adicionar `'career-continental'` para mostrar a barra de abas

---

## Fluxo completo de uma temporada com continental

```
Temporada N
  ├── Liga (38 rodadas)
  ├── Copa doméstica (4 fases de mata-mata)
  └── Fim da temporada
        ├── Computa standings
        ├── Determina classificação continental
        ├── Gera bracket continental para temporada N+1
        └── Avança para temporada N+1

Temporada N+1
  ├── Liga (38 rodadas)
  ├── Copa doméstica (4 fases de mata-mata)
  ├── Copa continental (4 fases de mata-mata) ← NOVO
  │     ├── Oitavas (8 jogos)
  │     ├── Quartas (4 jogos)
  │     ├── Semis (2 jogos)
  │     └── Final
  └── Fim da temporada
        ├── Prize money da continental creditado
        ├── Conquistas continentais avaliadas
        └── Se classificado de novo, gera novo bracket
```

**Ordem de prioridade no CareerHub durante a temporada N+1:**
1. Se continental tem jogo pendente → "🏆 UCL · Oitavas · Seu Time vs Real Madrid [Jogar]"
2. Senão, se copa doméstica tem jogo → "🏆 Copa · Quartas · ..."
3. Senão, próximo jogo da liga → "📅 Liga · Rodada 12 · ..."

---

## Estimativa por etapa

| Etapa | O que | Tempo |
|---|---|---|
| E1 | `continentalCups.ts` — definições, qualificação, bracket | 1h30 |
| E2 | Tipos no `CareerState` | 15min |
| E3 | Qualificação no `handleAdvanceSeason` | 1h |
| E4 | Handlers de partida continental | 1h |
| E5 | UI (CareerHub + BracketScreen + SeasonEnd) | 1h30 |
| E6 | Prize money | 30min |
| E7 | Achievements continentais | 1h |
| E8 | Navegação e integração | 30min |
| **Total** | | **~7-8h** |

---

## Riscos e simplificações

- **Times de outras ligas**: Como só a liga do usuário tem fixtures/standings reais, a qualificação de times de outras ligas usa OVR médio como proxy da posição final. Isso é aceitável para uma primeira versão. Uma melhoria futura seria simular rapidamente as 11 ligas não-jogadas.
- **Usuário não classificado**: Se o time do usuário não se classificar, a competição continental acontece em "modo fantasma" — os jogos são simulados, o bracket avança, mas o usuário não interage. Ele recebe notícias no inbox sobre o campeão.
- **Bracket de 16 times**: `createBracket` existente espera exatamente 16 times (oitavas → quartas → semis → final). Funciona perfeitamente para o caso continental.
- **Conflito com copa doméstica**: Ambas usam `matchContext === 'bracket'`. O sistema atual já diferencia copa doméstica de continental pelo `BracketState` passado — o `matchContext` é o mesmo, mas os handlers salvam no campo correto (`season.cup` vs `season.continentalCup`).
- **Empate na classificação**: Se 2+ times de ligas diferentes têm o mesmo OVR médio e competem pela última vaga, o desempate é por ordem alfabética (fallback do `sort`). Baixíssimo impacto real.
- **Elenco cansa com 3 competições**: O sistema de fatigue já existe e funciona entre partidas. Jogar liga + copa + continental naturalmente força rotação do elenco, que é um aspecto positivo de realismo.
