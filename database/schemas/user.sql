create table public.user (
  id uuid not null default gen_random_uuid (),
  email text not null,
  "firstName" text null,
  "createdAt" timestamp with time zone not null default now(),
  "lastSubmissionAt" timestamp with time zone null,
  "lastMenuResultId" uuid null,
  constraint user_pkey primary key (id),
  constraint user_email_key unique (email)
) TABLESPACE pg_default;