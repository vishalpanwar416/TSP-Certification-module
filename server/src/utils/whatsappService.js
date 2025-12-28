import twilio from 'twilio';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';

let client;

// Initialize Twilio client only if credentials are available
if (accountSid && authToken && accountSid !== 'your_twilio_account_sid') {
    client = twilio(accountSid, authToken);
    console.log('✅ Twilio WhatsApp client initialized');
} else {
    console.warn('⚠️  Twilio credentials not configured. WhatsApp features will be disabled.');
}

/**
 * Send certificate via WhatsApp
 * @param {string} recipientNumber - Phone number in format: +1234567890
 * @param {string} pdfPath - Path to the PDF file
 * @param {object} certificateData - Certificate data
 */
export const sendCertificateViaWhatsApp = async (recipientNumber, pdfPath, certificateData) => {
    if (!client) {
        throw new Error('Twilio WhatsApp is not configured. Please set up your credentials in .env file.');
    }

    try {
        // Validate phone number format
        if (!recipientNumber.startsWith('+')) {
            recipientNumber = '+' + recipientNumber;
        }

        // Ensure PDF file exists
        if (!fs.existsSync(pdfPath)) {
            throw new Error(`PDF file not found: ${pdfPath}`);
        }

        const message = `🎉 *Congratulations ${certificateData.recipient_name}!*\n\n` +
            `You have been awarded a Certificate of Appreciation from *Top Selling Property*.\n\n` +
            `📜 *Certificate Number:* ${certificateData.certificate_number}\n` +
            (certificateData.award_rera_number ? `🏆 *Award RERA Number:* ${certificateData.award_rera_number}\n` : '') +
            `\nYour certificate is attached to this message.\n\n` +
            `Thank you for your commitment and excellence!\n\n` +
            `*www.topsellingproperty.com*`;

        // For now, we'll send a message (file sending via WhatsApp requires approved Twilio account)
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
 * Send certificate link via WhatsApp
 * @param {string} recipientNumber - Phone number
 * @param {string} certificateUrl - Public URL to certificate PDF
 * @param {object} certificateData - Certificate data
 */
export const sendCertificateLinkViaWhatsApp = async (recipientNumber, certificateUrl, certificateData) => {
    if (!client) {
        throw new Error('Twilio WhatsApp is not configured. Please set up your credentials in .env file.');
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

        console.log(`✅ WhatsApp message with link sent to ${recipientNumber}. SID: ${response.sid}`);

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
export const isWhatsAppConfigured = () => {
    return client !== undefined;
};

export default {
    sendCertificateViaWhatsApp,
    sendCertificateLinkViaWhatsApp,
    isWhatsAppConfigured
};
