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
-- Liga entre Amigos (assíncrona): liga com código, membros (1 clube cada, tática
-- própria) e resultados por rodada (PK liga+rodada = cada rodada gravada uma vez).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.friend_leagues (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT UNIQUE NOT NULL CHECK (code ~ '^[A-Z0-9]{6}$'),
  name           TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  base_league_id TEXT NOT NULL,
  created_by     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  start_date     DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  seed           BIGINT NOT NULL,
  teams          JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (pg_column_size(teams) < 600000),
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.friend_league_members (
  league_id    UUID NOT NULL REFERENCES public.friend_leagues ON DELETE CASCADE,
  user_id      UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users ON DELETE CASCADE,
  team_id      TEXT NOT NULL,
  manager_name TEXT NOT NULL CHECK (char_length(manager_name) BETWEEN 1 AND 24),
  strategy     JSONB,
  joined_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (league_id, user_id),
  UNIQUE (league_id, team_id)
);
CREATE TABLE IF NOT EXISTS public.friend_league_rounds (
  league_id  UUID NOT NULL REFERENCES public.friend_leagues ON DELETE CASCADE,
  round      INT NOT NULL CHECK (round >= 0),
  results    JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (league_id, round)
);
ALTER TABLE public.friend_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_league_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_league_rounds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read leagues" ON public.friend_leagues;
CREATE POLICY "read leagues" ON public.friend_leagues FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "create own league" ON public.friend_leagues;
CREATE POLICY "create own league" ON public.friend_leagues FOR INSERT TO authenticated WITH CHECK (created_by = (select auth.uid()));
DROP POLICY IF EXISTS "creator deletes league" ON public.friend_leagues;
CREATE POLICY "creator deletes league" ON public.friend_leagues FOR DELETE TO authenticated USING (created_by = (select auth.uid()));

DROP POLICY IF EXISTS "read members" ON public.friend_league_members;
CREATE POLICY "read members" ON public.friend_league_members FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "join as self" ON public.friend_league_members;
CREATE POLICY "join as self" ON public.friend_league_members FOR INSERT TO authenticated WITH CHECK (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "edit own tactics" ON public.friend_league_members;
CREATE POLICY "edit own tactics" ON public.friend_league_members FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
DROP POLICY IF EXISTS "leave league" ON public.friend_league_members;
CREATE POLICY "leave league" ON public.friend_league_members FOR DELETE TO authenticated USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "read rounds" ON public.friend_league_rounds;
CREATE POLICY "read rounds" ON public.friend_league_rounds FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "members record rounds" ON public.friend_league_rounds;
CREATE POLICY "members record rounds" ON public.friend_league_rounds FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.friend_league_members m
                      WHERE m.league_id = friend_league_rounds.league_id AND m.user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Conferência: careers (1 política ALL), roster_snapshots (1 SELECT) e as 9 da
-- Liga entre Amigos (friend_leagues 3, friend_league_members 4, friend_league_rounds 2).
-- ---------------------------------------------------------------------------
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
