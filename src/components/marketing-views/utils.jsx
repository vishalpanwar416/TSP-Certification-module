import React from 'react';
import { CheckCircle, AlertCircle, Clock } from 'lucide-react';

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

    return null;
};

export const formatDate = (timestamp, options = {}) => {
    const date = parseFirestoreDate(timestamp);
    if (!date || isNaN(date.getTime())) {
        if (timestamp === null || timestamp === undefined) {
            return 'N/A';
        }
        console.warn('Invalid date format:', timestamp);
        return 'N/A';
    }

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

export const formatDateTime = (timestamp) => {
    const date = parseFirestoreDate(timestamp);
    if (!date || isNaN(date.getTime())) {
        if (timestamp === null || timestamp === undefined) {
            return 'N/A';
        }
        console.warn('Invalid date format:', timestamp);
        return 'N/A';
    }

    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

export const renderStatusBadge = (campaign) => {
    const status = campaign.status || 'pending';
    const sentCount = campaign.sent_count || campaign.sentCount || 0;
    const failedCount = campaign.failed_count || campaign.failedCount || 0;
    const total = campaign.recipient_count || campaign.recipientCount || 0;

    if (status === 'completed' && sentCount > 0 && failedCount === 0) {
        return (
            <span className="badge badge-success">
                <CheckCircle size={12} />
                Sent
            </span>
        );
    } else if (status === 'failed' || (sentCount === 0 && failedCount > 0)) {
        return (
            <span className="badge badge-error" style={{ backgroundColor: '#ef4444', color: 'white' }}>
                <AlertCircle size={12} />
                Failed
            </span>
        );
    } else if (status === 'partial' || (sentCount > 0 && failedCount > 0)) {
        return (
            <span className="badge badge-warning" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                <AlertCircle size={12} />
                Partial ({sentCount}/{total})
            </span>
        );
    } else if (status === 'scheduled') {
        return (
            <span className="badge badge-info" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                <Clock size={12} />
                Scheduled
            </span>
        );
    } else if (status === 'pending') {
        return (
            <span className="badge badge-warning" style={{ backgroundColor: '#6b7280', color: 'white' }}>
                <Clock size={12} />
                Pending
            </span>
        );
    } else {
        return (
            <span className="badge badge-info">
                <Clock size={12} />
                {status}
            </span>
        );
    }
};
