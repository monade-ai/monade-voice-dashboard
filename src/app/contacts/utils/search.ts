/**
 * Calculates the Levenshtein distance between two strings
 * This algorithm measures how many single-character edits (insertions, deletions, substitutions)
 * are required to change one string into another.
 * 
 * @param a First string
 * @param b Second string
 * @returns The edit distance between the two strings
 */
export function levenshteinDistance(a: string, b: string): number {
    // Create a matrix of size (a.length + 1) × (b.length + 1)
    const matrix: number[][] = Array(a.length + 1)
      .fill(null)
      .map(() => Array(b.length + 1).fill(null));
  
    // Initialize the first row and column
    for (let i = 0; i <= a.length; i++) {
      matrix[i][0] = i;
    }
    
    for (let j = 0; j <= b.length; j++) {
      matrix[0][j] = j;
    }
  
    // Fill in the rest of the matrix
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }
  
    return matrix[a.length][b.length];
  }
  
  /**
   * Fuzzy search a query in a list of items based on specified fields
   * Uses Levenshtein distance to find partial matches
   * 
   * @param items Array of items to search in
   * @param query Search query
   * @param fields Fields to search in
   * @param threshold Maximum Levenshtein distance to consider a match (lower is stricter)
   * @returns Filtered items that match the search criteria
   */
  export function fuzzySearch<T>(
    items: T[],
    query: string,
    fields: (keyof T)[],
    threshold: number = 3
  ): T[] {
    if (!query || query.trim() === '') {
      return items;
    }
  
    const normalizedQuery = query.toLowerCase().trim();
    
    return items.filter(item => {
      return fields.some(field => {
        const fieldValue = String(item[field] || '').toLowerCase();
        
        // Exact match handling for shorter strings
        if (fieldValue.includes(normalizedQuery)) {
          return true;
        }
        
        // Calculate Levenshtein distance for each word in the field value
        const words = fieldValue.split(/\s+/);
        return words.some(word => {
          const distance = levenshteinDistance(word, normalizedQuery);
          // Adjust threshold based on the length of the word and query for more accurate matching
          const adjustedThreshold = Math.min(threshold, Math.max(word.length, normalizedQuery.length) / 3);
          return distance <= adjustedThreshold;
        });
      });
    });
  }
  
  /**
   * Search contacts using fuzzy matching
   * 
   * @param contacts Array of contacts to search in
   * @param query Search query
   * @returns Filtered contacts that match the search query
   */
  export function searchContacts<T extends { name: string; phone: string }>(
    contacts: T[],
    query: string
  ): T[] {
    return fuzzySearch(contacts, query, ['name', 'phone']);
  }