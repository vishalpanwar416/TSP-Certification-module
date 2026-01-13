import { X, Download, Send } from 'lucide-react';
import { formatDateTime } from '../utils/dateUtils';

function CertificatePreviewModal({ certificate, onClose, onDownload, onSend }) {
    if (!certificate) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Certificate Details</h2>
                        <p className="modal-subtitle">{certificate.recipient_name}</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                <div className="modal-body">
                    <div className="preview-grid">
                        <div className="preview-item">
                            <label>Certificate Number</label>
                            <p className="preview-value highlight">{certificate.certificate_number}</p>
                        </div>
                        <div className="preview-item">
                            <label>Recipient Name</label>
                            <p className="preview-value">{certificate.recipient_name}</p>
                        </div>
                        {certificate.award_rera_number && (
                            <div className="preview-item">
                                <label>RERA Number</label>
                                <p className="preview-value">{certificate.award_rera_number}</p>
                            </div>
                        )}
                        {certificate.description && (
                            <div className="preview-item full-width">
                                <label>Description</label>
                                <p className="preview-value">{certificate.description}</p>
                            </div>
                        )}
                        {certificate.phone_number && (
                            <div className="preview-item">
                                <label>Phone Number</label>
                                <p className="preview-value">{certificate.phone_number}</p>
                            </div>
                        )}
                        <div className="preview-item">
                            <label>Status</label>
                            <p className="preview-value">
                                {certificate.whatsapp_sent ? (
                                    <span className="status-sent">✅ Sent via WhatsApp</span>
                                ) : (
                                    <span className="status-pending">⏳ Pending</span>
                                )}
                            </p>
                        </div>
                        <div className="preview-item">
                            <label>Created</label>
                            <p className="preview-value">{formatDateTime(certificate.created_at)}</p>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => onDownload(certificate)}>
                        <Download size={20} />
                        Download Details
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => {
                            onClose();
                            onSend(certificate);
                        }}
                    >
                        <Send size={20} />
                        Send Certificate
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CertificatePreviewModal;
