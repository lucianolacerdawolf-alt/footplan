import { useRef, useState } from 'react';

// =============================================================================
// Arrastar e soltar um jogador em cima de outro (mouse e toque, via pointer events)
// =============================================================================
// Usado no campinho da escalação e no painel de substituições da partida. O alvo é
// achado pelo atributo data-player-id do elemento debaixo do dedo. Depois de um
// arrasto o navegador ainda dispara o click — `consumeClick()` engole esse.

const DRAG_THRESHOLD = 8;

interface DragState { id: string; startX: number; startY: number; x: number; y: number; active: boolean }

export function useDragSwap(onDrop: (fromId: string, toId: string) => void, disabled = false) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const suppressClick = useRef(false);

  const targetAt = (x: number, y: number): string | null =>
    document.elementFromPoint(x, y)?.closest('[data-player-id]')?.getAttribute('data-player-id') ?? null;

  const dragProps = (id: string) => ({
    'data-player-id': id,
    onPointerDown: (e: React.PointerEvent) => {
      if (disabled || e.button !== 0) return;
      // Captura já no toque: com mouse, um movimento rápido saía do elemento antes do limiar.
      (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
      setDrag({ id, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, active: false });
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!drag || drag.id !== id) return;
      const active = drag.active || Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > DRAG_THRESHOLD;
      setDrag({ ...drag, x: e.clientX, y: e.clientY, active });
      if (active) {
        const t = targetAt(e.clientX, e.clientY);
        setOverId(t && t !== id ? t : null);
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (!drag || drag.id !== id) return;
      if (drag.active) {
        suppressClick.current = true;
        const t = targetAt(e.clientX, e.clientY);
        if (t && t !== id) onDrop(id, t);
      }
      setDrag(null);
      setOverId(null);
    },
    onPointerCancel: () => { setDrag(null); setOverId(null); },
  });

  /** true = este click veio de um arrasto e deve ser ignorado. */
  const consumeClick = () => {
    if (!suppressClick.current) return false;
    suppressClick.current = false;
    return true;
  };

  return {
    dragProps,
    consumeClick,
    draggingId: drag?.active ? drag.id : null,
    ghost: drag?.active ? { x: drag.x, y: drag.y } : null,
    overId,
  };
}
