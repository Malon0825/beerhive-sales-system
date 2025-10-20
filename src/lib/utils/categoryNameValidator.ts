/**
 * Category Name Validation Utilities
 * 
 * Provides smart detection for duplicate and similar category names,
 * including plural/singular form detection.
 */

/**
 * Convert a word to its singular form
 * Handles common English plural patterns
 * 
 * @param word - The word to convert
 * @returns Likely singular form of the word
 */
function toSingular(word: string): string {
  const lower = word.toLowerCase();
  
  // Special cases / irregular plurals
  const irregulars: Record<string, string> = {
    'men': 'man',
    'women': 'woman',
    'children': 'child',
    'teeth': 'tooth',
    'feet': 'foot',
    'people': 'person',
    'leaves': 'leaf',
    'knives': 'knife',
    'wives': 'wife',
    'lives': 'life',
    'elves': 'elf',
    'loaves': 'loaf',
    'potatoes': 'potato',
    'tomatoes': 'tomato',
    'heroes': 'hero',
    'echoes': 'echo',
  };

  if (irregulars[lower]) {
    return irregulars[lower];
  }

  // Pattern: -ies -> -y (e.g., categories -> category)
  if (lower.endsWith('ies') && lower.length > 4) {
    return lower.slice(0, -3) + 'y';
  }

  // Pattern: -ves -> -f or -fe (e.g., shelves -> shelf)
  if (lower.endsWith('ves') && lower.length > 4) {
    return lower.slice(0, -3) + 'f';
  }

  // Pattern: -ses -> -s (e.g., glasses -> glass)
  if (lower.endsWith('ses') && lower.length > 4) {
    return lower.slice(0, -2);
  }

  // Pattern: -xes -> -x (e.g., boxes -> box)
  if (lower.endsWith('xes') && lower.length > 4) {
    return lower.slice(0, -2);
  }

  // Pattern: -zes -> -z (e.g., quizzes -> quiz)
  if (lower.endsWith('zes') && lower.length > 4) {
    return lower.slice(0, -2);
  }

  // Pattern: -ches -> -ch (e.g., benches -> bench)
  if (lower.endsWith('ches') && lower.length > 5) {
    return lower.slice(0, -2);
  }

  // Pattern: -shes -> -sh (e.g., dishes -> dish)
  if (lower.endsWith('shes') && lower.length > 5) {
    return lower.slice(0, -2);
  }

  // Pattern: -oes -> -o (e.g., heroes -> hero) - but not for -oes words ending in vowel+o
  if (lower.endsWith('oes') && lower.length > 4) {
    const beforeOes = lower[lower.length - 4];
    if (!'aeiou'.includes(beforeOes)) {
      return lower.slice(0, -2);
    }
  }

  // Pattern: -s -> remove s (e.g., beers -> beer, cats -> cat)
  if (lower.endsWith('s') && lower.length > 2 && !lower.endsWith('ss')) {
    return lower.slice(0, -1);
  }

  // If no pattern matches, return as is
  return lower;
}

/**
 * Convert a word to its plural form
 * Handles common English plural patterns
 * 
 * @param word - The word to convert
 * @returns Likely plural form of the word
 */
