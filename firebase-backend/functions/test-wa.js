const fetch = require('node-fetch');

// This script tests the AiSensy API directly with the exact payload used in the app
async function testAiSensy() {
    const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OWUwNjJjMmU2ODRjMGM2MTA0MDU5MiIsIm5hbWUiOiJUT1AgU0VMTElORyBQUk9QRVJUWSIsImFwcE5hbWUiOiJBaVNlbnN5IiwiY2xpZW50SWQiOiI2ODllMDYyYzJlNjg0YzBjNjEwNDA1OGQiLCJhY3RpdmVQbGFuIjoiRlJFRV9GT1JFVkVSIiwiaWF0IjoxNzU1MTg2NzMyfQ.v-ZzaEeVf_AnIiIoCXy2mZWvZ92nYTGhZd9oEksrFqE";
    const API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

    const phoneNumber = "918888888888"; // User's test number from previous logs

    const messageBody = `Congratulations Test User on receiving your prestigious award.\n\nFor free partner registration and free property listings, please register at:\nwww.partner.topsellingproperty.com\n\nFor properties view.\nwww.topsellingproperty.com`;

    const payload = {
        apiKey: apiKey,
        campaignName: "bulk_message", // The one that supports files
        destination: phoneNumber,
        userName: "Antigravity Test",
        source: "API",
        media: {
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            filename: "certificate.pdf"
        },
        templateParams: [messageBody]
    };

    console.log('--- Testing AiSensy Payload ---');
    console.log(JSON.stringify(payload, null, 2));

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('\n--- AiSensy Response ---');
    console.log(JSON.stringify(data, null, 2));
}

testAiSensy().catch(console.error);
