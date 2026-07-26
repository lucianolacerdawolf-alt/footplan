import type { Screen } from '../types/navigation';
import styles from './CareerTabBar.module.css';

export type CareerTab = 'central' | 'elenco' | 'transferencias' | 'meu-clube' | 'escritorio';

/** Telas em que a barra de abas do Modo Carreira aparece — setup/match/stats/season-end
 *  ficam de fora de propósito (mesma imersão sem chrome de quando se joga uma partida). */
export const CAREER_TAB_SCREENS: ReadonlySet<Screen> = new Set([
  'career-hub', 'transfer-market', 'career-trophy-room',
  'career-league', 'career-league-table', 'career-bracket',
]);

const SCREEN_TO_TAB: Partial<Record<Screen, CareerTab>> = {
  'career-hub': 'central',
  'transfer-market': 'transferencias',
  'career-trophy-room': 'meu-clube',
  'career-league': 'escritorio',
  'career-league-table': 'escritorio',
  'career-bracket': 'escritorio',
};

export function getCareerTabForScreen(screen: Screen): CareerTab | null {
  return SCREEN_TO_TAB[screen] ?? null;
}

interface Props {
  active: CareerTab | null;
  onCentral: () => void;
  onElenco: () => void;
  onTransferencias: () => void;
  onMeuClube: () => void;
  onEscritorio: () => void;
}

const TABS: Array<{ id: CareerTab; icon: string; label: string; onClick: keyof Props }> = [
  { id: 'central', icon: '🏠', label: 'Central', onClick: 'onCentral' },
  { id: 'elenco', icon: '👕', label: 'Elenco', onClick: 'onElenco' },
  { id: 'transferencias', icon: '🛒', label: 'Transferências', onClick: 'onTransferencias' },
  { id: 'meu-clube', icon: '🏛️', label: 'Meu Clube', onClick: 'onMeuClube' },
  { id: 'escritorio', icon: '📅', label: 'Escritório', onClick: 'onEscritorio' },
];

export default function CareerTabBar({ active, onCentral, onElenco, onTransferencias, onMeuClube, onEscritorio }: Props) {
  const handlers: Record<string, () => void> = { onCentral, onElenco, onTransferencias, onMeuClube, onEscritorio };

  return (
    <nav className={styles.bar} aria-label="Navegação do Modo Carreira">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`${styles.tab} ${active === tab.id ? styles.active : ''}`}
          onClick={handlers[tab.onClick]}
          aria-current={active === tab.id ? 'page' : undefined}
        >
          <span className={styles.icon} aria-hidden="true">{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
