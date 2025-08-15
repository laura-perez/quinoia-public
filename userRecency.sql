# Vue SQL userRecency pour Supabase

create or replace view "userRecency" as
select
  mr."userId",
  -- Tout ce qui a moins de 21j (hard exclude dans excludeRecipeIds)
  array_agg(distinct r.recipe_id) filter (where mr."createdAt" >= now() - interval '21 days') as "excludeRecipeIds",

  -- <= 14j (recentStrict)
  array_agg(distinct r.recipe_id) filter (where mr."createdAt" >= now() - interval '14 days') as "recentStrict",

  -- >14j et <=21j (recentSoft)
  array_agg(distinct r.recipe_id) filter (
    where mr."createdAt" < now() - interval '14 days'
      and mr."createdAt" >= now() - interval '21 days'
  ) as "recentSoft"
from "menuResult" mr
cross join lateral jsonb_array_elements(mr."resultBundle"->'recipes') as recipe_obj
cross join lateral (
  select recipe_obj->>'id' as recipe_id
) r
group by mr."userId";
