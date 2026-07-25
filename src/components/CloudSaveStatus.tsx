import type { CloudStatus } from '../hooks/useCloudSave';
import styles from './CloudSaveStatus.module.css';

interface Props {
  status: CloudStatus;
  onRetry?: () => void;
}

const LABELS: Record<CloudStatus, string> = {
  idle: '',
  loading: 'Carregando...',
  saving: 'Salvando...',
  saved: 'Salvo na nuvem',
  offline: 'Offline — toque para reconectar',
};

export default function CloudSaveStatus({ status, onRetry }: Props) {
  if (status === 'idle') return null;

  const isOffline = status === 'offline';

  return (
    <button
      className={`${styles.badge} ${styles[status]}`}
      onClick={isOffline && onRetry ? onRetry : undefined}
      title={isOffline ? 'Clique para tentar sincronizar com a nuvem' : `Cloud save: ${LABELS[status]}`}
      aria-label={LABELS[status]}
      role={isOffline ? 'button' : 'status'}
      tabIndex={isOffline ? 0 : -1}
    >
      <span className={styles.icon}>
        {status === 'loading' || status === 'saving' ? '🔄' : status === 'saved' ? '☁️' : '⚠️'}
      </span>
      <span className={styles.label}>{LABELS[status]}</span>
    </button>
  );
}
