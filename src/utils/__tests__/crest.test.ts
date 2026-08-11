import { describe, it, expect } from 'vitest';
import { crestSrc } from '../crest';
import { LOCAL_CRESTS } from '../../data/crestManifest';

describe('crestSrc', () => {
  it('retorna o fallback transparente pra url vazia/nula', () => {
    const fb = crestSrc(null);
    expect(fb).toContain('data:image/svg+xml');
    expect(crestSrc(undefined)).toBe(fb);
    expect(crestSrc('')).toBe(fb);
    expect(crestSrc('   ')).toBe(fb);
  });

  it('troca uma url remota conhecida pela cópia local em public/crests/', () => {
    const [remote, local] = Object.entries(LOCAL_CRESTS)[0];
    const resolved = crestSrc(remote);
    expect(resolved.endsWith(local)).toBe(true);   // .../crests/<hash>.png
    expect(resolved).not.toBe(remote);             // não é mais hotlink
  });

  it('mantém url remota não mapeada como hotlink (ex: escudo de sync ao vivo)', () => {
    const unknown = 'https://cdn.exemplo.com/escudo-desconhecido.png';
    expect(crestSrc(unknown)).toBe(unknown);
  });

  it('todas as entradas do manifesto apontam pra crests/', () => {
    for (const local of Object.values(LOCAL_CRESTS)) {
      expect(local.startsWith('crests/')).toBe(true);
      expect(local.endsWith('.png')).toBe(true);
    }
  });
});
