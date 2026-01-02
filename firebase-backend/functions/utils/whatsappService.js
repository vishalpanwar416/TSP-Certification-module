/**
 * WhatsApp Service supporting both Meta WhatsApp Business API and AiSensy
 * 
 * Meta WhatsApp Business API Config:
 * firebase functions:config:set whatsapp.phone_number_id="YOUR_PHONE_NUMBER_ID"
 * firebase functions:config:set whatsapp.access_token="YOUR_ACCESS_TOKEN"
 * firebase functions:config:set whatsapp.business_account_id="YOUR_BUSINESS_ACCOUNT_ID" (optional)
 * firebase functions:config:set whatsapp.api_version="v18.0" (optional, defaults to v18.0)
 * 
 * AiSensy Config:
 * firebase functions:config:set whatsapp.api_key="YOUR_AISENSY_JWT_TOKEN"
 * firebase functions:config:set whatsapp.campaign_name="YOUR_CAMPAIGN_NAME" (optional)
 */

const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Get WhatsApp credentials from Firebase environment config
const config = functions.config();
const whatsappConfig = {
    // Meta WhatsApp Business API Config
    phoneNumberId: config.whatsapp?.phone_number_id,
    accessToken: config.whatsapp?.access_token,
    businessAccountId: config.whatsapp?.business_account_id,
    apiVersion: config.whatsapp?.api_version || 'v18.0',

    // AiSensy Config
    apiKey: config.whatsapp?.api_key,
    campaignName: config.whatsapp?.campaign_name || 'bulk_message'
};

// API URLs
const META_API_BASE = `https://graph.facebook.com/${whatsappConfig.apiVersion}`;
const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

/**
 * Check if WhatsApp is configured (either Meta or AiSensy)
 */
const isWhatsAppConfigured = () => {
    // Check for Meta API
    const metaConfigured = !!(whatsappConfig.phoneNumberId && whatsappConfig.accessToken);
    // Check for AiSensy
    const aisensyConfigured = !!whatsappConfig.apiKey;

    return metaConfigured || aisensyConfigured;
};

/**
 * Check which API is being used
 */
const getActiveAPI = () => {
    if (whatsappConfig.apiKey) {
        return 'aisensy';
    } else if (whatsappConfig.phoneNumberId && whatsappConfig.accessToken) {
        return 'meta';
    }
    return null;
};

/**
 * Format phone number to WhatsApp format
 * WhatsApp requires numbers without + prefix
 */
const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';

    // Remove all non-digit characters including spaces, dashes, parentheses, plus signs
    let formatted = phoneNumber.toString().replace(/[\s\-\(\)\+\.]/g, '');

    // Remove leading zeros if present
    formatted = formatted.replace(/^0+/, '');

    // If number doesn't start with country code, assume India (91)
    // Check if it's 10 digits and doesn't start with 91 already
    if (formatted.length === 10 && !formatted.startsWith('91')) {
        formatted = '91' + formatted;
    }

    // Ensure it's a valid format (should be country code + number, at least 10 digits)
    if (formatted.length < 10) {
        throw new Error(`Invalid phone number format: ${phoneNumber}`);
    }

    return formatted;
};

/**
 * Send a message via Meta WhatsApp Business API
 */
const sendMetaMessage = async (recipientNumber, message) => {
    const formattedNumber = formatPhoneNumber(recipientNumber);

    try {
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
            throw new Error(data.error?.message || data.error?.error_user_msg || 'Failed to send WhatsApp message');
        }

        console.log(`✅ Meta WhatsApp message sent to ${formattedNumber}. Message ID: ${data.messages?.[0]?.id}`);

        return {
            success: true,
            messageId: data.messages?.[0]?.id,
            status: 'sent',
            to: formattedNumber,
            api: 'meta'
        };
    } catch (error) {
        console.error('Error sending Meta WhatsApp message:', error);
        throw error;
    }
};

/**
 * Send a message via AiSensy API
 */
