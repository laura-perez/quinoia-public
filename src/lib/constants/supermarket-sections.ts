/**
 * Codes des rayons de supermarché français
 * Basé sur l'organisation réelle des supermarchés français
 * 
 * Migration: 2025-01-22 - Restructuration des sections d'ingrédients
 */

export const SUPERMARKET_SECTIONS = {
  'legumes-fruits': 'Légumes, fruits frais & surgelés 🥕🍏',
  'laitier': 'Fromagerie, Crèmerie & Produits laitiers 🧀🥛',
  'proteines': 'Viandes, Poissons & Protéines 🥩🥚',
  'epicerie': 'Épicerie, rayon sec 🥖🥫',
  'sauces-huiles': 'Huiles, Sauces & condiments 🌿',
  'epices': 'Épices & herbes 🧂'
} as const;

export type SupermarketSectionCode = keyof typeof SUPERMARKET_SECTIONS;

/**
 * Ordre d'affichage des rayons dans la liste de courses
 * Suit un parcours logique de supermarché français
 */
export const SECTION_DISPLAY_ORDER: SupermarketSectionCode[] = [
  'legumes-fruits',  // 1. Fruits et légumes frais (entrée du magasin)
  'laitier',         // 2. Rayon frais/laitier 
  'proteines',       // 3. Boucherie/poissonnerie/alternatives
  'epicerie',        // 4. Épicerie (conserves, féculents)
  'sauces-huiles',   // 5. Condiments et sauces
  'epices'           // 6. Épices et assaisonnements
];

/**
 * Mapping des anciennes sections vers les nouvelles
 * Pour la migration et la compatibilité
 */
export const SECTION_MIGRATION_MAP = {
  'primeur': 'legumes-fruits',
  'frais': 'laitier', 
  'proteines': 'proteines',
  'epicerie': 'epicerie',
  'surgele': 'epicerie',  // Les surgelés vont généralement en épicerie
  'conserves': 'epicerie', // Conserves → épicerie
  'autres': 'epicerie',    // Autres → épicerie par défaut
  'sec': 'epices'          // Sec → épices
} as const;

/**
 * Obtient le nom d'affichage d'une section
 * Gère la compatibilité backward avec les anciens codes
 */
export function getSectionDisplayName(sectionCode: string): string {
  // D'abord, essayer les nouveaux codes
  if (sectionCode in SUPERMARKET_SECTIONS) {
    return SUPERMARKET_SECTIONS[sectionCode as SupermarketSectionCode];
  }
  
  // Ensuite, mapper les anciens codes vers les nouveaux
  const migrated = SECTION_MIGRATION_MAP[sectionCode as keyof typeof SECTION_MIGRATION_MAP];
  if (migrated) {
    return SUPERMARKET_SECTIONS[migrated];
  }
  
  // Fallback par défaut avec capitalisation
  return sectionCode.charAt(0).toUpperCase() + sectionCode.slice(1).replace(/-/g, ' ');
}

/**
 * Obtient le nom d'affichage d'une section avec contexte de catégorie
 * Pour une meilleure précision avec les anciens codes
 */
export function getSectionDisplayNameWithContext(sectionCode: string, category?: string): string {
  // Pour les anciens codes ambigus comme 'frais', utiliser la catégorie pour décider
  if (sectionCode === 'frais' && category) {
    if (['Légumes', 'Fruits', 'Herbes'].includes(category)) {
      return SUPERMARKET_SECTIONS['legumes-fruits'];
    }
    if (['Fromages', 'Laitages', 'Œufs', 'Pâtes fraiches'].includes(category)) {
      return SUPERMARKET_SECTIONS['laitier'];
    }
  }
  
  if (sectionCode === 'autres' && category) {
    if (['Viandes', 'Poissons', 'Alternatives végétales'].includes(category)) {
      return SUPERMARKET_SECTIONS['proteines'];
    }
    if (['Fruits', 'Légumes', 'Herbes'].includes(category)) {
      return SUPERMARKET_SECTIONS['legumes-fruits'];
    }
    // Par défaut, autres → épicerie
    return SUPERMARKET_SECTIONS['epicerie'];
  }
  
  // Utiliser la fonction standard pour les autres cas
  return getSectionDisplayName(sectionCode);
}

/**
 * Trie les éléments d'une liste de courses par section selon l'ordre supermarché
 */
export function sortBySupermarketSections<T extends { sectionCode: string }>(items: T[]): T[] {
  return items.sort((a, b) => {
    const orderA = SECTION_DISPLAY_ORDER.indexOf(a.sectionCode as SupermarketSectionCode);
    const orderB = SECTION_DISPLAY_ORDER.indexOf(b.sectionCode as SupermarketSectionCode);
    
    // Si une section n'est pas trouvée, la mettre à la fin
    const finalOrderA = orderA === -1 ? SECTION_DISPLAY_ORDER.length : orderA;
    const finalOrderB = orderB === -1 ? SECTION_DISPLAY_ORDER.length : orderB;
    
    return finalOrderA - finalOrderB;
  });
}