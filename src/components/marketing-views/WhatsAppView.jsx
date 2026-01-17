import { useState, useMemo } from 'react';
import { MessageCircle, Send, RefreshCw, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { formatDate, renderStatusBadge } from './utils';

const WhatsAppView = ({ campaigns = [], loading = false, onOpenComposeModal = () => {}, onRetryFailed = () => {}, onSetSelectedCampaign = () => {}, onShowCampaignDetailsModal = () => {} }) => {
    const [sortConfig, setSortConfig] = useState({ column: null, direction: null }); // null, 'asc', 'desc'

    // Get WhatsApp campaigns
    const whatsappCampaigns = useMemo(() => {
        return (campaigns || []).filter(c => c && c.type === 'whatsapp');
    }, [campaigns]);

    // Handle column header click for sorting
    const handleSort = (column) => {
        setSortConfig(prev => {
            // Cycle through: null -> 'asc' -> 'desc' -> null
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

    // Sort campaigns based on sortConfig
    const sortedCampaigns = useMemo(() => {
        if (!sortConfig.column || !sortConfig.direction) {
            // Default: reverse order (most recent first)
            return [...whatsappCampaigns].reverse();
        }

        const sorted = [...whatsappCampaigns].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.column) {
                case 'message':
                    aValue = (a.message || '').toLowerCase();
                    bValue = (b.message || '').toLowerCase();
                    break;
                case 'recipients':
                    aValue = a.recipient_count || a.recipientCount || a.sent_count || a.sentCount || 0;
                    bValue = b.recipient_count || b.recipientCount || b.sent_count || b.sentCount || 0;
                    break;
                case 'date':
                    const dateA = a.created_at || a.createdAt;
                    const dateB = b.created_at || b.createdAt;
                    aValue = dateA?.toDate ? dateA.toDate().getTime() : 
                            (dateA?.seconds ? dateA.seconds * 1000 : 
                            (dateA ? new Date(dateA).getTime() : 0));
                    bValue = dateB?.toDate ? dateB.toDate().getTime() : 
                            (dateB?.seconds ? dateB.seconds * 1000 : 
                            (dateB ? new Date(dateB).getTime() : 0));
                    break;
                case 'status':
                    aValue = a.status || '';
                    bValue = b.status || '';
                    break;
                default:
                    return 0;
            }

            // Compare values
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [whatsappCampaigns, sortConfig]);

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
            <div className="campaign-intro-card whatsapp">
                <div className="campaign-intro-icon whatsapp">
                    <MessageCircle size={48} />
                </div>
                <div className="campaign-intro-content">
                    <h3>Send Bulk WhatsApp Messages</h3>
                    <p>Reach your contacts directly through WhatsApp. Great for quick updates, promotions, and personal communication.</p>
                    <button className="btn btn-success" onClick={() => onOpenComposeModal('whatsapp')}>
                        <Send size={18} />
                        Compose Message
                    </button>
                </div>
            </div>

            <div className="card table-card">
                <div className="card-header">
                    <h2 className="card-title">WhatsApp Campaign History</h2>
                </div>
                {whatsappCampaigns.length === 0 ? (
                    <div className="empty-state small">
                        <p>No WhatsApp campaigns sent yet.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th 
                                        onClick={() => handleSort('message')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by message"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Message Preview
                                            {renderSortIcon('message')}
                                        </span>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('recipients')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by recipients"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Recipients
                                            {renderSortIcon('recipients')}
                                        </span>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('date')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by date"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Date
                                            {renderSortIcon('date')}
                                        </span>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('status')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by status"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Status
                                            {renderSortIcon('status')}
                                        </span>
                                    </th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedCampaigns.map((campaign) => {
                                    const failedCount = campaign.failed_count || campaign.failedCount || 0;
                                    const canRetry = failedCount > 0 && (campaign.status === 'failed' || campaign.status === 'partial');
                                    
                                    return (
                                        <tr 
                                            key={campaign.id}
                                            onClick={() => {
                                                if (onSetSelectedCampaign && onShowCampaignDetailsModal) {
                                                    onSetSelectedCampaign(campaign);
                                                    onShowCampaignDetailsModal(true);
                                                }
                                            }}
                                            style={{ cursor: onSetSelectedCampaign && onShowCampaignDetailsModal ? 'pointer' : 'default' }}
                                        >
                                            <td className="message-preview">{campaign.message ? campaign.message.substring(0, 50) + '...' : 'No message'}</td>
                                            <td>{campaign.recipient_count || campaign.recipientCount || campaign.sent_count || campaign.sentCount || 0}</td>
                                            <td>{formatDate(campaign.created_at || campaign.createdAt)}</td>
                                            <td>
                                                {renderStatusBadge(campaign)}
                                            </td>
                                            <td>
                                                {canRetry && (
                                                    <button
                                                        className="btn btn-sm btn-outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onRetryFailed(campaign.id);
                                                        }}
                                                        disabled={loading}
                                                        title={`Retry ${failedCount} failed message${failedCount > 1 ? 's' : ''}`}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.25rem',
                                                            padding: '0.25rem 0.5rem',
                                                            fontSize: '0.875rem'
                                                        }}
                                                    >
                                                        <RefreshCw size={14} />
                                                        Retry
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
};

export default WhatsAppView;
