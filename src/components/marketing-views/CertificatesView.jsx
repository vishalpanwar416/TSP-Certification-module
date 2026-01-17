import { useState, useMemo } from 'react';
import { Award, FileImage, Upload, CheckCircle, Clock, Eye, Download, Trash2, Star, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { formatDate } from './utils';
import { API_BASE_URL } from '../../utils/api';

const CertificatesView = ({ 
    certificates = [],
    certificateTemplates = [],
    certificateViewMode = 'certificates',
    onSetCertificateViewMode = () => {},
    searchQuery = '',
    loading = false,
    newTemplateName = '',
    onSetNewTemplateName = () => {},
    templateUploading = false,
    onSetTemplateUploading = () => {},
    onSetCertificates = () => {},
    onSetCertificateTemplates = () => {},
    onPreviewCertificate = () => {},
    onShowPreviewModal = () => {}
}) => {
    const [certificatesSortConfig, setCertificatesSortConfig] = useState({ column: null, direction: null });
    const [templatesSortConfig, setTemplatesSortConfig] = useState({ column: null, direction: null });

    // Filter only actual certificates (not templates)
    const filteredCertificates = (certificates || []).filter(cert =>
        cert.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.certificate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cert.phone_number?.includes(searchQuery) ||
        cert.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle sorting for certificates
    const handleCertificatesSort = (column) => {
        setCertificatesSortConfig(prev => {
            if (prev.column !== column) {
                return { column, direction: 'asc' };
            } else if (prev.direction === 'asc') {
                return { column, direction: 'desc' };
            } else if (prev.direction === 'desc') {
                return { column: null, direction: null };
            } else {
                return { column, direction: 'asc' };
            }
        });
    };

    // Handle sorting for templates
    const handleTemplatesSort = (column) => {
        setTemplatesSortConfig(prev => {
            if (prev.column !== column) {
                return { column, direction: 'asc' };
            } else if (prev.direction === 'asc') {
                return { column, direction: 'desc' };
            } else if (prev.direction === 'desc') {
                return { column: null, direction: null };
            } else {
                return { column, direction: 'asc' };
            }
        });
    };

    // Sort certificates
    const sortedCertificates = useMemo(() => {
        if (!certificatesSortConfig.column || !certificatesSortConfig.direction) {
            return filteredCertificates;
        }

        return [...filteredCertificates].sort((a, b) => {
            let aValue, bValue;

            switch (certificatesSortConfig.column) {
                case 'recipient':
                    aValue = (a.recipient_name || '').toLowerCase();
                    bValue = (b.recipient_name || '').toLowerCase();
                    break;
                case 'certificate':
                    aValue = (a.certificate_number || '').toLowerCase();
                    bValue = (b.certificate_number || '').toLowerCase();
                    break;
                case 'phone':
                    aValue = (a.phone_number || '').toLowerCase();
                    bValue = (b.phone_number || '').toLowerCase();
                    break;
                case 'email':
                    aValue = (a.email || '').toLowerCase();
                    bValue = (b.email || '').toLowerCase();
                    break;
                case 'created':
                    const dateA = a.created_at;
                    const dateB = b.created_at;
                    aValue = dateA?.toDate ? dateA.toDate().getTime() : 
                            (dateA?.seconds ? dateA.seconds * 1000 : 
                            (dateA ? new Date(dateA).getTime() : 0));
                    bValue = dateB?.toDate ? dateB.toDate().getTime() : 
                            (dateB?.seconds ? dateB.seconds * 1000 : 
                            (dateB ? new Date(dateB).getTime() : 0));
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return certificatesSortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return certificatesSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredCertificates, certificatesSortConfig]);

    // Sort templates
    const sortedTemplates = useMemo(() => {
        if (!templatesSortConfig.column || !templatesSortConfig.direction) {
            return certificateTemplates;
        }

        return [...certificateTemplates].sort((a, b) => {
            let aValue, bValue;

            switch (templatesSortConfig.column) {
                case 'name':
                    aValue = (a.name || '').toLowerCase();
                    bValue = (b.name || '').toLowerCase();
                    break;
                case 'filename':
                    aValue = (a.filename || '').toLowerCase();
                    bValue = (b.filename || '').toLowerCase();
                    break;
                case 'status':
                    aValue = a.is_default ? 'default' : 'active';
                    bValue = b.is_default ? 'default' : 'active';
                    break;
                case 'uploaded':
                    const dateA = a.uploaded_at;
                    const dateB = b.uploaded_at;
                    aValue = dateA?.toDate ? dateA.toDate().getTime() : 
                            (dateA?.seconds ? dateA.seconds * 1000 : 
                            (dateA ? new Date(dateA).getTime() : 0));
                    bValue = dateB?.toDate ? dateB.toDate().getTime() : 
                            (dateB?.seconds ? dateB.seconds * 1000 : 
                            (dateB ? new Date(dateB).getTime() : 0));
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return templatesSortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return templatesSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [certificateTemplates, templatesSortConfig]);

    // Render sort icon
    const renderSortIcon = (column, isTemplates = false) => {
        const sortConfig = isTemplates ? templatesSortConfig : certificatesSortConfig;
        if (sortConfig.column !== column) {
            return <ChevronsUpDown size={14} style={{ opacity: 0.3, marginLeft: '4px' }} />;
        }
        if (sortConfig.direction === 'asc') {
            return <ArrowUp size={14} style={{ marginLeft: '4px' }} />;
        }
        if (sortConfig.direction === 'desc') {
            return <ArrowDown size={14} style={{ marginLeft: '4px' }} />;
        }
        return <ChevronsUpDown size={14} style={{ opacity: 0.3, marginLeft: '4px' }} />;
    };

    const handlePreview = (certificate) => {
        onPreviewCertificate(certificate);
        onShowPreviewModal(true);
    };

    const handleDelete = async (id, certificateNumber) => {
        if (id === 'default') {
            alert('Cannot delete the default certificate template. This is a system template.');
            return;
        }

        if (!window.confirm(`Are you sure you want to delete certificate ${certificateNumber}?`)) {
            return;
        }

        try {
            const { certificateAPI } = await import('../../services/api');
            await certificateAPI.delete(id);
            alert('Certificate deleted successfully!');
            const updatedCertificates = await certificateAPI.getAll();
            onSetCertificates(Array.isArray(updatedCertificates) ? updatedCertificates : []);
        } catch (error) {
            console.error('Error deleting certificate:', error);
            alert('Failed to delete certificate');
        }
    };

    const handleDownload = (certificate) => {
        if (certificate.pdf_url) {
            window.open(certificate.pdf_url, '_blank');
        } else {
            alert('PDF URL not available for this certificate');
        }
    };

    const handleTemplateUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPG, PNG, etc.)');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        onSetTemplateUploading(true);

        try {
            const base64String = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    if (reader.error) {
                        reject(reader.error);
                    } else {
                        resolve(reader.result);
                    }
                };
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });

            if (base64String.length > 10 * 1024 * 1024) {
                throw new Error(`Image is too large (${(base64String.length / 1024 / 1024).toFixed(2)}MB). Please use an image smaller than 5MB.`);
            }

            if (!API_BASE_URL || API_BASE_URL === 'undefined') {
                throw new Error('API URL is not configured. Please set VITE_API_URL environment variable.');
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000);

            let response;
            try {
                response = await fetch(`${API_BASE_URL}/certificates/template`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image: base64String,
                        filename: file.name,
                        contentType: file.type,
                        templateName: newTemplateName || file.name.replace(/\.[^/.]+$/, '') || 'Template'
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

            const responseText = await response.text();

            if (!response.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch {
                    errorData = {
                        error: `Server error (${response.status})`,
                        details: responseText.substring(0, 200) || response.statusText
                    };
                }
                throw new Error(errorData.error || errorData.details || `Upload failed with status ${response.status}: ${response.statusText}`);
            }

            const data = JSON.parse(responseText);

            if (data.success && data.data) {
                alert('Certificate template uploaded successfully!');
                onSetNewTemplateName('');
                const templatesResponse = await fetch(`${API_BASE_URL}/certificates/templates`);
                if (templatesResponse.ok) {
                    const templatesData = await templatesResponse.json();
                    if (templatesData.success && Array.isArray(templatesData.data)) {
                        onSetCertificateTemplates(templatesData.data);
                    }
                }
            } else {
                throw new Error(data.error || data.message || 'Invalid response from server');
            }
        } catch (error) {
            console.error('Error uploading template:', error);
            alert(error.message || 'Failed to upload template');
        } finally {
            onSetTemplateUploading(false);
            e.target.value = '';
        }
    };

    const handleSetDefaultTemplate = async (templateId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/certificates/template/${templateId}/set-default`, {
                method: 'POST'
            });
            if (response.ok) {
                alert('Default template updated successfully!');
                const templatesResponse = await fetch(`${API_BASE_URL}/certificates/templates`);
                if (templatesResponse.ok) {
                    const templatesData = await templatesResponse.json();
                    if (templatesData.success && Array.isArray(templatesData.data)) {
                        onSetCertificateTemplates(templatesData.data);
                    }
                }
            }
        } catch (error) {
            console.error('Error setting default template:', error);
            alert('Failed to set default template');
        }
    };

    const handleDeleteTemplate = async (templateId, templateName) => {
        if (window.confirm(`Are you sure you want to delete "${templateName}"?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/certificates/template/${templateId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    alert('Template deleted successfully!');
                    const templatesResponse = await fetch(`${API_BASE_URL}/certificates/templates`);
                    if (templatesResponse.ok) {
                        const templatesData = await templatesResponse.json();
                        if (templatesData.success && Array.isArray(templatesData.data)) {
                            onSetCertificateTemplates(templatesData.data);
                        }
                    }
                } else {
                    const errorData = await response.json();
                    alert(errorData.error || 'Failed to delete template');
                }
            } catch (error) {
                console.error('Error deleting template:', error);
                alert('Failed to delete template');
            }
        }
    };

    return (
        <>
            <div className="page-actions">
                <div className="page-actions-left">
                    <h2>
                        {certificateViewMode === 'certificates' 
                            ? `Certificates (${certificates.length})` 
                            : 'Certificate Templates'}
                    </h2>
                </div>
                <div className="page-actions-right">
                    <div style={{ 
                        display: 'flex', 
                        gap: '0.5rem', 
                        alignItems: 'center',
                        backgroundColor: '#f3f4f6',
                        padding: '0.25rem',
                        borderRadius: '0.5rem',
                        marginRight: '1rem'
                    }}>
                        <button
                            className={`btn ${certificateViewMode === 'certificates' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => onSetCertificateViewMode('certificates')}
                            style={{ 
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Award size={16} style={{ marginRight: '0.25rem' }} />
                            Certificates
                        </button>
                        <button
                            className={`btn ${certificateViewMode === 'templates' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => onSetCertificateViewMode('templates')}
                            style={{ 
                                padding: '0.5rem 1rem',
                                fontSize: '0.875rem',
                                border: 'none',
                                borderRadius: '0.375rem',
                                cursor: 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <FileImage size={16} style={{ marginRight: '0.25rem' }} />
                            Templates
                        </button>
                    </div>
                </div>
            </div>

            {certificateViewMode === 'certificates' && (
                <div className="card table-card">
                    <div className="card-header">
                        <div className="card-header-left">
                            <h2 className="card-title">
                                <Award size={24} />
                                All Certificates
                            </h2>
                            <p className="card-description">
                                {searchQuery
                                    ? `Showing ${filteredCertificates.length} of ${certificates.length} certificates`
                                    : `Manage all ${certificates.length} generated certificates for contacts`
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
                            <h3>{searchQuery ? 'No certificates found' : 'No certificates yet'}</h3>
                            <p>
                                {searchQuery
                                    ? `No certificates match "${searchQuery}". Try a different search term.`
                                    : 'Certificates will appear here once they are created for contacts.'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th 
                                            onClick={() => handleCertificatesSort('recipient')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by recipient"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Recipient
                                                {renderSortIcon('recipient', false)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleCertificatesSort('certificate')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by certificate number"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Certificate #
                                                {renderSortIcon('certificate', false)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleCertificatesSort('phone')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by phone"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Phone
                                                {renderSortIcon('phone', false)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleCertificatesSort('email')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by email"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Email
                                                {renderSortIcon('email', false)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleCertificatesSort('created')}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by created date"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Created
                                                {renderSortIcon('created', false)}
                                            </span>
                                        </th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedCertificates.map((cert) => (
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
                                                <span className="date-cell">
                                                    {formatDate(cert.created_at)}
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
                                                        title="Download PDF"
                                                    >
                                                        <Download size={16} />
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
            )}

            {certificateViewMode === 'templates' && (
                <>
                    <div className="card template-upload-card">
                        <div className="card-header">
                            <div className="card-header-left">
                                <h2 className="card-title">
                                    <Upload size={24} />
                                    Upload New Template
                                </h2>
                                <p className="card-description">
                                    Upload a blank certificate image. Names and information will be automatically added when creating certificates.
                                </p>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">Template Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Enter template name (e.g., 'Default Template', 'Award Certificate')"
                                    value={newTemplateName}
                                    onChange={(e) => onSetNewTemplateName(e.target.value)}
                                    disabled={templateUploading}
                                />
                            </div>
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
                        </div>
                    </div>

                    <div className="card table-card" style={{ marginTop: '1.5rem' }}>
                        <div className="card-header">
                            <div className="card-header-left">
                                <h2 className="card-title">
                                    <FileImage size={24} />
                                    All Templates ({certificateTemplates.length})
                                </h2>
                                <p className="card-description">
                                    Manage your certificate templates. Set one as default to use for new certificates.
                                </p>
                            </div>
                        </div>
                        {loading ? (
                            <div className="loading-container">
                                <div className="spinner"></div>
                                <p>Loading templates...</p>
                            </div>
                        ) : certificateTemplates.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-icon">
                                    <FileImage size={64} />
                                </div>
                                <h3>No templates yet</h3>
                                <p>Upload your first certificate template to get started.</p>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Template</th>
                                            <th 
                                                onClick={() => handleTemplatesSort('name')}
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                                title="Click to sort by name"
                                            >
                                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                    Name
                                                    {renderSortIcon('name', true)}
                                                </span>
                                            </th>
                                            <th 
                                                onClick={() => handleTemplatesSort('filename')}
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                                title="Click to sort by filename"
                                            >
                                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                    Filename
                                                    {renderSortIcon('filename', true)}
                                                </span>
                                            </th>
                                            <th 
                                                onClick={() => handleTemplatesSort('status')}
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                                title="Click to sort by status"
                                            >
                                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                    Status
                                                    {renderSortIcon('status', true)}
                                                </span>
                                            </th>
                                            <th 
                                                onClick={() => handleTemplatesSort('uploaded')}
                                                style={{ cursor: 'pointer', userSelect: 'none' }}
                                                title="Click to sort by uploaded date"
                                            >
                                                <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                    Uploaded
                                                    {renderSortIcon('uploaded', true)}
                                                </span>
                                            </th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedTemplates.map((template) => (
                                            <tr key={template.id}>
                                                <td>
                                                    <div style={{ width: '120px', height: '80px', overflow: 'hidden', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                                                        <img
                                                            src={template.url}
                                                            alt={template.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <strong>{template.name || 'Unnamed Template'}</strong>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                                        {template.filename || 'N/A'}
                                                    </span>
                                                </td>
                                                <td>
                                                    {template.is_default ? (
                                                        <span className="badge badge-success">
                                                            <CheckCircle size={12} />
                                                            Default
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-info">Active</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="date-cell">
                                                        {template.uploaded_at ? formatDate(template.uploaded_at) : 'N/A'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        {!template.is_default && (
                                                            <button
                                                                className="action-btn action-btn-view"
                                                                onClick={() => handleSetDefaultTemplate(template.id)}
                                                                title="Set as Default"
                                                            >
                                                                <Star size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            className="action-btn action-btn-delete"
                                                            onClick={() => handleDeleteTemplate(template.id, template.name)}
                                                            title="Delete Template"
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
            )}
        </>
    );
};

export default CertificatesView;