const sendAiSensyMessage = async (recipientNumber, message, mediaUrl = null, filename = null, customCampaignName = null) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('AiSensy API is not configured. Please set up your API key.');
    }

    const campaign = customCampaignName || whatsappConfig.campaignName;
    const formattedNumber = formatPhoneNumber(recipientNumber);
    console.log(`📤 Sending AiSensy message to ${formattedNumber} (Campaign: ${campaign})`);

    // Process message: if it's a string, ensure it's not empty after trimming
    // If media is provided, allow empty message (caption is optional)
    let processedMessage = message;
    if (typeof message === 'string') {
        // IMPORTANT: Don't trim the message - preserve all newlines and whitespace
        // Trimming would remove newlines and content after placeholders
        // Only check if message is completely empty (all whitespace)
        const trimmed = message.trim();
        if (!mediaUrl && trimmed.length === 0) {
            throw new Error('Message cannot be empty. Please provide message content.');
        }
        // Keep the original message completely intact - don't trim anything
        // This ensures newlines after {{name}} and all content is preserved
        processedMessage = message; // Use original message, never trimmed
    }

    // For AiSensy, handle message formatting
    // Most campaigns expect a single string with newlines preserved
    // Normalize line endings and send as single string (this matches the test file pattern)
    let templateParams;
    if (Array.isArray(processedMessage)) {
        templateParams = processedMessage;
    } else if (typeof processedMessage === 'string') {
        // Normalize line endings (convert \r\n and \r to \n for consistency)
        // Send as a single string - AiSensy should preserve newlines in the message
        const normalizedMessage = processedMessage.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        templateParams = [normalizedMessage];
    } else {
        templateParams = [processedMessage];
    }

    // AiSensy API body - message goes in templateParams array
    const body = {
        apiKey: whatsappConfig.apiKey,
        campaignName: campaign,
        destination: formattedNumber,
        userName: 'User',
        source: 'API',
        templateParams: templateParams
    };

    // Ensure mediaUrl is always defined (never undefined)
    // Default to null if not provided or if it's undefined
    let finalMediaUrl = (mediaUrl !== undefined && mediaUrl !== null && typeof mediaUrl === 'string') ? mediaUrl : null;
    
    if (finalMediaUrl && (finalMediaUrl.includes('localhost') || finalMediaUrl.includes('127.0.0.1'))) {
        console.warn('⚠️ Sending a LOCALHOST/EMULATOR URL to AiSensy. Unless you are using ngrok, AiSensy will fail to download this file.');
    }

    // Construct media object if URL is provided
    let media = undefined;
    if (finalMediaUrl && typeof finalMediaUrl === 'string' && finalMediaUrl.length > 0) {
        media = {
            url: finalMediaUrl,
            filename: filename || (finalMediaUrl.endsWith('.jpg') || finalMediaUrl.endsWith('.jpeg') ? 'certificate.jpg' : 'certificate.pdf')
        };
    }

    const payload = {
        ...body,
        media: media
    };

    console.log('🚀 Sending request to AiSensy:', JSON.stringify({
        ...payload,
        apiKey: 'REDACTED', // Don't log the API key
        destination: formattedNumber,
        campaignName: body.campaignName
    }, null, 2));
    console.log('📝 Message content:', JSON.stringify(processedMessage));
    console.log('📝 Template params:', JSON.stringify(templateParams));
    console.log('📝 Message length:', processedMessage?.length || 0);
    console.log('📝 Has newlines:', processedMessage?.includes('\n') || false);
    console.log('📝 Message preview:', processedMessage?.substring(0, 100) || '');

    // Final validation before sending - ensure finalMediaUrl is never undefined
    if (typeof finalMediaUrl === 'undefined') {
        console.error('❌ CRITICAL: finalMediaUrl is undefined! This should never happen.');
        finalMediaUrl = null; // Force to null
    }
    console.log('📎 Final mediaUrl check:', { type: typeof finalMediaUrl, value: finalMediaUrl, isNull: finalMediaUrl === null, isUndefined: finalMediaUrl === undefined });

    try {
        const response = await fetch(AISENSY_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        console.log('AiSensy Response Status:', response.status);
        console.log('AiSensy Response:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${responseText}`);
        }

        if (!response.ok) {
            console.error('AiSensy API Error Response:', data);
            const errorMsg = data.message || data.error || data.errorMessage || JSON.stringify(data);
            throw new Error(`AiSensy API Error: ${errorMsg}`);
        }

        // Check for success indicators
        if (data.success === false || data.status === 'failed' || data.error) {
            console.error('AiSensy API Error:', data);
            throw new Error(data.message || data.error || data.errorMessage || 'Failed to send AiSensy message');
        }

        // Additional validation: Check if response indicates the message was actually queued/sent
        // Some AiSensy responses might have status fields that indicate pending/failed states
        if (data.status && ['pending', 'queued', 'sent', 'delivered'].includes(data.status.toLowerCase())) {
            console.log(`✅ AiSensy message ${data.status} to ${formattedNumber}`);
        } else if (data.messageId || data.id || data.success === true || response.ok) {
            // If we have a message ID or success flag, consider it sent
            console.log(`✅ AiSensy message sent to ${formattedNumber}${data.messageId ? ` (ID: ${data.messageId})` : ''}`);
        } else {
            // Log warning if response doesn't clearly indicate success
            console.warn(`⚠️ AiSensy response unclear for ${formattedNumber}:`, data);
        }

        return {
            success: true,
            status: data.status || 'sent',
            to: formattedNumber,
            api: 'aisensy',
            data: data,
            messageId: data.messageId || data.id
        };
    } catch (error) {
        console.error('Error sending AiSensy message:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            recipient: formattedNumber
        });
        throw error;
    }
};

/**
 * Send a text message via WhatsApp (auto-detects API)
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} message - Text message to send
 */
