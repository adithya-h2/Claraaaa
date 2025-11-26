// Test script for Staff Member Detailed Descriptions
// Run with: node test-staff-details.js

const testQueries = [
    { query: "who is Nagashree", expectedName: "Nagashree", description: "Query for Dr. Nagashree N" },
    { query: "tell me about Prof. Lakshmi Durga", expectedName: "Lakshmi", description: "Query for Prof. Lakshmi Durga N" },
    { query: "who is Prof. Anitha", expectedName: "Anitha", description: "Query for Prof. Anitha C S" },
    { query: "information about Dr. G Dhivyasri", expectedName: "Dhivyasri", description: "Query for Dr. G Dhivyasri" },
    { query: "who is Prof. Nisha", expectedName: "Nisha", description: "Query for Prof. Nisha S K" },
    { query: "tell me about Prof. Amarnath", expectedName: "Amarnath", description: "Query for Prof. Amarnath B Patil" },
    { query: "who is Prof. Anil Kumar", expectedName: "Anil", description: "Query for Prof. Anil Kumar K V" },
    { query: "information about Prof. Jyoti", expectedName: "Jyoti", description: "Query for Prof. Jyoti Kumari" },
    { query: "who is Prof. Vidyashree", expectedName: "Vidyashree", description: "Query for Prof. Vidyashree R" },
    { query: "tell me about Dr. Bhavana", expectedName: "Bhavana", description: "Query for Dr. Bhavana A" },
    { query: "who is Prof. Bhavya", expectedName: "Bhavya", description: "Query for Prof. Bhavya T N" },
    { query: "staff members", expectedName: null, description: "Query for all staff members" },
];

// Expected detailed descriptions (key phrases that should appear)
const expectedPhrases = {
    "Nagashree": ["Theory of Computation", "Yoga", "holistic education", "physical wellness"],
    "Lakshmi": ["Software Engineering", "Project Management", "Data Visualization", "Computer Networks Labs"],
    "Anitha": ["Research Methodology", "IPR", "Computer Networks Lab", "research skills"],
    "Dhivyasri": ["Computer Networks specialist", "doctoral qualifications", "networking technologies"],
    "Nisha": ["NOSQL Databases", "big data", "cloud computing", "database management"],
    "Amarnath": ["Mini Projects", "hands-on learning", "real-world practical applications"],
    "Anil": ["Environmental Studies", "environmental responsibilities", "sustainability practices"],
    "Jyoti": ["Computer Networks Lab", "Physical Education", "physical fitness", "student development"],
    "Vidyashree": ["Data Visualization Lab", "data representation", "visual means"],
    "Bhavana": ["Mini Projects", "doctoral expertise", "guidance and mentorship"],
    "Bhavya": ["National Service Scheme", "social service", "community development", "holistic personality"],
};

