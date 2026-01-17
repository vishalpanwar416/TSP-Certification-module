const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');

/**
 * Notification Service Utility
 * Provides helper functions to create and manage notifications
 */

/**
 * Create a notification in the database
 * @param {Object} options - Notification options
 * @param {string} options.title - Notification title (required)
 * @param {string} options.message - Notification message (required)
 * @param {string} options.type - Notification type: 'info', 'success', 'warning', 'error' (default: 'info')
 * @param {string} options.link - Optional link/URL
 * @param {string} options.userId - Optional user ID (null for global notifications)
 * @param {Object} options.metadata - Optional metadata object
 * @param {string} options.category - Optional category (e.g., 'campaign', 'certificate', 'system')
 * @returns {Promise<Object>} Created notification data
 */
async function createNotification(options) {
    const { title, message, type = 'info', link = null, userId = null, metadata = {}, category = null } = options;

    if (!title || !message) {
        throw new Error('Title and message are required');
    }

    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;

    const id = uuidv4();
    const notificationData = {
        id,
        title,
        message,
        type, // info, success, warning, error
        link,
        userId, // null for global notifications
        category,
        metadata,
        read: false,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
    };

    try {
        await db.collection('notifications').doc(id).set(notificationData);
        console.log(`✅ Notification created: ${title} (${id})`);
        return notificationData;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

/**
 * Create a success notification
 */
async function createSuccessNotification(title, message, options = {}) {
    return createNotification({
        title,
        message,
        type: 'success',
        ...options
    });
}

/**
 * Create an error notification
 */
async function createErrorNotification(title, message, options = {}) {
    return createNotification({
        title,
        message,
        type: 'error',
        ...options
    });
}

/**
 * Create a warning notification
 */
async function createWarningNotification(title, message, options = {}) {
    return createNotification({
        title,
        message,
        type: 'warning',
        ...options
    });
}

/**
 * Create an info notification
 */
async function createInfoNotification(title, message, options = {}) {
    return createNotification({
        title,
        message,
        type: 'info',
        ...options
    });
}

/**
 * Create notification for campaign completion
 */
async function createCampaignNotification(campaignData, status, options = {}) {
    const { id, name, totalContacts, successfulContacts, failedContacts } = campaignData;
    
    let title, message, type;
    
    if (status === 'completed') {
        title = 'Campaign Completed';
        message = `Campaign "${name}" has been completed. ${successfulContacts || 0} contacts processed successfully.`;
        type = 'success';
    } else if (status === 'failed') {
        title = 'Campaign Failed';
        message = `Campaign "${name}" encountered errors. ${failedContacts || 0} contacts failed.`;
        type = 'error';
    } else if (status === 'paused') {
        title = 'Campaign Paused';
        message = `Campaign "${name}" has been paused.`;
        type = 'warning';
    } else {
        title = 'Campaign Update';
        message = `Campaign "${name}" status updated.`;
        type = 'info';
    }

    return createNotification({
        title,
        message,
        type,
        category: 'campaign',
        link: `/campaigns/${id}`,
        metadata: {
            campaignId: id,
            campaignName: name,
            totalContacts,
            successfulContacts,
            failedContacts,
            status
        },
        ...options
    });
}

/**
 * Create notification for certificate generation
 */
async function createCertificateNotification(contactData, certificateUrl, options = {}) {
    const { name, phone, email } = contactData;
    
    return createSuccessNotification(
        'Certificate Generated',
        `Certificate has been generated for ${name || phone || email || 'contact'}.`,
        {
            category: 'certificate',
            link: certificateUrl,
            metadata: {
                contactName: name,
                contactPhone: phone,
                contactEmail: email,
                certificateUrl
            },
            ...options
        }
    );
}

/**
 * Create notification for bulk operation completion
 */
async function createBulkOperationNotification(operationType, totalItems, successfulItems, failedItems, options = {}) {
    let title, message, type;
    
    if (failedItems === 0) {
        title = `${operationType} Completed Successfully`;
        message = `All ${totalItems} items processed successfully.`;
        type = 'success';
    } else {
        title = `${operationType} Completed with Errors`;
        message = `${successfulItems} succeeded, ${failedItems} failed out of ${totalItems} total.`;
        type = 'warning';
    }

    return createNotification({
        title,
        message,
        type,
        category: 'bulk_operation',
        metadata: {
            operationType,
            totalItems,
            successfulItems,
            failedItems
        },
        ...options
    });
}

/**
 * Create notification for system events
 */
async function createSystemNotification(title, message, type = 'info', options = {}) {
    return createNotification({
        title,
        message,
        type,
        category: 'system',
        ...options
    });
}

/**
 * Get notifications for a specific user (or global if userId is null)
 */
async function getUserNotifications(userId, options = {}) {
    const { limit = 50, unreadOnly = false, category = null } = options;
    const db = admin.firestore();

    let query = db.collection('notifications');

    // Filter by userId (null for global, or specific userId)
    if (userId !== null) {
        query = query.where('userId', '==', userId);
    } else {
        query = query.where('userId', '==', null);
    }

    // Filter by read status
    if (unreadOnly) {
        query = query.where('read', '==', false);
    }

    // Filter by category if provided
    if (category) {
        query = query.where('category', '==', category);
    }

    // Order by created_at descending
    query = query.orderBy('created_at', 'desc').limit(limit);

    const snapshot = await query.get();
    const notifications = [];
    snapshot.forEach(doc => {
        notifications.push({ id: doc.id, ...doc.data() });
    });

    return notifications;
}

/**
 * Get unread count for a user
 */
async function getUnreadCount(userId = null) {
    const db = admin.firestore();
    let query = db.collection('notifications').where('read', '==', false);

    if (userId !== null) {
        query = query.where('userId', '==', userId);
    } else {
        query = query.where('userId', '==', null);
    }

    const snapshot = await query.get();
    return snapshot.size;
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId) {
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;
    const docRef = db.collection('notifications').doc(notificationId);
    
    const doc = await docRef.get();
    if (!doc.exists) {
        throw new Error('Notification not found');
    }

    await docRef.update({
        read: true,
        read_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp()
    });

    return true;
}

/**
 * Mark all notifications as read for a user
 */
async function markAllAsRead(userId = null) {
    const db = admin.firestore();
    const FieldValue = admin.firestore.FieldValue;
    
    let query = db.collection('notifications').where('read', '==', false);
    
    if (userId !== null) {
        query = query.where('userId', '==', userId);
    } else {
        query = query.where('userId', '==', null);
    }

    const snapshot = await query.get();
    const batch = db.batch();
    
    snapshot.forEach(doc => {
        batch.update(doc.ref, {
            read: true,
            read_at: FieldValue.serverTimestamp(),
            updated_at: FieldValue.serverTimestamp()
        });
    });

    await batch.commit();
    return snapshot.size;
}

/**
 * Delete old read notifications (cleanup)
 */
async function deleteOldNotifications(daysOld = 30, userId = null) {
    const db = admin.firestore();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let query = db.collection('notifications')
        .where('read', '==', true)
        .where('read_at', '<', cutoffDate);

    if (userId !== null) {
        query = query.where('userId', '==', userId);
    } else {
        query = query.where('userId', '==', null);
    }

    const snapshot = await query.get();
    const batch = db.batch();
    
    snapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();
    return snapshot.size;
}

module.exports = {
    createNotification,
    createSuccessNotification,
    createErrorNotification,
    createWarningNotification,
    createInfoNotification,
    createCampaignNotification,
    createCertificateNotification,
    createBulkOperationNotification,
    createSystemNotification,
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteOldNotifications
};
