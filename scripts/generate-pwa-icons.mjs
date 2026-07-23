// Gera os ícones PWA (192x192 e 512x512) a partir do public/favicon.svg existente,
// compostos sobre o fundo escuro do app (--bg: #060b14) com um respiro de segurança
// pra funcionar como ícone "maskable" (Android recorta até ~20% das bordas).
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const svgPath = path.join(publicDir, 'favicon.svg');
const svg = readFileSync(svgPath, 'utf8');

const BG = '#060b14';

async function generate(size, outName, { maskableSafe = false } = {}) {
  // Área segura maskable: o conteúdo precisa caber num círculo de raio 40% do lado
  // (ou seja, ~20% de margem em cada borda) pra não ser cortado pelo Android.
  const margin = maskableSafe ? Math.round(size * 0.18) : Math.round(size * 0.12);
  const markSize = size - margin * 2;

  const markPng = await sharp(Buffer.from(svg), { density: 384 })
    .resize(markSize, markSize, { fit: 'contain' })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size, height: size, channels: 4,
      background: BG,
    },
  })
    .composite([{ input: markPng, gravity: 'center' }])
    .png()
    .toFile(path.join(publicDir, outName));

  console.log(`✓ ${outName} (${size}x${size})`);
}

mkdirSync(publicDir, { recursive: true });
await generate(192, 'pwa-192.png');
await generate(512, 'pwa-512.png');
await generate(512, 'pwa-512-maskable.png', { maskableSafe: true });
console.log('Ícones PWA gerados em public/.');
