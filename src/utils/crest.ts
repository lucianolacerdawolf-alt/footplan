// =============================================================================
// CREST — fallback de escudo
// =============================================================================
// Times sem logoUrl ('' — comum em testes e em elencos sintéticos) renderizam
// `src=""`, que dispara warning do React e ícone de imagem quebrada. Centraliza
// o fallback num SVG transparente 1x1 (invisível, sem warning).

const FALLBACK_CREST =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="transparent"/></svg>');

export function crestSrc(url: string | undefined | null): string {
  return url && url.trim().length > 0 ? url : FALLBACK_CREST;
}
