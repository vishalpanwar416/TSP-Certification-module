import React from 'react';
import { Send, X } from 'lucide-react';
import './BackgroundJobsNotification.css';

const BackgroundJobsNotification = ({ 
    backgroundJobs, 
    onJobClick,
    onClose
}) => {
    if (!backgroundJobs || backgroundJobs.length === 0) return null;

    const totalRemaining = backgroundJobs.reduce((sum, job) => {
        const remaining = job.totalMessages - job.sentMessages - job.failedMessages;
        return sum + Math.max(0, remaining);
    }, 0);

    if (totalRemaining === 0) return null;

    return (
        <div className="background-jobs-notification">
            <button
                className="background-jobs-notification-btn"
                onClick={onJobClick}
                title={`${totalRemaining} certificate${totalRemaining !== 1 ? 's' : ''} sending in background`}
            >
                <Send size={18} />
                {totalRemaining > 0 && (
                    <span className="background-jobs-badge">
                        {totalRemaining > 99 ? '99+' : totalRemaining}
                    </span>
                )}
            </button>
        </div>
    );
};

export default BackgroundJobsNotification;
