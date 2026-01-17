import { Webhook, CheckCircle, AlertCircle, X, Clock, Activity, Zap, RefreshCw, AlertTriangle, GitBranch } from 'lucide-react';

function SettingsView({
    webhookConnectionStatus,
    webhookLastChecked,
    webhookUrl,
    pipelineEnabled,
    onCheckConnection,
    onSendTestWebhook,
    platforms,
    onConnectPlatform,
    onDisconnectPlatform,
    loading
}) {
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="settings-view">
            {/* Webhook Connection Check */}
            <div className="card webhook-connection-card">
                <div className="card-header">
                    <div className="section-header">
                        <div className="section-icon">
                            <Webhook size={24} />
                        </div>
                        <div>
                            <h3 className="card-title">Webhook Connection</h3>
                            <p className="card-description">Test and verify your webhook connection status</p>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <div className="webhook-connection-section">
                        <div className="webhook-connection-status-card">
                            <div className="status-header">
                                <div className="status-icon-wrapper">
                                    {webhookConnectionStatus === 'checking' && <RefreshCw size={24} className="spinning" />}
                                    {webhookConnectionStatus === 'connected' && <CheckCircle size={24} />}
                                    {webhookConnectionStatus === 'disconnected' && <AlertCircle size={24} />}
                                    {webhookConnectionStatus === 'error' && <X size={24} />}
                                    {!webhookConnectionStatus && <AlertTriangle size={24} />}
                                </div>
                                <div className="status-content">
                                    <span className="status-label">Connection Status</span>
                                    <span className={`status-value ${webhookConnectionStatus || 'not-checked'}`}>
                                        {webhookConnectionStatus === 'checking' && 'Checking...'}
                                        {webhookConnectionStatus === 'connected' && 'Connected'}
                                        {webhookConnectionStatus === 'disconnected' && 'Disconnected'}
                                        {webhookConnectionStatus === 'error' && 'Error'}
                                        {!webhookConnectionStatus && 'Not Checked'}
                                    </span>
                                </div>
                            </div>
                            <div className="status-meta">
                                <Clock size={14} />
                                <span>Last checked: {webhookLastChecked ? formatDateTime(webhookLastChecked) : 'N/A'}</span>
                            </div>
                        </div>
                        
                        <div className="webhook-config-details-grid">
                            <div className="webhook-config-detail-card">
                                <div className="config-detail-header">
                                    <Webhook size={18} />
                                    <span>Webhook URL</span>
                                </div>
                                <div className="config-detail-content">
                                    <code className="config-detail-value">{webhookUrl || 'Not configured'}</code>
                                </div>
                            </div>
                            <div className="webhook-config-detail-card">
                                <div className="config-detail-header">
                                    <GitBranch size={18} />
                                    <span>Pipeline Status</span>
                                </div>
                                <div className="config-detail-content">
                                    <span className={`config-detail-value status-indicator ${pipelineEnabled ? 'enabled' : 'disabled'}`}>
                                        <div className={`status-dot-small ${pipelineEnabled ? 'active' : 'inactive'}`}></div>
                                        {pipelineEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="webhook-connection-actions-enhanced">
                            <button
                                className="btn btn-primary btn-enhanced"
                                onClick={onCheckConnection}
                                disabled={loading || webhookConnectionStatus === 'checking'}
                            >
                                {webhookConnectionStatus === 'checking' ? (
                                    <>
                                        <RefreshCw size={18} className="spinning" />
                                        <span>Checking...</span>
                                    </>
                                ) : (
                                    <>
                                        <Activity size={18} />
                                        <span>Check Connection</span>
                                    </>
                                )}
                            </button>
                            <button
                                className="btn btn-outline btn-enhanced"
                                onClick={onSendTestWebhook}
                                disabled={loading || !pipelineEnabled}
                                title={!pipelineEnabled ? 'Enable pipeline first to send test webhook' : 'Send a test webhook'}
                            >
                                <Zap size={18} />
                                <span>Send Test Webhook</span>
                            </button>
                        </div>
                    </div>
                    
                    {/* Status Messages */}
                    {webhookConnectionStatus === 'connected' && (
                        <div className="webhook-status-message success">
                            <div className="message-icon">
                                <CheckCircle size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Webhook is active!</strong>
                                <p>Your webhook endpoint is ready to receive automated posts. Posts sent to this webhook will appear in the Pipeline tab.</p>
                            </div>
                        </div>
                    )}
                    
                    {webhookConnectionStatus === 'disconnected' && (
                        <div className="webhook-status-message warning">
                            <div className="message-icon">
                                <AlertCircle size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Webhook is inactive</strong>
                                <p>Enable the automation pipeline in the Pipeline tab to activate webhook receiving.</p>
                            </div>
                        </div>
                    )}
                    
                    {webhookConnectionStatus === 'error' && (
                        <div className="webhook-status-message error">
                            <div className="message-icon">
                                <X size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Connection check failed</strong>
                                <p>Unable to verify webhook connection. Please check your configuration and try again.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Connected Platforms */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">Connected Platforms</h3>
                    <p className="card-description">Manage your social media platform connections</p>
                </div>
                <div className="platforms-settings">
                    {platforms.map(platform => {
                        const Icon = platform.icon;
                        return (
                            <div key={platform.id} className="platform-setting-card-enhanced">
                                <div className="platform-card-content">
                                    <div className="platform-info-enhanced">
                                        <div className="platform-icon-wrapper-enhanced" style={{ backgroundColor: platform.color + '15', borderColor: platform.color + '40' }}>
                                            <Icon size={28} style={{ color: platform.color }} />
                                        </div>
                                        <div className="platform-details">
                                            <div className="platform-name-row">
                                                <span className="platform-name-enhanced">{platform.name}</span>
                                                <span className={`connection-status ${platform.connected ? 'connected' : 'disconnected'}`}>
                                                    {platform.connected ? (
                                                        <>
                                                            <CheckCircle size={14} />
                                                            Connected
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertCircle size={14} />
                                                            Not Connected
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="platform-setting-details">
                                                <span>Character Limit: {platform.charLimit}</span>
                                                <span>Optimal Length: {platform.optimalLength}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="platform-action-buttons">
                                        {platform.connected ? (
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => onDisconnectPlatform(platform.id)}
                                            >
                                                Disconnect
                                            </button>
                                        ) : (
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => onConnectPlatform(platform.id)}
                                            >
                                                Connect
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default SettingsView;
