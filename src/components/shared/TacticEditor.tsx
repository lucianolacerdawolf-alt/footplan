import type { Team, Formation, Mentality, Intensity, DefensiveLine, Width } from '@/engine/types';
import { MENTALITY_LABELS, INTENSITY_LABELS, DEFENSIVE_LINE_LABELS, WIDTH_LABELS } from '@/engine/types';
import { FORMATIONS, MENTALITIES, INTENSITIES, DEF_LINES, WIDTHS } from '@/engine/constants';
import TacticLabel from '../TacticLabel';

interface Props {
  strategy: Team['strategy'];
  onChange: (strategy: Team['strategy']) => void;
  disabled?: boolean;
}

export default function TacticEditor({ strategy, onChange, disabled = false }: Props) {
  const update = <K extends keyof typeof strategy>(key: K, value: (typeof strategy)[K]) => {
    onChange({ ...strategy, [key]: value });
  };

  return (
    <div className="tactic-card">
      <TacticLabel tacticKey="formation" />
      <select className="setup-select" value={strategy.formation} onChange={e => update('formation', e.target.value as Formation)} disabled={disabled}>
        {FORMATIONS.map(f => <option key={f} value={f}>{f}</option>)}
      </select>

      <TacticLabel tacticKey="mentality" />
      <select className="setup-select" value={strategy.mentality} onChange={e => update('mentality', e.target.value as Mentality)} disabled={disabled}>
        {MENTALITIES.map(m => <option key={m} value={m}>{MENTALITY_LABELS[m]}</option>)}
      </select>

      <TacticLabel tacticKey="intensity" />
      <select className="setup-select" value={strategy.intensity} onChange={e => update('intensity', e.target.value as Intensity)} disabled={disabled}>
        {INTENSITIES.map(i => <option key={i} value={i}>{INTENSITY_LABELS[i]}</option>)}
      </select>

      <TacticLabel tacticKey="defensiveLine" />
      <select className="setup-select" value={strategy.defensiveLine} onChange={e => update('defensiveLine', e.target.value as DefensiveLine)} disabled={disabled}>
        {DEF_LINES.map(d => <option key={d} value={d}>{DEFENSIVE_LINE_LABELS[d]}</option>)}
      </select>

      <TacticLabel tacticKey="width" />
      <select className="setup-select" value={strategy.width} onChange={e => update('width', e.target.value as Width)} disabled={disabled}>
        {WIDTHS.map(w => <option key={w} value={w}>{WIDTH_LABELS[w]}</option>)}
      </select>
    </div>
  );
}
