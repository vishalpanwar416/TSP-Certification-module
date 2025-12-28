import { useState, useEffect } from 'react';
import {
    Award,
    Send,
    Download,
    Trash2,
    Eye,
    Plus,
    CheckCircle,
    Clock,
    FileText,
    LogOut,
    FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { certificateAPI } from '../services/api';
import CreateCertificateModal from './CreateCertificateModal';
import SendWhatsAppModal from './SendWhatsAppModal';
import PreviewCertificateModal from './PreviewCertificateModal';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
    const { logout, user } = useAuth();
    const [certificates, setCertificates] = useState([]);
    const [stats, setStats] = useState({ total: 0, whatsapp_sent: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    // Fetch certificates
    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const response = await certificateAPI.getAll();
            // API service now returns the data directly (already unwrapped)
            const certificates = Array.isArray(response) ? response : [];
            setCertificates(certificates);
        } catch (error) {
            console.error('Error fetching certificates:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to load certificates';
            const detailedMessage = `Failed to load certificates: ${errorMessage}\n\nMake sure the backend server is running on http://localhost:5000`;
            alert(detailedMessage);
        } finally {
            setLoading(false);
        }
    };

    // Fetch statistics
    const fetchStats = async () => {
        try {
            const response = await certificateAPI.getStats();
            // API service now returns the data directly (already unwrapped)
            const statsData = response || {};
            setStats({
                total: statsData.total || 0,
                whatsapp_sent: statsData.whatsapp_sent || 0,
                pending: statsData.pending || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            // Don't show alert for stats, just log the error
        }
    };

    useEffect(() => {
        fetchCertificates();
        fetchStats();
    }, []);

    // Handle create certificate
    const handleCreateSuccess = () => {
        setShowCreateModal(false);
        fetchCertificates();
        fetchStats();
    };

    // Handle send WhatsApp
    const handleSendWhatsApp = (certificate) => {
        setSelectedCertificate(certificate);
        setShowWhatsAppModal(true);
    };

    const handleWhatsAppSuccess = () => {
        setShowWhatsAppModal(false);
        setSelectedCertificate(null);
        fetchCertificates();
        fetchStats();
    };

    // Handle delete
    const handleDelete = async (id, certificateNumber) => {
        if (!window.confirm(`Are you sure you want to delete certificate ${certificateNumber}?`)) {
            return;
        }

        try {
            await certificateAPI.delete(id);
            alert('Certificate deleted successfully!');
            fetchCertificates();
            fetchStats();
        } catch (error) {
            console.error('Error deleting certificate:', error);
            alert('Failed to delete certificate');
        }
    };

    // Handle download
    const handleDownload = (id) => {
        window.open(certificateAPI.downloadUrl(id), '_blank');
    };

    // Handle preview
    const handlePreview = (certificate) => {
        setSelectedCertificate(certificate);
        setShowPreviewModal(true);
    };

    const handlePreviewClose = () => {
        setShowPreviewModal(false);
        setSelectedCertificate(null);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Export to Excel
    const handleExportToExcel = () => {
        if (certificates.length === 0) {
            alert('No certificates to export');
            return;
        }

        try {
            // Prepare data with only the required fields
            const excelData = certificates.map(cert => ({
                'Name': cert.recipient_name || '',
                'RERA Awarde No.': cert.award_rera_number || '',
                'Certificate Number': cert.certificate_number || '',
                'Professional': cert.description || '' // Using description as Professional field
            }));

            // Create workbook and worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificates');

            // Set column widths
            const columnWidths = [
                { wch: 30 }, // Name
                { wch: 20 }, // RERA Awarde No.
                { wch: 20 }, // Certificate Number
                { wch: 40 }  // Professional
            ];
            worksheet['!cols'] = columnWidths;

            // Generate filename with current date
            const date = new Date().toISOString().split('T')[0];
            const filename = `Certificates_${date}.xlsx`;

            // Download the file
            XLSX.writeFile(workbook, filename);
            
            alert(`Exported ${certificates.length} certificate(s) to ${filename}`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export to Excel. Please try again.');
        }
    };

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard-header" style={{
                background: 'var(--gradient-primary)',
                boxShadow: 'var(--shadow-md)',
                marginBottom: '2rem'
            }}>
                <div className="container">
                    <div className="flex-between" style={{ padding: '1.5rem 0' }}>
                        <div>
                            <div style={{
                                fontSize: '0.875rem',
                                color: 'rgba(255,255,255,0.9)',
                                fontWeight: '600',
                                letterSpacing: '1px',
                                marginBottom: '0.5rem'
                            }}>
                                TOP SELLING PROPERTIES
                            </div>
                            <h1 style={{
                                marginBottom: '0.25rem',
                                color: 'white',
                                fontSize: '1.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Award size={32} />
                                Certification Module
                            </h1>
                            <p style={{
                                color: 'rgba(255,255,255,0.8)',
                                fontSize: '0.875rem'
                            }}>
                                {user?.email || 'Logged in'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <button
                                className="btn"
                                style={{
                                    background: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    fontWeight: '600',
                                    padding: '0.75rem 1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                                onClick={handleExportToExcel}
                                title="Export to Excel"
                                disabled={certificates.length === 0}
                            >
                                <FileSpreadsheet size={20} />
                                Export Excel
                            </button>
                            <button
                                className="btn"
                                style={{
                                    background: 'white',
                                    color: 'var(--primary)',
                                    fontWeight: 'bold',
                                    padding: '0.75rem 2rem'
                                }}
                                onClick={() => setShowCreateModal(true)}
                            >
                                <Plus size={20} />
                                Create Certificate
                            </button>
                            <button
                                className="btn btn-secondary"
                                style={{
                                    padding: '0.75rem 1.5rem'
                                }}
                                onClick={handleLogout}
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container" style={{ paddingBottom: '3rem' }}>
                {/* Statistics */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon">
                            <FileText size={24} color="white" />
                        </div>
                        <div className="stat-value">{stats.total}</div>
                        <div className="stat-label">Total Certificates</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--gradient-accent)' }}>
                            <CheckCircle size={24} color="#333" />
                        </div>
                        <div className="stat-value">{stats.whatsapp_sent}</div>
                        <div className="stat-label">Sent via WhatsApp</div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'var(--gradient-secondary)' }}>
                            <Clock size={24} color="white" />
                        </div>
                        <div className="stat-value">{stats.pending}</div>
                        <div className="stat-label">Pending Delivery</div>
                    </div>
                </div>

                {/* Certificates Table */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Certificates</h2>
                        <p className="card-description">
                            Manage all generated certificates
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex-center" style={{ padding: '3rem' }}>
                            <div className="spinner"></div>
                        </div>
                    ) : certificates.length === 0 ? (
                        <div className="text-center" style={{ padding: '3rem' }}>
                            <Award size={64} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
                            <h3>No certificates yet</h3>
                            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Create your first certificate to get started
                            </p>
                            <button
                                className="btn btn-primary mt-md"
                                onClick={() => setShowCreateModal(true)}
                            >
                                <Plus size={20} />
                                Create Certificate
                            </button>
                        </div>
                    ) : (
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
                                                <strong>{cert.recipient_name}</strong>
                                            </td>
                                            <td>
                                                <code style={{
                                                    background: 'var(--bg-tertiary)',
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.875rem',
                                                    color: 'var(--text-primary)'
                                                }}>
                                                    {cert.certificate_number}
                                                </code>
                                            </td>
                                            <td>{cert.phone_number || '-'}</td>
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
                                                {new Date(cert.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div className="flex gap-sm">
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.5rem' }}
                                                        onClick={() => handlePreview(cert)}
                                                        title="Preview Certificate"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-secondary"
                                                        style={{ padding: '0.5rem' }}
                                                        onClick={() => handleDownload(cert.id)}
                                                        title="Download PDF"
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-success"
                                                        style={{ padding: '0.5rem' }}
                                                        onClick={() => handleSendWhatsApp(cert)}
                                                        title="Send via WhatsApp"
                                                    >
                                                        <Send size={16} />
                                                    </button>
                                                    <button
                                                        className="btn btn-danger"
                                                        style={{ padding: '0.5rem' }}
                                                        onClick={() => handleDelete(cert.id, cert.certificate_number)}
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
                    )}
                </div>
            </main>

            {/* Modals */}
            {showCreateModal && (
                <CreateCertificateModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={handleCreateSuccess}
                />
            )}

            {showWhatsAppModal && selectedCertificate && (
                <SendWhatsAppModal
                    certificate={selectedCertificate}
                    onClose={() => {
                        setShowWhatsAppModal(false);
                        setSelectedCertificate(null);
                    }}
                    onSuccess={handleWhatsAppSuccess}
                />
            )}

            {showPreviewModal && selectedCertificate && (
                <div className="modal-overlay" onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedCertificate(null);
                }}>
                    <div className="modal" style={{ maxWidth: '90vw', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Preview Certificate</h2>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                                    {selectedCertificate.recipient_name} - {selectedCertificate.certificate_number}
                                </p>
                            </div>
                            <button
                                className="modal-close"
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    setSelectedCertificate(null);
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body" style={{ padding: 0, height: '75vh' }}>
                            <iframe
                                src={certificateAPI.getPdfUrl(selectedCertificate.id)}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    border: 'none',
                                    borderRadius: '0 0 var(--radius-xl) var(--radius-xl)'
                                }}
                                title="Certificate Preview"
                            />
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleDownload(selectedCertificate.id)}
                            >
                                <Download size={20} />
                                Download PDF
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={() => {
                                    setShowPreviewModal(false);
                                    handleSendWhatsApp(selectedCertificate);
                                }}
                            >
                                <Send size={20} />
                                Send via WhatsApp
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
