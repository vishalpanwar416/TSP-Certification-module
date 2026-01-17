const functions = require('firebase-functions');
const fetch = require('node-fetch');

// Get WhatsApp credentials from Firebase environment config
const config = functions.config();
const whatsappConfig = {
    // AiSensy Config
    apiKey: config.whatsapp?.api_key,
    campaignName: config.whatsapp?.campaign_name || 'pdf_certificate',
    mediaCampaignName: config.whatsapp?.media_campaign_name // Optional: separate campaign for media attachments
};

// API URLs
const AISENSY_API_URL = 'https://backend.aisensy.com/campaign/t1/api/v2';

/**
 * Check if WhatsApp is configured
 */
const isWhatsAppConfigured = () => {
    return !!whatsappConfig.apiKey;
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
 * Send a message via AiSensy API
 */
const sendAiSensyMessage = async (recipientNumber, message, mediaUrl = null, filename = null, customCampaignName = null) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('AiSensy API is not configured. Please set up your API key.');
    }

    const campaign = customCampaignName || whatsappConfig.campaignName;
    const formattedNumber = formatPhoneNumber(recipientNumber);
    console.log(`📤 Sending AiSensy message to ${formattedNumber} (Campaign: ${campaign})`);

    // Log the incoming message to verify it's complete
    console.log(`📥 WhatsApp Service received message:`);
    console.log(`   Type: ${typeof message}`);
    console.log(`   Length: ${message?.length || 0}`);
    console.log(`   Has newlines: ${message?.includes('\n') || false}`);
    console.log(`   Message: ${JSON.stringify(message)}`);

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
        
        // Verify message wasn't accidentally modified
        if (processedMessage.length !== message.length) {
            console.error(`⚠️ ERROR: Message length changed during processing!`);
            console.error(`   Original length: ${message.length}`);
            console.error(`   Processed length: ${processedMessage.length}`);
            processedMessage = message; // Restore original
        }
    } else if (message !== null && message !== undefined) {
        // Convert to string if not already
        processedMessage = String(message);
    }

    // For AiSensy, handle message formatting
    // IMPORTANT: AiSensy campaign templates have strict requirements:
    // - NO newlines allowed in a single parameter
    // - To preserve newlines: Split message into multiple parameters (one per line)
    // - Number of parameters must match campaign template exactly
    // 
    // Default: Automatically split by newlines into multiple parameters
    // Set AISENSY_SINGLE_PARAM=true to send as single parameter (newlines replaced with spaces)
    const SINGLE_PARAM = process.env.AISENSY_SINGLE_PARAM === 'true'; // Default: false (split by newlines)
    
    let templateParams;
    if (Array.isArray(processedMessage)) {
        // Already an array - use as is (each element is a parameter)
        templateParams = processedMessage.map(line => String(line).trim()).filter(line => line.length > 0);
    } else if (typeof processedMessage === 'string') {
        // Normalize line endings (convert \r\n and \r to \n for consistency)
        const normalizedMessage = processedMessage.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        
        // Check if message has newlines
        const hasNewlines = normalizedMessage.includes('\n');
        
        if (hasNewlines && !SINGLE_PARAM) {
            // Split by newlines - each line becomes a separate parameter
            // This preserves newlines in the final message (AiSensy will format them)
            const lines = normalizedMessage.split('\n');
            // Clean each line: trim whitespace, but keep empty lines as empty strings (for spacing)
            // Filter out only trailing empty lines at the end
            let cleanedLines = lines.map(line => line.trimEnd()); // Keep leading spaces if needed, remove trailing
            
            // Remove trailing empty lines
            while (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1].trim() === '') {
                cleanedLines = cleanedLines.slice(0, -1);
            }
            
            // Ensure we have at least one parameter
            if (cleanedLines.length === 0) {
                templateParams = [normalizedMessage.replace(/\n/g, ' ').trim()];
            } else {
                // Each line becomes a parameter (no newlines in individual params)
                templateParams = cleanedLines;
            }
            console.log(`📝 Message has newlines - splitting into ${templateParams.length} parameters`);
            console.log(`📝 Parameters: ${JSON.stringify(templateParams)}`);
        } else {
            // Single parameter mode: Replace newlines with spaces
            const singleLineMessage = normalizedMessage
                .replace(/\n+/g, ' ')  // Replace newlines with single space
                .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                .trim();
            templateParams = [singleLineMessage];
            if (hasNewlines) {
                console.log(`📝 Message has newlines - converted to single line (newlines replaced with spaces)`);
                console.log(`📝 Note: To preserve newlines, ensure your AiSensy campaign template accepts ${normalizedMessage.split('\n').filter(l => l.trim()).length} parameters`);
            }
        }
    } else {
        templateParams = [String(processedMessage)];
    }
    
    // Final safety check: Ensure no parameter contains newlines or tabs
    templateParams = templateParams.map(param => {
        const cleaned = String(param)
            .replace(/\r\n/g, ' ')  // Remove newlines
            .replace(/\r/g, ' ')    // Remove carriage returns
            .replace(/\n/g, ' ')     // Remove line feeds
            .replace(/\t/g, ' ')     // Remove tabs
            .replace(/\s{5,}/g, ' ') // Replace 5+ consecutive spaces with single space
            .trim();
        return cleaned;
    }).filter(param => param.length > 0); // Remove empty parameters
    
    if (templateParams.length === 0) {
        templateParams = ['Message']; // Fallback to prevent empty params
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
    console.log('📝 Message preview (first 200 chars):', processedMessage?.substring(0, 200) || '');
    console.log('📝 Message preview (last 100 chars):', processedMessage?.substring(Math.max(0, processedMessage.length - 100)) || '');
    console.log('📝 Full message (raw):', processedMessage);
    
    // Verify templateParams contains the complete message
    if (Array.isArray(templateParams) && templateParams.length > 0) {
        const firstParam = templateParams[0];
        console.log('📝 First template param length:', firstParam?.length || 0);
        console.log('📝 First template param has newlines:', firstParam?.includes('\n') || false);
        console.log('📝 First template param:', JSON.stringify(firstParam));
        
        // CRITICAL: Verify the message wasn't truncated
        if (typeof processedMessage === 'string' && typeof firstParam === 'string') {
            if (firstParam.length < processedMessage.length) {
                console.error(`⚠️ ERROR: Template param is shorter than processed message!`);
                console.error(`   Processed message length: ${processedMessage.length}`);
                console.error(`   Template param length: ${firstParam.length}`);
                // Fix it by using the full processed message
                templateParams[0] = processedMessage;
                payload.templateParams = templateParams;
                console.log('✅ Fixed: Updated templateParams with full message');
            }
        }
    }

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
            
            // Provide helpful error messages for common issues
            if (errorMsg.includes('healthy ecosystem') || errorMsg.includes('not delivered to maintain')) {
                const isRateLimit = errorMsg.toLowerCase().includes('rate') || 
                                   errorMsg.toLowerCase().includes('too many') ||
                                   errorMsg.toLowerCase().includes('recently');
                
                if (isRateLimit) {
                    throw new Error(`Rate limit: Too many messages sent to ${formattedNumber} recently. Please wait 15-30 minutes before trying again. This is normal when testing - production usage with different recipients should be fine.`);
                } else {
                    throw new Error(`Phone number ${formattedNumber} is not opted-in or has restrictions. Please add/verify this number in your AiSensy dashboard and ensure it has opted-in to receive messages.`);
                }
            }
            
            // Handle template parameter mismatch
            if (errorMsg.includes('does not match') || errorMsg.includes('template params') || errorMsg.includes('parameter')) {
                const paramCount = templateParams.length;
                throw new Error(`Template parameter mismatch: Your message has ${paramCount} lines, but your AiSensy campaign template is configured for a different number of parameters. Please configure your campaign template in AiSensy Dashboard to accept ${paramCount} parameters: {1} {2} ${paramCount > 2 ? '{3} ' : ''}${paramCount > 3 ? '{4} ' : ''}${paramCount > 4 ? '...' : ''} Or set AISENSY_SINGLE_PARAM=true to send as single parameter.`);
            }
            
            throw new Error(`AiSensy API Error: ${errorMsg}`);
        }

        // Check for success indicators
        if (data.success === false || data.status === 'failed' || data.error) {
            console.error('AiSensy API Error:', data);
            const errorMsg = data.message || data.error || data.errorMessage || 'Failed to send AiSensy message';
            
            // Provide helpful error messages for common issues
            if (errorMsg.includes('healthy ecosystem') || errorMsg.includes('not delivered to maintain')) {
                const isRateLimit = errorMsg.toLowerCase().includes('rate') || 
                                   errorMsg.toLowerCase().includes('too many') ||
                                   errorMsg.toLowerCase().includes('recently');
                
                if (isRateLimit) {
                    throw new Error(`Rate limit: Too many messages sent to ${formattedNumber} recently. Please wait 15-30 minutes before trying again. This is normal when testing - production usage with different recipients should be fine.`);
                } else {
                    throw new Error(`Phone number ${formattedNumber} is not opted-in or has restrictions. Please add/verify this number in your AiSensy dashboard and ensure it has opted-in to receive messages.`);
                }
            }
            
            // Handle template parameter mismatch
            if (errorMsg.includes('does not match') || errorMsg.includes('template params') || errorMsg.includes('parameter')) {
                const paramCount = templateParams.length;
                throw new Error(`Template parameter mismatch: Your message has ${paramCount} lines, but your AiSensy campaign template is configured for a different number of parameters. Please configure your campaign template in AiSensy Dashboard to accept ${paramCount} parameters: {1} {2} ${paramCount > 2 ? '{3} ' : ''}${paramCount > 3 ? '{4} ' : ''}${paramCount > 4 ? '...' : ''} Or set AISENSY_SINGLE_PARAM=true to send as single parameter.`);
            }
            
            throw new Error(errorMsg);
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
 * Send a text message via WhatsApp (AiSensy)
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} message - Text message to send
 */
