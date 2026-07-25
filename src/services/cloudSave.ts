import type { CareerState } from '../engine/career';
import { ensureAuth } from './supabaseClient';

export async function loadCareer(): Promise<CareerState | null> {
  const sb = await ensureAuth();
  const { data, error } = await sb
    .from('careers')
    .select('career_state')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return (data as { career_state: CareerState }).career_state;
}

export async function saveCareer(state: CareerState): Promise<void> {
  const sb = await ensureAuth();
  const userId = (await sb.auth.getSession()).data.session?.user.id;
  if (!userId) throw new Error('Not authenticated');

  const { error } = await sb
    .from('careers')
    .upsert({
      user_id: userId,
      manager_name: state.manager.name,
      team_id: state.season.league.userTeamId,
      current_season: state.currentSeasonYear,
      career_state: state,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) throw error;
}
