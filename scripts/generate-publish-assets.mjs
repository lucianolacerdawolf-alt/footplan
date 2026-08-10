// Gera assets de publicação a partir de assets existentes:
//   - public/og-image.png      (1200x630, preview de compartilhamento Open Graph)
//   - public/apple-touch-icon.png (180x180, ícone do iOS ao adicionar à Home)
// Fonte: public/fundo.webp (fundo do app) + public/favicon.svg (marca).
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../public');
const markPng = await sharp(Buffer.from(readFileSync(path.join(publicDir, 'favicon.svg'), 'utf8')), { density: 384 })
  .png()
  .toBuffer();

// ── og-image.png (1200x630) ──
// Fundo do app cobrindo o quadro, escurecido levemente, com a marca centralizada.
{
  const W = 1200, H = 630;
  const bg = await sharp(path.join(publicDir, 'fundo.webp'))
    .resize(W, H, { fit: 'cover', position: 'centre' })
    .modulate({ brightness: 0.55 })
    .png()
    .toBuffer();

  const markSize = 320;
  const logo = await sharp(markPng).resize(markSize, markSize, { fit: 'contain' }).png().toBuffer();

  await sharp(bg)
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log('✓ og-image.png (1200x630)');
}

// ── apple-touch-icon.png (180x180) ──
// Mesmo padrão dos ícones PWA: marca sobre o fundo escuro do app.
{
  const size = 180;
  const margin = Math.round(size * 0.12);
  const mark = await sharp(markPng).resize(size - margin * 2, size - margin * 2, { fit: 'contain' }).png().toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background: '#060b14' } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png (180x180)');
}
