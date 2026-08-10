import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Acessibilidade de modal (WCAG 2.1.2 — Keyboard, 2.4.3 — Focus Order):
 *  - Move o foco pra dentro ao abrir (para o 1º elemento focável ou o container);
 *  - Trap de foco (Tab/Shift+Tab não vazam para o conteúdo de trás);
 *  - Fecha com Esc;
 *  - Restaura o foco ao elemento que abriu o modal ao desmontar.
 * Uso: `const modalRef = useModalFocus();` → `<div ref={modalRef} role="dialog" aria-modal="true">`.
 */
export function useModalFocus<T extends HTMLElement = HTMLElement>(open: boolean, onClose?: () => void) {
  const ref = useRef<T | null>(null);
  // Guarda quem tinha o foco antes de abrir — restaurado no unmount/close.
  const previousFocusRef = useRef<HTMLElement | null>(null);
  // onClose em ref: se o chamador passa uma arrow inline, sem isso o efeito abaixo
  // re-executava a cada render com o modal aberto, recapturando previousFocusRef JÁ
  // DENTRO do modal — o restore de foco no fechamento mirava o modal, não quem abriu.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const container = ref.current;
    const firstFocusable = container?.querySelector<HTMLElement>(FOCUSABLE);
    if (container) {
      (firstFocusable ?? container).focus();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !container) return;
      const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === null || active === first || active === container)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === null || active === last || active === container)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previousFocusRef.current?.focus();
    };
  }, [open]);

  return ref;
}
