# Archived migrations

These files document how the database schema evolved during 2025. They were applied by hand to the production project, so they never formed a replayable history: one file sorts before the initial schema it depends on, several files share the same version prefix, and some production changes (payment and Stripe event tables, the market study table, RLS on the first tables, cooking tips and ingredient section codes) were never written down as files.

They are superseded by [`../migrations/20251027000000_baseline_production_schema.sql`](../migrations/20251027000000_baseline_production_schema.sql), generated from the production catalogs. The Supabase CLI only reads `supabase/migrations/`, so nothing in this folder is applied. The files are kept unchanged for reference.

Production does not track these files in `supabase_migrations.schema_migrations`. Before the first `supabase db push` against production, mark the baseline and later migrations that are already applied with `supabase migration repair --status applied <version>`.
