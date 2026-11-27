-- Fix: dashboard_data never recognised paid users.
--
-- The view compared u.status to 'PAID_ACTIVE' (upper case), but the
-- chk_user_status_allowed constraint on public."user".status only allows lower-case
-- values ('paid_active', ...). The comparison was therefore never true: paid users
-- got the free-tier values (can_generate_menu/can_swap limited, quota limits of 1,
-- counters and next_quota_reset computed as for free users).
--
-- Same definition as production (baseline 20251027000000), with 'PAID_ACTIVE'
-- replaced by 'paid_active'. Column list and order are unchanged, as required by
-- CREATE OR REPLACE VIEW; existing grants and the view comment are preserved.


create or replace view public."dashboard_data" with (security_invoker = on) as
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
            WHEN ((u.status)::text = 'paid_active'::text) THEN true
            WHEN (mr_latest.id IS NULL) THEN true
            ELSE false
        END AS can_generate_menu,
        CASE
            WHEN ((u.status)::text = 'paid_active'::text) THEN true
            WHEN (mr_latest.id IS NULL) THEN false
            WHEN (mr_latest."hasSwappedInWindow" = false) THEN true
            ELSE false
        END AS can_swap,
        CASE
            WHEN ((u.status)::text = 'paid_active'::text) THEN NULL::integer
            ELSE 1
        END AS menu_quota_limit,
        CASE
            WHEN ((u.status)::text = 'paid_active'::text) THEN NULL::integer
            ELSE 1
        END AS swap_quota_limit,
        CASE
            WHEN ((u.status)::text = 'paid_active'::text) THEN 0
            WHEN (mr_latest.id IS NULL) THEN 0
            ELSE 1
        END AS menus_generated_this_window,
        CASE
            WHEN ((u.status)::text = 'paid_active'::text) THEN 0
            WHEN (mr_latest."hasSwappedInWindow" = true) THEN 1
            ELSE 0
        END AS swaps_used_this_menu,
        CASE
            WHEN ((u.status)::text = 'paid_active'::text) THEN NULL::timestamp with time zone
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
