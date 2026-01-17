import { useState, useMemo } from 'react';
import { Mail, Send, Plus, RefreshCw, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { formatDate, renderStatusBadge } from './utils';

const EmailView = ({ campaigns = [], loading = false, onOpenComposeModal = () => {}, onRetryFailed = () => {} }) => {
    const [sortConfig, setSortConfig] = useState({ column: null, direction: null });

    // Get email campaigns
    const emailCampaigns = useMemo(() => {
        return (campaigns || []).filter(c => c && c.type === 'email');
    }, [campaigns]);

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

    // Sort campaigns based on sortConfig
    const sortedCampaigns = useMemo(() => {
        if (!sortConfig.column || !sortConfig.direction) {
            return [...emailCampaigns].reverse();
        }

        const sorted = [...emailCampaigns].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.column) {
                case 'subject':
                    aValue = (a.subject || '').toLowerCase();
                    bValue = (b.subject || '').toLowerCase();
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

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [emailCampaigns, sortConfig]);

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
                    <h2>Email Campaigns</h2>
                </div>
                <div className="page-actions-right">
                    <button className="btn btn-primary" onClick={() => onOpenComposeModal('email')}>
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
                    <button className="btn btn-primary" onClick={() => onOpenComposeModal('email')}>
                        <Send size={18} />
                        Compose Email
                    </button>
                </div>
            </div>

            <div className="card table-card">
                <div className="card-header">
                    <h2 className="card-title">Email Campaign History</h2>
                </div>
                {emailCampaigns.length === 0 ? (
                    <div className="empty-state small">
                        <p>No email campaigns sent yet.</p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th 
                                        onClick={() => handleSort('subject')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by subject"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Subject
                                            {renderSortIcon('subject')}
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
                                        <tr key={campaign.id}>
                                            <td>{campaign.subject}</td>
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

export default EmailView;
