# Plano — Youth Academy / Categorias de Base

> Data: Julho 2026
> Status: ⬜ Pendente
> Esforço: ~4-5h

---

## Visão Geral

O jogador recebe anualmente uma leva de jovens (15-17 anos, OVR 40-65) nas categorias de base. Eles evoluem por 2-3 temporadas no time sub-20 e, quando atingem OVR mínimo (55) e idade mínima (18), podem ser promovidos ao elenco principal. A captação acontece uma vez por temporada durante o avanço de temporada.

Referências: Football Manager (youth intake anual), Brasfoot (categorias de base), FIFA Career (youth academy + potencial dinâmico).

---

## Arquivos novos (3)

| Arquivo | Descrição |
|---|---|
| `src/engine/youthPool.ts` | Geração/refresh do pool de jovens + função de promoção |
| `src/components/YouthAcademyScreen.tsx` | Tela de visualização e gestão da base |
| `src/components/YouthAcademyScreen.module.css` | Estilos da tela |

## Arquivos modificados (7)

| Arquivo | O que muda |
|---|---|
| `src/engine/career.ts` | + `youthPool?: Player[]` no `CareerState`, + `getYouthPool()` helper |
| `src/engine/inbox.ts` | + `createYouthIntakeMessage()`, `createYouthGraduateMessage()` |
| `src/hooks/useCareerManager.ts` | Gerar youth intake no `handleAdvanceSeason`, + `handlePromoteYouthPlayer` |
| `src/types/navigation.ts` | + `'career-youth-academy'` no `Screen` |
| `src/components/AppScreens.tsx` | + screen entry `'career-youth-academy'` |
| `src/components/CareerHubScreen.tsx` | + card "Categorias de Base" com contador e botão |
| `src/components/CareerHubScreen.module.css` | + estilos do card de base |

---

## Detalhamento das Etapas

### E1 — `youthPool.ts` (~1h)

```typescript
// Constantes
const YOUTH_MIN_OVR = 40;
const YOUTH_MAX_OVR = 65;
const YOUTH_MIN_AGE = 15;
const YOUTH_MAX_AGE = 17;
const GRADUATION_MIN_AGE = 18;
const GRADUATION_MIN_OVR = 55;
const INTAKE_SIZE_MIN = 3;
const INTAKE_SIZE_MAX = 5;
const POSITION_QUOTAS: Record<Position, number> = { GK: 1, DEF: 2, MID: 1, FWD: 1 };

export function generateYouthPlayer(
  id: string, name: string, position: Position, rng?: () => number
): Player

export function generateYouthIntake(userTeamId: string, count?: number, rng?: () => number): Player[]
  // Gera 3-5 jovens respeitando quotas de posição
  // Usa generateRandomName() e generatePlayer() existentes

export function refreshYouthPool(
  existing: Player[], seasonYear: number, rng?: () => number
): { remaining: Player[]; graduates: Player[] }
  // 1. progressPlayer() em todos
  // 2. Remove aposentados (shouldRetire)
  // 3. Jogadores com age >= 18 e OVR >= 55 → graduados (promotable)
  // 4. Retorna os que ficam + os que podem ser promovidos

export function promoteYouthPlayer(youthPlayer: Player, team: Team): Team
  // Atribui número de camisa (maior número + 1)
  // Adiciona ao final do squad como reserva
  // Retorna novo Team
```

**Nota**: `generateYouthPlayer` reaproveita 100% do `generatePlayer` existente em `src/data/leagues/generateTeam.ts`. A única diferença é o range de idade (15-17) e OVR (40-65).

**Pattern**: O `youthPool` segue exatamente o mesmo padrão do `freeAgentPool`:
```typescript
// Em freeAgentPool.ts (referência):
export function generateFreeAgentPool(rng?): Player[]
export function refreshFreeAgentPool(existing, seasonYear, rng?): Player[]
```

### E2 — Tipos no `CareerState` (~15min)

```typescript
// Em career.ts, junto com freeAgentPool:
youthPool?: Player[];  // jovens nas categorias de base (16-18 anos, OVR 40-65)

// Getter (mesmo padrão de getFreeAgentPool, getTransferHistory, etc.):
export function getYouthPool(state: CareerState): Player[] {
  return state.youthPool ?? [];
}
```

