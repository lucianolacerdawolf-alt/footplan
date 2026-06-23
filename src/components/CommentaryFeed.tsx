import { useEffect, useRef } from 'react';
import type { MatchEvent } from '../engine/types';

interface Props {
  events: MatchEvent[];
  homeTeamId: string;
}

const EVENT_ICONS: Record<string, string> = {
  kickoff: '📣',
  possession: '🔄',
  attack: '⚡',
  goal: '⚽',
  miss: '↗️',
  post: '😱',
  save: '🛡️',
  halftime: '⏸️',
  fulltime: '🏁',
};

export default function CommentaryFeed({ events, homeTeamId }: Props) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="commentary-feed" ref={feedRef}>
      <h3>📻 Cronologia da Partida</h3>
      <div className="feed-list">
        {events.map((event, i) => {
          const isHome = event.teamId === homeTeamId;
          const side = event.teamId === null ? 'neutral' : isHome ? 'home' : 'away';
          return (
            <div key={i} className={`feed-event event-${side} event-${event.type}`}>
              <span className="event-minute">{event.minute}&apos;</span>
              <span className="event-icon">{EVENT_ICONS[event.type] ?? ''}</span>
              <span className="event-text">{event.description}</span>
            </div>
          );
        })}
        {events.length === 0 && (
          <p className="feed-empty">Pressione &quot;Simular Partida&quot; para começar...</p>
        )}
      </div>
    </div>
  );
}
