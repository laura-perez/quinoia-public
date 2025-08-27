create table public.recipe (
  id uuid not null default gen_random_uuid (),
  "titleFr" text not null,
  slug text not null,
  "servingsBase" integer not null,
  "prepTimeMinutes" integer not null,
  "caloriesPerServing" integer not null,
  "proteinGPerServing" numeric(5, 2) not null,
  "carbsGPerServing" numeric(5, 2) not null,
  "fatGPerServing" numeric(5, 2) not null,
  diet text not null,
  "proteinCategory" text not null,
  "cookingLevel" text not null,
  "equipmentRequired" text[] not null default '{}'::text[],
  "batchFriendly" boolean not null default false,
  allergens text[] not null default '{}'::text[],
  ingredients jsonb not null,
  instructions text[] not null,
  tags text[] not null default '{}'::text[],
  "cuisineType" text null,
  "imageFilename" text null,
  "cookingTip" text null,
  "gptAutoEvaluation" jsonb null,
  source text null default 'gpt_generated'::text,
  status text not null default 'active'::text,
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint recipe_pkey primary key (id),
  constraint recipe_slug_key unique (slug),
  constraint recipe_titlefr_unique unique ("titleFr"),
  constraint recipe_diet_check check (
    (
      diet = any (
        array[
          'omnivore'::text,
          'flexitarian'::text,
          'vegetarian'::text,
          'vegan'::text
        ]
      )
    )
  ),
  constraint recipe_fatGPerServing_check check (("fatGPerServing" >= (0)::numeric)),
  constraint recipe_caloriesPerServing_check check (("caloriesPerServing" > 0)),
  constraint recipe_proteinCategory_check check (
    (
      "proteinCategory" = any (
        array[
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
  ),
  constraint recipe_proteinGPerServing_check check (("proteinGPerServing" > (0)::numeric)),
  constraint recipe_servingsBase_check check (
    (
      ("servingsBase" >= 1)
      and ("servingsBase" <= 8)
    )
  ),
  constraint recipe_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'draft'::text,
          'archived'::text,
          'review_needed'::text
        ]
      )
    )
  ),
  constraint recipe_prepTimeMinutes_check check (("prepTimeMinutes" <= 30)),
  constraint recipe_carbsGPerServing_check check (("carbsGPerServing" >= (0)::numeric)),
  constraint recipe_cookingLevel_check check (
    (
      "cookingLevel" = any (
        array[
          'beginner'::text,
          'intermediate'::text,
          'advanced'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_recipe_diet on public.recipe using btree (diet) TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_recipe_proteincategory on public.recipe using btree ("proteinCategory") TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_recipe_cookinglevel on public.recipe using btree ("cookingLevel") TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_recipe_caloriesperserving on public.recipe using btree ("caloriesPerServing") TABLESPACE pg_default
where
  (status = 'active'::text);

create unique INDEX IF not exists recipe_slug_unique on public.recipe using btree (slug) TABLESPACE pg_default;

create index IF not exists idx_recipe_proteingperserving on public.recipe using btree ("proteinGPerServing") TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_recipe_equipmentrequired on public.recipe using gin ("equipmentRequired") TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_recipe_tags on public.recipe using gin (tags) TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_recipe_allergens on public.recipe using gin (allergens) TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_recipe_titlefr on public.recipe using btree ("titleFr") TABLESPACE pg_default;

create trigger recipe_set_slug BEFORE INSERT on recipe for EACH row
execute FUNCTION "setRecipeSlug" ();

create trigger recipe_updatedat BEFORE
update on recipe for EACH row
execute FUNCTION update_updated_at_column ();