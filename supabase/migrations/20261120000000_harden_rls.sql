-- Harden database access for public exposure.
-- The application only talks to Postgres through the service_role key (server-side),
-- which bypasses RLS. The anon/authenticated roles must therefore have no direct access.
-- IF EXISTS keeps this migration applicable to every environment.

-- 1. Enable RLS on every public table (no policy = deny for anon/authenticated)
alter table if exists public."user"                enable row level security;
alter table if exists public."submission"          enable row level security;
alter table if exists public."menuResult"          enable row level security;
alter table if exists public."userRecipeHistory"   enable row level security;
alter table if exists public."userSession"         enable row level security;
alter table if exists public."magicLink"           enable row level security;
alter table if exists public."paymentHistory"      enable row level security;
alter table if exists public."subscriptionEvent"   enable row level security;
alter table if exists public."marketStudy"         enable row level security;
alter table if exists public."runLog"              enable row level security;
alter table if exists public."recipe"              enable row level security;
alter table if exists public."ingredientCanonical" enable row level security;
alter table if exists public."ingredientAlias"     enable row level security;

-- 2. Views run with the caller's privileges instead of the owner's (no RLS bypass)
alter view if exists public."dashboard_data"  set (security_invoker = on);
alter view if exists public."userQuotaStatus" set (security_invoker = on);
alter view if exists public."userRecency"     set (security_invoker = on);

-- 3. Remove direct grants to public API roles, including for future tables
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
