// Marketing Service - Client-side API for Marketing Dashboard
// Handles contacts, campaigns, templates, and scheduled messages

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
        const data = await response.json();

        if (!response.ok) {
            const error = new Error(data.error || 'Request failed');
            error.response = {
                status: response.status,
                data: data,
            };
            throw error;
        }

        return data.data !== undefined ? data.data : data;
    } catch (error) {
        if (error.response) {
            throw error;
        }
        throw new Error(error.message || 'Network error occurred');
    }
}

/**
 * Contacts API
 */
export const contactsAPI = {
    /**
     * Get all contacts
     */
    async getAll(options = {}) {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.offset) params.append('offset', options.offset);
        if (options.search) params.append('search', options.search);

        const queryString = params.toString();
        return apiRequest(`/marketing/contacts${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get contact by ID
     */
    async getById(id) {
        return apiRequest(`/marketing/contacts/${id}`);
    },

    /**
     * Create a single contact
     */
    async create(contactData) {
        return apiRequest('/marketing/contacts', {
            method: 'POST',
            body: JSON.stringify(contactData),
        });
    },

    /**
     * Bulk import contacts
     */
    async bulkImport(contacts) {
        return apiRequest('/marketing/contacts/bulk', {
            method: 'POST',
            body: JSON.stringify({ contacts }),
        });
    },

    /**
     * Update a contact
     */
    async update(id, updates) {
        return apiRequest(`/marketing/contacts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    /**
     * Delete a contact
     */
    async delete(id) {
        return apiRequest(`/marketing/contacts/${id}`, {
            method: 'DELETE',
        });
    },

    /**
     * Delete multiple contacts
     */
    async bulkDelete(ids) {
        return apiRequest('/marketing/contacts/bulk-delete', {
            method: 'POST',
            body: JSON.stringify({ ids }),
        });
    },

    /**
     * Export contacts
     */
    async export() {
        return apiRequest('/marketing/contacts/export');
    },
};

/**
 * Campaigns API
 */
export const campaignsAPI = {
    /**
     * Get all campaigns
     */
    async getAll(options = {}) {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.offset) params.append('offset', options.offset);
        if (options.type) params.append('type', options.type);
        if (options.status) params.append('status', options.status);

        const queryString = params.toString();
        return apiRequest(`/marketing/campaigns${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get campaign by ID
     */
    async getById(id) {
        return apiRequest(`/marketing/campaigns/${id}`);
    },

    /**
     * Create a new campaign
     * @param {Object} campaignData - Campaign data
     * @param {string} campaignData.type - 'email' or 'whatsapp'
     * @param {string} campaignData.subject - Email subject (for email campaigns)
     * @param {string} campaignData.message - Message content
     * @param {string[]} campaignData.contactIds - Array of contact IDs
     * @param {string} campaignData.templateId - Optional template ID
     * @param {string} campaignData.scheduledAt - Optional scheduled time (ISO string)
     */
    async create(campaignData) {
        return apiRequest('/marketing/campaigns', {
            method: 'POST',
            body: JSON.stringify(campaignData),
        });
    },

    /**
     * Send campaign immediately
     */
    async send(id) {
        return apiRequest(`/marketing/campaigns/${id}/send`, {
            method: 'POST',
        });
    },

    /**
     * Cancel a scheduled campaign
     */
    async cancel(id) {
        return apiRequest(`/marketing/campaigns/${id}/cancel`, {
            method: 'POST',
        });
    },

    /**
     * Get campaign statistics
     */
    async getStats(id) {
        return apiRequest(`/marketing/campaigns/${id}/stats`);
    },

    /**
     * Delete a campaign
     */
    async delete(id) {
        return apiRequest(`/marketing/campaigns/${id}`, {
            method: 'DELETE',
        });
    },
};

/**
 * Templates API
 */
export const templatesAPI = {
    /**
     * Get all templates
     */
    async getAll(type = null) {
        const params = type ? `?type=${type}` : '';
        return apiRequest(`/marketing/templates${params}`);
    },

    /**
     * Get template by ID
     */
    async getById(id) {
        return apiRequest(`/marketing/templates/${id}`);
    },

    /**
     * Create a new template
     * @param {Object} templateData - Template data
     * @param {string} templateData.name - Template name
     * @param {string} templateData.type - 'email' or 'whatsapp'
     * @param {string} templateData.subject - Email subject (for email)
     * @param {string} templateData.content - Template content
     */
    async create(templateData) {
        return apiRequest('/marketing/templates', {
            method: 'POST',
            body: JSON.stringify(templateData),
        });
    },

    /**
     * Update a template
     */
    async update(id, updates) {
        return apiRequest(`/marketing/templates/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    /**
     * Delete a template
     */
    async delete(id) {
        return apiRequest(`/marketing/templates/${id}`, {
            method: 'DELETE',
        });
    },
};

/**
 * Scheduled Messages API
 */
export const scheduledAPI = {
    /**
     * Get all scheduled campaigns
     */
    async getAll() {
        return apiRequest('/marketing/scheduled');
    },

    /**
     * Get scheduled campaign details
     */
    async getById(id) {
        return apiRequest(`/marketing/scheduled/${id}`);
    },

    /**
     * Cancel a scheduled campaign
     */
    async cancel(id) {
        return apiRequest(`/marketing/scheduled/${id}`, {
            method: 'DELETE',
        });
    },

    /**
     * Reschedule a campaign
     */
    async reschedule(id, newScheduledAt) {
        return apiRequest(`/marketing/scheduled/${id}/reschedule`, {
            method: 'PUT',
            body: JSON.stringify({ scheduledAt: newScheduledAt }),
        });
    },
};

/**
 * Marketing Statistics API
 */
export const statsAPI = {
    /**
     * Get overview statistics
     */
    async getOverview() {
        return apiRequest('/marketing/stats/overview');
    },

    /**
     * Get email statistics
     */
    async getEmailStats() {
        return apiRequest('/marketing/stats/email');
    },

    /**
     * Get WhatsApp statistics
     */
    async getWhatsAppStats() {
        return apiRequest('/marketing/stats/whatsapp');
    },

    /**
     * Get campaign performance
     */
    async getCampaignPerformance(timeframe = '30d') {
        return apiRequest(`/marketing/stats/performance?timeframe=${timeframe}`);
    },
};

/**
 * Service Configuration API
 */
export const configAPI = {
    /**
     * Check service configuration status
     */
    async getStatus() {
        return apiRequest('/marketing/config/status');
    },

    /**
     * Get email service config (without secrets)
     */
    async getEmailConfig() {
        return apiRequest('/marketing/config/email');
    },

    /**
     * Get WhatsApp service config (without secrets)
     */
    async getWhatsAppConfig() {
        return apiRequest('/marketing/config/whatsapp');
    },
};

// Export all APIs
export default {
    contacts: contactsAPI,
    campaigns: campaignsAPI,
    templates: templatesAPI,
    scheduled: scheduledAPI,
    stats: statsAPI,
    config: configAPI,
};
