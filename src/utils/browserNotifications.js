/**
 * Browser Notifications Utility
 * Handles browser notification permissions and display
 */

/**
 * Request notification permission from the user
 * @returns {Promise<string>} 'granted', 'denied', or 'default'
 */
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return 'unsupported';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        try {
            const permission = await Notification.requestPermission();
            return permission;
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return 'default';
        }
    }

    return Notification.permission;
};

/**
 * Check if notifications are supported and enabled
 * @returns {boolean}
 */
export const isNotificationEnabled = () => {
    if (!('Notification' in window)) {
        return false;
    }
    return Notification.permission === 'granted';
};

/**
 * Get current notification permission status
 * @returns {string} 'granted', 'denied', 'default', or 'unsupported'
 */
export const getNotificationPermission = () => {
    if (!('Notification' in window)) {
        return 'unsupported';
    }
    return Notification.permission;
};

/**
 * Show a browser notification
 * @param {string} title - Notification title
 * @param {Object} options - Notification options
 * @param {string} options.body - Notification body text
 * @param {string} options.icon - Notification icon URL
 * @param {string} options.badge - Notification badge URL
 * @param {string} options.tag - Notification tag (for replacing)
 * @param {boolean} options.requireInteraction - Keep notification until user interacts
 * @param {Function} options.onclick - Click handler
 * @returns {Notification|null} The notification object or null if not supported
 */
export const showBrowserNotification = (title, options = {}) => {
    if (!isNotificationEnabled()) {
        console.warn('Notifications are not enabled');
        return null;
    }

    const defaultOptions = {
        body: '',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'default',
        requireInteraction: false,
        ...options,
    };

    try {
        const notification = new Notification(title, defaultOptions);

        // Handle click
        if (options.onclick) {
            notification.onclick = options.onclick;
        } else {
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }

        // Auto-close after 5 seconds if not requiring interaction
        if (!defaultOptions.requireInteraction) {
            setTimeout(() => {
                notification.close();
            }, 5000);
        }

        return notification;
    } catch (error) {
        console.error('Error showing notification:', error);
        return null;
    }
};

/**
 * Show notification for a new notification item
 * @param {Object} notification - Notification object from backend
 */
export const showNotificationAlert = (notification) => {
    const { title, message, type, link } = notification;

    const iconMap = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️',
    };

    const icon = iconMap[type] || iconMap.info;

    showBrowserNotification(`${icon} ${title}`, {
        body: message || '',
        tag: `notification-${notification.id}`,
        requireInteraction: false,
        onclick: () => {
            window.focus();
            if (link) {
                window.location.href = link;
            }
        },
    });
};

export default {
    requestNotificationPermission,
    isNotificationEnabled,
    getNotificationPermission,
    showBrowserNotification,
    showNotificationAlert,
};
