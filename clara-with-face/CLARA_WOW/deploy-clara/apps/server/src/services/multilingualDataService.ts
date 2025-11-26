import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for loaded JSON data
const dataCache: Map<string, any> = new Map();

// Supported languages
const SUPPORTED_LANGUAGES = ['en', 'kn', 'hi', 'ta', 'te', 'ml'];
const DEFAULT_LANGUAGE = 'en';

/**
 * Load a multilingual JSON file
 * @param dataType - Type of data (fee_structure, admission, hostel, department)
 * @param language - Language code (en, kn, hi, ta, te, ml)
 * @returns The loaded JSON data or null if not found
 */
function loadDataFile(dataType: string, language: string): any | null {
  // Validate language
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    language = DEFAULT_LANGUAGE;
  }

  // Create cache key
  const cacheKey = `${dataType}.${language}`;

  // Check cache first
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }

  try {
    // Construct file path
    const filePath = join(__dirname, '../data/info', `${dataType}.${language}.json`);
    console.log(`[MultilingualData] Loading file: ${filePath}`);
    
    // Read and parse JSON file
    const fileContent = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);

    // Cache the data
    dataCache.set(cacheKey, data);
    console.log(`[MultilingualData] Successfully loaded ${dataType}.${language}.json`);
    console.log(`[MultilingualData] Template keys available: ${Object.keys(data?.templates || {}).join(', ')}`);
    console.log(`[MultilingualData] general_fee template exists: ${!!data?.templates?.general_fee}, length: ${data?.templates?.general_fee?.length || 0}`);

    return data;
  } catch (error) {
    // If file not found for requested language, try English fallback
    if (language !== DEFAULT_LANGUAGE) {
      console.warn(`[MultilingualData] File not found for ${dataType}.${language}, falling back to English`);
      return loadDataFile(dataType, DEFAULT_LANGUAGE);
    }

    // If English also fails, return null
    console.error(`[MultilingualData] Failed to load ${dataType}.${language}.json:`, error);
    return null;
  }
}

/**
 * Get fee structure data for a specific language
 */
export function getFeeStructureData(language: string = DEFAULT_LANGUAGE): any {
  return loadDataFile('fee_structure', language);
}

/**
 * Get admission data for a specific language
 */
export function getAdmissionData(language: string = DEFAULT_LANGUAGE): any {
  return loadDataFile('admission', language);
}

/**
 * Get hostel data for a specific language
 */
export function getHostelData(language: string = DEFAULT_LANGUAGE): any {
  return loadDataFile('hostel', language);
}

/**
 * Get department data for a specific language
 */
export function getDepartmentData(language: string = DEFAULT_LANGUAGE): any {
  return loadDataFile('department', language);
}

/**
 * Clear the data cache (useful for testing or hot-reloading)
 */
export function clearCache(): void {
  dataCache.clear();
}

/**
 * Get all cached keys (for debugging)
 */
export function getCachedKeys(): string[] {
  return Array.from(dataCache.keys());
}

