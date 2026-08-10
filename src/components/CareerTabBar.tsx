import type { CareerTab } from '../utils/careerTabs';
import styles from './CareerTabBar.module.css';

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
