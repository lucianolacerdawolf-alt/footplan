import type { Team } from '@/engine/types';
import { getAvgOvr } from '@/utils/teamUtils';

interface Props {
  team: Team;
  side?: 'home' | 'away';
  uniform?: number;
  onClick?: () => void;
  showOvr?: boolean;
  showUniform?: boolean;
  onUniformToggle?: () => void;
  className?: string;
}

export default function TeamSlot({
  team, side, uniform, onClick, showOvr = true, showUniform = false,
  onUniformToggle, className = '',
}: Props) {
  const slotClass = `select-slot ${side === 'home' ? 'home-slot' : side === 'away' ? 'away-slot' : ''} filled ${className}`.trim();
  return (
    <div className={slotClass}>
      <img className="slot-crest" src={team.logoUrl} alt="" />
      <span className="slot-name">{team.name}</span>
      {showOvr && <span className="slot-ovr">{getAvgOvr(team)}</span>}
      {showUniform && (
        <select
          className="uniform-select"
          value={uniform ?? 0}
          onChange={() => onUniformToggle?.()}
        >
          <option value={0}>Home</option>
          <option value={1}>Away</option>
        </select>
      )}
      {onClick && <button className="slot-change" onClick={onClick}>Trocar</button>}
    </div>
  );
}
