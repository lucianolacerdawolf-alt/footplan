import type { Team } from '@/engine/types';

interface Props {
  home: Team;
  away: Team;
  onBack: () => void;
  simulating: boolean;
  paused: boolean;
  phase: string;
  started: boolean;
  online: boolean;
  speed: number;
  setSpeed: (s: number) => void;
  pausesRemaining: number;
  onConsumePause: () => void;
  onResumeReplay: () => void;
  onOnlinePause: () => void;
}

export default function TopBar({
  home, away, onBack, simulating, paused, phase, started,
  online, speed, setSpeed, pausesRemaining, onConsumePause,
  onResumeReplay, onOnlinePause,
}: Props) {
  return (
    <header className="match-topbar">
      <button className="back-btn" onClick={onBack} disabled={simulating && !paused}>
        &larr; Voltar
      </button>
      <span className="match-title">{home.abbreviation} vs {away.abbreviation}</span>
      <span className="match-formations">{home.strategy.formation} x {away.strategy.formation}</span>
      <div className="speed-control" role="group" aria-label="Velocidade do replay">
        {phase === 'simulating' && started && !online && (
          <button
            className="speed-btn"
            onClick={paused ? onResumeReplay : (pausesRemaining > 0 ? onConsumePause : undefined)}
            disabled={pausesRemaining <= 0 && !paused}
            title={paused ? 'Retomar' : pausesRemaining > 0 ? `Pausar (${pausesRemaining} restante${pausesRemaining > 1 ? 's' : ''})` : 'Pausas esgotadas'}
            aria-label={paused ? 'Retomar replay' : 'Pausar replay'}
          >{paused ? '▶' : `⏸ ${pausesRemaining}`}</button>
        )}
        {phase === 'simulating' && started && online && (
          <button
            className="speed-btn"
            onClick={paused ? undefined : onOnlinePause}
            disabled={pausesRemaining <= 0 && !paused}
            title={pausesRemaining > 0 ? `Pausar (${pausesRemaining} restante${pausesRemaining > 1 ? 's' : ''})` : 'Pausas esgotadas'}
            aria-label={pausesRemaining > 0 ? 'Pausar jogo' : 'Pausas esgotadas'}
          >⏸ {pausesRemaining}</button>
        )}
        {[1, 2, 3, 4].map(s => (
          <button
            key={s}
            className={`speed-btn ${speed === s ? 'active' : ''}`}
            onClick={() => setSpeed(s)}
            title={`Velocidade ${s}x`}
            aria-label={`Velocidade ${s}x`}
            aria-pressed={speed === s}
          >{s}x</button>
        ))}
      </div>
    </header>
  );
}
