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
        // Try to get default template from certificate_templates first
        let templateUrl = null;
        try {
            // First try to get default template from certificate_templates
            const defaultTemplateSnapshot = await db.collection('certificate_templates')
                .where('is_default', '==', true)
                .limit(1)
                .get();
            
            if (!defaultTemplateSnapshot.empty) {
                templateUrl = defaultTemplateSnapshot.docs[0].data().url;
            } else {
                // Fallback to legacy single template
            const templateDoc = await db.collection('certificate_settings').doc('template').get();
            if (templateDoc.exists && templateDoc.data().url) {
                templateUrl = templateDoc.data().url;
                }
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
 * Proxy certificate template image with CORS headers
 * This endpoint serves the image with proper CORS headers to avoid tainted canvas issues
 */
app.get('/certificates/template/image', async (req, res) => {
    try {
        const { id } = req.query;
        let templateDoc;
        let templateUrl;
        let storagePath;
        
        // If ID is provided, get specific template
        if (id) {
            templateDoc = await db.collection('certificate_templates').doc(id).get();
            if (!templateDoc.exists) {
                return res.status(404).json({
                    error: 'Template not found'
                });
            }
            const templateData = templateDoc.data();
            templateUrl = templateData.url;
            storagePath = templateData.storage_path;
        } else {
            // Get default template
            const defaultTemplateSnapshot = await db.collection('certificate_templates')
                .where('is_default', '==', true)
                .limit(1)
                .get();
            
            if (!defaultTemplateSnapshot.empty) {
                const defaultData = defaultTemplateSnapshot.docs[0].data();
                templateUrl = defaultData.url;
                storagePath = defaultData.storage_path;
            } else {
                // Fallback to legacy template
                templateDoc = await db.collection('certificate_settings').doc('template').get();
                if (!templateDoc.exists || !templateDoc.data().url) {
                    return res.status(404).json({
                        error: 'No template found'
                    });
                }
                templateUrl = templateDoc.data().url;
                storagePath = templateDoc.data().storage_path;
            }
        }
        
        // Try to get image from Firebase Storage directly (better performance)
        try {
            const bucket = await getStorageBucket();
            let file;
            
            if (storagePath) {
                file = bucket.file(storagePath);
            } else {
                // Try to extract path from URL
                const urlMatch = templateUrl.match(/\/o\/([^?]+)/);
                if (urlMatch) {
                    file = bucket.file(decodeURIComponent(urlMatch[1]));
                } else {
                    throw new Error('Could not determine storage path');
                }
            }
            
            const [exists] = await file.exists();
            if (!exists) {
                throw new Error('File does not exist in storage');
            }
            
            // Get file metadata
            const [metadata] = await file.getMetadata();
            const contentType = metadata.contentType || 'image/jpeg';
            
            // Create a read stream
            const stream = file.createReadStream();
            
            // Set CORS headers
            res.set('Access-Control-Allow-Origin', '*');
            res.set('Access-Control-Allow-Methods', 'GET');
            res.set('Content-Type', contentType);
            res.set('Cache-Control', 'public, max-age=3600');
            
            // Pipe the stream to response
            stream.pipe(res);
            
            stream.on('error', (error) => {
                console.error('Stream error:', error);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: 'Failed to stream image',
                        details: error.message
                    });
                }
            });
        } catch (storageError) {
            console.warn('Storage access failed, trying HTTP fetch:', storageError.message);
            
            // Fallback: Use node-fetch if available
            const fetch = require('node-fetch');
            try {
                const response = await fetch(templateUrl);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${response.status}`);
                }
                
                // node-fetch v2 uses .buffer() method
                const imageBuffer = await response.buffer();
                const contentType = response.headers.get('content-type') || 'image/jpeg';
                
                // Set CORS headers
                res.set('Access-Control-Allow-Origin', '*');
                res.set('Access-Control-Allow-Methods', 'GET');
                res.set('Content-Type', contentType);
                res.set('Cache-Control', 'public, max-age=3600');
                
                res.send(imageBuffer);
            } catch (fetchError) {
                console.error('HTTP fetch also failed:', fetchError);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: 'Failed to fetch template image',
                        details: fetchError.message
                    });
                }
            }
        }
    } catch (error) {
        console.error('Error in template image proxy:', error);
        res.status(500).json({
            error: 'Failed to proxy template image',
            details: error.message
        });
    }
});

/**
 * Delete certificate template by ID
 */
app.delete('/certificates/template/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Template ID is required'
            });
        }

        const doc = await db.collection('certificate_templates').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Template not found',
                message: `Template with ID ${id} does not exist`
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
        await db.collection('certificate_templates').doc(id).delete();

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
 * Set default template
 */
app.post('/certificates/template/:id/set-default', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.status(400).json({
                success: false,
                error: 'Template ID is required'
            });
        }

        const doc = await db.collection('certificate_templates').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({
                success: false,
                error: 'Template not found'
            });
        }

        // Remove default flag from all templates
        const allTemplates = await db.collection('certificate_templates').get();
        const batch = db.batch();
        
        allTemplates.forEach(templateDoc => {
            batch.update(templateDoc.ref, { is_default: false });
        });
        
        // Set this template as default
        batch.update(doc.ref, { is_default: true });
        
        await batch.commit();

        res.json({
            success: true,
            message: 'Default template updated successfully',
            data: {
                id: doc.id,
                ...doc.data(),
                is_default: true
            }
        });
    } catch (error) {
        console.error('Error setting default template:', error);
        res.status(500).json({
            error: 'Failed to set default template',
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
                error: 'WhatsApp service is not configured. Please set up AiSensy credentials.',
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

        // Send certificate file via WhatsApp (not just a link)
        // Use sendBulkWhatsApp to send the actual file with a message
        // Format message to work with AiSensy (will be split by newlines into multiple parameters)
        const message = `🎉 Congratulations ${certificate.recipient_name}!` +
            `\nYou have been awarded a Certificate of Appreciation from Top Selling Property.` +
            `\n📜 Certificate Number: ${certificate.certificate_number}` +
            (certificate.award_rera_number ? `\n🏆 Award RERA Number: ${certificate.award_rera_number}` : '') +
            `\nThank you for your commitment and excellence!` +
            `\nwww.topsellingproperty.com`;

        // Check which formats are available and send accordingly
        const hasPdf = certificate.pdf_url && typeof certificate.pdf_url === 'string';
        const hasJpg = certificate.jpg_url && typeof certificate.jpg_url === 'string';
        
        let results = [];
        let lastError = null;

        // Send PDF if available
        if (hasPdf) {
            try {
                const pdfResult = await sendBulkWhatsApp(
            recipientNumber,
                    message,
            certificate.pdf_url,
                    `certificate_${certificate.certificate_number}.pdf`,
                    'pdf_certificate' // Use pdf_certificate template for PDF
                );

                if (pdfResult && pdfResult.success !== false) {
                    results.push({ format: 'pdf', success: true, data: pdfResult });
                } else {
                    throw new Error(pdfResult?.error || 'PDF send failed');
                }
            } catch (pdfError) {
                console.error('Error sending PDF certificate:', pdfError);
                lastError = pdfError.message || pdfError.toString();
                results.push({ format: 'pdf', success: false, error: lastError });
            }
        }

        // Send JPG if available
        if (hasJpg) {
            try {
                const jpgResult = await sendBulkWhatsApp(
                    recipientNumber,
                    message,
                    certificate.jpg_url,
                    `certificate_${certificate.certificate_number}.jpg`,
                    'image_certificate' // Use image_certificate template for JPG
                );

                if (jpgResult && jpgResult.success !== false) {
                    results.push({ format: 'jpg', success: true, data: jpgResult });
                } else {
                    throw new Error(jpgResult?.error || 'JPG send failed');
                }
            } catch (jpgError) {
                console.error('Error sending JPG certificate:', jpgError);
                lastError = jpgError.message || jpgError.toString();
                results.push({ format: 'jpg', success: false, error: lastError });
            }
        }

        // If no formats are available, send text-only
        if (!hasPdf && !hasJpg) {
            try {
                const textResult = await sendBulkWhatsApp(
                    recipientNumber,
                    message,
                    null, // No media
                    null,
                    'text_notification' // Use text_notification template for text-only
                );

                if (textResult && textResult.success !== false) {
                    results.push({ format: 'text', success: true, data: textResult });
                } else {
                    throw new Error(textResult?.error || 'Text send failed');
                }
            } catch (textError) {
                console.error('Error sending text notification:', textError);
                lastError = textError.message || textError.toString();
                results.push({ format: 'text', success: false, error: lastError });
            }
        }

        // Check if at least one message was sent successfully
        const successCount = results.filter(r => r.success).length;
        if (successCount > 0) {
            // Update WhatsApp status
            await db.collection('certificates').doc(id).update({
                whatsapp_sent: true,
                whatsapp_sent_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            });

            res.json({
                success: true,
                message: `Certificate sent via WhatsApp successfully (${successCount} message(s) sent)`,
                data: {
                    results: results,
                    sent: successCount,
                    total: results.length
                }
            });
        } else {
            // All attempts failed
            throw new Error(lastError || 'Failed to send certificate via WhatsApp');
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

        // Log the received message for debugging
        console.log('📥 Received campaign creation request:');
        console.log('   Type:', type);
        console.log('   Message length:', message?.length || 0);
        console.log('   Message has newlines:', message?.includes('\n') || false);
        console.log('   Message preview (first 100 chars):', message?.substring(0, 100) || '');
        console.log('   Full message:', JSON.stringify(message));

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

        // Log message before storing to verify it's complete
        console.log('💾 Storing campaign message:');
        console.log('   Message length:', message?.length || 0);
        console.log('   Message has newlines:', message?.includes('\n') || false);
        console.log('   Message (first 200 chars):', message?.substring(0, 200) || '');
        console.log('   Full message:', JSON.stringify(message));

        const campaignData = {
            id,
            type,
            subject: subject || null,
            message, // Store message as-is
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
        
        // Verify message was stored correctly
        const verifyDoc = await db.collection('marketing_campaigns').doc(id).get();
        const storedMessage = verifyDoc.data()?.message || '';
        console.log('✅ Verified stored message:');
        console.log('   Stored message length:', storedMessage?.length || 0);
        console.log('   Stored message has newlines:', storedMessage?.includes('\n') || false);
        console.log('   Stored message:', JSON.stringify(storedMessage));

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
            // Log original message before personalization for debugging
            if (contacts.indexOf(contact) === 0) { // Log only for first contact to avoid spam
                console.log(`📝 Processing message for campaign ${campaignId}:`);
                console.log(`   Original message length: ${message?.length || 0}`);
                console.log(`   Original message has newlines: ${message?.includes('\n') || false}`);
                console.log(`   Original message: ${JSON.stringify(message)}`);
            }

            // Personalize message with all supported placeholders
            // CRITICAL: Use a function that preserves the entire message structure
            const personalizeMessage = (text, contact) => {
                if (!text || typeof text !== 'string') return '';
                
                // Store original length for verification
                const originalLength = text.length;
                const originalHasNewlines = text.includes('\n');
                
                // Replace placeholders one by one, preserving all other content
                let result = text
                    .replace(/\{\{name\}\}/gi, contact.name || 'Valued Customer')
                    .replace(/\{\{certificate\}\}/gi, contact.certificate_number || contact.certificateNumber || '')
                    .replace(/\{\{rera\}\}/gi, contact.rera_awarde_no || contact.reraAwardeNo || '')
                    .replace(/\{\{professional\}\}/gi, contact.professional || '')
                    .replace(/\{\{email\}\}/gi, contact.email || '')
                    .replace(/\{\{phone\}\}/gi, contact.phone || '');
                
                // Verify the result preserves structure (should have same or more characters, same newlines)
                const resultHasNewlines = result.includes('\n');
                if (originalHasNewlines && !resultHasNewlines) {
                    console.error(`⚠️ WARNING: Newlines lost during personalization!`);
                    console.error(`   Original: ${JSON.stringify(text)}`);
                    console.error(`   Result: ${JSON.stringify(result)}`);
                }
                
                return result;
            };

            const personalizedMessage = personalizeMessage(message, contact);
            
            // Log personalized message for first contact
            if (contacts.indexOf(contact) === 0) {
                console.log(`   Personalized message length: ${personalizedMessage?.length || 0}`);
                console.log(`   Personalized message has newlines: ${personalizedMessage?.includes('\n') || false}`);
                console.log(`   Personalized message: ${JSON.stringify(personalizedMessage)}`);
                console.log(`   Personalized message (raw):`, personalizedMessage);
            }

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
                    // Determine which formats are requested
                    const formats = certificateAttachment?.formats || { pdf: false, jpg: false };
                    const wantsPdf = formats.pdf === true;
                    const wantsJpg = formats.jpg === true;
                    const hasCertificate = certificateAttachment && (wantsPdf || wantsJpg);

                    // Validate message is not empty after personalization (for text-only messages)
                    if (!hasCertificate) {
                        if (!personalizedMessage || typeof personalizedMessage !== 'string') {
                            console.warn(`Skipping WhatsApp message to ${contact.phone}: Message is null or invalid`);
                            failedCount++;
                            errors.push({ 
                                contactId: contact.id, 
                                contact: contact.phone, 
                                error: 'Message is invalid after personalization.' 
                            });
                            continue;
                        }
                        // Check if message has any non-whitespace content
                        const hasContent = personalizedMessage.replace(/\s/g, '').length > 0;
                        if (!hasContent) {
                            console.warn(`Skipping WhatsApp message to ${contact.phone}: Message is empty after personalization`);
                            failedCount++;
                            errors.push({ 
                                contactId: contact.id, 
                                contact: contact.phone, 
                                error: 'Message is empty after personalization. Please ensure your message has content after placeholders are replaced.' 
                            });
                            continue;
                        }
                    }

                    // Log the personalized message before sending to verify it's complete
                    if (contacts.indexOf(contact) === 0) {
                        console.log(`📤 Sending WhatsApp to ${contact.phone}`);
                        console.log(`   Formats: PDF=${wantsPdf}, JPG=${wantsJpg}, Text-only=${!hasCertificate}`);
                        console.log(`   Personalized message length: ${personalizedMessage?.length || 0}`);
                        console.log(`   Personalized message has newlines: ${personalizedMessage?.includes('\n') || false}`);
                    }

                    // CRITICAL: Ensure personalizedMessage is a string and preserve all content
                    const messageToSend = typeof personalizedMessage === 'string' ? personalizedMessage : String(personalizedMessage || '');

                    let messagesSent = 0;
                    let lastError = null;

                    // Send PDF certificate if requested
                    if (wantsPdf) {
                        try {
                            const pdfResult = await getOrCreateCertificateForContactWithFormat(contact, certificateAttachment, 'pdf');
                            if (pdfResult && pdfResult.url) {
                                console.log(`✅ PDF certificate generated for ${contact.name}: ${pdfResult.url}`);
                                
                                const result = await sendBulkWhatsApp(
                                    contact.phone, 
                                    messageToSend, 
                                    pdfResult.url, 
                                    pdfResult.filename, 
                                    'pdf_certificate' // Use pdf_certificate template
                                );

                    if (result && result.success !== false) {
                                    messagesSent++;
                                    console.log(`✅ PDF certificate sent to ${contact.phone}`);
                                } else {
                                    throw new Error(result?.error || 'PDF certificate send failed');
                                }
                            } else {
                                throw new Error('PDF certificate generation returned no URL');
                            }
                        } catch (pdfError) {
                            console.error(`Error sending PDF certificate to ${contact.phone}:`, pdfError);
                            lastError = pdfError.message || pdfError.toString();
                            errors.push({ 
                                contactId: contact.id, 
                                contact: contact.phone, 
                                error: `PDF certificate failed: ${lastError}` 
                            });
                        }
                    }

                    // Send JPG certificate if requested
                    if (wantsJpg) {
                        try {
                            const jpgResult = await getOrCreateCertificateForContactWithFormat(contact, certificateAttachment, 'jpg');
                            if (jpgResult && jpgResult.url) {
                                console.log(`✅ JPG certificate generated for ${contact.name}: ${jpgResult.url}`);
                                
                                const result = await sendBulkWhatsApp(
                                    contact.phone, 
                                    messageToSend, 
                                    jpgResult.url, 
                                    jpgResult.filename, 
                                    'image_certificate' // Use image_certificate template
                                );

                                if (result && result.success !== false) {
                                    messagesSent++;
                                    console.log(`✅ JPG certificate sent to ${contact.phone}`);
                                } else {
                                    throw new Error(result?.error || 'JPG certificate send failed');
                                }
                            } else {
                                throw new Error('JPG certificate generation returned no URL');
                            }
                        } catch (jpgError) {
                            console.error(`Error sending JPG certificate to ${contact.phone}:`, jpgError);
                            lastError = jpgError.message || jpgError.toString();
                            errors.push({ 
                                contactId: contact.id, 
                                contact: contact.phone, 
                                error: `JPG certificate failed: ${lastError}` 
                            });
                        }
                    }

                    // Send text-only message if no certificate is requested
                    if (!hasCertificate) {
                        try {
                            const result = await sendBulkWhatsApp(
                                contact.phone, 
                                messageToSend, 
                                null, // No media
                                null, 
                                'text_notification' // Use text_notification template
                            );

                            if (result && result.success !== false) {
                                messagesSent++;
                                console.log(`✅ Text notification sent to ${contact.phone}`);
                            } else {
                                throw new Error(result?.error || 'Text notification send failed');
                            }
                        } catch (textError) {
                            console.error(`Error sending text notification to ${contact.phone}:`, textError);
                            lastError = textError.message || textError.toString();
                            errors.push({ 
                                contactId: contact.id, 
                                contact: contact.phone, 
                                error: `Text notification failed: ${lastError}` 
                            });
                        }
                    }

                    // Update contact stats if at least one message was sent
                    if (messagesSent > 0) {
                        sentCount += messagesSent;

                        // Update contact stats
                        const contactRef = db.collection('marketing_contacts').doc(contact.id);
                        batch.update(contactRef, {
                            whatsapp_sent_count: FieldValue.increment(messagesSent),
                            last_contacted_at: FieldValue.serverTimestamp(),
                            last_contact_type: 'whatsapp'
                        });
                    } else {
                        // All messages failed
                        failedCount++;
                        throw new Error(lastError || 'All WhatsApp messages failed');
                    }
                } catch (error) {
                    console.error(`Failed to send WhatsApp to ${contact.phone}:`, error);
                    console.error(`Error stack:`, error.stack);
                    console.error(`Error details:`, {
                        message: error.message,
                        name: error.name,
                        contactId: contact.id,
                        contactPhone: contact.phone
                    });
                    // Error already added to errors array in individual try-catch blocks above
                    if (!errors.some(e => e.contactId === contact.id && e.contact === contact.phone)) {
                    failedCount++;
                    const errorMessage = error.message || error.toString() || 'Unknown error occurred';
                    errors.push({ contactId: contact.id, contact: contact.phone, error: errorMessage });
                    }
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

    // Get current campaign to check if this is a retry
    const campaignDoc = await db.collection('marketing_campaigns').doc(campaignId).get();
    const currentCampaign = campaignDoc.exists ? campaignDoc.data() : null;
    const isRetry = currentCampaign && currentCampaign.sent_count > 0;

    // For retries, add to existing counts; otherwise set new counts
    const finalSentCount = isRetry ? (currentCampaign.sent_count || 0) + sentCount : sentCount;
    const finalFailedCount = isRetry ? Math.max(0, (currentCampaign.failed_count || 0) - errors.length + failedCount) : failedCount;

    // Merge errors: remove retried contacts from errors, add new failures
    let finalErrors = errors;
    if (isRetry && currentCampaign.errors && Array.isArray(currentCampaign.errors)) {
        // Remove contacts that were retried (whether they succeeded or failed again)
        const retriedContactIds = new Set(contacts.map(c => c.id));
        const remainingErrors = currentCampaign.errors.filter(e => !retriedContactIds.has(e.contactId));
        // Add new failures
        finalErrors = [...remainingErrors, ...errors];
    }

    // Determine final status
    let finalStatus = campaignStatus;
    if (isRetry) {
        if (finalFailedCount === 0) {
            finalStatus = 'completed';
        } else if (finalSentCount > 0) {
            finalStatus = 'partial';
        } else {
            finalStatus = 'failed';
        }
    }

    // Update campaign status
    await db.collection('marketing_campaigns').doc(campaignId).update({
        status: finalStatus,
        sent_count: finalSentCount,
        failed_count: finalFailedCount,
        sent_at: finalSentCount > 0 ? FieldValue.serverTimestamp() : currentCampaign?.sent_at || null,
        updated_at: FieldValue.serverTimestamp(),
        errors: finalErrors.length > 0 ? finalErrors : FieldValue.delete()
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
            certificateAttachment,
            campaign.whatsapp_campaign
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
 * Retry failed messages from a campaign
 * Route: POST /marketing/campaigns/:id/retry
 */
app.post('/marketing/campaigns/:id/retry', async (req, res) => {
    console.log(`🔄 Retry endpoint called for campaign: ${req.params.id}`);
    try {
        const { id } = req.params;
        const doc = await db.collection('marketing_campaigns').doc(id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Campaign not found' });
        }

        const campaign = { id: doc.id, ...doc.data() };

        // Check if there are any failed messages to retry
        const failedCount = campaign.failed_count || campaign.failedCount || 0;
        if (failedCount === 0) {
            return res.status(400).json({ error: 'No failed messages to retry' });
        }

        // Get failed contact IDs from errors array
        const errors = campaign.errors || [];
        if (errors.length === 0) {
            return res.status(400).json({ error: 'No error details found. Cannot retry specific contacts.' });
        }

        const failedContactIds = errors
            .map(e => e.contactId)
            .filter(id => id); // Remove any null/undefined IDs

        if (failedContactIds.length === 0) {
            return res.status(400).json({ error: 'No valid contact IDs found in errors' });
        }

        console.log(`🔄 Retrying ${failedContactIds.length} failed messages for campaign ${id}`);

        // Fetch only the failed contacts
        const contactsPromises = failedContactIds.map(cid =>
            db.collection('marketing_contacts').doc(cid).get()
        );
        const contactDocs = await Promise.all(contactsPromises);
        const failedContacts = contactDocs
            .filter(d => d.exists)
            .map(d => ({ id: d.id, ...d.data() }));

        if (failedContacts.length === 0) {
            return res.status(400).json({ error: 'No valid contacts found for retry' });
        }

        const certificateAttachment = campaign.certificate_attachment || null;

        // Retry sending to failed contacts
        const result = await sendCampaignMessages(
            id,
            campaign.type,
            campaign.subject,
            campaign.message,
            failedContacts,
            certificateAttachment,
            campaign.whatsapp_campaign
        );

        // Update campaign with new results (add to existing counts)
        const updatedDoc = await db.collection('marketing_campaigns').doc(id).get();
        const updatedCampaign = { id: updatedDoc.id, ...updatedDoc.data() };

        res.json({
            success: true,
            message: `Retry completed. Sent ${result.sentCount} messages, ${result.failedCount} failed.`,
            data: {
                retryResults: result,
                campaign: {
                    id: updatedCampaign.id,
                    sent_count: updatedCampaign.sent_count || 0,
                    failed_count: updatedCampaign.failed_count || 0,
                    status: updatedCampaign.status
                }
            }
        });
    } catch (error) {
        console.error('Error retrying campaign:', error);
        res.status(500).json({ error: 'Failed to retry campaign', details: error.message });
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
 * Get or create a certificate for a contact with a specific format
 */
async function getOrCreateCertificateForContactWithFormat(contact, attachment, format = 'pdf') {
    // Create a modified attachment with only the requested format
    const modifiedAttachment = {
        ...attachment,
        formats: format === 'jpg' ? { pdf: false, jpg: true } : { pdf: true, jpg: false }
    };
    return getOrCreateCertificateForContact(contact, modifiedAttachment);
}

/**
 * Get or create a certificate for a contact
 */
async function getOrCreateCertificateForContact(contact, attachment) {
    const formats = attachment.formats || { pdf: true, jpg: false };
    // Prefer JPG for campaigns if requested (better for WhatsApp/Social)
    // If both formats are selected, prioritize JPG for WhatsApp
    const useJpg = formats.jpg === true;
    const extension = useJpg ? 'jpg' : 'pdf';

    // 1. If a specific certificate ID is provided, use that
    if (attachment.certificateId && attachment.certificateId !== 'default') {
        const certDoc = await db.collection('certificates').doc(attachment.certificateId).get();
        if (certDoc.exists) {
            const certData = certDoc.data();
            
            // If JPG is requested but doesn't exist, generate it
            if (useJpg && !certData.jpg_url) {
                console.log(`JPG requested but not found for certificate ${attachment.certificateId}, generating JPG version...`);
                
                // Generate JPG from the certificate data
                const certificateData = {
                    recipient_name: certData.recipient_name || contact.name || 'Recipient',
                    certificate_number: certData.certificate_number || `CERT-${Date.now()}`,
                    award_rera_number: certData.award_rera_number || contact.rera_awarde_no || contact.reraAwardeNo || null,
                    professional: certData.professional || contact.professional || null,
                    phone_number: certData.phone_number || contact.phone || null,
                    email: certData.email || contact.email || null
                };

                // Get template URL
                let templateUrl = null;
                try {
                    const defaultTemplateSnapshot = await db.collection('certificate_templates')
                        .where('is_default', '==', true)
                        .limit(1)
                        .get();
                    
                    if (!defaultTemplateSnapshot.empty) {
                        templateUrl = defaultTemplateSnapshot.docs[0].data().url;
                    } else {
                        const templateDoc = await db.collection('certificate_settings').doc('template').get();
                        if (templateDoc.exists && templateDoc.data().url) {
                            templateUrl = templateDoc.data().url;
                        }
                    }
                } catch (error) {
                    console.warn('Could not fetch certificate template:', error.message);
                }

                // Generate JPG (generateCertificateImage is already imported at the top)
                const jpgBuffer = await generateCertificateImage(certificateData, templateUrl);

                // Upload JPG to storage
                const bucket = await getStorageBucket();
                const jpgFile = bucket.file(`certificates/${certDoc.id}.jpg`);
                await jpgFile.save(jpgBuffer, {
                    metadata: {
                        contentType: 'image/jpeg',
                    }
                });
                await jpgFile.makePublic();
                const jpgUrl = `https://storage.googleapis.com/${bucket.name}/certificates/${certDoc.id}.jpg`;

                // Update certificate document with JPG URL
                await certDoc.ref.update({ jpg_url: jpgUrl });

                return {
                    url: jpgUrl,
                    filename: `certificate_${certData.certificate_number || certDoc.id}.jpg`
                };
            }
            
            // Use existing URL (JPG if available and requested, otherwise PDF)
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
    // Try to get default template from certificate_templates first
    let templateUrl = null;
    try {
        const defaultTemplateSnapshot = await db.collection('certificate_templates')
            .where('is_default', '==', true)
            .limit(1)
            .get();
        
        if (!defaultTemplateSnapshot.empty) {
            templateUrl = defaultTemplateSnapshot.docs[0].data().url;
        } else {
            // Fallback to legacy single template
            const templateDoc = await db.collection('certificate_settings').doc('template').get();
            if (templateDoc.exists && templateDoc.data().url) {
                templateUrl = templateDoc.data().url;
            }
        }
    } catch (error) {
        console.warn('Could not fetch certificate template, using default:', error.message);
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
 * Upload certificate template (supports multiple templates)
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

        const { image, filename, contentType, templateName, templateId } = req.body;

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

        // Generate template ID if not provided
        const finalTemplateId = templateId || uuidv4();
        const finalTemplateName = templateName || filename || `Template ${Date.now()}`;
        
        // Use template ID in storage path to support multiple templates
        const storageFileName = `certificate-templates/${finalTemplateId}.${fileExtension}`;

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
            templateId: finalTemplateId,
            templateName: finalTemplateName,
            fileSize: imageBuffer.length,
            contentType: contentType || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`
        });

        // Delete existing template file if it exists (for updates)
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

        // Save template info to Firestore in certificate_templates collection
        try {
            const templateData = {
                id: finalTemplateId,
                name: finalTemplateName,
                url: publicUrl,
                filename: filename || `template.${fileExtension}`,
                contentType: contentType || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
                storage_path: storageFileName,
                bucket_name: bucket.name,
                is_default: false, // Can be set to true for default template
                uploaded_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            };

            // Save to certificate_templates collection
            await db.collection('certificate_templates').doc(finalTemplateId).set(templateData, { merge: true });
            console.log('Template info saved to Firestore successfully');
            
            // Also update the legacy single template for backward compatibility
            await db.collection('certificate_settings').doc('template').set({
                url: publicUrl,
                filename: filename || `template.${fileExtension}`,
                contentType: contentType || `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`,
                storage_path: storageFileName,
                bucket_name: bucket.name,
                uploaded_at: FieldValue.serverTimestamp(),
                updated_at: FieldValue.serverTimestamp()
            }, { merge: true });
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
                id: finalTemplateId,
                name: finalTemplateName,
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
 * Get all certificate templates
 */
app.get('/certificates/templates', async (req, res) => {
    try {
        const templatesSnapshot = await db.collection('certificate_templates')
            .orderBy('uploaded_at', 'desc')
            .get();

        const templates = [];
        templatesSnapshot.forEach(doc => {
            templates.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json({
            success: true,
            data: templates,
            count: templates.length
        });
    } catch (error) {
        console.error('Error fetching certificate templates:', error);
        res.status(500).json({
            error: 'Failed to fetch certificate templates',
            details: error.message
        });
    }
});

/**
 * Get certificate template by ID (or get default/active template)
 */
app.get('/certificates/template', async (req, res) => {
    try {
        const { id } = req.query;
        
        // If ID is provided, get specific template
        if (id) {
            const doc = await db.collection('certificate_templates').doc(id).get();
            
            if (!doc.exists) {
                return res.status(404).json({
                    success: false,
                    error: 'Template not found',
                    message: `Template with ID ${id} does not exist`
                });
            }

            return res.json({
                success: true,
                data: {
                    id: doc.id,
                    ...doc.data()
                }
            });
        }
        
        // Otherwise, get default template (for backward compatibility)
        // First try to get default from certificate_templates
        const defaultTemplateSnapshot = await db.collection('certificate_templates')
            .where('is_default', '==', true)
            .limit(1)
            .get();
        
        if (!defaultTemplateSnapshot.empty) {
            const defaultDoc = defaultTemplateSnapshot.docs[0];
            return res.json({
                success: true,
                data: {
                    id: defaultDoc.id,
                    ...defaultDoc.data()
                }
            });
        }
        
        // Fallback to legacy single template
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
 * Check phone number status in AiSensy
 * POST /test/whatsapp/check-number
 * Body: { phone_number: "7500988212" }
 */
app.post('/test/whatsapp/check-number', async (req, res) => {
    try {
        const { phone_number } = req.body;

        if (!phone_number) {
            return res.status(400).json({ error: 'phone_number is required' });
        }

        if (!isWhatsAppConfigured()) {
            return res.status(503).json({
                error: 'WhatsApp service is not configured',
                configured: false
            });
        }

        const { formatPhoneNumber } = require('./utils/whatsappService');
        const formattedNumber = formatPhoneNumber(phone_number);

        // Try to send a minimal test message to check number status
        const { sendBulkWhatsApp } = require('./utils/whatsappService');
        
        try {
            const result = await sendBulkWhatsApp(
                phone_number,
                'Test message to check number status',
                null, // No media
                null,
                'pdf_certificate'
            );

            res.json({
                success: true,
                message: 'Number appears to be valid and opted-in',
                data: {
                    formatted_number: formattedNumber,
                    test_result: result
                }
            });
        } catch (error) {
            // Capture detailed error information
            const errorMessage = error.message || error.toString();
            
            res.status(400).json({
                success: false,
                message: 'Number check failed',
                data: {
                    formatted_number: formattedNumber,
                    error: errorMessage,
                    error_type: errorMessage.includes('rate limit') ? 'rate_limit' :
                              errorMessage.includes('opted-in') ? 'opt_in_required' :
                              errorMessage.includes('healthy ecosystem') ? 'ecosystem_restriction' :
                              'unknown',
                    recommendations: errorMessage.includes('rate limit') ? 
                        ['Wait 15-30 minutes', 'Add number to AiSensy as test number'] :
                        errorMessage.includes('opted-in') ?
                        ['Add number to AiSensy Dashboard > Contacts', 'Mark as Opted-In', 'Verify number is whitelisted'] :
                        ['Check AiSensy dashboard for number status', 'Verify number is not blocked', 'Contact AiSensy support']
                }
            });
        }
    } catch (error) {
        console.error('Error checking phone number:', error);
        res.status(500).json({
            error: 'Failed to check phone number',
            details: error.message
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

/**
 * Webhook endpoint for property listings to social media
 * POST /api/webhooks/social-media
 * 
 * Expected payload:
 * {
 *   "type": "property_listing",
 *   "property": {
 *     "id": "property_123",
 *     "title": "Luxury 3BHK Apartment",
 *     "location": "Mumbai, Maharashtra",
 *     "price": "₹2.5 Crores",
 *     "area": "1500 sq ft",
 *     "bedrooms": 3,
 *     "bathrooms": 2,
 *     "description": "Beautiful apartment with modern amenities",
 *     "imageUrl": "https://example.com/property-image.jpg",
 *     "propertyUrl": "https://example.com/property/123",
 *     "reraNumber": "RERA/123/2024" (optional),
 *     "amenities": ["Parking", "Gym", "Swimming Pool"] (optional)
 *   },
 *   "platforms": ["facebook", "twitter", "instagram", "linkedin", "whatsapp"], // Optional, defaults to all
 *   "postImmediately": true, // Optional, defaults to false (scheduled)
 *   "scheduledAt": "2024-01-20T10:00:00Z" // Optional, if postImmediately is false
 * }
 */
app.post('/api/webhooks/social-media', async (req, res) => {
    try {
        const { type, property, platforms, postImmediately, scheduledAt, webhookSecret } = req.body;

        // Verify webhook secret (optional but recommended)
        const expectedSecret = functions.config().webhook?.secret;
        if (expectedSecret && webhookSecret !== expectedSecret) {
            return res.status(401).json({ 
                error: 'Invalid webhook secret',
                message: 'Webhook authentication failed'
            });
        }

        // Validate request
        if (!type || type !== 'property_listing') {
            return res.status(400).json({ 
                error: 'Invalid type',
                message: 'Expected type: "property_listing"'
            });
        }

        if (!property) {
            return res.status(400).json({ 
                error: 'Property data required',
                message: 'Property object is required in the request body'
            });
        }

        // Validate required property fields
        const requiredFields = ['title', 'location', 'price'];
        const missingFields = requiredFields.filter(field => !property[field]);
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                message: `Missing fields: ${missingFields.join(', ')}`,
                missingFields
            });
        }

        // Format property data into social media post content
        const postContent = formatPropertyPost(property);
        
        // Determine platforms (default to all if not specified)
        const targetPlatforms = platforms && Array.isArray(platforms) && platforms.length > 0 
            ? platforms 
            : ['facebook', 'twitter', 'instagram', 'linkedin', 'whatsapp'];

        // Determine posting time
        const shouldPostNow = postImmediately === true;
        const postTime = shouldPostNow 
            ? new Date().toISOString() 
            : (scheduledAt || new Date(Date.now() + 3600000).toISOString()); // Default to 1 hour from now

        // Create social media post
        const postId = uuidv4();
        const postData = {
            id: postId,
            content: postContent,
            platforms: targetPlatforms,
            scheduledDate: postTime,
            publishedDate: shouldPostNow ? postTime : null,
            status: shouldPostNow ? 'published' : 'scheduled',
            image: property.imageUrl || null,
            source: 'webhook',
            webhookId: `wh_${Date.now()}`,
            receivedAt: new Date().toISOString(),
            propertyData: {
                propertyId: property.id,
                title: property.title,
                location: property.location,
                price: property.price,
                propertyUrl: property.propertyUrl || null
            },
            insights: null
        };

        // Save to Firestore with proper field names
        await db.collection('social_media_posts').doc(postId).set({
            content: postData.content,
            platforms: postData.platforms,
            scheduled_date: postData.scheduledDate,
            published_date: postData.publishedDate,
            status: postData.status,
            image: postData.image,
            image_url: postData.image,
            source: postData.source,
            webhook_id: postData.webhookId,
            received_at: postData.receivedAt,
            property_data: postData.propertyData,
            insights: postData.insights,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        });

        // If posting immediately, trigger social media posting
        if (shouldPostNow) {
            // TODO: Implement actual social media posting logic here
            // This would call the respective platform APIs
            console.log(`[Webhook] Posting property listing to platforms: ${targetPlatforms.join(', ')}`);
        }

        console.log(`[Webhook] Property listing received and processed: ${property.title}`);

        res.status(200).json({
            success: true,
            message: shouldPostNow ? 'Property posted to social media' : 'Property scheduled for posting',
            postId: postId,
            post: postData
        });

    } catch (error) {
        console.error('[Webhook Error]', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message,
            details: error.stack
        });
    }
});

/**
 * Format property data into social media post content
 */
function formatPropertyPost(property) {
    const {
        title,
        location,
        price,
        area,
        bedrooms,
        bathrooms,
        description,
        propertyUrl,
        reraNumber,
        amenities
    } = property;

    // Base post content
    let post = `🏠 NEW PROPERTY LISTING\n\n`;
    post += `📍 ${title}\n`;
    post += `📍 Location: ${location}\n`;
    post += `💰 Price: ${price}\n`;

    if (area) {
        post += `📐 Area: ${area}\n`;
    }

    if (bedrooms || bathrooms) {
        const bedBath = [];
        if (bedrooms) bedBath.push(`${bedrooms} BHK`);
        if (bathrooms) bedBath.push(`${bathrooms} Bath`);
        if (bedBath.length > 0) {
            post += `🛏️ ${bedBath.join(' | ')}\n`;
        }
    }

    if (description) {
        post += `\n${description}\n`;
    }

    if (amenities && Array.isArray(amenities) && amenities.length > 0) {
        post += `\n✨ Amenities: ${amenities.slice(0, 5).join(', ')}`;
        if (amenities.length > 5) {
            post += ` +${amenities.length - 5} more`;
        }
        post += `\n`;
    }

    if (reraNumber) {
        post += `\n🏆 RERA: ${reraNumber}\n`;
    }

    post += `\n🔗 View Details: ${propertyUrl || 'Contact us for more information'}\n`;

    // Add hashtags
    const hashtags = [
        '#RealEstate',
        '#PropertyListing',
        '#NewListing',
        location ? `#${location.replace(/\s+/g, '')}` : null,
        '#PropertyForSale',
        '#RealEstateInvestment'
    ].filter(Boolean).join(' ');

    post += `\n${hashtags}`;

    return post;
}

/**
 * Social Media Posts API Endpoints
 */

/**
 * Get all social media posts
 * GET /api/social-media/posts
 */
app.get('/api/social-media/posts', async (req, res) => {
    try {
        const { platform, status, source } = req.query;
        
        let query = db.collection('social_media_posts');

        if (platform && platform !== 'all') {
            query = query.where('platforms', 'array-contains', platform);
        }

        if (status && status !== 'all') {
            query = query.where('status', '==', status);
        }

        if (source) {
            query = query.where('source', '==', source);
        }

        query = query.orderBy('created_at', 'desc');

        const snapshot = await query.get();
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({ success: true, data: posts });
    } catch (error) {
        console.error('[Social Media API] Error fetching posts:', error);
        res.status(500).json({ 
            error: 'Failed to fetch posts',
            message: error.message 
        });
    }
});

/**
 * Get post by ID
 * GET /api/social-media/posts/:id
 */
app.get('/api/social-media/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('social_media_posts').doc(id).get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Post not found' });
        }

        res.json({ 
            success: true, 
            data: { id: doc.id, ...doc.data() } 
        });
    } catch (error) {
        console.error('[Social Media API] Error fetching post:', error);
        res.status(500).json({ 
            error: 'Failed to fetch post',
            message: error.message 
        });
    }
});

