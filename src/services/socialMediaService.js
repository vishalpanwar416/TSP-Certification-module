import { apiRequest } from '../utils/api';

/**
 * Social Media API Service
 * Handles all social media operations including posting, scheduling, insights, and management
 */
export const socialMediaAPI = {
    /**
     * Post to all selected platforms at once
     * @param {Object} postData - Post data
     * @param {string} postData.content - Post content
     * @param {string[]} postData.platforms - Array of platform IDs ['facebook', 'twitter', etc.]
     * @param {string} postData.scheduledAt - Optional scheduled time (ISO string)
     * @param {string} postData.imageUrl - Optional image URL
     */
    async postToAllPlatforms(postData) {
        return apiRequest('/social-media/posts/bulk', {
            method: 'POST',
            body: JSON.stringify(postData),
        });
    },

    /**
     * Get all posts
     * @param {Object} options - Query options
     * @param {string} options.platform - Filter by platform
     * @param {string} options.status - Filter by status (scheduled, published, failed)
     */
    async getAllPosts(options = {}) {
        const params = new URLSearchParams();
        if (options.platform) params.append('platform', options.platform);
        if (options.status) params.append('status', options.status);
        
        const queryString = params.toString();
        return apiRequest(`/social-media/posts${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get post by ID
     */
    async getPostById(id) {
        return apiRequest(`/social-media/posts/${id}`);
    },

    /**
     * Create a scheduled post
     * @param {Object} postData - Post data
     */
    async createPost(postData) {
        return apiRequest('/social-media/posts', {
            method: 'POST',
            body: JSON.stringify(postData),
        });
    },

    /**
     * Update a post
     */
    async updatePost(id, updates) {
        return apiRequest(`/social-media/posts/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });
    },

    /**
     * Delete a post
     */
    async deletePost(id) {
        return apiRequest(`/social-media/posts/${id}`, {
            method: 'DELETE',
        });
    },

    /**
     * Delete multiple posts
     */
    async bulkDeletePosts(ids) {
        return apiRequest('/social-media/posts/bulk-delete', {
            method: 'POST',
            body: JSON.stringify({ ids }),
        });
    },

    /**
     * Pause/resume a scheduled post
     */
    async togglePostStatus(id, status) {
        return apiRequest(`/social-media/posts/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    /**
     * Get post insights/analytics
     * @param {string} postId - Post ID
     */
    async getPostInsights(postId) {
        return apiRequest(`/social-media/posts/${postId}/insights`);
    },

    /**
     * Get all posts insights (aggregated)
     * @param {Object} options - Query options
     * @param {string} options.platform - Filter by platform
     * @param {string} options.startDate - Start date for analytics
     * @param {string} options.endDate - End date for analytics
     */
    async getAllInsights(options = {}) {
        const params = new URLSearchParams();
        if (options.platform) params.append('platform', options.platform);
        if (options.startDate) params.append('startDate', options.startDate);
        if (options.endDate) params.append('endDate', options.endDate);
        
        const queryString = params.toString();
        return apiRequest(`/social-media/insights${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get platform statistics
     */
    async getPlatformStats() {
        return apiRequest('/social-media/stats');
    },

    /**
     * Connect/disconnect platform account
     */
    async connectPlatform(platformId, credentials) {
        return apiRequest(`/social-media/platforms/${platformId}/connect`, {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
    },

    /**
     * Disconnect platform account
     */
    async disconnectPlatform(platformId) {
        return apiRequest(`/social-media/platforms/${platformId}/disconnect`, {
            method: 'DELETE',
        });
    },

    /**
     * Get connected platforms
     */
    async getConnectedPlatforms() {
        return apiRequest('/social-media/platforms/connected');
    },
};

export default socialMediaAPI;
