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
    FileText
} from 'lucide-react';
import { certificateAPI } from '../services/api';
import CreateCertificateModal from './CreateCertificateModal';
import SendWhatsAppModal from './SendWhatsAppModal';

function Dashboard() {
    const [certificates, setCertificates] = useState([]);
    const [stats, setStats] = useState({ total: 0, whatsapp_sent: 0, pending: 0 });
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState(null);

    // Fetch certificates
    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const response = await certificateAPI.getAll();
            setCertificates(response.data || []);
        } catch (error) {
            console.error('Error fetching certificates:', error);
            alert('Failed to load certificates');
        } finally {
            setLoading(false);
        }
    };

    // Fetch statistics
    const fetchStats = async () => {
        try {
            const response = await certificateAPI.getStats();
            setStats(response.data || { total: 0, whatsapp_sent: 0, pending: 0 });
        } catch (error) {
            console.error('Error fetching stats:', error);
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

    // Handle view
    const handleView = (id) => {
        window.open(certificateAPI.getPdfUrl(id), '_blank');
    };

    return (
        <div className="dashboard">
            {/* Header */}
            <header className="dashboard-header">
                <div className="container">
                    <div className="flex-between" style={{ padding: '2rem 0' }}>
                        <div>
                            <h1 style={{ marginBottom: '0.5rem' }}>
                                <Award style={{ display: 'inline', marginRight: '0.5rem' }} />
                                Certificate Generator
                            </h1>
                            <p style={{ color: 'var(--text-muted)' }}>
                                Create, manage, and send certificates via WhatsApp
                            </p>
                        </div>
                        <button
                            className="btn btn-primary"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={20} />
                            Create Certificate
                        </button>
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
                                                    fontSize: '0.875rem'
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
                                                        onClick={() => handleView(cert.id)}
                                                        title="View Certificate"
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
        </div>
    );
}

export default Dashboard;
