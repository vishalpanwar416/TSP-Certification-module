import { useState, useMemo } from 'react';
import { Download, UserPlus, Upload, Users, Mail, MessageCircle, Eye, Trash2, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import messagingService from '../../services/messagingService';

const ContactsView = ({ 
    contacts = [], 
    filteredContacts = [],
    onShowUploadModal = () => {}, 
    onShowCreateContactModal = () => {}, 
    onDeleteContact = () => {},
    onPreviewCertificate = () => {},
    onShowPreviewModal = () => {}
}) => {
    const [sortConfig, setSortConfig] = useState({ column: null, direction: null });

    // Handle column header click for sorting
    const handleSort = (column) => {
        setSortConfig(prev => {
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

    // Sort contacts based on sortConfig
    const sortedContacts = useMemo(() => {
        if (!sortConfig.column || !sortConfig.direction) {
            return filteredContacts;
        }

        return [...filteredContacts].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.column) {
                case 'name':
                    aValue = (a.name || '').toLowerCase();
                    bValue = (b.name || '').toLowerCase();
                    break;
                case 'certificate':
                    aValue = (a.certificate_number || a.certificateNumber || '').toLowerCase();
                    bValue = (b.certificate_number || b.certificateNumber || '').toLowerCase();
                    break;
                case 'rera':
                    aValue = (a.rera_awarde_no || a.reraAwardeNo || '').toLowerCase();
                    bValue = (b.rera_awarde_no || b.reraAwardeNo || '').toLowerCase();
                    break;
                case 'professional':
                    aValue = (a.professional || '').toLowerCase();
                    bValue = (b.professional || '').toLowerCase();
                    break;
                case 'email':
                    aValue = (a.email || '').toLowerCase();
                    bValue = (b.email || '').toLowerCase();
                    break;
                case 'phone':
                    aValue = (a.phone || '').toLowerCase();
                    bValue = (b.phone || '').toLowerCase();
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredContacts, sortConfig]);

    // Render sort icon for column header
    const renderSortIcon = (column) => {
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

    return (
        <>
            <div className="page-actions">
                <div className="page-actions-left">
                    <h2>All Contacts ({contacts.length})</h2>
                </div>
                <div className="page-actions-right">
                    <button className="btn btn-outline" onClick={() => {/* Export handler */}}>
                        <Download size={18} />
                        Export
                    </button>
                    <button className="btn btn-outline" onClick={onShowCreateContactModal}>
                        <UserPlus size={18} />
                        Create Contact
                    </button>
                    <button className="btn btn-primary" onClick={onShowUploadModal}>
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
                        <p>Create your first contact or upload an Excel file to start building your contact database.</p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={onShowCreateContactModal}>
                                <UserPlus size={20} />
                                Create Contact
                            </button>
                            <button className="btn btn-outline" onClick={onShowUploadModal}>
                                <Upload size={20} />
                                Upload Contacts
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th 
                                        onClick={() => handleSort('name')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by name"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Name
                                            {renderSortIcon('name')}
                                        </span>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('certificate')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by certificate number"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Certificate #
                                            {renderSortIcon('certificate')}
                                        </span>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('rera')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by RERA number"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            RERA No.
                                            {renderSortIcon('rera')}
                                        </span>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('professional')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by professional"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Professional
                                            {renderSortIcon('professional')}
                                        </span>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('email')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by email"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Email
                                            {renderSortIcon('email')}
                                        </span>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('phone')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by phone"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Phone
                                            {renderSortIcon('phone')}
                                        </span>
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedContacts.map((contact) => (
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
                                                        onPreviewCertificate(contact);
                                                        onShowPreviewModal(true);
                                                    }}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    className="action-btn action-btn-delete"
                                                    onClick={() => onDeleteContact(contact.id)}
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
};

export default ContactsView;