/**
 * Create a new post
 * POST /api/social-media/posts
 */
app.post('/api/social-media/posts', async (req, res) => {
    try {
        const { content, platforms, scheduledAt, imageUrl, postImmediately } = req.body;

        if (!content || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
            return res.status(400).json({ 
                error: 'Content and platforms are required' 
            });
        }

        const postId = uuidv4();
        const postTime = postImmediately 
            ? new Date().toISOString() 
            : (scheduledAt || new Date(Date.now() + 3600000).toISOString());

        const postData = {
            content,
            platforms,
            scheduled_date: postTime,
            published_date: postImmediately ? postTime : null,
            status: postImmediately ? 'published' : 'scheduled',
            image: imageUrl || null,
            image_url: imageUrl || null,
            source: 'manual',
            insights: null,
            created_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        };

        await db.collection('social_media_posts').doc(postId).set(postData);

        res.status(201).json({
            success: true,
            message: postImmediately ? 'Post published successfully' : 'Post scheduled successfully',
            data: { id: postId, ...postData }
        });
    } catch (error) {
        console.error('[Social Media API] Error creating post:', error);
        res.status(500).json({ 
            error: 'Failed to create post',
            message: error.message 
        });
    }
});

/**
 * Update a post
 * PUT /api/social-media/posts/:id
 */
