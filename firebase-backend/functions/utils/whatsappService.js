const twilio = require('twilio');
const functions = require('firebase-functions');

// Get Twilio credentials from Firebase environment config
const config = functions.config();
const accountSid = config.twilio?.account_sid;
const authToken = config.twilio?.auth_token;
const whatsappNumber = config.twilio?.whatsapp_number || 'whatsapp:+14155238886';

let client;

// Initialize Twilio client if credentials are available
if (accountSid && authToken && accountSid !== 'your_twilio_account_sid') {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio WhatsApp client initialized');
} else {
    console.warn('⚠️  Twilio credentials not configured. WhatsApp features will be disabled.');
    console.warn('    Set them using: firebase functions:config:set twilio.account_sid="YOUR_SID" twilio.auth_token="YOUR_TOKEN"');
}

/**
 * Send certificate link via WhatsApp
 */
const sendCertificateLinkViaWhatsApp = async (recipientNumber, certificateUrl, certificateData) => {
    if (!client) {
        throw new Error('Twilio WhatsApp is not configured. Please set up your credentials.');
    }

    try {
        // Validate phone number format
        if (!recipientNumber.startsWith('+')) {
            recipientNumber = '+' + recipientNumber;
        }

        const message = `🎉 *Congratulations ${certificateData.recipient_name}!*\n\n` +
            `You have been awarded a Certificate of Appreciation from *Top Selling Property*.\n\n` +
            `📜 *Certificate Number:* ${certificateData.certificate_number}\n` +
            (certificateData.award_rera_number ? `🏆 *Award RERA Number:* ${certificateData.award_rera_number}\n` : '') +
            `\n📥 *Download your certificate:*\n${certificateUrl}\n\n` +
            `Thank you for your commitment and excellence!\n\n` +
            `*www.topsellingproperty.com*`;

        const response = await client.messages.create({
            body: message,
            from: whatsappNumber,
            to: `whatsapp:${recipientNumber}`
        });

        console.log(`✅ WhatsApp message sent to ${recipientNumber}. SID: ${response.sid}`);

        return {
            success: true,
            messageSid: response.sid,
            status: response.status,
            to: recipientNumber
        };
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
};

/**
 * Check if WhatsApp is configured
 */
const isWhatsAppConfigured = () => {
    return client !== undefined;
};

module.exports = {
    sendCertificateLinkViaWhatsApp,
    isWhatsAppConfigured
};
