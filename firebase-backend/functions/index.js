const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { generateCertificatePDF, generateCertificateImage } = require('./utils/pdfGenerator');
const { sendCertificateLinkViaWhatsApp, isWhatsAppConfigured, sendBulkWhatsApp } = require('./utils/whatsappService');
const { sendCertificateViaEmail, isEmailConfigured, sendBulkEmail } = require('./utils/emailService');

// Initialize Firebase Admin
let adminApp;
try {
    // Check if already initialized
    adminApp = admin.app();
} catch (e) {
    // Initialize if not already initialized
    const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;
    adminApp = admin.initializeApp({
        // Firebase Admin SDK automatically uses Application Default Credentials
        // in Cloud Functions environment, so no explicit credentials needed
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET ||
            (projectId ? `${projectId}.firebasestorage.app` : undefined) ||
            (projectId ? `${projectId}.appspot.com` : undefined)
    });
}

const db = admin.firestore();
const storage = admin.storage();

// Helper function to get storage bucket with proper error handling
const getStorageBucket = async () => {
    const projectId = process.env.GCLOUD_PROJECT ||
        process.env.FIREBASE_PROJECT_ID ||
        adminApp.options.projectId ||
        adminApp.options.credential?.projectId;

    // Try default bucket first (might auto-detect the correct bucket)
    let bucket = storage.bucket();

    // Verify default bucket exists, if not try explicit names
    let defaultBucketWorks = false;
    if (bucket && bucket.name) {
        try {
            const [exists] = await bucket.exists();
            if (exists) {
                defaultBucketWorks = true;
            }
        } catch (err) {
            // Try getMetadata as fallback
            try {
                await bucket.getMetadata();
                defaultBucketWorks = true;
            } catch (metaErr) {
                // Default bucket doesn't work
            }
        }
    }

    if (defaultBucketWorks) {
        console.log(`✅ Using default storage bucket: ${bucket.name}`);
        return bucket;
    }

    // If default doesn't work, try project-specific buckets
    if (!bucket || !bucket.name) {
        const bucketNames = [
            process.env.FIREBASE_STORAGE_BUCKET,
            process.env.STORAGE_BUCKET,
            projectId ? `${projectId}.firebasestorage.app` : null, // New Firebase Storage format (prioritized)
            projectId ? `${projectId}.appspot.com` : null // Legacy format
        ].filter(Boolean);

        for (const bucketName of bucketNames) {
            try {
                bucket = storage.bucket(bucketName);
                // Try exists() first
                try {
                    const [exists] = await bucket.exists();
                    if (exists) {
                        console.log(`✅ Using storage bucket: ${bucket.name}`);
                        return bucket;
                    }
                } catch (existsErr) {
                    // If exists() fails, try getMetadata() as fallback
                    // Sometimes bucket exists but exists() returns false
                    try {
                        await bucket.getMetadata();
                        console.log(`✅ Using storage bucket (verified via metadata): ${bucket.name}`);
                        return bucket;
                    } catch (metaErr) {
                        // Both failed, try next bucket
                        continue;
                    }
                }
            } catch (err) {
                continue;
            }
        }
    } else {
        // Default bucket found, verify it's accessible
        try {
            const [exists] = await bucket.exists();
            if (exists) {
                console.log(`✅ Using default storage bucket: ${bucket.name}`);
                return bucket;
            }
        } catch (existsErr) {
            // Try getMetadata as fallback
            try {
                await bucket.getMetadata();
                console.log(`✅ Using default storage bucket (verified via metadata): ${bucket.name}`);
                return bucket;
            } catch (metaErr) {
                // Default bucket not accessible, will try explicit names below
            }
        }
    }

    if (!bucket || !bucket.name) {
        throw new Error(
            'Failed to initialize Firebase Storage bucket. ' +
            'Please ensure Firebase Storage is enabled for your project in the Firebase Console ' +
            'and that the service account has appropriate permissions. ' +
            'Also, verify your project ID and bucket name configuration.'
        );
    }

    // Final verification attempt
    try {
        await bucket.getMetadata();
        return bucket;
    } catch (err) {
        throw new Error(
            `Storage bucket "${bucket.name}" is not accessible. ` +
            `Error: ${err.message}. ` +
            'Please check Firebase Storage permissions and ensure Storage is fully enabled.'
        );
    }
};

// Create Express app
const app = express();

const { FieldValue } = require('firebase-admin/firestore');

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize Database Collections
 * POST /init-db
 */
app.post('/init-db', async (req, res) => {
    try {
        const collections = [
            'certificates',
            'marketing_contacts',
            'marketing_campaigns',
            'marketing_templates',
            'notifications'
        ];

        const batch = db.batch();
        const results = {};

        for (const col of collections) {
            // Create a dummy document to initialize the collection
            // We use a specific ID '_init_' so we can easily find/delete it later if needed,
            // or just leave it as metadata.
            const docRef = db.collection(col).doc('_init_');
            const doc = await docRef.get();

            if (!doc.exists) {
                batch.set(docRef, {
                    _initialized: true,
                    _created_at: FieldValue.serverTimestamp(),
                    _description: `Collection ${col} initialized`
                });
                results[col] = 'Created';
            } else {
                results[col] = 'Already exists';
            }
        }

        await batch.commit();

        res.json({
            success: true,
            message: 'Database collections initialized',
            results
        });
    } catch (error) {
        console.error('Error initializing database:', error);
        res.status(500).json({
            error: 'Failed to initialize database',
            details: error.message
        });
    }
});



// Configure CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }
    next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
            email_sent: false,
            email_sent_at: null,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        };

        // Get certificate template URL from Firestore
        let templateUrl = null;
        try {
            const templateDoc = await db.collection('certificate_settings').doc('template').get();
            if (templateDoc.exists && templateDoc.data().url) {
                templateUrl = templateDoc.data().url;
            }
        } catch (error) {
            console.warn('Could not fetch certificate template, using default:', error.message);
        }

        // If no template uploaded, use default from public folder
        // The default certificate is available at the public URL
        if (!templateUrl) {
            // Try to get default certificate URL from environment or use a public URL
            // For deployed apps, this would be the app's public URL + /Certificate.jpg
            // For now, we'll let the PDF generator use the local file as fallback
            console.log('No custom template found, using default certificate');
        }

        // Generate PDF with template URL (null will use default from assets folder)
        const pdfBuffer = await generateCertificatePDF(certificateData, templateUrl);

        // Upload to Firebase Storage
        const bucket = await getStorageBucket();
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
 * Upload certificate template (must be before /certificates/:id)
 */