const sendWhatsAppMessage = async (recipientNumber, message) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured. Please set up AiSensy credentials.');
    }

    return sendAiSensyMessage(recipientNumber, message);
};

/**
 * Send a template message via WhatsApp (AiSensy)
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} templateName - Campaign name (AiSensy)
 * @param {string} languageCode - Language code (e.g., 'en_US') - not used for AiSensy
 * @param {Object[]} components - Template components
 */
const sendWhatsAppTemplate = async (recipientNumber, templateName, languageCode = 'en_US', components = []) => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured.');
    }

    // AiSensy uses campaign name as template
    const message = components.map(c => c.text || '').join(' ') || '';
    return sendAiSensyMessage(recipientNumber, message, null, null, templateName);
};

/**
 * Send a document/media message via WhatsApp (AiSensy)
 * @param {string} recipientNumber - Recipient's phone number
 * @param {string} documentUrl - Public URL of the document
 * @param {string} filename - Filename to display
 * @param {string} caption - Optional caption
 */
const sendWhatsAppDocument = async (recipientNumber, documentUrl, filename, caption = '') => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured.');
    }

    return sendAiSensyMessage(recipientNumber, caption || '', documentUrl, filename);
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

    // Log message before processing to verify it's complete
    console.log(`📨 sendBulkWhatsApp received message:`);
    console.log(`   Type: ${typeof message}`);
    console.log(`   Length: ${message?.length || 0}`);
    console.log(`   Has newlines: ${message?.includes('\n') || false}`);
    console.log(`   Message: ${JSON.stringify(message)}`);

    // Priority: 1. Manual override, 2. Media-specific campaign (if configured and media present), 3. Config default, 4. Fallback
    let campaignName = customCampaignName;

    if (!campaignName) {
        // If media is present and a media-specific campaign is configured, use it
        if (mediaUrl && whatsappConfig.mediaCampaignName) {
            campaignName = whatsappConfig.mediaCampaignName;
            console.log(`📎 Media detected, using media-specific AiSensy campaign: ${campaignName}`);
        } else {
            // Use configured campaign name (supports media if configured in AiSensy)
            campaignName = whatsappConfig.campaignName;
            
            if (mediaUrl) {
                console.log(`📎 Media detected, using configured AiSensy campaign: ${campaignName}`);
                console.log(`   Note: Make sure this campaign supports media attachments in your AiSensy account`);
                console.log(`   Tip: You can set a separate media campaign with: firebase functions:config:set whatsapp.media_campaign_name="your_media_campaign"`);
            }
        }
        
        // Only fallback to 'pdf_certificate' if no campaign is configured at all
        if (!campaignName) {
            campaignName = 'pdf_certificate';
            console.log(`⚠️ No campaign configured, using default: ${campaignName}`);
        }
    }

    return sendAiSensyMessage(recipientNumber, message, mediaUrl, filename, campaignName);
};

