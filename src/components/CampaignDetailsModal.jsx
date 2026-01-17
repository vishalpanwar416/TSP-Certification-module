import { useState, useEffect } from 'react';
import { Mail, MessageCircle, X, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import firebaseService from '../services/firebaseDirectService';
import { formatDateTime, renderStatusBadge } from './marketing-views/utils';

function CampaignDetailsModal({ campaign, onClose }) {
    const [recipients, setRecipients] = useState([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);

    useEffect(() => {
        const fetchRecipients = async () => {
            if (!campaign || campaign.type !== 'whatsapp') return;
            
            const contactIds = campaign.contact_ids || campaign.contactIds || [];
            if (contactIds.length === 0) return;

            setLoadingRecipients(true);
            try {
                // Fetch all contacts
                const contactPromises = contactIds.map(id => 
                    firebaseService.contacts.getById(id).catch(() => null)
                );
                const contacts = await Promise.all(contactPromises);
                const validContacts = contacts.filter(c => c !== null);

                // Get errors array
                const errors = campaign.errors || [];
                const errorMap = new Map();
                errors.forEach(error => {
                    if (error.contactId) {
                        errorMap.set(error.contactId, error.error || error.message || 'Failed to send');
                    }
                });

                // Get sent and failed counts from campaign
                const sentCount = campaign.sent_count || campaign.sentCount || 0;
                const failedCount = campaign.failed_count || campaign.failedCount || 0;
                const totalContacts = validContacts.length;
                
                // Get campaign creation/update time to check if contact stats were updated after campaign
                const campaignTime = campaign.created_at || campaign.createdAt || campaign.updated_at || campaign.updatedAt;
                const campaignTimestamp = campaignTime?.toDate ? campaignTime.toDate().getTime() : 
                                         (campaignTime?.seconds ? campaignTime.seconds * 1000 : 
                                         (campaignTime ? new Date(campaignTime).getTime() : Date.now()));

                // Determine status for each contact using multiple strategies
                const recipientsWithStatus = validContacts.map(contact => {
                    const hasError = errorMap.has(contact.id);
                    
                    // Strategy 1: If contact is explicitly in errors array, mark as failed
                    if (hasError) {
                        return {
                            ...contact,
                            status: 'failed',
                            error: errorMap.get(contact.id)
                        };
                    }
                    
                    // Strategy 2: Check if contact's whatsapp_sent_count was incremented
                    // This is the most accurate indicator that a message was sent
                    const contactLastContacted = contact.last_contacted_at;
                    if (contactLastContacted) {
                        const lastContactedTime = contactLastContacted.toDate ? contactLastContacted.toDate().getTime() : 
                                                  (contactLastContacted.seconds ? contactLastContacted.seconds * 1000 : 
                                                  (contactLastContacted ? new Date(contactLastContacted).getTime() : 0));
                        const contactType = contact.last_contact_type;
                        
                        // If contact was contacted via WhatsApp after campaign creation, likely sent
                        if (contactType === 'whatsapp' && lastContactedTime >= campaignTimestamp - 60000) { // 1 minute buffer
                            return {
                                ...contact,
                                status: 'sent',
                                error: null
                            };
                        }
                    }
                    
                    // Strategy 3: If errors array is smaller than failed_count, 
                    // it means some contacts succeeded but aren't explicitly tracked
                    // In this case, if not in errors, assume sent (optimistic)
                    if (errors.length < failedCount && sentCount > 0) {
                        return {
                            ...contact,
                            status: 'sent',
                            error: null
                        };
                    }
                    
                    // Strategy 4: If sent_count > 0 but contact not in errors, likely sent
                    // This handles cases where errors array might be incomplete
                    if (sentCount > 0 && errors.length === 0) {
                        return {
                            ...contact,
                            status: 'sent',
                            error: null
                        };
                    }
                    
                    // Default: If campaign shows all failed (sent_count = 0), but contact not in errors,
                    // there might be a data inconsistency - mark as unknown/checking
                    // But for now, if not in errors and sent_count is 0, we'll mark as failed
                    // to match the campaign status
                    if (sentCount === 0 && failedCount > 0) {
                        // Campaign shows all failed, but contact not in errors array
                        // This is a data inconsistency - mark as failed to match campaign status
                        return {
                            ...contact,
                            status: 'failed',
                            error: 'Status unclear - not in errors array but campaign shows failed'
                        };
                    }
                    
                    // Final default: if not in errors, assume sent
                    return {
                        ...contact,
                        status: 'sent',
                        error: null
                    };
                });

                // Log warning if there's a data inconsistency
                if (errors.length !== failedCount && failedCount > 0) {
                    console.warn('Campaign recipient status mismatch:', {
                        totalContacts,
                        sentCount,
                        failedCount,
                        errorsInArray: errors.length,
                        message: 'Errors array length does not match failed_count. Some statuses may be inaccurate.'
                    });
                }

                setRecipients(recipientsWithStatus);
            } catch (error) {
                console.error('Error fetching recipients:', error);
            } finally {
                setLoadingRecipients(false);
            }
        };

        fetchRecipients();
    }, [campaign]);

    if (!campaign) return null;

    const isWhatsApp = campaign.type === 'whatsapp';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            >
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">
                            {campaign.type === 'email' ? <Mail size={24} style={{ color: 'var(--primary)', marginRight: '10px' }} /> : <MessageCircle size={24} style={{ color: 'var(--primary)', marginRight: '10px' }} />}
                            Campaign Details
                        </h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
                            {campaign.type === 'email' ? 'Email' : 'WhatsApp'} Campaign
                        </p>
                    </div>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '24px' }}>
                    <div className="campaign-details-grid" style={{ display: 'grid', gap: '20px' }}>
                        {/* Campaign Type */}
                        <div className="detail-item">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Campaign Type</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span className={`campaign-type-badge ${campaign.type}`}>
                                    {campaign.type === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />}
                                    {campaign.type === 'email' ? 'Email' : 'WhatsApp'}
                                </span>
                            </div>
                        </div>

                        {/* Subject (for email) */}
                        {campaign.subject && (
                            <div className="detail-item">
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Subject</label>
                                <p style={{ fontSize: '1rem', color: '#111827', fontWeight: '500' }}>{campaign.subject}</p>
                            </div>
                        )}

                        {/* Message Content */}
                        <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                                {campaign.type === 'email' ? 'Email Message' : 'WhatsApp Message'}
                            </label>
                            <div style={{ 
                                padding: '16px', 
                                backgroundColor: '#f9fafb', 
                                borderRadius: '8px', 
                                border: '1px solid #e5e7eb',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                maxHeight: '300px',
                                overflowY: 'auto'
                            }}>
                                {campaign.message || campaign.emailMessage || campaign.whatsappMessage || 'No message content'}
                            </div>
                        </div>

                        {/* Recipients Count */}
                        <div className="detail-item">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Total Recipients</label>
                            <p style={{ fontSize: '1rem', color: '#111827', fontWeight: '500' }}>
                                {campaign.recipientCount || campaign.recipient_count || campaign.contact_ids?.length || campaign.contactIds?.length || 0}
                            </p>
                        </div>

                        {/* Sent/Failed Counts */}
                        <div className="detail-item">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Status Summary</label>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <span style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '4px',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    backgroundColor: '#d1fae5',
                                    color: '#065f46',
                                    fontSize: '0.875rem',
                                    fontWeight: '500'
                                }}>
                                    <CheckCircle size={14} />
                                    Sent: {campaign.sent_count || campaign.sentCount || 0}
                                </span>
                                {(campaign.failed_count || campaign.failedCount || 0) > 0 && (
                                    <span style={{ 
                                        display: 'inline-flex', 
                                        alignItems: 'center', 
                                        gap: '4px',
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        backgroundColor: '#fee2e2',
                                        color: '#991b1b',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}>
                                        <AlertCircle size={14} />
                                        Failed: {campaign.failed_count || campaign.failedCount || 0}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Scheduled For */}
                        <div className="detail-item">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Scheduled For</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Clock size={14} style={{ color: '#6b7280' }} />
                                <p style={{ fontSize: '1rem', color: '#111827', fontWeight: '500' }}>
                                    {campaign.scheduledAt || campaign.scheduled_at ? formatDateTime(campaign.scheduledAt || campaign.scheduled_at) : 'Not set'}
                                </p>
                            </div>
                        </div>

                        {/* Status */}
                        <div className="detail-item">
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Status</label>
                            {renderStatusBadge(campaign)}
                        </div>

                        {/* Created At */}
                        {campaign.createdAt || campaign.created_at ? (
                            <div className="detail-item">
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Created At</label>
                                <p style={{ fontSize: '1rem', color: '#111827' }}>
                                    {formatDateTime(campaign.createdAt || campaign.created_at)}
                                </p>
                            </div>
                        ) : null}

                        {/* Campaign ID */}
                        {campaign.id && (
                            <div className="detail-item">
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>Campaign ID</label>
                                <p style={{ fontSize: '0.875rem', color: '#6b7280', fontFamily: 'monospace' }}>{campaign.id}</p>
                            </div>
                        )}

                        {/* Recipients List - Only for WhatsApp campaigns */}
                        {isWhatsApp && (
                            <div className="detail-item" style={{ gridColumn: '1 / -1', marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                                        Recipient Details ({recipients.length})
                                    </label>
                                    {(campaign.errors?.length || 0) !== (campaign.failed_count || campaign.failedCount || 0) && (campaign.failed_count || campaign.failedCount || 0) > 0 && (
                                        <span style={{ 
                                            fontSize: '0.75rem', 
                                            color: '#dc2626', 
                                            backgroundColor: '#fee2e2', 
                                            padding: '4px 8px', 
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}>
                                            <AlertCircle size={12} />
                                            Data inconsistency detected
                                        </span>
                                    )}
                                </div>
                                {loadingRecipients ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                                        <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                                        <p style={{ marginTop: '8px' }}>Loading recipients...</p>
                                    </div>
                                ) : recipients.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                                        <p>No recipient details available</p>
                                    </div>
                                ) : (
                                    <div style={{ 
                                        maxHeight: '400px', 
                                        overflowY: 'auto',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        backgroundColor: '#fff'
                                    }}>
                                        <table className="table" style={{ margin: 0 }}>
                                            <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f9fafb', zIndex: 1 }}>
                                                <tr>
                                                    <th style={{ padding: '12px', fontSize: '0.875rem', fontWeight: '600' }}>Name</th>
                                                    <th style={{ padding: '12px', fontSize: '0.875rem', fontWeight: '600' }}>Phone</th>
                                                    <th style={{ padding: '12px', fontSize: '0.875rem', fontWeight: '600' }}>Status</th>
                                                    <th style={{ padding: '12px', fontSize: '0.875rem', fontWeight: '600' }}>Error</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recipients.map((recipient) => (
                                                    <tr key={recipient.id}>
                                                        <td style={{ padding: '12px', fontSize: '0.875rem' }}>
                                                            {recipient.name || 'N/A'}
                                                        </td>
                                                        <td style={{ padding: '12px', fontSize: '0.875rem' }}>
                                                            {recipient.phone || 'N/A'}
                                                        </td>
                                                        <td style={{ padding: '12px' }}>
                                                            {recipient.status === 'sent' ? (
                                                                <span style={{ 
                                                                    display: 'inline-flex', 
                                                                    alignItems: 'center', 
                                                                    gap: '4px',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: '#d1fae5',
                                                                    color: '#065f46',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    <CheckCircle size={12} />
                                                                    Sent
                                                                </span>
                                                            ) : (
                                                                <span style={{ 
                                                                    display: 'inline-flex', 
                                                                    alignItems: 'center', 
                                                                    gap: '4px',
                                                                    padding: '4px 8px',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: '#fee2e2',
                                                                    color: '#991b1b',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '500'
                                                                }}>
                                                                    <AlertCircle size={12} />
                                                                    Failed
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '12px', fontSize: '0.75rem', color: '#991b1b', maxWidth: '200px' }}>
                                                            {recipient.error ? (
                                                                <span title={recipient.error} style={{ 
                                                                    display: 'block',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {recipient.error}
                                                                </span>
                                                            ) : (
                                                                <span style={{ color: '#6b7280' }}>-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CampaignDetailsModal;