### E3 — Inbox messages (~15min)

```typescript
// Em inbox.ts:
export function createYouthIntakeMessage(
  names: string[], count: number, date: string
): InboxMessage {
  // type: 'BOARD_UPDATE', isMandatory: false
  // subject: '🌟 Captação da Base — N jovens'
  // body: lista de nomes + "Acesse as Categorias de Base para acompanhar."
}

export function createYouthGraduateMessage(
  names: string[], count: number, date: string
): InboxMessage {
  // type: 'BOARD_UPDATE', isMandatory: false
  // subject: '🎓 Promoção da Base — N jovens'
  // body: "Os seguintes jovens foram promovidos ao elenco profissional: ..."
}
```

### E4 — Integração no `handleAdvanceSeason` (~30min)

Ponto de inserção: dentro do `setCareerState(...)` em `handleAdvanceSeason`, junto com `refreshFreeAgentPool`.

```typescript
// Gera intake + processa pool existente
const prevYouth = getYouthPool(careerState);
const intake = generateYouthIntake(careerState.season.league.userTeamId);
const { remaining: progressedYouth, graduates } = refreshYouthPool(
  prevYouth, careerState.currentSeasonYear + 1
);
const newYouthPool = [...progressedYouth, ...intake];

// Graduados viram profissionais
let updatedEvolvedUserTeam = evolvedUserTeam;
for (const grad of graduates) {
  updatedEvolvedUserTeam = promoteYouthPlayer(grad, updatedEvolvedUserTeam);
}

// Mensagens
objectiveMessages.push(createYouthIntakeMessage(intake.map(p => p.name), intake.length, date));
if (graduates.length > 0) {
  objectiveMessages.push(createYouthGraduateMessage(graduates.map(g => g.name), graduates.length, date));
}

// No setCareerState:
// youthPool: newYouthPool,
// finances: { ...finances, wageBill: computeWageBill(updatedEvolvedUserTeam) },
```

### E5 — YouthAcademyScreen (~1.5h)

**Layout da tela:**

```
┌──────────────────────────────────────────┐
│  ← Voltar            🌱 Categorias de Base │
├──────────────────────────────────────────┤
│                                          │
│  📊 Captação da temporada: 4 jovens      │
│  Próxima captação: fim da temporada      │
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ #10 | Neymar Jr   | FWD | 17a | 58  ││
│  │ Vel 72 · Sta 65 · Fin 68 · Dri 70   ││
│  │ [████████░░] Potencial               ││  [Promover]
│  ├──────────────────────────────────────┤│
│  │ #1  | Alisson     | GK  | 16a | 52  ││
│  │ Ref 68 · Pos 72 · Han 60 · Agi 55   ││
│  │ [██████████] Potencial               ││  (min 18a + 55 OVR)
│  ├──────────────────────────────────────┤│
│  │ #6  | Vini Jr     | DEF | 18a | 61  ││
│  │ Vel 65 · Des 70 · Mar 68 · Pos 66   ││
│  │ [██████░░░░] Potencial               ││  [Promover ✓]
│  └──────────────────────────────────────┘│
│                                          │
│  ℹ️ Jogadores podem ser promovidos       │
│     com 18+ anos e OVR 55+              │
│                                          │
│  Vaga no elenco: 23/25 jogadores        │
└──────────────────────────────────────────┘
```

**Lógica de cada card de jogador:**
- Nome, número, posição, idade, OVR
- 4 atributos mais relevantes por posição (GK: reflexo/posicionamento; DEF: desarme/posicionamento; MID: passe/visão; FWD: finalização/velocidade)
- Barra de "potencial" visual (OVR atual / OVR projetado aos 25 anos — cálculo: `ovrAtual + (25 - idade) * 2`, clampado em 85)
- Botão "Promover" habilitado quando `age >= 18 && playerOvr(p) >= 55`
- Promoção requer clique de confirmação (modal/toast: "Promover Neymar Jr ao elenco profissional?")

**Props:**
```typescript
interface Props {
  youthPlayers: Player[];
  team: Team;  // time do usuário (pra checar vagas e atribuir número)
  onPromote: (playerId: string) => void;
  onBack: () => void;
}
```

### E6 — Navegação e integração no CareerHub (~30min)

