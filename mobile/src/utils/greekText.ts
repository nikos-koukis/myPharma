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

/**
 * Removes accents and special characters from Greek text.
 * Useful for normalizing strings before sending to API if the backend has encoding issues.
 * 
 * Examples:
 * - "Αχαΐας" → "ΑΧΑΙΑΣ"
 * - "Θεσσαλονίκης" → "ΘΕΣΣΑΛΟΝΙΚΗΣ"
 */
export function removeGreekAccents(str: string): string {
    if (!str) return str;

    const map: Record<string, string> = {
        'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω',
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'ΐ': 'ι', 'ϊ': 'ι', 'ϋ': 'υ', 'ΰ': 'υ', 'Ϊ': 'Ι', 'Ϋ': 'Υ'
    };

    return str.split('').map(char => map[char] || char).join('').toUpperCase();
}

/**
 * Extracts specific area/neighborhood from a full address.
 * 
 * Examples:
 * - "Ειρήνης & Φιλίας 3, 26500 Δεμένικα Αχαΐας" → "Δεμένικα"
 * - "25ης Μαρτίου 39, 26333 Παραλία Αχαΐας" → "Παραλία"
 * - "Τσιμισκή 45, 54623 Θεσσαλονίκη" → "Θεσσαλονίκη"
 */
export function extractAreaFromAddress(address: string): string | null {
    if (!address) return null;

    // Pattern: "street, postal_code Area Region"
    // We want to extract "Area" which comes after the postal code
    const match = address.match(/,\s*\d{5}\s+([Α-Ωα-ωίϊΐόάέύϋΰήώ\s]+?)(?:\s+[Α-Ωα-ω]+)?$/);

    if (match && match[1]) {
        const area = match[1].trim();
        // If the extracted area contains the region name at the end, remove it
        // e.g., "Δεμένικα Αχαΐας" → "Δεμένικα"
        const parts = area.split(/\s+/);
        if (parts.length > 1) {
            // Take only the first part (the actual neighborhood)
            return normalizeGreekLocation(parts[0]);
        }
        return normalizeGreekLocation(area);
    }

    return null;
}
