import { X } from 'lucide-react';
import { certificateAPI } from '../services/api';

function PreviewCertificateModal({ certificate, onClose }) {
    if (!certificate) return null;

    const pdfUrl = certificateAPI.getPdfUrl(certificate.id);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '1100px', width: '95%', maxHeight: '95vh' }}
            >
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Certificate Preview</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            {certificate.recipient_name} - {certificate.certificate_number}
                        </p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: 0 }}>
                    <div style={{
                        width: '100%',
                        height: '70vh',
                        background: '#f5f5f5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }}>
                        <iframe
                            src={pdfUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                border: 'none'
                            }}
                            title="Certificate Preview"
                        />
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                    <a
                        href={certificateAPI.downloadUrl(certificate.id)}
                        className="btn btn-primary"
                        download
                    >
                        📥 Download PDF
                    </a>
                </div>
            </div>
        </div>
    );
}

export default PreviewCertificateModal;
