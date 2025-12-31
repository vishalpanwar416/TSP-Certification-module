/**
 * WhatsApp Service supporting both Meta Official API and AiSensy
 * 
 * Required Firebase Config for Meta:
 * firebase functions:config:set whatsapp.phone_number_id="YOUR_PHONE_NUMBER_ID"
 * firebase functions:config:set whatsapp.access_token="YOUR_ACCESS_TOKEN"
 * 
 * Required Firebase Config for AiSensy:
 * firebase functions:config:set whatsapp.api_key="YOUR_AISENSY_JWT_TOKEN"
 * firebase functions:config:set whatsapp.campaign_name="YOUR_CAMPAIGN_NAME" (optional)
 */

const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Get WhatsApp credentials from Firebase environment config
const config = functions.config();
const whatsappConfig = {
    // Meta Config
    phoneNumberId: config.whatsapp?.phone_number_id,
    accessToken: config.whatsapp?.access_token,
    businessAccountId: config.whatsapp?.business_account_id,
    apiVersion: 'v18.0',

    // AiSensy Config
    apiKey: config.whatsapp?.api_key,
    campaignName: config.whatsapp?.campaign_name || 'certificate_delivery'
};

// WhatsApp API base URLs
const META_API_BASE = `https://graph.facebook.com/${whatsappConfig.apiVersion}`;
const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

/**
 * Check if WhatsApp is configured (either Meta or AiSensy)
 */
const isWhatsAppConfigured = () => {
    return !!((whatsappConfig.phoneNumberId && whatsappConfig.accessToken) || whatsappConfig.apiKey);
};

/**
 * Format phone number to WhatsApp format
 * WhatsApp requires numbers without + prefix
 */
const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';

    // Remove spaces, dashes, parentheses and other characters
    let formatted = phoneNumber.toString().replace(/[\s\-\(\)\+]/g, '');

    // If number doesn't start with country code, assume India (91)
    // Check if it's 10 digits and doesn't start with 91 already
    if (formatted.length === 10) {
        formatted = '91' + formatted;
    }

    return formatted;
};

/**
 * Send a message via AiSensy
 */
const sendAiSensyMessage = async (recipientNumber, message, mediaUrl = null, filename = 'document.pdf') => {
    const formattedNumber = formatPhoneNumber(recipientNumber);

    const body = {
        apiKey: whatsappConfig.apiKey,
        campaignName: whatsappConfig.campaignName,
        destination: formattedNumber,
        userName: 'User',
        source: 'API',
        templateParams: [message] // Usually message goes into template params if it's a template
    };

    // If there's media
    if (mediaUrl) {
        body.media = {
            url: mediaUrl,
            filename: filename
        };
    }

    // Note: AiSensy depends heavily on templates. If this is a template-less message, 
    // it usually won't work unless the campaign is specifically designed for text-only parameter.
    // For now, we'll try sending the message as a template param.

    try {
        const response = await fetch(AISENSY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok || data.success === false) {
            console.error('AiSensy API Error:', data);
            throw new Error(data.message || 'Failed to send AiSensy message');
        }

        console.log(`✅ AiSensy message sent to ${formattedNumber}`);
        return {
            success: true,
            status: 'sent',
            to: formattedNumber,
            api: 'aisensy',
            data: data
        };
    } catch (error) {
        console.error('Error sending AiSensy message:', error);
        throw error;
    }
};

/**
 * Send a text message via Meta WhatsApp Cloud API
 */
const sendMetaMessage = async (recipientNumber, message) => {
    const formattedNumber = formatPhoneNumber(recipientNumber);

    const response = await fetch(
        `${META_API_BASE}/${whatsappConfig.phoneNumberId}/messages`,
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
        console.error('Meta WhatsApp API Error:', data);
        throw new Error(data.error?.message || 'Failed to send Meta WhatsApp message');
    }

    console.log(`✅ Meta WhatsApp message sent to ${formattedNumber}`);

    return {
        success: true,
        messageId: data.messages?.[0]?.id,
        status: 'sent',
        to: formattedNumber,
        api: 'meta'
    };
};

/**
 * Main send function that chooses between Meta and AiSensy
 */
const sendWhatsAppMessage = async (recipientNumber, message) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured. Please set up Meta or AiSensy credentials.');
    }

    if (whatsappConfig.apiKey) {
        return sendAiSensyMessage(recipientNumber, message);
    } else {
        return sendMetaMessage(recipientNumber, message);
    }
};

/**
 * Send a template message (Currently Meta only)
 */
const sendWhatsAppTemplate = async (recipientNumber, templateName, languageCode = 'en_US', components = []) => {
    if (whatsappConfig.apiKey) {
        // For AiSensy, we just use the campaign name as the template
        return sendAiSensyMessage(recipientNumber, '', null, null);
    }

    const formattedNumber = formatPhoneNumber(recipientNumber);

    const response = await fetch(
        `${META_API_BASE}/${whatsappConfig.phoneNumberId}/messages`,
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
                    language: { code: languageCode },
                    components: components
                }
            }),
        }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to send template');

    return {
        success: true,
        messageId: data.messages?.[0]?.id,
        status: 'sent',
        to: formattedNumber
    };
};

/**
 * Send a document/media message
 */
const sendWhatsAppDocument = async (recipientNumber, documentUrl, filename, caption = '') => {
    if (whatsappConfig.apiKey) {
        return sendAiSensyMessage(recipientNumber, caption, documentUrl, filename);
    }

    const formattedNumber = formatPhoneNumber(recipientNumber);

    const response = await fetch(
        `${META_API_BASE}/${whatsappConfig.phoneNumberId}/messages`,
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
    if (!response.ok) throw new Error(data.error?.message || 'Failed to send document');

    return {
        success: true,
        status: 'sent',
        to: formattedNumber
    };
};

/**
 * Send certificate link via WhatsApp
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
 * Send bulk WhatsApp (helper)
 */
const sendBulkWhatsApp = async (recipientNumber, message) => {
    return sendWhatsAppMessage(recipientNumber, message);
};

/**
 * Get Business Profile (Meta Only)
 */
const getBusinessProfile = async () => {
    if (whatsappConfig.apiKey) return { api: 'aisensy', status: 'active' };

    const response = await fetch(
        `${META_API_BASE}/${whatsappConfig.phoneNumberId}/whatsapp_business_profile`,
        {
            headers: { 'Authorization': `Bearer ${whatsappConfig.accessToken}` },
        }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to get profile');
    return data;
};

/**
 * Check phone number status
 */
const getPhoneNumberStatus = async () => {
    if (whatsappConfig.apiKey) return { configured: true, valid: true, api: 'aisensy' };
    if (!whatsappConfig.phoneNumberId || !whatsappConfig.accessToken) return { configured: false };

    try {
        const response = await fetch(
            `${META_API_BASE}/${whatsappConfig.phoneNumberId}`,
            { headers: { 'Authorization': `Bearer ${whatsappConfig.accessToken}` } }
        );

        const data = await response.json();
        if (!response.ok) return { configured: true, valid: false, error: data.error?.message };

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

// Log configuration status
if (isWhatsAppConfigured()) {
    if (whatsappConfig.apiKey) {
        console.log('✅ WhatsApp configured via AiSensy');
    } else {
        console.log('✅ WhatsApp configured via Meta');
    }
} else {
    console.warn('⚠️ WhatsApp credentials not configured.');
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

