import { useState, useEffect } from 'react';
import {
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
    Users,
    BarChart3,
    Bell,
    Search,
    Menu,
    ChevronLeft,
    Mail,
    MessageCircle,
    Upload,
    Filter,
    MoreVertical,
    Edit,
    Copy,
    Zap,
    TrendingUp,
    UserPlus,
    Phone,
    AtSign,
    FileUp,
    Check,
    AlertCircle,
    Layers,
    Calendar,
    Save,
    BookOpen,
    ExternalLink
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/marketingService';
import messagingService from '../services/messagingService';
import PreviewCertificateModal from './PreviewCertificateModal';

// Contact Upload Modal Component
function ContactUploadModal({ onClose, onUpload }) {
    const [dragActive, setDragActive] = useState(false);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState([]);
    const [uploading, setUploading] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                // Show first 5 rows as preview
                setPreview(jsonData.slice(0, 5));
                setFile({ name: file.name, data: jsonData, totalRows: jsonData.length });
            } catch (error) {
                alert('Error reading file. Please ensure it\'s a valid Excel file.');
                console.error(error);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        try {
            await onUpload(file.data);
            onClose();
        } catch (error) {
            // Error is handled by the onUpload callback (handleContactUpload)
            console.error('Upload component error:', error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal upload-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Upload Contacts</h2>
                        <p className="modal-subtitle">Import contacts from Excel file</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                <div className="modal-body">
                    <div
                        className={`upload-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        {!file ? (
                            <>
                                <div className="upload-icon">
                                    <FileUp size={48} />
                                </div>
                                <h3>Drop your Excel file here</h3>
                                <p>or click to browse</p>
                                <input
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileInput}
                                    className="file-input-hidden"
                                />
                                <p className="upload-hint">Supports .xlsx, .xls, .csv files</p>
                            </>
                        ) : (
                            <div className="file-preview-info">
                                <div className="file-icon">
                                    <FileSpreadsheet size={32} />
                                </div>
                                <div className="file-details">
                                    <h4>{file.name}</h4>
                                    <p>{file.totalRows} contacts found</p>
                                </div>
                                <button className="btn btn-outline btn-sm" onClick={() => { setFile(null); setPreview([]); }}>
                                    Change File
                                </button>
                            </div>
                        )}
                    </div>

                    {preview.length > 0 && (
                        <div className="preview-section">
                            <h4>Preview (First 5 rows)</h4>
                            <div className="preview-table-container">
                                <table className="preview-table">
                                    <thead>
                                        <tr>
                                            {Object.keys(preview[0]).map((key) => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((row, index) => (
                                            <tr key={index}>
                                                {Object.values(row).map((value, i) => (
                                                    <td key={i}>{String(value)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="column-mapping">
                        <h4>Expected Columns</h4>
                        <div className="expected-columns">
                            <span className="column-tag"><Users size={14} /> Name</span>
                            <span className="column-tag"><FileText size={14} /> RERA Awarde No.</span>
                            <span className="column-tag"><FileText size={14} /> Certificate Number</span>
                            <span className="column-tag"><FileText size={14} /> Professional</span>
                            <span className="column-tag"><AtSign size={14} /> Email</span>
                            <span className="column-tag"><Phone size={14} /> Phone</span>
                        </div>
                        <p className="mapping-hint">Your Excel file should have columns for: Name, RERA Awarde No., Certificate Number, Professional, Email, and Phone number.</p>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleUpload}
                        disabled={!file || uploading}
                    >
                        {uploading ? (
                            <>
                                <span className="btn-spinner"></span>
                                Uploading...
                            </>
                        ) : (
                            <>
                                <Upload size={18} />
                                Import {file?.totalRows || 0} Contacts
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Campaign Compose Modal
function ComposeModal({ type, contacts, onClose, onSend }) {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredContacts = contacts.filter(contact =>
        contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone?.includes(searchQuery)
    );

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedContacts([]);
        } else {
            setSelectedContacts(filteredContacts.map(c => c.id));
        }
        setSelectAll(!selectAll);
    };

    const handleContactToggle = (contactId) => {
        setSelectedContacts(prev =>
            prev.includes(contactId)
                ? prev.filter(id => id !== contactId)
                : [...prev, contactId]
        );
    };

    const handleSend = async () => {
        if (selectedContacts.length === 0) {
            alert('Please select at least one contact');
            return;
        }
        if (!message.trim()) {
            alert('Please enter a message');
            return;
        }
        if (type === 'email' && !subject.trim()) {
            alert('Please enter a subject for email');
            return;
        }

        setSending(true);
        try {
            await onSend({
                type,
                subject,
                message,
                contactIds: selectedContacts
            });
            onClose();
        } catch (error) {
            alert('Failed to send messages');
        } finally {
            setSending(false);
        }
    };

    const isEmail = type === 'email';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal compose-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            {isEmail ? <Mail size={24} /> : <MessageCircle size={24} />}
                            {isEmail ? 'Compose Email' : 'Compose WhatsApp Message'}
                        </h2>
                        <p className="modal-subtitle">Send bulk {isEmail ? 'emails' : 'WhatsApp messages'} to your contacts</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                <div className="modal-body compose-body">
                    <div className="compose-left">
                        <h4>Select Recipients</h4>
                        <div className="recipient-search">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search contacts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="recipient-actions">
                            <label className="select-all-label">
                                <input
                                    type="checkbox"
                                    checked={selectAll}
                                    onChange={handleSelectAll}
                                />
                                Select All ({filteredContacts.length})
                            </label>
                            <span className="selected-count">
                                {selectedContacts.length} selected
                            </span>
                        </div>
                        <div className="recipient-list">
                            {filteredContacts.map(contact => (
                                <div
                                    key={contact.id}
                                    className={`recipient-item ${selectedContacts.includes(contact.id) ? 'selected' : ''}`}
                                    onClick={() => handleContactToggle(contact.id)}
                                >
                                    <div className="recipient-checkbox">
                                        {selectedContacts.includes(contact.id) && <Check size={14} />}
                                    </div>
                                    <div className="recipient-avatar">
                                        {contact.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div className="recipient-details">
                                        <span className="recipient-name">{contact.name || 'Unknown'}</span>
                                        <span className="recipient-contact">
                                            {isEmail ? contact.email : contact.phone}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="compose-right">
                        <h4>Message</h4>
                        {isEmail && (
                            <div className="form-group">
                                <label>Subject</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter email subject..."
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label>Message Body</label>
                            <textarea
                                className="form-textarea"
                                placeholder={`Type your ${isEmail ? 'email' : 'WhatsApp'} message here...`}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={isEmail ? 12 : 8}
                            />
                        </div>
                        <div className="personalization-hint">
                            <Zap size={16} />
                            <span>Use <code>{'{{name}}'}</code> to personalize with recipient's name</span>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSend}
                        disabled={sending || selectedContacts.length === 0}
                    >
                        {sending ? (
                            <>
                                <span className="btn-spinner"></span>
                                Sending...
                            </>
                        ) : (
                            <>
                                <Send size={18} />
                                Send to {selectedContacts.length} {selectedContacts.length === 1 ? 'Contact' : 'Contacts'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function MarketingDashboard() {
    const { logout, user } = useAuth();
    const [contacts, setContacts] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [stats, setStats] = useState({
        totalContacts: 0,
        emailsSent: 0,
        whatsappSent: 0,
        openRate: 0,
        campaigns: 0
    });
    const [loading, setLoading] = useState(true);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarHovered, setSidebarHovered] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [composeType, setComposeType] = useState('email');
    const [templates, setTemplates] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [scheduledCampaigns, setScheduledCampaigns] = useState([]);
    const [previewCertificate, setPreviewCertificate] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);

    // Load data from Firebase on mount
    useEffect(() => {
        loadDataFromFirebase();
    }, []);

    const loadDataFromFirebase = async () => {
        setLoading(true);
        try {
            // Load contacts
            const contactsData = await firebaseService.contacts.getAll();
            setContacts(contactsData);

            // Load campaigns
            const campaignsData = await firebaseService.campaigns.getAll();
            setCampaigns(campaignsData);

            // Load templates
            const templatesData = await firebaseService.templates.getAll();
            setTemplates(templatesData);

            // Update stats
            updateStats(contactsData, campaignsData);
        } catch (error) {
            console.error('Error loading data from Firebase:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStats = (contactList, campaignList) => {
        const emailsSent = campaignList.filter(c => c.type === 'email').reduce((sum, c) => sum + (c.sentCount || c.sent_count || 0), 0);
        const whatsappSent = campaignList.filter(c => c.type === 'whatsapp').reduce((sum, c) => sum + (c.sentCount || c.sent_count || 0), 0);

        setStats({
            totalContacts: contactList.length,
            emailsSent,
            whatsappSent,
            openRate: emailsSent > 0 ? Math.round((emailsSent * 0.65)) : 0,
            campaigns: campaignList.length
        });
    };

    // Handle contact upload - Save to Firebase
    const handleContactUpload = async (data) => {
        try {
            setLoading(true);
            const result = await firebaseService.contacts.bulkImport(data);

            // Reload contacts from Firebase
            const updatedContacts = await firebaseService.contacts.getAll();
            setContacts(updatedContacts);
            updateStats(updatedContacts, campaigns);

            alert(`Successfully imported ${result.count} contacts to Firebase!`);
        } catch (error) {
            console.error('Error uploading contacts:', error);
            alert(`Failed to upload contacts: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Handle send messages - Uses messaging service
    const handleSendMessages = async (data) => {
        const selectedContactsList = contacts.filter(c => data.contactIds.includes(c.id));

        try {
            setLoading(true);

            // Use messaging service to create and send campaign
            const result = await messagingService.createAndSendCampaign(
                {
                    type: data.type,
                    subject: data.subject,
                    message: data.message,
                    contactIds: data.contactIds
                },
                contacts
            );

            // Reload data from Firebase
            const [updatedContacts, updatedCampaigns] = await Promise.all([
                firebaseService.contacts.getAll(),
                firebaseService.campaigns.getAll()
            ]);

            setContacts(updatedContacts);
            setCampaigns(updatedCampaigns);
            updateStats(updatedContacts, updatedCampaigns);

            alert(`✅ Successfully sent ${result.sent} messengers to ${result.total} contacts!`);
        } catch (error) {
            console.error('Error sending messages:', error);
            alert('Failed to send messages. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle delete contact - Delete from Firebase
    const handleDeleteContact = async (contactId) => {
        if (!window.confirm('Are you sure you want to delete this contact?')) return;

        try {
            await firebaseService.contacts.delete(contactId);

            // Reload contacts from Firebase
            const updatedContacts = await firebaseService.contacts.getAll();
            setContacts(updatedContacts);
            updateStats(updatedContacts, campaigns);
        } catch (error) {
            console.error('Error deleting contact:', error);
            alert('Failed to delete contact. Please try again.');
        }
    };

    // Export contacts
    const handleExportContacts = () => {
        if (contacts.length === 0) {
            alert('No contacts to export');
            return;
        }

        const excelData = contacts.map(c => ({
            'Name': c.name,
            'Email': c.email,
            'Phone': c.phone,
            'Added On': new Date(c.createdAt).toLocaleDateString(),
            'Last Contacted': c.lastContactedAt ? new Date(c.lastContactedAt).toLocaleDateString() : 'Never'
        }));

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

        const date = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Contacts_${date}.xlsx`);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const openComposeModal = (type) => {
        setComposeType(type);
        setShowComposeModal(true);
    };

    // Filter contacts based on search
    const filteredContacts = contacts.filter(contact =>
        contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.phone?.includes(searchQuery)
    );

    // Navigation items
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'contacts', label: 'Contacts', icon: Users },
        { id: 'email', label: 'Email Campaigns', icon: Mail },
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
        { id: 'templates', label: 'Templates', icon: BookOpen },
        { id: 'scheduled', label: 'Scheduled', icon: Calendar },
        { id: 'campaigns', label: 'All Campaigns', icon: Layers },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];



    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const getHeaderTitle = () => {
        switch (activeTab) {
            case 'dashboard': return 'Dashboard';
            case 'contacts': return 'Contacts';
            case 'email': return 'Email Campaigns';
            case 'whatsapp': return 'WhatsApp';
            case 'templates': return 'Message Templates';
            case 'scheduled': return 'Scheduled Campaigns';
            case 'campaigns': return 'All Campaigns';
            case 'analytics': return 'Analytics';
            default: return 'Dashboard';
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'contacts':
                return renderContactsView();
            case 'email':
                return renderEmailView();
            case 'whatsapp':
                return renderWhatsAppView();
            case 'templates':
                return renderTemplatesView();
            case 'scheduled':
                return renderScheduledView();
            case 'campaigns':
                return renderCampaignsView();
            case 'analytics':
                return renderAnalyticsView();
            default:
                return renderDashboardView();
        }
    };

    const renderDashboardView = () => (
        <>
            {/* Welcome Banner */}
            <div className="welcome-banner">
                <div className="banner-content">
                    <div className="banner-text">
                        <h2>Welcome back! 📧</h2>
                        <p>Send bulk emails and WhatsApp messages to your contacts. Upload your database and start your campaign!</p>
                    </div>
                    <div className="banner-actions">
                        <button className="btn btn-light" onClick={() => setShowUploadModal(true)}>
                            <Upload size={18} />
                            Upload Contacts
                        </button>
                        <button className="btn btn-primary" onClick={() => openComposeModal('email')}>
                            <Mail size={18} />
                            New Campaign
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
                            <span className="stat-label">Total Contacts</span>
                            <span className="stat-value">{stats.totalContacts}</span>
                            <span className="stat-change positive">
                                <Users size={14} />
                                Database
                            </span>
                        </div>
                        <div className="stat-icon-wrapper stat-icon-primary">
                            <Users size={24} />
                        </div>
                    </div>
                    <div className="stat-progress">
                        <div className="stat-progress-bar" style={{ width: '100%' }}></div>
                    </div>
                </div>

                <div className="stat-card stat-card-success">
                    <div className="stat-card-content">
                        <div className="stat-info">
                            <span className="stat-label">Emails Sent</span>
                            <span className="stat-value">{stats.emailsSent}</span>
                            <span className="stat-change positive">
                                <Mail size={14} />
                                Delivered
                            </span>
                        </div>
                        <div className="stat-icon-wrapper stat-icon-success">
                            <Mail size={24} />
                        </div>
                    </div>
                    <div className="stat-progress">
                        <div className="stat-progress-bar success" style={{ width: stats.totalContacts > 0 ? `${(stats.emailsSent / stats.totalContacts) * 100}%` : '0%' }}></div>
                    </div>
                </div>

                <div className="stat-card stat-card-info">
                    <div className="stat-card-content">
                        <div className="stat-info">
                            <span className="stat-label">WhatsApp Sent</span>
                            <span className="stat-value">{stats.whatsappSent}</span>
                            <span className="stat-change positive">
                                <MessageCircle size={14} />
                                Delivered
                            </span>
                        </div>
                        <div className="stat-icon-wrapper stat-icon-info">
                            <MessageCircle size={24} />
                        </div>
                    </div>
                    <div className="stat-progress">
                        <div className="stat-progress-bar info" style={{ width: stats.totalContacts > 0 ? `${(stats.whatsappSent / stats.totalContacts) * 100}%` : '0%' }}></div>
                    </div>
                </div>

                <div className="stat-card stat-card-warning">
                    <div className="stat-card-content">
                        <div className="stat-info">
                            <span className="stat-label">Total Campaigns</span>
                            <span className="stat-value">{stats.campaigns}</span>
                            <span className="stat-change positive">
                                <Layers size={14} />
                                All time
                            </span>
                        </div>
                        <div className="stat-icon-wrapper stat-icon-warning">
                            <Layers size={24} />
                        </div>
                    </div>
                    <div className="stat-progress">
                        <div className="stat-progress-bar warning" style={{ width: '100%' }}></div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions-grid">
                <div className="quick-action-card" onClick={() => setShowUploadModal(true)}>
                    <div className="quick-action-icon upload">
                        <Upload size={28} />
                    </div>
                    <h3>Upload Contacts</h3>
                    <p>Import your contact database from Excel</p>
                </div>
                <div className="quick-action-card" onClick={() => openComposeModal('email')}>
                    <div className="quick-action-icon email">
                        <Mail size={28} />
                    </div>
                    <h3>Send Bulk Email</h3>
                    <p>Create and send email campaigns</p>
                </div>
                <div className="quick-action-card" onClick={() => openComposeModal('whatsapp')}>
                    <div className="quick-action-icon whatsapp">
                        <MessageCircle size={28} />
                    </div>
                    <h3>Send WhatsApp</h3>
                    <p>Send bulk WhatsApp messages</p>
                </div>
                <div className="quick-action-card" onClick={handleExportContacts}>
                    <div className="quick-action-icon export">
                        <Download size={28} />
                    </div>
                    <h3>Export Data</h3>
                    <p>Download your contacts to Excel</p>
                </div>
                <div className="quick-action-card" onClick={() => {
                    const sampleCert = contacts.length > 0 ? contacts[0] : { name: 'Your Name', certificateNumber: 'TSP123456', reraAwardeNo: 'RERA-789', professional: 'RERA CONSULTANT' };
                    setPreviewCertificate(sampleCert);
                    setShowPreviewModal(true);
                }}>
                    <div className="quick-action-icon preview">
                        <Eye size={28} />
                    </div>
                    <h3>Preview Certificate</h3>
                    <p>View the current certificate design</p>
                </div>
            </div>

            {/* Recent Campaigns */}
            <div className="card table-card">
                <div className="card-header">
                    <div className="card-header-left">
                        <h2 className="card-title">
                            <Layers size={24} />
                            Recent Campaigns
                        </h2>
                        <p className="card-description">Your latest messaging campaigns</p>
                    </div>
                </div>
                {campaigns.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Send size={64} />
                        </div>
                        <h3>No campaigns yet</h3>
                        <p>Start your first email or WhatsApp campaign to reach your contacts.</p>
                        <button className="btn btn-primary" onClick={() => openComposeModal('email')}>
                            <Plus size={20} />
                            Create First Campaign
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Subject/Message</th>
                                    <th>Recipients</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.slice(-5).reverse().map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td>
                                            <span className={`campaign-type-badge ${campaign.type}`}>
                                                {campaign.type === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />}
                                                {campaign.type === 'email' ? 'Email' : 'WhatsApp'}
                                            </span>
                                        </td>
                                        <td className="message-preview">
                                            {campaign.subject || campaign.message.substring(0, 50) + '...'}
                                        </td>
                                        <td>{campaign.recipient_count || campaign.recipientCount || campaign.sent_count || campaign.sentCount || 0}</td>
                                        <td>{new Date(campaign.created_at || campaign.createdAt || Date.now()).toLocaleDateString()}</td>
                                        <td>
                                            <span className="badge badge-success">
                                                <CheckCircle size={12} />
                                                Sent
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );

    const renderContactsView = () => (
        <>
            <div className="page-actions">
                <div className="page-actions-left">
                    <h2>All Contacts ({contacts.length})</h2>
                </div>
                <div className="page-actions-right">
                    <button className="btn btn-outline" onClick={handleExportContacts}>
                        <Download size={18} />
                        Export
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                        <Upload size={18} />
                        Upload Contacts
                    </button>
                </div>
            </div>

            <div className="card table-card">
                {contacts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Users size={64} />
                        </div>
                        <h3>No contacts yet</h3>
                        <p>Upload your first Excel file to start building your contact database.</p>
                        <button className="btn btn-primary" onClick={() => setShowUploadModal(true)}>
                            <Upload size={20} />
                            Upload Contacts
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Certificate #</th>
                                    <th>RERA No.</th>
                                    <th>Professional</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredContacts.map((contact) => (
                                    <tr key={contact.id}>
                                        <td>
                                            <div className="recipient-cell">
                                                <div className="recipient-avatar">
                                                    {contact.name?.charAt(0).toUpperCase() || '?'}
                                                </div>
                                                <strong>{contact.name || 'Unknown'}</strong>
                                            </div>
                                        </td>
                                        <td><code className="certificate-code">{contact.certificate_number || contact.certificateNumber || '-'}</code></td>
                                        <td>{contact.rera_awarde_no || contact.reraAwardeNo || '-'}</td>
                                        <td>{contact.professional || '-'}</td>
                                        <td>{contact.email || '-'}</td>
                                        <td>{contact.phone || '-'}</td>
                                        <td>
                                            <div className="action-buttons">
                                                {contact.email && (
                                                    <button
                                                        className="action-btn action-btn-send"
                                                        title="Open Email Client"
                                                        onClick={() => messagingService.openEmailClient(contact, 'Hello from TSP!', 'Dear {{name}},\n\nThank you for your association with Top Selling Property.\n\nBest regards')}
                                                    >
                                                        <Mail size={16} />
                                                    </button>
                                                )}
                                                {contact.phone && (
                                                    <button
                                                        className="action-btn action-btn-whatsapp"
                                                        title="Open WhatsApp Web"
                                                        onClick={() => messagingService.openWhatsAppWeb(contact, 'Hello {{name}}! 👋\n\nThank you for your association with Top Selling Property.\n\nwww.topsellingproperty.com')}
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    className="action-btn action-btn-preview"
                                                    title="Preview Certificate"
                                                    onClick={() => {
                                                        setPreviewCertificate(contact);
                                                        setShowPreviewModal(true);
                                                    }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    className="action-btn action-btn-delete"
                                                    onClick={() => handleDeleteContact(contact.id)}
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
        </>
    );

    const renderEmailView = () => (
        <>
            <div className="page-actions">
                <div className="page-actions-left">
                    <h2>Email Campaigns</h2>
                </div>
                <div className="page-actions-right">
                    <button className="btn btn-primary" onClick={() => openComposeModal('email')}>
                        <Plus size={18} />
                        New Email Campaign
                    </button>
                </div>
            </div>

            <div className="campaign-intro-card">
                <div className="campaign-intro-icon email">
                    <Mail size={48} />
                </div>
                <div className="campaign-intro-content">
                    <h3>Send Bulk Emails</h3>
                    <p>Create professional email campaigns and send them to your contact database. Use personalization tokens to make each email unique.</p>
                    <button className="btn btn-primary" onClick={() => openComposeModal('email')}>
                        <Send size={18} />
                        Compose Email
                    </button>
                </div>
            </div>

            <div className="card table-card">
                <div className="card-header">
                    <h2 className="card-title">Email Campaign History</h2>
                </div>
                {campaigns.filter(c => c.type === 'email').length === 0 ? (
                    <div className="empty-state small">
                        <p>No email campaigns sent yet.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Subject</th>
                                    <th>Recipients</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.filter(c => c.type === 'email').reverse().map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td>{campaign.subject}</td>
                                        <td>{campaign.recipient_count || campaign.recipientCount || campaign.sent_count || campaign.sentCount || 0}</td>
                                        <td>{new Date(campaign.created_at || campaign.createdAt || Date.now()).toLocaleDateString()}</td>
                                        <td>
                                            <span className="badge badge-success">
                                                <CheckCircle size={12} />
                                                Sent
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );

    const renderWhatsAppView = () => (
        <>
            <div className="page-actions">
                <div className="page-actions-left">
                    <h2>WhatsApp Messages</h2>
                </div>
                <div className="page-actions-right">
                    <button className="btn btn-primary" onClick={() => openComposeModal('whatsapp')}>
                        <Plus size={18} />
                        New WhatsApp Campaign
                    </button>
                </div>
            </div>

            <div className="campaign-intro-card whatsapp">
                <div className="campaign-intro-icon whatsapp">
                    <MessageCircle size={48} />
                </div>
                <div className="campaign-intro-content">
                    <h3>Send Bulk WhatsApp Messages</h3>
                    <p>Reach your contacts directly through WhatsApp. Great for quick updates, promotions, and personal communication.</p>
                    <button className="btn btn-success" onClick={() => openComposeModal('whatsapp')}>
                        <Send size={18} />
                        Compose Message
                    </button>
                </div>
            </div>

            <div className="card table-card">
                <div className="card-header">
                    <h2 className="card-title">WhatsApp Campaign History</h2>
                </div>
                {campaigns.filter(c => c.type === 'whatsapp').length === 0 ? (
                    <div className="empty-state small">
                        <p>No WhatsApp campaigns sent yet.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Message Preview</th>
                                    <th>Recipients</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.filter(c => c.type === 'whatsapp').reverse().map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td className="message-preview">{campaign.message.substring(0, 50)}...</td>
                                        <td>{campaign.recipient_count || campaign.recipientCount || campaign.sent_count || campaign.sentCount || 0}</td>
                                        <td>{new Date(campaign.created_at || campaign.createdAt || Date.now()).toLocaleDateString()}</td>
                                        <td>
                                            <span className="badge badge-success">
                                                <CheckCircle size={12} />
                                                Sent
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );


    // Template Management Functions - Save to Firebase
    const handleSaveTemplate = async (templateData) => {
        try {
            await firebaseService.templates.create(templateData);

            // Reload templates from Firebase
            const updatedTemplates = await firebaseService.templates.getAll();
            setTemplates(updatedTemplates);
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Failed to save template. Please try again.');
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;

        try {
            await firebaseService.templates.delete(templateId);

            // Reload templates from Firebase
            const updatedTemplates = await firebaseService.templates.getAll();
            setTemplates(updatedTemplates);
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Failed to delete template. Please try again.');
        }
    };

    // Templates are now loaded in loadDataFromFirebase()

    const renderTemplatesView = () => (
        <>
            <div className="page-actions">
                <div className="page-actions-left">
                    <h2>Message Templates ({templates.length})</h2>
                </div>
                <div className="page-actions-right">
                    <button className="btn btn-primary" onClick={() => setShowTemplateModal(true)}>
                        <Plus size={18} />
                        New Template
                    </button>
                </div>
            </div>

            <div className="campaign-intro-card">
                <div className="campaign-intro-icon">
                    <BookOpen size={48} />
                </div>
                <div className="campaign-intro-content">
                    <h3>Create Reusable Templates</h3>
                    <p>Save time by creating message templates for your email and WhatsApp campaigns. Use personalization tokens like {"{{name}}"} to customize each message.</p>
                </div>
            </div>

            {templates.length === 0 ? (
                <div className="card table-card">
                    <div className="empty-state">
                        <div className="empty-icon">
                            <BookOpen size={64} />
                        </div>
                        <h3>No templates yet</h3>
                        <p>Create your first template to speed up your campaigns.</p>
                        <button className="btn btn-primary" onClick={() => setShowTemplateModal(true)}>
                            <Plus size={20} />
                            Create Template
                        </button>
                    </div>
                </div>
            ) : (
                <div className="templates-grid">
                    {templates.map(template => (
                        <div key={template.id} className="template-card">
                            <div className="template-header">
                                <span className={`campaign-type-badge ${template.type}`}>
                                    {template.type === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />}
                                    {template.type === 'email' ? 'Email' : 'WhatsApp'}
                                </span>
                                <div className="template-actions">
                                    <button className="action-btn" title="Use Template" onClick={() => {
                                        setComposeType(template.type);
                                        setShowComposeModal(true);
                                    }}>
                                        <Send size={16} />
                                    </button>
                                    <button className="action-btn action-btn-delete" title="Delete" onClick={() => handleDeleteTemplate(template.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <h3 className="template-name">{template.name}</h3>
                            {template.subject && <p className="template-subject">Subject: {template.subject}</p>}
                            <p className="template-preview">{template.content.substring(0, 100)}...</p>
                            <div className="template-footer">
                                <span className="template-date">Created {new Date(template.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Template Creation Modal */}
            {showTemplateModal && (
                <div className="modal-overlay" onClick={() => setShowTemplateModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Create Template</h2>
                                <p className="modal-subtitle">Save a reusable message template</p>
                            </div>
                            <button className="modal-close" onClick={() => setShowTemplateModal(false)}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            handleSaveTemplate({
                                name: formData.get('name'),
                                type: formData.get('type'),
                                subject: formData.get('subject'),
                                content: formData.get('content')
                            });
                            setShowTemplateModal(false);
                        }}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Template Name</label>
                                    <input type="text" name="name" className="form-input" placeholder="e.g., Welcome Email" required />
                                </div>
                                <div className="form-group">
                                    <label>Type</label>
                                    <select name="type" className="form-input" required>
                                        <option value="email">Email</option>
                                        <option value="whatsapp">WhatsApp</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Subject (for Email)</label>
                                    <input type="text" name="subject" className="form-input" placeholder="Email subject line" />
                                </div>
                                <div className="form-group">
                                    <label>Message Content</label>
                                    <textarea name="content" className="form-textarea" placeholder="Your message content..." rows={6} required />
                                </div>
                                <div className="personalization-hint">
                                    <Zap size={16} />
                                    <span>Use <code>{"{{name}}"}</code>, <code>{"{{certificate}}"}</code>, <code>{"{{rera}}"}</code> for personalization</span>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowTemplateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">
                                    <Save size={18} />
                                    Save Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );

    const renderScheduledView = () => {
        const scheduledItems = campaigns.filter(c => c.status === 'scheduled');

        return (
            <>
                <div className="page-actions">
                    <div className="page-actions-left">
                        <h2>Scheduled Campaigns ({scheduledItems.length})</h2>
                    </div>
                </div>

                <div className="campaign-intro-card">
                    <div className="campaign-intro-icon">
                        <Calendar size={48} />
                    </div>
                    <div className="campaign-intro-content">
                        <h3>Schedule Your Campaigns</h3>
                        <p>Plan ahead by scheduling your email and WhatsApp campaigns to be sent at the perfect time. Set it and forget it!</p>
                    </div>
                </div>

                <div className="card table-card">
                    {scheduledItems.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <Calendar size={64} />
                            </div>
                            <h3>No scheduled campaigns</h3>
                            <p>You haven't scheduled any campaigns yet. When creating a campaign, choose a future date to schedule it.</p>
                            <button className="btn btn-primary" onClick={() => openComposeModal('email')}>
                                <Plus size={20} />
                                Create Campaign
                            </button>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Message</th>
                                        <th>Recipients</th>
                                        <th>Scheduled For</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scheduledItems.map((campaign) => (
                                        <tr key={campaign.id}>
                                            <td>
                                                <span className={`campaign-type-badge ${campaign.type}`}>
                                                    {campaign.type === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />}
                                                    {campaign.type === 'email' ? 'Email' : 'WhatsApp'}
                                                </span>
                                            </td>
                                            <td className="message-preview">
                                                {campaign.subject || campaign.message?.substring(0, 50) + '...'}
                                            </td>
                                            <td>{campaign.sentCount || campaign.recipientCount || 0}</td>
                                            <td>
                                                <span className="scheduled-time">
                                                    <Clock size={14} />
                                                    {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : 'Not set'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge badge-warning">
                                                    <Clock size={12} />
                                                    Scheduled
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="action-btn action-btn-delete" title="Cancel">
                                                        <X size={16} />
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
            </>
        );
    };

    const renderCampaignsView = () => (
        <>
            <div className="page-actions">
                <div className="page-actions-left">
                    <h2>All Campaigns ({campaigns.length})</h2>
                </div>
            </div>

            <div className="card table-card">
                {campaigns.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Layers size={64} />
                        </div>
                        <h3>No campaigns yet</h3>
                        <p>Start your first campaign to see it here.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Subject/Message</th>
                                    <th>Recipients</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {campaigns.slice().reverse().map((campaign) => (
                                    <tr key={campaign.id}>
                                        <td>
                                            <span className={`campaign-type-badge ${campaign.type}`}>
                                                {campaign.type === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />}
                                                {campaign.type === 'email' ? 'Email' : 'WhatsApp'}
                                            </span>
                                        </td>
                                        <td className="message-preview">
                                            {campaign.subject || campaign.message.substring(0, 50) + '...'}
                                        </td>
                                        <td>{campaign.recipient_count || campaign.recipientCount || campaign.sent_count || campaign.sentCount || 0}</td>
                                        <td>{new Date(campaign.created_at || campaign.createdAt || Date.now()).toLocaleDateString()}</td>
                                        <td>
                                            <span className="badge badge-success">
                                                <CheckCircle size={12} />
                                                Sent
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );

    const renderAnalyticsView = () => (
        <>
            <div className="page-actions">
                <div className="page-actions-left">
                    <h2>Analytics Overview</h2>
                </div>
            </div>

            <div className="analytics-grid">
                <div className="analytics-card">
                    <div className="analytics-header">
                        <h3>Messaging Performance</h3>
                    </div>
                    <div className="analytics-body">
                        <div className="analytics-stat">
                            <div className="analytics-stat-value">{stats.emailsSent + stats.whatsappSent}</div>
                            <div className="analytics-stat-label">Total Messages Sent</div>
                        </div>
                        <div className="analytics-breakdown">
                            <div className="breakdown-item">
                                <Mail size={18} className="email-icon" />
                                <span>{stats.emailsSent} Emails</span>
                            </div>
                            <div className="breakdown-item">
                                <MessageCircle size={18} className="whatsapp-icon" />
                                <span>{stats.whatsappSent} WhatsApp</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-header">
                        <h3>Contact Growth</h3>
                    </div>
                    <div className="analytics-body">
                        <div className="analytics-stat">
                            <div className="analytics-stat-value">{stats.totalContacts}</div>
                            <div className="analytics-stat-label">Total Contacts</div>
                        </div>
                        <div className="growth-indicator positive">
                            <TrendingUp size={16} />
                            <span>Growing database</span>
                        </div>
                    </div>
                </div>

                <div className="analytics-card">
                    <div className="analytics-header">
                        <h3>Campaign Stats</h3>
                    </div>
                    <div className="analytics-body">
                        <div className="analytics-stat">
                            <div className="analytics-stat-value">{stats.campaigns}</div>
                            <div className="analytics-stat-label">Total Campaigns</div>
                        </div>
                        <div className="campaign-types">
                            <span>{campaigns.filter(c => c.type === 'email').length} Email</span>
                            <span>{campaigns.filter(c => c.type === 'whatsapp').length} WhatsApp</span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside
                className={`sidebar ${sidebarCollapsed && !sidebarHovered ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''} ${sidebarHovered && sidebarCollapsed ? 'hovered' : ''}`}
                onMouseEnter={() => {
                    if (sidebarCollapsed) {
                        setSidebarHovered(true);
                    }
                }}
                onMouseLeave={() => {
                    setSidebarHovered(false);
                }}
            >
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="logo-icon-wrapper">
                            <Send size={24} />
                        </div>
                        {(!sidebarCollapsed || sidebarHovered) && (
                            <div className="sidebar-brand-container">
                                <span className="sidebar-brand">MarketHub</span>
                                <span className="sidebar-brand-sub">Email & Marketing</span>
                            </div>
                        )}
                    </div>
                    <button
                        className="sidebar-toggle"
                        onClick={() => {
                            setSidebarCollapsed(!sidebarCollapsed);
                        }}
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <ChevronLeft size={18} style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">
                        {(!sidebarCollapsed || sidebarHovered) && <span className="nav-section-title">Main Menu</span>}
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(item.id)}
                                title={sidebarCollapsed && !sidebarHovered ? item.label : ''}
                            >
                                <item.icon size={20} />
                                {(!sidebarCollapsed || sidebarHovered) && <span>{item.label}</span>}
                            </button>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-profile-section">
                        <div className="user-avatar">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {(!sidebarCollapsed || sidebarHovered) && (
                            <div className="user-info">
                                <span className="user-name">{user?.email?.split('@')[0] || 'User'}</span>
                                <span className="user-email">{user?.email || 'admin@company.com'}</span>
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
                            <h1 className="header-title">{getHeaderTitle()}</h1>
                            <p className="header-subtitle">{currentDate}</p>
                        </div>
                    </div>

                    <div className="header-right">
                        <div className="header-search">
                            <Search size={18} className="search-icon" />
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search contacts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <button className="header-icon-btn notification-btn">
                            <Bell size={20} />
                            {campaigns.length > 0 && (
                                <span className="notification-badge">{campaigns.length > 9 ? '9+' : campaigns.length}</span>
                            )}
                        </button>

                        <button
                            className="btn btn-primary create-btn"
                            onClick={() => openComposeModal('email')}
                        >
                            <Plus size={18} />
                            <span>New Campaign</span>
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <main className="content-area">
                    {renderContent()}
                </main>
            </div>

            {/* Modals */}
            {showUploadModal && (
                <ContactUploadModal
                    onClose={() => setShowUploadModal(false)}
                    onUpload={handleContactUpload}
                />
            )}

            {showComposeModal && (
                <ComposeModal
                    type={composeType}
                    contacts={contacts}
                    onClose={() => setShowComposeModal(false)}
                    onSend={handleSendMessages}
                />
            )}

            {showPreviewModal && (
                <PreviewCertificateModal
                    certificate={previewCertificate}
                    onClose={() => setShowPreviewModal(false)}
                />
            )}
        </div>
    );
}

export default MarketingDashboard;
