import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Certificate API
export const certificateAPI = {
    // Get all certificates
    getAll: async (params = {}) => {
        const response = await api.get('/certificates', { params });
        return response.data;
    },

    // Get certificate by ID
    getById: async (id) => {
        const response = await api.get(`/certificates/${id}`);
        return response.data;
    },

    // Create new certificate
    create: async (data) => {
        const response = await api.post('/certificates', data);
        return response.data;
    },

    // Update certificate
    update: async (id, data) => {
        const response = await api.put(`/certificates/${id}`, data);
        return response.data;
    },

    // Delete certificate
    delete: async (id) => {
        const response = await api.delete(`/certificates/${id}`);
        return response.data;
    },

    // Send certificate via WhatsApp
    sendWhatsApp: async (id, phoneNumber) => {
        const response = await api.post(`/certificates/${id}/send-whatsapp`, {
            phone_number: phoneNumber,
        });
        return response.data;
    },

    // Download certificate
    downloadUrl: (id) => {
        return `${API_BASE_URL}/certificates/${id}/download`;
    },

    // Get PDF URL
    getPdfUrl: (id) => {
        return `${API_BASE_URL.replace('/api', '')}/certificates/${id}.pdf`;
    },

    // Get statistics
    getStats: async () => {
        const response = await api.get('/certificates/stats');
        return response.data;
    },
};

// Health check
export const healthCheck = async () => {
    const response = await api.get('/health');
    return response.data;
};

export default api;
