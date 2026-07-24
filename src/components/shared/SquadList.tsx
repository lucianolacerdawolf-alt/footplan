import type { Player } from '@/engine/types';
import { playerOvr } from '@/utils/playerOvr';

interface SquadPlayer {
  player: Player;
  fatigue?: number;
  injured?: boolean;
  expelled?: boolean;
  selected?: boolean;
}

interface Props {
  squad: SquadPlayer[];
  onPlayerClick?: (playerId: string, index: number) => void;
  className?: string;
  showFatigue?: boolean;
  showOvr?: boolean;
}

export default function SquadList({
  squad, onPlayerClick, className = '',
  showFatigue = false, showOvr = true,
}: Props) {
  return (
    <div className={`squad-panel ${className}`}>
      {squad.map((sp, idx) => {
        const isStarter = sp.player.position !== 'GK' || idx === 0;
        const rowClass = `squad-row ${isStarter ? 'starter' : 'bench'}${sp.selected ? ' selected' : ''}${sp.expelled ? ' expelled' : ''}${sp.injured ? ' injured' : ''}`.trim();
        return (
          <div
            key={sp.player.id}
            className={rowClass}
            onClick={() => onPlayerClick?.(sp.player.id, idx)}
            role={onPlayerClick ? 'button' : undefined}
            tabIndex={onPlayerClick ? 0 : undefined}
            onKeyDown={onPlayerClick ? e => { if (e.key === 'Enter' || e.key === ' ') onPlayerClick(sp.player.id, idx); } : undefined}
          >
            <span className="sq-num">{sp.player.number}</span>
            <span className="sq-name">{sp.player.name}</span>
            <span className="sq-pos">{sp.player.position}</span>
            {showOvr && <span className="sq-ovr">{playerOvr(sp.player)}</span>}
            {showFatigue && sp.fatigue !== undefined && (
              <span className="sq-fatigue" style={{ color: sp.fatigue > 70 ? 'var(--red)' : sp.fatigue > 40 ? 'var(--yellow)' : 'var(--text-secondary)' }}>
                {Math.round(sp.fatigue)}%
              </span>
            )}
            {sp.injured && <span className="sq-injury" title="Lesionado">+</span>}
          </div>
        );
      })}
    </div>
  );
}
