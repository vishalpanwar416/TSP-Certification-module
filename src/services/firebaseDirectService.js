/**
 * Firebase Direct Service
 * 
 * This service provides direct access to Firestore from the frontend.
 * No Cloud Functions required - works on the free Spark plan!
 */

import { db } from '../config/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';

// Collection names
const COLLECTIONS = {
    CONTACTS: 'marketing_contacts',
    CAMPAIGNS: 'marketing_campaigns',
    TEMPLATES: 'marketing_templates'
};

/**
 * Contacts Service - Direct Firestore Access
 */
export const contactsService = {
    /**
     * Get all contacts
     */
    async getAll() {
        try {
            // Simple query without orderBy to avoid index requirements
            const querySnapshot = await getDocs(collection(db, COLLECTIONS.CONTACTS));
            const contacts = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort client-side by created_at (newest first)
            return contacts.sort((a, b) => {
                const dateA = a.created_at?.toDate?.() || new Date(0);
                const dateB = b.created_at?.toDate?.() || new Date(0);
                return dateB - dateA;
            });
        } catch (error) {
            console.error('Error fetching contacts:', error);
            throw error;
        }
    },

    /**
     * Get a single contact by ID
     */
    async getById(id) {
        try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.CONTACTS, id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Error fetching contact:', error);
            throw error;
        }
    },

    /**
     * Create a new contact
     */
    async create(contactData) {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.CONTACTS), {
                ...contactData,
                email_sent_count: 0,
                whatsapp_sent_count: 0,
                last_contacted_at: null,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });
            return { id: docRef.id, ...contactData };
        } catch (error) {
            console.error('Error creating contact:', error);
            throw error;
        }
    },

    /**
     * Bulk import contacts - Using sequential addDoc for better reliability
     */
    async bulkImport(contacts) {
        console.log('🔥 Starting bulk import of', contacts.length, 'contacts');
        console.log('🔥 DB instance:', db);
        console.log('🔥 Collection name:', COLLECTIONS.CONTACTS);

        try {
            const importedContacts = [];

            for (let i = 0; i < contacts.length; i++) {
                const contact = contacts[i];
                console.log(`🔥 Processing contact ${i + 1}/${contacts.length}:`, contact.name || contact.Name || 'Unknown');

                const contactData = {
                    // Name variations
                    name: contact.name || contact.Name || contact['AWARDE NAME'] || contact['Awarde Name'] || '',
                    // Email variations
                    email: contact.email || contact.Email || contact.EMAIL || '',
                    // Phone variations (WhatsApp/Phone)
                    phone: String(contact.phone || contact.Phone || contact['Phone Number'] || contact['Phone number'] || contact.Whatsapp || contact.whatsapp || contact.WHATSAPP || contact['WhatsApp'] || ''),
                    // RERA variations
                    rera_awarde_no: contact['AWARDE RERA REGISTRATION NO.'] || contact['RERA Awarde No.'] || contact['RERA Awarde No'] || contact.reraAwardeNo || contact['Rera No'] || '',
                    // Certificate Number variations
                    certificate_number: contact['CERTIFICATE NUMBER'] || contact['Certificate Number'] || contact.certificateNumber || '',
                    // Professional/Profession variations
                    professional: contact['AWARDE PROFESSION'] || contact.Professional || contact.professional || contact.Profession || '',
                    email_sent_count: 0,
                    whatsapp_sent_count: 0,
                    last_contacted_at: null,
                    created_at: serverTimestamp(),
                    updated_at: serverTimestamp()
                };

                console.log('🔥 Contact data prepared:', contactData);

                try {
                    console.log('🔥 Calling addDoc...');
                    const docRef = await addDoc(collection(db, COLLECTIONS.CONTACTS), contactData);
                    console.log('🔥 Document added with ID:', docRef.id);
                    importedContacts.push({ id: docRef.id, ...contactData });
                } catch (addError) {
                    console.error('🔥 Error adding document:', addError);
                    console.error('🔥 Error code:', addError.code);
                    console.error('🔥 Error message:', addError.message);
                    throw addError;
                }
            }

            console.log('🔥 Bulk import completed! Total:', importedContacts.length);
            return { count: importedContacts.length, contacts: importedContacts };
        } catch (error) {
            console.error('🔥 Error bulk importing contacts:', error);
            console.error('🔥 Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            throw error;
        }
    },

    /**
     * Update a contact
     */
    async update(id, updates) {
        try {
            const docRef = doc(db, COLLECTIONS.CONTACTS, id);
            await updateDoc(docRef, {
                ...updates,
                updated_at: serverTimestamp()
            });
            return { id, ...updates };
        } catch (error) {
            console.error('Error updating contact:', error);
            throw error;
        }
    },

    /**
     * Delete a contact
     */
    async delete(id) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.CONTACTS, id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting contact:', error);
            throw error;
        }
    },

    /**
     * Bulk delete contacts
     */
    async bulkDelete(ids) {
        try {
            const batch = writeBatch(db);
            ids.forEach(id => {
                batch.delete(doc(db, COLLECTIONS.CONTACTS, id));
            });
            await batch.commit();
            return { count: ids.length };
        } catch (error) {
            console.error('Error bulk deleting contacts:', error);
            throw error;
        }
    }
};

