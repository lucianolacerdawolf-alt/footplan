import { useEffect, useRef } from 'react';
import type { MatchEvent } from '../engine/types';

interface Props {
  events: MatchEvent[];
  homeTeamId: string;
}

const EVENT_ICONS: Record<string, string> = {
  kickoff: '\u{1F4E3}',
  possession: '\u{1F504}',
  pass: '\u{1F7E2}',
  tackle: '\u{1F6E1}',
  attack: '\u26A1',
  goal: '\u26BD',
  miss: '\u2197\uFE0F',
  post: '\u{1F629}',
  save: '\u{1F6E1}\uFE0F',
  corner: '\u{1F6A9}',
  foul: '\u{1F6AB}',
  offside: '\u{1F6A7}',
  yellowCard: '\u{1F7E8}',
  redCard: '\u{1F7E5}',
  halftime: '\u23F8\uFE0F',
  fulltime: '\u{1F3C1}',
};

const MAX_VISIBLE = 60;

export default function CommentaryFeed({ events, homeTeamId }: Props) {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  const hidden = Math.max(0, events.length - MAX_VISIBLE);
  const visibleEvents = hidden > 0 ? events.slice(-MAX_VISIBLE) : events;

  return (
    <div className="commentary-feed" ref={feedRef}>
      <h3>📻 Cronologia da Partida</h3>
      <div className="feed-list">
        {hidden > 0 && (
          <p className="feed-hidden">+ {hidden} eventos anteriores</p>
        )}
        {visibleEvents.map((event, i) => {
          const isHome = event.teamId === homeTeamId;
          const side = event.teamId === null ? 'neutral' : isHome ? 'home' : 'away';
          return (
            <div key={hidden + i} className={`feed-event event-${side} event-${event.type}`}>
              <span className="event-minute">{String(event.minute).padStart(2, '0')}:00</span>
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
