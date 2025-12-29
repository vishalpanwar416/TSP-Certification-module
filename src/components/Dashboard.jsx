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
    FileSpreadsheet,
    X,
    Home,
    Settings,
    Users,
    BarChart3,
    Bell,
    Search,
    Menu,
    ChevronLeft,
    HelpCircle,
    Calendar
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
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarPinned, setSidebarPinned] = useState(true); // true = sidebar stays open, false = sidebar stays collapsed
    const [sidebarHovered, setSidebarHovered] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch certificates
    const fetchCertificates = async () => {
        try {
            setLoading(true);
            const response = await certificateAPI.getAll();
            const certificates = Array.isArray(response) ? response : [];
            setCertificates(certificates);
        } catch (error) {
            console.error('Error fetching certificates:', error);
            const errorMessage = error.message || 'Failed to load certificates';
            alert(`Failed to load certificates: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    // Fetch statistics
    const fetchStats = async () => {
        try {
            const response = await certificateAPI.getStats();
            const statsData = response || {};
            setStats({
                total: statsData.total || 0,
                whatsapp_sent: statsData.whatsapp_sent || 0,
                pending: statsData.pending || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    useEffect(() => {
        fetchCertificates();
        fetchStats();
    }, []);

    // Filter certificates based on search
    const filteredCertificates = certificates.filter(cert =>
        cert.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.certificate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.phone_number?.includes(searchQuery)
    );

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
    const handleDownload = (certificate) => {
        const content = `Certificate Details\n==================\nRecipient: ${certificate.recipient_name}\nCertificate Number: ${certificate.certificate_number}\nRERA Number: ${certificate.award_rera_number || 'N/A'}\nDescription: ${certificate.description || 'N/A'}\nPhone: ${certificate.phone_number || 'N/A'}\nStatus: ${certificate.whatsapp_sent ? 'Sent' : 'Pending'}\nCreated: ${new Date(certificate.created_at).toLocaleDateString()}`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificate.certificate_number}.txt`;
        a.click();
        URL.revokeObjectURL(url);
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
            const excelData = certificates.map(cert => ({
                'Name': cert.recipient_name || '',
                'RERA Awarde No.': cert.award_rera_number || '',
                'Certificate Number': cert.certificate_number || '',
                'Professional': cert.description || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificates');

            const columnWidths = [
                { wch: 30 },
                { wch: 20 },
                { wch: 20 },
                { wch: 40 }
            ];
            worksheet['!cols'] = columnWidths;

            const date = new Date().toISOString().split('T')[0];
            const filename = `Certificates_${date}.xlsx`;

            XLSX.writeFile(workbook, filename);
            alert(`Exported ${certificates.length} certificate(s) to ${filename}`);
        } catch (error) {
            console.error('Error exporting to Excel:', error);
            alert('Failed to export to Excel. Please try again.');
        }
    };

    // Navigation items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'certificates', label: 'Certificates', icon: Award },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'users', label: 'Recipients', icon: Users },
        { id: 'calendar', label: 'Schedule', icon: Calendar },
    ];

    const bottomNavItems = [
        { id: 'settings', label: 'Settings', icon: Settings },
        { id: 'help', label: 'Help & Support', icon: HelpCircle },
    ];

    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}
                onMouseEnter={() => {
                    if (sidebarCollapsed && !sidebarPinned) {
                        setSidebarCollapsed(false);
                    }
                }}
                onMouseLeave={() => {
                    if (!sidebarPinned) {
                        setSidebarCollapsed(true);
                    }
                }}
            >
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img
                            src="/logo.svg"
                            alt="TSP Logo"
                            className="logo-image"
                        />
                        {!sidebarCollapsed && (
                            <div className="sidebar-brand-container">
                                <span className="sidebar-brand">TSP Certs</span>
                                <span className="sidebar-brand-sub">Certification Module</span>
                            </div>
                        )}
                    </div>
                    <button
                        className="sidebar-toggle"
                        onClick={() => {
                            const newCollapsed = !sidebarCollapsed;
                            setSidebarCollapsed(newCollapsed);
                            setSidebarPinned(!newCollapsed); // Pin open when expanded, unpin when collapsed
                        }}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <ChevronLeft size={18} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        {!sidebarCollapsed && <span className="nav-section-title">Main Menu</span>}
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(item.id)}
                                title={sidebarCollapsed ? item.label : ''}
                            >
                                <item.icon size={20} />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="nav-section">
                        {!sidebarCollapsed && <span className="nav-section-title">Support</span>}
                        {bottomNavItems.map((item) => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(item.id)}
                                title={sidebarCollapsed ? item.label : ''}
                            >
                                <item.icon size={20} />
                                {!sidebarCollapsed && <span>{item.label}</span>}
                            </button>
                        ))}
                    </div>

                    <div className="user-profile-section">
                        <div className="user-avatar">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {!sidebarCollapsed && (
                            <div className="user-info">
                                <span className="user-name">{user?.email?.split('@')[0] || 'User'}</span>
                                <span className="user-email">{user?.email || 'admin@tsp.com'}</span>
                            </div>
                        )}
                        <button
                            className="logout-btn"
                            onClick={handleLogout}
                            title="Logout"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Main Content */}
            <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Header */}
                <header className="main-header">
                    <div className="header-left">
                        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div className="header-title-section">
                            <h1 className="header-title">
                                {activeTab === 'dashboard' ? 'Dashboard' :
                                    activeTab === 'certificates' ? 'Certificates' :
                                        activeTab === 'analytics' ? 'Analytics' :
                                            activeTab === 'users' ? 'Recipients' :
                                                activeTab === 'calendar' ? 'Schedule' :
                                                    activeTab === 'settings' ? 'Settings' :
                                                        'Help & Support'}
                            </h1>
                            <p className="header-subtitle">{currentDate}</p>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="header-search">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search certificates..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <button className="header-icon-btn notification-btn">
                            <Bell size={20} />
                            {stats.pending > 0 && (
                                <span className="notification-badge">{stats.pending > 9 ? '9+' : stats.pending}</span>
                            )}
                        </button>

                        <button
                            className="btn btn-primary create-btn"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <Plus size={18} />
                            <span>New Certificate</span>
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <main className="content-area">
                    {/* Quick Actions Banner */}
                    <div className="welcome-banner">
                        <div className="banner-content">
                            <div className="banner-text">
                                <h2>Welcome back! 👋</h2>
                                <p>Manage your certificates, track deliveries, and export reports all in one place.</p>
                            </div>
                            <div className="banner-actions">
                                <button className="btn btn-light" onClick={handleExportToExcel} disabled={certificates.length === 0}>
                                    <FileSpreadsheet size={18} />
                                    Export Excel
                                </button>
                                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                    <Plus size={18} />
                                    Create Certificate
                                </button>
                            </div>
                        </div>
                        <div className="banner-decoration"></div>
                    </div>

                    {/* Statistics */}
                    <div className="stats-grid">
                        <div className="stat-card stat-card-primary">
                            <div className="stat-card-content">
                                <div className="stat-info">
                                    <span className="stat-label">Total Certificates</span>
                                    <span className="stat-value">{stats.total}</span>
                                    <span className="stat-change positive">
                                        <BarChart3 size={14} />
                                        All time
                                    </span>
                                </div>
                                <div className="stat-icon-wrapper stat-icon-primary">
                                    <FileText size={24} />
                                </div>
                            </div>
                            <div className="stat-progress">
                                <div className="stat-progress-bar" style={{ width: '100%' }}></div>
                            </div>
                        </div>

                        <div className="stat-card stat-card-success">
                            <div className="stat-card-content">
                                <div className="stat-info">
                                    <span className="stat-label">Sent via WhatsApp</span>
                                    <span className="stat-value">{stats.whatsapp_sent}</span>
                                    <span className="stat-change positive">
                                        <CheckCircle size={14} />
                                        Delivered
                                    </span>
                                </div>
                                <div className="stat-icon-wrapper stat-icon-success">
                                    <CheckCircle size={24} />
                                </div>
                            </div>
                            <div className="stat-progress">
                                <div className="stat-progress-bar success" style={{ width: stats.total > 0 ? `${(stats.whatsapp_sent / stats.total) * 100}%` : '0%' }}></div>
                            </div>
                        </div>

                        <div className="stat-card stat-card-warning">
                            <div className="stat-card-content">
                                <div className="stat-info">
                                    <span className="stat-label">Pending Delivery</span>
                                    <span className="stat-value">{stats.pending}</span>
                                    <span className="stat-change warning">
                                        <Clock size={14} />
                                        Awaiting
                                    </span>
                                </div>
                                <div className="stat-icon-wrapper stat-icon-warning">
                                    <Clock size={24} />
                                </div>
                            </div>
                            <div className="stat-progress">
                                <div className="stat-progress-bar warning" style={{ width: stats.total > 0 ? `${(stats.pending / stats.total) * 100}%` : '0%' }}></div>
                            </div>
                        </div>

                        <div className="stat-card stat-card-info">
                            <div className="stat-card-content">
                                <div className="stat-info">
                                    <span className="stat-label">Delivery Rate</span>
                                    <span className="stat-value">
                                        {stats.total > 0 ? Math.round((stats.whatsapp_sent / stats.total) * 100) : 0}%
                                    </span>
                                    <span className="stat-change positive">
                                        <BarChart3 size={14} />
                                        Success rate
                                    </span>
                                </div>
                                <div className="stat-icon-wrapper stat-icon-info">
                                    <BarChart3 size={24} />
                                </div>
                            </div>
                            <div className="stat-progress">
                                <div className="stat-progress-bar info" style={{ width: stats.total > 0 ? `${(stats.whatsapp_sent / stats.total) * 100}%` : '0%' }}></div>
                            </div>
                        </div>
                    </div>

                    {/* Certificates Table */}
                    <div className="card table-card">
                        <div className="card-header">
                            <div className="card-header-left">
                                <h2 className="card-title">
                                    <Award size={24} />
                                    Certificates
                                </h2>
                                <p className="card-description">
                                    {searchQuery
                                        ? `Showing ${filteredCertificates.length} of ${certificates.length} certificates`
                                        : `Manage all ${certificates.length} generated certificates`
                                    }
                                </p>
                            </div>
                            <div className="card-header-actions">
                                <button className="btn btn-outline" onClick={handleExportToExcel} disabled={certificates.length === 0}>
                                    <FileSpreadsheet size={18} />
                                    Export
                                </button>
                                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                                    <Plus size={18} />
                                    Add New
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                                <p>Loading certificates...</p>
                            </div>
                        ) : filteredCertificates.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <Award size={64} />
                                </div>
                                <h3>{searchQuery ? 'No certificates found' : 'No certificates yet'}</h3>
                                <p>
                                    {searchQuery
                                        ? `No certificates match "${searchQuery}". Try a different search term.`
                                        : 'Create your first certificate to get started with the certification module.'
                                    }
                                </p>
                                {!searchQuery && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setShowCreateModal(true)}
                                    >
                                        <Plus size={20} />
                                        Create Your First Certificate
                                    </button>
                                )}
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
                                        {filteredCertificates.map((cert) => (
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
                                                        {new Date(cert.created_at).toLocaleDateString()}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button
                                                            className="action-btn action-btn-view"
                                                            onClick={() => handlePreview(cert)}
                                                            title="Preview Certificate"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn action-btn-download"
                                                            onClick={() => handleDownload(cert)}
                                                            title="Download Details"
                                                        >
                                                            <Download size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn action-btn-send"
                                                            onClick={() => handleSendWhatsApp(cert)}
                                                            title="Send via WhatsApp"
                                                        >
                                                            <Send size={16} />
                                                        </button>
                                                        <button
                                                            className="action-btn action-btn-delete"
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
            </div>

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
                    <div className="modal preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Certificate Details</h2>
                                <p className="modal-subtitle">{selectedCertificate.recipient_name}</p>
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
                        <div className="modal-body">
                            <div className="preview-grid">
                                <div className="preview-item">
                                    <label>Certificate Number</label>
                                    <p className="preview-value highlight">{selectedCertificate.certificate_number}</p>
                                </div>
                                <div className="preview-item">
                                    <label>Recipient Name</label>
                                    <p className="preview-value">{selectedCertificate.recipient_name}</p>
                                </div>
                                {selectedCertificate.award_rera_number && (
                                    <div className="preview-item">
                                        <label>RERA Number</label>
                                        <p className="preview-value">{selectedCertificate.award_rera_number}</p>
                                    </div>
                                )}
                                {selectedCertificate.description && (
                                    <div className="preview-item full-width">
                                        <label>Description</label>
                                        <p className="preview-value">{selectedCertificate.description}</p>
                                    </div>
                                )}
                                {selectedCertificate.phone_number && (
                                    <div className="preview-item">
                                        <label>Phone Number</label>
                                        <p className="preview-value">{selectedCertificate.phone_number}</p>
                                    </div>
                                )}
                                <div className="preview-item">
                                    <label>Status</label>
                                    <p className="preview-value">
                                        {selectedCertificate.whatsapp_sent ? (
                                            <span className="status-sent">✅ Sent via WhatsApp</span>
                                        ) : (
                                            <span className="status-pending">⏳ Pending</span>
                                        )}
                                    </p>
                                </div>
                                <div className="preview-item">
                                    <label>Created</label>
                                    <p className="preview-value">{new Date(selectedCertificate.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleDownload(selectedCertificate)}
                            >
                                <Download size={20} />
                                Download Details
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
