import { useState } from 'react';
import type { PlayerConversation, ConversationTopic } from '../engine/career';
import { CONVERSATION_RESPONSES } from '../engine/playerConversations';
import styles from './ConversationsPanel.module.css';

interface Props {
  conversations: PlayerConversation[];
  onRespond: (convId: string, choiceIdx: number) => void;
}

const TOPIC_ICON: Record<ConversationTopic, string> = {
  bench: '🪑',
  form: '📉',
  praise: '🌟',
  'transfer-listed': '📋',
  contract: '📄',
};

const TOPIC_LABEL: Record<ConversationTopic, string> = {
  bench: 'Banco',
  form: 'Má fase',
  praise: 'Destaque',
  'transfer-listed': 'Listado',
  contract: 'Contrato',
};

export default function ConversationsPanel({ conversations, onRespond }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const unrespondedCount = conversations.filter(c => !c.responded).length;
  const sorted = [...conversations].reverse(); // mais recentes primeiro

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        💬 Conversas com Atletas
        {unrespondedCount > 0 && <span className={styles.badge}>{unrespondedCount}</span>}
      </div>
      {conversations.length === 0 ? (
        <div className={styles.empty}>Nenhuma conversa por enquanto.</div>
      ) : (
        <div className={styles.list}>
          {sorted.map(c => {
            const options = CONVERSATION_RESPONSES[c.topic];
            const expanded = expandedId === c.id;
            return (
              <div key={c.id} className={`${styles.row} ${!c.responded ? styles.unread : ''}`}>
                <button className={styles.rowHeader} onClick={() => setExpandedId(expanded ? null : c.id)} aria-expanded={expanded}>
                  <span className={styles.icon} aria-hidden="true">{TOPIC_ICON[c.topic]}</span>
                  <span className={styles.subject}>{c.playerName}</span>
                  <span className={styles.topicTag}>{TOPIC_LABEL[c.topic]}</span>
                  {!c.responded && <span className={styles.dot} aria-label="não respondida" />}
                </button>
                {expanded && (
                  <div className={styles.body}>
                    <p className={styles.speech}>“{c.message}”</p>
                    <span className={styles.date}>Temp. {c.seasonYear} · Rodada {c.round + 1}</span>
                    {c.responded ? (
                      <div className={styles.responded}>✓ Conversa encerrada</div>
                    ) : (
                      <div className={styles.actionRow}>
                        {options.map((opt, idx) => (
                          <button
                            key={idx}
                            className={styles.respondBtn}
                            onClick={() => onRespond(c.id, idx)}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
