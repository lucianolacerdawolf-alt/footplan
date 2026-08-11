-- =============================================================================
-- Endurece o RLS de roster_snapshots pra produção.
-- =============================================================================
-- Problema: a instalação original deixava QUALQUER usuário autenticado (incluindo
-- auth anônimo, que o app usa) escrever na linha global do snapshot de elencos.
-- Com o site publicado, qualquer pessoa poderia sobrescrever o elenco global de
-- todos os jogadores.
--
-- Modelo correto: leitura aberta (elenco é dado público) + escrita só pela
-- service role, usada pelo script `npm run rosters:sync` (a service role bypassa
-- RLS, então basta NÃO existir política de write pra anon/authenticated).
--
-- Rode no SQL Editor do Supabase. É idempotente.

-- 1) Remove TODA política de INSERT/UPDATE/DELETE da tabela (seja qual for o nome)
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN
    SELECT policy_name
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'roster_snapshots'
      AND cmd <> 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.roster_snapshots', pol.policy_name);
  END LOOP;
END $$;

-- 2) Garante a política de leitura aberta (recria por segurança)
DROP POLICY IF EXISTS "read global snapshot" ON public.roster_snapshots;
CREATE POLICY "read global snapshot"
  ON public.roster_snapshots
  FOR SELECT
  USING (true);

-- 3) Confere: deve sobrar APENAS a política de SELECT
-- SELECT policy_name, cmd FROM pg_policies WHERE tablename = 'roster_snapshots';

-- OBS: a tabela `careers` já usa o modelo certo ("own career": user_id = auth.uid()).
-- Não mexa nela.
