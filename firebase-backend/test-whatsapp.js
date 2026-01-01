#!/usr/bin/env node

/**
 * Test WhatsApp Message Sending
 * 
 * Usage: node test-whatsapp.js
 */

const fetch = require('node-fetch');

// Get API URL from environment or use default
const API_URL = process.env.API_URL || 'https://us-central1-channel-partner-54334.cloudfunctions.net/api';

async function testWhatsApp() {
    const phoneNumber = '7500988212';
    const message = 'Hie';

    console.log('🧪 Testing WhatsApp Message Sending');
    console.log('='.repeat(50));
    console.log(`Phone Number: ${phoneNumber}`);
    console.log(`Message: "${message}"`);
    console.log(`API URL: ${API_URL}`);
    console.log('');

    try {
        const response = await fetch(`${API_URL}/test/whatsapp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone_number: phoneNumber,
                message: message
            }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ SUCCESS!');
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log('❌ FAILED!');
            console.log('Status:', response.status);
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error.stack);
    }
}

testWhatsApp();

