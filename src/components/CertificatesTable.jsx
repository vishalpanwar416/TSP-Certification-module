import { Award, Plus, FileSpreadsheet, Eye, Download, Send, Trash2, CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

function CertificatesTable({
    certificates,
    loading,
    onPreview,
    onDownload,
    onSend,
    onDelete,
    onCreateClick,
    onExportClick
}) {
    if (loading) {
        return (
            <div className="card table-card">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading certificates...</p>
                </div>
            </div>
        );
    }

    if (certificates.length === 0) {
        return (
            <div className="card table-card">
                <div className="empty-state">
                    <div className="empty-icon">
                        <Award size={64} />
                    </div>
                    <h3>No certificates yet</h3>
                    <p>
                        Create your first certificate to get started with the marketing dashboard.
                    </p>
                    <button
                        className="btn btn-primary"
                        onClick={onCreateClick}
                    >
                        <Plus size={20} />
                        Create Your First Certificate
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="card table-card">
            <div className="card-header">
                <div className="card-header-left">
                    <h2 className="card-title">
                        <Award size={24} />
                        Certificates
                    </h2>
                    <p className="card-description">
                        Manage all {certificates.length} generated certificates
                    </p>
                </div>
                <div className="card-header-actions">
                    <button 
                        className="btn btn-outline" 
                        onClick={onExportClick} 
                        disabled={certificates.length === 0}
                    >
                        <FileSpreadsheet size={18} />
                        Export
                    </button>
                    <button className="btn btn-primary" onClick={onCreateClick}>
                        <Plus size={18} />
                        Add New
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Recipient</th>
                            <th>Certificate #</th>
                            <th>Phone</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {certificates.map((cert) => (
                            <tr key={cert.id}>
                                <td>
                                    <div className="recipient-cell">
                                        <div className="recipient-avatar">
                                            {cert.recipient_name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div className="recipient-info">
                                            <strong>{cert.recipient_name}</strong>
                                            {cert.award_rera_number && (
                                                <span className="recipient-subtext">RERA: {cert.award_rera_number}</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <code className="certificate-code">
                                        {cert.certificate_number}
                                    </code>
                                </td>
                                <td>
                                    <span className="phone-number">{cert.phone_number || '-'}</span>
                                </td>
                                <td>
                                    {cert.whatsapp_sent ? (
                                        <span className="badge badge-success">
                                            <CheckCircle size={12} />
                                            Sent
                                        </span>
                                    ) : (
                                        <span className="badge badge-warning">
                                            <Clock size={12} />
                                            Pending
                                        </span>
                                    )}
                                </td>
                                <td>
                                    <span className="date-cell">
                                        {formatDate(cert.created_at)}
                                    </span>
                                </td>
                                <td>
                                    <div className="action-buttons">
                                        <button
                                            className="action-btn action-btn-view"
                                            onClick={() => onPreview(cert)}
                                            title="Preview Certificate"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            className="action-btn action-btn-download"
                                            onClick={() => onDownload(cert)}
                                            title="Download Details"
                                        >
                                            <Download size={16} />
                                        </button>
                                        <button
                                            className="action-btn action-btn-send"
                                            onClick={() => onSend(cert)}
                                            title="Send Certificate"
                                        >
                                            <Send size={16} />
                                        </button>
                                        <button
                                            className="action-btn action-btn-delete"
                                            onClick={() => onDelete(cert.id, cert.certificate_number)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default CertificatesTable;
