import { X, Download, FileText, Loader } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { generateCertificateDataUrl } from '../utils/certificateGenerator';

function PreviewCertificateModal({ certificate, onClose, certificateTemplate }) {
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const generatePreview = useCallback(async () => {
        if (!certificate) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setPreviewUrl(null);
        setError(null);
        
        try {
            console.log('[Preview] Generating preview for certificate:', certificate.id);
            console.log('[Preview] Certificate template:', certificateTemplate);
            
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
                console.log('[Preview] Using template URL:', templateUrl);
                const url = await generateCertificateDataUrl(demoData, templateUrl);
                setPreviewUrl(url);
                setLoading(false);
            } else {
                // For regular certificates, use their template if available
                const templateUrl = certificateTemplate?.url || null;
                console.log('[Preview] Using template URL:', templateUrl);
                
                // Normalize certificate data to ensure all required fields are present
                const normalizedData = {
                    name: certificate.name || certificate.recipient_name || 'Recipient Name',
                    recipient_name: certificate.recipient_name || certificate.name || 'Recipient Name',
                    certificate_number: certificate.certificate_number || certificate.certificateNumber || '-',
                    certificateNumber: certificate.certificateNumber || certificate.certificate_number || '-',
                    award_rera_number: certificate.award_rera_number || certificate.rera_awarde_no || certificate.reraAwardeNo || '-',
                    rera_awarde_no: certificate.rera_awarde_no || certificate.award_rera_number || certificate.reraAwardeNo || '-',
                    reraAwardeNo: certificate.reraAwardeNo || certificate.award_rera_number || certificate.rera_awarde_no || '-',
                    professional: certificate.professional || certificate.Professional || 'RERA CONSULTANT',
                    Professional: certificate.Professional || certificate.professional || 'RERA CONSULTANT'
                };
                
                console.log('[Preview] Certificate data (normalized):', normalizedData);
                const url = await generateCertificateDataUrl(normalizedData, templateUrl);
                setPreviewUrl(url);
                setLoading(false);
            }
        } catch (error) {
            console.error('[Preview] Error generating certificate preview:', error);
            console.error('[Preview] Error details:', error.message, error.stack);
            setError(error.message || 'Failed to generate preview');
            setLoading(false);
            setPreviewUrl(null);
        }
    }, [certificate, certificateTemplate]);

    useEffect(() => {
        if (certificate) {
            generatePreview();
        }
    }, [certificate, certificateTemplate, generatePreview]);

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
                        ) : previewUrl ? (
                            <img
                                src={previewUrl}
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block'
                                }}
                                alt="Certificate Preview"
                                onError={(e) => {
                                    console.error('[Preview] Image failed to load:', e);
                                    setError('Failed to load preview image');
                                    setPreviewUrl(null);
                                }}
                            />
                        ) : (
                            <div style={{ padding: '100px', textAlign: 'center', color: '#666' }}>
                                <FileText size={48} style={{ marginBottom: '20px', opacity: 0.5 }} />
                                <p style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Failed to generate preview</p>
                                {error && (
                                    <p style={{ fontSize: '0.875rem', color: '#dc2626', marginBottom: '0.5rem' }}>
                                        {error}
                                    </p>
                                )}
                                <p style={{ fontSize: '0.875rem', marginTop: '10px', color: '#6b7280' }}>
                                    Please check the browser console for details
                                </p>
                                <button
                                    onClick={generatePreview}
                                    style={{
                                        marginTop: '1rem',
                                        padding: '0.5rem 1rem',
                                        backgroundColor: 'var(--primary)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Retry
                                </button>
                            </div>
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

