import { useState } from 'react';
import { X, Loader } from 'lucide-react';
import { certificateAPI } from '../services/api';

function CreateCertificateModal({ onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        recipient_name: '',
        certificate_number: '',
        award_rera_number: '',
        description: '',
        phone_number: '',
        email: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.recipient_name.trim()) {
            setError('Recipient name is required');
            return;
        }

        if (!formData.certificate_number.trim()) {
            setError('Certificate number is required');
            return;
        }

        try {
            setLoading(true);
            await certificateAPI.create(formData);
            alert('Certificate created successfully!');
            onSuccess();
        } catch (error) {
            console.error('Error creating certificate:', error);
            const errorMsg = error.response?.data?.error || error.response?.data?.details || 'Failed to create certificate';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">Create New Certificate</h2>
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
                                marginBottom: 'var(--spacing-md)'
                            }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="recipient_name">
                                Recipient Name *
                            </label>
                            <input
                                type="text"
                                id="recipient_name"
                                name="recipient_name"
                                className="form-input"
                                placeholder="e.g., MS. Essotto Private Limited"
                                value={formData.recipient_name}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="certificate_number">
                                Certificate Number *
                            </label>
                            <input
                                type="text"
                                id="certificate_number"
                                name="certificate_number"
                                className="form-input"
                                placeholder="e.g., TSP7760987777123456"
                                value={formData.certificate_number}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="award_rera_number">
                                Award RERA Number
                            </label>
                            <input
                                type="text"
                                id="award_rera_number"
                                name="award_rera_number"
                                className="form-input"
                                placeholder="e.g., PRM/KA/RERA/1251/309/AG/250820/006037"
                                value={formData.award_rera_number}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="description">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                className="form-textarea"
                                placeholder="Certificate description (leave empty for default)"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                            />
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Leave empty to use the default appreciation message
                            </small>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="phone_number">
                                Phone Number (with country code)
                            </label>
                            <input
                                type="tel"
                                id="phone_number"
                                name="phone_number"
                                className="form-input"
                                placeholder="e.g., +919876543210"
                                value={formData.phone_number}
                                onChange={handleChange}
                            />
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                Include country code for WhatsApp (e.g., +91 for India)
                            </small>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="email">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="form-input"
                                placeholder="e.g., recipient@example.com"
                                value={formData.email}
                                onChange={handleChange}
                            />
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
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader size={20} className="spinner" style={{ animation: 'spin 1s linear infinite' }} />
                                    Creating...
                                </>
                            ) : (
                                'Create Certificate'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateCertificateModal;
