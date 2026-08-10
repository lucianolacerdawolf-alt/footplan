/**
 * Ícones SVG inline (24×24, stroke = currentColor). Substituem emojis usados
 * como iconografia de UI — emojis renderizam diferente em cada SO/navegador e
 * quebram a consistência visual. Emojis puramente decorativos/expressivos (ex:
 * feed social, reações) podem continuar como emoji; aqui ficam os de interface.
 *
 * Uso: <Icon name="play" /> · herda cor do texto e tamanho via `size`.
 */
export type IconName =
  | 'play' | 'trophy' | 'briefcase' | 'refresh' | 'cloud' | 'cloud-off'
  | 'star' | 'calendar' | 'stadium' | 'shirt' | 'globe' | 'bolt'
  | 'medal' | 'warning' | 'bell' | 'chart' | 'manager' | 'chevron-right' | 'arrow-left';

interface Props {
  name: IconName;
  /** Tamanho em px (largura=altura). Default 18. */
  size?: number;
  className?: string;
  /** Rótulo acessível. Sem ele, o ícone é aria-hidden (decorativo). */
  title?: string;
}

// Cada entrada é o conteúdo interno de um <svg viewBox="0 0 24 24">.
const PATHS: Record<IconName, React.ReactNode> = {
  play: <path d="M6 4l14 8-14 8V4z" />,
  trophy: <><path d="M7 4h10v4a5 5 0 0 1-10 0V4z" /><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" /><path d="M9 15h6M12 15v3M9 21h6" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></>,
  cloud: <path d="M6 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5-1.5A4.5 4.5 0 0 1 17 18H6z" />,
  'cloud-off': <><path d="M6 18a4 4 0 0 1-.9-7.9M8 5.5A6 6 0 0 1 17.5 8.5 4.5 4.5 0 0 1 19 17" /><path d="M3 3l18 18" /></>,
  star: <path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.2l5.9-.9L12 3z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  stadium: <><ellipse cx="12" cy="9" rx="9" ry="4" /><path d="M3 9v6c0 2.2 4 4 9 4s9-1.8 9-4V9" /></>,
  shirt: <path d="M8 3l4 2 4-2 5 4-3 3-1-1v9H7v-9L6 10 3 7l5-4z" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18z" /></>,
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
  medal: <><circle cx="12" cy="15" r="6" /><path d="M8.5 9.5L6 3h4l2 4 2-4h4l-2.5 6.5M12 13l1 2 2 .2-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9 15.2l2-.2 1-2z" /></>,
  warning: <><path d="M12 3l10 18H2L12 3z" /><path d="M12 10v4M12 17.5v.5" /></>,
  bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  manager: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /><path d="M9 21v-3l3-2 3 2v3" /></>,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M12 19l-7-7 7-7" />,
};

export default function Icon({ name, size = 18, className, title }: Props) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}
      style={{ flexShrink: 0, display: 'inline-block', verticalAlign: 'text-bottom' }}
    >
      {PATHS[name]}
    </svg>
  );
}
