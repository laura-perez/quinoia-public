-- Add authentication-related fields to user table
-- Following the safe pattern with IF NOT EXISTS checks

DO $$
BEGIN
  -- Add lastLoginAt column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'lastLoginAt') THEN
    ALTER TABLE public."user" ADD COLUMN "lastLoginAt" timestamp with time zone;
  END IF;

  -- Add isFirstLogin column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'isFirstLogin') THEN
    ALTER TABLE public."user" ADD COLUMN "isFirstLogin" boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Create index for lastLoginAt (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_user_lastLoginAt ON public."user"("lastLoginAt");

-- Comments for documentation
COMMENT ON COLUMN public."user"."lastLoginAt" IS 'Timestamp of last successful login (magic link authentication)';
COMMENT ON COLUMN public."user"."isFirstLogin" IS 'Whether the user has completed their first login (used for onboarding flow)';
