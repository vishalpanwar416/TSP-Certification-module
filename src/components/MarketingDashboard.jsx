import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';
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
    ExternalLink,
    Award,
    FileImage,
    File,
    PieChart,
    Image
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import firebaseService from '../services/marketingService';
import messagingService from '../services/messagingService';
import notificationsService from '../services/notificationsService';
import { certificateAPI } from '../services/api';
import PreviewCertificateModal from './PreviewCertificateModal';

// Utility function to safely parse Firestore timestamps
const parseFirestoreDate = (timestamp) => {
    if (!timestamp) return null;

    // If it's already a Date object
    if (timestamp instanceof Date) {
        return timestamp;
    }

    // If it's a Firestore Timestamp object with seconds property (from Admin SDK)
    if (timestamp.seconds !== undefined) {
        return new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000);
    }

    // If it's a Firestore Timestamp object with _seconds property (serialized format)
    if (timestamp._seconds !== undefined) {
        return new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
    }

    // If it's a Firestore Timestamp object with toDate method
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
    }

    // If it's a number (milliseconds or seconds)
    if (typeof timestamp === 'number') {
        // If it's less than 1e12, it's likely seconds, otherwise milliseconds
        return new Date(timestamp < 1e12 ? timestamp * 1000 : timestamp);
    }

    // If it's a string, try to parse it
    if (typeof timestamp === 'string') {
        const parsed = new Date(timestamp);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    // If it's an object with a toMillis method (Firestore Timestamp)
    if (timestamp && typeof timestamp.toMillis === 'function') {
        return new Date(timestamp.toMillis());
    }

    return null;
};

// Format date safely
const formatDate = (timestamp, options = {}) => {
    const date = parseFirestoreDate(timestamp);
    if (!date || isNaN(date.getTime())) {
        // If timestamp is missing or invalid, try to show current date as fallback
        // This handles cases where the timestamp hasn't been resolved yet
        if (timestamp === null || timestamp === undefined) {
            return 'N/A';
        }
        // Log for debugging
        console.warn('Invalid date format:', timestamp);
        return 'N/A';
    }

    const defaultOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    };

    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Format date and time safely