**AppScreens.tsx:**
```typescript
'career-youth-academy': (p) => {
  if (!p.careerState) return null;
  const userTeam = p.careerState.rosters[p.careerState.leagueId]
    .find(t => t.id === p.careerState!.season.league.userTeamId)!;
  return (
    <YouthAcademyScreen
      youthPlayers={getYouthPool(p.careerState)}
      team={userTeam}
      onPromote={(playerId) => { /* dispatch to career manager */ }}
      onBack={() => p.setScreen('career-hub')}
    />
  );
},
```

**useCareerManager.ts — novo handler:**
```typescript
const handlePromoteYouthPlayer = useCallback((playerId: string) => {
  if (!careerState) return;
  const youthPool = getYouthPool(careerState);
  const youthPlayer = youthPool.find(p => p.id === playerId);
  if (!youthPlayer) return;
  const userTeam = careerState.rosters[careerState.leagueId]
    .find(t => t.id === careerState.season.league.userTeamId)!;
  const updatedTeam = promoteYouthPlayer(youthPlayer, userTeam);
  const remainingYouth = youthPool.filter(p => p.id !== playerId);

  setCareerState({
    ...careerState,
    youthPool: remainingYouth,
    rosters: {
      ...careerState.rosters,
      [careerState.leagueId]: careerState.rosters[careerState.leagueId]
        .map(t => t.id === userTeam.id ? updatedTeam : t),
    },
    finances: careerState.finances
      ? { ...careerState.finances, wageBill: computeWageBill(updatedTeam) }
      : careerState.finances,
  });
  setToastMsg(`✅ ${youthPlayer.name} promovido ao elenco profissional!`);
}, [careerState, setCareerState, setToastMsg]);
```

**CareerHubScreen — card de atalho:**

Entre o card de Objetivos da Diretoria e o card de Próxima Partida:

```tsx
{(() => {
  const youthCount = getYouthPool(state).length;
  if (youthCount > 0) {
    return (
      <div className={styles.youthCard} onClick={() => onViewYouth?.()}>
        <span className={styles.youthIcon}>🌱</span>
        <div>
          <span className={styles.youthCount}>{youthCount} jovem{youthCount > 1 ? 'ns' : ''} na base</span>
          <span className={styles.youthSub}>Ver categorias de base →</span>
        </div>
      </div>
    );
  }
  return null;
})()}
```

### E7 — (Opcional) Aba dedicada na CareerTabBar (~30min)

Se houver espaço e desejo de acesso rápido, adicionar como 6ª aba:

```typescript
// CareerTab:
export type CareerTab = 'central' | 'elenco' | 'transferencias' | 'meu-clube' | 'escritorio' | 'base';

// TAB_LABELS:
{ id: 'base', icon: '🌱', label: 'Base' },

// SCREEN_TO_TAB:
'career-youth-academy': 'base',

// CAREER_TAB_SCREENS:
new Set([..., 'career-youth-academy']),
```

---

## Estimativa por etapa

| Etapa | O que | Tempo |
|---|---|---|
| E1 | `youthPool.ts` — geração, refresh, promoção | 1h |
| E2 | Tipos no `CareerState` | 15min |
| E3 | Inbox messages | 15min |
| E4 | Integração `handleAdvanceSeason` | 30min |
| E5 | `YouthAcademyScreen` | 1h30 |
| E6 | Navegação + CareerHub | 30min |
| E7 | (Opcional) CareerTabBar | 30min |
| **Total** | | **~4-5h** |

---

## Riscos e simplificações

- **Players sem idade**: Carreiras antigas podem ter jogadores sem `.age`. O `progressPlayer` já trata isso (default 26 anos). Youth players sempre são gerados com `.age` explícito — sem risco.
- **Vagas no elenco**: Se o time já tem 25+ jogadores, a promoção deve ser bloqueada com mensagem "Elenco cheio. Venda ou libere um jogador antes de promover."
- **OVR inflado**: Como youth players usam `generatePlayer` (que já aplica a calibração -10%), o OVR será consistente com o resto do elenco.
- **Nome duplicado**: `generateRandomName()` pode gerar nomes repetidos. Baixo impacto (IDs são únicos).
- **Captação sem base**: Se é a primeira temporada e não há youthPool, `getYouthPool` retorna `[]`. A primeira intake gera os primeiros jovens — sem risco.