app.put('/api/social-media/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Convert frontend field names to Firestore field names
        const firestoreUpdates = {};
        if (updates.content) firestoreUpdates.content = updates.content;
        if (updates.platforms) firestoreUpdates.platforms = updates.platforms;
        if (updates.scheduledDate) firestoreUpdates.scheduled_date = updates.scheduledDate;
        if (updates.publishedDate) firestoreUpdates.published_date = updates.publishedDate;
        if (updates.status) firestoreUpdates.status = updates.status;
        if (updates.image !== undefined) {
            firestoreUpdates.image = updates.image;
            firestoreUpdates.image_url = updates.image;
        }
        if (updates.insights) firestoreUpdates.insights = updates.insights;
        
        firestoreUpdates.updated_at = FieldValue.serverTimestamp();

        await db.collection('social_media_posts').doc(id).update(firestoreUpdates);

        res.json({
            success: true,
            message: 'Post updated successfully',
            data: { id, ...updates }
        });
    } catch (error) {
        console.error('[Social Media API] Error updating post:', error);
        res.status(500).json({ 
            error: 'Failed to update post',
            message: error.message 
        });
    }
});

/**
 * Delete a post
 * DELETE /api/social-media/posts/:id
 */
app.delete('/api/social-media/posts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection('social_media_posts').doc(id).delete();

        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
    } catch (error) {
        console.error('[Social Media API] Error deleting post:', error);
        res.status(500).json({ 
            error: 'Failed to delete post',
            message: error.message 
        });
    }
});

