-- Baseline: the `public` schema as it runs in production.
--
-- Assembled from the production catalogs (pg_get_constraintdef, pg_get_indexdef,
-- pg_get_functiondef, pg_get_triggerdef, pg_get_viewdef, pg_policies) and replaces the
-- historical migrations kept in supabase/migrations_archive/. The four marketStudy CHECK
-- constraints are written in the equivalent `IN (...)` form so that they deparse the same
-- way on PostgreSQL 16 and 17. The result was compared with production catalog by catalog.
-- It reproduces production as-is, including known quirks (redundant indexes, the
-- 'PAID_ACTIVE' casing in dashboard_data); fixes are made in later migrations.
-- Supabase-managed schemas (auth, storage, realtime, extensions, graphql, vault) and
-- grants are not part of this file; grants are handled by the harden_rls migration.
-- Requires the objects every Supabase project provides: the auth schema with
-- auth.uid() and auth.role() (used by the RLS policies).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

-- unaccent is installed in public in production and is called unqualified by "generateSlug".
create extension if not exists unaccent with schema public;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type public."activityLevel" as enum ('light', 'moderate', 'intense');
create type public."cookingLevel" as enum ('beginner', 'intermediate', 'advanced');
create type public.diet as enum ('omnivore', 'flexitarian', 'vegetarian', 'vegan');
create type public.gender as enum ('female', 'male', 'unspecified');

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public."generateSlug"(input text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT CASE
    WHEN input IS NULL THEN 'recipe'
    ELSE COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(
            lower(unaccent(input)),
            '[^a-z0-9]+','-','g'
          ),
          '(^-|-$)','', 'g'
        ),
        ''
      ),
      'recipe'
    )
  END
$function$;

