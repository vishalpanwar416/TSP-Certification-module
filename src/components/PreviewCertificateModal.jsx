import { X, Download, FileText, Loader } from 'lucide-react';
import { useState, useEffect } from 'react';
import { generateCertificateDataUrl } from '../utils/certificateGenerator';

function PreviewCertificateModal({ certificate, onClose, certificateTemplate }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (certificate) {
            generatePreview();
        }
    }, [certificate, certificateTemplate]);

    const generatePreview = async () => {
        setLoading(true);
        try {
            // For default certificate, generate preview with demo data
            if (certificate.id === 'default' || certificate.is_default) {
                // Create demo certificate data for preview
                const demoData = {
                    recipient_name: 'John Doe',
                    name: 'John Doe',
                    certificate_number: 'TSP-2024-001',
                    certificateNumber: 'TSP-2024-001',
                    award_rera_number: 'PRM/KA/RERA/1251/309/AG/250318/006037',
                    rera_awarde_no: 'PRM/KA/RERA/1251/309/AG/250318/006037',
                    professional: 'RERA CONSULTANT',
                    Professional: 'RERA CONSULTANT'
                };
                // Use uploaded template URL if available, otherwise use default
                const templateUrl = certificateTemplate?.url || certificate.pdf_url || null;
                const url = await generateCertificateDataUrl(demoData, templateUrl);
                setPreviewUrl(url);
                setLoading(false);
            } else {
                // For regular certificates, use their template if available
                const templateUrl = certificateTemplate?.url || null;
                const url = await generateCertificateDataUrl(certificate, templateUrl);
                setPreviewUrl(url);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error generating certificate preview:', error);
            setLoading(false);
        }
    };

    if (!certificate) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '1000px', width: '95%', maxHeight: '95vh' }}
            >
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            <FileText size={24} style={{ color: 'var(--primary)', marginRight: '10px' }} />
                            Certificate Preview
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            {certificate.id === 'default' || certificate.is_default ? (
                                <>Demo Preview - {certificate.name || certificate.recipient_name} - {certificate.certificate_number || certificate.certificateNumber}</>
                            ) : (
                                <>{certificate.name || certificate.recipient_name} - {certificate.certificate_number || certificate.certificateNumber}</>
                            )}
                        </p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '20px', background: '#f8f9fa' }}>
                    <div style={{
                        width: '100%',
                        background: '#fff',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        {loading ? (
                            <div style={{ padding: '100px', textAlign: 'center' }}>
                                <Loader className="spinner" size={48} />
                                <p style={{ marginTop: '20px' }}>Generating dynamic preview...</p>
                            </div>
                        ) : (
                            <img
                                src={previewUrl}
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block'
                                }}
                                alt="Certificate Preview"
                            />
                        )}
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
                    {previewUrl && (
                        <a
                            href={previewUrl}
                            className="btn btn-primary"
                            download={`Certificate_${certificate.certificate_number || certificate.certificateNumber || 'TSP'}.png`}
                        >
                            <Download size={18} />
                            Download High-Res Image
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PreviewCertificateModal;

