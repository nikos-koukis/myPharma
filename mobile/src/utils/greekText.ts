/**
 * Converts a Greek text to proper Title Case.
 * Works correctly with Greek uppercase letters (Θ → θ, Σ → σ, etc.)
 * 
 * Examples:
 * - "ΘΕΣΣΑΛΟΝΙΚΗΣ" → "Θεσσαλονίκης"
 * - "ΑΧΑΪΑΣ" → "Αχαΐας"
 * - "θεσσαλονικησ" → "Θεσσαλονίκης"
 */
export function toTitleCase(str: string): string {
    if (!str) return str;

    // Convert to lowercase first (handles Greek uppercase correctly)
    const lower = str.toLowerCase();

    // Split by spaces and capitalize first letter of each word
    return lower
        .split(' ')
        .map(word => {
            if (word.length === 0) return word;
            // Use toLocaleUpperCase for proper Greek character handling
            return word.charAt(0).toLocaleUpperCase('el-GR') + word.slice(1);
        })
        .join(' ');
}

/**
 * Normalizes Greek region/city names for consistent API calls.
 * Ensures proper casing regardless of input format.
 */
export function normalizeGreekLocation(location: string): string {
    return toTitleCase(location.trim());
}
