import { apiRequest } from '../utils/api';

/**
 * Notifications Service
 */
const notificationsService = {
    /**
     * Get all notifications
     * @param {Object} options - Query options
     * @param {number} options.limit - Limit number of notifications
     * @param {boolean} options.unread - Only get unread notifications
     */
    async getAll(options = {}) {
        const params = new URLSearchParams();
        if (options.limit) params.append('limit', options.limit);
        if (options.unread) params.append('unread', 'true');
        
        const queryString = params.toString();
        return apiRequest(`/notifications${queryString ? `?${queryString}` : ''}`);
    },

    /**
     * Get unread notification count
     */
    async getUnreadCount() {
        return apiRequest('/notifications/unread-count');
    },

    /**
     * Create a notification
     * @param {Object} notificationData
     * @param {string} notificationData.title - Notification title
     * @param {string} notificationData.message - Notification message
     * @param {string} notificationData.type - Notification type (info, success, warning, error)
     * @param {string} notificationData.link - Optional link
     * @param {string} notificationData.userId - Optional user ID (null for global)
     */
    async create(notificationData) {
        return apiRequest('/notifications', {
            method: 'POST',
            body: JSON.stringify(notificationData),
        });
    },

    /**
     * Mark notification as read
     * @param {string} id - Notification ID
     */
    async markAsRead(id) {
        return apiRequest(`/notifications/${id}/read`, {
            method: 'PUT',
        });
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        return apiRequest('/notifications/read-all', {
            method: 'PUT',
        });
    },

    /**
     * Delete a notification
     * @param {string} id - Notification ID
     */
    async delete(id) {
        return apiRequest(`/notifications/${id}`, {
            method: 'DELETE',
        });
    },
};

export default notificationsService;

