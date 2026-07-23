import InfoTooltip from './InfoTooltip';
import { TACTIC_EXPLANATIONS, type TacticKey } from '../engine/tacticExplanations';

export default function TacticLabel({ tacticKey }: { tacticKey: TacticKey }) {
  const t = TACTIC_EXPLANATIONS[tacticKey];
  return (
    <label>
      {t.title} <InfoTooltip title={t.title} body={t.body} />
    </label>
  );
}
