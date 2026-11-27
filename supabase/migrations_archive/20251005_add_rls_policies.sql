-- Row Level Security (RLS) Policies for new tables
-- Note: Production should enable RLS, but this is currently disabled for testing
-- See 20251005_disable_rls_for_tests.sql

-- Enable RLS on new tables (disabled by default in tests)
-- Commented out for now since tests have RLS disabled
-- Uncomment when deploying to production

-- ALTER TABLE public."magicLink" ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."userSession" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for magicLink table
-- Magic links should only be accessible by the system (service role)
-- No user-facing policies needed since this is server-side only

-- RLS Policies for userSession table
-- Users can only view and delete their own sessions

-- CREATE POLICY "Users can view own sessions" ON public."userSession"
--   FOR SELECT
--   USING (auth.uid() = "userId");

-- CREATE POLICY "Users can delete own sessions" ON public."userSession"
--   FOR DELETE
--   USING (auth.uid() = "userId");

-- Service role can manage all sessions and magic links (used by API)
-- CREATE POLICY "Service role can manage all sessions" ON public."userSession"
--   FOR ALL
--   USING (auth.role() = 'service_role');

-- CREATE POLICY "Service role can manage all magic links" ON public."magicLink"
--   FOR ALL
--   USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE public."magicLink" IS 'RLS DISABLED FOR TESTING. Magic links are managed by service role only.';
COMMENT ON TABLE public."userSession" IS 'RLS DISABLED FOR TESTING. In production, users can only access their own sessions.';
