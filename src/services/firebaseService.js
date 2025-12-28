// Firebase Firestore service for certificates
import { getFirestore, collection, doc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { app } from '../config/firebase';

// Initialize Firestore
const db = getFirestore(app);
const CERTIFICATES_COLLECTION = 'certificates';

// Generate unique certificate number
const generateCertificateNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TSP-${timestamp}-${random}`;
};

// Certificate API using Firestore
export const certificateAPI = {
    // Get all certificates
    getAll: async () => {
        try {
            const certificatesRef = collection(db, CERTIFICATES_COLLECTION);
            const q = query(certificatesRef, orderBy('created_at', 'desc'));
            const snapshot = await getDocs(q);
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate?.()?.toISOString() || doc.data().created_at
            }));
        } catch (error) {
            console.error('Error fetching certificates:', error);
            throw error;
        }
    },

    // Get certificate by ID
    getById: async (id) => {
        try {
            const docRef = doc(db, CERTIFICATES_COLLECTION, id);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                throw new Error('Certificate not found');
            }
            
            return {
                id: docSnap.id,
                ...docSnap.data(),
                created_at: docSnap.data().created_at?.toDate?.()?.toISOString() || docSnap.data().created_at
            };
        } catch (error) {
            console.error('Error fetching certificate:', error);
            throw error;
        }
    },

    // Create new certificate
    create: async (data) => {
        try {
            const certificateData = {
                recipient_name: data.recipient_name || data.recipientName,
                certificate_number: data.certificate_number || generateCertificateNumber(),
                phone_number: data.phone_number || data.phoneNumber || '',
                description: data.description || '',
                award_rera_number: data.award_rera_number || data.awardReraNumber || '',
                whatsapp_sent: false,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, CERTIFICATES_COLLECTION), certificateData);
            
            return {
                id: docRef.id,
                ...certificateData,
                created_at: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error creating certificate:', error);
            throw error;
        }
    },

    // Update certificate
    update: async (id, data) => {
        try {
            const docRef = doc(db, CERTIFICATES_COLLECTION, id);
            await updateDoc(docRef, {
                ...data,
                updated_at: serverTimestamp()
            });
            
            return { success: true };
        } catch (error) {
            console.error('Error updating certificate:', error);
            throw error;
        }
    },

    // Delete certificate
    delete: async (id) => {
        try {
            const docRef = doc(db, CERTIFICATES_COLLECTION, id);
            await deleteDoc(docRef);
            
            return { success: true };
        } catch (error) {
            console.error('Error deleting certificate:', error);
            throw error;
        }
    },

    // Mark as sent via WhatsApp (update status only)
    sendWhatsApp: async (id, phoneNumber) => {
        try {
            const docRef = doc(db, CERTIFICATES_COLLECTION, id);
            await updateDoc(docRef, {
                whatsapp_sent: true,
                phone_number: phoneNumber,
                whatsapp_sent_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });
            
            return { success: true, message: 'Certificate marked as sent' };
        } catch (error) {
            console.error('Error updating WhatsApp status:', error);
            throw error;
        }
    },

    // Download URL (placeholder - certificates are stored as data, not files)
    downloadUrl: (id) => {
        // Since we're not storing PDFs, return null
        // You can implement PDF generation on the client side if needed
        return null;
    },

    // Get PDF URL (placeholder)
    getPdfUrl: (id) => {
        return null;
    },

    // Get statistics
    getStats: async () => {
        try {
            const certificatesRef = collection(db, CERTIFICATES_COLLECTION);
            const snapshot = await getDocs(certificatesRef);
            
            let total = 0;
            let whatsapp_sent = 0;
            let pending = 0;
            
            snapshot.docs.forEach(doc => {
                total++;
                const data = doc.data();
                if (data.whatsapp_sent) {
                    whatsapp_sent++;
                } else {
                    pending++;
                }
            });
            
            return { total, whatsapp_sent, pending };
        } catch (error) {
            console.error('Error fetching stats:', error);
            return { total: 0, whatsapp_sent: 0, pending: 0 };
        }
    },
};

// Health check (always returns success for Firebase)
export const healthCheck = async () => {
    return { status: 'ok', source: 'firebase' };
};

export default certificateAPI;
