-- Create view for real-time user quota status
-- Rolling 7-day window based on user.lastSubmissionAt

CREATE OR REPLACE VIEW public."userQuotaStatus" AS
SELECT
  u.id as "userId",
  u.email,
  u.status,

  -- Dernière génération de menu (source de vérité pour rolling window)
  u."lastSubmissionAt" as "lastMenuGeneratedAt",

  -- Quota menus : nombre de menus générés depuis lastSubmissionAt
  COALESCE(
    (SELECT COUNT(*)
     FROM public."menuResult" mr
     WHERE mr."userId" = u.id
     AND mr."createdAt" >= u."lastSubmissionAt"
    ), 0
  ) as "menusGeneratedThisWindow",

  -- Quota swaps : nombre total de swaps dans le menu actuel
  COALESCE(
    (SELECT mr."swapsCount"
     FROM public."menuResult" mr
     WHERE mr.id = u."lastMenuResultId"
    ), 0
  ) as "swapsUsedThisMenu",

  -- Limites selon status
  CASE
    WHEN u.status = 'paid_active' THEN NULL -- illimité
    ELSE 1
  END as "menuQuotaLimit",

  CASE
    WHEN u.status = 'paid_active' THEN NULL -- illimité
    ELSE 1
  END as "swapQuotaLimit",

  -- Prochaine réinitialisation quota (7 jours après lastSubmissionAt)
  CASE
    WHEN u."lastSubmissionAt" IS NOT NULL
    THEN u."lastSubmissionAt" + INTERVAL '7 days'
    ELSE NULL
  END as "nextQuotaReset",

  -- Peut générer nouveau menu ?
  CASE
    WHEN u.status = 'paid_active' THEN true
    WHEN u."lastSubmissionAt" IS NULL THEN true
    WHEN u."lastSubmissionAt" + INTERVAL '7 days' <= NOW() THEN true
    ELSE false
  END as "canGenerateMenu"

FROM public."user" u;

COMMENT ON VIEW public."userQuotaStatus" IS 'Real-time quota status for each user (rolling 7-day window based on lastSubmissionAt)';
