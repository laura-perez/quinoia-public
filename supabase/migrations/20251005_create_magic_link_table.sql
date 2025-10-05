-- Create magicLink table for passwordless authentication
-- Tokens expire after 15 minutes
-- Used for magic link email authentication

CREATE TABLE IF NOT EXISTS public."magicLink" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  "expiresAt" timestamp with time zone NOT NULL,
  "usedAt" timestamp with time zone,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "ipAddress" inet,
  "userAgent" text
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_magicLink_token ON public."magicLink"(token);
CREATE INDEX IF NOT EXISTS idx_magicLink_email ON public."magicLink"(email);
CREATE INDEX IF NOT EXISTS idx_magicLink_expiresAt ON public."magicLink"("expiresAt");

-- Comments for documentation
COMMENT ON TABLE public."magicLink" IS 'Magic link tokens for passwordless authentication. Tokens expire after 15 minutes.';
COMMENT ON COLUMN public."magicLink".token IS 'Unique token (UUID v4) sent in magic link email';
COMMENT ON COLUMN public."magicLink".email IS 'Email address associated with this magic link';
COMMENT ON COLUMN public."magicLink"."expiresAt" IS 'Expiration timestamp (15 minutes after creation)';
COMMENT ON COLUMN public."magicLink"."usedAt" IS 'Timestamp when token was used (null if unused)';
COMMENT ON COLUMN public."magicLink"."ipAddress" IS 'IP address from which the magic link was requested';
COMMENT ON COLUMN public."magicLink"."userAgent" IS 'User agent from which the magic link was requested';
