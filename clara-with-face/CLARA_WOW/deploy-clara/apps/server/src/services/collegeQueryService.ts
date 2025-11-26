import { BOARD_OF_TRUSTEES, STAFF_MEMBERS, FEE_STRUCTURE, COLLEGE_INFO, Trustee, StaffMember, BranchFees } from '../data/collegeData.js';
import { getFeeStructureData } from './multilingualDataService.js';

export interface QueryResult {
  answer: string;
  type: 'staff' | 'trustee' | 'fee' | 'general' | 'multiple';
  language: string;
}

/**
 * Normalize text for better matching (removes special chars, handles transliteration)
 */
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if query matches name with fuzzy matching
 */
function matchesName(query: string, name: string): boolean {
  const normalizedQuery = normalizeForSearch(query);
  const normalizedName = normalizeForSearch(name);
  
  // Direct substring match
  if (normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName)) {
    return true;
  }
  
  // Split into words and check for word matches
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 1);
  const nameWords = normalizedName.split(/\s+/).filter(w => w.length > 1);
  
  if (queryWords.length === 0) return false;
  
  // Check if significant words from query match name words
  // Allow partial matches for transliterated names
  const matchingWords = queryWords.filter(qWord => {
    return nameWords.some(nWord => {
      // Exact match
      if (nWord === qWord) return true;
      // Substring match (for partial names)
      if (nWord.includes(qWord) || qWord.includes(nWord)) return true;
      // Check if first few characters match (for transliteration variations)
      if (qWord.length >= 3 && nWord.length >= 3) {
        if (nWord.startsWith(qWord.substring(0, 3)) || qWord.startsWith(nWord.substring(0, 3))) {
          return true;
        }
      }
      return false;
    });
  });
  
  // If at least one significant word matches, consider it a match
  // For names like "Lakshmi Durga", matching "lakshmi" or "durga" should work
  return matchingWords.length > 0 && (matchingWords.length === queryWords.length || matchingWords.length >= Math.min(2, queryWords.length));
}

/**
 * Search for staff members by name (case-insensitive partial match with fuzzy matching)
 */
function findStaffByName(query: string): StaffMember[] {
  const normalizedQuery = normalizeForSearch(query);
  
  // Common name variations and transliterations (including common misspellings)
  const nameVariations: Record<string, string[]> = {
    'lakshmi': ['lakshmi', 'laxmi', 'lakshmee', 'lakshmi', 'lakshmee'],
    'durga': ['durga', 'durgaa', 'durga'],
    'nagashree': ['nagashree', 'nagashri', 'nagash', 'na gashree', 'na gashri', 'nagashree', 'nagashree'],
    'anitha': ['anitha', 'anita', 'aneetha'],
    'dhivyasri': ['dhivyasri', 'divyasri', 'dhivya'],
    'nisha': ['nisha', 'nishaa'],
    'amarnath': ['amarnath', 'amarnatha', 'amarnat'],
    'anil': ['anil', 'aneel'],
    'jyoti': ['jyoti', 'jyothi', 'jyoti'],
    'vidyashree': ['vidyashree', 'vidyasri', 'vidya'],
    'bhavana': ['bhavana', 'bhavna', 'bhavanaa'],
    'bhavya': ['bhavya', 'bhavyaa'],
  };
  
  // Expand query with variations
  const expandedQueries = [normalizedQuery];
  
  // Also try without spaces (for queries like "na gashri" -> "nagashri")
  const queryWithoutSpaces = normalizedQuery.replace(/\s+/g, '');
  if (queryWithoutSpaces !== normalizedQuery) {
    expandedQueries.push(queryWithoutSpaces);
  }
  
  Object.entries(nameVariations).forEach(([key, variations]) => {
    // Check if query contains the key (with or without spaces)
    const queryToCheck = normalizedQuery.replace(/\s+/g, '');
    if (normalizedQuery.includes(key) || queryToCheck.includes(key)) {
      variations.forEach(variant => {
        // Replace in both spaced and non-spaced versions
        expandedQueries.push(normalizedQuery.replace(new RegExp(key, 'gi'), variant));
        expandedQueries.push(queryToCheck.replace(new RegExp(key, 'gi'), variant));
      });
    }
  });
  
  return STAFF_MEMBERS.filter(staff => {
    // Check name
    if (matchesName(normalizedQuery, staff.name)) {
      return true;
    }
    
    // Check with expanded queries
    for (const expQuery of expandedQueries) {
      if (matchesName(expQuery, staff.name)) {
        return true;
      }
    }
    
    // Check email prefix
    const emailPrefix = staff.email.toLowerCase().split('@')[0];
    if (emailPrefix.includes(normalizedQuery.replace(/\s+/g, '')) || 
        normalizedQuery.replace(/\s+/g, '').includes(emailPrefix)) {
      return true;
    }
    
    // Check individual name parts (also try without spaces)
    const nameWords = normalizeForSearch(staff.name).split(/\s+/);
    const nameWithoutSpaces = normalizeForSearch(staff.name).replace(/\s+/g, '');
    const queryWords = normalizedQuery.split(/\s+/);
    const queryWithoutSpaces = normalizedQuery.replace(/\s+/g, '');
    
    // Check if query without spaces matches name without spaces (for "na gashri" -> "nagashree")
    if (nameWithoutSpaces.includes(queryWithoutSpaces) || 
        queryWithoutSpaces.includes(nameWithoutSpaces) ||
        nameWithoutSpaces.length > 0 && queryWithoutSpaces.length > 0 &&
        (nameWithoutSpaces.startsWith(queryWithoutSpaces.substring(0, Math.min(5, queryWithoutSpaces.length))) ||
         queryWithoutSpaces.startsWith(nameWithoutSpaces.substring(0, Math.min(5, nameWithoutSpaces.length))))) {
      return true;
    }
    
    // Check if any significant query word matches any name word
    for (const qWord of queryWords) {
      if (qWord.length < 2) continue; // Lower threshold for short words
      // Also check query word without spaces
      const qWordClean = qWord.replace(/\s+/g, '');
      
      for (const nWord of nameWords) {
        if (nWord.length < 2) continue;
        const nWordClean = nWord.replace(/\s+/g, '');
        
        // Exact or substring match
        if (nWord.includes(qWord) || qWord.includes(nWord) ||
            nWordClean.includes(qWordClean) || qWordClean.includes(nWordClean)) {
          return true;
        }
        
        // Check first few characters for transliteration (more lenient)
        const minLen = Math.min(2, Math.min(qWord.length, nWord.length));
        if (minLen >= 2) {
          if (nWord.startsWith(qWord.substring(0, minLen)) ||
              qWord.startsWith(nWord.substring(0, minLen)) ||
              nWordClean.startsWith(qWordClean.substring(0, minLen)) ||
              qWordClean.startsWith(nWordClean.substring(0, minLen))) {
            return true;
          }
        }
      }
    }
    
    return false;
  });
}

