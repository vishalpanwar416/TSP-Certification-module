import { campaignsAPI } from './marketingService';

/**
 * Personalize message with contact data
 * Replaces placeholders like {{name}}, {{certificate}}, {{rera}}
 */
const personalizeMessage = (message, contact) => {
    if (!message) return '';

    return message
        .replace(/\{\{name\}\}/gi, contact.name || 'Valued Customer')
        .replace(/\{\{certificate\}\}/gi, contact.certificate_number || contact.certificateNumber || '')
        .replace(/\{\{rera\}\}/gi, contact.rera_awarde_no || contact.reraAwardeNo || '')
        .replace(/\{\{professional\}\}/gi, contact.professional || '')
        .replace(/\{\{email\}\}/gi, contact.email || '')
        .replace(/\{\{phone\}\}/gi, contact.phone || '');
};

/**
 * Create and send a campaign
 * Calls the Cloud Functions backend for actual sending
 */
export const createAndSendCampaign = async (campaignData, allContacts) => {
    try {
        // Use the backend to create and send the campaign
        const result = await campaignsAPI.create(campaignData);

        return {
            campaignId: result.id,
            ...result,
            simulated: false
        };
    } catch (error) {
        console.error('Error in createAndSendCampaign:', error);
        throw error;
    }
};

/**
 * Generate WhatsApp Web link for manual sending
 * This opens WhatsApp Web with a pre-filled message
 */
export const generateWhatsAppWebLink = (phone, message) => {
    // Clean phone number
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
    }
    if (cleanPhone.length === 10) {
        cleanPhone = '91' + cleanPhone;
    }

    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
};

/**
 * Open WhatsApp Web for a contact
 */
export const openWhatsAppWeb = (contact, message) => {
    const personalizedMessage = personalizeMessage(message, contact);
    const link = generateWhatsAppWebLink(contact.phone, personalizedMessage);
    window.open(link, '_blank');
};

/**
 * Generate mailto link for email
 */
export const generateMailtoLink = (email, subject, message) => {
    const encodedSubject = encodeURIComponent(subject);
    const encodedBody = encodeURIComponent(message);
    return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
};

/**
 * Open email client for a contact
 */
export const openEmailClient = (contact, subject, message) => {
    const personalizedSubject = personalizeMessage(subject, contact);
    const personalizedMessage = personalizeMessage(message, contact);
    const link = generateMailtoLink(contact.email, personalizedSubject, personalizedMessage);
    window.location.href = link;
};

// Export all functions
export default {
    createAndSendCampaign,
    personalizeMessage,
    generateWhatsAppWebLink,
    openWhatsAppWeb,
    generateMailtoLink,
    openEmailClient
};
