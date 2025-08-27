create table public."userRecipeHistory" (
  id uuid not null default gen_random_uuid (),
  "userId" uuid not null,
  "recipeId" uuid not null,
  "menuResultId" uuid null,
  "consumedAt" timestamp with time zone not null default now(),
  "servingCount" integer not null default 1,
  "userRating" integer null,
  "createdAt" timestamp with time zone not null default now(),
  constraint userRecipeHistory_pkey primary key (id),
  constraint userRecipeHistory_menuResultId_fkey foreign KEY ("menuResultId") references "menuResult" (id) on delete set null,
  constraint userRecipeHistory_recipeId_fkey foreign KEY ("recipeId") references recipe (id) on delete CASCADE,
  constraint userRecipeHistory_userId_fkey foreign KEY ("userId") references "user" (id) on delete CASCADE,
  constraint userRecipeHistory_userRating_check check (
    (
      ("userRating" >= 1)
      and ("userRating" <= 5)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_userrecipehistory_userid on public."userRecipeHistory" using btree ("userId", "consumedAt" desc) TABLESPACE pg_default;

create index IF not exists idx_userrecipehistory_recipeid on public."userRecipeHistory" using btree ("recipeId") TABLESPACE pg_default;

create index IF not exists idx_userrecipehistory_menuresultid on public."userRecipeHistory" using btree ("menuResultId") TABLESPACE pg_default;