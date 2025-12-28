const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { generateCertificatePDF } = require('./utils/pdfGenerator');
const { sendCertificateLinkViaWhatsApp, isWhatsAppConfigured } = require('./utils/whatsappService');
const { sendCertificateViaEmail, isEmailConfigured } = require('./utils/emailService');

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage();

// Create Express app
const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// ============================================
// CERTIFICATE CRUD OPERATIONS
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

/**
 * Health check
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Certificate Generator Firebase API is running',
        timestamp: new Date().toISOString()
    });
});

// Export the Express app as a Cloud Function
exports.api = functions.https.onRequest(app);
