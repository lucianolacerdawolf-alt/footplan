# Guia de Produção — FootPlan

Checklist pra colocar o jogo no ar com segurança. Os itens de código (aviso de save,
telemetria de crash, rate limit do worker, robots.txt, versão na UI) já estão
implementados — este guia cobre só o que depende de infra externa.

---

## 1. Supabase

**Projeto de produção (desde 2026-11-17):** `dqilznggmhgtonnccsws` ("FootPlan", us-east-1),
em conta própria do jogo. O projeto antigo (`avpxvmiausfqyscomocg`) foi aposentado.
Ele tinha uma política `write global snapshot` aberta a qualquer usuário autenticado;
o script de hardening nunca rodou porque lia uma coluna errada (`policy_name`).

Estado verificado em 2026-11-17: tabelas `careers` e `roster_snapshots` criadas por
[`scripts/sql/setup-supabase.sql`](scripts/sql/setup-supabase.sql), RLS só com
"own career" (authenticated) + leitura pública do snapshot. Escrita anônima no snapshot
testada e bloqueada. Snapshot das 12 ligas copiado do projeto antigo.

**Pré-requisito no painel:** Authentication > Sign In / Providers > *Allow anonymous
sign-ins* ligado. Sem isso o app não loga e o cloud save fica sempre "offline".

Projeto novo do zero? Rode `setup-supabase.sql` no SQL Editor, ligue o anônimo e popule
os elencos com `npm run rosters:copy -- --export/--import` (copia de outro projeto) ou:

```bash
# no .env local (SEM prefixo VITE_ — nunca vai pro bundle do browser)
SUPABASE_SERVICE_ROLE_KEY=...
npm run rosters:sync
```

**Sync automático (desde 2026-11-17):** tarefa do Agendador de Tarefas do Windows
"FootPlan - Sync de elencos", diária às 10:00 (roda assim que o PC ligar se estava
desligado; só com o usuário logado). Chama [`scripts/scheduled-roster-sync.cmd`](scripts/scheduled-roster-sync.cmd),
que roda `npm run rosters:sync` e anexa a saída em `logs/roster-sync.log` (gitignorado).
Liga que falhar mantém o elenco que já estava no snapshot, então rodar todo dia é seguro.

```powershell
Start-ScheduledTask -TaskName 'FootPlan - Sync de elencos'      # rodar agora
Get-ScheduledTaskInfo -TaskName 'FootPlan - Sync de elencos'    # último resultado / próxima
Unregister-ScheduledTask -TaskName 'FootPlan - Sync de elencos' # remover
```

> Não dispare o sync duas vezes no mesmo minuto: a football-data.org tem limite de
> 10 req/min e a segunda rodada perde as ligas dela (ficam com o elenco anterior).

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
npm run android:aab
```

**Pré-requisitos verificados em 2026-11-17:**
- **Android SDK:** não está instalado nesta máquina (`ANDROID_HOME` aponta pra
  `C:\Users\lucia\AppData\Local\Android\Sdk`, que não existe). Instale o Android Studio
  (traz o SDK) ou só o command-line tools, e confira que a pasta existe.
- **Java:** o Gradle 8.14 do projeto roda até o Java 24, e o Java padrão da máquina é o 27
  (falha). Antes do build, aponte pro JDK 21 que já está instalado:
  `$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.12'` (PowerShell).
- O resto (`build:native` + `cap sync`) foi testado e funciona.

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

1. Confira que o login anônimo está ligado no Supabase (seção 1)
2. `SUPABASE_SERVICE_ROLE_KEY=... npm run rosters:sync` (confira as 12 ligas ao vivo)
3. `npx wrangler deploy` (rate limit ativo)
4. Suba o PeerServer e rebuild do site com `VITE_PEER_*` (seção 3)
5. `npm run deploy` (Pages) + APK/AAB assinado (seção 4)
