/**
 * Calculates the Levenshtein distance between two strings
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @returns The Levenshtein distance between the two strings
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create a matrix of zeros
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Fill the first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill the rest of the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Checks if two strings are similar based on Levenshtein distance
 * @param str1 First string to compare
 * @param str2 Second string to compare
 * @param threshold Maximum allowed Levenshtein distance (default: 3)
 * @returns True if the strings are similar, false otherwise
 */
export function areSimilar(str1: string, str2: string, threshold: number = 3): boolean {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return distance <= threshold;
}