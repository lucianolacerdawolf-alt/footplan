# Guia de Produção — FootPlan

Checklist pra colocar o jogo no ar com segurança. Os itens de código (aviso de save,
telemetria de crash, rate limit do worker, robots.txt, versão na UI) já estão
implementados — este guia cobre só o que depende de infra externa.

---

## 1. Supabase — fechar o RLS do snapshot de elencos (segurança)

**Problema:** a instalação original deixa qualquer usuário autenticado (inclusive
auth anônimo) **escrever** na linha global de `roster_snapshots`. Publicado, qualquer
um pode corromper o elenco de todos os jogadores.

**Fix (1 minuto):** abra o SQL Editor do Supabase e rode
[`scripts/sql/harden-rls-roster-snapshots.sql`](scripts/sql/harden-rls-roster-snapshots.sql).
O script é idempotente: remove toda política de write e mantém só a de leitura
aberta. A `careers` já usa o modelo certo ("own career") — não mexa.

Depois disso, **publicar** o snapshot passa a exigir a service role key:

```bash
# no .env local (SEM prefixo VITE_ — nunca vai pro bundle do browser)
SUPABASE_SERVICE_ROLE_KEY=...
npm run rosters:sync
```

O botão "Atualizar Elencos" dentro do jogo continua funcionando pro usuário final:
atualiza o cache **local** dele; só a publicação global vira operação de admin.

> Aproveite e rode o sync antes do lançamento: as 5 segundas divisões estão com
> elencos estáticos (limite diário da API-Football estourou em 2026-08-03).

---

## 2. Worker proxy — secrets + rate limit

O rate limit por IP (20 req/min) **já está no código** (`worker/football-proxy.js`) —
vale no próximo `npx wrangler deploy`. Pra completar:

```bash
npx wrangler secret put FOOTBALL_API_KEY
npx wrangler secret put RAPIDAPI_KEY
npx wrangler deploy
```

Se um dia 20/min por IP não bastar (abuso coordenado distribuído), o upgrade é o
binding `ratelimits` do Cloudflare (grátis): declarar `[[ratelimits]]` no
`wrangler.toml` e trocar o Map em memória por `env.RATE_LIMITER.limit({ key: ip })`.

---

## 3. Multiplayer — PeerServer próprio

Sem config, o jogo usa o broker público da PeerJS (`0.peerjs.com`), que não tem SLA
e pode throttlar justo quando o jogo bombar. Pra produção:

```bash
# opção A — VPS/barato (Render, Fly.io, Railway):
npx peer-server --port 9000 --path /
# opção B — docker:
docker run -p 9000:9000 peerjs/peerjs-server
```

Exponha atrás de HTTPS (o próprio hosting acima dá TLS) e configure no build do site:

```bash
VITE_PEER_HOST=seu-peer.example.com
VITE_PEER_PORT=443
VITE_PEER_PATH=/
VITE_PEER_SECURE=true
```

O código já lê essas vars (`usePeerConnection.ts`); sem elas, cai no broker público.

> O pareamento (sinalização) passa pelo seu servidor; o tráfego de jogo continua
> P2P. Em redes muito restritivas (NAT simétrico corporativo) o WebRTC pode falhar
> mesmo com broker próprio — o remédio é um TURN (ex: openrelay.metered.ca ou
> coturn próprio), configurável via `config.iceServers` se um dia virar queixa real.

---

## 4. Android / Play Store

O script atual gera APK **debug** — a Play Store não aceita. Passos:

```bash
# 1) keystore de release (GUARDE O ARQUIVO E AS SENHAS — perder = nunca mais atualizar o app)
keytool -genkey -v -keystore footplan-release.keystore -alias footplan \
  -keyalg RSA -keysize 2048 -validity 10000

# 2) android/keystore.properties (gitignore já cobre):
storeFile=../footplan-release.keystore
storePassword=...
keyAlias=footplan
keyPassword=...

# 3) AAB pra Play Store (o build.gradle já assina release se o properties existir):
cd android && gradlew bundleRelease
```

O `build.gradle` foi preparado: sem `keystore.properties` nada muda (debug continua
funcionando); com ele, o release sai assinado.

**Obrigatório na Play Store:** URL de política de privacidade. O app não coleta dado
pessoal nenhum (save é local; cloud save usa auth anônimo do Supabase), mas o
formulário de publicação exige a URL mesmo assim — uma página estática simples no
próprio site resolve.

A cada release: bump de `versionCode`/`versionName` em `android/app/build.gradle`.

---

## 5. Visibilidade de crash (já no código)

- `ErrorBoundary` mostra a versão + link de issue pro usuário.
- Último crash persistido em `fp:lastCrash` (mensagem + versão + data) — se um
  usuário reportar bug, peça pra abrir o DevTools e ler essa chave.
- Erros globais (`error` / `unhandledrejection`) logados com a versão no console.

---

## Ordem sugerida no dia do lançamento

1. Rode o SQL de RLS (seção 1)
2. `SUPABASE_SERVICE_ROLE_KEY=... npm run rosters:sync` (confira as 12 ligas ao vivo)
3. `npx wrangler deploy` (rate limit ativo)
4. Suba o PeerServer e rebuild do site com `VITE_PEER_*` (seção 3)
5. `npm run deploy` (Pages) + APK/AAB assinado (seção 4)
