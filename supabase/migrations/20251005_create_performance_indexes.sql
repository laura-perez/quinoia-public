-- Create additional performance indexes for auth and dashboard queries
-- These optimize common query patterns for the new authentication system

-- Indexes for magicLink queries (token lookup, cleanup of expired tokens)
CREATE INDEX IF NOT EXISTS idx_magicLink_email_expiresAt ON public."magicLink"(email, "expiresAt");
CREATE INDEX IF NOT EXISTS idx_magicLink_usedAt ON public."magicLink"("usedAt") WHERE "usedAt" IS NULL;

-- Indexes for userSession queries (token validation, user session list)
CREATE INDEX IF NOT EXISTS idx_userSession_userId_expiresAt ON public."userSession"("userId", "expiresAt");
CREATE INDEX IF NOT EXISTS idx_userSession_token_expiresAt ON public."userSession"(token, "expiresAt");

-- Composite index for user status and subscription queries
CREATE INDEX IF NOT EXISTS idx_user_status_paidUntil ON public."user"(status, "paidUntil");

-- Index for menuResult user queries (dashboard menu history)
CREATE INDEX IF NOT EXISTS idx_menuResult_userId_createdAt ON public."menuResult"("userId", "createdAt" DESC);

-- Partial index for active menus only (most common query)
CREATE INDEX IF NOT EXISTS idx_menuResult_userId_shareActive ON public."menuResult"("userId") WHERE "shareActive" = true;

-- Comments for documentation
COMMENT ON INDEX public.idx_magicLink_email_expiresAt IS 'Optimizes magic link validation queries by email and expiration';
COMMENT ON INDEX public.idx_magicLink_usedAt IS 'Optimizes cleanup queries for unused magic links';
COMMENT ON INDEX public.idx_userSession_userId_expiresAt IS 'Optimizes user session listing and cleanup queries';
COMMENT ON INDEX public.idx_userSession_token_expiresAt IS 'Optimizes session token validation queries';
COMMENT ON INDEX public.idx_user_status_paidUntil IS 'Optimizes subscription status queries';
COMMENT ON INDEX public.idx_menuResult_userId_createdAt IS 'Optimizes dashboard menu history queries';
COMMENT ON INDEX public.idx_menuResult_userId_shareActive IS 'Optimizes active menu queries for dashboard';
