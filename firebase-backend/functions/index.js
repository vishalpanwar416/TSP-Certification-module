const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { generateCertificatePDF } = require('./utils/pdfGenerator');
const { sendCertificateLinkViaWhatsApp, isWhatsAppConfigured, sendBulkWhatsApp } = require('./utils/whatsappService');
const { sendCertificateViaEmail, isEmailConfigured, sendBulkEmail } = require('./utils/emailService');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ============================================
// CERTIFICATE CRUD OPERATIONS (Existing)
// ============================================

/**
 * Create a new certificate
 */
app.post('/certificates', async (req, res) => {
    try {
        const {
            recipient_name,
            certificate_number,
            award_rera_number,
            description,
            phone_number,
            email
        } = req.body;

        // Validation
        if (!recipient_name || !certificate_number) {
            return res.status(400).json({
                error: 'Recipient name and certificate number are required'
            });
        }

        // Check if certificate number already exists
        const existingCert = await db.collection('certificates')
            .where('certificate_number', '==', certificate_number)
            .limit(1)
            .get();

        if (!existingCert.empty) {
            return res.status(409).json({
                error: 'Certificate number already exists'
            });
        }

        // Generate unique ID
        const id = uuidv4();

        // Certificate data
        const certificateData = {
            id,
            recipient_name,
            certificate_number,
            award_rera_number: award_rera_number || null,
            description: description || null,
            phone_number: phone_number || null,
            email: email || null,
            whatsapp_sent: false,
            whatsapp_sent_at: null,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        // Generate PDF
        const pdfBuffer = await generateCertificatePDF(certificateData);

        // Upload to Firebase Storage
        const bucket = storage.bucket();
        const file = bucket.file(`certificates/${id}.pdf`);

        await file.save(pdfBuffer, {
            metadata: {
                contentType: 'application/pdf',
                metadata: {
                    certificateId: id,
                    certificateNumber: certificate_number
                }
            }
        });

        // Make file publicly accessible
        await file.makePublic();

        // Get public URL
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/certificates/${id}.pdf`;
        certificateData.pdf_url = publicUrl;

        // Save to Firestore
        await db.collection('certificates').doc(id).set(certificateData);

        // Fetch the saved document
        const savedDoc = await db.collection('certificates').doc(id).get();
        const savedData = { id: savedDoc.id, ...savedDoc.data() };

        res.status(201).json({
            success: true,
            message: 'Certificate created successfully',
            data: savedData
        });
    } catch (error) {
        console.error('Error creating certificate:', error);
        res.status(500).json({
            error: 'Failed to create certificate',
            details: error.message
        });
    }
});

/**
 * Get all certificates
 */
app.get('/certificates', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const snapshot = await db.collection('certificates')
            .orderBy('created_at', 'desc')
            .limit(limit)
            .offset(offset)
            .get();

        const certificates = [];
        snapshot.forEach(doc => {
            certificates.push({ id: doc.id, ...doc.data() });
        });

        // Get total count
        const allDocs = await db.collection('certificates').get();
        const total = allDocs.size;

        res.json({
            success: true,
            data: certificates,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });
    } catch (error) {
        console.error('Error fetching certificates:', error);
        res.status(500).json({
            error: 'Failed to fetch certificates',
            details: error.message
        });
    }
});

/**
 * Get certificate by ID
 */
app.get('/certificates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('certificates').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json({
            success: true,
            data: { id: doc.id, ...doc.data() }
        });
    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({
            error: 'Failed to fetch certificate',
            details: error.message
        });
    }
});

/**
 * Update certificate
 */
app.put('/certificates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const docRef = db.collection('certificates').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        // Don't allow updating certain fields
        delete updates.id;
        delete updates.created_at;
        delete updates.pdf_url;

        updates.updated_at = admin.firestore.FieldValue.serverTimestamp();

        await docRef.update(updates);

        const updatedDoc = await docRef.get();

        res.json({
            success: true,
            message: 'Certificate updated successfully',
            data: { id: updatedDoc.id, ...updatedDoc.data() }
        });
    } catch (error) {
        console.error('Error updating certificate:', error);
        res.status(500).json({
            error: 'Failed to update certificate',
            details: error.message
        });
    }
});

/**
 * Delete certificate
 */
app.delete('/certificates/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const docRef = db.collection('certificates').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        // Delete PDF from storage
        try {
            const bucket = storage.bucket();
            await bucket.file(`certificates/${id}.pdf`).delete();
        } catch (error) {
            console.warn('Error deleting PDF file:', error.message);
        }

        // Delete from Firestore
        await docRef.delete();

        res.json({
            success: true,
            message: 'Certificate deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting certificate:', error);
        res.status(500).json({
            error: 'Failed to delete certificate',
            details: error.message
        });
    }
});

/**
 * Send certificate via WhatsApp
 */
app.post('/certificates/:id/send-whatsapp', async (req, res) => {
    try {
        const { id } = req.params;
        const { phone_number } = req.body;

        // Check if WhatsApp is configured
        if (!isWhatsAppConfigured()) {
            return res.status(503).json({
                error: 'WhatsApp service is not configured. Please set up Twilio credentials.',
                configured: false
            });
        }

        const doc = await db.collection('certificates').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const certificate = { id: doc.id, ...doc.data() };
        const recipientNumber = phone_number || certificate.phone_number;

        if (!recipientNumber) {
            return res.status(400).json({
                error: 'Phone number is required'
            });
        }

        // Send via WhatsApp
        const result = await sendCertificateLinkViaWhatsApp(
            recipientNumber,
            certificate.pdf_url,
            certificate
        );

        // Update WhatsApp status
        await db.collection('certificates').doc(id).update({
            whatsapp_sent: true,
            whatsapp_sent_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Certificate sent via WhatsApp successfully',
            data: result
        });
    } catch (error) {
        console.error('Error sending certificate via WhatsApp:', error);
        res.status(500).json({
            error: 'Failed to send certificate via WhatsApp',
            details: error.message
        });
    }
});

/**
 * Send certificate via Email
 */
app.post('/certificates/:id/send-email', async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        // Check if Email is configured
        if (!isEmailConfigured()) {
            return res.status(503).json({
                error: 'Email service is not configured. Please set up email credentials.',
                configured: false
            });
        }

        const doc = await db.collection('certificates').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const certificate = { id: doc.id, ...doc.data() };
        const recipientEmail = email || certificate.email;

        if (!recipientEmail) {
            return res.status(400).json({
                error: 'Email address is required'
            });
        }

        // Send via Email
        const result = await sendCertificateViaEmail(
            recipientEmail,
            certificate.pdf_url,
            certificate
        );

        res.json({
            success: true,
            message: 'Certificate sent via email successfully',
            data: result
        });
    } catch (error) {
        console.error('Error sending certificate via email:', error);
        res.status(500).json({
            error: 'Failed to send certificate via email',
            details: error.message
        });
    }
});

/**
 * Download certificate PDF
 */
app.get('/certificates/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('certificates').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const certificate = { id: doc.id, ...doc.data() };

        if (!certificate.pdf_url) {
            return res.status(404).json({ error: 'Certificate PDF not found' });
        }

        // Redirect to the public URL
        res.redirect(certificate.pdf_url);
    } catch (error) {
        console.error('Error downloading certificate:', error);
        res.status(500).json({
            error: 'Failed to download certificate',
            details: error.message
        });
    }
});

/**
 * Get certificate statistics
 */
app.get('/certificates/stats', async (req, res) => {
    try {
        const allDocs = await db.collection('certificates').get();
        const total = allDocs.size;

        let whatsapp_sent = 0;
        allDocs.forEach(doc => {
            if (doc.data().whatsapp_sent) {
                whatsapp_sent++;
            }
        });

        const stats = {
            total,
            whatsapp_sent,
            pending: total - whatsapp_sent
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics',
            details: error.message
        });
    }
});

// ============================================
// MARKETING MODULE - CONTACTS
// ============================================

/**
 * Get all contacts
 */
app.get('/marketing/contacts', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;
        const search = req.query.search || '';

        let query = db.collection('marketing_contacts')
            .orderBy('created_at', 'desc');

        const snapshot = await query.limit(limit).offset(offset).get();

        let contacts = [];
        snapshot.forEach(doc => {
            contacts.push({ id: doc.id, ...doc.data() });
        });

        // Apply search filter in memory (Firestore doesn't support text search natively)
        if (search) {
            const searchLower = search.toLowerCase();
            contacts = contacts.filter(c =>
                c.name?.toLowerCase().includes(searchLower) ||
                c.email?.toLowerCase().includes(searchLower) ||
                c.phone?.includes(search)
            );
        }

        const allDocs = await db.collection('marketing_contacts').get();
        const total = allDocs.size;

        res.json({
            success: true,
            data: contacts,
            pagination: { total, limit, offset, hasMore: offset + limit < total }
        });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).json({ error: 'Failed to fetch contacts', details: error.message });
    }
});

/**
 * Get contact by ID
 */
app.get('/marketing/contacts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('marketing_contacts').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
        console.error('Error fetching contact:', error);
        res.status(500).json({ error: 'Failed to fetch contact', details: error.message });
    }
});

/**
 * Create a contact
 */
app.post('/marketing/contacts', async (req, res) => {
    try {
        const { name, email, phone, reraAwardeNo, certificateNumber, professional, tags } = req.body;

        if (!name && !email && !phone) {
            return res.status(400).json({ error: 'At least one of name, email, or phone is required' });
        }

        const id = uuidv4();
        const contactData = {
            id,
            name: name || '',
            email: email || '',
            phone: phone || '',
            rera_awarde_no: reraAwardeNo || '',
            certificate_number: certificateNumber || '',
            professional: professional || '',
            tags: tags || [],
            email_sent_count: 0,
            whatsapp_sent_count: 0,
            last_contacted_at: null,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('marketing_contacts').doc(id).set(contactData);

        res.status(201).json({
            success: true,
            message: 'Contact created successfully',
            data: contactData
        });
    } catch (error) {
        console.error('Error creating contact:', error);
        res.status(500).json({ error: 'Failed to create contact', details: error.message });
    }
});

/**
 * Bulk import contacts
 */
app.post('/marketing/contacts/bulk', async (req, res) => {
    try {
        const { contacts } = req.body;

        if (!Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({ error: 'Contacts array is required' });
        }

        const batch = db.batch();
        const importedContacts = [];

        for (const contact of contacts) {
            const id = uuidv4();
            const contactData = {
                id,
                name: contact.name || contact.Name || '',
                email: contact.email || contact.Email || '',
                phone: contact.phone || contact.Phone || contact['Phone Number'] || contact['Phone number'] || '',
                rera_awarde_no: contact['RERA Awarde No.'] || contact['RERA Awarde No'] || contact.reraAwardeNo || '',
                certificate_number: contact['Certificate Number'] || contact.certificateNumber || '',
                professional: contact.Professional || contact.professional || '',
                tags: contact.tags || [],
                email_sent_count: 0,
                whatsapp_sent_count: 0,
                last_contacted_at: null,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            };

            batch.set(db.collection('marketing_contacts').doc(id), contactData);
            importedContacts.push(contactData);
        }

        await batch.commit();

        res.status(201).json({
            success: true,
            message: `Successfully imported ${importedContacts.length} contacts`,
            data: { count: importedContacts.length }
        });
    } catch (error) {
        console.error('Error bulk importing contacts:', error);
        res.status(500).json({ error: 'Failed to import contacts', details: error.message });
    }
});

/**
 * Update a contact
 */
app.put('/marketing/contacts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        delete updates.id;
        delete updates.created_at;
        updates.updated_at = admin.firestore.FieldValue.serverTimestamp();

        const docRef = db.collection('marketing_contacts').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        await docRef.update(updates);
        const updatedDoc = await docRef.get();

        res.json({
            success: true,
            message: 'Contact updated successfully',
            data: { id: updatedDoc.id, ...updatedDoc.data() }
        });
    } catch (error) {
        console.error('Error updating contact:', error);
        res.status(500).json({ error: 'Failed to update contact', details: error.message });
    }
});

/**
 * Delete a contact
 */
app.delete('/marketing/contacts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('marketing_contacts').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Contact not found' });
        }

        await docRef.delete();

        res.json({ success: true, message: 'Contact deleted successfully' });
    } catch (error) {
        console.error('Error deleting contact:', error);
        res.status(500).json({ error: 'Failed to delete contact', details: error.message });
    }
});

/**
 * Bulk delete contacts
 */
app.post('/marketing/contacts/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'IDs array is required' });
        }

        const batch = db.batch();
        ids.forEach(id => {
            batch.delete(db.collection('marketing_contacts').doc(id));
        });

        await batch.commit();

        res.json({
            success: true,
            message: `Successfully deleted ${ids.length} contacts`
        });
    } catch (error) {
        console.error('Error bulk deleting contacts:', error);
        res.status(500).json({ error: 'Failed to delete contacts', details: error.message });
    }
});

// ============================================
// MARKETING MODULE - CAMPAIGNS
// ============================================

/**
 * Get all campaigns
 */
app.get('/marketing/campaigns', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const type = req.query.type;
        const status = req.query.status;

        let query = db.collection('marketing_campaigns')
            .orderBy('created_at', 'desc');

        const snapshot = await query.limit(limit).get();

        let campaigns = [];
        snapshot.forEach(doc => {
            campaigns.push({ id: doc.id, ...doc.data() });
        });

        // Filter by type if specified
        if (type) {
            campaigns = campaigns.filter(c => c.type === type);
        }

        // Filter by status if specified
        if (status) {
            campaigns = campaigns.filter(c => c.status === status);
        }

        res.json({ success: true, data: campaigns });
    } catch (error) {
        console.error('Error fetching campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch campaigns', details: error.message });
    }
});

/**
 * Get campaign by ID
 */
app.get('/marketing/campaigns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('marketing_campaigns').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
        console.error('Error fetching campaign:', error);
        res.status(500).json({ error: 'Failed to fetch campaign', details: error.message });
    }
});

/**
 * Create a new campaign
 */
app.post('/marketing/campaigns', async (req, res) => {
    try {
        const { type, subject, message, contactIds, templateId, scheduledAt } = req.body;

        if (!type || !['email', 'whatsapp'].includes(type)) {
            return res.status(400).json({ error: 'Valid type (email or whatsapp) is required' });
        }

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (!Array.isArray(contactIds) || contactIds.length === 0) {
            return res.status(400).json({ error: 'At least one contact is required' });
        }

        // Fetch contacts
        const contactsPromises = contactIds.map(id =>
            db.collection('marketing_contacts').doc(id).get()
        );
        const contactDocs = await Promise.all(contactsPromises);
        const contacts = contactDocs
            .filter(doc => doc.exists)
            .map(doc => ({ id: doc.id, ...doc.data() }));

        const id = uuidv4();
        const isScheduled = scheduledAt && new Date(scheduledAt) > new Date();

        const campaignData = {
            id,
            type,
            subject: subject || null,
            message,
            template_id: templateId || null,
            contact_ids: contactIds,
            recipient_count: contacts.length,
            sent_count: 0,
            failed_count: 0,
            status: isScheduled ? 'scheduled' : 'pending',
            scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
            sent_at: null,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('marketing_campaigns').doc(id).set(campaignData);

        // If not scheduled, send immediately
        if (!isScheduled) {
            try {
                await sendCampaignMessages(id, type, subject, message, contacts);
            } catch (sendError) {
                console.error('Error sending campaign:', sendError);
            }
        }

        const savedDoc = await db.collection('marketing_campaigns').doc(id).get();

        res.status(201).json({
            success: true,
            message: isScheduled ? 'Campaign scheduled successfully' : 'Campaign created and sent successfully',
            data: { id: savedDoc.id, ...savedDoc.data() }
        });
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: 'Failed to create campaign', details: error.message });
    }
});

/**
 * Helper function to send campaign messages
 */
async function sendCampaignMessages(campaignId, type, subject, message, contacts) {
    let sentCount = 0;
    let failedCount = 0;

    const batch = db.batch();

    for (const contact of contacts) {
        try {
            // Personalize message
            const personalizedMessage = message.replace(/\{\{name\}\}/gi, contact.name || 'there');

            if (type === 'email' && contact.email) {
                if (isEmailConfigured()) {
                    await sendBulkEmail(contact.email, subject, personalizedMessage);
                    sentCount++;

                    // Update contact stats
                    const contactRef = db.collection('marketing_contacts').doc(contact.id);
                    batch.update(contactRef, {
                        email_sent_count: admin.firestore.FieldValue.increment(1),
                        last_contacted_at: admin.firestore.FieldValue.serverTimestamp(),
                        last_contact_type: 'email'
                    });
                }
            } else if (type === 'whatsapp' && contact.phone) {
                if (isWhatsAppConfigured()) {
                    await sendBulkWhatsApp(contact.phone, personalizedMessage);
                    sentCount++;

                    // Update contact stats
                    const contactRef = db.collection('marketing_contacts').doc(contact.id);
                    batch.update(contactRef, {
                        whatsapp_sent_count: admin.firestore.FieldValue.increment(1),
                        last_contacted_at: admin.firestore.FieldValue.serverTimestamp(),
                        last_contact_type: 'whatsapp'
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to send to ${contact.id}:`, error);
            failedCount++;
        }
    }

    // Update campaign status
    await db.collection('marketing_campaigns').doc(campaignId).update({
        status: 'completed',
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    return { sentCount, failedCount };
}

/**
 * Send campaign immediately
 */
app.post('/marketing/campaigns/:id/send', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('marketing_campaigns').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaign = { id: doc.id, ...doc.data() };

        if (campaign.status === 'completed') {
            return res.status(400).json({ error: 'Campaign has already been sent' });
        }

        // Fetch contacts
        const contactsPromises = campaign.contact_ids.map(cid =>
            db.collection('marketing_contacts').doc(cid).get()
        );
        const contactDocs = await Promise.all(contactsPromises);
        const contacts = contactDocs
            .filter(d => d.exists)
            .map(d => ({ id: d.id, ...d.data() }));

        const result = await sendCampaignMessages(
            id,
            campaign.type,
            campaign.subject,
            campaign.message,
            contacts
        );

        res.json({
            success: true,
            message: 'Campaign sent successfully',
            data: result
        });
    } catch (error) {
        console.error('Error sending campaign:', error);
        res.status(500).json({ error: 'Failed to send campaign', details: error.message });
    }
});