/**
 * Bulk delete posts
 * POST /api/social-media/posts/bulk-delete
 */
app.post('/api/social-media/posts/bulk-delete', async (req, res) => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'Post IDs array is required' });
        }

        const batch = db.batch();
        ids.forEach(id => {
            const docRef = db.collection('social_media_posts').doc(id);
            batch.delete(docRef);
        });

        await batch.commit();

        res.json({
            success: true,
            message: `${ids.length} post(s) deleted successfully`,
            deleted: ids.length
        });
    } catch (error) {
        console.error('[Social Media API] Error bulk deleting posts:', error);
        res.status(500).json({ 
            error: 'Failed to delete posts',
            message: error.message 
        });
    }
});

/**
 * Update post status
 * PATCH /api/social-media/posts/:id/status
 */
app.patch('/api/social-media/posts/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !['scheduled', 'published', 'paused', 'failed'].includes(status)) {
            return res.status(400).json({ error: 'Valid status is required' });
        }

        await db.collection('social_media_posts').doc(id).update({
            status,
            updated_at: FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Post status updated successfully',
            data: { id, status }
        });
    } catch (error) {
        console.error('[Social Media API] Error updating post status:', error);
        res.status(500).json({ 
            error: 'Failed to update post status',
            message: error.message 
        });
    }
});

