-- Purpose: Scale all recipes with servingsBase = 4 to servingsBase = 2
-- Rules:
--  - Default: halve each ingredient.quantite (keep 2 decimals), then set servingsBase = 2
--  - Exceptions (by recipe title):
--      Salade de haricots et poulet à l’ail
--      Salade de haricots et rumsteak poêlé
--      Tarte poulet courgette tomate façon provençale
--    For these, if an ingredient is piece-like and quantite = 0.5, keep it at 0.5 (don’t halve to 0.25)
--  - Spices:
--      If quantite = 5 (g or ml) then set to 3 g (not 2.5)
--      Also enforce unit = 'g' for spices (convert ml -> g)
--  - Idempotency: Only acts on recipes with servingsBase = 4

-- Notes/assumptions:
--  - ingredient JSON shape includes keys: quantite (number), unite (string), canonicalId (uuid string)
--  - piece-like units considered: '', 'piece', 'pièce', 'unite', 'unité', 'pcs', 'gousse', 'tranche', 'clove'
--  - Spice detection heuristic: join ingredientCanonical on canonicalId and match nameFr against a curated list
--  - For spice ml->g conversion we use a 1:1 conversion (volume-density approximated)

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
  SELECT id, "titleFr" AS title, ingredients
    FROM "recipe"
    WHERE "servingsBase" = 4
  ) LOOP
    UPDATE "recipe"
    SET ingredients = (
      WITH elems AS (
        SELECT
          elem AS j,
          -- parse fields safely
          CASE WHEN (elem ? 'quantite') AND (elem->>'quantite') ~ '^-?\d+(\.\d+)?$'
               THEN (elem->>'quantite')::numeric ELSE NULL END AS q,
          lower(COALESCE(elem->>'unite', '')) AS u,
          COALESCE(elem->>'canonicalId', '') AS cid,
          -- flags
          CASE
            WHEN lower(r.title) IN (
              lower('Salade de haricots et poulet à l’ail'),
              lower('Salade de haricots et poulet à l''ail'),
              lower('Salade de haricots et rumsteak poêlé'),
              lower('Tarte poulet courgette tomate façon provençale')
            ) THEN TRUE ELSE FALSE
          END AS keep_half_recipe,
          CASE
            WHEN lower(COALESCE(elem->>'unite','')) IN ('', 'piece', 'pièce', 'unite', 'unité', 'pcs', 'gousse', 'tranche', 'clove') THEN TRUE
            ELSE FALSE
          END AS is_piece_like,
          EXISTS (
            SELECT 1 FROM "ingredientCanonical" ic
            WHERE ic.id::text = COALESCE(elem->>'canonicalId','')
              AND lower(ic."nameFr") = ANY (ARRAY[
                  'cumin','cumin moulu','paprika','paprika fumé','paprika fume',
                  'curcuma','curry','coriandre moulue','gingembre moulu',
                  'piment','piment doux','piment d''espelette','piment d’espelette',
                  'ail en poudre','oignon en poudre','herbes de provence','origan',
                  'thym','romarin','cannelle','muscade','quatre epices','quatre-epices',
                  'sumac','zaatar','garam masala','tandoori','ras el hanout','ras-el-hanout'
              ])
          ) AS is_spice
        FROM jsonb_array_elements(r.ingredients) AS elem
      )
      SELECT jsonb_agg(
        CASE
          -- 1) Keep 0.5 for piece-like items in the specified recipes
          WHEN keep_half_recipe AND is_piece_like AND q = 0.5 THEN j

          -- 2) Spices with quantity 5 -> set to 3 g
          WHEN is_spice AND q = 5 THEN
            (j - 'unite') || jsonb_build_object('quantite', 3, 'unite', 'g')

          -- 3) Default: halve quantity; and for spices convert ml -> g
          WHEN q IS NOT NULL THEN
            (
              CASE WHEN is_spice AND u = 'ml'
                   THEN (j - 'unite') || jsonb_build_object('unite', 'g')
                   ELSE j
              END
            ) || jsonb_build_object('quantite', round((q / 2.0)::numeric, 2))

          -- 4) If quantity is missing or non-numeric, leave element as-is
          ELSE j
        END
      )
      FROM elems
    ),
    "servingsBase" = 2
    WHERE id = r.id;
  END LOOP;
END $$;

-- Verification (optional):
-- SELECT count(*) FROM "recipe" WHERE "servingsBase" = 4; -- should be 0 after migration