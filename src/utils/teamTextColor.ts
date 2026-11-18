// Cor do clube pra TEXTO sobre o fundo escuro do app. Muitos clubes têm cor principal
// escura (Palace azul-marinho, Newcastle preto, Tottenham branco/azul-escuro): pintar a
// sigla com ela deixava "CRY", "NEW", "TOT" ilegíveis. Se a cor for escura demais, usa a
// secundária (quando clara) ou um cinza-claro neutro.

function luminance(hex: string): number | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const MIN_LUMINANCE = 0.12;
const FALLBACK = '#e2e8f0';

export function teamTextColor(team: { color?: string; secondaryColor?: string } | null | undefined): string {
  if (!team?.color) return FALLBACK;
  const main = luminance(team.color);
  if (main == null || main >= MIN_LUMINANCE) return team.color;
  const sec = team.secondaryColor ? luminance(team.secondaryColor) : null;
  return sec != null && sec >= MIN_LUMINANCE ? team.secondaryColor! : FALLBACK;
}