/**
 * Cancel a scheduled campaign
 */
app.post('/marketing/campaigns/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('marketing_campaigns').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaign = doc.data();

        if (campaign.status !== 'scheduled') {
            return res.status(400).json({ error: 'Only scheduled campaigns can be cancelled' });
        }

        await docRef.update({
            status: 'cancelled',
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Campaign cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling campaign:', error);
        res.status(500).json({ error: 'Failed to cancel campaign', details: error.message });
    }
});

/**
 * Delete a campaign
 */
app.delete('/marketing/campaigns/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('marketing_campaigns').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        await docRef.delete();

        res.json({ success: true, message: 'Campaign deleted successfully' });
    } catch (error) {
        console.error('Error deleting campaign:', error);
        res.status(500).json({ error: 'Failed to delete campaign', details: error.message });
    }
});

// ============================================
// MARKETING MODULE - TEMPLATES
// ============================================

/**
 * Get all templates
 */
app.get('/marketing/templates', async (req, res) => {
    try {
        const type = req.query.type;

        let query = db.collection('marketing_templates')
            .orderBy('created_at', 'desc');

        const snapshot = await query.get();

        let templates = [];
        snapshot.forEach(doc => {
            templates.push({ id: doc.id, ...doc.data() });
        });

        if (type) {
            templates = templates.filter(t => t.type === type);
        }

        res.json({ success: true, data: templates });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ error: 'Failed to fetch templates', details: error.message });
    }
});

