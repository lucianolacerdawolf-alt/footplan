# football-proxy — Cloudflare Worker

Resolve o bloqueio de CORS da API da football-data.org (ela devolve
`Access-Control-Allow-Origin: http://localhost` sem porta, o que o navegador rejeita tanto
em `localhost:5173` quanto em produção — confirmado testando com `curl` direto). Esse worker
faz a chamada servidor-a-servidor (sem CORS envolvido) e devolve pro FootPlan já liberado.
Também mantém sua chave da API fora do bundle JS público do site.

## Deploy

Precisa de uma conta Cloudflare gratuita.

```bash
npx wrangler login
npx wrangler secret put FOOTBALL_API_KEY
# cola sua chave da football-data.org quando pedir
npx wrangler deploy
```

O comando final imprime a URL do worker, algo como:

```
https://footplan-football-proxy.SEU-USUARIO.workers.dev
```

## Conectar ao FootPlan

Cole essa URL em `VITE_FOOTBALL_PROXY_URL` no `.env` (local) e nas variáveis de ambiente
do build de produção (ex: GitHub Actions secrets, se o deploy for automatizado).

## Testar localmente

```bash
cp .dev.vars.example .dev.vars
# edita .dev.vars com sua chave
npx wrangler dev
```

## Domínios liberados

Por padrão o worker só libera `http://localhost:5173` e
`https://lucianolacerdawolf-alt.github.io` (ver `ALLOWED_ORIGINS` em `football-proxy.js`).
Se o FootPlan for publicado em outro domínio, adicione-o na lista.
