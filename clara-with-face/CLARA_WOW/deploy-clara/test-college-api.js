// Test script for College Information API
// Run with: node test-college-api.js

const testQueries = [
    "give me college information",
    "give me the college information right now",
    "tell me about fees",
    "who is Prof. Lakshmi Durga",
    "what are the placements",
    "college information",
    "fee structure",
    "staff members"
];

async function testCollegeAPI(query) {
    try {
        const apiBase = process.env.API_BASE || 'http://localhost:8080';
        console.log(`\n🧪 Testing query: "${query}"`);
        console.log(`📡 API URL: ${apiBase}/api/college/ask`);
        
        const response = await fetch(`${apiBase}/api/college/ask`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        
        console.log(`✅ Response status: ${response.status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Error: ${response.status} ${response.statusText}`);
            console.error(`📄 Error body: ${errorText}`);
            return null;
        }
        
        const data = await response.json();
        console.log(`📦 Response data:`, JSON.stringify(data, null, 2));
        console.log(`📝 Answer length: ${data.answer?.length || 0} characters`);
        console.log(`🎯 Type: ${data.type}`);
        
        if (data.answer) {
            console.log(`\n💬 Answer preview (first 200 chars):`);
            console.log(data.answer.substring(0, 200) + '...');
        }
        
        return data;
    } catch (error) {
        console.error(`❌ Test failed:`, error.message);
        console.error(`📚 Stack:`, error.stack);
        return null;
    }
}

async function runAllTests() {
    console.log('🚀 Starting College Information API Tests');
    console.log('=' .repeat(60));
    
    const results = [];
    
    for (const query of testQueries) {
        const result = await testCollegeAPI(query);
        results.push({ query, success: !!result, answer: result?.answer });
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between requests
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary:');
    console.log('='.repeat(60));
    
    results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} Test ${index + 1}: "${result.query}"`);
        if (result.success && result.answer) {
            console.log(`   Answer length: ${result.answer.length} chars`);
        }
    });
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${results.length}`);
    console.log('='.repeat(60));
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

