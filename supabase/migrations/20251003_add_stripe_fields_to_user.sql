-- Stripe fields update - only add if not exists (safe for repeated runs)
-- This migration is now mostly redundant since the main schema includes these fields
-- But kept for backwards compatibility

DO $$
BEGIN
  -- Add status column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'status') THEN
    ALTER TABLE public."user" ADD COLUMN status text NOT NULL DEFAULT 'trial_available'
    CHECK (status IN ('trial_available', 'trial_used', 'paid_active', 'paid_expired'));
  END IF;

  -- Add subscription fields if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'subscriptionType') THEN
    ALTER TABLE public."user" ADD COLUMN "subscriptionType" text
    CHECK ("subscriptionType" IN ('monthly', 'yearly'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'paidUntil') THEN
    ALTER TABLE public."user" ADD COLUMN "paidUntil" timestamp with time zone;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'hasUsedPromo') THEN
    ALTER TABLE public."user" ADD COLUMN "hasUsedPromo" boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'hasUsedTrial') THEN
    ALTER TABLE public."user" ADD COLUMN "hasUsedTrial" boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'stripeCustomerId') THEN
    ALTER TABLE public."user" ADD COLUMN "stripeCustomerId" text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'stripeSubscriptionId') THEN
    ALTER TABLE public."user" ADD COLUMN "stripeSubscriptionId" text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'stripePriceId') THEN
    ALTER TABLE public."user" ADD COLUMN "stripePriceId" text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user' AND column_name = 'updatedAt') THEN
    ALTER TABLE public."user" ADD COLUMN "updatedAt" timestamp with time zone DEFAULT now();
  END IF;
END $$;

-- Create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_status ON public."user"(status);
CREATE INDEX IF NOT EXISTS idx_user_stripeCustomerId ON public."user"("stripeCustomerId");
CREATE INDEX IF NOT EXISTS idx_user_stripeSubscriptionId ON public."user"("stripeSubscriptionId");
CREATE INDEX IF NOT EXISTS idx_user_paidUntil ON public."user"("paidUntil") WHERE status = 'paid_active';
COMMENT ON COLUMN public."user".status IS 'User subscription status: trial_available (new user), trial_used (trial completed), paid_active (active subscription), paid_expired (payment failed or expired)';
COMMENT ON COLUMN public."user"."subscriptionType" IS 'Subscription plan type: monthly or yearly';
COMMENT ON COLUMN public."user"."paidUntil" IS 'Date until which the user has paid access';
COMMENT ON COLUMN public."user"."hasUsedPromo" IS 'Whether user has used a promotional offer';
COMMENT ON COLUMN public."user"."hasUsedTrial" IS 'Whether user has completed their trial period';
COMMENT ON COLUMN public."user"."stripeCustomerId" IS 'Stripe customer ID for payment management';
COMMENT ON COLUMN public."user"."stripeSubscriptionId" IS 'Stripe subscription ID for active subscriptions';
COMMENT ON COLUMN public."user"."stripePriceId" IS 'Stripe price ID for the current subscription plan';