/**
 * Get template by ID
 */
app.get('/marketing/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('marketing_templates').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({ error: 'Failed to fetch template', details: error.message });
    }
});

/**
 * Create a template
 */
app.post('/marketing/templates', async (req, res) => {
    try {
        const { name, type, subject, content } = req.body;

        if (!name || !type || !content) {
            return res.status(400).json({ error: 'Name, type, and content are required' });
        }

        if (!['email', 'whatsapp'].includes(type)) {
            return res.status(400).json({ error: 'Type must be email or whatsapp' });
        }

        const id = uuidv4();
        const templateData = {
            id,
            name,
            type,
            subject: subject || null,
            content,
            usage_count: 0,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('marketing_templates').doc(id).set(templateData);

        res.status(201).json({
            success: true,
            message: 'Template created successfully',
            data: templateData
        });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ error: 'Failed to create template', details: error.message });
    }
});

/**
 * Update a template
 */
app.put('/marketing/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        delete updates.id;
        delete updates.created_at;
        updates.updated_at = admin.firestore.FieldValue.serverTimestamp();

        const docRef = db.collection('marketing_templates').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Template not found' });
        }

        await docRef.update(updates);
        const updatedDoc = await docRef.get();

        res.json({
            success: true,
            message: 'Template updated successfully',
            data: { id: updatedDoc.id, ...updatedDoc.data() }
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ error: 'Failed to update template', details: error.message });
    }
});