app.post('/certificates/template', async (req, res) => {
    try {
        const { image, filename } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image data is required' });
        }

        // Parse base64 image data
        let base64Data, contentType, fileExtension;
        if (image.startsWith('data:')) {
            const matches = image.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches) {
                return res.status(400).json({ error: 'Invalid image data format. Expected data URI.' });
            }
            contentType = matches[1];
            base64Data = matches[2];

            // Extract file extension from content type or filename
            if (contentType.includes('jpeg') || contentType.includes('jpg')) {
                fileExtension = 'jpg';
            } else if (contentType.includes('png')) {
                fileExtension = 'png';
            } else if (contentType.includes('gif')) {
                fileExtension = 'gif';
            } else {
                fileExtension = filename ? filename.split('.').pop() : 'jpg';
            }
        } else {
            // Assume it's raw base64
            base64Data = image;
            fileExtension = filename ? filename.split('.').pop() : 'jpg';
            contentType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
        }

        // Convert base64 to buffer
        let imageBuffer;
        try {
            imageBuffer = Buffer.from(base64Data, 'base64');
        } catch (err) {
            return res.status(400).json({ error: 'Invalid base64 data', details: err.message });
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (imageBuffer.length > maxSize) {
            return res.status(400).json({
                error: 'Image too large',
                details: `Maximum size is 5MB, got ${(imageBuffer.length / 1024 / 1024).toFixed(2)}MB`
            });
        }

        // Upload to Firebase Storage
        let bucket;
        try {
            bucket = await getStorageBucket();
            console.log('Storage bucket initialized:', bucket.name);

            // Verify bucket is accessible
            try {
                const [exists] = await bucket.exists();
                if (!exists) {
                    throw new Error(`Storage bucket "${bucket.name}" does not exist. Please enable Firebase Storage in Firebase Console.`);
                }
                console.log('Bucket verified and accessible');
            } catch (verifyError) {
                // If exists() fails, try to get bucket metadata instead
                try {
                    await bucket.getMetadata();
                    console.log('Bucket metadata retrieved successfully');
                } catch (metaError) {
                    throw new Error(`Storage bucket "${bucket.name}" is not accessible. Error: ${metaError.message}. Please check Firebase Storage permissions.`);
                }
            }
        } catch (bucketError) {
            console.error('Storage bucket error:', bucketError);
            return res.status(503).json({
                error: 'Storage service unavailable',
                message: bucketError.message,
                details: 'Please ensure Firebase Storage is enabled and properly configured.'
            });
        }

        const storageFileName = `certificate-templates/template.${fileExtension}`;
        const file = bucket.file(storageFileName);

        // Delete existing template if any
        try {
            const [exists] = await file.exists();
            if (exists) {
                await file.delete();
                console.log('Deleted existing template');
            }
        } catch (deleteError) {
            console.warn('Could not delete existing template:', deleteError.message);
        }

        // Upload new template
        try {
            await file.save(imageBuffer, {
                metadata: {
                    contentType: contentType || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
                    metadata: {
                        uploadedAt: new Date().toISOString(),
                        purpose: 'certificate_template'
                    }
                },
                public: true
            });
            console.log('Template uploaded to:', storageFileName);
        } catch (uploadError) {
            console.error('Upload error:', uploadError);
            return res.status(500).json({
                error: 'Failed to upload template to storage',
                details: uploadError.message
            });
        }

        // Make file publicly accessible
        try {
            await file.makePublic();
        } catch (publicError) {
            console.warn('Could not make file public (might already be public):', publicError.message);
        }

        // Get public URL
        let publicUrl;
        if (process.env.FUNCTIONS_EMULATOR || process.env.FIRESTORE_EMULATOR_HOST) {
            // Internal URL for emulator
            publicUrl = `http://localhost:9199/${bucket.name}/${storageFileName}`;
        } else {
            publicUrl = `https://storage.googleapis.com/${bucket.name}/${storageFileName}`;
        }

        // Save metadata to Firestore
        await db.collection('certificate_settings').doc('template').set({
            url: publicUrl,
            filename: filename || `template.${fileExtension}`,
            contentType: contentType || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
            storage_path: storageFileName,
            bucket_name: bucket.name,
            uploaded_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        }, { merge: true });

        res.json({
            success: true,
            message: 'Certificate template uploaded successfully',
            data: {
                url: publicUrl,
                filename: filename || `template.${fileExtension}`
            }
        });
    } catch (error) {
        console.error('Error uploading certificate template:', error);
        res.status(500).json({
            error: 'Failed to upload certificate template',
            details: error.message
        });
    }
});

/**
 * Get certificate template (must be before /certificates/:id)
 */
app.get('/certificates/template', async (req, res) => {
    try {
        const doc = await db.collection('certificate_settings').doc('template').get();

        if (!doc.exists) {
            return res.json({
                success: true,
                data: null,
                message: 'No template uploaded yet'
            });
        }

        res.json({
            success: true,
            data: doc.data()
        });
    } catch (error) {
        console.error('Error fetching certificate template:', error);
        res.status(500).json({
            error: 'Failed to fetch certificate template',
            details: error.message
        });
    }
});

/**
 * Delete certificate template
 */