const formatDateTime = (timestamp) => {
    const date = parseFirestoreDate(timestamp);
    if (!date || isNaN(date.getTime())) {
        // If timestamp is missing or invalid, try to show current date as fallback
        if (timestamp === null || timestamp === undefined) {
            return 'N/A';
        }
        // Log for debugging
        console.warn('Invalid date format:', timestamp);
        return 'N/A';
    }

    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

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
function ComposeModal({ type, contacts, certificates = [], templates = [], onClose, onSend }) {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [includeCertificate, setIncludeCertificate] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState('');
    const [formatPDF, setFormatPDF] = useState(true);
    const [formatJPG, setFormatJPG] = useState(false);
    const [whatsappCampaign, setWhatsappCampaign] = useState('');

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
        if (includeCertificate && !selectedCertificate) {
            alert('Please select a certificate to include');
            return;
        }
        if (includeCertificate && !formatPDF && !formatJPG) {
            alert('Please select at least one format (PDF or JPG)');
            return;
        }

        setSending(true);
        try {
            await onSend({
                type,
                subject,
                message,
                contactIds: selectedContacts,
                includeCertificate: includeCertificate && selectedCertificate ? {
                    certificateId: selectedCertificate,
                    formats: {
                        pdf: formatPDF,
                        jpg: formatJPG
                    }
                } : null,
                whatsappCampaign: whatsappCampaign || null
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

                        {/* Template Selector Dropdown */}
                        <div className="form-group template-selector">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <BookOpen size={16} />
                                Use Template
                            </label>
                            <select
                                className="form-input"
                                onChange={(e) => {
                                    const selectedTemplate = (templates || []).find(t => t.id === e.target.value);
                                    if (selectedTemplate) {
                                        setMessage(selectedTemplate.content || '');
                                        if (selectedTemplate.subject && isEmail) {
                                            setSubject(selectedTemplate.subject);
                                        }
                                    }
                                }}
                                style={{ marginBottom: '1rem' }}
                            >
                                <option value="">-- Select a template (optional) --</option>
                                {(templates || [])
                                    .filter(t => t.type === type)
                                    .map(template => (
                                        <option key={template.id} value={template.id}>
                                            {template.name}
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

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
                        {!isEmail && (
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>WhatsApp Campaign Name</span>
                                    <small style={{ fontWeight: 'normal', color: '#6b7280' }}>(Optional - defaults to config or 'bulk_message' if certificate included)</small>
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter AiSensy campaign name (e.g. bulk_message)"
                                    value={whatsappCampaign}
                                    onChange={(e) => setWhatsappCampaign(e.target.value)}
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

                        {/* Certificate Attachment Section */}
                        <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '500' }}>
                                <input
                                    type="checkbox"
                                    checked={includeCertificate}
                                    onChange={(e) => {
                                        setIncludeCertificate(e.target.checked);
                                        if (!e.target.checked) {
                                            setSelectedCertificate('');
                                        }
                                    }}
                                />
                                <Award size={18} />
                                <span>Include Certificate</span>
                            </label>

                            {includeCertificate && (
                                <div style={{ marginTop: '0.75rem' }}>
                                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                            Select Certificate
                                        </label>
                                        <select
                                            className="form-input"
                                            value={selectedCertificate}
                                            onChange={(e) => setSelectedCertificate(e.target.value)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">-- Select a certificate --</option>
                                            <option value="default">📄 Default Certificate Template</option>
                                            {certificates.length > 0 && (
                                                <optgroup label="Generated Certificates">
                                                    {certificates.map(cert => (
                                                        <option key={cert.id} value={cert.id}>
                                                            {cert.certificate_number} - {cert.recipient_name}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                        {selectedCertificate === 'default' && (
                                            <small style={{
                                                display: 'block',
                                                marginTop: '0.5rem',
                                                fontSize: '0.75rem',
                                                color: '#3b82f6',
                                                fontStyle: 'italic'
                                            }}>
                                                ℹ️ Using the default certificate template
                                            </small>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '0.75rem' }}>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
                                            Certificate Format
                                        </label>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formatPDF}
                                                    onChange={(e) => {
                                                        setFormatPDF(e.target.checked);
                                                        if (!e.target.checked && !formatJPG) {
                                                            setFormatJPG(true);
                                                        }
                                                    }}
                                                />
                                                <File size={16} />
                                                <span>PDF</span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formatJPG}
                                                    onChange={(e) => {
                                                        setFormatJPG(e.target.checked);
                                                        if (!e.target.checked && !formatPDF) {
                                                            setFormatPDF(true);
                                                        }
                                                    }}
                                                />
                                                <FileImage size={16} />
                                                <span>JPG</span>
                                            </label>
                                        </div>
                                        <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#9ca3af' }}>
                                            Select at least one format. Both formats can be selected.
                                        </p>
                                    </div>
                                </div>
                            )}
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
    const [certificates, setCertificates] = useState([]);
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
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [certificateSearchQuery, setCertificateSearchQuery] = useState('');
    const [certificateTemplate, setCertificateTemplate] = useState(null);
    const [templateUploading, setTemplateUploading] = useState(false);
    const [showTemplateUpload, setShowTemplateUpload] = useState(false);

    // Load data from Firebase on mount
    useEffect(() => {
        console.log('[API DEBUG] Using Base URL:', API_BASE_URL);
        loadDataFromFirebase();
        loadNotifications();
    }, []);

    // Load notifications from backend
    const loadNotifications = async () => {
        try {
            const response = await notificationsService.getAll({ limit: 20 });
            setNotifications(response.data || response || []);
            setUnreadCount(response.unreadCount || 0);
        } catch (error) {
            console.error('Error loading notifications:', error);
            setNotifications([]);
            setUnreadCount(0);
        }
    };

    // Refresh notifications periodically
    useEffect(() => {
        const interval = setInterval(() => {
            loadNotifications();
        }, 30000); // Refresh every 30 seconds

        return () => clearInterval(interval);
    }, []);

    // Load certificate template when certificates tab is active
    useEffect(() => {
        const loadCertificateTemplate = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/certificates/template`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        // Set template data, even if it's null (means using default)
                        if (data.data && data.data.url && !data.data.isDefault) {
                            setCertificateTemplate(data.data);
                        } else {
                            // Using default template
                            setCertificateTemplate(null);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading template:', error);
                // On error, assume using default
                setCertificateTemplate(null);
            }
        };

        if (activeTab === 'certificates') {
            loadCertificateTemplate();
        }
    }, [activeTab]);

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

            // Load certificates
            try {
                const certificatesData = await certificateAPI.getAll();
                setCertificates(Array.isArray(certificatesData) ? certificatesData : []);
            } catch (error) {
                console.error('Error loading certificates:', error);
                setCertificates([]);
            }

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

    // Helper function to render campaign status badge
    const renderStatusBadge = (campaign) => {
        const status = campaign.status || 'pending';
        const sentCount = campaign.sent_count || campaign.sentCount || 0;
        const failedCount = campaign.failed_count || campaign.failedCount || 0;
        const total = campaign.recipient_count || campaign.recipientCount || 0;

        if (status === 'completed' && sentCount > 0 && failedCount === 0) {
            return (
                <span className="badge badge-success">
                    <CheckCircle size={12} />
                    Sent
                </span>
            );
        } else if (status === 'failed' || (sentCount === 0 && failedCount > 0)) {
            return (
                <span className="badge badge-error" style={{ backgroundColor: '#ef4444', color: 'white' }}>
                    <AlertCircle size={12} />
                    Failed
                </span>
            );
        } else if (status === 'partial' || (sentCount > 0 && failedCount > 0)) {
            return (
                <span className="badge badge-warning" style={{ backgroundColor: '#f59e0b', color: 'white' }}>
                    <AlertCircle size={12} />
                    Partial ({sentCount}/{total})
                </span>
            );
        } else if (status === 'scheduled') {
            return (
                <span className="badge badge-info" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                    <Clock size={12} />
                    Scheduled
                </span>
            );
        } else if (status === 'pending') {
            return (
                <span className="badge badge-warning" style={{ backgroundColor: '#6b7280', color: 'white' }}>
                    <Clock size={12} />
                    Pending
                </span>
            );
        } else {
            return (
                <span className="badge badge-info">
                    <Clock size={12} />
                    {status}
                </span>
            );
        }
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
                    contactIds: data.contactIds,
                    includeCertificate: data.includeCertificate
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

            const sent = result.sent_count ?? result.sentCount ?? result.sent ?? 0;
            const failed = result.failed_count ?? result.failedCount ?? result.failed ?? 0;
            const total = result.recipient_count ?? result.recipientCount ?? result.total ?? data.contactIds.length;
            const status = result.status || (failed > 0 ? (sent > 0 ? 'partial' : 'failed') : 'completed');

            if (failed > 0) {
                const errors = result.errors && Array.isArray(result.errors) ? result.errors : [];
                const firstError = errors.length ? ` First error: ${errors[0].error || ''}` : '';
                alert(`⚠️ Campaign status: ${status}. Sent ${sent}/${total}. Failed ${failed}.${firstError}`);
            } else {
                alert(`✅ Campaign ${status}. Sent ${sent}/${total} messages.`);
            }
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
            'Added On': formatDate(c.createdAt),
            'Last Contacted': c.lastContactedAt ? formatDate(c.lastContactedAt) : 'Never'
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
        { id: 'certificates', label: 'Certificates', icon: Award },
        { id: 'email', label: 'Email Campaigns', icon: Mail },
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
        { id: 'templates', label: 'Templates', icon: BookOpen },
        { id: 'scheduled', label: 'Scheduled', icon: Calendar },
        { id: 'campaigns', label: 'All Campaigns', icon: Layers },
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
            case 'certificates': return 'Certificates';
            case 'email': return 'Email Campaigns';
            case 'whatsapp': return 'WhatsApp';
            case 'templates': return 'Message Templates';
            case 'scheduled': return 'Scheduled Campaigns';
            case 'campaigns': return 'All Campaigns';
            default: return 'Dashboard';
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'contacts':
                return renderContactsView();
            case 'certificates':
                return renderCertificatesView();
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
                        <h2>Welcome back!</h2>
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

            {/* Marketing Analytics & Graphs */}
            <div className="analytics-section">
                <div className="analytics-grid">
                    {/* Campaign Performance Chart */}
                    <div className="card analytics-card">
                        <div className="card-header">
                            <div className="card-header-left">
                                <h2 className="card-title">
                                    <TrendingUp size={24} />
                                    Campaign Performance
                                </h2>
                                <p className="card-description">Email vs WhatsApp delivery rates</p>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="chart-container">
                                <div className="chart-bars">
                                    <div className="chart-bar-group">
                                        <div className="chart-bar-label">Email</div>
                                        <div className="chart-bar-wrapper">
                                            <div
                                                className="chart-bar email-bar"
                                                style={{
                                                    height: `${stats.totalContacts > 0 ? (stats.emailsSent / stats.totalContacts) * 100 : 0}%`,
                                                    maxHeight: '200px'
                                                }}
                                            >
                                                <span className="chart-bar-value">{stats.emailsSent}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-bar-group">
                                        <div className="chart-bar-label">WhatsApp</div>
                                        <div className="chart-bar-wrapper">
                                            <div
                                                className="chart-bar whatsapp-bar"
                                                style={{
                                                    height: `${stats.totalContacts > 0 ? (stats.whatsappSent / stats.totalContacts) * 100 : 0}%`,
                                                    maxHeight: '200px'
                                                }}
                                            >
                                                <span className="chart-bar-value">{stats.whatsappSent}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="chart-legend">
                                    <div className="legend-item">
                                        <span className="legend-color email"></span>
                                        <span>Email Campaigns</span>
                                    </div>
                                    <div className="legend-item">
                                        <span className="legend-color whatsapp"></span>
                                        <span>WhatsApp Campaigns</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Campaign Success Rate */}
                    <div className="card analytics-card">
                        <div className="card-header">
                            <div className="card-header-left">
                                <h2 className="card-title">
                                    <BarChart3 size={24} />
                                    Campaign Success Rate
                                </h2>
                                <p className="card-description">Overall delivery statistics</p>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="success-metrics">
                                {campaigns.length > 0 ? (
                                    <>
                                        {(() => {
                                            const completed = campaigns.filter(c => c.status === 'completed' || c.status === 'sent').length;
                                            const failed = campaigns.filter(c => c.status === 'failed').length;
                                            const partial = campaigns.filter(c => c.status === 'partial').length;
                                            const total = campaigns.length;
                                            const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

                                            return (
                                                <>
                                                    <div className="metric-item">
                                                        <div className="metric-header">
                                                            <span className="metric-label">Success Rate</span>
                                                            <span className="metric-value-large">{successRate}%</span>
                                                        </div>
                                                        <div className="metric-progress">
                                                            <div
                                                                className="metric-progress-bar success"
                                                                style={{ width: `${successRate}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                    <div className="metric-breakdown">
                                                        <div className="breakdown-item success">
                                                            <CheckCircle size={16} />
                                                            <span>Completed: {completed}</span>
                                                        </div>
                                                        <div className="breakdown-item warning">
                                                            <AlertCircle size={16} />
                                                            <span>Partial: {partial}</span>
                                                        </div>
                                                        <div className="breakdown-item error">
                                                            <AlertCircle size={16} />
                                                            <span>Failed: {failed}</span>
                                                        </div>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </>
                                ) : (
                                    <div className="empty-chart">
                                        <BarChart3 size={48} />
                                        <p>No campaign data yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Message Distribution */}
                    <div className="card analytics-card">
                        <div className="card-header">
                            <div className="card-header-left">
                                <h2 className="card-title">
                                    <PieChart size={24} />
                                    Message Distribution
                                </h2>
                                <p className="card-description">Email vs WhatsApp breakdown</p>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="distribution-chart">
                                {stats.emailsSent + stats.whatsappSent > 0 ? (
                                    <>
                                        <div className="distribution-item">
                                            <div className="distribution-header">
                                                <Mail size={18} />
                                                <span>Email</span>
                                                <span className="distribution-percentage">
                                                    {Math.round((stats.emailsSent / (stats.emailsSent + stats.whatsappSent)) * 100)}%
                                                </span>
                                            </div>
                                            <div className="distribution-bar">
                                                <div
                                                    className="distribution-bar-fill email"
                                                    style={{
                                                        width: `${(stats.emailsSent / (stats.emailsSent + stats.whatsappSent)) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="distribution-value">{stats.emailsSent} messages</div>
                                        </div>
                                        <div className="distribution-item">
                                            <div className="distribution-header">
                                                <MessageCircle size={18} />
                                                <span>WhatsApp</span>
                                                <span className="distribution-percentage">
                                                    {Math.round((stats.whatsappSent / (stats.emailsSent + stats.whatsappSent)) * 100)}%
                                                </span>
                                            </div>
                                            <div className="distribution-bar">
                                                <div
                                                    className="distribution-bar-fill whatsapp"
                                                    style={{
                                                        width: `${(stats.whatsappSent / (stats.emailsSent + stats.whatsappSent)) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="distribution-value">{stats.whatsappSent} messages</div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="empty-chart">
                                        <Send size={48} />
                                        <p>No messages sent yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Campaign Timeline */}
                    <div className="card analytics-card">
                        <div className="card-header">
                            <div className="card-header-left">
                                <h2 className="card-title">
                                    <Calendar size={24} />
                                    Recent Activity
                                </h2>
                                <p className="card-description">Last 7 days campaign activity</p>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="timeline-chart">
                                {(() => {
                                    const last7Days = Array.from({ length: 7 }, (_, i) => {
                                        const date = new Date();
                                        date.setDate(date.getDate() - (6 - i));
                                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    });

                                    const campaignCounts = last7Days.map(day => {
                                        return campaigns.filter(c => {
                                            const created = parseFirestoreDate(c.created_at || c.createdAt);
                                            if (!created) return false;
                                            const createdStr = created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                            return createdStr === day;
                                        }).length;
                                    });

                                    const maxCount = Math.max(...campaignCounts, 1);

                                    return (
                                        <div className="timeline-bars">
                                            {last7Days.map((day, index) => (
                                                <div key={day} className="timeline-bar-group">
                                                    <div className="timeline-bar-wrapper">
                                                        <div
                                                            className="timeline-bar"
                                                            style={{
                                                                height: `${(campaignCounts[index] / maxCount) * 100}%`,
                                                                maxHeight: '120px'
                                                            }}
                                                        >
                                                            {campaignCounts[index] > 0 && (
                                                                <span className="timeline-bar-value">{campaignCounts[index]}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="timeline-label">{day}</div>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
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
                                        <td>{formatDate(campaign.created_at || campaign.createdAt)}</td>
                                        <td>
                                            {renderStatusBadge(campaign)}
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

    const renderCertificatesView = () => {
        // Create default certificate object
        const defaultCertificate = {
            id: 'default',
            certificate_number: 'DEFAULT',
            recipient_name: 'Default Certificate Template',
            phone_number: '-',
            email: '-',
            whatsapp_sent: false,
            created_at: null,
            pdf_url: certificateTemplate?.url || '/Certificate.jpg',
            is_default: true
        };

        // Combine default certificate with actual certificates
        const allCertificates = [defaultCertificate, ...certificates];

        const filteredCertificates = allCertificates.filter(cert =>
            cert.recipient_name?.toLowerCase().includes(certificateSearchQuery.toLowerCase()) ||
            cert.certificate_number?.toLowerCase().includes(certificateSearchQuery.toLowerCase()) ||
            cert.phone_number?.includes(certificateSearchQuery) ||
            cert.email?.toLowerCase().includes(certificateSearchQuery.toLowerCase())
        );

        const handlePreview = (certificate) => {
            setPreviewCertificate(certificate);
            setShowPreviewModal(true);
        };

        const handleDelete = async (id, certificateNumber) => {
            // Prevent deletion of default certificate
            if (id === 'default') {
                alert('Cannot delete the default certificate template. This is a system template.');
                return;
            }

            if (!window.confirm(`Are you sure you want to delete certificate ${certificateNumber}?`)) {
                return;
            }

            try {
                await certificateAPI.delete(id);
                alert('Certificate deleted successfully!');
                // Reload certificates
                const updatedCertificates = await certificateAPI.getAll();
                setCertificates(Array.isArray(updatedCertificates) ? updatedCertificates : []);
            } catch (error) {
                console.error('Error deleting certificate:', error);
                alert('Failed to delete certificate');
            }
        };

        const handleDownload = (certificate) => {
            // For default certificate, open the template image
            if (certificate.id === 'default') {
                const url = certificateTemplate?.url || '/Certificate.jpg';
                window.open(url, '_blank');
                return;
            }

            if (certificate.pdf_url) {
                window.open(certificate.pdf_url, '_blank');
            } else {
                alert('PDF URL not available for this certificate');
            }
        };

        const handleTemplateUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) {
                console.log('No file selected');
                return;
            }

            console.log('File selected:', file.name, file.type, file.size);

            // Validate file type
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file (JPG, PNG, etc.)');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return;
            }

            setTemplateUploading(true);

            try {
                // Convert to base64 using Promise
                const base64String = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        if (reader.error) {
                            reject(reader.error);
                        } else {
                            resolve(reader.result);
                        }
                    };
                    reader.onerror = () => {
                        reject(new Error('Failed to read file'));
                    };
                    reader.readAsDataURL(file);
                });

                console.log('File converted to base64, length:', base64String.length, 'bytes', `(${(base64String.length / 1024 / 1024).toFixed(2)}MB)`);

                // Check if base64 string is too large
                if (base64String.length > 10 * 1024 * 1024) {
                    throw new Error(`Image is too large (${(base64String.length / 1024 / 1024).toFixed(2)}MB). Please use an image smaller than 5MB.`);
                }

                console.log('Uploading to:', `${API_BASE_URL}/certificates/template`);

                // Check if API URL is accessible
                if (!API_BASE_URL || API_BASE_URL === 'undefined') {
                    throw new Error('API URL is not configured. Please set VITE_API_URL environment variable.');
                }

                // Upload to backend with timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

                let response;
                try {
                    response = await fetch(`${apiUrl}/certificates/template`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            image: base64String,
                            filename: file.name,
                            contentType: file.type
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                } catch (fetchError) {
                    clearTimeout(timeoutId);
                    if (fetchError.name === 'AbortError') {
                        throw new Error('Upload timeout: The request took too long. Please try with a smaller image or check your connection.');
                    } else if (fetchError.message && fetchError.message.includes('Failed to fetch')) {
                        throw new Error('Network error: Could not connect to the server. Please check your internet connection and ensure the API is accessible.');
                    }
                    throw fetchError;
                }

                console.log('Response status:', response.status);
                console.log('Response headers:', Object.fromEntries(response.headers.entries()));

                let errorData;
                let data;

                try {
                    const responseText = await response.text();
                    console.log('Response text:', responseText.substring(0, 200));

                    if (!response.ok) {
                        try {
                            errorData = JSON.parse(responseText);
                        } catch (parseError) {
                            errorData = {
                                error: `Server error (${response.status})`,
                                details: responseText.substring(0, 200) || response.statusText
                            };
                        }
                        console.error('Upload error response:', errorData);
                        throw new Error(errorData.error || errorData.details || `Upload failed with status ${response.status}: ${response.statusText}`);
                    }

                    try {
                        data = JSON.parse(responseText);
                    } catch (parseError) {
                        console.error('Failed to parse response as JSON:', parseError);
                        throw new Error('Invalid response format from server');
                    }

                    console.log('Upload successful:', data);

                    if (data.success && data.data) {
                        setCertificateTemplate(data.data);
                        alert('Certificate template uploaded successfully!');
                        setShowTemplateUpload(false);
                        // Reload template to show updated version
                        try {
                            const loadResponse = await fetch(`${apiUrl}/certificates/template`);
                            if (loadResponse.ok) {
                                const loadData = await loadResponse.json();
                                if (loadData.success && loadData.data && loadData.data.url) {
                                    setCertificateTemplate(loadData.data);
                                }
                            }
                        } catch (loadError) {
                            console.warn('Could not reload template:', loadError);
                        }
                    } else {
                        throw new Error(data.error || data.message || 'Invalid response from server');
                    }
                } catch (fetchError) {
                    // If it's already an Error with message, rethrow it
                    if (fetchError instanceof Error && fetchError.message) {
                        throw fetchError;
                    }
                    // Otherwise create a new error
                    throw new Error(fetchError.message || 'Failed to process server response');
                }
            } catch (error) {
                console.error('Error uploading template:', error);
                console.error('Error stack:', error.stack);

                // More detailed error messages
                let errorMessage = 'Failed to upload template';

                if (error.message) {
                    errorMessage = error.message;
                } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
                    errorMessage = 'Network error: Could not connect to server. Please check your internet connection and API URL.';
                } else if (error.name === 'SyntaxError') {
                    errorMessage = 'Server response error: Invalid data format received.';
                } else {
                    errorMessage = `Upload failed: ${error.message || error.toString()}`;
                }

                alert(errorMessage);
            } finally {
                setTemplateUploading(false);
                // Reset file input
                e.target.value = '';
            }
        };


        return (
            <>
                <div className="page-actions">
                    <div className="page-actions-left">
                        <h2>Certificates ({certificates.length})</h2>
                    </div>
                    <div className="page-actions-right">
                        <button
                            className="btn btn-outline"
                            onClick={() => setShowTemplateUpload(!showTemplateUpload)}
                            title="Upload Certificate Template"
                        >
                            <Image size={18} />
                            {certificateTemplate ? 'Update Template' : 'Upload Template'}
                        </button>
                        <div className="search-box">
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Search certificates..."
                                value={certificateSearchQuery}
                                onChange={(e) => setCertificateSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Certificate Template Upload Section */}
                {showTemplateUpload && (
                    <div className="card template-upload-card">
                        <div className="card-header">
                            <div className="card-header-left">
                                <h2 className="card-title">
                                    <Image size={24} />
                                    Certificate Template
                                </h2>
                                <p className="card-description">
                                    Upload a blank certificate image. Names and information will be automatically added when creating certificates.
                                </p>
                            </div>
                        </div>
                        <div className="card-body">
                            {certificateTemplate ? (
                                <div className="template-preview-section">
                                    <p className="template-preview-label">Current Template:</p>
                                    <div className="template-preview-image-wrapper">
                                        <img
                                            src={certificateTemplate.url}
                                            alt="Certificate Template"
                                            className="template-preview-image"
                                        />
                                    </div>
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={async () => {
                                            if (window.confirm('Are you sure you want to remove the custom template and use the default?')) {
                                                try {
                                                    const response = await fetch(`${API_BASE_URL}/certificates/template`, {
                                                        method: 'DELETE'
                                                    });
                                                    if (response.ok) {
                                                        setCertificateTemplate(null);
                                                        alert('Custom template removed. Default certificate will be used.');
                                                    }
                                                } catch (error) {
                                                    console.error('Error removing template:', error);
                                                    alert('Failed to remove template');
                                                }
                                            }
                                        }}
                                        style={{ marginTop: 'var(--spacing-sm)' }}
                                    >
                                        <X size={16} />
                                        Remove Custom Template
                                    </button>
                                </div>
                            ) : null}
                            <div className="form-group template-upload-group">
                                <label className="form-label template-upload-label">
                                    <Upload size={20} />
                                    Upload Blank Certificate Image
                                </label>
                                <div className="file-upload-wrapper">
                                    <input
                                        type="file"
                                        id="template-upload-input"
                                        accept="image/jpeg,image/jpg,image/png,image/gif"
                                        onChange={handleTemplateUpload}
                                        disabled={templateUploading}
                                        className="file-upload-input"
                                    />
                                    <label
                                        htmlFor="template-upload-input"
                                        className="file-upload-label"
                                        style={{
                                            opacity: templateUploading ? 0.6 : 1,
                                            cursor: templateUploading ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {templateUploading ? (
                                            <div className="upload-loading-state">
                                                <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '3px', borderColor: 'var(--primary)', borderTopColor: 'transparent' }}></div>
                                                <span>Uploading template...</span>
                                            </div>
                                        ) : (
                                            <div className="upload-ready-state">
                                                <div className="upload-icon-wrapper">
                                                    <Upload size={32} />
                                                </div>
                                                <span className="upload-text">Choose Image File</span>
                                                <span className="upload-subtext">Click or drag to upload</span>
                                            </div>
                                        )}
                                    </label>
                                </div>
                                <div className="template-upload-hint">
                                    <div className="hint-icon">ℹ️</div>
                                    <div className="hint-content">
                                        <strong>Supported formats:</strong> JPG, PNG
                                        <br />
                                        <strong>Max size:</strong> 5MB
                                        <br />
                                        <span className="hint-note">The image will be used as the background for all certificates</span>
                                    </div>
                                </div>
                            </div>
                            {templateUploading && (
                                <div className="template-upload-progress">
                                    <div className="spinner"></div>
                                    <p>Uploading template...</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="card table-card">
                    <div className="card-header">
                        <div className="card-header-left">
                            <h2 className="card-title">
                                <Award size={24} />
                                All Certificates
                            </h2>
                            <p className="card-description">
                                {certificateSearchQuery
                                    ? `Showing ${filteredCertificates.length} of ${certificates.length} certificates`
                                    : `Manage all ${certificates.length} generated certificates`
                                }
                            </p>
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
                            <h3>{certificateSearchQuery ? 'No certificates found' : 'No certificates yet'}</h3>
                            <p>
                                {certificateSearchQuery
                                    ? `No certificates match "${certificateSearchQuery}". Try a different search term.`
                                    : 'Certificates will appear here once they are created.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Recipient</th>
                                        <th>Certificate #</th>
                                        <th>Phone</th>
                                        <th>Email</th>
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
                                                <span>{cert.email || '-'}</span>
                                            </td>
                                            <td>
                                                {cert.id === 'default' ? (
                                                    <span className="badge badge-info">
                                                        <FileText size={12} />
                                                        Template
                                                    </span>
                                                ) : cert.whatsapp_sent ? (
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
                                                    {cert.id === 'default' ? 'System Template' : formatDate(cert.created_at)}
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
                                                        title={cert.id === 'default' ? 'View Template' : 'Download PDF'}
                                                    >
                                                        <Download size={16} />
                                                    </button>
                                                    {cert.id !== 'default' && (
                                                        <button
                                                            className="action-btn action-btn-delete"
                                                            onClick={() => handleDelete(cert.id, cert.certificate_number)}
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
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
                                        <td>{formatDate(campaign.created_at || campaign.createdAt)}</td>
                                        <td>
                                            {renderStatusBadge(campaign)}
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
                                        <td>{formatDate(campaign.created_at || campaign.createdAt)}</td>
                                        <td>
                                            {renderStatusBadge(campaign)}
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
                                <span className="template-date">Created {formatDate(template.createdAt)}</span>
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
                                                    {campaign.scheduledAt ? formatDateTime(campaign.scheduledAt) : 'Not set'}
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
                                        <td>{formatDate(campaign.created_at || campaign.createdAt)}</td>
                                        <td>
                                            {renderStatusBadge(campaign)}
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
                        <img
                            src="/logo.svg"
                            alt="Top Selling Properties Logo"
                            className="logo-image"
                        />
                        {(!sidebarCollapsed || sidebarHovered) && (
                            <div className="sidebar-brand-container">
                                <span className="sidebar-brand">Top Selling Properties</span>
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

            {/* Notification Overlay */}
            {showNotifications && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 999
                    }}
                    onClick={() => setShowNotifications(false)}
                />
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

                        <div className="notification-container" style={{ position: 'relative' }}>
                            <button
                                className="header-icon-btn notification-btn"
                                onClick={() => setShowNotifications(!showNotifications)}
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                                )}
                            </button>

                            {showNotifications && (
                                <div
                                    className="notification-dropdown"
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        minWidth: '320px',
                                        maxWidth: '400px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        zIndex: 1000,
                                        border: '1px solid #e5e7eb'
                                    }}
                                >
                                    <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                                            Notifications
                                        </h3>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={async () => {
                                                    try {
                                                        await notificationsService.markAllAsRead();
                                                        loadNotifications();
                                                    } catch (error) {
                                                        console.error('Error marking all as read:', error);
                                                    }
                                                }}
                                                style={{
                                                    fontSize: '12px',
                                                    color: '#3b82f6',
                                                    background: 'none',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    padding: '4px 8px'
                                                }}
                                            >
                                                Mark all read
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
                                                <Bell size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                                <p style={{ margin: 0 }}>No notifications</p>
                                            </div>
                                        ) : (
                                            notifications.map((notification) => {
                                                const getIcon = () => {
                                                    switch (notification.type) {
                                                        case 'success':
                                                            return <CheckCircle size={18} style={{ color: '#10b981' }} />;
                                                        case 'warning':
                                                            return <AlertCircle size={18} style={{ color: '#f59e0b' }} />;
                                                        case 'error':
                                                            return <AlertCircle size={18} style={{ color: '#ef4444' }} />;
                                                        default:
                                                            return <Bell size={18} style={{ color: '#3b82f6' }} />;
                                                    }
                                                };

                                                return (
                                                    <div
                                                        key={notification.id}
                                                        style={{
                                                            padding: '12px 16px',
                                                            borderBottom: '1px solid #f3f4f6',
                                                            cursor: 'pointer',
                                                            transition: 'background-color 0.2s',
                                                            backgroundColor: notification.read ? 'white' : '#f0f9ff'
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notification.read ? 'white' : '#f0f9ff'}
                                                        onClick={async () => {
                                                            if (!notification.read) {
                                                                try {
                                                                    await notificationsService.markAsRead(notification.id);
                                                                    loadNotifications();
                                                                } catch (error) {
                                                                    console.error('Error marking notification as read:', error);
                                                                }
                                                            }
                                                            if (notification.link) {
                                                                // Handle link navigation if needed
                                                            }
                                                            setShowNotifications(false);
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                                            {getIcon()}
                                                            <div style={{ flex: 1 }}>
                                                                <p style={{
                                                                    margin: 0,
                                                                    fontSize: '14px',
                                                                    fontWeight: notification.read ? '400' : '600',
                                                                    color: '#1f2937'
                                                                }}>
                                                                    {notification.title}
                                                                </p>
                                                                <p style={{
                                                                    margin: '4px 0 0 0',
                                                                    fontSize: '12px',
                                                                    color: '#6b7280'
                                                                }}>
                                                                    {notification.message}
                                                                </p>
                                                                {notification.created_at && (
                                                                    <p style={{
                                                                        margin: '4px 0 0 0',
                                                                        fontSize: '11px',
                                                                        color: '#9ca3af'
                                                                    }}>
                                                                        {formatDateTime(notification.created_at)}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {!notification.read && (
                                                                <div style={{
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    backgroundColor: '#3b82f6',
                                                                    marginTop: '6px'
                                                                }} />
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

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
                    certificates={certificates}
                    templates={templates}
                    onClose={() => setShowComposeModal(false)}
                    onSend={handleSendMessages}
                />
            )}

            {showPreviewModal && (
                <PreviewCertificateModal
                    certificate={previewCertificate}
                    onClose={() => setShowPreviewModal(false)}
                    certificateTemplate={certificateTemplate}
                />
            )}
        </div>
    );
}

export default MarketingDashboard;
