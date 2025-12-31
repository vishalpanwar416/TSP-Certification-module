import { apiRequest, API_BASE_URL } from '../utils/api';

/**
 * Certificate API object with all CRUD operations
 */
export const certificateAPI = {
    /**
     * Get all certificates
     */
    async getAll() {
        return apiRequest('/certificates');
    },

    /**
     * Get certificate by ID
     */
    async getById(id) {
        return apiRequest(`/certificates/${id}`);
    },

    /**
     * Create a new certificate
     */
    async create(certificateData) {
        return apiRequest('/certificates', {
            method: 'POST',
            body: JSON.stringify(certificateData),
        });
    },

    /**
     * Update a certificate
     */
    async update(id, updates) {
        return apiRequest(`/certificates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    /**
     * Delete a certificate
     */
    async delete(id) {
        return apiRequest(`/certificates/${id}`, {
            method: 'DELETE',
        });
    },

    /**
     * Send certificate via WhatsApp
     * @param {string} id - Certificate ID
     * @param {string} phoneNumber - Recipient phone number
     * @param {Object} options - Optional settings
     * @param {string} options.customMessage - Custom WhatsApp message template
     * @param {string} options.scheduledAt - ISO date string for scheduled sending
     */
    async sendWhatsApp(id, phoneNumber, options = {}) {
        return apiRequest(`/certificates/${id}/send-whatsapp`, {
            method: 'POST',
            body: JSON.stringify({
                phone_number: phoneNumber,
                custom_message: options.customMessage,
                scheduled_at: options.scheduledAt,
            }),
        });
    },

    /**
     * Send certificate via Email
     * @param {string} id - Certificate ID
     * @param {string} email - Recipient email address
     * @param {Object} options - Optional settings
     * @param {string} options.subject - Custom email subject
     * @param {string} options.body - Custom email body
     * @param {string} options.scheduledAt - ISO date string for scheduled sending
     */
    async sendEmail(id, email, options = {}) {
        return apiRequest(`/certificates/${id}/send-email`, {
            method: 'POST',
            body: JSON.stringify({
                email,
                subject: options.subject,
                body: options.body,
                scheduled_at: options.scheduledAt,
            }),
        });
    },

    /**
     * Get scheduled messages for a certificate
     */
    async getScheduledMessages(certificateId) {
        return apiRequest(`/certificates/${certificateId}/scheduled`);
    },

    /**
     * Cancel a scheduled message
     */
    async cancelScheduledMessage(certificateId, messageId) {
        return apiRequest(`/certificates/${certificateId}/scheduled/${messageId}`, {
            method: 'DELETE',
        });
    },

    /**
     * Get all scheduled messages
     */
    async getAllScheduled() {
        return apiRequest('/scheduled');
    },

    /**
     * Get PDF URL for a certificate
     */
    getPdfUrl(id) {
        return `${API_BASE_URL}/certificates/${id}/download`;
    },

    /**
     * Get download URL for a certificate
     */
    downloadUrl(id) {
        return `${API_BASE_URL}/certificates/${id}/download`;
    },

    /**
     * Get certificate statistics
     */
    async getStats() {
        return apiRequest('/certificates/stats');
    },
};

/**
 * Health check function
 */
export async function healthCheck() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        const data = await response.json();
        return {
            status: 'OK',
            ...data,
        };
    } catch (error) {
        return {
            status: 'ERROR',
            message: error.message,
        };
    }
}

// Default export
export default certificateAPI;


