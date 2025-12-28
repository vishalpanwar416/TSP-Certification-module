import express from 'express';
import {
    createCertificate,
    getAllCertificates,
    getCertificateById,
    updateCertificate,
    deleteCertificate,
    sendCertificateWhatsApp,
    sendCertificateEmail,
    getCertificateStats,
    downloadCertificate
} from '../controllers/certificateController.js';

const router = express.Router();

// Certificate CRUD routes
router.post('/', createCertificate);
router.get('/', getAllCertificates);
router.get('/stats', getCertificateStats);
router.get('/:id', getCertificateById);
router.put('/:id', updateCertificate);
router.patch('/:id', updateCertificate);
router.delete('/:id', deleteCertificate);

// Certificate actions
router.post('/:id/send-whatsapp', sendCertificateWhatsApp);
router.post('/:id/send-email', sendCertificateEmail);
router.get('/:id/download', downloadCertificate);

export default router;