/**
 * Campaigns Service - Direct Firestore Access
 */
export const campaignsService = {
    /**
     * Get all campaigns
     */
    async getAll(filters = {}) {
        try {
            // Simple query without orderBy to avoid index requirements
            const querySnapshot = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
            let campaigns = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Apply filters client-side
            if (filters.type) {
                campaigns = campaigns.filter(c => c.type === filters.type);
            }
            if (filters.status) {
                campaigns = campaigns.filter(c => c.status === filters.status);
            }

            // Sort client-side by created_at (newest first)
            return campaigns.sort((a, b) => {
                const dateA = a.created_at?.toDate?.() || new Date(0);
                const dateB = b.created_at?.toDate?.() || new Date(0);
                return dateB - dateA;
            });
        } catch (error) {
            console.error('Error fetching campaigns:', error);
            throw error;
        }
    },

    /**
     * Get a single campaign by ID
     */
    async getById(id) {
        try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.CAMPAIGNS, id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Error fetching campaign:', error);
            throw error;
        }
    },

    /**
     * Create a new campaign
     */
    async create(campaignData) {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.CAMPAIGNS), {
                ...campaignData,
                status: campaignData.scheduledAt ? 'scheduled' : 'sent',
                sent_count: campaignData.contactIds?.length || 0,
                delivered_count: 0,
                failed_count: 0,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });
            return { id: docRef.id, ...campaignData };
        } catch (error) {
            console.error('Error creating campaign:', error);
            throw error;
        }
    },

    /**
     * Update a campaign
     */
    async update(id, updates) {
        try {
            const docRef = doc(db, COLLECTIONS.CAMPAIGNS, id);
            await updateDoc(docRef, {
                ...updates,
                updated_at: serverTimestamp()
            });
            return { id, ...updates };
        } catch (error) {
            console.error('Error updating campaign:', error);
            throw error;
        }
    },

    /**
     * Delete a campaign
     */
    async delete(id) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.CAMPAIGNS, id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting campaign:', error);
            throw error;
        }
    }
};

/**
 * Templates Service - Direct Firestore Access
 */
export const templatesService = {
    /**
     * Get all templates
     */
    async getAll(type = null) {
        try {
            // Simple query without orderBy to avoid index requirements
            const querySnapshot = await getDocs(collection(db, COLLECTIONS.TEMPLATES));
            let templates = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Filter client-side if type provided
            if (type) {
                templates = templates.filter(t => t.type === type);
            }

            // Sort client-side by created_at (newest first)
            return templates.sort((a, b) => {
                const dateA = a.created_at?.toDate?.() || new Date(0);
                const dateB = b.created_at?.toDate?.() || new Date(0);
                return dateB - dateA;
            });
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    },

    /**
     * Get a single template by ID
     */
    async getById(id) {
        try {
            const docSnap = await getDoc(doc(db, COLLECTIONS.TEMPLATES, id));
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Error fetching template:', error);
            throw error;
        }
    },

    /**
     * Create a new template
     */
    async create(templateData) {
        try {
            const docRef = await addDoc(collection(db, COLLECTIONS.TEMPLATES), {
                ...templateData,
                usage_count: 0,
                created_at: serverTimestamp(),
                updated_at: serverTimestamp()
            });
            return { id: docRef.id, ...templateData };
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    },

    /**
     * Update a template
     */
    async update(id, updates) {
        try {
            const docRef = doc(db, COLLECTIONS.TEMPLATES, id);
            await updateDoc(docRef, {
                ...updates,
                updated_at: serverTimestamp()
            });
            return { id, ...updates };
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    },

    /**
     * Delete a template
     */
    async delete(id) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.TEMPLATES, id));
            return { success: true };
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    }
};

/**
 * Stats Service - Calculates stats from Firestore data
 */
export const statsService = {
    /**
     * Get overview statistics
     */
    async getOverview() {
        try {
            const [contacts, campaigns] = await Promise.all([
                contactsService.getAll(),
                campaignsService.getAll()
            ]);

            const emailCampaigns = campaigns.filter(c => c.type === 'email');
            const whatsappCampaigns = campaigns.filter(c => c.type === 'whatsapp');

            const emailsSent = emailCampaigns.reduce((sum, c) => sum + (c.sent_count || c.sentCount || 0), 0);
            const whatsappSent = whatsappCampaigns.reduce((sum, c) => sum + (c.sent_count || c.sentCount || 0), 0);

            return {
                totalContacts: contacts.length,
                emailsSent,
                whatsappSent,
                totalCampaigns: campaigns.length
            };
        } catch (error) {
            console.error('Error fetching stats:', error);
            throw error;
        }
    }
};

// Export all services
export default {
    contacts: contactsService,
    campaigns: campaignsService,
    templates: templatesService,
    stats: statsService
};
