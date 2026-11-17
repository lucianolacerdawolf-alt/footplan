-- =============================================================================
-- FootPlan: setup completo de um projeto Supabase NOVO (do zero).
-- =============================================================================
-- Cria as duas tabelas que o app usa, com o RLS de produção já fechado:
--   careers           cloud save do Modo Carreira (1 linha por usuário anônimo)
--   roster_snapshots  snapshot global de elencos (leitura aberta, escrita só service role)
--
-- Rode inteiro no SQL Editor do projeto novo. É idempotente.
--
-- Depois do SQL, NO PAINEL do projeto novo:
--   1) Authentication > Sign In / Providers > habilite "Allow anonymous sign-ins".
--      Sem isso o app não loga e o cloud save fica sempre "offline".
--   2) Copie a URL e a anon (publishable) key pro .env e pras variáveis de build
--      do deploy (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
--   3) Copie a service_role key pro .env local SEM prefixo VITE_
--      (SUPABASE_SERVICE_ROLE_KEY) e rode `npm run rosters:sync` pra popular os elencos.

-- ---------------------------------------------------------------------------
-- careers: cada usuário só enxerga e escreve a própria carreira
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.careers (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  manager_name   TEXT NOT NULL,
  team_id        TEXT NOT NULL,
  current_season INT  DEFAULT 1,
  career_state   JSONB NOT NULL,           -- CareerState inteiro serializado
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- O upsert do app usa onConflict: 'user_id' — exige índice único.
CREATE UNIQUE INDEX IF NOT EXISTS idx_careers_user ON public.careers(user_id);

ALTER TABLE public.careers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only access own career" ON public.careers;
CREATE POLICY "Users can only access own career"
  ON public.careers
  FOR ALL
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- roster_snapshots: leitura pública, sem política de escrita
-- (a service role do `npm run rosters:sync` ignora RLS e publica o snapshot)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roster_snapshots (
  id         TEXT PRIMARY KEY,
  rosters    JSONB NOT NULL,               -- Record<leagueId, Team[]>
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.roster_snapshots (id, rosters)
VALUES ('global', '{}')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.roster_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read global snapshot" ON public.roster_snapshots;
CREATE POLICY "read global snapshot"
  ON public.roster_snapshots
  FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- Conferência: devem aparecer exatamente 2 políticas
--   careers           | Users can only access own career | ALL
--   roster_snapshots  | read global snapshot             | SELECT
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
