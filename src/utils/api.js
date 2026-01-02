/**
 * API Utility
 * Provides common API request helper and base URL for all services.
 */

// Get API URL from environment variable or use default
let envApiUrl = import.meta.env.VITE_API_URL;

// Fix common issues with the URL
if (envApiUrl) {
    // Fix missing 'h' in https (common issue)
    if (envApiUrl.startsWith('ttps://')) {
        envApiUrl = 'h' + envApiUrl;
    }
    // Ensure it starts with http:// or https://
    if (!envApiUrl.startsWith('http://') && !envApiUrl.startsWith('https://')) {
        envApiUrl = 'https://' + envApiUrl;
    }
    // Remove trailing slash
    envApiUrl = envApiUrl.replace(/\/$/, '');
}

export const API_BASE_URL = envApiUrl || 'https://us-central1-channel-partner-54334.cloudfunctions.net/api';

// Log for debugging
console.log('[API Config] VITE_API_URL (raw):', import.meta.env.VITE_API_URL);
console.log('[API Config] VITE_API_URL (processed):', envApiUrl || 'NOT SET - using default');
console.log('[API Config] Using API Base URL:', API_BASE_URL);

/**
 * Make API request helper
 */
export async function apiRequest(endpoint, options = {}) {
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

        let data;
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = { error: await response.text() };
        }

        if (!response.ok) {
            const error = new Error(data.error || data.message || `Request failed with status ${response.status}`);
            error.response = {
                status: response.status,
                data: data,
            };
            throw error;
        }

        // Return data directly if wrapped in success response
        // Handle paginated responses (return data array, not the whole response object)
        if (data.success && Array.isArray(data.data)) {
            return data.data;
        }
        return data.data !== undefined ? data.data : data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        if (error.response) {
            throw error;
        }
        // Network or other errors
        throw new Error(error.message || 'Network error occurred. Please check your internet connection and ensure the backend is running.');
    }
}
