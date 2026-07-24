import { TACTIC_PRESETS } from '@/engine/tacticPresets';
import type { Team } from '@/engine/types';

interface Props {
  onApply: (strategy: Team['strategy']) => void;
  currentStrategy: Team['strategy'];
}

export default function TacticPresets({ onApply, currentStrategy }: Props) {
  const isActive = (preset: typeof TACTIC_PRESETS[number]) =>
    preset.mentality === currentStrategy.mentality &&
    preset.intensity === currentStrategy.intensity &&
    preset.defensiveLine === currentStrategy.defensiveLine &&
    preset.width === currentStrategy.width;

  return (
    <div className="preset-buttons">
      {TACTIC_PRESETS.map(preset => (
        <button
          key={preset.id}
          className={`preset-btn${isActive(preset) ? ' active' : ''}`}
          onClick={() => onApply({ ...currentStrategy, mentality: preset.mentality, intensity: preset.intensity, defensiveLine: preset.defensiveLine, width: preset.width })}
          title={getPresetTitle(preset.id)}
        >
          {preset.icon} {preset.label}
        </button>
      ))}
    </div>
  );
}

function getPresetTitle(id: string): string {
  switch (id) {
    case 'offensive': return 'Pressão alta, intensidade alta, linha alta, jogo amplo';
    case 'balanced': return 'Posse de bola, intensidade média, linha normal, largura normal';
    case 'defensive': return 'Retranca, intensidade baixa, linha baixa, jogo estreito';
    default: return id;
  }
}
