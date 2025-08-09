---
applyTo: "src/components/**/*.{jsx,ts}"
---
# Quinoïa — UI Instructions (Starboard + HyperUI)

## Form (4 steps)
- **Step 1 — Profil**: email, firstName, age (16–100), gender, heightCm (100–250), weightKg (40–150), consent (required), reCAPTCHA widget.
- **Step 2 — Objectifs**: `primaryGoal` (radio: saveTime|eatHealthier|weightLoss), `secondaryFocus` (switch: highProtein).
- **Step 3 — Activité** (Option B): `deskJob` (yes/no), `dailySteps` (<5k|5-8k|>8k), `sessionsPerWeek` (0|1-2|3-4|≥5), `highIntensity` (yes/no).
- **Step 4 — Préférences**: `diet`, `proteinPreferences[]` (locked EN values, FR labels), `equipmentAvailable[]` (locked EN), `cookingLevel`, `numRecipes` (2–7), `numServings` (1–4), `favoriteFoods`, `dislikedFoods`, `batchMode`.

## UX rules
- All inputs are **controlled**; inline error messages from Zod.
- FR labels, EN values (to match contracts). Tooltips where helpful.
- Show **disclaimer calories & IA**; link to a detailed page.
- reCAPTCHA loaded only on the form page; disable submit while resolving.

## Public page `/menu/[shareId]`
- **No PII**. Add `<meta name="robots" content="noindex,nofollow">`.
- Render `resultBundle` only: recipe cards (FR title/steps), per-serving nutrition, **totalMinutes**, shopping list grouped by FR sections, tips.
- Feedback: thumbs up/down → POST `/api/feedback`.

## Accessibility
- Proper `label for`, `aria-describedby` (errors), focus states, keyboard nav.

## Performance
- Prefer Server Components for data fetching.
- Use Next/Image. Avoid client-side secret imports.
