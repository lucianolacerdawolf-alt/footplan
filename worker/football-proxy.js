// =============================================================================
// PROXY — Cloudflare Worker pra football-data.org + RapidAPI (SportAPI7/API-Football)
// =============================================================================
// Por quê: a API da football-data.org devolve `Access-Control-Allow-Origin: http://localhost`
// (sem porta), então o navegador bloqueia chamadas diretas do Vite (localhost:5173) e do
// GitHub Pages por CORS — confirmado testando com curl direto, o problema não é código.
// A RapidAPI (SportAPI7, API-Football) nem tem esse problema de CORS, mas chamar ela direto
// do navegador expõe a chave no bundle JS público (qualquer um abre o devtools e extrai) —
// mesmo risco, resolvido do mesmo jeito. Esse worker resolve os dois problemas de uma vez:
//   1. Faz a chamada servidor-a-servidor (sem CORS envolvido) e devolve pro FootPlan com
//      os cabeçalhos CORS corretos pros nossos próprios domínios.
//   2. As chaves de API ficam só no ambiente do Worker (nunca no bundle JS público do site).
//
// Deploy (precisa de conta Cloudflare grátis):
//   1. npx wrangler login
//   2. npx wrangler secret put FOOTBALL_API_KEY   (cola a chave da football-data.org)
//   3. npx wrangler secret put RAPIDAPI_KEY        (cola a chave da RapidAPI — SportAPI7 e
//      API-Football usam a MESMA chave, é a mesma conta RapidAPI pros dois)
//   4. npx wrangler deploy
//   5. Copia a URL que o wrangler imprime (tipo https://footplan-football-proxy.SEU-USUARIO.workers.dev)
//      pra VITE_FOOTBALL_PROXY_URL no .env (local) e nas variáveis de build do deploy do site —
//      o mesmo proxy/URL serve as 3 fontes de dados.

const ALLOWED_CODES = new Set(['PL', 'PD', 'BL1', 'SA', 'FL1', 'PPL', 'ELC', 'BL2', 'FL2', 'SB', 'SPL', 'PPL2']);

// Rotas RapidAPI liberadas por esse proxy — pares [host, base] + allowlist de paths.
// Antes o regex aceitava QUALQUER path sob sportapi7/apifootball (qualquer pessoa
// podia apontar endpoints pagos arbitrários pro proxy e queimar a cota RapidAPI).
// Agora só o que o FootPlan realmente usa (ver src/services/sportApi.ts e apiFootball.ts):
//   sportapi7:  unique-tournament/{ut}/season/{season}/standings/total  e  team/{id}/players
//   + rota de discovery category/{N}/scheduled-events/{date} — usada pra descobrir os
//   uniqueTournament/season IDs de ligas ainda não mapeadas (ver TODO em sportApi.ts).
//   É leitura pública da Sofascore; liberar só essa rota não expõe endpoint pago.
//   apifootball: teams?...  e  players?...  (paginação via ?page=)
const RAPIDAPI_ROUTES = {
  sportapi7: {
    host: 'sportapi7.p.rapidapi.com',
    base: 'https://sportapi7.p.rapidapi.com/api/v1',
    allowed: [
      /^unique-tournament\/\d+\/season\/\d+\/standings\/total$/,
      /^team\/\d+\/players$/,
      /^category\/\d+\/scheduled-events\/\d{4}-\d{2}-\d{2}$/,
    ],
  },
  apifootball: {
    host: 'api-football-v1.p.rapidapi.com',
    base: 'https://api-football-v1.p.rapidapi.com/v3',
    allowed: [/^teams$/, /^teams\?/, /^players$/, /^players\?/],
  },
};

// Timeout de upstream: um fetch pendurado (rede lenta/travada) segurava a requisição
// do Worker indefinidamente. 10s é folgado pra essas APIs e curto o bastante pra não
// segurar o cliente.
const UPSTREAM_TIMEOUT_MS = 10_000;

