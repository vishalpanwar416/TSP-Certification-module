/**
 * Frontend Messaging Service
 * 
 * This service handles email and WhatsApp messaging from the frontend.
 * Currently simulates sending - later when you upgrade to Blaze plan,
 * this can be switched to use actual Cloud Functions.
 * 
 * For REAL email sending from frontend, you can use:
 * - EmailJS (https://emailjs.com) - Free tier: 200 emails/month
 * - Resend (https://resend.com) - Free tier: 100 emails/day
 * 
 * For WhatsApp, server-side is required (Cloud Functions needed)
 */

import { db } from '../config/firebase';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';

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
 * Simulate sending email
 * In production, this would call Cloud Functions or EmailJS
 */
const sendEmail = async (contact, subject, message) => {
    // Personalize the message
    const personalizedMessage = personalizeMessage(message, contact);
    const personalizedSubject = personalizeMessage(subject, contact);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Log what would be sent (for debugging)
    console.log(`📧 [Simulated] Email to ${contact.email}:`);
    console.log(`   Subject: ${personalizedSubject}`);
    console.log(`   Message: ${personalizedMessage.substring(0, 100)}...`);

    return {
        success: true,
        simulated: true,
        to: contact.email,
        subject: personalizedSubject,
        message: personalizedMessage
    };
};

/**
 * Simulate sending WhatsApp message
 * In production, this would call Cloud Functions (WhatsApp Cloud API requires server-side)
 */
const sendWhatsApp = async (contact, message) => {
    // Personalize the message
    const personalizedMessage = personalizeMessage(message, contact);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Log what would be sent (for debugging)
    console.log(`💬 [Simulated] WhatsApp to ${contact.phone}:`);
    console.log(`   Message: ${personalizedMessage.substring(0, 100)}...`);

    return {
        success: true,
        simulated: true,
        to: contact.phone,
        message: personalizedMessage
    };
};

/**
 * Send bulk email campaign
 */
export const sendBulkEmailCampaign = async (contacts, subject, message) => {
    const results = {
        total: contacts.length,
        sent: 0,
        failed: 0,
        errors: [],
        simulated: true
    };

    for (const contact of contacts) {
        if (!contact.email) {
            results.failed++;
            results.errors.push({ contact: contact.name, error: 'No email address' });
            continue;
        }

        try {
            await sendEmail(contact, subject, message);
            results.sent++;

            // Update contact's last contacted info in Firestore
            if (contact.id) {
                try {
                    await updateDoc(doc(db, 'marketing_contacts', contact.id), {
                        last_contacted_at: serverTimestamp(),
                        last_campaign_type: 'email',
                        email_sent_count: (contact.email_sent_count || 0) + 1
                    });
                } catch (e) {
                    console.warn('Could not update contact stats:', e);
                }
            }
        } catch (error) {
            results.failed++;
            results.errors.push({ contact: contact.name, error: error.message });
        }
    }

    console.log(`📧 Email Campaign Complete: ${results.sent}/${results.total} sent`);
    return results;
};

/**
 * Send bulk WhatsApp campaign
 */
export const sendBulkWhatsAppCampaign = async (contacts, message) => {
    const results = {
        total: contacts.length,
        sent: 0,
        failed: 0,
        errors: [],
        simulated: true
    };

    for (const contact of contacts) {
        if (!contact.phone) {
            results.failed++;
            results.errors.push({ contact: contact.name, error: 'No phone number' });
            continue;
        }

        try {
            await sendWhatsApp(contact, message);
            results.sent++;

            // Update contact's last contacted info in Firestore
            if (contact.id) {
                try {
                    await updateDoc(doc(db, 'marketing_contacts', contact.id), {
                        last_contacted_at: serverTimestamp(),
                        last_campaign_type: 'whatsapp',
                        whatsapp_sent_count: (contact.whatsapp_sent_count || 0) + 1
                    });
                } catch (e) {
                    console.warn('Could not update contact stats:', e);
                }
            }
        } catch (error) {
            results.failed++;
            results.errors.push({ contact: contact.name, error: error.message });
        }
    }

    console.log(`💬 WhatsApp Campaign Complete: ${results.sent}/${results.total} sent`);
    return results;
};

/**
 * Create and send a campaign
 * Saves campaign to Firestore and simulates sending
 */
export const createAndSendCampaign = async (campaignData, allContacts) => {
    const { type, subject, message, contactIds, scheduledAt } = campaignData;

    // Get the selected contacts
    const selectedContacts = allContacts.filter(c => contactIds.includes(c.id));

    if (selectedContacts.length === 0) {
        throw new Error('No contacts selected');
    }

    // Create campaign record in Firestore
    const campaignRecord = {
        type,
        subject: subject || '',
        message,
        contact_ids: contactIds,
        recipient_count: selectedContacts.length,
        status: scheduledAt ? 'scheduled' : 'sending',
        scheduled_at: scheduledAt || null,
        sent_count: 0,
        failed_count: 0,
        created_at: serverTimestamp()
    };

    const campaignRef = await addDoc(collection(db, 'marketing_campaigns'), campaignRecord);

    // If scheduled for later, just save and return
    if (scheduledAt) {
        console.log(`⏰ Campaign scheduled for ${new Date(scheduledAt).toLocaleString()}`);
        return {
            campaignId: campaignRef.id,
            scheduled: true,
            scheduledAt
        };
    }

    // Send immediately
    let results;
    if (type === 'email') {
        results = await sendBulkEmailCampaign(selectedContacts, subject, message);
    } else {
        results = await sendBulkWhatsAppCampaign(selectedContacts, message);
    }

    // Update campaign with results
    await updateDoc(campaignRef, {
        status: 'completed',
        sent_count: results.sent,
        failed_count: results.failed,
        completed_at: serverTimestamp()
    });

    return {
        campaignId: campaignRef.id,
        ...results
    };
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
    sendBulkEmailCampaign,
    sendBulkWhatsAppCampaign,
    createAndSendCampaign,
    personalizeMessage,
    generateWhatsAppWebLink,
    openWhatsAppWeb,
    generateMailtoLink,
    openEmailClient
};
