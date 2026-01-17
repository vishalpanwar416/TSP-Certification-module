import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api'; // Still needed for certificates API
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
    Image,
    Star,
    RefreshCw,
    Share2,
    Settings,
    Heart
} from 'lucide-react';
import * as XLSX from 'xlsx';
import SocialMediaAutomation from '../components/SocialMediaAutomation';
import { useAuth } from '../contexts/AuthContext';
// Use direct Firestore service instead of API-based service
import firebaseService from '../services/firebaseDirectService';
import messagingService from '../services/messagingService';
import notificationsService from '../services/notificationsService';
import { certificateAPI } from '../services/api';
import { campaignsAPI } from '../services/marketingService';
import PreviewCertificateModal from '../components/PreviewCertificateModal';
import MessageSendingLoader from '../components/MessageSendingLoader';
import BackgroundJobsNotification from '../components/BackgroundJobsNotification';
import { requestNotificationPermission, isNotificationEnabled, getNotificationPermission, showNotificationAlert } from '../utils/browserNotifications';
// Import view components
import DashboardView from '../components/marketing-views/DashboardView';
import EmailView from '../components/marketing-views/EmailView';
import WhatsAppView from '../components/marketing-views/WhatsAppView';
import ContactsView from '../components/marketing-views/ContactsView';
import CertificatesView from '../components/marketing-views/CertificatesView';
import TemplatesView from '../components/marketing-views/TemplatesView';
import ScheduledView from '../components/marketing-views/ScheduledView';
import CampaignDetailsModal from '../components/CampaignDetailsModal';
import { formatDate, formatDateTime, renderStatusBadge } from '../components/marketing-views/utils';


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

// formatDate and formatDateTime are now imported from '../components/marketing-views/utils'