/**
 * Search for trustees by name (case-insensitive partial match)
 */
function findTrusteeByName(query: string): Trustee[] {
  const normalizedQuery = query.toLowerCase().trim();
  
  return BOARD_OF_TRUSTEES.filter(trustee => {
    const nameLower = trustee.name.toLowerCase();
    return nameLower.includes(normalizedQuery) || 
           normalizedQuery.includes(nameLower.split(' ').pop() || '');
  });
}

/**
 * Detect language from text - improved to better detect English vs other languages
 */
function detectLanguage(text: string): string {
  const normalized = text.toLowerCase().trim();
  
  // If empty, default to English
  if (!normalized) return 'en';
  
  // Check for Indian language Unicode ranges first (most specific)
  // Hindi patterns
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  
  // Telugu patterns
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  
  // Kannada patterns
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  
  // Tamil patterns
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  
  // Malayalam patterns
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  
  // For Latin script (English, Indonesian, etc.), use keyword analysis
  // Common English question words and patterns
  const englishPatterns = [
    /\b(who|what|where|when|why|how|which|whose|whom)\b/i,
    /\b(is|are|was|were|do|does|did|can|could|will|would|should|may|might)\b/i,
    /\b(tell|give|show|find|get|know|help|please|thank|thanks)\b/i,
    /\b(college|university|institute|professor|staff|fee|fees|placement|department)\b/i,
  ];
  
  // Count English patterns
  const englishMatches = englishPatterns.reduce((count, pattern) => {
    return count + (pattern.test(text) ? 1 : 0);
  }, 0);
  
  // If we find multiple English patterns, it's likely English
  if (englishMatches >= 2) return 'en';
  
  // Common English words that appear frequently
  const commonEnglishWords = ['the', 'is', 'are', 'was', 'were', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  const englishWordCount = words.filter(w => commonEnglishWords.includes(w)).length;
  
  // If >30% of words are common English words, likely English
  if (words.length > 0 && (englishWordCount / words.length) > 0.3) return 'en';
  
  // Check for Latin script with English-like structure
  // If it's all Latin characters and contains question marks or common English structures
  if (/^[a-z\s\?\.\!,;:'"\-]+$/i.test(text) && (text.includes('?') || text.includes('who') || text.includes('what') || text.includes('where'))) {
    return 'en';
  }
  
  // Default to English for Latin script text (most common case)
  if (/^[a-zA-Z\s\?\.\!,;:'"\-]+$/.test(text)) return 'en';
  
  // Default to English
  return 'en';
}

/**
 * Format staff member information as a readable string in the specified language
 * Uses detailed description if available, otherwise falls back to old format
 */
function formatStaffInfo(staff: StaffMember, language: string = 'en'): string {
  // If detailed description is available, use it (currently only in English)
  if (staff.detailedDescription) {
    // For now, return the detailed description as-is (it's in English)
    // In the future, we could add translations for detailed descriptions
    if (language === 'en') {
      return `${staff.detailedDescription} Email: ${staff.email}.`;
    } else {
      // For other languages, we'll still use the detailed description but add translated email label
      const emailTranslations: Record<string, string> = {
        hi: 'ईमेल',
        te: 'ఇమెయిల్',
        kn: 'ಇಮೇಲ್',
        ta: 'மின்னஞ்சல்',
        ml: 'ഇമെയിൽ',
        en: 'Email'
      };
      const emailLabel = emailTranslations[language] || 'Email';
      return `${staff.detailedDescription} ${emailLabel}: ${staff.email}.`;
    }
  }
  
  // Fallback to old format if detailed description is not available
  const designation = staff.designation ? ` (${staff.designation})` : '';
  const subjectsList = staff.subjects.join(', ');
  
  const translations: Record<string, Record<string, string>> = {
    hi: {
      teaches: 'पढ़ाती हैं',
      in: 'में',
      department: 'विभाग',
      email: 'ईमेल'
    },
    te: {
      teaches: 'బోధిస్తారు',
      in: 'లో',
      department: 'శాఖ',
      email: 'ఇమెయిల్'
    },
    kn: {
      teaches: 'ಬೋಧಿಸುತ್ತಾರೆ',
      in: 'ರಲ್ಲಿ',
      department: 'ವಿಭಾಗ',
      email: 'ಇಮೇಲ್'
    },
    ta: {
      teaches: 'படிக்கிறார்கள்',
      in: 'ல்',
      department: 'துறை',
      email: 'மின்னஞ்சல்'
    },
    ml: {
      teaches: 'പഠിപ്പിക്കുന്നു',
      in: 'ൽ',
      department: 'വിഭാഗം',
      email: 'ഇമെയിൽ'
    },
    en: {
      teaches: 'teaches',
      in: 'in',
      department: 'department',
      email: 'Email'
    }
  };
  
  const t = translations[language] || translations.en;
  
  if (language === 'en') {
    return `${staff.name}${designation} ${t.teaches} ${subjectsList} ${t.in} the ${staff.department} ${t.department}. ${t.email}: ${staff.email}.`;
  } else {
    return `${staff.name}${designation} ${t.teaches} ${subjectsList} ${staff.department} ${t.department}${t.in}. ${t.email}: ${staff.email}.`;
  }
}

/**
 * Format trustee information as a readable string
 */
function formatTrusteeInfo(trustee: Trustee): string {
  return `${trustee.name} - ${trustee.designation}.`;
}

/**
 * Format fee structure information in beautiful sentence format
 */
function formatFeeInfo(query: string = '', language: string = 'en'): string {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Multilingual keywords for hostel
  const hostelKeywords = [
    'hostel', 'accommodation', 'ವಸತಿ', 'ಹಾಸ್ಟೆಲ್', 'हॉस्टल', 'वसति', 
    'விடுதி', 'హాస్టెల్', 'ഹോസ്റ്റൽ', 'വസതി'
  ];
  
  // Multilingual keywords for transport
  const transportKeywords = [
    'transport', 'bus', 'ಸಾರಿಗೆ', 'ಬಸ್', 'परिवहन', 'बस', 
    'போக்குவரத்து', 'బస్', 'ബസ്', 'പരിവഹനം'
  ];
  
  // Check for hostel keywords (including Unicode)
  const hasHostelKeyword = hostelKeywords.some(keyword => {
    if (/[\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0B80-\u0BFF\u0D00-\u0D7F]/.test(keyword)) {
      return query.includes(keyword);
    }
    return normalizedQuery.includes(keyword);
  });
  
  // Check for transport keywords (including Unicode)
  const hasTransportKeyword = transportKeywords.some(keyword => {
    if (/[\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0B80-\u0BFF\u0D00-\u0D7F]/.test(keyword)) {
      return query.includes(keyword);
    }
    return normalizedQuery.includes(keyword);
  });
  
  // If asking about optional fees (hostel, transport) - check FIRST before department matching
  if (hasHostelKeyword) {
    return formatHostelFeeSentence(language);
  }
  
  if (hasTransportKeyword) {
    return formatTransportFeeSentence(language);
  }
  
  // Check if query is asking for a specific department
  const departmentMap: Record<string, string[]> = {
    'cse': ['cse', 'computer science', 'computer'],
    'ece': ['ece', 'electronics', 'communication'],
    'ise': ['ise', 'information science'],
    'mech': ['mech', 'mechanical'],
    'cv': ['cv', 'civil'],
    'cse_aml': ['cse-aml', 'cse aml', 'ai', 'ml', 'artificial intelligence', 'machine learning'],
    'cse_ds': ['cse-ds', 'cse ds', 'data science', 'ds'],
    'mba': ['mba', 'management', 'business']
  };
  
  // Check if query mentions a specific year/batch
  const yearKeywords: Record<string, string> = {
    'second year': 'second_year_2024_batch',
    '2nd year': 'second_year_2024_batch',
    'second': 'second_year_2024_batch',
    'third year': 'third_year_2023_batch',
    '3rd year': 'third_year_2023_batch',
    'third': 'third_year_2023_batch',
    'fourth year': 'fourth_year_2022_batch',
    '4th year': 'fourth_year_2022_batch',
    'fourth': 'fourth_year_2022_batch',
    'final year': 'fourth_year_2022_batch',
    'final': 'fourth_year_2022_batch'
  };
  
  // Check if query mentions CET or COMED-K
  const quotaType = normalizedQuery.includes('comed') || normalizedQuery.includes('management') 
    ? 'COMED_K' 
    : normalizedQuery.includes('cet') ? 'CET' : null;
  
  // Find matching year
  let selectedYear = 'second_year_2024_batch'; // default
  for (const [keyword, year] of Object.entries(yearKeywords)) {
    if (normalizedQuery.includes(keyword)) {
      selectedYear = year;
      break;
    }
  }
  
  // Find matching department - improved matching
  let selectedDept: string | null = null;
  
  // First, try direct department code matching (most reliable)
  const directDeptCodes: Record<string, string> = {
    'cse': 'cse',
    'ece': 'ece',
    'ise': 'ise',
    'mech': 'mech',
    'cv': 'cv',
    'cse-aml': 'cse_aml',
    'cse_aml': 'cse_aml',
    'cse-ds': 'cse_ds',
    'cse_ds': 'cse_ds',
    'mba': 'mba'
  };
  
  for (const [code, dept] of Object.entries(directDeptCodes)) {
    // Check if the query contains the department code (case-insensitive, as word boundary or standalone)
    const codePattern = code.replace(/[_-]/g, '[\\s_-]*');
    const codeRegex = new RegExp(`\\b${codePattern}\\b`, 'i');
    if (codeRegex.test(query) || normalizedQuery.includes(code.toLowerCase())) {
      selectedDept = dept;
      break;
    }
  }
  
  // If not found, try keyword matching
  if (!selectedDept) {
    for (const [dept, keywords] of Object.entries(departmentMap)) {
      // Check if any keyword matches (case-insensitive)
      const matched = keywords.some(kw => {
        const kwLower = kw.toLowerCase();
        // Check for exact word match or as part of a word
        // Also check if the query words contain the keyword
        const queryWords = normalizedQuery.split(/\s+/);
        return normalizedQuery.includes(kwLower) || 
               queryWords.some(word => word.toLowerCase() === kwLower) ||
               queryWords.some(word => word.toLowerCase().includes(kwLower)) ||
               kwLower.split(/\s+/).every(kwPart => normalizedQuery.includes(kwPart));
      });
      if (matched) {
        selectedDept = dept;
        break;
      }
    }
  }
  
  const yearData = FEE_STRUCTURE.fee_structure[selectedYear];
  if (!yearData) {
    return formatGeneralFeeInfo(language);
  }
  
  // If specific department requested
  if (selectedDept) {
    const quota = quotaType || 'CET';
    // Handle department name variations in the data
    // Convert to uppercase and handle hyphen/underscore variations
    let deptKey = selectedDept.toUpperCase();
    
    // Map internal department codes to data structure keys
    const deptKeyMap: Record<string, string> = {
      'CSE': 'CSE',
      'ECE': 'ECE',
      'ISE': 'ISE',
      'MECH': 'MECH',
      'CV': 'CV',
      'CSE_AML': 'CSE_AML',
      'CSE-AML': 'CSE_AML',
      'CSE_DS': 'CSE_DS',
      'CSE-DS': 'CSE_DS',
      'MBA': 'MBA'
    };
    
    // Get the correct key for the data structure
    const dataKey = deptKeyMap[deptKey] || deptKey;
    
    // Try different key formats as fallback
    const possibleKeys = [
      dataKey,
      deptKey,
      deptKey.replace('-', '_'),
      deptKey.replace('_', '-'),
      deptKey.replace(/-/g, '_'),
      deptKey.replace(/_/g, '-')
    ];
    
    let fees: BranchFees | undefined;
    let matchedKey: string | null = null;
    
    for (const key of possibleKeys) {
      const feeData = yearData.fees[quota]?.[key];
      if (feeData && typeof feeData === 'object' && 'total' in feeData) {
        fees = feeData as BranchFees;
        matchedKey = key;
        break;
      }
    }
    
    if (fees && matchedKey) {
      return formatDepartmentFeeSentence(matchedKey, fees, selectedYear, quota, language);
    }
  }
  
  // General fee information
  return formatGeneralFeeInfo(language);
}

function formatDepartmentFeeSentence(
  dept: string, 
  fees: BranchFees, 
  year: string, 
  quota: string, 
  language: string
): string {
  // Load multilingual data
  const data = getFeeStructureData(language);
  
  // Get localized names and templates
  const deptNames = data?.department_names || {};
  const yearNames = data?.year_names || {};
  const quotaNames = data?.quota_names || {};
  const feeComponents = data?.fee_components || {};
  const template = data?.templates?.department_fee;
  
  const deptName = deptNames[dept] || dept;
  const yearName = yearNames[year] || year;
  const quotaName = quotaNames[quota] || (quota === 'CET' ? 'CET quota' : 'COMED-K quota');
  
  // Build components text in the detected language
  const components: string[] = [];
  if (fees.college_fees) {
    const componentName = feeComponents.college_fees || 'college fees';
    components.push(`${componentName} ₹${fees.college_fees.toLocaleString('en-IN')}`);
  }
  if (fees.skill_development) {
    const componentName = feeComponents.skill_development || 'skill development fee';
    components.push(`${componentName} ₹${fees.skill_development.toLocaleString('en-IN')}`);
  }
  if (fees.vtu_fees) {
    const componentName = feeComponents.vtu_fees || 'VTU fees';
    components.push(`${componentName} ₹${fees.vtu_fees.toLocaleString('en-IN')}`);
  }
  if (fees.exam_fees) {
    const componentName = feeComponents.exam_fees || 'examination fees';
    components.push(`${componentName} ₹${fees.exam_fees.toLocaleString('en-IN')}`);
  }
  if (fees.dept_activities || fees.dept_activities_books) {
    const deptFee = fees.dept_activities || fees.dept_activities_books || 0;
    const componentName = feeComponents.dept_activities_books || feeComponents.dept_activities || 'department activities and books fee';
    components.push(`${componentName} ₹${deptFee.toLocaleString('en-IN')}`);
  }
  if (fees.books_fee) {
    const componentName = feeComponents.books_fee || 'books fee';
    components.push(`${componentName} ₹${fees.books_fee.toLocaleString('en-IN')}`);
  }
  if (fees.alumini_fee) {
    const componentName = feeComponents.alumini_fee || 'alumni fee';
    components.push(`${componentName} ₹${fees.alumini_fee.toLocaleString('en-IN')}`);
  }
  if (fees.graduation_day_fee) {
    const componentName = feeComponents.graduation_day_fee || 'graduation day fee';
    components.push(`${componentName} ₹${fees.graduation_day_fee.toLocaleString('en-IN')}`);
  }
  if (fees.convocation_fee) {
    const componentName = feeComponents.convocation_fee || 'convocation fee';
    components.push(`${componentName} ₹${fees.convocation_fee.toLocaleString('en-IN')}`);
  }
  
  const componentsText = components.length > 0 
    ? components.join(', ')
    : '';
  
  // Use template if available, otherwise fallback to English format
  if (template && language !== 'en') {
    return template
      .replace('{yearName}', yearName)
      .replace('{quotaName}', quotaName)
      .replace('{deptName}', deptName)
      .replace('{componentsText}', componentsText)
      .replace('{total}', fees.total.toLocaleString('en-IN'))
      .replace('{deadline57}', FEE_STRUCTURE.payment_deadlines.semester_5_and_7)
      .replace('{deadline3}', FEE_STRUCTURE.payment_deadlines.semester_3)
      .replace('{paymentModes}', FEE_STRUCTURE.payment_modes.join(', '))
      .replace('{contactEmail}', FEE_STRUCTURE.contact_email);
  }
  
  // Fallback to English format
  const componentsTextEn = components.length > 0 
    ? components.slice(0, -1).join(', ') + ', and ' + components[components.length - 1]
    : '';
  
  return `For ${deptName} students in ${yearName} under ${quotaName}, the fee structure includes ${componentsTextEn}, resulting in a total fee of ₹${fees.total.toLocaleString('en-IN')}. Payment deadlines are ${FEE_STRUCTURE.payment_deadlines.semester_5_and_7} for Semesters 5 and 7, and ${FEE_STRUCTURE.payment_deadlines.semester_3} for Semester 3. Payments can be made through ${FEE_STRUCTURE.payment_modes.join(', ')}. For any fee-related queries, please contact ${FEE_STRUCTURE.contact_email}.`;
}

function formatHostelFeeSentence(language: string): string {
  const hostel = FEE_STRUCTURE.optional_fees.girls_hostel;
  const data = getFeeStructureData(language);
  const template = data?.templates?.hostel_fee;
  
  if (template && language !== 'en') {
    return template
      .replace('{lodging}', hostel.lodging.toLocaleString('en-IN'))
      .replace('{deposit}', hostel.mess_deposit_refundable.toLocaleString('en-IN'))
      .replace('{monthly}', hostel.mess_charges_approx_per_month.toLocaleString('en-IN'))
      .replace('{annually}', hostel.mess_charges_approx_per_annum.toLocaleString('en-IN'))
      .replace('{gst}', hostel.gst)
      .replace('{note}', hostel.note);
  }
  
  // Fallback to English
  return `For girls hostel accommodation, the annual lodging fee is ₹${hostel.lodging.toLocaleString('en-IN')}, with a refundable mess deposit of ₹${hostel.mess_deposit_refundable.toLocaleString('en-IN')}. The approximate mess charges are ₹${hostel.mess_charges_approx_per_month.toLocaleString('en-IN')} per month, totaling approximately ₹${hostel.mess_charges_approx_per_annum.toLocaleString('en-IN')} per annum, with ${hostel.gst} GST applicable. ${hostel.note}. For boys hostel, please contact the accounts office for current rates.`;
}

function formatTransportFeeSentence(language: string): string {
  const transport = FEE_STRUCTURE.optional_fees.college_bus_transport;
  const data = getFeeStructureData(language);
  const template = data?.templates?.transport_fee;
  
  if (template && language !== 'en') {
    return template
      .replace('{city}', transport.from_bangalore_city.toLocaleString('en-IN'))
      .replace('{yelahanka}', transport.from_yelahanka_limits.toLocaleString('en-IN'))
      .replace('{frequency}', transport.frequency.toLowerCase());
  }
  
  // Fallback to English
  return `College bus transport fees are ₹${transport.from_bangalore_city.toLocaleString('en-IN')} annually for students traveling from Bangalore city, and ₹${transport.from_yelahanka_limits.toLocaleString('en-IN')} annually for students within Yelahanka limits. These fees are payable ${transport.frequency.toLowerCase()} and cover daily pickup and drop services.`;
}

function formatGeneralFeeInfo(language: string): string {
  const yearData = FEE_STRUCTURE.fee_structure.second_year_2024_batch;
  const cetFees = yearData.fees.CET;
  const data = getFeeStructureData(language);
  const template = data?.templates?.general_fee;
  
  console.log(`[formatGeneralFeeInfo] Language: ${language}, Template exists: ${!!template}, Template length: ${template?.length || 0}`);
  console.log(`[formatGeneralFeeInfo] Data loaded: ${!!data}, Template keys: ${data?.templates ? Object.keys(data.templates).join(', ') : 'none'}`);
  
  // Always try to use template if available and language is not English
  if (template && language !== 'en' && template.length > 0) {
    console.log(`[formatGeneralFeeInfo] Using ${language} template (length: ${template.length})`);
    const totals = cetFees ? Object.values(cetFees).map(f => f.total) : [];
    const minFee = totals.length > 0 ? Math.min(...totals).toLocaleString('en-IN') : '0';
    const maxFee = totals.length > 0 ? Math.max(...totals).toLocaleString('en-IN') : '0';
    
    const result = template
      .replace('{academicYear}', FEE_STRUCTURE.academic_year)
      .replace('{minFee}', minFee)
      .replace('{maxFee}', maxFee)
      .replace('{deadline57}', FEE_STRUCTURE.payment_deadlines.semester_5_and_7)
      .replace('{deadline3}', FEE_STRUCTURE.payment_deadlines.semester_3)
      .replace('{paymentModes}', FEE_STRUCTURE.payment_modes.join(', '))
      .replace('{hostelLodging}', FEE_STRUCTURE.optional_fees.girls_hostel.lodging.toLocaleString('en-IN'))
      .replace('{transportCity}', FEE_STRUCTURE.optional_fees.college_bus_transport.from_bangalore_city.toLocaleString('en-IN'))
      .replace('{transportYelahanka}', FEE_STRUCTURE.optional_fees.college_bus_transport.from_yelahanka_limits.toLocaleString('en-IN'))
      .replace('{contactEmail}', FEE_STRUCTURE.contact_email);
    
    console.log(`[formatGeneralFeeInfo] Generated ${language} response (length: ${result.length}), first 100 chars: ${result.substring(0, 100)}`);
    return result;
  }
  
  // Fallback to English
  console.log(`[formatGeneralFeeInfo] Falling back to English (template: ${!!template}, language: ${language}, template length: ${template?.length || 0})`);
  const sentences: string[] = [];
  sentences.push(`For the academic year ${FEE_STRUCTURE.academic_year}, Sai Vidya Institute of Technology offers various fee structures based on the year of study, branch, and admission quota.`);
  
  if (cetFees) {
    const totals = Object.values(cetFees).map(f => f.total);
    sentences.push(`For second year students (2024 batch) under CET quota, the total fees range from ₹${Math.min(...totals).toLocaleString('en-IN')} to ₹${Math.max(...totals).toLocaleString('en-IN')} depending on the branch.`);
  }
  
  sentences.push(`Payment deadlines are ${FEE_STRUCTURE.payment_deadlines.semester_5_and_7} for Semesters 5 and 7, and ${FEE_STRUCTURE.payment_deadlines.semester_3} for Semester 3.`);
  sentences.push(`Accepted payment modes include ${FEE_STRUCTURE.payment_modes.join(', ')}.`);
  sentences.push(`For girls hostel, the annual lodging fee is ₹${FEE_STRUCTURE.optional_fees.girls_hostel.lodging.toLocaleString('en-IN')} with additional mess charges.`);
  sentences.push(`College bus transport costs ₹${FEE_STRUCTURE.optional_fees.college_bus_transport.from_bangalore_city.toLocaleString('en-IN')} annually from Bangalore city or ₹${FEE_STRUCTURE.optional_fees.college_bus_transport.from_yelahanka_limits.toLocaleString('en-IN')} from Yelahanka limits.`);
  sentences.push(`For specific fee details based on your branch, year, and quota, or for any fee-related queries, please contact ${FEE_STRUCTURE.contact_email}.`);
  
  return sentences.join(' ');
}

/**
 * Process a college-related query and return an answer
 */
export function processCollegeQuery(query: string): QueryResult {
  // Detect language from query
  const detectedLanguage = detectLanguage(query);
  console.log(`[processCollegeQuery] Query: "${query.substring(0, 50)}...", Detected language: ${detectedLanguage}`);
  
  // Normalize query for searching (remove special chars, keep transliterated text)
  const normalizedQuery = query
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0B80-\u0BFF\u0D00-\u0D7F]/g, '') // Keep alphanumeric and Indian language chars
    .trim();
  
  // Extract staff member names or keywords (also check for transliterated versions)
  const staffKeywords = [
    'lakshmi', 'durga', 'laxmi', 'lakshmee', 'durgaa',
    'anitha', 'anita', 'aneetha',
    'dhivyasri', 'divyasri', 'dhivya',
    'nisha', 'nishaa',
    'amarnath', 'amarnatha', 'amarnat',
    'nagashree', 'nagashri', 'nagash', 'nagashree',
    'anil', 'kumar', 'aneel',
    'jyoti', 'jyothi',
    'vidyashree', 'vidyasri', 'vidya',
    'bhavana', 'bhavna', 'bhavanaa',
    'bhavya', 'bhavyaa',
    'prof.', 'professor', 'prof', 'dr.', 'doctor', 'mam', 'maam', 'sir', 'madam'
  ];
  
  // Extract trustee names or keywords
  const trusteeKeywords = [
    'holla', 'padma', 'reddy', 'srinivas', 'raju', 'shanmukha', 'swamy',
    'manohar', 'jayasimha', 'narayan',
    'trustee', 'trustees', 'board', 'president', 'secretary', 'treasurer'
  ];
  
  // Extract fee-related keywords (including multilingual)
  const feeKeywords = [
    'fee', 'fees', 'tuition', 'hostel', 'transport', 'admission',
    'library', 'laboratory', 'lab', 'cost', 'price', 'charges'
  ];
  
  // Multilingual fee keywords
  const feeKeywordsInQuery = [
    ...feeKeywords,
    'ಫೀಸ್', 'ಫೀಸು', 'ಶುಲ್ಕ', 'ಬಗ್ಗೆ', 'ದರ', 'ವೆಚ್ಚ', // Kannada
    'शुल्क', 'फीस', 'फी', 'दर', 'कीमत', 'मूल्य', 'लागत', // Hindi
    'கட்டணம்', 'கட்டண', 'விலை', 'செலவு', 'விகிதம்', // Tamil
    'ఫీస్', 'ఫీసు', 'ఛార్జీ', 'దరం', 'ధర', 'వెచ్చం', // Telugu
    'ഫീസ്', 'ചാർജ്', 'ഫീ', 'നിരക്ക്', 'വില', 'ചെലവ്' // Malayalam
  ];
  
  // Extract placement-related keywords
  const placementKeywords = [
    'placement', 'placements', 'recruiter', 'recruiters', 'company', 'companies',
    'tcs', 'infosys', 'wipro', 'tech mahindra', 'amazon', 'ibm', 'job', 'jobs',
    'career', 'hiring', 'recruitment', 'package', 'salary', 'opportunity'
  ];
  
  // Check if query contains staff name keywords (check in both normalized and original query)
  const queryForKeywordCheck = query.toLowerCase();
  const hasStaffKeyword = staffKeywords.some(keyword => 
    normalizedQuery.includes(keyword) || queryForKeywordCheck.includes(keyword)
  );
  
  // Check for staff member queries - try to find staff first
  // Also check queries that might be asking "who is X" or "tell me about X"
  const isStaffQuery = hasStaffKeyword || 
    /(who|what|tell|about|information|info|कौन|कौन है|के बारे|बताओ|తెలుసు|ఎవరు|ಯಾರು|யார்|ആര്)/i.test(query) ||
    /(prof|dr|mam|maam|sir|madam|teacher|faculty|staff|मैम|मैडम|सर|మేమ్|మాడమ్)/i.test(query);
  
  // Always try to find staff if it's a staff query
  if (isStaffQuery || hasStaffKeyword) {
    // Try finding staff by the full query first
    let staffResults = findStaffByName(query);
    
    // If no results, try with normalized query
    if (staffResults.length === 0) {
      staffResults = findStaffByName(normalizedQuery);
    }
    
    // If still no results, extract potential names from query
    if (staffResults.length === 0) {
      // Extract names that might be in the query (look for common patterns)
      const namePatterns = [
        /(?:who|what|tell|about|कौन|तो|के बारे|बताओ|తెలుసు|ఎవరు|ಯಾರು|யார்|ആര്)\s+(?:is|are|है|हैं|సర్|మేమ్|మాడమ్|ಸರ್|மேடம்|സര്)\s*([a-z\s]+?)(?:\s+(?:mam|maam|madam|sir|मैम|मैडम|सर|మేమ్|మాడమ్|ಸರ್|மேடம்|സര്|prof|professor|dr|doctor|prof\.|dr\.))?/i,
        /(?:prof|professor|dr|doctor|prof\.|dr\.|mam|maam|madam|sir|मैम|मैडम|सर|మేమ్|మాడమ్|ಸರ్|மேடம்|സര్)\s+([a-z\s]+?)(?:\s+(?:mam|maam|madam|sir|मैम|मैडम|सर|మేమ్|మాడమ్|ಸರ్|மேடம்|സര್))?/i,
        /([a-z]{3,}\s+[a-z]{3,})/i, // Two or more words that look like names
      ];
      
      for (const pattern of namePatterns) {
        const matches = query.match(pattern);
        if (matches && matches[1]) {
          const extractedName = matches[1].trim();
          if (extractedName.length > 3) {
            staffResults = findStaffByName(extractedName);
            if (staffResults.length > 0) break;
          }
        }
      }
    }
    
    if (staffResults.length > 0) {
      if (staffResults.length === 1) {
        return {
          answer: formatStaffInfo(staffResults[0], detectedLanguage),
          type: 'staff',
          language: detectedLanguage
        };
      } else {
        // Multiple matches
        const staffList = staffResults.map(s => formatStaffInfo(s, detectedLanguage)).join('\n\n');
        const translations: Record<string, string> = {
          hi: `मैंने आपकी क्वेरी से मेल खाने वाले ${staffResults.length} स्टाफ सदस्य पाए:\n\n`,
          te: `నేను మీ ప్రశ్నకు సరిపోయే ${staffResults.length} సిబ్బంది సభ్యులను కనుగొన్నాను:\n\n`,
          kn: `ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಹೊಂದಿಕೆಯಾಗುವ ${staffResults.length} ಸಿಬ್ಬಂದಿ ಸದಸ್ಯರನ್ನು ನಾನು ಕಂಡುಕೊಂಡಿದ್ದೇನೆ:\n\n`,
          ta: `உங்கள் கேள்விக்கு பொருந்தும் ${staffResults.length} ஊழியர் உறுப்பினர்களை நான் கண்டுபிடித்தேன்:\n\n`,
          ml: `നിങ്ങളുടെ ചോദ്യവുമായി പൊരുത്തപ്പെടുന്ന ${staffResults.length} സ്റ്റാഫ് അംഗങ്ങളെ ഞാൻ കണ്ടെത്തി:\n\n`,
          en: `I found ${staffResults.length} staff members matching your query:\n\n`
        };
        return {
          answer: (translations[detectedLanguage] || translations.en) + staffList,
          type: 'multiple',
          language: detectedLanguage
        };
      }
    }
    
    // If staff keyword present but no match found, check if they're asking about staff in general
    if (normalizedQuery.includes('staff') || normalizedQuery.includes('faculty') || normalizedQuery.includes('teacher')) {
      const allStaff = STAFF_MEMBERS.map(s => formatStaffInfo(s, detectedLanguage)).join('\n\n');
      const translations: Record<string, string> = {
        hi: 'यहाँ कंप्यूटर साइंस इंजीनियरिंग विभाग के सभी स्टाफ सदस्य हैं:\n\n',
        te: 'కంప్యూటర్ సైన్స్ ఇంజనీరింగ్ విభాగంలోని అన్ని సిబ్బంది సభ్యులు ఇక్కడ ఉన్నారు:\n\n',
        kn: 'ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಇಂಜಿನಿಯರಿಂಗ್ ವಿಭಾಗದ ಎಲ್ಲಾ ಸಿಬ್ಬಂದಿ ಸದಸ್ಯರು ಇಲ್ಲಿವೆ:\n\n',
        ta: 'கணினி அறிவியல் பொறியியல் துறையின் அனைத்து ஊழியர் உறுப்பினர்களும் இங்கே உள்ளனர்:\n\n',
        ml: 'കമ്പ്യൂട്ടർ സയൻസ് എഞ്ചിനീയറിംഗ് വിഭാഗത്തിലെ എല്ലാ സ്റ്റാഫ് അംഗങ്ങളും ഇവിടെയുണ്ട്:\n\n',
        en: 'Here are all the staff members in the Computer Science Engineering department:\n\n'
      };
      return {
        answer: (translations[detectedLanguage] || translations.en) + allStaff,
        type: 'staff',
        language: detectedLanguage
      };
    }
  }
  
  // Check for trustee queries
  const hasTrusteeKeyword = trusteeKeywords.some(keyword => normalizedQuery.includes(keyword));
  if (hasTrusteeKeyword) {
    // Try to find specific trustee
    const trusteeResults = findTrusteeByName(normalizedQuery);
    
    if (trusteeResults.length > 0) {
      if (trusteeResults.length === 1) {
        return {
          answer: formatTrusteeInfo(trusteeResults[0]),
          type: 'trustee',
          language: detectedLanguage
        };
      } else {
        // Multiple matches
        const trusteeList = trusteeResults.map(formatTrusteeInfo).join('\n');
        return {
          answer: `I found ${trusteeResults.length} trustees matching your query:\n\n${trusteeList}`,
          type: 'multiple',
          language: detectedLanguage
        };
      }
    }
    
    // If query is about board of trustees
    if (normalizedQuery.includes('board') || normalizedQuery.includes('trustee') || normalizedQuery.includes('trust')) {
      const allTrustees = BOARD_OF_TRUSTEES.map(formatTrusteeInfo).join('\n');
      return {
        answer: `The Board of Trustees of ${COLLEGE_INFO.name} comprises:\n\n${allTrustees}\n\nThe institute was established in ${COLLEGE_INFO.establishedYear} by ${COLLEGE_INFO.trust}, ${COLLEGE_INFO.trustDescription}.`,
        type: 'trustee',
        language: detectedLanguage
      };
    }
  }
  
  // Check for fee queries (including multilingual keywords)
  const hasFeeKeyword = feeKeywordsInQuery.some(keyword => {
    if (/[\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF\u0B80-\u0BFF\u0D00-\u0D7F]/.test(keyword)) {
      // For Unicode keywords, check in original query
      return query.includes(keyword);
    }
    return normalizedQuery.includes(keyword.toLowerCase()) ||
           query.toLowerCase().includes(keyword.toLowerCase());
  });
  
  const hasFeeTransliterated = /fee|fees|ph[iī]s|ph[iī]su/i.test(query) ||
                                query.includes('ಫೀ') || query.includes('फी') ||
                                query.includes('கட்டண') || query.includes('ఫీ') ||
                                query.includes('ഫീ');
  
  if (hasFeeKeyword || hasFeeTransliterated) {
    console.log(`[processCollegeQuery] Fee query detected (hasFeeKeyword: ${hasFeeKeyword}, hasFeeTransliterated: ${hasFeeTransliterated}), calling formatFeeInfo with language: ${detectedLanguage}`);
    const feeAnswer = formatFeeInfo(query, detectedLanguage);
    console.log(`[processCollegeQuery] Fee answer length: ${feeAnswer.length}, first 100 chars: ${feeAnswer.substring(0, 100)}`);
    return {
      answer: feeAnswer,
      type: 'fee',
      language: detectedLanguage
    };
  }
  
  // Check for placement queries
  const hasPlacementKeyword = placementKeywords.some(keyword => 
    normalizedQuery.includes(keyword) || queryForKeywordCheck.includes(keyword)
  );
  if (hasPlacementKeyword) {
    const translations: Record<string, string> = {
      hi: `प्लेसमेंट जानकारी:\n\n${COLLEGE_INFO.placements.description}`,
      te: `ప్లేస్మెంట్ సమాచారం:\n\n${COLLEGE_INFO.placements.description}`,
      kn: `ಪ್ಲೇಸ್ಮೆಂಟ್ ಮಾಹಿತಿ:\n\n${COLLEGE_INFO.placements.description}`,
      ta: `வேலைவாய்ப்பு தகவல்:\n\n${COLLEGE_INFO.placements.description}`,
      ml: `പ്ലേസ്മെന്റ് വിവരം:\n\n${COLLEGE_INFO.placements.description}`,
      en: `Placement Information:\n\n${COLLEGE_INFO.placements.description}`
    };
    
    return {
      answer: translations[detectedLanguage] || translations.en,
      type: 'general',
      language: detectedLanguage
    };
  }
  
  // Check for general college information
  if (normalizedQuery.includes('college') || normalizedQuery.includes('institute') || 
      normalizedQuery.includes('saividya') || normalizedQuery.includes('svit') ||
      normalizedQuery.includes('established') || normalizedQuery.includes('year') ||
      normalizedQuery.includes('vtu') || normalizedQuery.includes('aicte') ||
      normalizedQuery.includes('naac') || normalizedQuery.includes('nba') ||
      normalizedQuery.includes('bangalore')) {
    const collegeDescription = `${COLLEGE_INFO.name} (${COLLEGE_INFO.location}), established in ${COLLEGE_INFO.establishedYear}, is a ${COLLEGE_INFO.affiliation}-affiliated, ${COLLEGE_INFO.approval}-approved engineering college with ${COLLEGE_INFO.accreditation.naac} and ${COLLEGE_INFO.accreditation.nba} accreditation, ${COLLEGE_INFO.founderDescription}. The college offers various engineering programs including Computer Science Engineering, Mechanical Engineering, Civil Engineering, Electronics and Communication Engineering, and Information Science Engineering. ${COLLEGE_INFO.placements.description}`;
    
    const translations: Record<string, string> = {
      hi: `${COLLEGE_INFO.name} (${COLLEGE_INFO.location}), ${COLLEGE_INFO.establishedYear} में स्थापित, ${COLLEGE_INFO.affiliation} से संबद्ध, ${COLLEGE_INFO.approval}-अनुमोदित इंजीनियरिंग कॉलेज है जिसमें ${COLLEGE_INFO.accreditation.naac} और ${COLLEGE_INFO.accreditation.nba} मान्यता है, ${COLLEGE_INFO.founderDescription}. कॉलेज विभिन्न इंजीनियरिंग कार्यक्रम प्रदान करता है जिसमें कंप्यूटर साइंस इंजीनियरिंग, मैकेनिकल इंजीनियरिंग, सिविल इंजीनियरिंग, इलेक्ट्रॉनिक्स और कम्युनिकेशन इंजीनियरिंग, और इंफॉर्मेशन साइंस इंजीनियरिंग शामिल हैं। ${COLLEGE_INFO.placements.description}`,
      te: `${COLLEGE_INFO.name} (${COLLEGE_INFO.location}), ${COLLEGE_INFO.establishedYear}లో స్థాపించబడినది, ${COLLEGE_INFO.affiliation}-అనుబంధిత, ${COLLEGE_INFO.approval}-అనుమోదించబడిన ఇంజనీరింగ్ కళాశాల ${COLLEGE_INFO.accreditation.naac} మరియు ${COLLEGE_INFO.accreditation.nba} అక్రెడిటేషన్ కలిగి ఉంది, ${COLLEGE_INFO.founderDescription}. కళాశాల వివిధ ఇంజనీరింగ్ కార్యక్రమాలను అందిస్తుంది వీటిలో కంప్యూటర్ సైన్స్ ఇంజనీరింగ్, మెకానికల్ ఇంజనీరింగ్, సివిల్ ఇంజనీరింగ్, ఎలక్ట్రానిక్స్ మరియు కమ్యూనికేషన్ ఇంజనీరింగ్, మరియు ఇన్ఫర్మేషన్ సైన్స్ ఇంజనీరింగ్ ఉన్నాయి. ${COLLEGE_INFO.placements.description}`,
      kn: `${COLLEGE_INFO.name} (${COLLEGE_INFO.location}), ${COLLEGE_INFO.establishedYear}ರಲ್ಲಿ ಸ್ಥಾಪಿಸಲ್ಪಟ್ಟಿದೆ, ${COLLEGE_INFO.affiliation}-ಸಂಬದ್ಧ, ${COLLEGE_INFO.approval}-ಅನುಮೋದಿತ ಇಂಜಿನಿಯರಿಂಗ್ ಕಾಲೇಜು ${COLLEGE_INFO.accreditation.naac} ಮತ್ತು ${COLLEGE_INFO.accreditation.nba} ಪ್ರಮಾಣೀಕರಣವನ್ನು ಹೊಂದಿದೆ, ${COLLEGE_INFO.founderDescription}. ಕಾಲೇಜು ವಿವಿಧ ಇಂಜಿನಿಯರಿಂಗ್ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ನೀಡುತ್ತದೆ ಇದರಲ್ಲಿ ಕಂಪ್ಯೂಟರ್ ಸೈನ್ಸ್ ಇಂಜಿನಿಯರಿಂಗ್, ಮೆಕ್ಯಾನಿಕಲ್ ಇಂಜಿನಿಯರಿಂಗ್, ಸಿವಿಲ್ ಇಂಜಿನಿಯರಿಂಗ್, ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್ ಮತ್ತು ಕಮ್ಯುನಿಕೇಷನ್ ಇಂಜಿನಿಯರಿಂಗ್, ಮತ್ತು ಇನ್ಫರ್ಮೇಷನ್ ಸೈನ್ಸ್ ಇಂಜಿನಿಯರಿಂಗ್ ಸೇರಿವೆ. ${COLLEGE_INFO.placements.description}`,
      ta: `${COLLEGE_INFO.name} (${COLLEGE_INFO.location}), ${COLLEGE_INFO.establishedYear}இல் நிறுவப்பட்டது, ${COLLEGE_INFO.affiliation}-இணைக்கப்பட்ட, ${COLLEGE_INFO.approval}-அனுமதிக்கப்பட்ட பொறியியல் கல்லூரி ${COLLEGE_INFO.accreditation.naac} மற்றும் ${COLLEGE_INFO.accreditation.nba} அங்கீகாரத்துடன், ${COLLEGE_INFO.founderDescription}. கல்லூரி பல்வேறு பொறியியல் திட்டங்களை வழங்குகிறது இதில் கணினி அறிவியல் பொறியியல், இயந்திர பொறியியல், சிவில் பொறியியல், மின்னணு மற்றும் தகவல்தொடர்பு பொறியியல், மற்றும் தகவல் அறிவியல் பொறியியல் அடங்கும். ${COLLEGE_INFO.placements.description}`,
      ml: `${COLLEGE_INFO.name} (${COLLEGE_INFO.location}), ${COLLEGE_INFO.establishedYear} ൽ സ്ഥാപിച്ചത്, ${COLLEGE_INFO.affiliation}-ലിങ്ക് ചെയ്ത, ${COLLEGE_INFO.approval}-അനുവദിച്ച എഞ്ചിനീയറിംഗ് കോളേജ് ${COLLEGE_INFO.accreditation.naac} കൂടാതെ ${COLLEGE_INFO.accreditation.nba} അക്രെഡിറ്റേഷൻ, ${COLLEGE_INFO.founderDescription}. കോളേജ് വിവിധ എഞ്ചിനീയറിംഗ് പ്രോഗ്രാമുകൾ വാഗ്ദാനം ചെയ്യുന്നു ഇതിൽ കമ്പ്യൂട്ടർ സയൻസ് എഞ്ചിനീയറിംഗ്, മെക്കാനിക്കൽ എഞ്ചിനീയറിംഗ്, സിവിൽ എഞ്ചിനീയറിംഗ്, ഇലക്ട്രോണിക്സ് ആൻഡ് കമ്യൂണിക്കേഷൻ എഞ്ചിനീയറിംഗ്, ആൻഡ് ഇൻഫർമേഷൻ സയൻസ് എഞ്ചിനീയറിംഗ് ഉൾപ്പെടുന്നു. ${COLLEGE_INFO.placements.description}`,
      en: collegeDescription
    };
    
    return {
      answer: translations[detectedLanguage] || translations.en,
      type: 'general',
      language: detectedLanguage
    };
  }
  
  // Default response for unclear queries
  const defaultData = getFeeStructureData(detectedLanguage);
  const defaultTemplate = defaultData?.templates?.default_response || `I can help you with information about ${COLLEGE_INFO.name}, including:
- Staff members and their contact details
- Board of Trustees
- Fee structure
- Department information
- Placement information

Could you please be more specific about what you'd like to know?`;

  return {
    answer: defaultTemplate,
    type: 'general',
    language: detectedLanguage
  };
}

