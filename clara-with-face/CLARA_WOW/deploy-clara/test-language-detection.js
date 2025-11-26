// Test script for language detection
// Run with: node test-language-detection.js

const testQueries = [
    { query: "who is Nagashree", expected: "en", description: "English question" },
    { query: "give me college information", expected: "en", description: "English request" },
    { query: "tell me about fees", expected: "en", description: "English query" },
    { query: "कॉलेज की जानकारी दो", expected: "hi", description: "Hindi query" },
    { query: "కళాశాల సమాచారం ఇవ్వండి", expected: "te", description: "Telugu query" },
    { query: "who is Prof. Lakshmi", expected: "en", description: "English with name" },
    { query: "what are the placements", expected: "en", description: "English question" },
    { query: "college information right now", expected: "en", description: "English request" },
];

async function testLanguageDetection() {
    console.log('🧪 Testing Language Detection');
    console.log('='.repeat(60));
    
    // Test language detection directly
    try {
        // Since we can't easily import TypeScript files, we'll test the API endpoint instead
        const apiBase = process.env.API_BASE || 'http://localhost:8080';
        
        let passed = 0;
        let failed = 0;
        
        for (const test of testQueries) {
            console.log(`\n📝 Test: ${test.description}`);
            console.log(`   Query: "${test.query}"`);
            console.log(`   Expected: ${test.expected}`);
            
            try {
                // Test via API endpoint
                const response = await fetch(`${apiBase}/api/college/ask`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: test.query })
                });
                
                if (!response.ok) {
                    console.error(`   ❌ API Error: ${response.status} ${response.statusText}`);
                    failed++;
                    continue;
                }
                
                const result = await response.json();
                console.log(`   Answer preview: ${result.answer?.substring(0, 100) || 'No answer'}...`);
                
                // Check if the answer is in the expected language
                // For English, check if it contains English words and NOT Indonesian patterns
                // For other languages, check if it contains Unicode characters for that language
                let detectedLang = 'en';
                if (/[\u0900-\u097F]/.test(result.answer)) detectedLang = 'hi';
                else if (/[\u0C00-\u0C7F]/.test(result.answer)) detectedLang = 'te';
                else if (/[\u0C80-\u0CFF]/.test(result.answer)) detectedLang = 'kn';
                else if (/[\u0B80-\u0BFF]/.test(result.answer)) detectedLang = 'ta';
                else if (/[\u0D00-\u0D7F]/.test(result.answer)) detectedLang = 'ml';
                else {
                    // Check for English patterns (not Indonesian)
                    const englishWords = ['the', 'is', 'are', 'who', 'what', 'where', 'college', 'information', 'teaches', 'department', 'email', 'teaches'];
                    const indonesianWords = ['adalah', 'dengan', 'yang', 'dari', 'untuk', 'ini', 'itu', 'di', 'pada', 'akan', 'telah', 'sudah'];
                    const hasEnglishWords = englishWords.some(word => result.answer.toLowerCase().includes(word));
                    const hasIndonesianWords = indonesianWords.some(word => result.answer.toLowerCase().includes(word));
                    
                    if (hasIndonesianWords && !hasEnglishWords) {
                        detectedLang = 'id'; // Indonesian
                    } else if (hasEnglishWords || /^[a-zA-Z\s\?\.\!,;:'"\-]+$/.test(result.answer)) {
                        detectedLang = 'en';
                    }
                }
                
                console.log(`   Detected in answer: ${detectedLang}`);
                
                if (detectedLang === test.expected) {
                    console.log(`   ✅ PASSED`);
                    passed++;
                } else {
                    console.log(`   ❌ FAILED - Expected ${test.expected}, got ${detectedLang}`);
                    if (detectedLang === 'id') {
                        console.log(`   ⚠️  WARNING: Response is in Indonesian, not ${test.expected}!`);
                    }
                    failed++;
                }
            } catch (error) {
                console.error(`   ❌ ERROR: ${error.message}`);
                failed++;
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary:');
        console.log('='.repeat(60));
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📊 Total: ${testQueries.length}`);
        console.log('='.repeat(60));
        
    } catch (error) {
        console.error('❌ Error importing college query service:', error);
        console.error('Stack:', error.stack);
    }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ Error: fetch is not available. Please use Node.js 18+ or install node-fetch');
    process.exit(1);
}

// Run tests
testLanguageDetection().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