async function testStaffDetails(query, expectedName, description) {
    try {
        const apiBase = process.env.API_BASE || 'http://localhost:8080';
        console.log(`\n🧪 Testing: ${description}`);
        console.log(`   Query: "${query}"`);
        
        const response = await fetch(`${apiBase}/api/college/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        
        if (!response.ok) {
            console.error(`   ❌ API Error: ${response.status} ${response.statusText}`);
            return { success: false, error: `HTTP ${response.status}` };
        }
        
        const result = await response.json();
        const answer = result.answer || '';
        
        console.log(`   📝 Answer preview (first 200 chars):`);
        console.log(`   ${answer.substring(0, 200)}...`);
        
        // Check if it's using detailed descriptions (not old format)
        const oldFormatPatterns = [
            /teaches.*in the.*department/i,
            /\(Doctor\) teaches/i,
            /subjects:.*Email:/i,
        ];
        
        const hasOldFormat = oldFormatPatterns.some(pattern => pattern.test(answer));
        
        if (hasOldFormat) {
            console.log(`   ⚠️  WARNING: Response appears to use old format!`);
        }
        
        // Check for detailed description indicators
        const detailedFormatIndicators = [
            /providing.*guidance/i,
            /specializes in/i,
            /offering.*insights/i,
            /preparing students/i,
            /guiding students/i,
            /helping students/i,
            /balancing.*proficiency/i,
            /teaching essential skills/i,
            /enriching.*work/i,
            /encouraging.*engagement/i,
        ];
        
        const hasDetailedFormat = detailedFormatIndicators.some(pattern => pattern.test(answer));
        
        // If querying a specific staff member, check for expected phrases
        let hasExpectedPhrases = true;
        if (expectedName && expectedPhrases[expectedName]) {
            const phrases = expectedPhrases[expectedName];
            const foundPhrases = phrases.filter(phrase => 
                answer.toLowerCase().includes(phrase.toLowerCase())
            );
            
            console.log(`   🔍 Expected phrases found: ${foundPhrases.length}/${phrases.length}`);
            if (foundPhrases.length < phrases.length / 2) {
                hasExpectedPhrases = false;
                console.log(`   ⚠️  Missing expected phrases: ${phrases.filter(p => !answer.toLowerCase().includes(p.toLowerCase())).join(', ')}`);
            }
        }
        
        // Check if email is included
        const hasEmail = /@.*\.com/i.test(answer);
        
        const success = !hasOldFormat && hasDetailedFormat && hasExpectedPhrases && hasEmail;
        
        if (success) {
            console.log(`   ✅ PASSED - Using detailed descriptions`);
        } else {
            console.log(`   ❌ FAILED`);
            if (hasOldFormat) console.log(`      - Still using old format`);
            if (!hasDetailedFormat) console.log(`      - Missing detailed description indicators`);
            if (!hasExpectedPhrases) console.log(`      - Missing expected phrases`);
            if (!hasEmail) console.log(`      - Missing email address`);
        }
        
        return { 
            success, 
            hasOldFormat, 
            hasDetailedFormat, 
            hasExpectedPhrases, 
            hasEmail,
            answerLength: answer.length 
        };
        
    } catch (error) {
        console.error(`   ❌ ERROR: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runAllTests() {
    console.log('🚀 Testing Staff Member Detailed Descriptions');
    console.log('='.repeat(60));
    
    const results = [];
    
    for (const test of testQueries) {
        const result = await testStaffDetails(test.query, test.expectedName, test.description);
        results.push({ ...test, ...result });
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary:');
    console.log('='.repeat(60));
    
    results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} Test ${index + 1}: ${result.description}`);
        if (result.success) {
            console.log(`   Answer length: ${result.answerLength} chars`);
        } else {
            if (result.hasOldFormat) console.log(`   ⚠️  Using old format`);
            if (!result.hasDetailedFormat) console.log(`   ⚠️  Missing detailed format`);
            if (!result.hasExpectedPhrases) console.log(`   ⚠️  Missing expected phrases`);
            if (!result.hasEmail) console.log(`   ⚠️  Missing email`);
        }
    });
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${results.length}`);
    console.log('='.repeat(60));
    
    // Detailed breakdown
    const usingOldFormat = results.filter(r => r.hasOldFormat).length;
    const missingDetailed = results.filter(r => !r.hasDetailedFormat).length;
    const missingPhrases = results.filter(r => !r.hasExpectedPhrases).length;
    const missingEmail = results.filter(r => !r.hasEmail).length;
    
    if (usingOldFormat > 0 || missingDetailed > 0 || missingPhrases > 0 || missingEmail > 0) {
        console.log('\n📋 Issues Found:');
        if (usingOldFormat > 0) console.log(`   - ${usingOldFormat} tests using old format`);
        if (missingDetailed > 0) console.log(`   - ${missingDetailed} tests missing detailed format indicators`);
        if (missingPhrases > 0) console.log(`   - ${missingPhrases} tests missing expected phrases`);
        if (missingEmail > 0) console.log(`   - ${missingEmail} tests missing email addresses`);
    }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ Error: fetch is not available. Please use Node.js 18+ or install node-fetch');
    process.exit(1);
}

// Run tests
runAllTests().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

