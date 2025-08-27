create table public."ingredientCanonical" (
  id uuid not null default gen_random_uuid (),
  "nameFr" text not null,
  category text not null,
  "sectionCode" text not null,
  "defaultUnit" text not null,
  "densityGPerMl" numeric(4, 2) null,
  "commonAliases" text[] not null default '{}'::text[],
  "createdAt" timestamp with time zone not null default now(),
  "updatedAt" timestamp with time zone not null default now(),
  constraint ingredientCanonical_pkey primary key (id),
  constraint ingredientCanonical_nameFr_key unique ("nameFr"),
  constraint ingredientCanonical_defaultUnit_check check (
    (
      "defaultUnit" = any (array['g'::text, 'ml'::text, 'piece'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_ingredientcanonical_namefr on public."ingredientCanonical" using btree ("nameFr") TABLESPACE pg_default;

create index IF not exists idx_ingredientcanonical_category on public."ingredientCanonical" using btree (category) TABLESPACE pg_default;

create index IF not exists idx_ingredientcanonical_sectioncode on public."ingredientCanonical" using btree ("sectionCode") TABLESPACE pg_default;

create trigger ingredientcanonical_updatedat BEFORE
update on "ingredientCanonical" for EACH row
execute FUNCTION update_updated_at_column ();