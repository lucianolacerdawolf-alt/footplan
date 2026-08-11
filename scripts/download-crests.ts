/**
 * Baixa todos os escudos usados nos elencos estáticos e os grava em
 * `public/crests/`, gerando `src/data/crestManifest.ts` (mapa URL remota -> arquivo
 * local). Depois disso, `crestSrc()` serve o escudo do próprio domínio: resolve o
 * PWA offline (escudo não some sem internet) e tira a dependência de CDNs de
 * terceiros que podem cair, mudar de URL ou aplicar rate limit.
 *
 * Uso: npm run crests:download
 *
 * Idempotente: arquivos já baixados são pulados. Rode de novo quando adicionar
 * times/ligas novos. Requer conexão só na primeira vez (ou pra escudos novos).
 */

import { createHash } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { allLeagues } from '../src/data/leagues';

// Escudos das fontes vêm em até 500px (150KB+), mas o jogo mostra a ~40-120px.
// Redimensiona pra 192px (nítido até em telas retina nos maiores usos) e recomprime:
// derruba ~9.5MB -> ~1.5MB, viabilizando servir do próprio domínio sem inchar o app.
const MAX_PX = 192;

async function optimize(buf: Buffer): Promise<Buffer> {
  return sharp(buf)
    .resize(MAX_PX, MAX_PX, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CRESTS_DIR = path.join(ROOT, 'public', 'crests');
const MANIFEST_FILE = path.join(ROOT, 'src', 'data', 'crestManifest.ts');

const UA = 'Mozilla/5.0 (FootPlan crest fetcher)';

/** Nome de arquivo estável e sem colisão: hash da URL. Sempre .png porque
 *  optimize() reencoda tudo pra PNG (inclusive rasteriza SVG, se aparecer). */
function localFileName(url: string): string {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 16);
  return `${hash}.png`;
}

async function main() {
  // Coleta URLs únicas de escudo: times + badge da liga + badge da copa.
  const urls = new Set<string>();
  const add = (u: string | undefined | null) => {
    if (u && /^https?:\/\//i.test(u)) urls.add(u);
  };
  for (const league of allLeagues) {
    add(league.logo);
    add(league.cupLogo);
    for (const team of league.teams) add(team.logoUrl);
  }

  const sorted = [...urls].sort();
  console.log(`🛡️  ${sorted.length} escudos únicos (times + ligas + copas) em ${allLeagues.length} ligas.\n`);

  mkdirSync(CRESTS_DIR, { recursive: true });

  const manifest: Record<string, string> = {};
  let downloaded = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const url of sorted) {
    const file = localFileName(url);
    const dest = path.join(CRESTS_DIR, file);
    manifest[url] = `crests/${file}`;

    if (existsSync(dest)) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = Buffer.from(await res.arrayBuffer());
      if (raw.length < 100) throw new Error(`resposta muito pequena (${raw.length}B)`);
      const buf = await optimize(raw);
      writeFileSync(dest, buf);
      downloaded++;
      console.log(`  ✓ ${file}  ${(buf.length / 1024).toFixed(1)}KB  ${url}`);
    } catch (err) {
      // Escudo que falha não entra no manifesto: crestSrc cai no fallback remoto/vazio.
      delete manifest[url];
      failures.push(`${url} — ${(err as Error).message}`);
      console.warn(`  ✗ FALHOU ${url} — ${(err as Error).message}`);
    }
  }

  // Manifesto com chaves ordenadas (diff estável entre execuções).
  const entries = Object.keys(manifest).sort()
    .map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(manifest[k])},`)
    .join('\n');

  const banner = `// GERADO POR scripts/download-crests.ts — NÃO EDITE À MÃO.\n` +
    `// Mapa: URL remota do escudo -> caminho local em public/crests/.\n` +
    `// Rode \`npm run crests:download\` pra regenerar.\n\n`;

  writeFileSync(
    MANIFEST_FILE,
    `${banner}export const LOCAL_CRESTS: Record<string, string> = {\n${entries}\n};\n`,
  );

  console.log(`\n📦 ${downloaded} baixados, ${skipped} já existiam, ${failures.length} falharam.`);
  console.log(`📝 Manifesto: src/data/crestManifest.ts (${Object.keys(manifest).length} entradas).`);
  if (failures.length) {
    console.log(`\n⚠ Falhas (seguem hotlinkadas via fallback):`);
    failures.forEach(f => console.log(`   - ${f}`));
  }
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
