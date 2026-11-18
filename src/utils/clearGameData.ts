/** Apaga todos os saves do jogo neste aparelho (chaves "fp:"). */
export function clearAllGameData(ls: Storage = localStorage): number {
  const keys: string[] = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith('fp:')) keys.push(k);
  }
  keys.forEach(k => ls.removeItem(k));
  return keys.length;
}
