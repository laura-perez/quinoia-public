-- Add 'free' to allowed status values on user.status
-- This migration safely replaces the unnamed CHECK constraint that enumerates allowed statuses.

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop existing unnamed check constraint that enforces allowed status values
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public."user"'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%trial_available%trial_used%paid_active%paid_expired%'
  LOOP
    EXECUTE format('ALTER TABLE public."user" DROP CONSTRAINT IF EXISTS %I', r.conname);
  END LOOP;

  -- Add a named check constraint that includes the new 'free' status
  ALTER TABLE public."user"
    ADD CONSTRAINT chk_user_status_allowed CHECK (
      status::text = ANY (ARRAY['trial_available'::character varying, 'trial_used'::character varying, 'paid_active'::character varying, 'paid_expired'::character varying, 'free'::character varying]::text[])
    );
END$$;

-- Optional: update comment to include 'free'
COMMENT ON COLUMN public."user".status IS 'User subscription status: trial_available, trial_used, paid_active, paid_expired, free';
