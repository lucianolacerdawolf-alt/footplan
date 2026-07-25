// =============================================================================
// PROXY — Cloudflare Worker pra football-data.org
// =============================================================================
// Por quê: a API da football-data.org devolve `Access-Control-Allow-Origin: http://localhost`
// (sem porta), então o navegador bloqueia chamadas diretas do Vite (localhost:5173) e do
// GitHub Pages por CORS — confirmado testando com curl direto, o problema não é código.
// Esse worker resolve dois problemas de uma vez:
//   1. Faz a chamada servidor-a-servidor (sem CORS envolvido) e devolve pro FootPlan com
//      os cabeçalhos CORS corretos pros nossos próprios domínios.
//   2. A chave da API fica só no ambiente do Worker (nunca no bundle JS público do site).
//
// Deploy (precisa de conta Cloudflare grátis):
//   1. npx wrangler login
//   2. npx wrangler secret put FOOTBALL_API_KEY   (cola a chave quando pedir)
//   3. npx wrangler deploy
//   4. Copia a URL que o wrangler imprime (tipo https://footplan-football-proxy.SEU-USUARIO.workers.dev)
//      pra VITE_FOOTBALL_PROXY_URL no .env (local) e nas variáveis de build do deploy do site.

const ALLOWED_CODES = new Set(['PL', 'PD', 'BL1', 'SA', 'FL1', 'PPL', 'ELC', 'BL2', 'FL2', 'SB', 'SPL', 'PPL2']);

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

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/football\/competitions\/([A-Z0-9]+)\/teams$/);
    if (!match) {
      return json({ error: 'Rota não encontrada. Use /api/football/competitions/{CODE}/teams' }, 404, headers);
    }

    const code = match[1];
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
      });
    } catch (err) {
      return json({ error: `Falha ao contatar football-data.org: ${err.message}` }, 502, headers);
    }

    const body = await upstream.text();
    return new Response(body, { status: upstream.status, headers: { ...headers, 'Content-Type': 'application/json' } });
  },
};