// Rate limit por IP (janela deslizante simples, em memória por instância do Worker).
// Por que: com o site publicado, qualquer script fora do navegador pode chamar o
// proxy direto (CORS não bloqueia cliente não-browser) e queimar a cota das APIs
// upstream (football-data.org free = 10 req/min). 20 req/min por IP folga pro uso
// legítimo (sync manual das 12 ligas = ~12 req de uma vez) e segura abuso casual.
// Pra abuso coordenado, upgrade pro binding `ratelimits` do Cloudflare (ver README).
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_PER_IP = 20;
const rateBuckets = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  let bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.start >= RATE_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    rateBuckets.set(ip, bucket);
    if (rateBuckets.size > 10_000) {
      for (const [key, b] of rateBuckets) {
        if (now - b.start >= RATE_WINDOW_MS) rateBuckets.delete(key);
      }
    }
  }
  bucket.count += 1;
  return bucket.count > RATE_MAX_PER_IP;
}

// Ajuste pra incluir o domínio real onde o FootPlan fica publicado.
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'https://lucianolacerdawolf-alt.github.io',
  'https://footplan.pages.dev',
];

function corsHeaders(origin) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'GET') {
      return json({ error: 'Método não permitido.' }, 405, headers);
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    if (isRateLimited(ip)) {
      return json({ error: 'Muitas requisições. Tente novamente em instantes.' }, 429, { ...headers, 'Retry-After': '60' });
    }

    const url = new URL(request.url);

    const fdMatch = url.pathname.match(/^\/api\/football\/competitions\/([A-Z0-9]+)\/teams$/);
    if (fdMatch) {
      const code = fdMatch[1];
      if (!ALLOWED_CODES.has(code)) {
        return json({ error: `Competição "${code}" não permitida por esse proxy.` }, 400, headers);
      }
      if (!env.FOOTBALL_API_KEY) {
        return json({ error: 'FOOTBALL_API_KEY não configurada no Worker (rode: npx wrangler secret put FOOTBALL_API_KEY).' }, 500, headers);
      }
      let upstream;
      try {
        upstream = await fetch(`https://api.football-data.org/v4/competitions/${code}/teams`, {
          headers: { 'X-Auth-Token': env.FOOTBALL_API_KEY },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
      } catch (err) {
        console.error('football-data upstream failed:', err);
        return json({ error: 'Falha ao contatar a fonte de dados. Tente novamente em instantes.' }, 502, headers);
      }
      const body = await upstream.text();
      return new Response(body, { status: upstream.status, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    // /api/rapidapi/{sportapi7|apifootball}/{resto do path}?query — repassa o path e a
    // query string tal qual, só troca o host e injeta a chave (nunca chega no cliente).
    const rapidMatch = url.pathname.match(/^\/api\/rapidapi\/(sportapi7|apifootball)\/(.*)$/);
    if (rapidMatch) {
      const [, provider, restPath] = rapidMatch;
      const route = RAPIDAPI_ROUTES[provider];
      if (!env.RAPIDAPI_KEY) {
        return json({ error: 'RAPIDAPI_KEY não configurada no Worker (rode: npx wrangler secret put RAPIDAPI_KEY).' }, 500, headers);
      }
      if (!route.allowed.some(re => re.test(restPath))) {
        return json({ error: `Endpoint "${restPath}" não permitido por esse proxy.` }, 400, headers);
      }
      let upstream;
      try {
        upstream = await fetch(`${route.base}/${restPath}${url.search}`, {
          headers: { 'x-rapidapi-key': env.RAPIDAPI_KEY, 'x-rapidapi-host': route.host },
          signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
      } catch (err) {
        console.error(`${provider} upstream failed:`, err);
        return json({ error: 'Falha ao contatar a fonte de dados. Tente novamente em instantes.' }, 502, headers);
      }
      const body = await upstream.text();
      return new Response(body, { status: upstream.status, headers: { ...headers, 'Content-Type': 'application/json' } });
    }

    return json({ error: 'Rota não encontrada. Use /api/football/competitions/{CODE}/teams ou /api/rapidapi/{sportapi7|apifootball}/{path}' }, 404, headers);
  },
};
