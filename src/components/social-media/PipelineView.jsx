import { GitBranch, Webhook, CheckCircle, Clock, AlertCircle, TrendingUp, Zap, Share2, Copy as CopyIcon, Activity, AlertTriangle } from 'lucide-react';
import PostCard from './PostCard';

function PipelineView({
    pipelineEnabled,
    onTogglePipeline,
    webhookUrl,
    webhookSecret,
    webhookCopied,
    onCopyWebhookUrl,
    onCopyWebhookSecret,
    webhookPosts,
    posts,
    platforms,
    selectedPosts,
    onToggleSelection,
    onPreview,
    onEdit,
    onDelete,
    onToggleStatus,
    loading,
    onSendTestWebhook
}) {
    const allWebhookPosts = [...(webhookPosts || []), ...(posts || []).filter(p => p.source === 'webhook')];
    const pipelineStats = {
        totalWebhookPosts: allWebhookPosts.length,
        successfulPosts: allWebhookPosts.filter(p => p.status === 'published').length,
        failedPosts: allWebhookPosts.filter(p => p.status === 'failed').length,
        pendingPosts: allWebhookPosts.filter(p => p.status === 'scheduled' || p.status === 'pending').length
    };

    return (
        <div className="pipeline-view">
            {/* Pipeline Status Card */}
            <div className={`card pipeline-main-card ${pipelineEnabled ? 'pipeline-active' : 'pipeline-inactive'}`}>
                <div className="card-header pipeline-header">
                    <div className="card-header-left">
                        <div className="pipeline-title-section">
                            <div className="pipeline-icon-wrapper">
                                <GitBranch size={28} />
                                {pipelineEnabled && (
                                    <span className="pipeline-pulse"></span>
                                )}
                            </div>
                            <div>
                                <h3 className="card-title">
                                    Automation Pipeline
                                </h3>
                                <p className="card-description">
                                    Monitor and manage automated posts from webhooks
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="pipeline-toggle-container">
                        <div className="pipeline-status-indicator">
                            <div className={`status-dot ${pipelineEnabled ? 'active' : 'inactive'}`}></div>
                            <span className={`status-text ${pipelineEnabled ? 'active' : 'inactive'}`}>
                                {pipelineEnabled ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <label className="pipeline-toggle-label">
                            <button
                                className={`pipeline-toggle-btn ${pipelineEnabled ? 'enabled' : 'disabled'}`}
                                onClick={onTogglePipeline}
                                disabled={loading}
                                title={pipelineEnabled ? 'Disable Pipeline' : 'Enable Pipeline'}
                            >
                                <div className="toggle-slider">
                                    <div className="toggle-handle"></div>
                                </div>
                                <span className="toggle-label">
                                    {pipelineEnabled ? 'ON' : 'OFF'}
                                </span>
                            </button>
                        </label>
                    </div>
                </div>
                
                {pipelineEnabled && (
                    <div className="card-body">
                        {/* Webhook Configuration */}
                        <div className="webhook-config-section">
                            <div className="section-header">
                                <div className="section-icon">
                                    <Webhook size={24} />
                                </div>
                                <div>
                                    <h4>Webhook Configuration</h4>
                                    <p className="section-subtitle">Configure your webhook endpoint for automated posts</p>
                                </div>
                            </div>
                            <div className="webhook-info-grid">
                                <div className="webhook-info-card enhanced">
                                    <div className="webhook-card-header">
                                        <div className="webhook-info-header">
                                            <div className="webhook-icon-wrapper">
                                                <Webhook size={22} />
                                            </div>
                                            <div>
                                                <span className="webhook-label">Webhook URL</span>
                                                <span className="webhook-badge">Public</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="webhook-url-container enhanced">
                                        <code className="webhook-url">{webhookUrl}</code>
                                        <button
                                            className={`btn-icon btn-copy enhanced ${webhookCopied ? 'copied' : ''}`}
                                            onClick={onCopyWebhookUrl}
                                            title="Copy URL"
                                        >
                                            {webhookCopied ? (
                                                <>
                                                    <CheckCircle size={18} />
                                                    <span className="copy-feedback">Copied!</span>
                                                </>
                                            ) : (
                                                <>
                                                    <CopyIcon size={18} />
                                                    <span className="copy-feedback">Copy</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="webhook-hint-box">
                                        <Activity size={14} />
                                        <small>Use this URL to receive property listings and automatically post to social media</small>
                                    </div>
                                    <div className="webhook-example-section">
                                        <strong>Example Payload:</strong>
                                        <pre className="webhook-example-code">
{`{
  "type": "property_listing",
  "property": {
    "title": "Luxury 3BHK Apartment",
    "location": "Mumbai, Maharashtra",
    "price": "₹2.5 Crores",
    "area": "1500 sq ft",
    "bedrooms": 3,
    "bathrooms": 2,
    "description": "Beautiful apartment...",
    "imageUrl": "https://...",
    "propertyUrl": "https://..."
  },
  "platforms": ["facebook", "twitter"],
  "postImmediately": true
}`}
                                        </pre>
                                    </div>
                                </div>
                                
                                <div className="webhook-info-card enhanced">
                                    <div className="webhook-card-header">
                                        <div className="webhook-info-header">
                                            <div className="webhook-icon-wrapper">
                                                <Activity size={22} />
                                            </div>
                                            <div>
                                                <span className="webhook-label">Webhook Secret</span>
                                                <span className="webhook-badge secret">Secret</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="webhook-secret-container enhanced">
                                        <code className="webhook-secret">
                                            {webhookSecret.substring(0, 20)}...
                                        </code>
                                        <button
                                            className="btn-icon btn-copy enhanced"
                                            onClick={onCopyWebhookSecret}
                                            title="Copy Secret"
                                        >
                                            <CopyIcon size={18} />
                                            <span className="copy-feedback">Copy</span>
                                        </button>
                                    </div>
                                    <div className="webhook-hint-box">
                                        <AlertTriangle size={14} />
                                        <small>Keep this secret secure. Use it to verify webhook requests.</small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Pipeline Statistics */}
                        <div className="pipeline-stats-section">
                            <div className="stats-section-header">
                                <h4>Pipeline Statistics</h4>
                                <span className="stats-update-time">Updated just now</span>
                            </div>
                            <div className="pipeline-stats-grid">
                                <div className="pipeline-stat-card enhanced">
                                    <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #8B0000 100%)' }}>
                                        <Webhook size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Total Webhook Posts</span>
                                        <span className="stat-value">{pipelineStats.totalWebhookPosts}</span>
                                        <div className="stat-trend">
                                            <TrendingUp size={12} />
                                            <span>All time</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pipeline-stat-card enhanced success">
                                    <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #8B0000 100%)' }}>
                                        <CheckCircle size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Successful</span>
                                        <span className="stat-value">{pipelineStats.successfulPosts}</span>
                                        <div className="stat-trend positive">
                                            <TrendingUp size={12} />
                                            <span>{pipelineStats.totalWebhookPosts > 0 ? Math.round((pipelineStats.successfulPosts / pipelineStats.totalWebhookPosts) * 100) : 0}% success rate</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pipeline-stat-card enhanced warning">
                                    <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #8B0000 0%, var(--primary) 100%)' }}>
                                        <Clock size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Pending</span>
                                        <span className="stat-value">{pipelineStats.pendingPosts}</span>
                                        <div className="stat-trend">
                                            <Clock size={12} />
                                            <span>In queue</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pipeline-stat-card enhanced danger">
                                    <div className="stat-icon-wrapper" style={{ background: 'linear-gradient(135deg, #8B0000 0%, var(--primary) 100%)' }}>
                                        <AlertCircle size={24} />
                                    </div>
                                    <div className="stat-content">
                                        <span className="stat-label">Failed</span>
                                        <span className="stat-value">{pipelineStats.failedPosts}</span>
                                        <div className="stat-trend negative">
                                            <AlertCircle size={12} />
                                            <span>{pipelineStats.failedPosts > 0 ? 'Needs attention' : 'No errors'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!pipelineEnabled && (
                    <div className="card-body pipeline-inactive-body">
                        <div className="pipeline-inactive-state enhanced">
                            <div className="inactive-visual-container">
                                <div className="inactive-icon-wrapper">
                                    <div className="inactive-icon-bg">
                                        <GitBranch size={80} strokeWidth={1.5} />
                                    </div>
                                    <div className="inactive-pulse-ring"></div>
                                    <div className="inactive-pulse-ring delay-1"></div>
                                </div>
                            </div>
                            <div className="inactive-content">
                                <div className="inactive-status-badge">
                                    <div className="status-dot-large inactive"></div>
                                    <span>Pipeline Inactive</span>
                                </div>
                                <h3 className="inactive-title">Pipeline is Inactive</h3>
                                <p className="inactive-description">
                                    Enable the automation pipeline to start receiving posts from webhooks and automate your social media posting workflow.
                                </p>
                                <div className="inactive-features">
                                    <div className="inactive-feature-item">
                                        <CheckCircle size={18} />
                                        <span>Automatic post creation from webhooks</span>
                                    </div>
                                    <div className="inactive-feature-item">
                                        <CheckCircle size={18} />
                                        <span>Real-time monitoring and statistics</span>
                                    </div>
                                    <div className="inactive-feature-item">
                                        <CheckCircle size={18} />
                                        <span>Multi-platform social media posting</span>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-primary btn-large btn-enable-pipeline"
                                    onClick={onTogglePipeline}
                                    disabled={loading}
                                >
                                    <Zap size={20} />
                                    <span>Enable Pipeline</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Webhook Posts List */}
            {pipelineEnabled && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">
                            <Webhook size={24} />
                            Webhook Posts
                        </h3>
                        <span className="card-badge">{allWebhookPosts.length} posts</span>
                    </div>
                    <div className="card-body">
                        {allWebhookPosts.length === 0 ? (
                            <div className="empty-state">
                                <Webhook size={64} style={{ opacity: 0.3 }} />
                                <h3>No webhook posts yet</h3>
                                <p>Posts received via webhook will appear here</p>
                                <button
                                    className="btn btn-primary"
                                    onClick={onSendTestWebhook}
                                    disabled={loading}
                                >
                                    <Zap size={18} />
                                    Send Test Webhook
                                </button>
                            </div>
                        ) : (
                            <div className="webhook-posts-list">
                                {allWebhookPosts.map(post => (
                                    <PostCard
                                        key={post.id}
                                        post={post}
                                        platforms={platforms}
                                        isSelected={selectedPosts.includes(post.id)}
                                        onSelect={onToggleSelection}
                                        onPreview={onPreview}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onToggleStatus={onToggleStatus}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default PipelineView;