/**
 * Get post insights
 * GET /api/social-media/posts/:id/insights
 */
app.get('/api/social-media/posts/:id/insights', async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection('social_media_posts').doc(id).get();
        
        if (!doc.exists) {
            return res.status(404).json({ error: 'Post not found' });
        }

        const postData = doc.data();
        const insights = postData.insights || null;

        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        console.error('[Social Media API] Error fetching insights:', error);
        res.status(500).json({ 
            error: 'Failed to fetch insights',
            message: error.message 
        });
    }
});

/**
 * Get aggregated insights
 * GET /api/social-media/insights
 */
app.get('/api/social-media/insights', async (req, res) => {
    try {
        const { platform, startDate, endDate } = req.query;
        
        let query = db.collection('social_media_posts');

        if (platform && platform !== 'all') {
            query = query.where('platforms', 'array-contains', platform);
        }

        const snapshot = await query.get();
        const posts = snapshot.docs.map(doc => doc.data());

        // Calculate aggregated insights
        const insights = {
            totalPosts: posts.length,
            totalReach: 0,
            totalEngagement: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            platformStats: {
                facebook: { posts: 0, reach: 0, engagement: 0 },
                twitter: { posts: 0, reach: 0, engagement: 0 },
                instagram: { posts: 0, reach: 0, engagement: 0 },
                linkedin: { posts: 0, reach: 0, engagement: 0 },
                whatsapp: { posts: 0, reach: 0, engagement: 0 },
                youtube: { posts: 0, reach: 0, engagement: 0 }
            }
        };

        posts.forEach(post => {
            if (post.insights) {
                insights.totalReach += post.insights.reach || 0;
                insights.totalEngagement += post.insights.engagement || 0;
                insights.totalLikes += post.insights.likes || 0;
                insights.totalComments += post.insights.comments || 0;
                insights.totalShares += post.insights.shares || 0;
            }

            if (post.platforms) {
                post.platforms.forEach(platformId => {
                    if (insights.platformStats[platformId]) {
                        insights.platformStats[platformId].posts += 1;
                        if (post.insights) {
                            insights.platformStats[platformId].reach += post.insights.reach || 0;
                            insights.platformStats[platformId].engagement += post.insights.engagement || 0;
                        }
                    }
                });
            }
        });

        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        console.error('[Social Media API] Error fetching insights:', error);
        res.status(500).json({ 
            error: 'Failed to fetch insights',
            message: error.message 
        });
    }
});