/**
 * Delete a template
 */
app.delete('/marketing/templates/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('marketing_templates').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Template not found' });
        }

        await docRef.delete();

        res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ error: 'Failed to delete template', details: error.message });
    }
});

// ============================================
// MARKETING MODULE - SCHEDULED
// ============================================

/**
 * Get all scheduled campaigns
 */
app.get('/marketing/scheduled', async (req, res) => {
    try {
        const snapshot = await db.collection('marketing_campaigns')
            .where('status', '==', 'scheduled')
            .orderBy('scheduled_at', 'asc')
            .get();

        const scheduled = [];
        snapshot.forEach(doc => {
            scheduled.push({ id: doc.id, ...doc.data() });
        });

        res.json({ success: true, data: scheduled });
    } catch (error) {
        console.error('Error fetching scheduled campaigns:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled campaigns', details: error.message });
    }
});

/**
 * Reschedule a campaign
 */
app.put('/marketing/scheduled/:id/reschedule', async (req, res) => {
    try {
        const { id } = req.params;
        const { scheduledAt } = req.body;

        if (!scheduledAt) {
            return res.status(400).json({ error: 'scheduledAt is required' });
        }

        const docRef = db.collection('marketing_campaigns').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaign = doc.data();
        if (campaign.status !== 'scheduled') {
            return res.status(400).json({ error: 'Only scheduled campaigns can be rescheduled' });
        }

        await docRef.update({
            scheduled_at: new Date(scheduledAt),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Campaign rescheduled successfully' });
    } catch (error) {
        console.error('Error rescheduling campaign:', error);
        res.status(500).json({ error: 'Failed to reschedule campaign', details: error.message });
    }
});

// ============================================
// MARKETING MODULE - STATISTICS
// ============================================

/**
 * Get overview statistics
 */
app.get('/marketing/stats/overview', async (req, res) => {
    try {
        const [contactsSnap, campaignsSnap] = await Promise.all([
            db.collection('marketing_contacts').get(),
            db.collection('marketing_campaigns').get()
        ]);

        let emailsSent = 0;
        let whatsappSent = 0;
        let totalCampaigns = campaignsSnap.size;

        campaignsSnap.forEach(doc => {
            const campaign = doc.data();
            if (campaign.type === 'email') {
                emailsSent += campaign.sent_count || 0;
            } else if (campaign.type === 'whatsapp') {
                whatsappSent += campaign.sent_count || 0;
            }
        });

        res.json({
            success: true,
            data: {
                totalContacts: contactsSnap.size,
                emailsSent,
                whatsappSent,
                totalCampaigns,
                totalMessagesSent: emailsSent + whatsappSent
            }
        });
    } catch (error) {
        console.error('Error fetching overview stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics', details: error.message });
    }
});

// ============================================
// MARKETING MODULE - CONFIGURATION
// ============================================

/**
 * Get service configuration status
 */
app.get('/marketing/config/status', async (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                email: {
                    configured: isEmailConfigured(),
                    service: 'SendGrid/Nodemailer'
                },
                whatsapp: {
                    configured: isWhatsAppConfigured(),
                    service: 'Twilio'
                }
            }
        });
    } catch (error) {
        console.error('Error fetching config status:', error);
        res.status(500).json({ error: 'Failed to fetch config status', details: error.message });
    }
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Marketing & Certificate Generator Firebase API is running',
        timestamp: new Date().toISOString(),
        services: {
            email: isEmailConfigured() ? 'configured' : 'not configured',
            whatsapp: isWhatsAppConfigured() ? 'configured' : 'not configured'
        }
    });
});

