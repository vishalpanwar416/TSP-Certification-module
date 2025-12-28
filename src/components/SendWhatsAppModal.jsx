import { useState } from 'react';
import { X, Loader, Send } from 'lucide-react';
import { certificateAPI } from '../services/api';

function SendWhatsAppModal({ certificate, onClose, onSuccess }) {
    const [phoneNumber, setPhoneNumber] = useState(certificate.phone_number || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!phoneNumber.trim()) {
            setError('Phone number is required');
            return;
        }

        // Basic validation for phone number format
        if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('91')) {
            setError('Phone number must include country code (e.g., +919876543210)');
            return;
        }

        try {
            setLoading(true);
            await certificateAPI.sendWhatsApp(certificate.id, phoneNumber);
            alert('Certificate sent via WhatsApp successfully!');
            onSuccess();
        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Failed to send WhatsApp message';
            setError(errorMsg);

            // If WhatsApp is not configured, show helpful message
            if (errorMsg.includes('not configured')) {
                setError(
                    'WhatsApp service is not configured yet. Please set up your Twilio credentials in the backend .env file. ' +
                    'The certificate has been created and can be downloaded.'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Send via WhatsApp</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div style={{
                                background: 'rgba(244, 67, 54, 0.1)',
                                border: '1px solid rgba(244, 67, 54, 0.3)',
                                color: '#f44336',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-md)',
                                fontSize: '0.875rem',
                                lineHeight: '1.5'
                            }}>
                                {error}
                            </div>
                        )}

                        <div style={{
                            background: 'var(--bg-tertiary)',
                            padding: 'var(--spacing-md)',
                            borderRadius: 'var(--radius-md)',
                            marginBottom: 'var(--spacing-md)'
                        }}>
                            <h4 style={{ marginBottom: '0.5rem' }}>Certificate Details</h4>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                <strong>Recipient:</strong> {certificate.recipient_name}
                            </p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                <strong>Certificate #:</strong> {certificate.certificate_number}
                            </p>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="phone_number">
                                WhatsApp Number *
                            </label>
                            <input
                                type="tel"
                                id="phone_number"
                                className="form-input"
                                placeholder="+919876543210"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                required
                            />
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'block', marginTop: '0.5rem' }}>
                                Include country code (e.g., +91 for India, +1 for USA)
                            </small>
                        </div>

                        <div style={{
                            background: 'rgba(255, 215, 0, 0.1)',
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            color: '#ffd700',
                            padding: '1rem',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '0.875rem',
                            lineHeight: '1.5'
                        }}>
                            <strong>📱 Note:</strong> This will send a WhatsApp message with the certificate download link to the specified number.
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-success"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={20} />
                                    Send WhatsApp
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SendWhatsAppModal;
