/**
 * Date Utility Functions
 * Handles parsing and formatting of Firestore timestamps and dates
 */

// Utility function to safely parse Firestore timestamps
export const parseFirestoreDate = (timestamp) => {
    if (!timestamp) return null;
    
    // If it's already a Date object
    if (timestamp instanceof Date) {
        return timestamp;
    }
    
    // If it's a Firestore Timestamp object with seconds property (from Admin SDK)
    if (timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }
    
    // If it's a Firestore Timestamp object with _seconds property (serialized format)
    if (timestamp._seconds !== undefined) {
        return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
    }
    
    // If it's a Firestore Timestamp object with toDate method
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }
    
    // If it's a number (milliseconds or seconds)
    if (typeof timestamp === 'number') {
        // If it's less than 1e12, it's likely seconds, otherwise milliseconds
        return new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
    }
    
    // If it's a string, try to parse it
    if (typeof timestamp === 'string') {
        const parsed = new Date(timestamp);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }
    
    // If it's an object with a toMillis method (Firestore Timestamp)
    if (timestamp && typeof timestamp.toMillis === 'function') {
        return new Date(timestamp.toMillis());
    }
    
    return null;
};

// Format date safely
export const formatDate = (timestamp, options = {}) => {
    const date = parseFirestoreDate(timestamp);
    if (!date) return 'N/A';
    
    const defaultOptions = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Format date and time safely
export const formatDateTime = (timestamp) => {
    const date = parseFirestoreDate(timestamp);
    if (!date) return 'N/A';
    
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Get current date formatted
export const getCurrentDate = () => {
    return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};
