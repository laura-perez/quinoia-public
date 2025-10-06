-- Create userSession table for session management
-- Sessions expire after 30 days
-- Used for authenticated API requests

CREATE TABLE IF NOT EXISTS public."userSession" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  "userId" uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  "expiresAt" timestamp with time zone NOT NULL,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "lastUsedAt" timestamp with time zone NOT NULL DEFAULT now(),
  "ipAddress" inet,
  "userAgent" text
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_userSession_token ON public."userSession"(token);
CREATE INDEX IF NOT EXISTS idx_userSession_userId ON public."userSession"("userId");
CREATE INDEX IF NOT EXISTS idx_userSession_expiresAt ON public."userSession"("expiresAt");

-- Comments for documentation
COMMENT ON TABLE public."userSession" IS 'User sessions for authenticated API requests. Sessions expire after 30 days.';
COMMENT ON COLUMN public."userSession".token IS 'Unique session token (UUID v4)';
COMMENT ON COLUMN public."userSession"."userId" IS 'User ID associated with this session';
COMMENT ON COLUMN public."userSession"."expiresAt" IS 'Expiration timestamp (30 days after creation)';
COMMENT ON COLUMN public."userSession"."lastUsedAt" IS 'Timestamp of last API request with this session token';
COMMENT ON COLUMN public."userSession"."ipAddress" IS 'IP address from which the session was created';
COMMENT ON COLUMN public."userSession"."userAgent" IS 'User agent from which the session was created';
