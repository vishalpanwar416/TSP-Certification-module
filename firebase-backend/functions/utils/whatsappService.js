/**
 * WhatsApp Cloud API Service (Meta's Official API)
 * 
 * This service uses Meta's official WhatsApp Cloud API for sending messages.
 * 
 * Required Firebase Config:
 * firebase functions:config:set whatsapp.phone_number_id="YOUR_PHONE_NUMBER_ID"
 * firebase functions:config:set whatsapp.access_token="YOUR_ACCESS_TOKEN"
 * firebase functions:config:set whatsapp.business_account_id="YOUR_BUSINESS_ACCOUNT_ID"
 */

const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Get WhatsApp Cloud API credentials from Firebase environment config
const config = functions.config();
const whatsappConfig = {
    phoneNumberId: config.whatsapp?.phone_number_id,
    accessToken: config.whatsapp?.access_token,
    businessAccountId: config.whatsapp?.business_account_id,
    apiVersion: 'v18.0'
};

// WhatsApp Cloud API base URL
const WHATSAPP_API_BASE = `https://graph.facebook.com/${whatsappConfig.apiVersion}`;

/**
 * Check if WhatsApp Cloud API is configured
 */
const isWhatsAppConfigured = () => {
    return !!(whatsappConfig.phoneNumberId && whatsappConfig.accessToken);
};

/**
 * Format phone number to WhatsApp format
 * WhatsApp requires numbers without + prefix
 */
const formatPhoneNumber = (phoneNumber) => {
    // Remove spaces, dashes, and parentheses
    let formatted = phoneNumber.replace(/[\s\-\(\)]/g, '');

    // Remove + prefix if present
    if (formatted.startsWith('+')) {
        formatted = formatted.substring(1);
    }

    // If number doesn't start with country code, assume India (+91)
    if (formatted.length === 10) {
        formatted = '91' + formatted;
    }

    return formatted;
};

/**
 * Send a text message via WhatsApp Cloud API
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} message - Text message to send
 */
const sendWhatsAppMessage = async (recipientNumber, message) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp Cloud API is not configured. Please set up your credentials.');
    }

    const formattedNumber = formatPhoneNumber(recipientNumber);

    try {
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${whatsappConfig.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${whatsappConfig.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: formattedNumber,
                    type: 'text',
                    text: {
                        preview_url: true,
                        body: message
                    }
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp API Error:', data);
            throw new Error(data.error?.message || 'Failed to send WhatsApp message');
        }

        console.log(`✅ WhatsApp message sent to ${formattedNumber}. Message ID: ${data.messages?.[0]?.id}`);

        return {
            success: true,
            messageId: data.messages?.[0]?.id,
            status: 'sent',
            to: formattedNumber
        };
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
};

/**
 * Send a template message via WhatsApp Cloud API
 * This is useful for approved business templates
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} templateName - Template name (must be approved)
 * @param {string} languageCode - Language code (e.g., 'en_US')
 * @param {Object[]} components - Template components (header, body, buttons)
 */
const sendWhatsAppTemplate = async (recipientNumber, templateName, languageCode = 'en_US', components = []) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp Cloud API is not configured. Please set up your credentials.');
    }

    const formattedNumber = formatPhoneNumber(recipientNumber);

    try {
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${whatsappConfig.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${whatsappConfig.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: formattedNumber,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: {
                            code: languageCode
                        },
                        components: components
                    }
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp Template API Error:', data);
            throw new Error(data.error?.message || 'Failed to send WhatsApp template');
        }

        console.log(`✅ WhatsApp template sent to ${formattedNumber}. Message ID: ${data.messages?.[0]?.id}`);

        return {
            success: true,
            messageId: data.messages?.[0]?.id,
            status: 'sent',
            to: formattedNumber
        };
    } catch (error) {
        console.error('Error sending WhatsApp template:', error);
        throw error;
    }
};

/**
 * Send a document/media message via WhatsApp Cloud API
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} documentUrl - Public URL of the document
 * @param {string} filename - Filename to display
 * @param {string} caption - Optional caption
 */
