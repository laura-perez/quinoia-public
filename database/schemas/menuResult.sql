create table public."menuResult" (
  id uuid not null default gen_random_uuid (),
  "submissionId" uuid not null,
  "userId" uuid not null,
  "resultBundle" jsonb not null,
  "numRecipes" integer not null,
  "numServings" integer not null,
  "shareId" text null,
  "shareActive" boolean not null default true,
  "shareCreatedAt" timestamp with time zone not null default now(),
  "createdAt" timestamp with time zone not null default now(),
  constraint menuResult_pkey primary key (id),
  constraint menuResult_shareId_key unique ("shareId"),
  constraint menuResult_submissionId_fkey foreign KEY ("submissionId") references submission (id) on delete CASCADE,
  constraint menuResult_userId_fkey foreign KEY ("userId") references "user" (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists "menuResult_user_created_idx" on public."menuResult" using btree ("userId", "createdAt" desc) TABLESPACE pg_default;

create index IF not exists idx_menuresult_submissionid on public."menuResult" using btree ("submissionId") TABLESPACE pg_default;

create index IF not exists idx_menuresult_userid on public."menuResult" using btree ("userId") TABLESPACE pg_default;