CREATE OR REPLACE FUNCTION public.get_user_subscription_info(user_email text)
 RETURNS TABLE(status text, "subscriptionType" text, "paidUntil" timestamp with time zone, "hasUsedTrial" boolean, "stripeCustomerId" text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.status,
    u."subscriptionType",
    u."paidUntil",
    u."hasUsedTrial",
    u."stripeCustomerId"
  FROM public."user" u
  WHERE u.email = user_email;
END;
$function$;

CREATE OR REPLACE FUNCTION public.menuresult_set_weekstart()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW."weekStart" := date_trunc('week', COALESCE(NEW."createdAt", now()));
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_ingredient_name(input_name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(input_name, '[àáâãäå]', 'a', 'g'),
        '[èéêë]', 'e', 'g'
      ),
      '[^a-z0-9]', '-', 'g'
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public."setRecipeSlug"()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  base text;
  candidate text;
  suffix int := 2;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
    NEW.slug := public."generateSlug"(NEW.slug);
    RETURN NEW;
  END IF;

  base := public."generateSlug"(NEW."titleFr");
  candidate := base;

  WHILE EXISTS (
    SELECT 1 FROM public."recipe" r
    WHERE r.slug = candidate
  ) LOOP
    candidate := base || '-' || suffix;
    suffix := suffix + 1;
  END LOOP;

  NEW.slug := candidate;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_ingredient_alias_normalized()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW."normalizedForm" := public.normalize_ingredient_name(NEW."aliasName");
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_marketstudy_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW."updatedAt" = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_active_subscription(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  user_status text;
  paid_until timestamp with time zone;
BEGIN
  SELECT status, "paidUntil" INTO user_status, paid_until
  FROM public."user"
  WHERE email = user_email;

  IF user_status = 'paid_active' AND (paid_until IS NULL OR paid_until > now()) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public."user" (
  id uuid not null default gen_random_uuid(),
  email text not null,
  "firstName" text,
  "createdAt" timestamp with time zone not null default now(),
  "lastSubmissionAt" timestamp with time zone,
  "lastMenuResultId" uuid,
  status character varying(20) not null default 'trial_available'::character varying,
  "subscriptionType" character varying(20),
  "paidUntil" timestamp with time zone,
  "hasUsedPromo" boolean not null default false,
  "hasUsedTrial" boolean not null default false,
  "stripeCustomerId" text,
  "stripeSubscriptionId" text,
  "stripePriceId" text,
  "updatedAt" timestamp with time zone not null default now(),
  "lastLoginAt" timestamp with time zone,
  "isFirstLogin" boolean not null default true
);

create table public.submission (
  id uuid not null default gen_random_uuid(),
  "userId" uuid not null,
  "rawFormJson" jsonb not null,
  "normalizedInput" jsonb not null,
  age integer,
  gender public.gender,
  "heightCm" integer,
  "weightKg" numeric(5,1),
  diet public.diet,
  "proteinPreferences" text[] not null default '{}'::text[],
  "equipmentAvailable" text[] not null default '{}'::text[],
  "numRecipes" integer,
  "numServings" integer,
  "dislikedFoods" text,
  "favoriteFoods" text,
  "cookingLevel" public."cookingLevel",
  "freeTextMessage" text,
  locale text not null default 'fr-FR'::text,
  "unitSystem" text not null default 'metric'::text,
  consent boolean not null default true,
  "consentedAt" timestamp with time zone not null,
  "consentVersion" text not null default 'v1'::text,
  "recaptchaScore" numeric(3,2),
  "recaptchaSuccess" boolean,
  "recaptchaHostname" text,
  "recaptchaAction" text,
  "recaptchaChallengeTs" timestamp with time zone,
  "ipAddress" inet,
  "userAgent" text,
  "runId" text,
  status text not null default 'pending'::text,
  "createdAt" timestamp with time zone not null default now(),
  "activityDeskJob" boolean,
  "activityDailySteps" text,
  "activitySessionsPerWeek" text,
  "activityHighIntensity" boolean
);

create table public."menuResult" (
  id uuid not null default gen_random_uuid(),
  "submissionId" uuid not null,
  "userId" uuid not null,
  "resultBundle" jsonb not null,
  "numRecipes" integer not null,
  "numServings" integer not null,
  "shareId" text,
  "shareActive" boolean not null default true,
  "shareCreatedAt" timestamp with time zone not null default now(),
  "createdAt" timestamp with time zone not null default now(),
  "hasGeneratedInWindow" boolean not null default false,
  "hasSwappedInWindow" boolean not null default false,
  "weekStart" timestamp with time zone,
  "activeRecipeIds" uuid[] not null default '{}'::uuid[],
  "swapPoolRecipeIds" uuid[] not null default '{}'::uuid[],
  "swapsCount" integer not null default 0,
  "updatedAt" timestamp with time zone default now(),
  "removedRecipeIds" uuid[] default '{}'::uuid[]
);

create table public.recipe (
  id uuid not null default gen_random_uuid(),
  "titleFr" text not null,
  slug text not null,
  "servingsBase" integer not null,
  "prepTimeMinutes" integer not null,
  "caloriesPerServing" integer not null,
  "proteinGPerServing" numeric(5,2) not null,
  "carbsGPerServing" numeric(5,2) not null,
  "fatGPerServing" numeric(5,2) not null,
  diet text not null,
  "proteinCategory" text not null,
  "cookingLevel" text not null,
  "equipmentRequired" text[] not null default '{}'::text[],
  "batchFriendly" boolean not null default false,
  allergens text[] not null default '{}'::text[],
  ingredients jsonb not null,
  instructions text[] not null,
  tags text[] not null default '{}'::text[],
  "cuisineType" text,
  "imageFilename" text,
  "gptAutoEvaluation" jsonb,
  source text default 'gpt_generated'::text,
  status text not null default 'active'::text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  picture_file text,
  "cookingTip" jsonb,
  seasons text[] default '{}'::text[],
  "premiumUntil" timestamp with time zone
);

create table public."ingredientCanonical" (
  id uuid not null default gen_random_uuid(),
  "nameFr" text not null,
  category text not null,
  "sectionCode" text not null,
  "defaultUnit" text not null,
  "densityGPerMl" numeric(4,2),
  "commonAliases" text[] not null default '{}'::text[],
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create table public."ingredientAlias" (
  id uuid not null default gen_random_uuid(),
  "canonicalId" uuid not null,
  "aliasName" text not null,
  "normalizedForm" text not null,
  confidence numeric(3,2) default 1.0,
  source text default 'manual'::text,
  "createdAt" timestamp with time zone not null default now()
);

create table public."runLog" (
  id uuid not null default gen_random_uuid(),
  "submissionId" uuid,
  "menuResultId" uuid,
  "runId" text,
  node text not null,
  "inputJson" jsonb,
  "outputJson" jsonb,
  "tokensIn" integer,
  "tokensOut" integer,
  "costEstimateEur" numeric,
  status text not null default 'ok'::text,
  "startedAt" timestamp with time zone not null default now(),
  "endedAt" timestamp with time zone
);

create table public."magicLink" (
  id uuid not null default gen_random_uuid(),
  token text not null,
  email text not null,
  "expiresAt" timestamp with time zone not null,
  "usedAt" timestamp with time zone,
  "createdAt" timestamp with time zone not null default now(),
  "ipAddress" inet,
  "userAgent" text
);

create table public."userSession" (
  id uuid not null default gen_random_uuid(),
  token text not null,
  "userId" uuid not null,
  "expiresAt" timestamp with time zone not null,
  "createdAt" timestamp with time zone not null default now(),
  "lastUsedAt" timestamp with time zone not null default now(),
  "ipAddress" inet,
  "userAgent" text
);

create table public."paymentHistory" (
  id uuid not null default gen_random_uuid(),
  "userId" uuid not null,
  "stripePaymentIntentId" text,
  "stripeInvoiceId" text,
  "stripeSubscriptionId" text,
  amount numeric(10,2) not null,
  currency text not null default 'EUR'::text,
  status text not null,
  "subscriptionType" text,
  "paymentMethod" text,
  "failureReason" text,
  metadata jsonb,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

create table public."subscriptionEvent" (
  id uuid not null default gen_random_uuid(),
  "userId" uuid,
  "stripeEventId" text not null,
  "eventType" text not null,
  "stripeCustomerId" text,
  "stripeSubscriptionId" text,
  "eventData" jsonb not null,
  processed boolean not null default false,
  "processedAt" timestamp with time zone,
  "errorMessage" text,
  "createdAt" timestamp with time zone not null default now()
);

create table public."marketStudy" (
  id uuid not null default gen_random_uuid(),
  galeres text[] not null default '{}'::text[],
  "autreGalere" text,
  "solutionsActuelles" character varying(10) not null,
  "solutionActuelleName" text,
  "valeurPercue" character varying(20) not null,
  "prixAcceptable" character varying(10) not null,
  "veutTester" character varying(10) not null,
  email text,
  "userId" uuid,
  "submittedAt" timestamp with time zone not null default now(),
  "ipAddress" inet,
  "userAgent" text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now()
);

-- ---------------------------------------------------------------------------
-- Primary keys, unique and check constraints
-- ---------------------------------------------------------------------------

alter table public."user"
  add constraint user_pkey PRIMARY KEY (id),
  add constraint user_email_key UNIQUE (email),
  add constraint chk_user_status_allowed CHECK (((status)::text = ANY (ARRAY[('trial_available'::character varying)::text, ('trial_used'::character varying)::text, ('paid_active'::character varying)::text, ('paid_expired'::character varying)::text, ('free'::character varying)::text])));

alter table public.submission
  add constraint submission_pkey PRIMARY KEY (id),
  add constraint "equipmentAvailable_allowed" CHECK (("equipmentAvailable" <@ ARRAY['Oven'::text, 'Blender'::text, 'Thermomix'::text, 'Air Fryer'::text])),
  add constraint "proteinPreferences_allowed" CHECK (("proteinPreferences" <@ ARRAY['Beef'::text, 'Poultry'::text, 'Fish'::text, 'Eggs'::text, 'Dairy'::text, 'Tofu'::text, 'Legumes'::text, 'Meat alternatives'::text])),
  add constraint "submission_activityDailySteps_check" CHECK (("activityDailySteps" = ANY (ARRAY['<5k'::text, '5-8k'::text, '>8k'::text]))),
  add constraint "submission_activitySessionsPerWeek_check" CHECK (("activitySessionsPerWeek" = ANY (ARRAY['0'::text, '1-2'::text, '3-4'::text, '>=5'::text]))),
  add constraint submission_age_check CHECK (((age >= 16) AND (age <= 100))),
  add constraint "submission_heightCm_check" CHECK ((("heightCm" >= 100) AND ("heightCm" <= 250))),
  add constraint "submission_numRecipes_check" CHECK ((("numRecipes" >= 2) AND ("numRecipes" <= 7))),
  add constraint "submission_numServings_check" CHECK ((("numServings" >= 1) AND ("numServings" <= 4))),
  add constraint "submission_weightKg_check" CHECK ((("weightKg" >= (40)::numeric) AND ("weightKg" <= (150)::numeric)));

alter table public."menuResult"
  add constraint "menuResult_pkey" PRIMARY KEY (id),
  add constraint "menuResult_shareId_key" UNIQUE ("shareId");

alter table public.recipe
  add constraint recipe_pkey PRIMARY KEY (id),
  add constraint recipe_slug_key UNIQUE (slug),
  add constraint recipe_titlefr_unique UNIQUE ("titleFr"),
  add constraint "recipe_caloriesPerServing_check" CHECK (("caloriesPerServing" > 0)),
  add constraint "recipe_carbsGPerServing_check" CHECK (("carbsGPerServing" >= (0)::numeric)),
  add constraint "recipe_cookingLevel_check" CHECK (("cookingLevel" = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]))),
  add constraint recipe_diet_check CHECK ((diet = ANY (ARRAY['omnivore'::text, 'flexitarian'::text, 'vegetarian'::text, 'vegan'::text]))),
  add constraint "recipe_fatGPerServing_check" CHECK (("fatGPerServing" >= (0)::numeric)),
  add constraint "recipe_prepTimeMinutes_check" CHECK (("prepTimeMinutes" <= 30)),
  add constraint "recipe_proteinCategory_check" CHECK (("proteinCategory" = ANY (ARRAY['Beef'::text, 'Poultry'::text, 'Fish'::text, 'Eggs'::text, 'Dairy'::text, 'Tofu'::text, 'Legumes'::text, 'Meat alternatives'::text]))),
  add constraint "recipe_proteinGPerServing_check" CHECK (("proteinGPerServing" > (0)::numeric)),
  add constraint recipe_seasons_check CHECK ((seasons <@ ARRAY['printemps'::text, 'été'::text, 'automne'::text, 'hiver'::text])),
  add constraint "recipe_servingsBase_check" CHECK ((("servingsBase" >= 1) AND ("servingsBase" <= 8))),
  add constraint recipe_status_check CHECK ((status = ANY (ARRAY['active'::text, 'draft'::text, 'archived'::text, 'review_needed'::text])));

alter table public."ingredientCanonical"
  add constraint "ingredientCanonical_pkey" PRIMARY KEY (id),
  add constraint "ingredientCanonical_nameFr_key" UNIQUE ("nameFr"),
  add constraint "ingredientCanonical_defaultUnit_check" CHECK (("defaultUnit" = ANY (ARRAY['g'::text, 'ml'::text, 'piece'::text])));

alter table public."ingredientAlias"
  add constraint "ingredientAlias_pkey" PRIMARY KEY (id),
  add constraint "ingredientAlias_aliasName_canonicalId_key" UNIQUE ("aliasName", "canonicalId"),
  add constraint "ingredientAlias_confidence_check" CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
  add constraint "ingredientAlias_source_check" CHECK ((source = ANY (ARRAY['manual'::text, 'fuzzy_match'::text, 'gpt_mapping'::text])));

alter table public."runLog"
  add constraint "runLog_pkey" PRIMARY KEY (id);

alter table public."magicLink"
  add constraint "magicLink_pkey" PRIMARY KEY (id),
  add constraint "magicLink_token_key" UNIQUE (token);

alter table public."userSession"
  add constraint "userSession_pkey" PRIMARY KEY (id),
  add constraint "userSession_token_key" UNIQUE (token);

alter table public."paymentHistory"
  add constraint "paymentHistory_pkey" PRIMARY KEY (id),
  add constraint "paymentHistory_amount_check" CHECK ((amount > (0)::numeric)),
  add constraint "paymentHistory_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'refunded'::text]))),
  add constraint "paymentHistory_subscriptionType_check" CHECK (("subscriptionType" = ANY (ARRAY['monthly'::text, 'yearly'::text])));

alter table public."subscriptionEvent"
  add constraint "subscriptionEvent_pkey" PRIMARY KEY (id),
  add constraint "subscriptionEvent_stripeEventId_key" UNIQUE ("stripeEventId");

alter table public."marketStudy"
  add constraint "marketStudy_pkey" PRIMARY KEY (id),
  add constraint "marketStudy_prixAcceptable_check" CHECK ("prixAcceptable" in ('<5', '5-10', '10-20', '>20')),
  add constraint "marketStudy_solutionsActuelles_check" CHECK ("solutionsActuelles" in ('oui', 'non')),
  add constraint "marketStudy_valeurPercue_check" CHECK ("valeurPercue" in ('oui', 'non', 'peut-etre')),
  add constraint "marketStudy_veutTester_check" CHECK ("veutTester" in ('oui', 'non'));

-- ---------------------------------------------------------------------------
-- Foreign keys
-- ---------------------------------------------------------------------------

alter table public.submission
  add constraint "submission_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;

alter table public."menuResult"
  add constraint "menuResult_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES public.submission(id) ON DELETE CASCADE,
  add constraint "menuResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;

alter table public."ingredientAlias"
  add constraint "ingredientAlias_canonicalId_fkey" FOREIGN KEY ("canonicalId") REFERENCES public."ingredientCanonical"(id) ON DELETE CASCADE;

alter table public."runLog"
  add constraint "runLog_menuResultId_fkey" FOREIGN KEY ("menuResultId") REFERENCES public."menuResult"(id),
  add constraint "runLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES public.submission(id);

alter table public."userSession"
  add constraint "userSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;

alter table public."paymentHistory"
  add constraint "paymentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE CASCADE;

alter table public."subscriptionEvent"
  add constraint "subscriptionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE SET NULL;

alter table public."marketStudy"
  add constraint "marketStudy_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Indexes (constraint-backed indexes are created by the constraints above)
-- ---------------------------------------------------------------------------

CREATE INDEX idx_user_lastloginat ON public."user" USING btree ("lastLoginAt");
CREATE INDEX idx_user_paiduntil ON public."user" USING btree ("paidUntil") WHERE ("paidUntil" IS NOT NULL);
CREATE INDEX idx_user_status ON public."user" USING btree (status);
CREATE INDEX idx_user_status_paiduntil ON public."user" USING btree (status, "paidUntil");
CREATE INDEX idx_user_stripecustomerid ON public."user" USING btree ("stripeCustomerId") WHERE ("stripeCustomerId" IS NOT NULL);
CREATE INDEX idx_user_stripesubscriptionid ON public."user" USING btree ("stripeSubscriptionId") WHERE ("stripeSubscriptionId" IS NOT NULL);
CREATE INDEX idx_user_subscriptiontype ON public."user" USING btree ("subscriptionType") WHERE ("subscriptionType" IS NOT NULL);

CREATE INDEX idx_submission_userid ON public.submission USING btree ("userId");
CREATE INDEX submission_user_created_idx ON public.submission USING btree ("userId", "createdAt" DESC);

CREATE INDEX "menuResult_user_created_idx" ON public."menuResult" USING btree ("userId", "createdAt" DESC);
CREATE INDEX idx_menu_result_removed_recipe_ids ON public."menuResult" USING gin ("removedRecipeIds");
CREATE UNIQUE INDEX idx_menu_result_user_week ON public."menuResult" USING btree ("userId", "weekStart");
CREATE INDEX idx_menuresult_submissionid ON public."menuResult" USING btree ("submissionId");
CREATE INDEX idx_menuresult_userid ON public."menuResult" USING btree ("userId");
CREATE INDEX idx_menuresult_userid_createdat ON public."menuResult" USING btree ("userId", "createdAt" DESC);
CREATE INDEX idx_menuresult_userid_shareactive ON public."menuResult" USING btree ("userId") WHERE ("shareActive" = true);

CREATE INDEX idx_recipe_allergens ON public.recipe USING gin (allergens) WHERE (status = 'active'::text);
CREATE INDEX idx_recipe_caloriesperserving ON public.recipe USING btree ("caloriesPerServing") WHERE (status = 'active'::text);
CREATE INDEX idx_recipe_cookinglevel ON public.recipe USING btree ("cookingLevel") WHERE (status = 'active'::text);
CREATE INDEX idx_recipe_diet ON public.recipe USING btree (diet) WHERE (status = 'active'::text);
CREATE INDEX idx_recipe_equipmentrequired ON public.recipe USING gin ("equipmentRequired") WHERE (status = 'active'::text);
CREATE INDEX idx_recipe_premium_until ON public.recipe USING btree ("premiumUntil") WHERE ("premiumUntil" IS NOT NULL);
CREATE INDEX idx_recipe_proteincategory ON public.recipe USING btree ("proteinCategory") WHERE (status = 'active'::text);
CREATE INDEX idx_recipe_proteingperserving ON public.recipe USING btree ("proteinGPerServing") WHERE (status = 'active'::text);
CREATE INDEX idx_recipe_seasons ON public.recipe USING gin (seasons);
CREATE INDEX idx_recipe_tags ON public.recipe USING gin (tags) WHERE (status = 'active'::text);
CREATE INDEX idx_recipe_titlefr ON public.recipe USING btree ("titleFr");
CREATE UNIQUE INDEX recipe_slug_unique ON public.recipe USING btree (slug);

CREATE INDEX idx_ingredientcanonical_category ON public."ingredientCanonical" USING btree (category);
CREATE INDEX idx_ingredientcanonical_namefr ON public."ingredientCanonical" USING btree ("nameFr");
CREATE INDEX idx_ingredientcanonical_sectioncode ON public."ingredientCanonical" USING btree ("sectionCode");

CREATE INDEX idx_ingredientalias_aliasname ON public."ingredientAlias" USING btree ("aliasName");
CREATE INDEX idx_ingredientalias_canonicalid ON public."ingredientAlias" USING btree ("canonicalId");
CREATE INDEX idx_ingredientalias_normalizedform ON public."ingredientAlias" USING btree ("normalizedForm");

CREATE INDEX idx_runlog_menuresultid ON public."runLog" USING btree ("menuResultId");
CREATE INDEX idx_runlog_submissionid ON public."runLog" USING btree ("submissionId");

CREATE INDEX idx_magiclink_email ON public."magicLink" USING btree (email);
CREATE INDEX idx_magiclink_email_expiresat ON public."magicLink" USING btree (email, "expiresAt");
CREATE INDEX idx_magiclink_expiresat ON public."magicLink" USING btree ("expiresAt");
CREATE INDEX idx_magiclink_token ON public."magicLink" USING btree (token);
CREATE INDEX idx_magiclink_usedat ON public."magicLink" USING btree ("usedAt") WHERE ("usedAt" IS NULL);

CREATE INDEX idx_usersession_expiresat ON public."userSession" USING btree ("expiresAt");
CREATE INDEX idx_usersession_token ON public."userSession" USING btree (token);
CREATE INDEX idx_usersession_token_expiresat ON public."userSession" USING btree (token, "expiresAt");
CREATE INDEX idx_usersession_userid ON public."userSession" USING btree ("userId");
CREATE INDEX idx_usersession_userid_expiresat ON public."userSession" USING btree ("userId", "expiresAt");

CREATE INDEX idx_paymenthistory_status ON public."paymentHistory" USING btree (status);
CREATE INDEX idx_paymenthistory_userid ON public."paymentHistory" USING btree ("userId", "createdAt" DESC);

CREATE INDEX idx_subscriptionevent_processed ON public."subscriptionEvent" USING btree (processed, "createdAt") WHERE (processed = false);
CREATE INDEX idx_subscriptionevent_stripeeventid ON public."subscriptionEvent" USING btree ("stripeEventId");

CREATE INDEX idx_marketstudy_submittedat ON public."marketStudy" USING btree ("submittedAt");
CREATE INDEX idx_marketstudy_userid ON public."marketStudy" USING btree ("userId") WHERE ("userId" IS NOT NULL);
CREATE INDEX idx_marketstudy_valeurpercue ON public."marketStudy" USING btree ("valeurPercue");
CREATE INDEX idx_marketstudy_veuttester ON public."marketStudy" USING btree ("veutTester");

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER user_updatedat BEFORE UPDATE ON public."user" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_menuresult_set_weekstart BEFORE INSERT OR UPDATE ON public."menuResult" FOR EACH ROW EXECUTE FUNCTION public.menuresult_set_weekstart();
CREATE TRIGGER recipe_set_slug BEFORE INSERT ON public.recipe FOR EACH ROW EXECUTE FUNCTION public."setRecipeSlug"();
CREATE TRIGGER recipe_updatedat BEFORE UPDATE ON public.recipe FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ingredientcanonical_updatedat BEFORE UPDATE ON public."ingredientCanonical" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER ingredientalias_normalize BEFORE INSERT OR UPDATE ON public."ingredientAlias" FOR EACH ROW EXECUTE FUNCTION public.update_ingredient_alias_normalized();
CREATE TRIGGER paymenthistory_updatedat BEFORE UPDATE ON public."paymentHistory" FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_marketstudy_updated_at BEFORE UPDATE ON public."marketStudy" FOR EACH ROW EXECUTE FUNCTION public.update_marketstudy_updated_at();

-- ---------------------------------------------------------------------------
-- Views (security_invoker: they run with the caller's privileges and RLS)
-- ---------------------------------------------------------------------------

create view public.dashboard_data with (security_invoker = on) as
 SELECT u.id AS user_id,
    u.email,
    u.status,
    u."firstName",
    u."isFirstLogin",
    u."lastMenuResultId",
    s.id AS submission_id,
    s.age,
    s.gender,
    s.diet,
    s."proteinPreferences",
    s."equipmentAvailable",
    s."cookingLevel",
    s."numRecipes" AS submission_num_recipes,
    s."numServings" AS submission_num_servings,
    s."dislikedFoods",
    s."favoriteFoods",
    mr_current.id AS current_menu_id,
    mr_current."activeRecipeIds",
    mr_current."swapPoolRecipeIds",
    mr_current."numRecipes" AS menu_num_recipes,
    mr_current."numServings" AS menu_num_servings,
    mr_current."swapsCount",
    mr_current."createdAt" AS menu_created_at,
    mr_latest.id AS latest_menu_id,
    mr_latest."createdAt" AS latest_menu_created_at,
    mr_latest."hasSwappedInWindow",
        CASE
            WHEN ((u.status)::text = 'PAID_ACTIVE'::text) THEN true
            WHEN (mr_latest.id IS NULL) THEN true
            ELSE false
        END AS can_generate_menu,
        CASE
            WHEN ((u.status)::text = 'PAID_ACTIVE'::text) THEN true
            WHEN (mr_latest.id IS NULL) THEN false
            WHEN (mr_latest."hasSwappedInWindow" = false) THEN true
            ELSE false
        END AS can_swap,
        CASE
            WHEN ((u.status)::text = 'PAID_ACTIVE'::text) THEN NULL::integer
            ELSE 1
        END AS menu_quota_limit,
        CASE
            WHEN ((u.status)::text = 'PAID_ACTIVE'::text) THEN NULL::integer
            ELSE 1
        END AS swap_quota_limit,
        CASE
            WHEN ((u.status)::text = 'PAID_ACTIVE'::text) THEN 0
            WHEN (mr_latest.id IS NULL) THEN 0
            ELSE 1
        END AS menus_generated_this_window,
        CASE
            WHEN ((u.status)::text = 'PAID_ACTIVE'::text) THEN 0
            WHEN (mr_latest."hasSwappedInWindow" = true) THEN 1
            ELSE 0
        END AS swaps_used_this_menu,
        CASE
            WHEN ((u.status)::text = 'PAID_ACTIVE'::text) THEN NULL::timestamp with time zone
            WHEN (mr_latest."createdAt" IS NOT NULL) THEN (mr_latest."createdAt" + '7 days'::interval)
            ELSE (now() + '7 days'::interval)
        END AS next_quota_reset
   FROM (((public."user" u
     LEFT JOIN public.submission s ON ((s."userId" = u.id)))
     LEFT JOIN public."menuResult" mr_current ON ((mr_current.id = u."lastMenuResultId")))
     LEFT JOIN LATERAL ( SELECT "menuResult".id,
            "menuResult"."createdAt",
            "menuResult"."hasSwappedInWindow"
           FROM public."menuResult"
          WHERE (("menuResult"."userId" = u.id) AND ("menuResult"."createdAt" >= (now() - '7 days'::interval)))
          ORDER BY "menuResult"."createdAt" DESC
         LIMIT 1) mr_latest ON (true));

create view public."userQuotaStatus" with (security_invoker = on) as
 SELECT id AS "userId",
    email,
    status,
    "lastSubmissionAt" AS "lastMenuGeneratedAt",
    COALESCE(( SELECT count(*) AS count
           FROM public."menuResult" mr
          WHERE ((mr."userId" = u.id) AND (mr."createdAt" >= u."lastSubmissionAt"))), (0)::bigint) AS "menusGeneratedThisWindow",
    COALESCE(( SELECT mr."swapsCount"
           FROM public."menuResult" mr
          WHERE (mr.id = u."lastMenuResultId")), 0) AS "swapsUsedThisMenu",
        CASE
            WHEN ((status)::text = 'paid_active'::text) THEN NULL::integer
            ELSE 1
        END AS "menuQuotaLimit",
        CASE
            WHEN ((status)::text = 'paid_active'::text) THEN NULL::integer
            ELSE 1
        END AS "swapQuotaLimit",
        CASE
            WHEN ("lastSubmissionAt" IS NOT NULL) THEN ("lastSubmissionAt" + '7 days'::interval)
            ELSE NULL::timestamp with time zone
        END AS "nextQuotaReset",
        CASE
            WHEN ((status)::text = 'paid_active'::text) THEN true
            WHEN ("lastSubmissionAt" IS NULL) THEN true
            WHEN (("lastSubmissionAt" + '7 days'::interval) <= now()) THEN true
            ELSE false
        END AS "canGenerateMenu"
   FROM public."user" u;

create view public."userRecency" with (security_invoker = on) as
 WITH recipe_last_seen AS (
         SELECT mr."userId",
            recipe_id.recipe_id,
            max(mr."createdAt") AS last_seen_at
           FROM (public."menuResult" mr
             CROSS JOIN LATERAL unnest(mr."activeRecipeIds") recipe_id(recipe_id))
          WHERE (mr."createdAt" >= (now() - '21 days'::interval))
          GROUP BY mr."userId", recipe_id.recipe_id
        )
 SELECT "userId",
    array_agg(recipe_id) FILTER (WHERE true) AS "excludeRecipeIds",
    COALESCE(jsonb_object_agg(recipe_id, jsonb_build_object('lastSeenAt', last_seen_at, 'daysSince', ((now())::date - (last_seen_at)::date))) FILTER (WHERE (recipe_id IS NOT NULL)), '{}'::jsonb) AS "recipeTimestamps"
   FROM recipe_last_seen
  GROUP BY "userId";

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public."user"                enable row level security;
alter table public.submission            enable row level security;
alter table public."menuResult"          enable row level security;
alter table public.recipe                enable row level security;
alter table public."ingredientCanonical" enable row level security;
alter table public."ingredientAlias"     enable row level security;
alter table public."runLog"              enable row level security;
alter table public."magicLink"           enable row level security;
alter table public."userSession"         enable row level security;
alter table public."paymentHistory"      enable row level security;
alter table public."subscriptionEvent"   enable row level security;
alter table public."marketStudy"         enable row level security;

create policy user_access_policy on public."user" as permissive for all to public
  using (((auth.uid() = id) OR (auth.role() = 'service_role'::text)))
  with check (((auth.uid() = id) OR (auth.role() = 'service_role'::text)));

create policy submission_is_owner on public.submission as permissive for all to public
  using ((auth.uid() = "userId"))
  with check ((auth.uid() = "userId"));

create policy "menuResult_is_owner" on public."menuResult" as permissive for all to public
  using ((auth.uid() = "userId"))
  with check ((auth.uid() = "userId"));

-- ---------------------------------------------------------------------------
-- Comments
-- ---------------------------------------------------------------------------

comment on table public."magicLink" is 'Magic link tokens for passwordless authentication. Tokens expire after 15 minutes.';
comment on column public."magicLink".token is 'Unique token (UUID v4) sent in magic link email';
comment on column public."magicLink".email is 'Email address associated with this magic link';
comment on column public."magicLink"."expiresAt" is 'Expiration timestamp (15 minutes after creation)';
comment on column public."magicLink"."usedAt" is 'Timestamp when token was used (null if unused)';
comment on column public."magicLink"."ipAddress" is 'IP address from which the magic link was requested';
comment on column public."magicLink"."userAgent" is 'User agent from which the magic link was requested';

comment on table public."marketStudy" is 'Survey responses for market study validation';
comment on column public."marketStudy".galeres is 'Array of selected pain points (max 2)';
comment on column public."marketStudy"."autreGalere" is 'Custom pain point if "Autre" selected';
comment on column public."marketStudy"."solutionsActuelles" is 'Whether user uses existing solutions';
comment on column public."marketStudy"."solutionActuelleName" is 'Name of current solution if any';
comment on column public."marketStudy"."valeurPercue" is 'Willingness to pay for solution';
comment on column public."marketStudy"."prixAcceptable" is 'Acceptable monthly price range';
comment on column public."marketStudy"."veutTester" is 'Interest in beta testing';
comment on column public."marketStudy".email is 'Email for beta testing (optional)';
comment on column public."marketStudy"."userId" is 'Link to user table if email provided';

comment on column public."menuResult"."removedRecipeIds" is 'Array of recipe IDs that user has explicitly removed from this menu (prevents them from reappearing in refetch)';

comment on table public."paymentHistory" is 'Historical record of all payments and refunds for analytics and support';

comment on column public.recipe.picture_file is 'references the name of the recipe picture file';
comment on column public.recipe."cookingTip" is 'JSON structure with 4 cooking tips: original, ingredient substitute, cooking technique, and time saver';
comment on column public.recipe.seasons is 'Seasons when this recipe is most appropriate (printemps, été, automne, hiver). Empty array = available year-round. Used for STRICT EXCLUSION filtering (not scoring).';
comment on column public.recipe."premiumUntil" is 'Timestamp until which this recipe is exclusive to premium users. NULL = available to all users immediately. Set to createdAt + 14 days for new recipes.';

comment on column public.submission."activityDeskJob" is 'Whether the user has a desk job';
comment on column public.submission."activityDailySteps" is 'Daily steps range: <5k, 5-8k, >8k';
comment on column public.submission."activitySessionsPerWeek" is 'Exercise sessions per week: 0, 1-2, 3-4, >=5';
comment on column public.submission."activityHighIntensity" is 'Whether user does high intensity exercise';

comment on table public."subscriptionEvent" is 'Log of all Stripe webhook events for debugging and audit trail';

comment on column public."user".status is 'User subscription status: trial_available, trial_used, paid_active, paid_expired, free';
comment on column public."user"."subscriptionType" is 'Subscription plan type: monthly or yearly';
comment on column public."user"."paidUntil" is 'Date until which the user has paid access';
comment on column public."user"."hasUsedPromo" is 'Whether user has used a promotional offer';
comment on column public."user"."hasUsedTrial" is 'Whether user has completed their trial period';
comment on column public."user"."stripeCustomerId" is 'Stripe customer ID for payment management';
comment on column public."user"."stripeSubscriptionId" is 'Stripe subscription ID for active subscriptions';
comment on column public."user"."stripePriceId" is 'Stripe price ID for the current subscription plan';
comment on column public."user"."lastLoginAt" is 'Timestamp of last successful login (magic link authentication)';
comment on column public."user"."isFirstLogin" is 'Whether the user has completed their first login (used for onboarding flow)';

comment on table public."userSession" is 'User sessions for authenticated API requests. Sessions expire after 30 days.';
comment on column public."userSession".token is 'Unique session token (UUID v4)';
comment on column public."userSession"."userId" is 'User ID associated with this session';
comment on column public."userSession"."expiresAt" is 'Expiration timestamp (30 days after creation)';
comment on column public."userSession"."lastUsedAt" is 'Timestamp of last API request with this session token';
comment on column public."userSession"."ipAddress" is 'IP address from which the session was created';
comment on column public."userSession"."userAgent" is 'User agent from which the session was created';

comment on view public.dashboard_data is 'Unified view for dashboard API - combines user, submission, current menu, and quota calculations. Optimizes dashboard load from 6-7 queries to 1 query (~75% latency reduction).';
comment on view public."userQuotaStatus" is 'Real-time quota status for each user (rolling 7-day window based on lastSubmissionAt)';
comment on view public."userRecency" is 'Tracks active recipes per user with timestamps for freshness scoring. Cleaned up 2025-10-26 to remove unused recentStrict/recentSoft fields.';

comment on index public.idx_magiclink_email_expiresat is 'Optimizes magic link validation queries by email and expiration';
comment on index public.idx_magiclink_usedat is 'Optimizes cleanup queries for unused magic links';
comment on index public.idx_menuresult_userid_createdat is 'Optimizes dashboard menu history queries';
comment on index public.idx_menuresult_userid_shareactive is 'Optimizes active menu queries for dashboard';
comment on index public.idx_user_status_paiduntil is 'Optimizes subscription status queries';
comment on index public.idx_usersession_token_expiresat is 'Optimizes session token validation queries';
comment on index public.idx_usersession_userid_expiresat is 'Optimizes user session listing and cleanup queries';