const sendWhatsAppDocument = async (recipientNumber, documentUrl, filename, caption = '') => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp Cloud API is not configured. Please set up your credentials.');
    }

    const formattedNumber = formatPhoneNumber(recipientNumber);

    try {
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${whatsappConfig.phoneNumberId}/messages`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${whatsappConfig.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: formattedNumber,
                    type: 'document',
                    document: {
                        link: documentUrl,
                        filename: filename,
                        caption: caption
                    }
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('WhatsApp Document API Error:', data);
            throw new Error(data.error?.message || 'Failed to send WhatsApp document');
        }

        console.log(`✅ WhatsApp document sent to ${formattedNumber}. Message ID: ${data.messages?.[0]?.id}`);

        return {
            success: true,
            messageId: data.messages?.[0]?.id,
            status: 'sent',
            to: formattedNumber
        };
    } catch (error) {
        console.error('Error sending WhatsApp document:', error);
        throw error;
    }
};

/**
 * Send certificate link via WhatsApp (for backward compatibility)
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} certificateUrl - URL of the certificate PDF
 * @param {Object} certificateData - Certificate details
 */
const sendCertificateLinkViaWhatsApp = async (recipientNumber, certificateUrl, certificateData) => {
    const message = `🎉 *Congratulations ${certificateData.recipient_name}!*\n\n` +
        `You have been awarded a Certificate of Appreciation from *Top Selling Property*.\n\n` +
        `📜 *Certificate Number:* ${certificateData.certificate_number}\n` +
        (certificateData.award_rera_number ? `🏆 *Award RERA Number:* ${certificateData.award_rera_number}\n` : '') +
        `\n📥 *Download your certificate:*\n${certificateUrl}\n\n` +
        `Thank you for your commitment and excellence!\n\n` +
        `*www.topsellingproperty.com*`;

    return sendWhatsAppMessage(recipientNumber, message);
};

/**
 * Send bulk WhatsApp messages
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} message - Message content
 */
const sendBulkWhatsApp = async (recipientNumber, message) => {
    return sendWhatsAppMessage(recipientNumber, message);
};

/**
 * Get WhatsApp Business Profile
 */
const getBusinessProfile = async () => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp Cloud API is not configured.');
    }

    try {
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${whatsappConfig.phoneNumberId}/whatsapp_business_profile`,
            {
                headers: {
                    'Authorization': `Bearer ${whatsappConfig.accessToken}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Failed to get business profile');
        }

        return data;
    } catch (error) {
        console.error('Error getting WhatsApp business profile:', error);
        throw error;
    }
};

/**
 * Check WhatsApp phone number status
 */
const getPhoneNumberStatus = async () => {
    if (!isWhatsAppConfigured()) {
        return { configured: false };
    }

    try {
        const response = await fetch(
            `${WHATSAPP_API_BASE}/${whatsappConfig.phoneNumberId}`,
            {
                headers: {
                    'Authorization': `Bearer ${whatsappConfig.accessToken}`,
                },
            }
        );

        const data = await response.json();

        if (!response.ok) {
            return { configured: true, valid: false, error: data.error?.message };
        }

        return {
            configured: true,
            valid: true,
            phoneNumber: data.display_phone_number,
            qualityRating: data.quality_rating,
            verifiedName: data.verified_name
        };
    } catch (error) {
        return { configured: true, valid: false, error: error.message };
    }
};

// Log configuration status on startup
if (isWhatsAppConfigured()) {
    console.log('✅ WhatsApp Cloud API configured');
    console.log(`   Phone Number ID: ${whatsappConfig.phoneNumberId}`);
} else {
    console.warn('⚠️  WhatsApp Cloud API credentials not configured.');
    console.warn('   Set them using:');
    console.warn('   firebase functions:config:set whatsapp.phone_number_id="YOUR_ID"');
    console.warn('   firebase functions:config:set whatsapp.access_token="YOUR_TOKEN"');
}

module.exports = {
    isWhatsAppConfigured,
    sendWhatsAppMessage,
    sendWhatsAppTemplate,
    sendWhatsAppDocument,
    sendCertificateLinkViaWhatsApp,
    sendBulkWhatsApp,
    getBusinessProfile,
    getPhoneNumberStatus,
    formatPhoneNumber
};
