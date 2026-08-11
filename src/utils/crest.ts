// =============================================================================
// CREST — resolução de escudo (local-first) + fallback
// =============================================================================
// Times sem logoUrl ('' — comum em testes e em elencos sintéticos) renderizam
// `src=""`, que dispara warning do React e ícone de imagem quebrada. Centraliza
// o fallback num SVG transparente 1x1 (invisível, sem warning).
//
// Além disso: escudos dos elencos estáticos foram baixados pra public/crests/
// (ver scripts/download-crests.ts). crestSrc troca a URL remota pela cópia local,
// então o PWA/APK mostra escudo mesmo offline e não depende de CDN de terceiros.
// URLs remotas não mapeadas (ex: escudo vindo de sincronização ao vivo) continuam
// sendo hotlinkadas normalmente.

import { LOCAL_CRESTS } from '../data/crestManifest';

const BASE = import.meta.env.BASE_URL;

const FALLBACK_CREST =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="transparent"/></svg>');

export function crestSrc(url: string | undefined | null): string {
  if (!url || url.trim().length === 0) return FALLBACK_CREST;
  const local = LOCAL_CRESTS[url];
  return local ? `${BASE}${local}` : url;
}