app.delete('/certificates/template', async (req, res) => {
    try {
        const doc = await db.collection('certificate_settings').doc('template').get();

        if (!doc.exists) {
            return res.json({
                success: true,
                message: 'No template to delete'
            });
        }

        const templateData = doc.data();

        // Delete from Storage
        if (templateData.storage_path) {
            try {
                const bucket = await getStorageBucket();
                const file = bucket.file(templateData.storage_path);
                const [exists] = await file.exists();
                if (exists) {
                    await file.delete();
                    console.log('Deleted template from storage:', templateData.storage_path);
                }
            } catch (storageError) {
                console.warn('Could not delete template from storage:', storageError.message);
            }
        }

        // Delete from Firestore
        await db.collection('certificate_settings').doc('template').delete();

        res.json({
            success: true,
            message: 'Certificate template deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting certificate template:', error);
        res.status(500).json({
            error: 'Failed to delete certificate template',
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

        // Fetch all certificates first (without ordering to avoid index issues)
        const allSnapshot = await db.collection('certificates').get();
        console.log(`Total certificates in database: ${allSnapshot.size}`);

        // Convert to array, filter out initialization documents
        const allCertificates = [];
        allSnapshot.forEach(doc => {
            // Skip initialization documents
            if (doc.id === '_init_' || doc.data()._initialized) {
                return;
            }
            const data = doc.data();
            allCertificates.push({
                id: doc.id,
                ...data,
                created_at: data.created_at || data.createdAt || null
            });
        });

        // Sort by created_at in memory (descending)
        allCertificates.sort((a, b) => {
            if (!a.created_at && !b.created_at) return 0;
            if (!a.created_at) return 1;
            if (!b.created_at) return -1;

            const aTime = a.created_at.toDate ? a.created_at.toDate().getTime() :
                (a.created_at._seconds ? a.created_at._seconds * 1000 :
                    (typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : 0));
            const bTime = b.created_at.toDate ? b.created_at.toDate().getTime() :
                (b.created_at._seconds ? b.created_at._seconds * 1000 :
                    (typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : 0));
            return bTime - aTime; // Descending order
        });

        // Apply pagination
        const certificates = allCertificates.slice(offset, offset + limit);
        const total = allCertificates.length;

        console.log(`Returning ${certificates.length} certificates out of ${total} total (offset: ${offset}, limit: ${limit})`);

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

        updates.updated_at = FieldValue.serverTimestamp();

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
            const bucket = await getStorageBucket();
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

        // Verify the message was actually sent
        if (result && result.success !== false) {
            // Update WhatsApp status
            await db.collection('certificates').doc(id).update({
                whatsapp_sent: true,
                whatsapp_sent_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            });

            res.json({
                success: true,
                message: 'Certificate sent via WhatsApp successfully',
                data: result
            });
        } else {
            throw new Error(result?.error || 'WhatsApp message send failed');
        }
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

        // Update email status
        await db.collection('certificates').doc(id).update({
            email_sent: true,
            email_sent_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        });

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
        let email_sent = 0;
        allDocs.forEach(doc => {
            const data = doc.data();
            if (data.whatsapp_sent) {
                whatsapp_sent++;
            }
            if (data.email_sent) {
                email_sent++;
            }
        });

        const stats = {
            total,
            whatsapp_sent,
            email_sent,
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
 * Bulk send certificates via WhatsApp and/or Email
 * POST /certificates/bulk-send
 * Body: {
 *   certificate_ids: string[],
 *   send_whatsapp: boolean,
 *   send_email: boolean,
 *   phone_numbers?: { [certificate_id]: string },
 *   emails?: { [certificate_id]: string },
 *   custom_whatsapp_message?: string,
 *   custom_email_subject?: string,
 *   custom_email_body?: string
 * }
 */
app.post('/certificates/bulk-send', async (req, res) => {
    try {
        const {
            certificate_ids,
            send_whatsapp = false,
            send_email = false,
            phone_numbers = {},
            emails = {},
            custom_whatsapp_message,
            custom_email_subject,
            custom_email_body
        } = req.body;

        if (!Array.isArray(certificate_ids) || certificate_ids.length === 0) {
            return res.status(400).json({
                error: 'certificate_ids array is required and must not be empty'
            });
        }

        if (!send_whatsapp && !send_email) {
            return res.status(400).json({
                error: 'At least one of send_whatsapp or send_email must be true'
            });
        }

        // Check service configuration
        if (send_whatsapp && !isWhatsAppConfigured()) {
            return res.status(503).json({
                error: 'WhatsApp service is not configured',
                configured: false
            });
        }

        if (send_email && !isEmailConfigured()) {
            return res.status(503).json({
                error: 'Email service is not configured',
                configured: false
            });
        }

        // Fetch all certificates
        const certificatePromises = certificate_ids.map(id =>
            db.collection('certificates').doc(id).get()
        );
        const certificateDocs = await Promise.all(certificatePromises);
        const certificates = certificateDocs
            .filter(doc => doc.exists)
            .map(doc => ({ id: doc.id, ...doc.data() }));

        if (certificates.length === 0) {
            return res.status(404).json({
                error: 'No valid certificates found'
            });
        }

        const results = {
            total: certificates.length,
            whatsapp: { sent: 0, failed: 0, errors: [] },
            email: { sent: 0, failed: 0, errors: [] }
        };

        const batch = db.batch();

        // Process each certificate
        for (const certificate of certificates) {
            const certId = certificate.id;
            const recipientPhone = phone_numbers[certId] || certificate.phone_number;
            const recipientEmail = emails[certId] || certificate.email;

            // Send via WhatsApp
            if (send_whatsapp && recipientPhone) {
                try {
                    let message = custom_whatsapp_message;
                    if (!message) {
                        message = `🎉 *Congratulations ${certificate.recipient_name}!*\n\n` +
                            `You have been awarded a Certificate of Appreciation from *Top Selling Property*.\n\n` +
                            `📜 *Certificate Number:* ${certificate.certificate_number}\n` +
                            (certificate.award_rera_number ? `🏆 *Award RERA Number:* ${certificate.award_rera_number}\n` : '') +
                            `\n📥 *Download your certificate:*\n${certificate.pdf_url}\n\n` +
                            `Thank you for your commitment and excellence!\n\n` +
                            `*www.topsellingproperty.com*`;
                    } else {
                        // Replace template variables
                        message = message
                            .replace(/\{\{name\}\}/gi, certificate.recipient_name || 'there')
                            .replace(/\{\{certificate_number\}\}/gi, certificate.certificate_number || '')
                            .replace(/\{\{rera_number\}\}/gi, certificate.award_rera_number || '')
                            .replace(/\{\{certificate_url\}\}/gi, certificate.pdf_url || '');
                    }

                    const whatsappResult = await sendBulkWhatsApp(recipientPhone, message);

                    // Verify the message was actually sent
                    if (whatsappResult && whatsappResult.success !== false) {
                        // Update certificate status
                        const certRef = db.collection('certificates').doc(certId);
                        batch.update(certRef, {
                            whatsapp_sent: true,
                            whatsapp_sent_at: FieldValue.serverTimestamp(),
                            updated_at: FieldValue.serverTimestamp()
                        });

                        results.whatsapp.sent++;
                    } else {
                        throw new Error(whatsappResult?.error || 'WhatsApp message send failed');
                    }
                } catch (error) {
                    console.error(`Failed to send WhatsApp for certificate ${certId}:`, error);
                    results.whatsapp.failed++;
                    results.whatsapp.errors.push({
                        certificate_id: certId,
                        recipient: recipientPhone,
                        error: error.message
                    });
                }
            } else if (send_whatsapp && !recipientPhone) {
                results.whatsapp.failed++;
                results.whatsapp.errors.push({
                    certificate_id: certId,
                    recipient: null,
                    error: 'No phone number available'
                });
            }

            // Send via Email
            if (send_email && recipientEmail) {
                try {
                    let subject = custom_email_subject;
                    let body = custom_email_body;

                    if (!subject) {
                        subject = `🎉 Certificate of Appreciation - ${certificate.certificate_number}`;
                    } else {
                        subject = subject
                            .replace(/\{\{name\}\}/gi, certificate.recipient_name || 'there')
                            .replace(/\{\{certificate_number\}\}/gi, certificate.certificate_number || '')
                            .replace(/\{\{rera_number\}\}/gi, certificate.award_rera_number || '');
                    }

                    if (!body) {
                        body = `Dear ${certificate.recipient_name},\n\n` +
                            `We are delighted to inform you that you have been awarded a Certificate of Appreciation from Top Selling Property.\n\n` +
                            `Certificate Number: ${certificate.certificate_number}\n` +
                            (certificate.award_rera_number ? `Award RERA Number: ${certificate.award_rera_number}\n` : '') +
                            `\nDownload your certificate: ${certificate.pdf_url}\n\n` +
                            `Thank you for your outstanding contribution!\n\n` +
                            `Top Selling Property\nwww.topsellingproperty.com`;
                    } else {
                        // Replace template variables
                        body = body
                            .replace(/\{\{name\}\}/gi, certificate.recipient_name || 'there')
                            .replace(/\{\{certificate_number\}\}/gi, certificate.certificate_number || '')
                            .replace(/\{\{rera_number\}\}/gi, certificate.award_rera_number || '')
                            .replace(/\{\{certificate_url\}\}/gi, certificate.pdf_url || '');
                    }

                    await sendBulkEmail(recipientEmail, subject, body);

                    // Update certificate status
                    const certRef = db.collection('certificates').doc(certId);
                    batch.update(certRef, {
                        email_sent: true,
                        email_sent_at: FieldValue.serverTimestamp(),
                        updated_at: FieldValue.serverTimestamp()
                    });

                    results.email.sent++;
                } catch (error) {
                    console.error(`Failed to send Email for certificate ${certId}:`, error);
                    results.email.failed++;
                    results.email.errors.push({
                        certificate_id: certId,
                        recipient: recipientEmail,
                        error: error.message
                    });
                }
            } else if (send_email && !recipientEmail) {
                results.email.failed++;
                results.email.errors.push({
                    certificate_id: certId,
                    recipient: null,
                    error: 'No email address available'
                });
            }
        }

        // Commit all batch updates
        await batch.commit();

        res.json({
            success: true,
            message: 'Bulk send completed',
            data: results
        });
    } catch (error) {
        console.error('Error in bulk send:', error);
        res.status(500).json({
            error: 'Failed to send certificates in bulk',
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
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
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

        const BATCH_SIZE = 500;
        const importedContacts = [];
        let currentBatch = db.batch();
        let operationCount = 0;

        for (let i = 0; i < contacts.length; i++) {
            const contact = contacts[i];
            const id = uuidv4();
            const contactData = {
                id,
                name: contact.name || contact.Name || contact['AWARDE NAME'] || contact['Awarde Name'] || '',
                email: contact.email || contact.Email || contact.EMAIL || '',
                phone: String(contact.phone || contact.Phone || contact['Phone Number'] || contact['Phone number'] || contact.Whatsapp || contact.whatsapp || contact.WHATSAPP || contact['WhatsApp'] || ''),
                rera_awarde_no: contact['AWARDE RERA REGISTRATION NO.'] || contact['RERA Awarde No.'] || contact['RERA Awarde No'] || contact.reraAwardeNo || contact['Rera No'] || '',
                certificate_number: contact['CERTIFICATE NUMBER'] || contact['Certificate Number'] || contact.certificateNumber || '',
                professional: contact['AWARDE PROFESSION'] || contact.Professional || contact.professional || contact.Profession || '',
                tags: contact.tags || [],
                email_sent_count: 0,
                whatsapp_sent_count: 0,
                last_contacted_at: null,
                created_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            };

            currentBatch.set(db.collection('marketing_contacts').doc(id), contactData);
            importedContacts.push(contactData);
            operationCount++;

            // If batch is full, commit and start a new one
            if (operationCount === BATCH_SIZE) {
                await currentBatch.commit();
                currentBatch = db.batch();
                operationCount = 0;
            }
        }

        // Commit any remaining operations
        if (operationCount > 0) {
            await currentBatch.commit();
        }

        res.status(201).json({
            success: true,
            message: `Successfully imported ${importedContacts.length} contacts`,
            data: { count: importedContacts.length, contacts: importedContacts }
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
        updates.updated_at = FieldValue.serverTimestamp();

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
        const { type, subject, message, contactIds, templateId, scheduledAt, includeCertificate, whatsappCampaign } = req.body;

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

        // Handle certificate attachment
        let certificateAttachment = null;
        if (includeCertificate && includeCertificate.certificateId) {
            if (includeCertificate.certificateId === 'default') {
                // Use default certificate template
                certificateAttachment = {
                    certificateId: 'default',
                    isDefault: true,
                    formats: includeCertificate.formats || { pdf: true, jpg: false }
                };
            } else {
                // Use specific certificate
                const certDoc = await db.collection('certificates').doc(includeCertificate.certificateId).get();
                if (certDoc.exists) {
                    const certData = certDoc.data();
                    certificateAttachment = {
                        certificateId: includeCertificate.certificateId,
                        certificateNumber: certData.certificate_number,
                        pdfUrl: certData.pdf_url,
                        isDefault: false,
                        formats: includeCertificate.formats || { pdf: true, jpg: false }
                    };
                }
            }
        }

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
            certificate_attachment: certificateAttachment,
            whatsapp_campaign: whatsappCampaign || null,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        };

        await db.collection('marketing_campaigns').doc(id).set(campaignData);

        // If not scheduled, send immediately
        if (!isScheduled) {
            try {
                await sendCampaignMessages(id, type, subject, message, contacts, certificateAttachment, whatsappCampaign);
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
async function sendCampaignMessages(campaignId, type, subject, message, contacts, certificateAttachment = null, whatsappCampaign = null) {
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    const batch = db.batch();

    // Check if service is configured before starting
    if (type === 'email' && !isEmailConfigured()) {
        throw new Error('Email service is not configured');
    }
    if (type === 'whatsapp' && !isWhatsAppConfigured()) {
        throw new Error('WhatsApp service is not configured');
    }

    for (const contact of contacts) {
        try {
            // Personalize message with all supported placeholders
            const personalizeMessage = (text, contact) => {
                if (!text) return '';
                return text
                    .replace(/\{\{name\}\}/gi, contact.name || 'Valued Customer')
                    .replace(/\{\{certificate\}\}/gi, contact.certificate_number || contact.certificateNumber || '')
                    .replace(/\{\{rera\}\}/gi, contact.rera_awarde_no || contact.reraAwardeNo || '')
                    .replace(/\{\{professional\}\}/gi, contact.professional || '')
                    .replace(/\{\{email\}\}/gi, contact.email || '')
                    .replace(/\{\{phone\}\}/gi, contact.phone || '');
            };

            const personalizedMessage = personalizeMessage(message, contact);

            if (type === 'email' && contact.email) {
                try {
                    let attachments = [];

                    // Attach certificate if requested
                    if (certificateAttachment) {
                        try {
                            const certResult = await getOrCreateCertificateForContact(contact, certificateAttachment);
                            if (certResult) {
                                attachments.push({
                                    filename: certResult.filename,
                                    path: certResult.url
                                });
                            }
                        } catch (certError) {
                            console.error(`Error getting certificate for ${contact.id}:`, certError);
                            errors.push({ contactId: contact.id, contact: contact.email, error: `Certificate generation failed: ${certError.message}` });
                        }
                    }

                    await sendBulkEmail(contact.email, subject, personalizedMessage, attachments);
                    sentCount++;

                    // Update contact stats
                    const contactRef = db.collection('marketing_contacts').doc(contact.id);
                    batch.update(contactRef, {
                        email_sent_count: FieldValue.increment(1),
                        last_contacted_at: FieldValue.serverTimestamp(),
                        last_contact_type: 'email'
                    });
                } catch (error) {
                    console.error(`Failed to send email to ${contact.email}:`, error);
                    failedCount++;
                    errors.push({ contactId: contact.id, contact: contact.email, error: error.message });
                }
            } else if (type === 'whatsapp' && contact.phone) {
                try {
                    let mediaUrl = null;
                    let filename = 'certificate.pdf';

                    // Attach certificate if requested
                    if (certificateAttachment) {
                        try {
                            const certResult = await getOrCreateCertificateForContact(contact, certificateAttachment);
                            if (certResult) {
                                mediaUrl = certResult.url;
                                filename = certResult.filename;
                            }
                        } catch (certError) {
                            console.error(`Error getting certificate for ${contact.id}:`, certError);
                            // Continue sending without certificate if generation fails
                            errors.push({ contactId: contact.id, contact: contact.phone, error: `Certificate generation failed: ${certError.message}` });
                        }
                    }

                    const result = await sendBulkWhatsApp(contact.phone, personalizedMessage, mediaUrl, filename, whatsappCampaign);

                    // Verify the message was actually sent
                    if (result && result.success !== false) {
                        sentCount++;

                        // Update contact stats
                        const contactRef = db.collection('marketing_contacts').doc(contact.id);
                        batch.update(contactRef, {
                            whatsapp_sent_count: FieldValue.increment(1),
                            last_contacted_at: FieldValue.serverTimestamp(),
                            last_contact_type: 'whatsapp'
                        });
                    } else {
                        throw new Error(result?.error || 'Message send failed');
                    }
                } catch (error) {
                    console.error(`Failed to send WhatsApp to ${contact.phone}:`, error);
                    failedCount++;
                    errors.push({ contactId: contact.id, contact: contact.phone, error: error.message });
                }
            } else {
                // No valid contact method
                failedCount++;
                errors.push({
                    contactId: contact.id,
                    contact: contact.name || contact.id,
                    error: type === 'email' ? 'No email address' : 'No phone number'
                });
            }
        } catch (error) {
            console.error(`Failed to send to ${contact.id}:`, error);
            failedCount++;
            errors.push({ contactId: contact.id, error: error.message });
        }
    }

    // Commit contact updates
    try {
        await batch.commit();
    } catch (error) {
        console.error('Error committing contact updates:', error);
    }

    // Determine campaign status based on results
    let campaignStatus = 'completed';
    if (sentCount === 0 && failedCount > 0) {
        campaignStatus = 'failed';
    } else if (failedCount > 0 && sentCount > 0) {
        campaignStatus = 'partial';
    }

    // Update campaign status
    await db.collection('marketing_campaigns').doc(campaignId).update({
        status: campaignStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: sentCount > 0 ? FieldValue.serverTimestamp() : null,
        updated_at: FieldValue.serverTimestamp(),
        errors: errors.length > 0 ? errors : FieldValue.delete()
    });

    return { sentCount, failedCount, errors };
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

        const certificateAttachment = campaign.certificate_attachment || null;

        const result = await sendCampaignMessages(
            id,
            campaign.type,
            campaign.subject,
            campaign.message,
            contacts,
            certificateAttachment
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
            updated_at: FieldValue.serverTimestamp()
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
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
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
        updates.updated_at = FieldValue.serverTimestamp();

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
            updated_at: FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Campaign rescheduled successfully' });
    } catch (error) {
        console.error('Error rescheduling campaign:', error);
        res.status(500).json({ error: 'Failed to reschedule campaign', details: error.message });
    }
});

// ============================================
// NOTIFICATIONS MODULE
// ============================================

/**
 * Get all notifications
 */
app.get('/notifications', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const unreadOnly = req.query.unread === 'true';

        let query = db.collection('notifications')
            .orderBy('created_at', 'desc');

        if (unreadOnly) {
            query = query.where('read', '==', false);
        }

        const snapshot = await query.limit(limit).get();

        const notifications = [];
        snapshot.forEach(doc => {
            notifications.push({ id: doc.id, ...doc.data() });
        });

        // Get unread count
        const unreadSnapshot = await db.collection('notifications')
            .where('read', '==', false)
            .get();
        const unreadCount = unreadSnapshot.size;

        res.json({
            success: true,
            data: notifications,
            unreadCount
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications', details: error.message });
    }
});

/**
 * Create a notification
 */
app.post('/notifications', async (req, res) => {
    try {
        const { title, message, type, link, userId } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        const id = uuidv4();
        const notificationData = {
            id,
            title,
            message,
            type: type || 'info', // info, success, warning, error
            link: link || null,
            userId: userId || null, // null for global notifications
            read: false,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        };

        await db.collection('notifications').doc(id).set(notificationData);

        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            data: notificationData
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: 'Failed to create notification', details: error.message });
    }
});

/**
 * Mark notification as read
 */
app.put('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('notifications').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await docRef.update({
            read: true,
            read_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to update notification', details: error.message });
    }
});

/**
 * Mark all notifications as read
 */
app.put('/notifications/read-all', async (req, res) => {
    try {
        const snapshot = await db.collection('notifications')
            .where('read', '==', false)
            .get();

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.update(doc.ref, {
                read: true,
                read_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        res.json({
            success: true,
            message: `Marked ${snapshot.size} notifications as read`
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to update notifications', details: error.message });
    }
});

/**
 * Delete a notification
 */
app.delete('/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const docRef = db.collection('notifications').doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Notification not found' });
        }

        await docRef.delete();

        res.json({ success: true, message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification', details: error.message });
    }
});

/**
 * Get unread notification count
 */
app.get('/notifications/unread-count', async (req, res) => {
    try {
        const snapshot = await db.collection('notifications')
            .where('read', '==', false)
            .get();

        res.json({
            success: true,
            count: snapshot.size
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count', details: error.message });
    }
});

/**
 * Get or create a certificate for a contact
 */
async function getOrCreateCertificateForContact(contact, attachment) {
    const formats = attachment.formats || { pdf: true, jpg: false };
    // Prefer JPG for campaigns if requested (better for WhatsApp/Social)
    const useJpg = formats.jpg === true;
    const extension = useJpg ? 'jpg' : 'pdf';

    // 1. If a specific certificate ID is provided, use that
    if (attachment.certificateId && attachment.certificateId !== 'default') {
        const certDoc = await db.collection('certificates').doc(attachment.certificateId).get();
        if (certDoc.exists) {
            const certData = certDoc.data();
            const url = useJpg ? (certData.jpg_url || certData.pdf_url) : certData.pdf_url;
            return {
                url,
                filename: `certificate_${certData.certificate_number || certDoc.id}.${extension}`
            };
        }
    }

    // 2. For 'default' template, we could look for an existing one, 
    // but users often expect the LATEST template they uploaded to be used.
    // So we'll skip reuse and generate a new one to ensure the latest customized template is applied.
    // Only reuse if we're sure it matches. For now, let's look for existing 
    // but we'll add a check in the next step.

    // Skip reuse if customized template might have changed
    const forceNew = true;

    if (!forceNew) {
        let existingCerts = await db.collection('certificates')
            .where('email', '==', contact.email || '')
            .limit(1)
            .get();

        if (existingCerts.empty && contact.phone) {
            existingCerts = await db.collection('certificates')
                .where('phone_number', '==', contact.phone)
                .limit(1)
                .get();
        }

        if (!existingCerts.empty) {
            const certData = existingCerts.docs[0].data();
            // If we need JPG but only have PDF, we'll continue to generate below
            if (!(useJpg && !certData.jpg_url)) {
                const url = useJpg ? certData.jpg_url : certData.pdf_url;
                return {
                    url,
                    filename: `certificate_${certData.certificate_number || existingCerts.docs[0].id}.${extension}`
                };
            }
        }
    }

    // 3. Last resort: Generate a new one for this contact
    console.log(`Generating new ${extension} certificate for ${contact.name}`);

    const certNumber = `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const certificateData = {
        recipient_name: contact.name || 'Recipient',
        certificate_number: certNumber,
        award_rera_number: contact.rera_awarde_no || contact.reraAwardeNo || null,
        professional: contact.professional || null,
        phone_number: contact.phone || null,
        email: contact.email || null,
        created_at: FieldValue.serverTimestamp()
    };

    // Get template URL
    let templateUrl = null;
    const templateDoc = await db.collection('certificate_settings').doc('template').get();
    if (templateDoc.exists && templateDoc.data().url) {
        templateUrl = templateDoc.data().url;
    }

    const buffer = useJpg
        ? await generateCertificateImage(certificateData, templateUrl)
        : await generateCertificatePDF(certificateData, templateUrl);

    const id = uuidv4();
    const bucket = await getStorageBucket();
    const file = bucket.file(`certificates/${id}.${extension}`);

    await file.save(buffer, {
        metadata: {
            contentType: useJpg ? 'image/jpeg' : 'application/pdf',
        }
    });

    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/certificates/${id}.${extension}`;

    // Save to Firestore so we don't regenerate it next time
    const newCertData = {
        ...certificateData,
        id,
        [useJpg ? 'jpg_url' : 'pdf_url']: publicUrl
    };
    await db.collection('certificates').doc(id).set(newCertData);

    return {
        url: publicUrl,
        filename: `certificate_${certNumber}.${extension}`
    };
}

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
 * Upload certificate template
 */
app.post('/certificates/template', async (req, res) => {
    try {
        // Check if request body exists
        if (!req.body) {
            return res.status(400).json({
                success: false,
                error: 'Request body is missing',
                details: 'No data received from client'
            });
        }

        const { image, filename, contentType } = req.body;

        if (!image) {
            return res.status(400).json({
                success: false,
                error: 'Image data is required',
                details: 'The image field is missing in the request body'
            });
        }

        // Validate image data size (base64 is ~33% larger than original)
        // If original is 5MB, base64 would be ~6.7MB, so we allow up to 10MB base64
        const maxBase64Size = 10 * 1024 * 1024; // 10MB
        if (image.length > maxBase64Size) {
            return res.status(400).json({
                success: false,
                error: 'Image too large',
                details: `Image data is ${(image.length / 1024 / 1024).toFixed(2)}MB. Maximum allowed is ${(maxBase64Size / 1024 / 1024).toFixed(2)}MB (base64 encoded).`
            });
        }

        console.log('Received template upload request:', {
            filename: filename || 'unknown',
            contentType: contentType || 'unknown',
            imageLength: image.length,
            imageLengthMB: (image.length / 1024 / 1024).toFixed(2) + 'MB'
        });

        // Convert base64 to buffer
        let base64Data = image;
        if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
        }

        let imageBuffer;
        try {
            imageBuffer = Buffer.from(base64Data, 'base64');
            console.log('Image buffer created, size:', imageBuffer.length);
        } catch (bufferError) {
            console.error('Error creating buffer:', bufferError);
            return res.status(400).json({
                error: 'Invalid image data format',
                details: bufferError.message
            });
        }

        // Determine file extension from content type or filename
        let fileExtension = 'jpg';
        if (contentType) {
            if (contentType.includes('png')) fileExtension = 'png';
            else if (contentType.includes('gif')) fileExtension = 'gif';
            else if (contentType.includes('jpeg') || contentType.includes('jpg')) fileExtension = 'jpg';
        } else if (filename) {
            const ext = filename.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                fileExtension = ext === 'jpeg' ? 'jpg' : ext;
            }
        }

        const storageFileName = `certificate-templates/template.${fileExtension}`;

        // Upload to Firebase Storage
        let bucket;
        try {
            bucket = await getStorageBucket();
            console.log('Storage bucket initialized:', bucket.name);

            // Verify bucket is accessible
            try {
                const [exists] = await bucket.exists();
                if (!exists) {
                    throw new Error(`Storage bucket "${bucket.name}" does not exist. Please enable Firebase Storage in Firebase Console.`);
                }
                console.log('Bucket verified and accessible');
            } catch (verifyError) {
                // If exists() fails, try to get bucket metadata instead
                try {
                    await bucket.getMetadata();
                    console.log('Bucket metadata retrieved successfully');
                } catch (metaError) {
                    throw new Error(`Storage bucket "${bucket.name}" is not accessible. Error: ${metaError.message}. Please check Firebase Storage permissions.`);
                }
            }
        } catch (bucketError) {
            console.error('Error initializing storage bucket:', bucketError);
            console.error('Bucket error details:', {
                code: bucketError.code,
                message: bucketError.message,
                stack: bucketError.stack,
                projectId: process.env.GCLOUD_PROJECT || adminApp?.options?.projectId
            });

            // Provide helpful error message
            let errorMessage = 'Failed to initialize storage bucket';
            if (bucketError.code === 'ENOENT' || bucketError.message.includes('not exist')) {
                errorMessage = 'Firebase Storage bucket does not exist. Please enable Firebase Storage in your Firebase Console.';
            } else if (bucketError.code === 'EACCES' || bucketError.code === 'PERMISSION_DENIED') {
                errorMessage = 'Permission denied. Please check that Firebase Storage is enabled and the service account has proper permissions.';
            } else {
                errorMessage = `Storage error: ${bucketError.message}`;
            }

            throw new Error(errorMessage);
        }

        const file = bucket.file(storageFileName);
        console.log('Uploading to storage:', {
            bucket: bucket.name,
            fileName: storageFileName,
            fileSize: imageBuffer.length,
            contentType: contentType || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
        });

        // Delete existing template if it exists (to avoid conflicts)
        try {
            const existingFile = bucket.file(storageFileName);
            const [exists] = await existingFile.exists();
            if (exists) {
                console.log('Deleting existing template file');
                await existingFile.delete();
            }
        } catch (deleteError) {
            console.warn('Could not delete existing template (may not exist):', deleteError.message);
            // Continue anyway
        }

        // Upload the file
        try {
            await file.save(imageBuffer, {
                metadata: {
                    contentType: contentType || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
                    metadata: {
                        uploadedAt: new Date().toISOString(),
                        filename: filename || `template.${fileExtension}`,
                        purpose: 'certificate_template'
                    }
                },
                resumable: false // Use simple upload for smaller files
            });
            console.log('File saved to storage successfully');
        } catch (saveError) {
            console.error('Error saving file to storage:', saveError);
            console.error('Save error details:', {
                code: saveError.code,
                message: saveError.message,
                stack: saveError.stack
            });
            throw new Error(`Failed to save file to storage: ${saveError.message}`);
        }

        // Make file publicly accessible
        let publicUrl;
        try {
            await file.makePublic();
            console.log('File made public successfully');
            publicUrl = `https://storage.googleapis.com/${bucket.name}/${storageFileName}`;
        } catch (publicError) {
            console.warn('Warning: Could not make file public:', publicError.message);
            // Try to get signed URL as fallback
            try {
                const [signedUrl] = await file.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491' // Far future date
                });
                publicUrl = signedUrl;
                console.log('Using signed URL as fallback');
            } catch (signedUrlError) {
                console.error('Could not generate signed URL:', signedUrlError);
                // Still try to construct public URL
                publicUrl = `https://storage.googleapis.com/${bucket.name}/${storageFileName}`;
            }
        }

        console.log('Public URL:', publicUrl);

        // Save template info to Firestore
        try {
            const templateData = {
                url: publicUrl,
                filename: filename || `template.${fileExtension}`,
                contentType: contentType || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
                storage_path: storageFileName,
                bucket_name: bucket.name,
                uploaded_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            };

            await db.collection('certificate_settings').doc('template').set(templateData, { merge: true });
            console.log('Template info saved to Firestore successfully');
        } catch (firestoreError) {
            console.error('Error saving template info to Firestore:', firestoreError);
            // Even if Firestore save fails, the file is uploaded, so we can still return success
            // but log the error
            console.warn('Warning: File uploaded but Firestore save failed. File URL:', publicUrl);
        }

        res.json({
            success: true,
            message: 'Certificate template uploaded successfully',
            data: {
                url: publicUrl,
                filename: filename || `template.${fileExtension}`
            }
        });
    } catch (error) {
        console.error('Error uploading certificate template:', error);
        console.error('Error stack:', error.stack);
        console.error('Error name:', error.name);
        console.error('Error code:', error.code);

        // More specific error messages
        let errorMessage = 'Failed to upload certificate template';
        let errorDetails = error.message;

        if (error.code === 'ENOENT') {
            errorMessage = 'Storage path not found';
            errorDetails = 'The storage bucket or path does not exist';
        } else if (error.code === 'EACCES' || error.code === 'EPERM') {
            errorMessage = 'Permission denied';
            errorDetails = 'Insufficient permissions to write to Firebase Storage';
        } else if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused';
            errorDetails = 'Could not connect to Firebase Storage';
        } else if (error.message && error.message.includes('storage')) {
            errorMessage = 'Firebase Storage error';
            errorDetails = error.message;
        } else if (error.message && error.message.includes('Firestore')) {
            errorMessage = 'Firestore database error';
            errorDetails = error.message;
        }

        res.status(500).json({
            success: false,
            error: errorMessage,
            details: errorDetails,
            code: error.code || 'UNKNOWN_ERROR',
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * Get certificate template
 */
app.get('/certificates/template', async (req, res) => {
    try {
        const doc = await db.collection('certificate_settings').doc('template').get();

        if (!doc.exists) {
            return res.json({
                success: true,
                data: null,
                message: 'No template uploaded yet'
            });
        }

        res.json({
            success: true,
            data: doc.data()
        });
    } catch (error) {
        console.error('Error fetching certificate template:', error);
        res.status(500).json({
            error: 'Failed to fetch certificate template',
            details: error.message
        });
    }
});

/**
 * Health check
 */
app.get('/health', async (req, res) => {
    let storageStatus = 'unknown';
    let storageError = null;

    try {
        const bucket = await getStorageBucket();
        const [exists] = await bucket.exists();
        storageStatus = exists ? 'configured' : 'not configured';
    } catch (error) {
        storageStatus = 'error';
        storageError = error.message;
    }

    res.json({
        status: 'OK',
        message: 'Marketing & Certificate Generator Firebase API is running',
        timestamp: new Date().toISOString(),
        services: {
            email: isEmailConfigured() ? 'configured' : 'not configured',
            whatsapp: isWhatsAppConfigured() ? 'configured' : 'not configured',
            storage: storageStatus,
            storageError: storageError
        }
    });
});

/**
 * Test Storage Configuration
 * GET /test/storage
 */
app.get('/test/storage', async (req, res) => {
    try {
        console.log('🧪 Testing Firebase Storage configuration...');

        // Get bucket
        const bucket = await getStorageBucket();
        console.log('✅ Bucket retrieved:', bucket.name);

        // Test if bucket exists
        const [exists] = await bucket.exists();
        if (!exists) {
            return res.status(503).json({
                success: false,
                error: 'Storage bucket does not exist',
                message: 'Please enable Firebase Storage in Firebase Console',
                bucket: bucket.name,
                setupUrl: `https://console.firebase.google.com/project/${process.env.GCLOUD_PROJECT || 'your-project'}/storage`
            });
        }
        console.log('✅ Bucket exists and is accessible');

        // Test write permission by creating a test file
        const testFileName = `test/test-${Date.now()}.txt`;
        const testFile = bucket.file(testFileName);

        try {
            await testFile.save('Storage test file', {
                metadata: {
                    contentType: 'text/plain',
                    metadata: {
                        purpose: 'storage_test',
                        createdAt: new Date().toISOString()
                    }
                }
            });
            console.log('✅ Write test successful');

            // Clean up test file
            try {
                await testFile.delete();
                console.log('✅ Test file cleaned up');
            } catch (deleteError) {
                console.warn('⚠️  Could not delete test file:', deleteError.message);
            }

            // Test certificate-templates folder
            const templatesFolder = bucket.file('certificate-templates/.test');
            try {
                await templatesFolder.save('test', { metadata: { contentType: 'text/plain' } });
                await templatesFolder.delete();
                console.log('✅ certificate-templates folder is writable');
            } catch (folderError) {
                console.warn('⚠️  certificate-templates folder test:', folderError.message);
            }

            res.json({
                success: true,
                message: 'Firebase Storage is properly configured and accessible',
                bucket: bucket.name,
                tests: {
                    bucketExists: true,
                    writePermission: true,
                    readPermission: true
                }
            });
        } catch (writeError) {
            console.error('❌ Write test failed:', writeError);
            res.status(503).json({
                success: false,
                error: 'Storage write test failed',
                message: writeError.message,
                bucket: bucket.name,
                code: writeError.code,
                details: 'Please check Firebase Storage permissions and rules'
            });
        }
    } catch (error) {
        console.error('❌ Storage test failed:', error);
        res.status(500).json({
            success: false,
            error: 'Storage configuration test failed',
            message: error.message,
            code: error.code,
            setupUrl: `https://console.firebase.google.com/project/${process.env.GCLOUD_PROJECT || 'your-project'}/storage`,
            instructions: [
                '1. Go to Firebase Console → Storage',
                '2. Click "Get Started" to enable Firebase Storage',
                '3. Choose a location (e.g., us-central1)',
                '4. Deploy storage rules: firebase deploy --only storage',
                '5. Test again using: GET /test/storage'
            ]
        });
    }
});

/**
 * Test WhatsApp message sending
 * POST /test/whatsapp
 * Body: { phone_number: "7500988212", message: "Hie", media_url: "https://..." (optional) }
 */
app.post('/test/whatsapp', async (req, res) => {
    try {
        const { phone_number, message, media_url, filename } = req.body;

        if (!phone_number) {
            return res.status(400).json({ error: 'phone_number is required' });
        }

        if (!message) {
            return res.status(400).json({ error: 'message is required' });
        }

        // Check if WhatsApp is configured
        if (!isWhatsAppConfigured()) {
            return res.status(503).json({
                error: 'WhatsApp service is not configured',
                configured: false
            });
        }

        console.log(`🧪 Testing WhatsApp message to ${phone_number}: "${message}"${media_url ? ` with media: ${media_url}` : ''}`);

        let result;
        if (media_url) {
            // Send document/media message
            const { sendWhatsAppDocument } = require('./utils/whatsappService');
            result = await sendWhatsAppDocument(phone_number, media_url, filename || 'document.pdf', message);
        } else {
            // Send text-only message
            result = await sendBulkWhatsApp(phone_number, message);
        }

        res.json({
            success: true,
            message: 'Test message sent successfully',
            data: result
        });
    } catch (error) {
        console.error('Error in test WhatsApp:', error);
        res.status(500).json({
            error: 'Failed to send test message',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
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

                    const certificateAttachment = campaign.certificate_attachment || null;

                    await sendCampaignMessages(
                        campaign.id,
                        campaign.type,
                        campaign.subject,
                        campaign.message,
                        contacts,
                        certificateAttachment
                    );

                    console.log(`Campaign ${campaign.id} processed successfully`);
                } catch (error) {
                    console.error(`Error processing campaign ${campaign.id}:`, error);

                    await db.collection('marketing_campaigns').doc(campaign.id).update({
                        status: 'failed',
                        error_message: error.message,
                        updated_at: FieldValue.serverTimestamp()
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
exports.api = functions.runWith({
    timeoutSeconds: 300,
    memory: '1GB'
}).https.onRequest(app);