/**
 * Get WhatsApp Business Profile (AiSensy)
 */
const getBusinessProfile = async () => {
    if (!isWhatsAppConfigured()) {
        throw new Error('WhatsApp is not configured.');
    }

    return {
        api: 'aisensy',
        status: 'active',
        campaignName: whatsappConfig.campaignName
    };
};

/**
 * Check WhatsApp phone number status
 */
const getPhoneNumberStatus = async () => {
    if (!isWhatsAppConfigured()) {
        return { configured: false };
    }

    return {
        configured: true,
        valid: true,
        api: 'aisensy',
        campaignName: whatsappConfig.campaignName
    };
};

// Log configuration status on startup
if (isWhatsAppConfigured()) {
    console.log('✅ WhatsApp configured via AiSensy');
    console.log(`   Campaign Name: ${whatsappConfig.campaignName}`);
    if (whatsappConfig.mediaCampaignName) {
        console.log(`   Media Campaign Name: ${whatsappConfig.mediaCampaignName}`);
    }
} else {
    console.warn('⚠️  WhatsApp credentials not configured.');
    console.warn('   For AiSensy: firebase functions:config:set whatsapp.api_key="..."');
    console.warn('   Optional: firebase functions:config:set whatsapp.campaign_name="..."');
    console.warn('   Optional: firebase functions:config:set whatsapp.media_campaign_name="..."');
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
