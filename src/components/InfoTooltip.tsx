import { useEffect, useRef, useState } from 'react';

interface Props {
  title: string;
  body: string;
}

export default function InfoTooltip({ title, body }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="info-tooltip" ref={ref}>
      <button
        type="button"
        className="info-tooltip-btn"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        aria-label={`O que é ${title}?`}
        aria-expanded={open}
      >
        ?
      </button>
      {open && (
        <div className="info-tooltip-popover" role="tooltip">
          <strong>{title}</strong>
          <p>{body}</p>
        </div>
      )}
    </span>
  );
}
