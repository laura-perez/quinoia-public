export const genderMap = {
  Femme: "female",
  Homme: "male",
  Autre: "unspecified",
} as const;

export const dietMap = {
  Omnivore: "omnivore",
  Flexitarien: "flexitarian",
  Végétarien: "vegetarian",
  Végétalien: "vegan",
  Vegan: "vegan",
} as const;

export const cookingLevelMap = {
  "Débutant : Je veux juste que ce soit simple et rapide": "beginner",
  "Intermédiaire : Je suis à l’aise, mais pas un chef non plus": "intermediate",
  "Confirmé : Cuisiner, c’est mon terrain de jeu": "advanced",
} as const;

export const proteinPreferenceMap = {
  Boeuf: "Beef",
  Bœuf: "Beef",
  Volaille: "Poultry",
  Poisson: "Fish",
  Œufs: "Eggs",
  Oeufs: "Eggs",
  "Fromages, Produits laitiers": "Dairy",
  Légumineuses: "Legumes",
  "Légumineuses (Pois chiches, lentilles ..)": "Legumes",
  Tofu: "Tofu",
  "Simili-viandes (Heura, LaVie etc ..)": "Meat alternatives"
} as const;

export const equipmentMap = {
  Four: "Oven",
  "Mixeur/Blender": "Blender", 
  Thermomix: "Thermomix",
  "Air Fryer": "Air Fryer",
  // Base equipment mappings (for database data)
  "Poêle": "Pan",
  "Casserole": "Pot",
} as const;

export const canonicalAllergens = [
  "Gluten",
  "Milk",
  "Eggs",
  "Fish",
  "Peanuts",
  "Tree nuts",
  "Soy",
  "Sesame",
  "Shellfish",
  "Mustard",
] as const;

export const allergenSynonymsFr: Record<string, (typeof canonicalAllergens)[number]> = {
  gluten: "Gluten",
  lait: "Milk",
  lactose: "Milk",
  oeuf: "Eggs",
  œuf: "Eggs",
  œufs: "Eggs",
  oeufs: "Eggs",
  poisson: "Fish",
  arachide: "Peanuts",
  "fruits à coque": "Tree nuts",
  soja: "Soy",
  sésame: "Sesame",
  moutarde: "Mustard",
  crustacés: "Shellfish",
};

function stripAccents(str: string): string {
  return str.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

export function mapValue<T extends Record<string, string>>(
  map: T,
  input: string | undefined
): string | undefined {
  if (!input || typeof input !== 'string') {
    return undefined;
  }
  const norm = stripAccents(input.trim().toLowerCase());
  for (const [k, v] of Object.entries(map)) {
    if (stripAccents(k.toLowerCase()) === norm) return v;
  }
  return undefined;
}

export function mapArrayUnique<T extends Record<string, string>>(
  map: T,
  inputs: string[]
): string[] {
  const out: string[] = [];
  for (const val of inputs) {
    const mapped = mapValue(map, val);
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

export function extractAllergens(input: string): readonly (typeof canonicalAllergens)[number][] {
  const tokens = input
    .split(/[;,\s]+/)
    .map((s) => stripAccents(s.trim().toLowerCase()))
    .filter(Boolean);
  const found = new Set<(typeof canonicalAllergens)[number]>();
  for (const token of tokens) {
    const mapped = allergenSynonymsFr[token];
    if (mapped && (canonicalAllergens as readonly string[]).includes(mapped)) {
      found.add(mapped);
    }
  }
  return Array.from(found) as readonly (typeof canonicalAllergens)[number][];
}