/**
 * Get platform statistics
 * GET /api/social-media/stats
 */
app.get('/api/social-media/stats', async (req, res) => {
    try {
        const snapshot = await db.collection('social_media_posts').get();
        const posts = snapshot.docs.map(doc => doc.data());

        const stats = {
            total: posts.length,
            published: posts.filter(p => p.status === 'published').length,
            scheduled: posts.filter(p => p.status === 'scheduled').length,
            paused: posts.filter(p => p.status === 'paused').length,
            failed: posts.filter(p => p.status === 'failed').length,
            webhook: posts.filter(p => p.source === 'webhook').length,
            manual: posts.filter(p => p.source === 'manual' || !p.source).length,
            byPlatform: {
                facebook: posts.filter(p => p.platforms?.includes('facebook')).length,
                twitter: posts.filter(p => p.platforms?.includes('twitter')).length,
                instagram: posts.filter(p => p.platforms?.includes('instagram')).length,
                linkedin: posts.filter(p => p.platforms?.includes('linkedin')).length,
                whatsapp: posts.filter(p => p.platforms?.includes('whatsapp')).length,
                youtube: posts.filter(p => p.platforms?.includes('youtube')).length
            }
        };

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('[Social Media API] Error fetching stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch stats',
            message: error.message 
        });
    }
});

// Export the Express app as a Cloud Function
exports.api = functions.runWith({
    timeoutSeconds: 300,
    memory: '1GB'
}).https.onRequest(app);
