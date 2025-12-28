import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Debug: Log the API URL being used (remove in production)
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('📝 Environment variable:', import.meta.env.VITE_API_URL);

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

// Add request interceptor for debugging
api.interceptors.request.use(
    (config) => {
        console.log(`📤 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

// Add response interceptor for error handling
api.interceptors.response.use(
    (response) => {
        console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
        return response;
    },
    (error) => {
        console.error('❌ API Error:', {
            message: error.message,
            url: error.config?.url,
            status: error.response?.status,
            data: error.response?.data
        });
        
        // Provide better error messages
        if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
            error.message = 'Cannot connect to backend server. Make sure the server is running on http://localhost:5000';
        } else if (error.response?.status === 404) {
            error.message = 'API endpoint not found. Check if the backend server is configured correctly.';
        } else if (error.response?.status >= 500) {
            error.message = 'Backend server error. Check the server logs.';
        }
        
        return Promise.reject(error);
    }
);

// Certificate API
export const certificateAPI = {
    // Get all certificates
    getAll: async (params = {}) => {
        const response = await api.get('/certificates', { params });
        // API returns { success: true, data: [...] }
        return response.data?.data || response.data || [];
    },

    // Get certificate by ID
    getById: async (id) => {
        const response = await api.get(`/certificates/${id}`);
        // API returns { success: true, data: {...} }
        return response.data?.data || response.data;
    },

    // Create new certificate
    create: async (data) => {
        const response = await api.post('/certificates', data);
        // API returns { success: true, data: {...} }
        return response.data?.data || response.data;
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
        // API returns { success: true, data: {...} }
        return response.data?.data || response.data || {};
    },
};

// Health check
export const healthCheck = async () => {
    const response = await api.get('/health');
    return response.data;
};

export default api;
