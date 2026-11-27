-- Migration: consolidate quota state into menuResult and drop userQuotaStatus view
-- Adds boolean flags to menuResult to represent generation/swap usage in the window
-- Creates unique index per user/week to prevent more than one menuResult per user per week
-- Updates new flags from existing data and drops the userQuotaStatus view

BEGIN;

-- Add flags to menuResult (camelCase columns)
ALTER TABLE IF EXISTS "menuResult"
  ADD COLUMN IF NOT EXISTS "hasGeneratedInWindow" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "hasSwappedInWindow" boolean DEFAULT false NOT NULL;

-- Backfill hasGeneratedInWindow for recent rows (last 7 days)
UPDATE "menuResult"
SET "hasGeneratedInWindow" = true
WHERE "createdAt" >= (now() - INTERVAL '7 days');

-- Backfill hasSwappedInWindow from swapsCount if column exists
DO $$
BEGIN
  IF EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_name='menuResult' AND column_name='swapsCount'
  ) THEN
    UPDATE "menuResult"
    SET "hasSwappedInWindow" = CASE WHEN COALESCE("swapsCount", 0) > 0 THEN true ELSE false END
    WHERE "createdAt" >= (now() - INTERVAL '7 days');
  END IF;
END$$;

-- Add a stored weekStart column to represent the week bucket and index it.
-- Using a stored column avoids using non-immutable functions in index expressions.
ALTER TABLE IF EXISTS "menuResult"
  ADD COLUMN IF NOT EXISTS "weekStart" timestamptz;

-- Backfill weekStart from createdAt for existing rows
UPDATE "menuResult"
SET "weekStart" = date_trunc('week', "createdAt")
WHERE "weekStart" IS NULL;

-- Create a trigger function to set weekStart on insert/update
CREATE OR REPLACE FUNCTION public.menuresult_set_weekstart()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW."weekStart" := date_trunc('week', COALESCE(NEW."createdAt", now()));
  RETURN NEW;
END;
$$;

-- Attach trigger to menuResult to maintain weekStart
DROP TRIGGER IF EXISTS trg_menuresult_set_weekstart ON public."menuResult";
CREATE TRIGGER trg_menuresult_set_weekstart
BEFORE INSERT OR UPDATE ON public."menuResult"
FOR EACH ROW
EXECUTE FUNCTION public.menuresult_set_weekstart();

-- Create a unique index on (userId, weekStart) to prevent multiple menuResult per user/week
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_result_user_week
  ON "menuResult" ("userId", "weekStart");

-- Drop the userQuotaStatus view (we will derive quota from menuResult)
DROP VIEW IF EXISTS "userQuotaStatus";

COMMIT;
