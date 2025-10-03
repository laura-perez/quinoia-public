-- Quinoïa v2.0 - Canonical Ingredient Taxonomy Seed Data (CamelCase Schema)
-- Use this version with the camelCase tables ("ingredientCanonical", "ingredientAlias")
-- Safe to run multiple times: uses simple existence checks and will skip duplicates via UNIQUE constraints
-- NOTE: Allowed default units per schema: g | ml | piece. Adjusted any invalid units (e.g. gousse -> piece).

BEGIN;

-- Insert canonical ingredients
INSERT INTO public."ingredientCanonical" ("nameFr", category, "sectionCode", "defaultUnit", "densityGPerMl", "commonAliases") VALUES
-- FÉCULENTS ET CÉRÉALES
('Quinoa','Féculents','sec','g',NULL,'{"quinoa blanc","quinoa rouge","quinoa tricolore"}'),
('Riz basmati','Féculents','sec','g',NULL,'{"riz basmati","basmati"}'),
('Riz complet','Féculents','sec','g',NULL,'{"riz brun","riz complet"}'),
('Riz jasmin','Féculents','sec','g',NULL,'{"riz parfumé","riz jasmin"}'),
('Pâtes complètes','Féculents','sec','g',NULL,'{"pates completes","pâtes intégrales"}'),
('Nouilles de riz','Féculents','sec','g',NULL,'{"vermicelles de riz","nouilles asiatiques"}'),
('Semoule de couscous','Féculents','sec','g',NULL,'{"couscous","semoule"}'),
('Pomme de terre','Légumes','frais','g',NULL,'{"pommes de terre","patates"}'),
-- LÉGUMINEUSES & CONSERVES
('Lentilles','Protéines végétales','sec','g',NULL,'{"lentilles vertes","lentilles du Puy"}'),
('Lentilles corail','Protéines végétales','sec','g',NULL,'{"lentilles rouges","lentilles roses"}'),
('Pois chiches','Protéines végétales','conserves','g',NULL,'{"pois chiches en conserve","pois chiche"}'),
('Haricots rouges','Protéines végétales','conserves','g',NULL,'{"haricots rouges en conserve"}'),
('Petits pois','Légumes','conserves','g',NULL,'{"petits pois","pois"}'),
('Edamame','Protéines végétales','surgele','g',NULL,'{"edamame surgelé","fèves de soja edamame surgelées"}'),
-- LÉGUMES FRAIS
('Courgette','Légumes','frais','g',NULL,'{"courgettes"}'),
('Brocoli','Légumes','frais','g',NULL,'{"brocolis"}'),
('Carotte','Légumes','frais','g',NULL,'{"carottes"}'),
('Tomate','Légumes','frais','g',NULL,'{"tomates"}'),
('Tomate cerise','Légumes','frais','g',NULL,'{"tomates cerises","tomates cherry"}'),
('Poivron rouge','Légumes','frais','g',NULL,'{"poivron","poivrons rouges"}'),
('Concombre','Légumes','frais','g',NULL,'{"concombres"}'),
('Oignon','Légumes','frais','piece',NULL,'{"oignons","oignon jaune"}'),
('Oignon rouge','Légumes','frais','piece',NULL,'{"oignons rouges"}'),
('Ail','Légumes','frais','piece',NULL,'{"gousses d''ail"}'),
('Pak choï','Légumes','frais','g',NULL,'{"pak-choï","bok choy"}'),
('Courge butternut','Légumes','frais','g',NULL,'{"butternut","courge musquée"}'),
('Haricots verts','Légumes','frais','g',NULL,'{"haricots verts"}'),
-- HERBES & ÉPICES
('Persil','Herbes','frais','g',NULL,'{"persil plat","persil frisé"}'),
('Coriandre','Herbes','frais','g',NULL,'{"(Optionnel) Coriandre","coriandre fraîche"}'),
('Basilic thaï','Herbes','frais','g',NULL,'{"basilic thai","basilic asiatique"}'),
('Ciboulette','Herbes','frais','g',NULL,'{"ciboulette fraîche"}'),
('Gingembre','Épices','frais','g',NULL,'{"gingembre frais"}'),
('Herbes de Provence','Épices','sec','g',NULL,'{"herbes de provence"}'),
('Cumin','Épices','sec','g',NULL,'{"cumin moulu","cumin en poudre"}'),
('Paprika','Épices','sec','ml',NULL,'{"paprika doux"}'),
('Épices mexicaines','Épices','sec','g',NULL,'{"epices mexicaines","mélange mexicain"}'),
('Curry en poudre','Épices','sec','ml',NULL,'{"poudre de curry"}'),
('Pâte de curry vert','Épices','conserves','g',NULL,'{"curry vert en pâte"}'),
('Poivre','Épices','sec','g',NULL,'{"poivre noir","poivre moulu"}'),
-- PROTÉINES ANIMALES
('Blanc de poulet','Volaille','frais','g',NULL,'{"filets de poulet","escalopes de poulet"}'),
('Bœuf à mijoter','Viande','frais','g',NULL,'{"Bœuf (type rumsteak)","boeuf rumsteak"}'),
('Bœuf haché','Viande','frais','g',NULL,'{"Bœuf haché 5%","boeuf haché maigre"}'),
('Cabillaud','Poisson','frais','g',NULL,'{"filet de cabillaud"}'),
('Colin','Poisson','frais','g',NULL,'{"filet de colin"}'),
('Merlu','Poisson','frais','g',NULL,'{"filet de merlu"}'),
('Sardines','Poisson','conserves','g',NULL,'{"sardines en conserve","sardine en conserve"}'),
-- PRODUITS LAITIERS & ŒUFS
('Œuf','Œufs','frais','piece',NULL,'{"oeufs","œufs"}'),
('Lait','Produits laitiers','frais','ml',1.03,'{"lait entier","lait demi-écrémé"}'),
('Emmental râpé','Fromages','frais','g',NULL,'{"emmental rapé","gruyère râpé"}'),
('Fromage de chèvre','Fromages','frais','g',NULL,'{"fromage de chèvre frais","fromage de chèvre bûche"}'),
-- ALTERNATIVES VÉGÉTALES
('Tofu ferme','Protéines végétales','frais','g',NULL,'{"tofu"}'),
('Émincés végétaux','Alternatives végétales','frais','g',NULL,'{"aiguillettes végétales","lanières végétales"}'),
('Haché végétal','Alternatives végétales','frais','g',NULL,'{"haché végétal","steak haché végétal"}'),
('Lardons végétaux','Alternatives végétales','frais','g',NULL,'{"lardons végétaux La Vie","lardons veggie"}'),
('Lait de coco','Laits végétaux','conserves','ml',0.97,'{"lait de coco allégé","crème de coco"}'),
('Crème de soja','Laits végétaux','frais','ml',1.02,'{"crème soja cuisine"}'),
('Yaourt de soja','Laits végétaux','frais','g',NULL,'{"yaourt soja"}'),
-- HUILES & CONDIMENTS
('Huile d''olive','Huiles','epicerie','ml',0.92,'{"huile olive extra vierge"}'),
('Huile de sésame','Huiles','epicerie','ml',0.92,'{"huile sésame grillé"}'),
('Huile de tournesol','Huiles','epicerie','ml',0.92,'{"huile tournesol"}'),
('Sauce soja','Condiments','epicerie','g',1.15,'{"shoyu","tamari"}'),
('Vinaigre balsamique','Condiments','epicerie','ml',1.06,'{"vinaigre balsamique"}'),
('Vinaigre de cidre','Condiments','epicerie','ml',1.01,'{"vinaigre cidre"}'),
('Moutarde','Condiments','epicerie','g',NULL,'{"moutarde de Dijon"}'),
-- PRODUITS DE BASE
('Citron','Agrumes','frais','piece',NULL,'{"citrons"}'),
('Citron vert','Agrumes','frais','piece',NULL,'{"citrons verts","lime"}'),
('Graines de sésame','Graines','sec','g',NULL,'{"sésame grillé"}'),
('Chapelure','Épicerie','sec','g',NULL,'{"panure"}'),
('Fécule de maïs','Épicerie','sec','g',NULL,'{"maïzena"}')
ON CONFLICT ("nameFr") DO NOTHING;

