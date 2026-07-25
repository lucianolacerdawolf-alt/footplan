import type { Team } from '../engine/types';
import { buildBaseCoords } from '../engine/steering';
import { isPlayerUnavailable } from '../engine/squadUtils';
import styles from './FormationPitch.module.css';

interface Props {
  team: Team;
  selectedId: string | null;
  eligibleIds?: Set<string>;
  onSelectPlayer: (id: string) => void;
}

const POS_COLOR: Record<string, string> = { GK: '#f59e0b', DEF: '#3b82f6', MID: '#10b981', FWD: '#ef4444' };
const FATIGUE_COLOR: Record<'high' | 'medium', string> = { high: '#ef4444', medium: '#f59e0b' };

function fatigueLevel(fatigue: number): 'high' | 'medium' | null {
  if (fatigue > 80) return 'high';
  if (fatigue > 50) return 'medium';
  return null;
}

export default function FormationPitch({ team, selectedId, eligibleIds, onSelectPlayer }: Props) {
  // Orientação fixa "home" — é só uma tela de escalação, não uma partida ao vivo,
  // então não importa de qual lado o time realmente joga.
  const coords = buildBaseCoords(team, 'home');
  const playerById = new Map(team.squad.map(pl => [pl.id, pl]));

  return (
    <div className={styles.wrapper}>
      <svg viewBox="0 0 120 70" className={styles.svg} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="fp-grass" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#2d8a3e" /><stop offset="100%" stopColor="#1a5c28" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="120" height="70" fill="url(#fp-grass)" rx="1.5" />
        <rect x="1.5" y="1.5" width="117" height="67" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.22" />
        <line x1="60" y1="1.5" x2="60" y2="68.5" stroke="rgba(255,255,255,0.75)" strokeWidth="0.22" />
        <circle cx="60" cy="35" r="8" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.22" />
        <circle cx="60" cy="35" r="0.7" fill="rgba(255,255,255,0.75)" />
        <rect x="1.5" y="12" width="16" height="46" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.18" />
        <rect x="1.5" y="23" width="6" height="24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.13" />
        <rect x="102.5" y="12" width="16" height="46" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="0.18" />
        <rect x="112.5" y="23" width="6" height="24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.13" />

        {coords.map(p => {
          const player = playerById.get(p.id);
          const isSelected = p.id === selectedId;
          const isEligible = !isSelected && eligibleIds?.has(p.id);
          const unavailable = player ? isPlayerUnavailable(player) : false;
          const fLevel = player ? fatigueLevel(player.currentFatigue) : null;
          const tooltip = unavailable
            ? (player?.isSuspended ? 'Suspenso' : `Lesionado (${player?.injuredRounds}j)`)
            : `${p.name} · Fadiga ${player?.currentFatigue ?? 0}`;
          return (
            <g
              key={p.id}
              className={styles.marker}
              role="button"
              tabIndex={0}
              aria-label={`${p.name}, ${p.position}, #${p.number}${unavailable ? ', indisponível' : ''}`}
              aria-pressed={isSelected}
              onClick={() => onSelectPlayer(p.id)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPlayer(p.id); } }}
            >
              <title>{tooltip}</title>
              {isEligible && <circle cx={p.x} cy={p.y} r="4.2" className={styles.eligibleRing} fill="none" />}
              {fLevel && !unavailable && (
                <circle cx={p.x} cy={p.y} r="3.9" fill="none" stroke={FATIGUE_COLOR[fLevel]} strokeWidth="0.5" opacity={0.85} />
              )}
              <circle cx={p.x} cy={p.y} r={isSelected ? 3.6 : 3}
                fill={unavailable ? '#4b5563' : (POS_COLOR[p.position] ?? team.color)}
                stroke={isSelected ? '#facc15' : '#fff'} strokeWidth={isSelected ? 0.5 : 0.22}
                opacity={unavailable ? 0.55 : 1} />
              {unavailable ? (
                <text x={p.x} y={p.y + 0.7} textAnchor="middle" fontSize="2.4" fontFamily="system-ui">
                  {player?.isSuspended ? '🚫' : '🤕'}
                </text>
              ) : (
                <text x={p.x} y={p.y + 0.55} textAnchor="middle" fill="#fff" fontSize="1.7" fontWeight="bold" fontFamily="system-ui">{p.number}</text>
              )}
              <text x={p.x} y={p.y + 5.4} textAnchor="middle" className={styles.nameLabel} fontSize="1.8" fontWeight="600" fontFamily="system-ui">
                {p.name.split(' ').slice(-1)[0]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