// Create Contact Modal Component
function CreateContactModal({ onClose, onCreate }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        certificate_number: '',
        rera_awarde_no: '',
        professional: ''
    });
    const [creating, setCreating] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name && !formData.email && !formData.phone) {
            alert('Please provide at least a name, email, or phone number');
            return;
        }

        setCreating(true);
        try {
            await onCreate(formData);
            onClose();
        } catch (error) {
            console.error('Create contact component error:', error);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Create New Contact</h2>
                        <p className="modal-subtitle">Add a new contact to your database</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label htmlFor="name">
                                <Users size={14} />
                                Name <span className="text-muted">(optional)</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter contact name"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                <AtSign size={14} />
                                Email <span className="text-muted">(optional)</span>
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter email address"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">
                                <Phone size={14} />
                                Phone <span className="text-muted">(optional)</span>
                            </label>
                            <input
                                type="tel"
                                id="phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="Enter phone number"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="certificate_number">
                                <FileText size={14} />
                                Certificate Number <span className="text-muted">(optional)</span>
                            </label>
                            <input
                                type="text"
                                id="certificate_number"
                                name="certificate_number"
                                value={formData.certificate_number}
                                onChange={handleChange}
                                placeholder="Enter certificate number"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="rera_awarde_no">
                                <FileText size={14} />
                                RERA Awarde No. <span className="text-muted">(optional)</span>
                            </label>
                            <input
                                type="text"
                                id="rera_awarde_no"
                                name="rera_awarde_no"
                                value={formData.rera_awarde_no}
                                onChange={handleChange}
                                placeholder="Enter RERA awarde number"
                                className="form-input"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="professional">
                                <FileText size={14} />
                                Professional <span className="text-muted">(optional)</span>
                            </label>
                            <input
                                type="text"
                                id="professional"
                                name="professional"
                                value={formData.professional}
                                onChange={handleChange}
                                placeholder="Enter professional designation"
                                className="form-input"
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={creating || (!formData.name && !formData.email && !formData.phone)}
                        >
                            {creating ? (
                                <>
                                    <span className="btn-spinner"></span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    Create Contact
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

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
    // Channel selection - if type is null/undefined, default both to true for unified campaign
    const [sendViaEmail, setSendViaEmail] = useState(type === null || type === undefined ? true : type === 'email');
    const [sendViaWhatsApp, setSendViaWhatsApp] = useState(type === null || type === undefined ? true : type === 'whatsapp');
    
    const [subject, setSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [whatsappMessage, setWhatsappMessage] = useState('');
    const [selectedContacts, setSelectedContacts] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [includeCertificate, setIncludeCertificate] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState('');
    const [formatPDF, setFormatPDF] = useState(true);
    const [formatJPG, setFormatJPG] = useState(false);
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [whatsappCampaignName, setWhatsappCampaignName] = useState('');

    // Set default schedule to tomorrow at 10 AM
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        setScheduleDate(dateStr);
        setScheduleTime('10:00');
    }, []);

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
        if (!sendViaEmail && !sendViaWhatsApp) {
            alert('Please select at least one channel (Email or WhatsApp)');
            return;
        }
        if (sendViaEmail && !emailMessage.trim()) {
            alert('Please enter an email message');
            return;
        }
        if (sendViaWhatsApp && !whatsappMessage.trim()) {
            alert('Please enter a WhatsApp message');
            return;
        }
        if (sendViaEmail && !subject.trim()) {
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
        if (scheduleEnabled) {
            if (!scheduleDate || !scheduleTime) {
                alert('Please select both date and time for scheduling');
                return;
            }
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
            if (scheduledDateTime <= new Date()) {
                alert('Scheduled time must be in the future');
                return;
            }
        }

        setSending(true);
        try {
            // Log messages before sending for debugging
            console.log('📤 Frontend: Sending messages:');
            if (sendViaEmail) {
                console.log('   Email message length:', emailMessage?.length || 0);
                console.log('   Email message has newlines:', emailMessage?.includes('\n') || false);
                console.log('   Email message (first 200 chars):', emailMessage?.substring(0, 200) || '');
            }
            if (sendViaWhatsApp) {
                console.log('   WhatsApp message length:', whatsappMessage?.length || 0);
                console.log('   WhatsApp message has newlines:', whatsappMessage?.includes('\n') || false);
                console.log('   WhatsApp message (first 200 chars):', whatsappMessage?.substring(0, 200) || '');
            }
            console.log('   Channels: Email=' + sendViaEmail + ', WhatsApp=' + sendViaWhatsApp);

            const scheduledAt = scheduleEnabled ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : null;
            await onSend({
                sendViaEmail,
                sendViaWhatsApp,
                type: type || (sendViaEmail && sendViaWhatsApp ? 'both' : (sendViaEmail ? 'email' : 'whatsapp')),
                subject,
                emailMessage: sendViaEmail ? emailMessage : null,
                whatsappMessage: sendViaWhatsApp ? whatsappMessage : null,
                contactIds: selectedContacts,
                includeCertificate: includeCertificate && selectedCertificate ? {
                    certificateId: selectedCertificate,
                    formats: {
                        pdf: formatPDF,
                        jpg: formatJPG
                    }
                } : null,
                whatsappCampaign: whatsappCampaignName.trim() || null,
                scheduledAt
            });
            onClose();
        } catch (error) {
            console.error('Error in ComposeModal handleSend:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response,
                stack: error.stack
            });
            
            // Show more specific error message
            const errorMessage = error.response?.data?.error || 
                                error.response?.data?.message || 
                                error.message || 
                                'Failed to send messages';
            
            alert(`Failed to send messages: ${errorMessage}`);
        } finally {
            setSending(false);
        }
    };

    const isEmail = type === 'email' || (type === null && sendViaEmail && !sendViaWhatsApp);
    const isWhatsApp = type === 'whatsapp' || (type === null && sendViaWhatsApp && !sendViaEmail);
    const isBoth = (type === null || type === undefined) && sendViaEmail && sendViaWhatsApp;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal compose-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            {isBoth ? (
                                <>
                                    <Mail size={24} style={{ marginRight: '8px' }} />
                                    <MessageCircle size={24} style={{ marginRight: '8px' }} />
                                    New Campaign
                                </>
                            ) : isEmail ? (
                                <>
                                    <Mail size={24} />
                                    Compose Email
                                </>
                            ) : (
                                <>
                                    <MessageCircle size={24} />
                                    Compose WhatsApp Message
                                </>
                            )}
                        </h2>
                        <p className="modal-subtitle">
                            {isBoth 
                                ? 'Send bulk emails and WhatsApp messages to your contacts' 
                                : isEmail 
                                    ? 'Send bulk emails to your contacts' 
                                    : 'Send bulk WhatsApp messages to your contacts'}
                        </p>
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
                                            {isBoth 
                                                ? `${contact.email || 'No email'} | ${contact.phone || 'No phone'}` 
                                                : isEmail 
                                                    ? contact.email 
                                                    : contact.phone}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="compose-right">
                        <h4>Message</h4>

                        {/* Channel Selection - Only show when type is null/undefined (unified campaign) */}
                        {(type === null || type === undefined) && (
                            <div className="form-group" style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                                <label style={{ display: 'block', marginBottom: '0.75rem', fontWeight: '500', fontSize: '0.875rem' }}>
                                    Select Channels
                                </label>
                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={sendViaEmail}
                                            onChange={(e) => {
                                                setSendViaEmail(e.target.checked);
                                                if (!e.target.checked && !sendViaWhatsApp) {
                                                    setSendViaWhatsApp(true);
                                                }
                                            }}
                                        />
                                        <Mail size={18} />
                                        <span>Email</span>
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={sendViaWhatsApp}
                                            onChange={(e) => {
                                                setSendViaWhatsApp(e.target.checked);
                                                if (!e.target.checked && !sendViaEmail) {
                                                    setSendViaEmail(true);
                                                }
                                            }}
                                        />
                                        <MessageCircle size={18} />
                                        <span>WhatsApp</span>
                                    </label>
                                </div>
                            </div>
                        )}

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
                                        if (selectedTemplate.type === 'email') {
                                            setEmailMessage(selectedTemplate.content || '');
                                            if (selectedTemplate.subject) {
                                                setSubject(selectedTemplate.subject);
                                            }
                                        } else if (selectedTemplate.type === 'whatsapp') {
                                            setWhatsappMessage(selectedTemplate.content || '');
                                        }
                                    }
                                }}
                                style={{ marginBottom: '1rem' }}
                            >
                                <option value="">-- Select a template (optional) --</option>
                                {(templates || [])
                                    .filter(t => {
                                        if (type === null || type === undefined) {
                                            // For unified campaigns, show both email and whatsapp templates
                                            return t.type === 'email' || t.type === 'whatsapp';
                                        }
                                        return t.type === type;
                                    })
                                    .map(template => (
                                        <option key={template.id} value={template.id}>
                                            {template.name} ({template.type})
                                        </option>
                                    ))
                                }
                            </select>
                        </div>

                        {(sendViaEmail || isEmail) && (
                            <div className="form-group">
                                <label>Email Subject</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter email subject..."
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                        )}
                        {/* Email Message Body */}
                        {(sendViaEmail || isEmail) && (
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Mail size={16} />
                                    Email Message Body
                                </label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Type your email message here..."
                                    value={emailMessage}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        // Debug: Log when message changes to verify newlines are captured
                                        if (newValue.includes('\n')) {
                                            console.log('📝 Email Textarea: Message contains newline');
                                            console.log('   Length:', newValue.length);
                                            console.log('   Newline positions:', [...newValue.matchAll(/\n/g)].map(m => m.index));
                                            console.log('   Full value:', JSON.stringify(newValue));
                                        }
                                        setEmailMessage(newValue);
                                    }}
                                    rows={12}
                                />
                                <div className="personalization-hint" style={{ marginTop: '0.5rem' }}>
                                    <Zap size={16} />
                                    <span>Use <code>{'{{name}}'}</code> to personalize with recipient's name</span>
                                </div>
                            </div>
                        )}
                        
                        {/* WhatsApp Message Body */}
                        {(sendViaWhatsApp || isWhatsApp) && (
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MessageCircle size={16} />
                                    WhatsApp Message Body
                                </label>
                                <textarea
                                    className="form-textarea"
                                    placeholder="Type your WhatsApp message here..."
                                    value={whatsappMessage}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        // Debug: Log when message changes to verify newlines are captured
                                        if (newValue.includes('\n')) {
                                            console.log('📝 WhatsApp Textarea: Message contains newline');
                                            console.log('   Length:', newValue.length);
                                            console.log('   Newline positions:', [...newValue.matchAll(/\n/g)].map(m => m.index));
                                            console.log('   Full value:', JSON.stringify(newValue));
                                        }
                                        setWhatsappMessage(newValue);
                                    }}
                                    rows={8}
                                />
                                <div className="personalization-hint" style={{ marginTop: '0.5rem' }}>
                                    <Zap size={16} />
                                    <span>Use <code>{'{{name}}'}</code> to personalize with recipient's name</span>
                                </div>
                            </div>
                        )}

                        {/* WhatsApp Campaign Name (Optional) */}
                        {(sendViaWhatsApp || isWhatsApp) && (
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <MessageCircle size={16} />
                                    WhatsApp Campaign Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g., text_notification, bulk_message, custom_campaign"
                                    value={whatsappCampaignName}
                                    onChange={(e) => setWhatsappCampaignName(e.target.value)}
                                />
                                <small style={{ display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                                    Leave empty to use default campaign name from settings. This allows you to use different AiSensy campaigns for different message types.
                                </small>
                            </div>
                        )}

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

                        {/* Scheduling Section */}
                        <div className="form-group" style={{ marginTop: '1.5rem', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: '500', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={scheduleEnabled}
                                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                                />
                                <Calendar size={18} />
                                <span>Schedule for Later</span>
                            </label>

                            {scheduleEnabled && (
                                <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                                        <label className="form-label" htmlFor="schedule_date" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={16} />
                                            Date
                                        </label>
                                        <input
                                            type="date"
                                            id="schedule_date"
                                            className="form-input"
                                            value={scheduleDate}
                                            onChange={(e) => setScheduleDate(e.target.value)}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: '1', minWidth: '200px' }}>
                                        <label className="form-label" htmlFor="schedule_time" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Clock size={16} />
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            id="schedule_time"
                                            className="form-input"
                                            value={scheduleTime}
                                            onChange={(e) => setScheduleTime(e.target.value)}
                                        />
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
                                {scheduleEnabled ? 'Scheduling...' : 'Sending...'}
                            </>
                        ) : (
                            <>
                                {scheduleEnabled ? <Calendar size={18} /> : <Send size={18} />}
                                {scheduleEnabled ? 'Schedule' : 'Send'} to {selectedContacts.length} {selectedContacts.length === 1 ? 'Contact' : 'Contacts'}
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
    const [socialMediaFilterPlatform, setSocialMediaFilterPlatform] = useState('all');
    const [socialMediaFilterStatus, setSocialMediaFilterStatus] = useState('all');

    // Modal states
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCreateContactModal, setShowCreateContactModal] = useState(false);
    const [showComposeModal, setShowComposeModal] = useState(false);
    const [composeType, setComposeType] = useState('email');
    const [templates, setTemplates] = useState([]);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [scheduledCampaigns, setScheduledCampaigns] = useState([]);
    const [scheduledViewTab, setScheduledViewTab] = useState('active'); // 'active' or 'history'
    const [previewCertificate, setPreviewCertificate] = useState(null);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [showCampaignDetailsModal, setShowCampaignDetailsModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [previousNotificationIds, setPreviousNotificationIds] = useState(new Set());
    const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
        // Initialize state based on current permission
        if (typeof window !== 'undefined' && 'Notification' in window) {
            return Notification.permission === 'granted';
        }
        return false;
    });
    const [certificateTemplate, setCertificateTemplate] = useState(null);
    const [certificateTemplates, setCertificateTemplates] = useState([]); // All templates
    const [templateUploading, setTemplateUploading] = useState(false);
    const [showTemplateUpload, setShowTemplateUpload] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [certificateViewMode, setCertificateViewMode] = useState('certificates'); // 'certificates' or 'templates'
    
    // Message sending progress and background jobs
    const [showSendingLoader, setShowSendingLoader] = useState(false);
    const [sendingProgress, setSendingProgress] = useState({
        totalMessages: 0,
        sentMessages: 0,
        failedMessages: 0
    });
    const [backgroundJobs, setBackgroundJobs] = useState([]);
    const [currentJobId, setCurrentJobId] = useState(null);
    const [isBackgroundMode, setIsBackgroundMode] = useState(false);

    // Load data from Firebase on mount
    useEffect(() => {
        console.log('[MarketingDashboard] Component mounted');
        console.log('[MarketingDashboard] Firebase service available:', !!firebaseService);
        console.log('[MarketingDashboard] Contacts service available:', !!firebaseService?.contacts);
        console.log('[API DEBUG] Using Base URL:', API_BASE_URL);
        
        // Check notification permission immediately
        if (typeof window !== 'undefined' && 'Notification' in window) {
            const initialPermission = Notification.permission;
            console.log('[Notifications] Initial permission check:', initialPermission);
            setNotificationsEnabled(initialPermission === 'granted');
        }
        
        let isMounted = true;
        
        // Set loading to false after a short delay to ensure UI renders
        const timeout = setTimeout(() => {
            if (isMounted) {
                console.warn('[MarketingDashboard] Loading timeout - forcing UI to render');
                setLoading(false);
            }
        }, 3000);
        
        // Wrap in try-catch to prevent crashes
        const loadData = async () => {
            try {
                // Check current notification permission status immediately
                const currentPermission = getNotificationPermission();
                console.log('[Notifications] Current permission status:', currentPermission);
                
                if (isMounted) {
                    const isEnabled = currentPermission === 'granted';
                    setNotificationsEnabled(isEnabled);
                    
                    if (isEnabled) {
                        console.log('✅ Browser notifications already enabled');
                    } else if (currentPermission === 'denied') {
                        console.warn('⚠️ Browser notifications denied - user must enable in browser settings');
                    } else if (currentPermission === 'default') {
                        console.log('ℹ️ Notification permission not yet requested');
                        // Don't auto-request on page load - let user click the button
                    } else if (currentPermission === 'unsupported') {
                        console.warn('⚠️ Browser does not support notifications');
                    }
                }
                
                await loadDataFromFirebase();
                await loadNotifications();
            } catch (error) {
                console.error('[MarketingDashboard] Error in useEffect:', error);
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        
        loadData();
        
        return () => {
            isMounted = false;
            clearTimeout(timeout);
        };
    }, []);

    // Load notifications from backend
    const loadNotifications = async () => {
        try {
            const response = await notificationsService.getAll({ limit: 20 });
            const newNotifications = response.data || response || [];
            
            // Detect new notifications and show browser notifications
            if (previousNotificationIds.size > 0 && notificationsEnabled) {
                newNotifications.forEach((notification) => {
                    if (!previousNotificationIds.has(notification.id) && !notification.read) {
                        // This is a new unread notification
                        showNotificationAlert(notification);
                    }
                });
            }
            
            // Update previous notification IDs
            const newIds = new Set(newNotifications.map(n => n.id));
            setPreviousNotificationIds(newIds);
            
            setNotifications(newNotifications);
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

    // Check notification permission status periodically (in case user enables in browser settings)
    useEffect(() => {
        const checkPermission = () => {
            const currentPermission = getNotificationPermission();
            const isEnabled = currentPermission === 'granted';
            setNotificationsEnabled(isEnabled);
            
            if (isEnabled && !notificationsEnabled) {
                console.log('✅ Notifications were enabled (detected via periodic check)');
            }
        };

        // Check immediately
        checkPermission();

        // Check every 3 seconds (more frequent for better UX)
        const interval = setInterval(checkPermission, 3000);

        return () => clearInterval(interval);
    }, [notificationsEnabled]);

    // Load certificate templates when certificates tab is active
    useEffect(() => {
        const loadCertificateTemplates = async () => {
            try {
                // Load all templates
                const templatesResponse = await fetch(`${API_BASE_URL}/certificates/templates`);
                if (templatesResponse.ok) {
                    const templatesData = await templatesResponse.json();
                    if (templatesData.success && Array.isArray(templatesData.data)) {
                        setCertificateTemplates(templatesData.data);
                    }
                }
                
                // Load default template for backward compatibility
                const defaultResponse = await fetch(`${API_BASE_URL}/certificates/template`);
                if (defaultResponse.ok) {
                    const defaultData = await defaultResponse.json();
                    if (defaultData.success) {
                        if (defaultData.data && defaultData.data.url && !defaultData.data.isDefault) {
                            setCertificateTemplate(defaultData.data);
                        } else {
                            setCertificateTemplate(null);
                        }
                    }
                }
            } catch (error) {
                console.error('Error loading templates:', error);
                setCertificateTemplates([]);
                setCertificateTemplate(null);
            }
        };

        if (activeTab === 'certificates') {
            loadCertificateTemplates();
        }
    }, [activeTab]);

    const loadDataFromFirebase = async () => {
        setLoading(true);
        const errors = [];
        let loadedContacts = [];
        let loadedCampaigns = [];
        let loadedTemplates = [];
        let loadedCertificates = [];
        
        try {
            console.log('[DEBUG] Starting to load data from Firestore...');
            console.log('[DEBUG] Using direct Firestore access (no API required)');
            console.log('[DEBUG] Firebase service available:', !!firebaseService);
            console.log('[DEBUG] Contacts service available:', !!firebaseService?.contacts);
            
            // Load contacts - with individual error handling
            try {
                console.log('[DEBUG] Loading contacts from Firestore...');
                if (!firebaseService?.contacts) {
                    throw new Error('Contacts service not available');
                }
                const contactsData = await firebaseService.contacts.getAll();
                console.log('[DEBUG] Contacts loaded:', contactsData?.length || 0, 'items');
                loadedContacts = Array.isArray(contactsData) ? contactsData : [];
                setContacts(loadedContacts);
            } catch (error) {
                console.error('[ERROR] Error loading contacts:', error);
                console.error('[ERROR] Contact error details:', error.message, error.code);
                console.error('[ERROR] Contact error stack:', error.stack);
                errors.push('contacts');
                setContacts([]);
            }

            // Load campaigns - with individual error handling
            try {
                console.log('[DEBUG] Loading campaigns from Firestore...');
                const campaignsData = await firebaseService.campaigns.getAll();
                console.log('[DEBUG] Campaigns loaded:', campaignsData?.length || 0, 'items');
                loadedCampaigns = Array.isArray(campaignsData) ? campaignsData : [];
                setCampaigns(loadedCampaigns);
            } catch (error) {
                console.error('[ERROR] Error loading campaigns:', error);
                console.error('[ERROR] Campaign error details:', error.message, error.code);
                errors.push('campaigns');
                setCampaigns([]);
            }

            // Load templates - with individual error handling
            try {
                console.log('[DEBUG] Loading templates from Firestore...');
                const templatesData = await firebaseService.templates.getAll();
                console.log('[DEBUG] Templates loaded:', templatesData?.length || 0, 'items');
                loadedTemplates = Array.isArray(templatesData) ? templatesData : [];
                setTemplates(loadedTemplates);
            } catch (error) {
                console.error('[ERROR] Error loading templates:', error);
                console.error('[ERROR] Template error details:', error.message, error.code);
                errors.push('templates');
                setTemplates([]);
            }

            // Load certificates - with individual error handling
            try {
                console.log('[DEBUG] Loading certificates...');
                const certificatesData = await certificateAPI.getAll();
                console.log('[DEBUG] Certificates loaded:', certificatesData?.length || 0, 'items');
                loadedCertificates = Array.isArray(certificatesData) ? certificatesData : [];
                setCertificates(loadedCertificates);
            } catch (error) {
                console.error('[ERROR] Error loading certificates:', error);
                console.error('[ERROR] Certificate error details:', error.message, error.stack);
                errors.push('certificates');
                setCertificates([]);
            }

            // Update stats with whatever data we successfully loaded
            updateStats(loadedContacts, loadedCampaigns);
            
            // Only show alert if ALL data loading failed
            if (errors.length === 4) {
                console.error('[ERROR] All data loading failed');
                console.error('[ERROR] This might be due to:');
                console.error('[ERROR] 1. Firestore not initialized');
                console.error('[ERROR] 2. Firestore security rules blocking access');
                console.error('[ERROR] 3. Network connectivity issues');
                console.error('[ERROR] 4. Collections do not exist in Firestore');
                // Don't show alert - just log to console to prevent blocking UI
                // alert(`Failed to load data: ${errorMsg}\n\nPlease check:\n1. Is the backend server running?\n2. Is the API URL correct? (Check console for [API Config])\n3. Check browser console for more details.`);
            } else if (errors.length > 0) {
                console.warn(`[WARNING] Some data failed to load: ${errors.join(', ')}. The app will continue with available data.`);
                // Don't show alert for partial failures - just log to console
            } else {
                console.log('[DEBUG] Data loading completed successfully');
            }
        } catch (error) {
            // This catch is for unexpected errors
            console.error('[ERROR] Unexpected error loading data:', error);
            console.error('[ERROR] Error details:', error.message, error.stack);
            console.error('[ERROR] API Base URL was:', API_BASE_URL);
            console.error('[ERROR] Error response:', error.response);
            
            // Only show alert if we have no data at all
            if (loadedContacts.length === 0 && loadedCampaigns.length === 0 && loadedTemplates.length === 0 && loadedCertificates.length === 0) {
                const errorMsg = error.response?.data?.error || 
                                error.response?.data?.message || 
                                error.message || 
                                'Failed to load data from backend';
                
                alert(`Failed to load data: ${errorMsg}\n\nPlease check:\n1. Is the backend server running?\n2. Is the API URL correct? (Check console for [API Config])\n3. Check browser console for more details.`);
            }
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

    // Handle create contact - Save to Firebase
    const handleCreateContact = async (contactData) => {
        try {
            setLoading(true);
            await firebaseService.contacts.create(contactData);

            // Reload contacts from Firebase
            const updatedContacts = await firebaseService.contacts.getAll();
            setContacts(updatedContacts);
            updateStats(updatedContacts, campaigns);

            alert('Contact created successfully!');
        } catch (error) {
            console.error('Error creating contact:', error);
            alert(`Failed to create contact: ${error.message}`);
            throw error; // Re-throw so modal can handle it
        } finally {
            setLoading(false);
        }
    };

    // Poll campaign progress
    const pollCampaignProgress = async (campaignId, jobId, totalContacts) => {
        try {
            const campaign = await firebaseService.campaigns.getById(campaignId);
            if (campaign) {
                const sent = campaign.sent_count || campaign.sentCount || 0;
                const failed = campaign.failed_count || campaign.failedCount || 0;
                const total = campaign.recipient_count || campaign.recipientCount || totalContacts || 0;
                const status = campaign.status;

                // Update background job if exists
                if (jobId) {
                    setBackgroundJobs(prev => {
                        const updated = prev.map(job => {
                            if (job.id === jobId) {
                                // If this job has multiple campaigns, aggregate them
                                const jobCampaigns = job.campaignIds || [];
                                if (jobCampaigns.length > 1) {
                                    // For multi-campaign jobs, we need to get all campaigns
                                    return { ...job, status };
                                } else {
                                    // Single campaign job
                                    return { ...job, sentMessages: sent, failedMessages: failed, status };
                                }
                            }
                            return job;
                        });
                        
                        // Update progress if loader is visible
                        if (showSendingLoader && updated.find(j => j.id === jobId)) {
                            const activeJobs = updated.filter(j => {
                                const remaining = j.totalMessages - j.sentMessages - j.failedMessages;
                                return remaining > 0;
                            });
                            
                            if (activeJobs.length > 0) {
                                const totalMessages = activeJobs.reduce((sum, j) => sum + j.totalMessages, 0);
                                const sentMessages = activeJobs.reduce((sum, j) => sum + j.sentMessages, 0);
                                const failedMessages = activeJobs.reduce((sum, j) => sum + j.failedMessages, 0);
                                
                                setSendingProgress({
                                    totalMessages,
                                    sentMessages,
                                    failedMessages
                                });
                            }
                        }
                        
                        return updated;
                    });
                }

                // Continue polling if not completed
                if (status === 'pending' || status === 'sending') {
                    setTimeout(() => pollCampaignProgress(campaignId, jobId, totalContacts), 2000);
                } else {
                    // Campaign completed
                    if (jobId) {
                        // For jobs with multiple campaigns, we need to check all campaigns
                        setBackgroundJobs(prev => {
                            const job = prev.find(j => j.id === jobId);
                            if (job && job.campaignIds && job.campaignIds.length > 1) {
                                // Multi-campaign job - update this campaign's progress
                                // The job will be removed when all campaigns complete
                                return prev;
                            } else {
                                // Single campaign job - remove after delay
                                setTimeout(() => {
                                    setBackgroundJobs(prevJobs => prevJobs.filter(j => j.id !== jobId));
                                }, 5000);
                            }
                            return prev;
                        });
                    }
                    
                    // Check if all active jobs are complete
                    setTimeout(() => {
                        setBackgroundJobs(prev => {
                            const activeJobs = prev.filter(j => {
                                const remaining = j.totalMessages - j.sentMessages - j.failedMessages;
                                return remaining > 0;
                            });
                            if (activeJobs.length === 0 && showSendingLoader && !isBackgroundMode) {
                                setShowSendingLoader(false);
                            }
                            return prev;
                        });
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error polling campaign progress:', error);
            // Continue polling even on error (might be temporary)
            setTimeout(() => pollCampaignProgress(campaignId, jobId, totalContacts), 5000);
        }
    };

    // Handle send in background
    const handleSendInBackground = () => {
        setIsBackgroundMode(true);
        setShowSendingLoader(false);
    };

    // Handle send messages - Uses messaging service
    const handleSendMessages = async (data) => {
        const selectedContactsList = contacts.filter(c => data.contactIds.includes(c.id));

        try {
            setLoading(true);
            
            // Initialize progress tracking
            const totalContacts = data.contactIds.length;
            const sendBoth = data.sendViaEmail && data.sendViaWhatsApp;
            const totalMessages = sendBoth ? totalContacts * 2 : totalContacts;
            
            setSendingProgress({
                totalMessages,
                sentMessages: 0,
                failedMessages: 0
            });
            setShowSendingLoader(true);
            setIsBackgroundMode(false);

            // Check if both channels are selected
            let results = [];
            let campaignIds = [];
            
            if (sendBoth) {
                // Create campaigns for both email and WhatsApp
                const emailCampaign = messagingService.createAndSendCampaign(
                    {
                        type: 'email',
                        subject: data.subject,
                        message: data.emailMessage,
                        contactIds: data.contactIds,
                        includeCertificate: data.includeCertificate,
                        scheduledAt: data.scheduledAt || null,
                        whatsappCampaign: null
                    },
                    contacts
                );
                
                const whatsappCampaign = messagingService.createAndSendCampaign(
                    {
                        type: 'whatsapp',
                        subject: null,
                        message: data.whatsappMessage,
                        contactIds: data.contactIds,
                        includeCertificate: data.includeCertificate,
                        scheduledAt: data.scheduledAt || null,
                        whatsappCampaign: data.whatsappCampaign || null
                    },
                    contacts
                );
                
                // Execute both campaigns in parallel
                results = await Promise.allSettled([emailCampaign, whatsappCampaign]);
                
                if (results[0].status === 'fulfilled' && results[0].value?.id) {
                    campaignIds.push(results[0].value.id);
                }
                if (results[1].status === 'fulfilled' && results[1].value?.id) {
                    campaignIds.push(results[1].value.id);
                }
            } else {
                // Single channel campaign
                const result = await messagingService.createAndSendCampaign(
                    {
                        type: data.sendViaEmail ? 'email' : 'whatsapp',
                        subject: data.subject,
                        message: data.sendViaEmail ? data.emailMessage : data.whatsappMessage,
                        contactIds: data.contactIds,
                        includeCertificate: data.includeCertificate,
                        scheduledAt: data.scheduledAt || null,
                        whatsappCampaign: data.whatsappCampaign || null
                    },
                    contacts
                );
                results = [{ status: 'fulfilled', value: result }];
                if (result?.id) {
                    campaignIds.push(result.id);
                }
            }

            // Create background job
            const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            setCurrentJobId(jobId);
            
            const newJob = {
                id: jobId,
                campaignIds,
                totalMessages,
                sentMessages: 0,
                failedMessages: 0,
                status: 'sending',
                createdAt: new Date()
            };
            
            setBackgroundJobs(prev => [...prev, newJob]);

            // Start polling for progress - aggregate all campaigns for this job
            const pollAllCampaigns = async () => {
                try {
                    const allCampaigns = await firebaseService.campaigns.getAll();
                    const relevantCampaigns = allCampaigns.filter(c => campaignIds.includes(c.id));
                    
                    if (relevantCampaigns.length > 0) {
                        const totalSent = relevantCampaigns.reduce((sum, c) => sum + (c.sent_count || c.sentCount || 0), 0);
                        const totalFailed = relevantCampaigns.reduce((sum, c) => sum + (c.failed_count || c.failedCount || 0), 0);
                        const allComplete = relevantCampaigns.every(c => 
                            c.status === 'completed' || c.status === 'failed' || c.status === 'partial'
                        );
                        
                        // Update background job
                        setBackgroundJobs(prev => prev.map(job => 
                            job.id === jobId 
                                ? { ...job, sentMessages: totalSent, failedMessages: totalFailed, status: allComplete ? 'completed' : 'sending' }
                                : job
                        ));
                        
                        // Update progress if loader is visible
                        if (showSendingLoader) {
                            setSendingProgress({
                                totalMessages,
                                sentMessages: totalSent,
                                failedMessages: totalFailed
                            });
                        }
                        
                        // Continue polling if not all complete
                        if (!allComplete) {
                            setTimeout(pollAllCampaigns, 2000);
                        } else {
                            // All campaigns complete - remove job after delay
                            setTimeout(() => {
                                setBackgroundJobs(prev => prev.filter(job => job.id !== jobId));
                            }, 5000);
                            
                            if (showSendingLoader && !isBackgroundMode) {
                                setTimeout(() => setShowSendingLoader(false), 2000);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error polling campaigns:', error);
                    setTimeout(pollAllCampaigns, 5000);
                }
            };
            
            // Start polling
            pollAllCampaigns();

            // Reload data from Firebase (non-blocking)
            firebaseService.contacts.getAll().then(updatedContacts => {
                setContacts(updatedContacts);
            }).catch(console.error);
            
            firebaseService.campaigns.getAll().then(updatedCampaigns => {
                setCampaigns(updatedCampaigns);
                updateStats(contacts, updatedCampaigns);
            }).catch(console.error);

            // If background mode, don't wait for completion
            if (isBackgroundMode) {
                setLoading(false);
                return;
            }

            // Wait for campaigns to complete (with timeout)
            const maxWaitTime = 300000; // 5 minutes
            const startTime = Date.now();
            
            while (Date.now() - startTime < maxWaitTime) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Check if all campaigns are complete
                const allCampaigns = await firebaseService.campaigns.getAll();
                const relevantCampaigns = allCampaigns.filter(c => campaignIds.includes(c.id));
                const allComplete = relevantCampaigns.every(c => 
                    c.status === 'completed' || c.status === 'failed' || c.status === 'partial'
                );
                
                if (allComplete) {
                    break;
                }
            }

            // Process results and show appropriate message
            if (sendBoth) {
                const emailResult = results[0].status === 'fulfilled' ? results[0].value : null;
                const whatsappResult = results[1].status === 'fulfilled' ? results[1].value : null;
                
                const emailSent = emailResult?.sent_count ?? emailResult?.sentCount ?? emailResult?.sent ?? 0;
                const emailFailed = emailResult?.failed_count ?? emailResult?.failedCount ?? emailResult?.failed ?? 0;
                const whatsappSent = whatsappResult?.sent_count ?? whatsappResult?.sentCount ?? whatsappResult?.sent ?? 0;
                const whatsappFailed = whatsappResult?.failed_count ?? whatsappResult?.failedCount ?? whatsappResult?.failed ?? 0;
                
                const totalSent = emailSent + whatsappSent;
                const totalFailed = emailFailed + whatsappFailed;
                
                setSendingProgress({
                    totalMessages,
                    sentMessages: totalSent,
                    failedMessages: totalFailed
                });
                
                if (results[0].status === 'rejected' || results[1].status === 'rejected') {
                    const emailError = results[0].status === 'rejected' ? results[0].reason?.message : '';
                    const whatsappError = results[1].status === 'rejected' ? results[1].reason?.message : '';
                    if (!isBackgroundMode) {
                        alert(`⚠️ Campaign status: Partial. Email: ${emailSent}/${totalContacts} sent, ${emailFailed} failed. WhatsApp: ${whatsappSent}/${totalContacts} sent, ${whatsappFailed} failed.${emailError ? ' Email error: ' + emailError : ''}${whatsappError ? ' WhatsApp error: ' + whatsappError : ''}`);
                    }
                } else if (totalFailed > 0) {
                    if (!isBackgroundMode) {
                        alert(`⚠️ Campaign status: Partial. Email: ${emailSent}/${totalContacts} sent, ${emailFailed} failed. WhatsApp: ${whatsappSent}/${totalContacts} sent, ${whatsappFailed} failed.`);
                    }
                } else {
                    if (!isBackgroundMode) {
                        alert(`✅ Campaign completed. Email: ${emailSent}/${totalContacts} sent. WhatsApp: ${whatsappSent}/${totalContacts} sent.`);
                    }
                }
            } else {
                const result = results[0].value;
                const sent = result.sent_count ?? result.sentCount ?? result.sent ?? 0;
                const failed = result.failed_count ?? result.failedCount ?? result.failed ?? 0;
                const total = result.recipient_count ?? result.recipientCount ?? result.total ?? totalContacts;
                const status = result.status || (failed > 0 ? (sent > 0 ? 'partial' : 'failed') : 'completed');

                setSendingProgress({
                    totalMessages: total,
                    sentMessages: sent,
                    failedMessages: failed
                });

                if (!isBackgroundMode) {
                    if (failed > 0) {
                        const errors = result.errors && Array.isArray(result.errors) ? result.errors : [];
                        const firstError = errors.length ? ` First error: ${errors[0].error || ''}` : '';
                        alert(`⚠️ Campaign status: ${status}. Sent ${sent}/${total}. Failed ${failed}.${firstError}`);
                    } else {
                        alert(`✅ Campaign ${status}. Sent ${sent}/${total} messages.`);
                    }
                }
            }
        } catch (error) {
            console.error('Error sending messages:', error);
            console.error('Error details:', {
                message: error.message,
                response: error.response,
                stack: error.stack
            });
            
            // Show more specific error message
            const errorMessage = error.response?.data?.error || 
                                error.response?.data?.message || 
                                error.message || 
                                'Failed to send messages. Please try again.';
            
            if (!isBackgroundMode) {
                alert(`Failed to send messages: ${errorMessage}`);
                setShowSendingLoader(false);
            }
        } finally {
            setLoading(false);
            if (!isBackgroundMode) {
                // Keep loader open if there are still messages being sent
                setTimeout(() => {
                    const remaining = sendingProgress.totalMessages - sendingProgress.sentMessages - sendingProgress.failedMessages;
                    if (remaining <= 0) {
                        setShowSendingLoader(false);
                    }
                }, 2000);
            }
        }
    };

    // Handle retry failed messages
    const handleProcessOverdue = async () => {
        if (!confirm('Process all overdue scheduled campaigns? This will send campaigns that are past their scheduled time.')) {
            return;
        }

        try {
            setLoading(true);
            const result = await campaignsAPI.processOverdue();
            
            if (result.success) {
                alert(`Successfully processed ${result.processed} overdue campaign(s)!`);
                // Reload campaigns to refresh the view
                const updatedCampaigns = await firebaseService.campaigns.getAll();
                setCampaigns(updatedCampaigns);
                updateStats(contacts, updatedCampaigns);
            } else {
                alert('Failed to process overdue campaigns. Please try again.');
            }
        } catch (error) {
            console.error('Error processing overdue campaigns:', error);
            alert(`Failed to process overdue campaigns: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRetryFailed = async (campaignId) => {
        if (!window.confirm('Retry sending failed messages for this campaign?')) {
            return;
        }

        try {
            setLoading(true);
            // Use campaignsAPI.retry from marketingService instead of firebaseService
            const result = await campaignsAPI.retry(campaignId);

            // Reload data from Firebase
            const [updatedContacts, updatedCampaigns] = await Promise.all([
                firebaseService.contacts.getAll(),
                firebaseService.campaigns.getAll()
            ]);

            setContacts(updatedContacts);
            setCampaigns(updatedCampaigns);
            updateStats(updatedContacts, updatedCampaigns);

            const retryResults = result.data?.retryResults || result;
            const sent = retryResults.sentCount || retryResults.sent_count || 0;
            const failed = retryResults.failedCount || retryResults.failed_count || 0;

            if (failed > 0) {
                alert(`⚠️ Retry completed. Sent ${sent} messages, ${failed} still failed.`);
            } else {
                alert(`✅ Retry successful! All ${sent} messages sent successfully.`);
            }
        } catch (error) {
            console.error('Error retrying campaign:', error);
            alert('Failed to retry messages: ' + (error.response?.data?.error || error.message));
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
        { id: 'social-media', label: 'Social Media', icon: Share2 },
        { id: 'settings', label: 'Settings', icon: Settings },
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
            case 'social-media': return 'Social Media Automation';
            case 'settings': return 'Settings';
            default: return 'Dashboard';
        }
    };


    const renderSettingsView = () => {
        return (
            <div style={{ width: '100%', minHeight: '500px' }}>

                {/* Other Settings Sections */}
                <div className="card" style={{ marginTop: '24px' }}>
                    <div className="card-body" style={{ padding: 'var(--spacing-lg)' }}>
                        <div className="settings-section" style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>API Configuration</h4>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>API Base URL</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={API_BASE_URL}
                                    readOnly
                                    style={{ backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed', opacity: 0.8 }}
                                />
                                <small className="form-hint" style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Current API endpoint configuration</small>
                            </div>
                        </div>

                        <div className="settings-section" style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Bell size={20} />
                                Notification Settings
                            </h4>
                            
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Browser Notifications</label>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '1rem',
                                    padding: '1rem',
                                    backgroundColor: notificationsEnabled ? '#d1fae5' : (getNotificationPermission() === 'denied' ? '#fee2e2' : '#fef3c7'),
                                    borderRadius: '8px',
                                    border: `1px solid ${notificationsEnabled ? '#10b981' : (getNotificationPermission() === 'denied' ? '#ef4444' : '#fbbf24')}`
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, color: notificationsEnabled ? '#065f46' : (getNotificationPermission() === 'denied' ? '#991b1b' : '#92400e'), marginBottom: '0.25rem' }}>
                                            {notificationsEnabled ? '✅ Notifications Enabled' : (getNotificationPermission() === 'denied' ? '❌ Notifications Blocked' : '⚠️ Notifications Disabled')}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', color: notificationsEnabled ? '#047857' : (getNotificationPermission() === 'denied' ? '#dc2626' : '#b45309') }}>
                                            {notificationsEnabled 
                                                ? 'You will receive browser notifications for new alerts and updates.'
                                                : (getNotificationPermission() === 'denied' 
                                                    ? 'Notifications are blocked. Enable them in your browser settings.'
                                                    : 'Enable browser notifications to receive alerts for new notifications, campaign updates, and system events.')}
                                        </div>
                                    </div>
                                    {!notificationsEnabled && (
                                        <button
                                            className="btn"
                                            style={{
                                                backgroundColor: getNotificationPermission() === 'denied' ? '#ef4444' : '#f59e0b',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: 600,
                                                fontSize: '0.875rem'
                                            }}
                                            onClick={async () => {
                                                try {
                                                    const currentPermission = getNotificationPermission();
                                                    
                                                    if (currentPermission === 'denied') {
                                                        const userAgent = navigator.userAgent.toLowerCase();
                                                        let instructions = 'Notifications are blocked. Please enable them in your browser settings:\n\n';
                                                        
                                                        if (userAgent.includes('chrome') || userAgent.includes('chromium')) {
                                                            instructions += 'Chrome: Click the lock icon in the address bar → Site settings → Notifications → Allow';
                                                        } else if (userAgent.includes('firefox')) {
                                                            instructions += 'Firefox: Click the lock icon → More Information → Permissions → Notifications → Allow';
                                                        } else if (userAgent.includes('safari')) {
                                                            instructions += 'Safari: Safari → Preferences → Websites → Notifications → Allow for this site';
                                                        } else if (userAgent.includes('edge')) {
                                                            instructions += 'Edge: Click the lock icon → Site permissions → Notifications → Allow';
                                                        } else {
                                                            instructions += 'Go to your browser settings and allow notifications for this site';
                                                        }
                                                        
                                                        alert(instructions);
                                                        setTimeout(() => {
                                                            const newPermission = getNotificationPermission();
                                                            setNotificationsEnabled(newPermission === 'granted');
                                                        }, 1000);
                                                        return;
                                                    }
                                                    
                                                    if (currentPermission === 'unsupported') {
                                                        alert('Your browser does not support notifications.');
                                                        return;
                                                    }
                                                    
                                                    const permission = await requestNotificationPermission();
                                                    setNotificationsEnabled(permission === 'granted');
                                                    
                                                    if (permission === 'granted') {
                                                        try {
                                                            const testNotification = new Notification('Notifications Enabled!', {
                                                                body: 'You will now receive browser notifications for new alerts.',
                                                                icon: '/favicon.ico',
                                                                tag: 'notification-enabled'
                                                            });
                                                            
                                                            testNotification.onclick = () => {
                                                                window.focus();
                                                                testNotification.close();
                                                            };
                                                            
                                                            setTimeout(() => {
                                                                testNotification.close();
                                                            }, 3000);
                                                        } catch (notifError) {
                                                            console.error('Error showing test notification:', notifError);
                                                        }
                                                    } else if (permission === 'denied') {
                                                        alert('Notifications were denied. Please enable them in your browser settings.');
                                                    }
                                                } catch (error) {
                                                    console.error('Error enabling notifications:', error);
                                                    alert('Error enabling notifications. Please check your browser settings.');
                                                }
                                            }}
                                        >
                                            {getNotificationPermission() === 'denied' ? 'Enable in Browser' : 'Enable Notifications'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notification Status</label>
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    padding: '1rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: '8px',
                                    fontSize: '0.875rem'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Permission Status:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {getNotificationPermission() === 'granted' ? '✅ Granted' : 
                                             getNotificationPermission() === 'denied' ? '❌ Denied' : 
                                             getNotificationPermission() === 'default' ? '⏳ Not Requested' : 
                                             '❓ Unsupported'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Unread Notifications:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{unreadCount}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Total Notifications:</span>
                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{notifications.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notification Preferences</label>
                                <small className="form-hint" style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                    Browser notifications will alert you about:
                                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                        <li>New notifications from the system</li>
                                        <li>Campaign completion status</li>
                                        <li>Certificate generation updates</li>
                                        <li>Important system events</li>
                                    </ul>
                                </small>
                            </div>
                        </div>

                        <div className="settings-section">
                            <h4 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem' }}>Actions</h4>
                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <button className="btn btn-secondary" onClick={() => window.location.reload()}>
                                    <RefreshCw size={18} />
                                    Refresh Page
                                </button>
                                <button className="btn btn-secondary" onClick={() => {
                                    if (confirm('Are you sure you want to clear the browser cache?')) {
                                        localStorage.clear();
                                        window.location.reload();
                                    }
                                }}>
                                    <Trash2 size={18} />
                                    Clear Cache
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderContent = () => {
        try {
            switch (activeTab) {
            case 'contacts':
                return (
                    <ContactsView
                        contacts={contacts}
                        filteredContacts={filteredContacts}
                        onShowUploadModal={() => setShowUploadModal(true)}
                        onShowCreateContactModal={() => setShowCreateContactModal(true)}
                        onDeleteContact={handleDeleteContact}
                        onPreviewCertificate={setPreviewCertificate}
                        onShowPreviewModal={setShowPreviewModal}
                    />
                );
            case 'certificates':
                return (
                    <CertificatesView
                        certificates={certificates}
                        certificateTemplates={certificateTemplates}
                        certificateViewMode={certificateViewMode}
                        onSetCertificateViewMode={setCertificateViewMode}
                        searchQuery={searchQuery}
                        loading={loading}
                        newTemplateName={newTemplateName}
                        onSetNewTemplateName={setNewTemplateName}
                        templateUploading={templateUploading}
                        onSetTemplateUploading={setTemplateUploading}
                        onSetCertificates={setCertificates}
                        onSetCertificateTemplates={setCertificateTemplates}
                        onPreviewCertificate={setPreviewCertificate}
                        onShowPreviewModal={setShowPreviewModal}
                    />
                );
            case 'email':
                return (
                    <EmailView
                        campaigns={campaigns}
                        loading={loading}
                        onOpenComposeModal={openComposeModal}
                        onRetryFailed={handleRetryFailed}
                    />
                );
            case 'whatsapp':
                return (
                    <WhatsAppView
                        campaigns={campaigns}
                        loading={loading}
                        onOpenComposeModal={openComposeModal}
                        onRetryFailed={handleRetryFailed}
                        onSetSelectedCampaign={setSelectedCampaign}
                        onShowCampaignDetailsModal={() => setShowCampaignDetailsModal(true)}
                    />
                );
            case 'templates':
                return (
                    <TemplatesView
                        templates={templates}
                        editingTemplate={editingTemplate}
                        showTemplateModal={showTemplateModal}
                        onShowTemplateModal={() => setShowTemplateModal(true)}
                        onCloseTemplateModal={() => {
                            setShowTemplateModal(false);
                            setEditingTemplate(null);
                        }}
                        onSetEditingTemplate={setEditingTemplate}
                        onSaveTemplate={handleSaveTemplate}
                        onDeleteTemplate={handleDeleteTemplate}
                        onSetComposeType={setComposeType}
                        onShowComposeModal={() => setShowComposeModal(true)}
                    />
                );
            case 'scheduled':
                return (
                    <ScheduledView
                        campaigns={campaigns}
                        scheduledViewTab={scheduledViewTab}
                        onSetScheduledViewTab={setScheduledViewTab}
                        loading={loading}
                        onOpenComposeModal={openComposeModal}
                        onProcessOverdue={handleProcessOverdue}
                        onSetSelectedCampaign={setSelectedCampaign}
                        onShowCampaignDetailsModal={() => setShowCampaignDetailsModal(true)}
                    />
                );
            case 'social-media':
                return <SocialMediaAutomation 
                    searchQuery={searchQuery}
                    filterPlatform={socialMediaFilterPlatform}
                    filterStatus={socialMediaFilterStatus}
                />;
            case 'settings':
                return renderSettingsView();
            default:
                return (
                    <DashboardView
                        stats={stats}
                        campaigns={campaigns}
                        loading={loading}
                        onOpenComposeModal={openComposeModal}
                        onShowUploadModal={() => setShowUploadModal(true)}
                        onRetryFailed={handleRetryFailed}
                    />
                );
        }
        } catch (error) {
            console.error('Error in renderContent:', error);
            return (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <h2>Error loading content</h2>
                    <p>{error.message}</p>
                    <pre style={{ textAlign: 'left', marginTop: '1rem' }}>{error.stack}</pre>
                </div>
            );
        }
    };

    // renderDashboardView has been moved to a separate component: DashboardView.jsx
    // renderContactsView has been moved to a separate component: ContactsView.jsx
    // renderCertificatesView has been moved to a separate component: CertificatesView.jsx
    // renderEmailView has been moved to a separate component: EmailView.jsx
    // renderWhatsAppView has been moved to a separate component: WhatsAppView.jsx

    // Template Management Functions - Save to Firebase
    const handleSaveTemplate = async (templateData) => {
        try {
            if (editingTemplate) {
                // Update existing template
                await firebaseService.templates.update(editingTemplate.id, templateData);
                alert('Template updated successfully!');
            } else {
                // Create new template
                await firebaseService.templates.create(templateData);
                alert('Template created successfully!');
            }

            // Reload templates from Firebase
            const updatedTemplates = await firebaseService.templates.getAll();
            setTemplates(updatedTemplates);
            
            // Reset editing state
            setEditingTemplate(null);
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
    // renderTemplatesView has been moved to a separate component: TemplatesView.jsx
    // renderScheduledView has been moved to a separate component: ScheduledView.jsx

    // Always render, even if loading or errors occur
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
                        zIndex: 998,
                        backgroundColor: 'transparent'
                    }}
                    onClick={() => setShowNotifications(false)}
                />
            )}

            {/* Main Content */}
            <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                {/* Header */}
                <header className="main-header" style={{ position: 'relative', zIndex: 1000 }}>
                    <div className="header-left">
                        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div className="header-title-section">
                            <h1 className="header-title">{getHeaderTitle()}</h1>
                            <p className="header-subtitle">{currentDate}</p>
                        </div>
                    </div>

                    <div className="header-right" style={{ position: 'relative', zIndex: 1001 }}>
                        {(activeTab === 'contacts' || activeTab === 'social-media' || activeTab === 'certificates') && (
                            <div className="header-search">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder={
                                        activeTab === 'social-media' ? 'Search posts...' : 
                                        activeTab === 'certificates' ? 'Search certificates...' : 
                                        'Search contacts...'
                                    }
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Social Media Filters - Only show for social-media tab */}
                        {activeTab === 'social-media' && (
                            <div className="header-filters" style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                <div className="header-filter-group">
                                    <select
                                        className="header-filter-select"
                                        value={socialMediaFilterPlatform}
                                        onChange={(e) => setSocialMediaFilterPlatform(e.target.value)}
                                        style={{
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-lg)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            appearance: 'none',
                                            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748b\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right var(--spacing-sm) center',
                                            paddingRight: 'var(--spacing-xl)'
                                        }}
                                    >
                                        <option value="all">All Platforms</option>
                                        <option value="facebook">Facebook</option>
                                        <option value="twitter">X</option>
                                        <option value="instagram">Instagram</option>
                                        <option value="linkedin">LinkedIn</option>
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="youtube">YouTube</option>
                                    </select>
                                </div>
                                <div className="header-filter-group">
                                    <select
                                        className="header-filter-select"
                                        value={socialMediaFilterStatus}
                                        onChange={(e) => setSocialMediaFilterStatus(e.target.value)}
                                        style={{
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--radius-lg)',
                                            color: 'var(--text-primary)',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            appearance: 'none',
                                            backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748b\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                                            backgroundRepeat: 'no-repeat',
                                            backgroundPosition: 'right var(--spacing-sm) center',
                                            paddingRight: 'var(--spacing-xl)'
                                        }}
                                    >
                                        <option value="all">All Status</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="published">Published</option>
                                        <option value="paused">Paused</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Background Jobs Notification */}
                        <BackgroundJobsNotification
                            backgroundJobs={backgroundJobs}
                            onJobClick={() => {
                                if (backgroundJobs.length > 0) {
                                    // Aggregate all active jobs
                                    const activeJobs = backgroundJobs.filter(job => {
                                        const remaining = job.totalMessages - job.sentMessages - job.failedMessages;
                                        return remaining > 0;
                                    });
                                    
                                    if (activeJobs.length > 0) {
                                        const totalMessages = activeJobs.reduce((sum, job) => sum + job.totalMessages, 0);
                                        const sentMessages = activeJobs.reduce((sum, job) => sum + job.sentMessages, 0);
                                        const failedMessages = activeJobs.reduce((sum, job) => sum + job.failedMessages, 0);
                                        
                                        setShowSendingLoader(true);
                                        setIsBackgroundMode(true);
                                        setCurrentJobId(activeJobs[0].id); // Use first job ID for display
                                        setSendingProgress({
                                            totalMessages,
                                            sentMessages,
                                            failedMessages
                                        });
                                    }
                                }
                            }}
                        />

                        <div className="notification-container" style={{ position: 'relative', zIndex: 10001 }}>
                            <button 
                                className="header-icon-btn notification-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNotifications(!showNotifications);
                                }}
                                style={{ position: 'relative', zIndex: 10001 }}
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
                                        top: 'calc(100% + 8px)',
                                        right: 0,
                                        backgroundColor: 'white',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        minWidth: '320px',
                                        maxWidth: '400px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        zIndex: 10002,
                                        border: '1px solid #e5e7eb'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: notificationsEnabled ? '0' : '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                                                    Notifications
                                                </h3>
                                                {notificationsEnabled && (
                                                    <span style={{
                                                        fontSize: '10px',
                                                        color: '#10b981',
                                                        backgroundColor: '#d1fae5',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontWeight: '500'
                                                    }}>
                                                        Enabled
                                                    </span>
                                                )}
                                            </div>
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
                                        {!notificationsEnabled && (
                                            <div style={{ 
                                                padding: '8px 12px', 
                                                backgroundColor: getNotificationPermission() === 'denied' ? '#fee2e2' : '#fef3c7', 
                                                borderRadius: '6px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                fontSize: '12px',
                                                color: getNotificationPermission() === 'denied' ? '#991b1b' : '#92400e'
                                            }}>
                                                <span>
                                                    {getNotificationPermission() === 'denied' 
                                                        ? 'Notifications blocked - enable in browser settings' 
                                                        : 'Browser notifications disabled'}
                                                </span>
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            const currentPermission = getNotificationPermission();
                                                            console.log('[Notifications] Current permission before request:', currentPermission);
                                                            
                                                            if (currentPermission === 'denied') {
                                                                // Permission was previously denied - show instructions
                                                                const userAgent = navigator.userAgent.toLowerCase();
                                                                let instructions = 'Notifications are blocked. Please enable them in your browser settings:\n\n';
                                                                
                                                                if (userAgent.includes('chrome') || userAgent.includes('chromium')) {
                                                                    instructions += 'Chrome: Click the lock icon in the address bar → Site settings → Notifications → Allow';
                                                                } else if (userAgent.includes('firefox')) {
                                                                    instructions += 'Firefox: Click the lock icon → More Information → Permissions → Notifications → Allow';
                                                                } else if (userAgent.includes('safari')) {
                                                                    instructions += 'Safari: Safari → Preferences → Websites → Notifications → Allow for this site';
                                                                } else if (userAgent.includes('edge')) {
                                                                    instructions += 'Edge: Click the lock icon → Site permissions → Notifications → Allow';
                                                                } else {
                                                                    instructions += 'Go to your browser settings and allow notifications for this site';
                                                                }
                                                                
                                                                alert(instructions);
                                                                // Re-check permission after showing instructions
                                                                setTimeout(() => {
                                                                    const newPermission = getNotificationPermission();
                                                                    setNotificationsEnabled(newPermission === 'granted');
                                                                }, 1000);
                                                                return;
                                                            }
                                                            
                                                            if (currentPermission === 'unsupported') {
                                                                alert('Your browser does not support notifications.');
                                                                return;
                                                            }
                                                            
                                                            // Request permission (will only work if permission is 'default')
                                                            const permission = await requestNotificationPermission();
                                                            console.log('[Notifications] Permission after request:', permission);
                                                            
                                                            const isEnabled = permission === 'granted';
                                                            setNotificationsEnabled(isEnabled);
                                                            
                                                            if (isEnabled) {
                                                                console.log('✅ Browser notifications enabled');
                                                                // Show a test notification
                                                                try {
                                                                    const testNotification = new Notification('Notifications Enabled!', {
                                                                        body: 'You will now receive browser notifications for new alerts.',
                                                                        icon: '/favicon.ico',
                                                                        tag: 'notification-enabled'
                                                                    });
                                                                    
                                                                    testNotification.onclick = () => {
                                                                        window.focus();
                                                                        testNotification.close();
                                                                    };
                                                                    
                                                                    // Auto-close after 3 seconds
                                                                    setTimeout(() => {
                                                                        testNotification.close();
                                                                    }, 3000);
                                                                } catch (notifError) {
                                                                    console.error('Error showing test notification:', notifError);
                                                                }
                                                            } else if (permission === 'denied') {
                                                                alert('Notifications were denied. Please enable them in your browser settings.');
                                                            } else {
                                                                console.log('[Notifications] Permission status:', permission);
                                                            }
                                                        } catch (error) {
                                                            console.error('Error enabling notifications:', error);
                                                            alert('Error enabling notifications. Please check your browser settings.');
                                                        }
                                                    }}
                                                    style={{
                                                        fontSize: '11px',
                                                        color: '#92400e',
                                                        background: 'white',
                                                        border: '1px solid #fbbf24',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        padding: '4px 8px',
                                                        fontWeight: '500',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = '#fef3c7';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'white';
                                                    }}
                                                >
                                                    Enable
                                                </button>
                                            </div>
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
                            onClick={() => openComposeModal(null)}
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
            {showCreateContactModal && (
                <CreateContactModal
                    onClose={() => setShowCreateContactModal(false)}
                    onCreate={handleCreateContact}
                />
            )}

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

            {showCampaignDetailsModal && (
                <CampaignDetailsModal
                    campaign={selectedCampaign}
                    onClose={() => {
                        setShowCampaignDetailsModal(false);
                        setSelectedCampaign(null);
                    }}
                />
            )}

            {/* Message Sending Loader */}
            <MessageSendingLoader
                isVisible={showSendingLoader}
                onClose={() => {
                    setIsBackgroundMode(true);
                    setShowSendingLoader(false);
                }}
                totalMessages={sendingProgress.totalMessages}
                sentMessages={sendingProgress.sentMessages}
                failedMessages={sendingProgress.failedMessages}
                onSendInBackground={handleSendInBackground}
                isBackgroundMode={isBackgroundMode}
                jobId={currentJobId}
            />
        </div>
    );
}

export default MarketingDashboard;
