import { useState, useEffect } from 'react';
import {
    X,
    Loader,
    Send,
    Mail,
    MessageCircle,
    Calendar,
    Clock,
    User,
    FileText,
    Check,
    AlertCircle,
    Edit3,
    Eye,
    ChevronDown,
    Sparkles
} from 'lucide-react';
import { certificateAPI } from '../services/api';

// Default message templates
const DEFAULT_EMAIL_SUBJECT = `🎉 Certificate of Appreciation - {{certificate_number}}`;

const DEFAULT_EMAIL_BODY = `Dear {{recipient_name}},

Congratulations! 🎉

We are delighted to inform you that you have been awarded a Certificate of Appreciation from Top Selling Property.

Certificate Details:
📜 Certificate Number: {{certificate_number}}
{{#award_rera_number}}🏆 Award RERA Number: {{award_rera_number}}{{/award_rera_number}}
{{#description}}📝 Description: {{description}}{{/description}}

Your commitment, hard work, and professionalism have set a remarkable standard of excellence. This recognition is a testament to your outstanding contribution.

Click the link below to download your certificate:
{{certificate_url}}

Thank you for being an invaluable part of our network!

Best Regards,
Top Selling Property Team
www.topsellingproperty.com`;

const DEFAULT_WHATSAPP_MESSAGE = `🎉 *Congratulations {{recipient_name}}!*

We are delighted to inform you that you have been awarded a *Certificate of Appreciation* from *Top Selling Property*.

📜 *Certificate Number:* {{certificate_number}}
{{#award_rera_number}}🏆 *Award RERA Number:* {{award_rera_number}}{{/award_rera_number}}

Your commitment and professionalism have set a remarkable standard of excellence!

📥 *Download your certificate here:*
{{certificate_url}}

Thank you for your outstanding contribution! 🙏

_Top Selling Property Team_`;

// Template variable list
const TEMPLATE_VARIABLES = [
    { key: '{{recipient_name}}', label: 'Recipient Name', description: 'Name of the certificate recipient' },
    { key: '{{certificate_number}}', label: 'Certificate Number', description: 'Unique certificate ID' },
    { key: '{{award_rera_number}}', label: 'RERA Number', description: 'Award RERA number (if available)' },
    { key: '{{description}}', label: 'Description', description: 'Certificate description' },
    { key: '{{certificate_url}}', label: 'Certificate URL', description: 'Download link for the certificate' },
    { key: '{{phone_number}}', label: 'Phone Number', description: 'Recipient phone number' },
];

