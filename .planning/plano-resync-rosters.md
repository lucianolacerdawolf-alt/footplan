# Re-sincronizar elencos das 12 ligas no Supabase

**Criado:** 2026-08-03 · **Ação:** rodar script único · **Duração:** ~1-3 min
**Motivo:** as 5 segundas divisões (laliga2, bundesliga2, serieB, ligue2, ligaPortugal2) entraram no snapshot como elencos **estáticos** porque a API-Football estourou o limite diário (100 req/dia) durante o sync inicial. O plano é rodar de novo quando o limite resetar.

---

## Contexto

- Snapshot global em `roster_snapshots` (id = `'global'`) já existe no Supabase com as **12 ligas**.
- 7 ligas vieram ao vivo (football-data.org): pl, laliga, ligue1, serieA, bundesliga, championship, ligaPortugal.
- 5 vieram estáticas (API-Football): laliga2, bundesliga2, serieB, ligue2, ligaPortugal2 (429 de limite diário; `laliga2` deu 403).
- Infra pronta: `scripts/populate-rosters.ts`, `scripts/read-rosters.ts`, `npm run rosters:sync`.

## Passo 1 — Rodar o sync

```bash
npm run rosters:sync
```

O script: busca as 12 ligas ao vivo → grava cache local de cada uma → sobrescreve o snapshot no Supabase (`roster_snapshots`, id global). Sem interação com a UI.

## Passo 2 — Conferir que as 5 ligas entraram ao vivo

```bash
npx vite-node scripts/read-rosters.ts
```

Sucesso = as 5 ligas (laliga2, bundesliga2, serieB, ligue2, ligaPortugal2) mostram jogadores reais (ex: nomes de atletas conhecidos), não os sintéticos gerados pelo `generatePlayer`.

## Passo 3 — Tratamento de casos

| Sintoma | Ação |
|---|---|
| 429 na API-Football de novo | Esperar resetar o limite diário e rodar de novo |
| 403 em `laliga2` (persistente) | Restrição da conta nessa competição — registrar em `BACKLOG.md` e seguir (elencos estáticos são aceitáveis) |
| Tudo `live` | Done — nenhum código muda; o app já lê do Supabase |

## Critério de aceite

- `read-rosters.ts` lista 12 ligas com jogadores reais nas 7 já vivas **e** nas 5 segundas divisões.
- `updatedAt` no snapshot é a data/hora do sync de hoje.
- Build e lint seguem verdes (nenhum código mudou — só dado).

## Notas

- Scripts de apoio ficam em `scripts/` (não são commit crítico; podem ser mantidos).
- Se não quiser manter os scripts, o botão **"Atualizar Elencos via API"** na Central de Carreira faz a mesma coisa pela UI (com a sessão do usuário real).
