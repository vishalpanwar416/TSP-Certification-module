import { useState, useMemo } from 'react';
import { Upload, Plus, Users, Mail, MessageCircle, Layers, TrendingUp, BarChart3, PieChart, Calendar, Send, CheckCircle, AlertCircle, RefreshCw, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { formatDate, renderStatusBadge, parseFirestoreDate } from './utils';

const DashboardView = ({ 
    stats = { totalContacts: 0, emailsSent: 0, whatsappSent: 0, campaigns: 0 }, 
    campaigns = [], 
    loading = false, 
    onOpenComposeModal = () => {}, 
    onShowUploadModal = () => {}, 
    onRetryFailed = () => {}
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

    // Sort campaigns based on sortConfig
    const sortedCampaigns = useMemo(() => {
        const allCampaigns = (campaigns || []).slice(-5);
        
        if (!sortConfig.column || !sortConfig.direction) {
            return [...allCampaigns].reverse();
        }

        const sorted = [...allCampaigns].sort((a, b) => {
            let aValue, bValue;

            switch (sortConfig.column) {
                case 'type':
                    aValue = a.type || '';
                    bValue = b.type || '';
                    break;
                case 'subject':
                    aValue = (a.subject || a.message || '').toLowerCase();
                    bValue = (b.subject || b.message || '').toLowerCase();
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
    }, [campaigns, sortConfig]);

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
            {/* Welcome Banner */}
            <div className="welcome-banner">
                <div className="banner-content">
                    <div className="banner-text">
                        <h2>Welcome back!</h2>
                        <p>Send bulk emails and WhatsApp messages to your contacts. Upload your database and start your campaign!</p>
                    </div>
                    <div className="banner-actions">
                        <button className="btn btn-light" onClick={onShowUploadModal}>
                            <Upload size={18} />
                            Upload Contacts
                        </button>
                        <button className="btn btn-primary" onClick={() => onOpenComposeModal(null)}>
                            <Plus size={18} />
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
                                        return (campaigns || []).filter(c => {
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
                {(!campaigns || campaigns.length === 0) ? (
                    <div className="empty-state">
                        <div className="empty-icon">
                            <Send size={64} />
                        </div>
                        <h3>No campaigns yet</h3>
                        <p>Start your first email or WhatsApp campaign to reach your contacts.</p>
                        <button className="btn btn-primary" onClick={() => onOpenComposeModal(null)}>
                            <Plus size={20} />
                            Create First Campaign
                        </button>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th 
                                        onClick={() => handleSort('type')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by type"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Type
                                            {renderSortIcon('type')}
                                        </span>
                                    </th>
                                    <th 
                                        onClick={() => handleSort('subject')}
                                        style={{ cursor: 'pointer', userSelect: 'none' }}
                                        title="Click to sort by subject/message"
                                    >
                                        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                                            Subject/Message
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
                                            <td>
                                                <span className={`campaign-type-badge ${campaign.type}`}>
                                                    {campaign.type === 'email' ? <Mail size={14} /> : <MessageCircle size={14} />}
                                                    {campaign.type === 'email' ? 'Email' : 'WhatsApp'}
                                                </span>
                                            </td>
                                            <td className="message-preview">
                                                {campaign.subject || (campaign.message ? campaign.message.substring(0, 50) + '...' : 'No message')}
                                            </td>
                                            <td>{campaign.recipient_count || campaign.recipientCount || campaign.sent_count || campaign.sentCount || 0}</td>
                                            <td>{formatDate(campaign.created_at || campaign.createdAt)}</td>
                                            <td>
                                                {renderStatusBadge(campaign)}
                                            </td>
                                            <td>
                                                {canRetry && (
                                                    <button
                                                        className="btn btn-sm btn-outline"
                                                        onClick={() => onRetryFailed(campaign.id)}
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

export default DashboardView;