function toPlural(word: string): string {
  const lower = word.toLowerCase();

  // Special cases / irregular plurals
  const irregulars: Record<string, string> = {
    'man': 'men',
    'woman': 'women',
    'child': 'children',
    'tooth': 'teeth',
    'foot': 'feet',
    'person': 'people',
    'leaf': 'leaves',
    'knife': 'knives',
    'wife': 'wives',
    'life': 'lives',
    'elf': 'elves',
    'loaf': 'loaves',
    'potato': 'potatoes',
    'tomato': 'tomatoes',
    'hero': 'heroes',
    'echo': 'echoes',
  };

  if (irregulars[lower]) {
    return irregulars[lower];
  }

  // Pattern: -y -> -ies (e.g., category -> categories)
  // But not for vowel + y (e.g., boy -> boys, not boies)
  if (lower.endsWith('y') && lower.length > 2) {
    const beforeY = lower[lower.length - 2];
    if (!'aeiou'.includes(beforeY)) {
      return lower.slice(0, -1) + 'ies';
    }
  }

  // Pattern: -f or -fe -> -ves (e.g., shelf -> shelves, knife -> knives)
  if (lower.endsWith('f')) {
    return lower.slice(0, -1) + 'ves';
  }
  if (lower.endsWith('fe')) {
    return lower.slice(0, -2) + 'ves';
  }

  // Pattern: -s, -ss, -x, -z, -ch, -sh -> -es (e.g., glass -> glasses, box -> boxes)
  if (
    lower.endsWith('s') ||
    lower.endsWith('ss') ||
    lower.endsWith('x') ||
    lower.endsWith('z') ||
    lower.endsWith('ch') ||
    lower.endsWith('sh')
  ) {
    return lower + 'es';
  }

  // Pattern: -o -> -oes (e.g., hero -> heroes)
  // But not for vowel + o (e.g., radio -> radios)
  if (lower.endsWith('o') && lower.length > 2) {
    const beforeO = lower[lower.length - 2];
    if (!'aeiou'.includes(beforeO)) {
      return lower + 'es';
    }
  }

  // Default: just add -s (e.g., beer -> beers)
  return lower + 's';
}

/**
 * Normalize a category name for comparison
 * Trims whitespace and converts to lowercase
 * 
 * @param name - The category name to normalize
 * @returns Normalized name
 */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Check if two category names are similar (plural/singular forms)
 * 
 * @param name1 - First category name
 * @param name2 - Second category name
 * @returns True if names are similar (including plural/singular variations)
 * 
 * @example
 * areSimilarNames('Beer', 'Beers') // true
 * areSimilarNames('Glass', 'Glasses') // true
 * areSimilarNames('Category', 'Categories') // true
 * areSimilarNames('Beer', 'Wine') // false
 */
export function areSimilarNames(name1: string, name2: string): boolean {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  // Exact match (case-insensitive)
  if (norm1 === norm2) {
    return true;
  }

  // Check if one is singular and other is plural
  const singular1 = toSingular(norm1);
  const singular2 = toSingular(norm2);

  // If both normalize to the same singular form, they're similar
  if (singular1 === singular2) {
    return true;
  }

  // Check if one word is the plural of the other
  const plural1 = toPlural(norm1);
  const plural2 = toPlural(norm2);

  if (norm1 === plural2 || norm2 === plural1) {
    return true;
  }

  return false;
}

/**
 * Find categories with similar names in a list
 * 
 * @param targetName - The name to check
 * @param categories - List of existing categories
 * @param excludeId - Optional ID to exclude from check (for edit operations)
 * @returns Array of similar category objects with their names
 * 
 * @remarks
 * - Case-insensitive comparison
 * - Detects plural/singular variations
 * - Used to prevent confusing duplicate categories
 */
export function findSimilarCategories(
  targetName: string,
  categories: Array<{ id: string; name: string }>,
  excludeId?: string
): Array<{ id: string; name: string }> {
  return categories.filter((category) => {
    // Exclude the category being edited
    if (excludeId && category.id === excludeId) {
      return false;
    }

    // Check if names are similar
    return areSimilarNames(targetName, category.name);
  });
}

/**
 * Generate a user-friendly error message for duplicate/similar categories
 * 
 * @param targetName - The name user is trying to use
 * @param existingName - The existing similar category name
 * @returns Formatted error message
 */
export function getSimilarNameErrorMessage(
  targetName: string,
  existingName: string
): string {
  const norm1 = normalizeName(targetName);
  const norm2 = normalizeName(existingName);

  // Exact match (case-insensitive)
  if (norm1 === norm2) {
    return `Category "${existingName}" already exists. Please use a different name.`;
  }

  // Plural/singular variation
  return `Category "${existingName}" already exists. "${targetName}" is too similar. Please use a different name.`;
}