// ============================================
// SCHEDULED CAMPAIGN PROCESSOR (Cloud Function)
// ============================================

/**
 * Scheduled function to process pending scheduled campaigns
 * Runs every minute
 */
exports.processScheduledCampaigns = functions.pubsub
    .schedule('every 1 minutes')
    .onRun(async (context) => {
        try {
            const now = new Date();

            const snapshot = await db.collection('marketing_campaigns')
                .where('status', '==', 'scheduled')
                .where('scheduled_at', '<=', now)
                .get();

            if (snapshot.empty) {
                console.log('No scheduled campaigns to process');
                return null;
            }

            console.log(`Processing ${snapshot.size} scheduled campaigns`);

            for (const doc of snapshot.docs) {
                const campaign = { id: doc.id, ...doc.data() };

                try {
                    // Fetch contacts
                    const contactsPromises = campaign.contact_ids.map(cid =>
                        db.collection('marketing_contacts').doc(cid).get()
                    );
                    const contactDocs = await Promise.all(contactsPromises);
                    const contacts = contactDocs
                        .filter(d => d.exists)
                        .map(d => ({ id: d.id, ...d.data() }));

                    await sendCampaignMessages(
                        campaign.id,
                        campaign.type,
                        campaign.subject,
                        campaign.message,
                        contacts
                    );

                    console.log(`Campaign ${campaign.id} processed successfully`);
                } catch (error) {
                    console.error(`Error processing campaign ${campaign.id}:`, error);

                    await db.collection('marketing_campaigns').doc(campaign.id).update({
                        status: 'failed',
                        error_message: error.message,
                        updated_at: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            return null;
        } catch (error) {
            console.error('Error in scheduled campaign processor:', error);
            return null;
        }
    });

// Export the Express app as a Cloud Function
exports.api = functions.https.onRequest(app);
