// Test script for Fee Structure with Sentence Format
// Run with: node test-fee-structure.js

const testQueries = [
    { query: "tell me about fees", description: "General fee query" },
    { query: "what are the CSE fees", description: "CSE department fees" },
    { query: "ECE fees", description: "ECE department fees" },
    { query: "second year CSE fees", description: "Second year CSE fees" },
    { query: "third year ECE fees", description: "Third year ECE fees" },
    { query: "fourth year ISE fees", description: "Fourth year ISE fees" },
    { query: "MECH fees for second year", description: "MECH second year fees" },
    { query: "hostel fees", description: "Hostel fees query" },
    { query: "transport fees", description: "Transport/bus fees query" },
    { query: "CSE-AML fees", description: "CSE-AML department fees" },
    { query: "CSE-DS fees", description: "CSE-DS department fees" },
    { query: "COMED-K fees for CSE", description: "COMED-K quota CSE fees" },
];

async function testFeeStructure(query, description) {
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
        
        console.log(`   📝 Answer (first 300 chars):`);
        console.log(`   ${answer.substring(0, 300)}...`);
        console.log(`   📏 Answer length: ${answer.length} characters`);
        
        // Check if it's in sentence format (not bullet points or old format)
        const hasSentenceFormat = !answer.includes(':\n') && !answer.includes('-\n') && 
                                  (answer.includes('.') || answer.includes(',')) &&
                                  answer.split('.').length > 2; // Multiple sentences
        
        // Check for key fee information
        const hasFeeAmount = /\₹[\d,]+/.test(answer);
        const hasPaymentInfo = answer.toLowerCase().includes('payment') || 
                              answer.toLowerCase().includes('deadline') ||
                              answer.toLowerCase().includes('contact');
        
        // Check for department/year specific info if query mentions it
        const queryLower = query.toLowerCase();
        let hasSpecificInfo = true;
        if (queryLower.includes('cse') && !answer.toLowerCase().includes('computer science')) {
            hasSpecificInfo = false;
        }
        if (queryLower.includes('ece') && !answer.toLowerCase().includes('electronics')) {
            hasSpecificInfo = false;
        }
        if (queryLower.includes('hostel') && !answer.toLowerCase().includes('hostel')) {
            hasSpecificInfo = false;
        }
        if (queryLower.includes('transport') && !answer.toLowerCase().includes('transport') && 
            !answer.toLowerCase().includes('bus')) {
            hasSpecificInfo = false;
        }
        
        const success = hasSentenceFormat && hasFeeAmount && hasPaymentInfo && hasSpecificInfo;
        
        if (success) {
            console.log(`   ✅ PASSED - Beautiful sentence format with fee details`);
        } else {
            console.log(`   ❌ FAILED`);
            if (!hasSentenceFormat) console.log(`      - Not in sentence format`);
            if (!hasFeeAmount) console.log(`      - Missing fee amounts`);
            if (!hasPaymentInfo) console.log(`      - Missing payment information`);
            if (!hasSpecificInfo) console.log(`      - Missing specific information`);
        }
        
        return { 
            success, 
            hasSentenceFormat, 
            hasFeeAmount, 
            hasPaymentInfo, 
            hasSpecificInfo,
            answerLength: answer.length 
        };
        
    } catch (error) {
        console.error(`   ❌ ERROR: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function runAllTests() {
    console.log('🚀 Testing Fee Structure with Sentence Format');
    console.log('='.repeat(60));
    
    const results = [];
    
    for (const test of testQueries) {
        const result = await testFeeStructure(test.query, test.description);
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
            if (!result.hasSentenceFormat) console.log(`   ⚠️  Not in sentence format`);
            if (!result.hasFeeAmount) console.log(`   ⚠️  Missing fee amounts`);
            if (!result.hasPaymentInfo) console.log(`   ⚠️  Missing payment info`);
            if (!result.hasSpecificInfo) console.log(`   ⚠️  Missing specific info`);
        }
    });
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${results.length}`);
    console.log('='.repeat(60));
    
    // Show sample responses
    if (results.length > 0 && results[0].answerLength) {
        console.log('\n📋 Sample Response Preview:');
        console.log('='.repeat(60));
        const firstResult = results.find(r => r.success);
        if (firstResult) {
            // Get full response for first successful test
            try {
                const apiBase = process.env.API_BASE || 'http://localhost:8080';
                const response = await fetch(`${apiBase}/api/college/ask`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: firstResult.query })
                });
                if (response.ok) {
                    const data = await response.json();
                    console.log(`Query: "${firstResult.query}"`);
                    console.log(`Response:\n${data.answer}\n`);
                }
            } catch (e) {
                console.log('Could not fetch sample response');
            }
        }
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