function SendCertificateModal({ certificate, onClose, onSuccess }) {
    // Sending method states
    const [sendViaWhatsApp, setSendViaWhatsApp] = useState(true);
    const [sendViaEmail, setSendViaEmail] = useState(false);

    // Contact info
    const [phoneNumber, setPhoneNumber] = useState(certificate.phone_number || '');
    const [email, setEmail] = useState(certificate.email || '');

    // Scheduling
    const [scheduleEnabled, setScheduleEnabled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    // Message customization
    const [showTemplateEditor, setShowTemplateEditor] = useState(false);
    const [activeTemplateTab, setActiveTemplateTab] = useState('whatsapp');
    const [whatsAppMessage, setWhatsAppMessage] = useState(DEFAULT_WHATSAPP_MESSAGE);
    const [emailSubject, setEmailSubject] = useState(DEFAULT_EMAIL_SUBJECT);
    const [emailBody, setEmailBody] = useState(DEFAULT_EMAIL_BODY);

    // Preview states
    const [showPreview, setShowPreview] = useState(false);

    // Loading states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Set default schedule to tomorrow at 10 AM
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        setScheduleDate(tomorrow.toISOString().split('T')[0]);
        setScheduleTime('10:00');
    }, []);

    // Parse template and replace variables
    const parseTemplate = (template, data) => {
        let result = template;

        // Replace simple variables
        result = result.replace(/\{\{recipient_name\}\}/g, data.recipient_name || '');
        result = result.replace(/\{\{certificate_number\}\}/g, data.certificate_number || '');
        result = result.replace(/\{\{award_rera_number\}\}/g, data.award_rera_number || '');
        result = result.replace(/\{\{description\}\}/g, data.description || '');
        result = result.replace(/\{\{phone_number\}\}/g, data.phone_number || phoneNumber || '');
        result = result.replace(/\{\{certificate_url\}\}/g, data.certificate_url || certificateAPI.getPdfUrl(certificate.id));

        // Handle conditional blocks {{#variable}}content{{/variable}}
        result = result.replace(/\{\{#(\w+)\}\}(.*?)\{\{\/\1\}\}/gs, (match, key, content) => {
            return data[key] ? content : '';
        });

        return result;
    };

    // Get preview data
    const getPreviewData = () => ({
        ...certificate,
        certificate_url: certificateAPI.getPdfUrl(certificate.id),
    });

    // Validate form
    const validateForm = () => {
        if (!sendViaWhatsApp && !sendViaEmail) {
            setError('Please select at least one sending method');
            return false;
        }

        if (sendViaWhatsApp && !phoneNumber.trim()) {
            setError('Phone number is required for WhatsApp');
            return false;
        }

        if (sendViaWhatsApp && !phoneNumber.startsWith('+') && !phoneNumber.startsWith('91')) {
            setError('Phone number must include country code (e.g., +919876543210)');
            return false;
        }

        if (sendViaEmail && !email.trim()) {
            setError('Email address is required for Email');
            return false;
        }

        if (sendViaEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address');
            return false;
        }

        if (scheduleEnabled) {
            if (!scheduleDate || !scheduleTime) {
                setError('Please select both date and time for scheduling');
                return false;
            }

            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
            if (scheduledDateTime <= new Date()) {
                setError('Scheduled time must be in the future');
                return false;
            }
        }

        return true;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            const previewData = getPreviewData();
            const scheduledAt = scheduleEnabled ? new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : null;

            const results = [];
            const errors = [];

            // Send via WhatsApp
            if (sendViaWhatsApp) {
                try {
                    const parsedWhatsAppMessage = parseTemplate(whatsAppMessage, previewData);
                    await certificateAPI.sendWhatsApp(certificate.id, phoneNumber, {
                        customMessage: parsedWhatsAppMessage,
                        scheduledAt,
                    });
                    results.push('WhatsApp');
                } catch (err) {
                    console.error('WhatsApp error:', err);
                    errors.push(`WhatsApp: ${err.response?.data?.error || err.message}`);
                }
            }

            // Send via Email
            if (sendViaEmail) {
                try {
                    const parsedSubject = parseTemplate(emailSubject, previewData);
                    const parsedBody = parseTemplate(emailBody, previewData);
                    await certificateAPI.sendEmail(certificate.id, email, {
                        subject: parsedSubject,
                        body: parsedBody,
                        scheduledAt,
                    });
                    results.push('Email');
                } catch (err) {
                    console.error('Email error:', err);
                    errors.push(`Email: ${err.response?.data?.error || err.message}`);
                }
            }

            // Show results
            if (results.length > 0) {
                const scheduleText = scheduledAt ? ` scheduled for ${new Date(scheduledAt).toLocaleString()}` : '';
                setSuccess(`Certificate successfully ${scheduleText ? 'scheduled' : 'sent'} via ${results.join(' and ')}${scheduleText}!`);

                setTimeout(() => {
                    onSuccess();
                }, 2000);
            }

            if (errors.length > 0) {
                setError(errors.join('\n'));
            }

        } catch (error) {
            console.error('Error sending certificate:', error);
            setError(error.response?.data?.error || error.message || 'Failed to send certificate');
        } finally {
            setLoading(false);
        }
    };

    // Insert variable at cursor position
    const insertVariable = (variable, setter, currentValue) => {
        setter(currentValue + variable);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal send-certificate-modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}
            >
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            <Send size={24} style={{ color: 'var(--primary)' }} />
                            Send Certificate
                        </h2>
                        <p className="modal-subtitle">Send certificate to {certificate.recipient_name}</p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Error/Success Messages */}
                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="alert alert-success">
                                <Check size={18} />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Certificate Info */}
                        <div className="send-modal-section certificate-info-card">
                            <div className="certificate-info-header">
                                <FileText size={20} />
                                <span>Certificate Details</span>
                            </div>
                            <div className="certificate-info-grid">
                                <div className="info-item">
                                    <label>Recipient</label>
                                    <span>{certificate.recipient_name}</span>
                                </div>
                                <div className="info-item">
                                    <label>Certificate #</label>
                                    <span className="code">{certificate.certificate_number}</span>
                                </div>
                                {certificate.award_rera_number && (
                                    <div className="info-item">
                                        <label>RERA Number</label>
                                        <span>{certificate.award_rera_number}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sending Method Selection */}
                        <div className="send-modal-section">
                            <h3 className="section-title">Sending Method</h3>
                            <div className="sending-methods">
                                <label className={`method-card ${sendViaWhatsApp ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={sendViaWhatsApp}
                                        onChange={(e) => setSendViaWhatsApp(e.target.checked)}
                                    />
                                    <div className="method-icon whatsapp">
                                        <MessageCircle size={24} />
                                    </div>
                                    <div className="method-info">
                                        <span className="method-name">WhatsApp</span>
                                        <span className="method-desc">Send via WhatsApp message</span>
                                    </div>
                                    {sendViaWhatsApp && <Check className="method-check" size={20} />}
                                </label>

                                <label className={`method-card ${sendViaEmail ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={sendViaEmail}
                                        onChange={(e) => setSendViaEmail(e.target.checked)}
                                    />
                                    <div className="method-icon email">
                                        <Mail size={24} />
                                    </div>
                                    <div className="method-info">
                                        <span className="method-name">Email</span>
                                        <span className="method-desc">Send via email with PDF</span>
                                    </div>
                                    {sendViaEmail && <Check className="method-check" size={20} />}
                                </label>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div className="send-modal-section">
                            <h3 className="section-title">Contact Information</h3>
                            <div className="contact-inputs">
                                {sendViaWhatsApp && (
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="phone_number">
                                            <MessageCircle size={16} />
                                            WhatsApp Number *
                                        </label>
                                        <input
                                            type="tel"
                                            id="phone_number"
                                            className="form-input"
                                            placeholder="+919876543210"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                        />
                                        <small className="form-hint">Include country code (e.g., +91 for India)</small>
                                    </div>
                                )}

                                {sendViaEmail && (
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="email">
                                            <Mail size={16} />
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            className="form-input"
                                            placeholder="recipient@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Scheduling Section */}
                        <div className="send-modal-section">
                            <div className="section-header-toggle">
                                <h3 className="section-title">
                                    <Calendar size={18} />
                                    Schedule Delivery
                                </h3>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        checked={scheduleEnabled}
                                        onChange={(e) => setScheduleEnabled(e.target.checked)}
                                    />
                                    <span className="toggle-slider"></span>
                                </label>
                            </div>

                            {scheduleEnabled && (
                                <div className="schedule-inputs">
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="schedule_date">
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
                                    <div className="form-group">
                                        <label className="form-label" htmlFor="schedule_time">
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

                        {/* Customize Message Section */}
                        <div className="send-modal-section">
                            <div className="section-header-toggle">
                                <h3 className="section-title">
                                    <Edit3 size={18} />
                                    Customize Message
                                </h3>
                                <button
                                    type="button"
                                    className="btn btn-outline btn-sm"
                                    onClick={() => setShowTemplateEditor(!showTemplateEditor)}
                                >
                                    {showTemplateEditor ? 'Hide Editor' : 'Edit Templates'}
                                    <ChevronDown
                                        size={16}
                                        style={{
                                            transform: showTemplateEditor ? 'rotate(180deg)' : 'none',
                                            transition: 'transform 0.2s'
                                        }}
                                    />
                                </button>
                            </div>

                            {showTemplateEditor && (
                                <div className="template-editor">
                                    {/* Template Tabs */}
                                    <div className="template-tabs">
                                        {sendViaWhatsApp && (
                                            <button
                                                type="button"
                                                className={`template-tab ${activeTemplateTab === 'whatsapp' ? 'active' : ''}`}
                                                onClick={() => setActiveTemplateTab('whatsapp')}
                                            >
                                                <MessageCircle size={16} />
                                                WhatsApp
                                            </button>
                                        )}
                                        {sendViaEmail && (
                                            <button
                                                type="button"
                                                className={`template-tab ${activeTemplateTab === 'email' ? 'active' : ''}`}
                                                onClick={() => setActiveTemplateTab('email')}
                                            >
                                                <Mail size={16} />
                                                Email
                                            </button>
                                        )}
                                    </div>

                                    {/* Variable Chips */}
                                    <div className="template-variables">
                                        <span className="variables-label">
                                            <Sparkles size={14} />
                                            Insert Variable:
                                        </span>
                                        <div className="variable-chips">
                                            {TEMPLATE_VARIABLES.map((v) => (
                                                <button
                                                    key={v.key}
                                                    type="button"
                                                    className="variable-chip"
                                                    title={v.description}
                                                    onClick={() => {
                                                        if (activeTemplateTab === 'whatsapp') {
                                                            insertVariable(v.key, setWhatsAppMessage, whatsAppMessage);
                                                        } else {
                                                            insertVariable(v.key, setEmailBody, emailBody);
                                                        }
                                                    }}
                                                >
                                                    {v.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* WhatsApp Template */}
                                    {activeTemplateTab === 'whatsapp' && sendViaWhatsApp && (
                                        <div className="template-content">
                                            <div className="form-group">
                                                <label className="form-label">WhatsApp Message</label>
                                                <textarea
                                                    className="form-input template-textarea"
                                                    rows={10}
                                                    value={whatsAppMessage}
                                                    onChange={(e) => setWhatsAppMessage(e.target.value)}
                                                    placeholder="Enter your WhatsApp message..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Email Template */}
                                    {activeTemplateTab === 'email' && sendViaEmail && (
                                        <div className="template-content">
                                            <div className="form-group">
                                                <label className="form-label">Email Subject</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={emailSubject}
                                                    onChange={(e) => setEmailSubject(e.target.value)}
                                                    placeholder="Email subject line..."
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Email Body</label>
                                                <textarea
                                                    className="form-input template-textarea"
                                                    rows={12}
                                                    value={emailBody}
                                                    onChange={(e) => setEmailBody(e.target.value)}
                                                    placeholder="Enter your email body..."
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Preview Button */}
                                    <button
                                        type="button"
                                        className="btn btn-outline preview-btn"
                                        onClick={() => setShowPreview(!showPreview)}
                                    >
                                        <Eye size={16} />
                                        {showPreview ? 'Hide Preview' : 'Preview Message'}
                                    </button>

                                    {/* Message Preview */}
                                    {showPreview && (
                                        <div className="message-preview">
                                            <h4 className="preview-title">
                                                {activeTemplateTab === 'whatsapp' ? 'WhatsApp Preview' : 'Email Preview'}
                                            </h4>
                                            {activeTemplateTab === 'email' && (
                                                <div className="preview-subject">
                                                    <strong>Subject:</strong> {parseTemplate(emailSubject, getPreviewData())}
                                                </div>
                                            )}
                                            <div className="preview-body">
                                                {activeTemplateTab === 'whatsapp'
                                                    ? parseTemplate(whatsAppMessage, getPreviewData())
                                                    : parseTemplate(emailBody, getPreviewData())}
                                            </div>
                                        </div>
                                    )}

                                    {/* Reset Templates */}
                                    <button
                                        type="button"
                                        className="btn btn-ghost reset-templates-btn"
                                        onClick={() => {
                                            setWhatsAppMessage(DEFAULT_WHATSAPP_MESSAGE);
                                            setEmailSubject(DEFAULT_EMAIL_SUBJECT);
                                            setEmailBody(DEFAULT_EMAIL_BODY);
                                        }}
                                    >
                                        Reset to Default Templates
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
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary send-btn"
                            disabled={loading || (!sendViaWhatsApp && !sendViaEmail)}
                        >
                            {loading ? (
                                <>
                                    <Loader size={20} className="spinner" />
                                    {scheduleEnabled ? 'Scheduling...' : 'Sending...'}
                                </>
                            ) : (
                                <>
                                    {scheduleEnabled ? <Calendar size={20} /> : <Send size={20} />}
                                    {scheduleEnabled ? 'Schedule Send' : 'Send Now'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SendCertificateModal;
