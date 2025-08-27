create table public.submission (
  id uuid not null default gen_random_uuid (),
  "userId" uuid not null,
  "rawFormJson" jsonb not null,
  "normalizedInput" jsonb not null,
  age integer null,
  gender public.gender null,
  "heightCm" integer null,
  "weightKg" numeric(5, 1) null,
  diet public.diet null,
  "proteinPreferences" text[] not null default '{}'::text[],
  "equipmentAvailable" text[] not null default '{}'::text[],
  "numRecipes" integer null,
  "numServings" integer null,
  "dislikedFoods" text null,
  "favoriteFoods" text null,
  "cookingLevel" public.cookingLevel null,
  "freeTextMessage" text null,
  locale text not null default 'fr-FR'::text,
  "unitSystem" text not null default 'metric'::text,
  consent boolean not null default true,
  "consentedAt" timestamp with time zone not null,
  "consentVersion" text not null default 'v1'::text,
  "recaptchaScore" numeric(3, 2) null,
  "recaptchaSuccess" boolean null,
  "recaptchaHostname" text null,
  "recaptchaAction" text null,
  "recaptchaChallengeTs" timestamp with time zone null,
  "ipAddress" inet null,
  "userAgent" text null,
  "runId" text null,
  status text not null default 'pending'::text,
  "createdAt" timestamp with time zone not null default now(),
  "activityDeskJob" boolean null,
  "activityDailySteps" text null,
  "activitySessionsPerWeek" text null,
  "activityHighIntensity" boolean null,
  constraint submission_pkey primary key (id),
  constraint submission_userId_fkey foreign KEY ("userId") references "user" (id) on delete CASCADE,
  constraint submission_activityDailySteps_check check (
    (
      "activityDailySteps" = any (array['<5k'::text, '5-8k'::text, '>8k'::text])
    )
  ),
  constraint submission_activitySessionsPerWeek_check check (
    (
      "activitySessionsPerWeek" = any (
        array['0'::text, '1-2'::text, '3-4'::text, '>=5'::text]
      )
    )
  ),
  constraint submission_age_check check (
    (
      (age >= 16)
      and (age <= 100)
    )
  ),
  constraint submission_heightCm_check check (
    (
      ("heightCm" >= 100)
      and ("heightCm" <= 250)
    )
  ),
  constraint submission_numRecipes_check check (
    (
      ("numRecipes" >= 2)
      and ("numRecipes" <= 7)
    )
  ),
  constraint submission_numServings_check check (
    (
      ("numServings" >= 1)
      and ("numServings" <= 4)
    )
  ),
  constraint equipmentAvailable_allowed check (
    (
      "equipmentAvailable" <@ array[
        'Oven'::text,
        'Blender'::text,
        'Thermomix'::text,
        'Air Fryer'::text
      ]
    )
  ),
  constraint submission_weightKg_check check (
    (
      ("weightKg" >= (40)::numeric)
      and ("weightKg" <= (150)::numeric)
    )
  ),
  constraint proteinPreferences_allowed check (
    (
      "proteinPreferences" <@ array[
        'Beef'::text,
        'Poultry'::text,
        'Fish'::text,
        'Eggs'::text,
        'Dairy'::text,
        'Tofu'::text,
        'Legumes'::text,
        'Meat alternatives'::text
      ]
    )
  )
) TABLESPACE pg_default;

create index IF not exists submission_user_created_idx on public.submission using btree ("userId", "createdAt" desc) TABLESPACE pg_default;

create index IF not exists idx_submission_userid on public.submission using btree ("userId") TABLESPACE pg_default;