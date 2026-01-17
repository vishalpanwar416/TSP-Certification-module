import React from 'react';
import { X, Send, Loader } from 'lucide-react';
import './MessageSendingLoader.css';

const MessageSendingLoader = ({ 
    isVisible, 
    onClose, 
    totalMessages, 
    sentMessages, 
    failedMessages,
    onSendInBackground,
    isBackgroundMode = false,
    jobId = null
}) => {
    if (!isVisible) return null;

    const progress = totalMessages > 0 ? (sentMessages / totalMessages) * 100 : 0;
    const remaining = totalMessages - sentMessages - failedMessages;

    return (
        <div className="message-sending-loader-overlay">
            <div className="message-sending-loader-modal">
                <div className="message-sending-loader-header">
                    <div className="message-sending-loader-title">
                        <Loader size={24} className="spinning-loader" />
                        <h2>
                            {isBackgroundMode ? 'Sending in Background' : 'Sending Messages'}
                        </h2>
                    </div>
                    {!isBackgroundMode && (
                        <button 
                            className="message-sending-loader-close"
                            onClick={onClose}
                            title="Close (sending will continue in background)"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="message-sending-loader-content">
                    <div className="message-sending-progress-section">
                        <div className="message-sending-progress-bar-container">
                            <div 
                                className="message-sending-progress-bar"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="message-sending-stats">
                            <div className="message-sending-stat-item">
                                <span className="stat-label">Total:</span>
                                <span className="stat-value">{totalMessages}</span>
                            </div>
                            <div className="message-sending-stat-item success">
                                <span className="stat-label">Sent:</span>
                                <span className="stat-value">{sentMessages}</span>
                            </div>
                            {failedMessages > 0 && (
                                <div className="message-sending-stat-item error">
                                    <span className="stat-label">Failed:</span>
                                    <span className="stat-value">{failedMessages}</span>
                                </div>
                            )}
                            {remaining > 0 && (
                                <div className="message-sending-stat-item pending">
                                    <span className="stat-label">Remaining:</span>
                                    <span className="stat-value">{remaining}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {!isBackgroundMode && (
                        <div className="message-sending-actions">
                            <button
                                className="btn-send-background"
                                onClick={onSendInBackground}
                            >
                                <Send size={18} />
                                Send in Background
                            </button>
                            <p className="message-sending-hint">
                                You can continue working while messages are being sent
                            </p>
                        </div>
                    )}

                    {isBackgroundMode && (
                        <div className="message-sending-background-info">
                            <p>
                                Messages are being sent in the background. 
                                You can close this window and continue working.
                            </p>
                            {jobId && (
                                <p className="job-id-hint">
                                    Job ID: {jobId}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageSendingLoader;
