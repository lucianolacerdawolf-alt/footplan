import { useState } from 'react';
import type { InboxMessage } from '../engine/career';
import styles from './InboxPanel.module.css';

interface Props {
  messages: InboxMessage[];
  onMarkRead: (id: string) => void;
}

const TYPE_ICON: Record<InboxMessage['type'], string> = {
  TRANSFER_OFFER: '📋',
  BOARD_UPDATE: '🏛️',
  INJURY_REPORT: '🏥',
  MATCH_PREVIEW: '⚽',
};

export default function InboxPanel({ messages, onMarkRead }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const unreadCount = messages.filter(m => !m.isRead).length;
  const sorted = [...messages].reverse(); // mais recentes primeiro

  const handleToggle = (m: InboxMessage) => {
    if (!m.isRead) onMarkRead(m.id);
    setExpandedId(prev => (prev === m.id ? null : m.id));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        📨 Caixa de Entrada
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
      </div>
      {messages.length === 0 ? (
        <div className={styles.empty}>Nenhuma mensagem por enquanto.</div>
      ) : (
        <div className={styles.list}>
          {sorted.map(m => (
            <div
              key={m.id}
              className={`${styles.row} ${!m.isRead ? styles.unread : ''} ${m.isMandatory && !m.isRead ? styles.mandatory : ''}`}
            >
              <button className={styles.rowHeader} onClick={() => handleToggle(m)} aria-expanded={expandedId === m.id}>
                <span className={styles.icon} aria-hidden="true">{TYPE_ICON[m.type]}</span>
                <span className={styles.subject}>{m.subject}</span>
                {m.isMandatory && !m.isRead && <span className={styles.mandatoryTag}>Obrigatória</span>}
                {!m.isRead && <span className={styles.dot} aria-label="não lida" />}
              </button>
              {expandedId === m.id && (
                <div className={styles.body}>
                  <p className={styles.bodyText}>{m.body}</p>
                  <span className={styles.date}>{m.date}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