-- Insert aliases from commonAliases array (trigger will populate normalizedForm)
INSERT INTO public."ingredientAlias" ("canonicalId", "aliasName", confidence, source)
SELECT ic.id, UNNEST(ic."commonAliases"), 1.0, 'manual'
FROM public."ingredientCanonical" ic
WHERE array_length(ic."commonAliases", 1) > 0
ON CONFLICT ("aliasName", "canonicalId") DO NOTHING;

-- Insert each canonical name itself as an alias (exact match)
INSERT INTO public."ingredientAlias" ("canonicalId", "aliasName", confidence, source)
SELECT ic.id, ic."nameFr", 1.0, 'manual'
FROM public."ingredientCanonical" ic
ON CONFLICT ("aliasName", "canonicalId") DO NOTHING;

-- Summary
DO $$
DECLARE
  total_canonical INTEGER;
  total_aliases INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_canonical FROM public."ingredientCanonical";
  SELECT COUNT(*) INTO total_aliases FROM public."ingredientAlias";
  RAISE NOTICE '========================================';
  RAISE NOTICE '🌱 Ingredient Seed Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE '  - % canonical ingredients', total_canonical;
  RAISE NOTICE '  - % total aliases', total_aliases;
  RAISE NOTICE 'Database ready for recipe imports and tests.';
END $$;

COMMIT;