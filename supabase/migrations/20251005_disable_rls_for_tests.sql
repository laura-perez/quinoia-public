-- Disable RLS for local testing
-- This migration is ONLY for local development
-- Production will have proper RLS policies

-- Disable RLS on all tables for easier local testing
ALTER TABLE IF EXISTS public."user" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."submission" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."menuResult" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."userRecipeHistory" DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."runLog" DISABLE ROW LEVEL SECURITY;

-- Note: In production, enable RLS and create proper policies
-- ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view own data" ON public."user" FOR SELECT USING (auth.uid() = id);
