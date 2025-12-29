// Firebase Service - Client-side API for Firebase Cloud Functions
// This service communicates with the Firebase Cloud Functions backend

const API_BASE_URL = import.meta.env.VITE_API_URL || 
    'https://us-central1-channel-partner-54334.cloudfunctions.net/api';

/**
 * Make API request helper
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    };

    try {
        const response = await fetch(url, config);
        
        // Handle non-JSON responses (like redirects)
        if (response.redirected || response.status === 302) {
            return response.url;
        }

        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.error || 'Request failed');
            error.response = {
                status: response.status,
                data: data,
            };
            throw error;
        }

        // Return data directly if wrapped in success response
        return data.data !== undefined ? data.data : data;
    } catch (error) {
        if (error.response) {
            throw error;
        }
        // Network or other errors
        throw new Error(error.message || 'Network error occurred');
    }
}

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
     */
    async sendWhatsApp(id, phoneNumber) {
        return apiRequest(`/certificates/${id}/send-whatsapp`, {
            method: 'POST',
            body: JSON.stringify({ phone_number: phoneNumber }),
        });
    },

    /**
     * Send certificate via Email
     */
    async sendEmail(id, email) {
        return apiRequest(`/certificates/${id}/send-email`, {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
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