const sendWhatsAppMessage = async (recipientNumber, message) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured. Please set up Meta WhatsApp Business API or AiSensy credentials.');
    }

    const activeAPI = getActiveAPI();

    if (activeAPI === 'meta') {
        return sendMetaMessage(recipientNumber, message);
    } else if (activeAPI === 'aisensy') {
        return sendAiSensyMessage(recipientNumber, message);
    } else {
        throw new Error('No WhatsApp API configured');
    }
};

/**
 * Send a template message via WhatsApp
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} templateName - Template name (Meta) or campaign name (AiSensy)
 * @param {string} languageCode - Language code (e.g., 'en_US')
 * @param {Object[]} components - Template components
 */
const sendWhatsAppTemplate = async (recipientNumber, templateName, languageCode = 'en_US', components = []) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured.');
    }

    const activeAPI = getActiveAPI();

    if (activeAPI === 'meta') {
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
    } else {
        // AiSensy uses campaign name as template
        const message = components.map(c => c.text || '').join(' ') || '';
        return sendAiSensyMessage(recipientNumber, message);
    }
};

/**
 * Send a document/media message via WhatsApp
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} documentUrl - Public URL of the document
 * @param {string} filename - Filename to display
 * @param {string} caption - Optional caption
 */
const sendWhatsAppDocument = async (recipientNumber, documentUrl, filename, caption = '') => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured.');
    }

    const activeAPI = getActiveAPI();

    if (activeAPI === 'meta') {
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
            messageId: data.messages?.[0]?.id,
            status: 'sent',
            to: formattedNumber
        };
    } else {
        // AiSensy
        return sendAiSensyMessage(recipientNumber, caption || '', documentUrl, filename);
    }
};

/**
 * Send certificate link via WhatsApp
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
 * Send a bulk WhatsApp message with optional media
 */
const sendBulkWhatsApp = async (recipientNumber, message, mediaUrl = null, filename = null, customCampaignName = null) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured.');
    }

    const activeAPI = getActiveAPI();

    if (activeAPI === 'aisensy') {
        // Priority: 1. Manual override, 2. Auto-switch for media, 3. Config default
        let campaignName = customCampaignName;

        if (!campaignName) {
            if (mediaUrl) {
                campaignName = 'bulk_message';
                console.log(`📎 Media detected, auto-selecting AiSensy campaign: ${campaignName}`);
            }
        }

        return sendAiSensyMessage(recipientNumber, message, mediaUrl, filename, campaignName);
    } else {
        // For Meta, we might need a different approach for media + text
        // If there's media, use document/image message
        if (mediaUrl) {
            return sendWhatsAppDocument(recipientNumber, mediaUrl, filename, message);
        }
        return sendWhatsAppMessage(recipientNumber, message);
    }
};

/**
 * Get WhatsApp Business Profile (Meta only)
 */
const getBusinessProfile = async () => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured.');
    }

    const activeAPI = getActiveAPI();

    if (activeAPI === 'meta') {
        try {
            const response = await fetch(
                `${META_API_BASE}/${whatsappConfig.phoneNumberId}/whatsapp_business_profile`,
                {
                    headers: {
                        'Authorization': `Bearer ${whatsappConfig.accessToken}`,
                    },
                }
            );

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'Failed to get business profile');

            return data;
        } catch (error) {
            console.error('Error getting WhatsApp business profile:', error);
            throw error;
        }
    } else {
        // AiSensy
        return {
            api: 'aisensy',
            status: 'active',
            campaignName: whatsappConfig.campaignName
        };
    }
};

/**
 * Check WhatsApp phone number status
 */
const getPhoneNumberStatus = async () => {
    if (!isWhatsAppConfigured()) {
        return { configured: false };
    }

    const activeAPI = getActiveAPI();

    if (activeAPI === 'meta') {
        try {
            const response = await fetch(
                `${META_API_BASE}/${whatsappConfig.phoneNumberId}`,
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
                verifiedName: data.verified_name,
                api: 'meta'
            };
        } catch (error) {
            return { configured: true, valid: false, error: error.message };
        }
    } else {
        // AiSensy
        return {
            configured: true,
            valid: true,
            api: 'aisensy',
            campaignName: whatsappConfig.campaignName
        };
    }
};

// Log configuration status on startup
if (isWhatsAppConfigured()) {
    const activeAPI = getActiveAPI();
    if (activeAPI === 'meta') {
        console.log('✅ WhatsApp configured via Meta WhatsApp Business API');
        console.log(`   Phone Number ID: ${whatsappConfig.phoneNumberId}`);
        console.log(`   API Version: ${whatsappConfig.apiVersion}`);
    } else if (activeAPI === 'aisensy') {
        console.log('✅ WhatsApp configured via AiSensy');
        console.log(`   Campaign Name: ${whatsappConfig.campaignName}`);
    }
} else {
    console.warn('⚠️  WhatsApp credentials not configured.');
    console.warn('   For Meta API: firebase functions:config:set whatsapp.phone_number_id="..." whatsapp.access_token="..."');
    console.warn('   For AiSensy: firebase functions:config:set whatsapp.api_key="..."');
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
    formatPhoneNumber,
    getActiveAPI
};
