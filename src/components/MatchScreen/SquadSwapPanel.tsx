import type { Team, Player } from '@/engine/types';
import { getStarterCount } from '@/engine/squadUtils';
import { playerOvr } from '@/utils/playerOvr';
import { fireClick } from '@/utils/fireClick';

interface SquadSwapPanelProps {
  team: Team;
  accentColor: string;
  title: string;
  pick: string | null;
  setPick: (id: string | null) => void;
  onSwap: (benchIdx: number, starterIdx: number) => void;
  injuredIds?: string[];
  setInjuredIds?: React.Dispatch<React.SetStateAction<string[]>>;
  /** Se passado, mostra o desgaste (▶ OVR efetivo) ao lado de cada jogador. */
  fatigueMap?: Record<string, number>;
  /** Coluna somente leitura (ex: adversário em partida contra CPU). */
  disabled?: boolean;
}

/** Coluna de troca de jogadores (titulares/reservas) usada na pausa da partida,
 *  no intervalo e no pause online — antes esse markup era copiado em 3 arquivos. */
export default function SquadSwapPanel({
  team, accentColor, title, pick, setPick, onSwap,
  injuredIds = [], setInjuredIds, fatigueMap, disabled = false,
}: SquadSwapPanelProps) {
  const starterCount = getStarterCount(team.strategy.formation);
  const benchPlayers = team.squad.slice(starterCount);
  const starters = team.squad.slice(0, starterCount);
  const pickIdx = team.squad.findIndex(sp => sp.id === pick);
  const pickIsBench = pickIdx >= starterCount;
  const pickPlayer = pickIdx >= 0 ? team.squad[pickIdx] : null;
  const showFatigue = !!fatigueMap;
  const fatigueOf = (p: Player) => fatigueMap?.[p.id] ?? p.currentFatigue ?? 0;

  return (
    <div className="ht-squad-col">
      <strong style={{ color: accentColor, fontSize: 11 }}>{title}</strong>
      <div className="ht-sub-group-label">Titulares</div>
      {starters.map((p, i) => {
        const isPicked = p.id === pick;
        const canSwap = pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position && pickIdx !== i;
        const isInjured = injuredIds.includes(p.id);
        const fatigue = fatigueOf(p);
        const effOvr = Math.round(playerOvr(p) * (1 - fatigue / 200));
        const fatigueColor = fatigue > 70 ? 'var(--negative)' : fatigue > 45 ? 'var(--warning)' : 'var(--positive)';
        return (
          <div key={p.id}
            className={`ht-squad-row ${isPicked ? 'picked' : ''} ${canSwap && !disabled ? 'clickable' : ''} ${isInjured ? 'injured' : ''}`}
            style={isInjured ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (disabled) return;
              if (isInjured && pick && pickIsBench && pickPlayer && pickPlayer.position === p.position) {
                onSwap(pickIdx, i);
                setPick(null);
                setInjuredIds?.(prev => prev.filter(id => id !== p.id));
              } else if (pick && pickIsBench && pickPlayer && pickPlayer.position === p.position && !isInjured) {
                onSwap(pickIdx, i);
                setPick(null);
              } else {
                setPick(isPicked ? null : p.id);
              }
            }}
            onKeyDown={e => fireClick(e)}>
            <span className="sq-num">#{p.number}</span>
            <span className="sq-name">{p.name}</span>
            <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
            <span className="sq-ovr">
              {playerOvr(p)}
              {showFatigue && fatigue > 20 && <span style={{ color: fatigueColor, fontSize: 9, marginLeft: 3 }}>▶{effOvr}</span>}
            </span>
          </div>
        );
      })}
      <div className="ht-sub-group-label">Reservas</div>
      {benchPlayers.map((p) => {
        const isPicked = p.id === pick;
        const bi = team.squad.findIndex(sp => sp.id === p.id);
        const fatigue = fatigueOf(p);
        const effOvr = Math.round(playerOvr(p) * (1 - fatigue / 200));
        return (
          <div key={p.id}
            className={`ht-squad-row ${isPicked ? 'picked' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => {
              if (disabled) return;
              if (pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position) {
                onSwap(pickIdx, bi);
                setPick(null);
              } else {
                setPick(isPicked ? null : p.id);
              }
            }}
            onKeyDown={e => fireClick(e)}>
            <span className="sq-num">#{p.number}</span>
            <span className="sq-name">{p.name}</span>
            <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
            <span className="sq-ovr">
              {playerOvr(p)}
              {showFatigue && fatigue > 20 && <span style={{ color: 'var(--positive)', fontSize: 9, marginLeft: 3 }}>▶{effOvr}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}
