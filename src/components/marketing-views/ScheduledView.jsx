import { useState, useMemo } from 'react';
import { Clock, FileText, Calendar, Plus, RefreshCw, Mail, MessageCircle, X, Eye, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { formatDateTime, renderStatusBadge, parseFirestoreDate } from './utils';

const ScheduledView = ({ 
    campaigns = [],
    scheduledViewTab = 'active',
    onSetScheduledViewTab = () => {},
    loading = false,
    onOpenComposeModal = () => {},
    onProcessOverdue = () => {},
    onSetSelectedCampaign = () => {},
    onShowCampaignDetailsModal = () => {}
}) => {
    const [activeSortConfig, setActiveSortConfig] = useState({ column: null, direction: null });
    const [historySortConfig, setHistorySortConfig] = useState({ column: null, direction: null });

    // Active scheduled campaigns (status = 'scheduled')
    const scheduledItems = campaigns.filter(c => c.status === 'scheduled');
    
    // History: campaigns that were scheduled but are now completed/failed/partial
    const scheduledHistoryBase = (campaigns || []).filter(c => {
        const hasScheduledAt = c.scheduled_at || c.scheduledAt;
        const isNotScheduled = c.status !== 'scheduled' && c.status !== 'pending' && c.status !== 'cancelled';
        return hasScheduledAt && isNotScheduled;
    });

    // Generic sort handler
    const handleSort = (column, isHistory = false) => {
        const setSortConfig = isHistory ? setHistorySortConfig : setActiveSortConfig;
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

    // Generic sort function
    const sortCampaigns = (campaignsList, sortConfig, isHistory = false) => {
        if (!sortConfig.column || !sortConfig.direction) {
            if (isHistory) {
                // Default: sort by scheduled_at date (most recent first)
                return [...campaignsList].sort((a, b) => {
                    const dateA = a.scheduled_at || a.scheduledAt;
                    const dateB = b.scheduled_at || b.scheduledAt;
                    if (!dateA && !dateB) return 0;
                    if (!dateA) return 1;
                    if (!dateB) return -1;
                    const timeA = dateA.toDate ? dateA.toDate().getTime() : (dateA.seconds ? dateA.seconds * 1000 : new Date(dateA).getTime());
                    const timeB = dateB.toDate ? dateB.toDate().getTime() : (dateB.seconds ? dateB.seconds * 1000 : new Date(dateB).getTime());
                    return timeB - timeA;
                });
            }
            return campaignsList;
        }

        return [...campaignsList].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.column) {
                case 'type':
                    aValue = a.type || '';
                    bValue = b.type || '';
                    break;
                case 'message':
                    aValue = (a.subject || a.message || '').toLowerCase();
                    bValue = (b.subject || b.message || '').toLowerCase();
                    break;
                case 'recipients':
                    if (isHistory) {
                        aValue = a.recipient_count || a.recipientCount || 0;
                        bValue = b.recipient_count || b.recipientCount || 0;
                    } else {
                        aValue = a.sentCount || a.recipientCount || 0;
                        bValue = b.sentCount || b.recipientCount || 0;
                    }
                    break;
                case 'scheduledFor':
                    const dateA = a.scheduled_at || a.scheduledAt;
                    const dateB = b.scheduled_at || b.scheduledAt;
                    aValue = dateA?.toDate ? dateA.toDate().getTime() : 
                            (dateA?.seconds ? dateA.seconds * 1000 : 
                            (dateA ? new Date(dateA).getTime() : 0));
                    bValue = dateB?.toDate ? dateB.toDate().getTime() : 
                            (dateB?.seconds ? dateB.seconds * 1000 : 
                            (dateB ? new Date(dateB).getTime() : 0));
                    break;
                case 'sentAt':
                    const sentA = a.sent_at;
                    const sentB = b.sent_at;
                    aValue = sentA?.toDate ? sentA.toDate().getTime() : 
                            (sentA?.seconds ? sentA.seconds * 1000 : 
                            (sentA ? new Date(sentA).getTime() : 0));
                    bValue = sentB?.toDate ? sentB.toDate().getTime() : 
                            (sentB?.seconds ? sentB.seconds * 1000 : 
                            (sentB ? new Date(sentB).getTime() : 0));
                    break;
                case 'status':
                    aValue = a.status || '';
                    bValue = b.status || '';
                    break;
                default:
                    return 0;
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedScheduledItems = useMemo(() => {
        return sortCampaigns(scheduledItems, activeSortConfig, false);
    }, [scheduledItems, activeSortConfig]);

    const sortedScheduledHistory = useMemo(() => {
        return sortCampaigns(scheduledHistoryBase, historySortConfig, true);
    }, [scheduledHistoryBase, historySortConfig]);

    // Render sort icon
    const renderSortIcon = (column, isHistory = false) => {
        const sortConfig = isHistory ? historySortConfig : activeSortConfig;
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
                    <h2>
                        Scheduled Campaigns
                        {scheduledViewTab === 'active' ? ` (${scheduledItems.length})` : ` History (${sortedScheduledHistory.length})`}
                    </h2>
                </div>
                <div className="page-actions-right">
                    {scheduledViewTab === 'active' && (
                        <button 
                            className="btn btn-outline" 
                            onClick={onProcessOverdue}
                            disabled={loading || scheduledItems.length === 0}
                            title="Process campaigns that are past their scheduled time"
                        >
                            <RefreshCw size={18} />
                            Process Overdue
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs for Active vs History */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '0' }}>
                <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
                    <button
                        className={`tab-button ${scheduledViewTab === 'active' ? 'active' : ''}`}
                        onClick={() => onSetScheduledViewTab('active')}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            borderBottom: scheduledViewTab === 'active' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: scheduledViewTab === 'active' ? 'var(--primary)' : '#6b7280',
                            fontWeight: scheduledViewTab === 'active' ? '600' : '400',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Clock size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        Active Scheduled ({scheduledItems.length})
                    </button>
                    <button
                        className={`tab-button ${scheduledViewTab === 'history' ? 'active' : ''}`}
                        onClick={() => onSetScheduledViewTab('history')}
                        style={{
                            flex: 1,
                            padding: '1rem',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            borderBottom: scheduledViewTab === 'history' ? '2px solid var(--primary)' : '2px solid transparent',
                            color: scheduledViewTab === 'history' ? 'var(--primary)' : '#6b7280',
                            fontWeight: scheduledViewTab === 'history' ? '600' : '400',
                            transition: 'all 0.2s'
                        }}
                    >
                        <FileText size={18} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        History ({sortedScheduledHistory.length})
                    </button>
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

            {scheduledViewTab === 'active' ? (
                <div className="card table-card">
                    {scheduledItems.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <Calendar size={64} />
                            </div>
                            <h3>No scheduled campaigns</h3>
                            <p>You haven't scheduled any campaigns yet. When creating a campaign, choose a future date to schedule it.</p>
                            <button className="btn btn-primary" onClick={() => onOpenComposeModal(null)}>
                                <Plus size={20} />
                                Create Campaign
                            </button>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th 
                                            onClick={() => handleSort('type', false)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by type"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Type
                                                {renderSortIcon('type', false)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('message', false)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by message"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Message
                                                {renderSortIcon('message', false)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('recipients', false)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by recipients"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Recipients
                                                {renderSortIcon('recipients', false)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('scheduledFor', false)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by scheduled date"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Scheduled For
                                                {renderSortIcon('scheduledFor', false)}
                                            </span>
                                        </th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedScheduledItems.map((campaign) => (
                                        <tr 
                                            key={campaign.id}
                                            onClick={() => {
                                                onSetSelectedCampaign(campaign);
                                                onShowCampaignDetailsModal(true);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
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
                                                    {campaign.scheduledAt || campaign.scheduled_at ? formatDateTime(campaign.scheduledAt || campaign.scheduled_at) : 'Not set'}
                                                </span>
                                            </td>
                                            <td>
                                                <span className="badge badge-warning">
                                                    <Clock size={12} />
                                                    Scheduled
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
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
            ) : (
                <div className="card table-card">
                    {sortedScheduledHistory.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">
                                <FileText size={64} />
                            </div>
                            <h3>No scheduled history</h3>
                            <p>Completed scheduled campaigns will appear here once they've been sent.</p>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th 
                                            onClick={() => handleSort('type', true)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by type"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Type
                                                {renderSortIcon('type', true)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('message', true)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by message"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Message
                                                {renderSortIcon('message', true)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('recipients', true)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by recipients"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Recipients
                                                {renderSortIcon('recipients', true)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('scheduledFor', true)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by scheduled date"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Scheduled For
                                                {renderSortIcon('scheduledFor', true)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('sentAt', true)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by sent date"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Sent At
                                                {renderSortIcon('sentAt', true)}
                                            </span>
                                        </th>
                                        <th 
                                            onClick={() => handleSort('status', true)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title="Click to sort by status"
                                        >
                                            <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Status
                                                {renderSortIcon('status', true)}
                                            </span>
                                        </th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedScheduledHistory.map((campaign) => (
                                        <tr 
                                            key={campaign.id}
                                            onClick={() => {
                                                onSetSelectedCampaign(campaign);
                                                onShowCampaignDetailsModal(true);
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td>
                                                <span className={`campaign-type-badge ${campaign.type}`}>
                                                    {campaign.type === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />}
                                                    {campaign.type === 'email' ? 'Email' : 'WhatsApp'}
                                                </span>
                                            </td>
                                            <td className="message-preview">
                                                {campaign.subject || campaign.message?.substring(0, 50) + '...'}
                                            </td>
                                            <td>
                                                {campaign.sent_count || campaign.sentCount || 0} / {campaign.recipient_count || campaign.recipientCount || 0}
                                            </td>
                                            <td>
                                                <span className="scheduled-time">
                                                    <Clock size={14} />
                                                    {campaign.scheduledAt || campaign.scheduled_at ? formatDateTime(campaign.scheduledAt || campaign.scheduled_at) : 'Not set'}
                                                </span>
                                            </td>
                                            <td>
                                                {campaign.sent_at ? formatDateTime(campaign.sent_at) : '-'}
                                            </td>
                                            <td>
                                                {renderStatusBadge(campaign)}
                                            </td>
                                            <td>
                                                <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        className="action-btn action-btn-view" 
                                                        title="View Details"
                                                        onClick={() => {
                                                            onSetSelectedCampaign(campaign);
                                                            onShowCampaignDetailsModal(true);
                                                        }}
                                                    >
                                                        <Eye size={16} />
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
        </>
    );
};

export default ScheduledView;
