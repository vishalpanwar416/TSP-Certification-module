import { v4 as uuidv4 } from 'uuid';
import Certificate from '../models/Certificate.js';
import { generateCertificatePDF } from '../utils/pdfGenerator.js';
import { sendCertificateLinkViaWhatsApp, isWhatsAppConfigured } from '../utils/whatsappService.js';
import { sendCertificateViaEmail, isEmailConfigured } from '../utils/emailService.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a new certificate
 */
export const createCertificate = async (req, res) => {
    try {
        const {
            recipient_name,
            certificate_number,
            award_rera_number,
            description,
            phone_number,
            email
        } = req.body;

        // Validate required fields
        if (!recipient_name || !certificate_number) {
            return res.status(400).json({
                error: 'Recipient name and certificate number are required'
            });
        }

        // Check if certificate number already exists
        const existing = Certificate.findByCertificateNumber(certificate_number);
        if (existing) {
            return res.status(409).json({
                error: 'Certificate number already exists'
            });
        }

        // Generate unique ID
        const id = uuidv4();

        // Create certificate data
        const certificateData = {
            id,
            recipient_name,
            certificate_number,
            award_rera_number,
            description,
            phone_number,
            email
        };

        // Generate PDF
        const pdfResult = await generateCertificatePDF(certificateData);

        // Save to database
        certificateData.pdf_path = pdfResult.path;
        const certificate = Certificate.create(certificateData);

        res.status(201).json({
            success: true,
            message: 'Certificate created successfully',
            data: certificate
        });
    } catch (error) {
        console.error('Error creating certificate:', error);
        res.status(500).json({
            error: 'Failed to create certificate',
            details: error.message
        });
    }
};

/**
 * Get all certificates
 */
export const getAllCertificates = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const certificates = Certificate.findAll(limit, offset);
        const total = Certificate.count();

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
};

/**
 * Get certificate by ID
 */
export const getCertificateById = async (req, res) => {
    try {
        const { id } = req.params;
        const certificate = Certificate.findById(id);

        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        res.json({
            success: true,
            data: certificate
        });
    } catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({
            error: 'Failed to fetch certificate',
            details: error.message
        });
    }
};

/**
 * Update certificate
 */
export const updateCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const certificate = Certificate.findById(id);
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const updated = Certificate.update(id, updates);

        res.json({
            success: true,
            message: 'Certificate updated successfully',
            data: updated
        });
    } catch (error) {
        console.error('Error updating certificate:', error);
        res.status(500).json({
            error: 'Failed to update certificate',
            details: error.message
        });
    }
};

/**
 * Delete certificate
 */
export const deleteCertificate = async (req, res) => {
    try {
        const { id } = req.params;

        const certificate = Certificate.findById(id);
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const deleted = Certificate.delete(id);

        if (deleted) {
            res.json({
                success: true,
                message: 'Certificate deleted successfully'
            });
        } else {
            res.status(500).json({ error: 'Failed to delete certificate' });
        }
    } catch (error) {
        console.error('Error deleting certificate:', error);
        res.status(500).json({
            error: 'Failed to delete certificate',
            details: error.message
        });
    }
};

/**
 * Send certificate via WhatsApp
 */
export const sendCertificateWhatsApp = async (req, res) => {
    try {
        const { id } = req.params;
        const { phone_number } = req.body;

        // Check if WhatsApp is configured
        if (!isWhatsAppConfigured()) {
            return res.status(503).json({
                error: 'WhatsApp service is not configured. Please set up Twilio credentials in .env file.',
                configured: false
            });
        }

        const certificate = Certificate.findById(id);
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const recipientNumber = phone_number || certificate.phone_number;
        if (!recipientNumber) {
            return res.status(400).json({
                error: 'Phone number is required'
            });
        }

        // Generate public URL for the certificate
        const certificateUrl = `${req.protocol}://${req.get('host')}/certificates/${id}.pdf`;

        // Send via WhatsApp
        const result = await sendCertificateLinkViaWhatsApp(
            recipientNumber,
            certificateUrl,
            certificate
        );

        // Update WhatsApp status
        Certificate.updateWhatsAppStatus(id, true);

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
};

/**
 * Get certificate statistics
 */
export const getCertificateStats = async (req, res) => {
    try {
        const stats = Certificate.getStats();

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
};

/**
 * Download certificate PDF
 */
export const downloadCertificate = async (req, res) => {
    try {
        const { id } = req.params;

        const certificate = Certificate.findById(id);
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        if (!certificate.pdf_path) {
            return res.status(404).json({ error: 'PDF file not found' });
        }

        res.download(certificate.pdf_path, `certificate_${certificate.certificate_number}.pdf`);
    } catch (error) {
        console.error('Error downloading certificate:', error);
        res.status(500).json({
            error: 'Failed to download certificate',
            details: error.message
        });
    }
};

/**
 * Send certificate via Email
 */
export const sendCertificateEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;

        // Check if Email is configured
        if (!isEmailConfigured()) {
            return res.status(503).json({
                error: 'Email service is not configured. Please set up email credentials in .env file.',
                configured: false
            });
        }

        const certificate = Certificate.findById(id);
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }

        const recipientEmail = email || certificate.email;
        if (!recipientEmail) {
            return res.status(400).json({
                error: 'Email address is required'
            });
        }

        // Send via Email
        const result = await sendCertificateViaEmail(
            recipientEmail,
            certificate.pdf_path,
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
};

export default {
    createCertificate,
    getAllCertificates,
    getCertificateById,
    updateCertificate,
    deleteCertificate,
    sendCertificateWhatsApp,
    sendCertificateEmail,
    getCertificateStats,
    downloadCertificate
};
