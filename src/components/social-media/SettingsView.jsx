import { Webhook, CheckCircle, AlertCircle, X, Clock, Activity, Zap, RefreshCw, AlertTriangle, GitBranch, Heart, Mail, MessageCircle, Database, Server, Bell, BellOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { healthAPI } from '../../services/marketingService';
import { requestNotificationPermission, isNotificationEnabled, getNotificationPermission } from '../../utils/browserNotifications';

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
    const [healthStatus, setHealthStatus] = useState(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthLastChecked, setHealthLastChecked] = useState(null);
    const [notificationPermission, setNotificationPermission] = useState('default');
    const [notificationEnabled, setNotificationEnabled] = useState(false);
    const [notificationLoading, setNotificationLoading] = useState(false);

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

    const checkAPIHealth = async () => {
        setHealthLoading(true);
        try {
            const response = await healthAPI.checkHealth();
            setHealthStatus(response.data || response);
            setHealthLastChecked(new Date());
        } catch (error) {
            console.error('Error checking API health:', error);
            setHealthStatus({
                overall: 'error',
                error: error.message || 'Failed to check API health'
            });
            setHealthLastChecked(new Date());
        } finally {
            setHealthLoading(false);
        }
    };

    useEffect(() => {
        // Auto-check health on mount
        checkAPIHealth();
        
        // Check notification permission status
        const checkNotificationStatus = () => {
            try {
                const permission = getNotificationPermission();
                console.log('Notification permission status:', permission);
                setNotificationPermission(permission);
                setNotificationEnabled(isNotificationEnabled());
            } catch (error) {
                console.error('Error checking notification status:', error);
                setNotificationPermission('unsupported');
                setNotificationEnabled(false);
            }
        };
        
        checkNotificationStatus();
        
        // Listen for permission changes
        if ('Notification' in window) {
            // Check periodically (some browsers don't fire events for permission changes)
            const interval = setInterval(checkNotificationStatus, 2000);
            return () => clearInterval(interval);
        } else {
            setNotificationPermission('unsupported');
            setNotificationEnabled(false);
        }
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'operational':
            case 'healthy':
                return <CheckCircle size={20} style={{ color: '#10b981' }} />;
            case 'degraded':
                return <AlertTriangle size={20} style={{ color: '#f59e0b' }} />;
            case 'error':
            case 'unhealthy':
                return <X size={20} style={{ color: '#ef4444' }} />;
            case 'not_configured':
                return <AlertCircle size={20} style={{ color: '#6b7280' }} />;
            default:
                return <Clock size={20} style={{ color: '#6b7280' }} />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'operational':
            case 'healthy':
                return '#10b981';
            case 'degraded':
                return '#f59e0b';
            case 'error':
            case 'unhealthy':
                return '#ef4444';
            case 'not_configured':
                return '#6b7280';
            default:
                return '#6b7280';
        }
    };

    const getServiceIcon = (serviceName) => {
        const name = serviceName.toLowerCase();
        if (name.includes('email')) return <Mail size={18} />;
        if (name.includes('whatsapp')) return <MessageCircle size={18} />;
        if (name.includes('storage')) return <Database size={18} />;
        if (name.includes('firestore')) return <Database size={18} />;
        if (name.includes('webhook')) return <Webhook size={18} />;
        return <Server size={18} />;
    };

    // Debug: Log notification state
    console.log('SettingsView render - notificationPermission:', notificationPermission, 'notificationEnabled:', notificationEnabled);

    return (
        <div className="settings-view">
            {/* API Health Section */}
            <div className="card api-health-card">
                <div className="card-header">
                    <div className="section-header">
                        <div className="section-icon">
                            <Heart size={24} />
                        </div>
                        <div>
                            <h3 className="card-title">API Health</h3>
                            <p className="card-description">Monitor the health and status of all integrated APIs and services</p>
                        </div>
                    </div>
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={checkAPIHealth}
                        disabled={healthLoading}
                    >
                        {healthLoading ? (
                            <>
                                <RefreshCw size={16} className="spinning" />
                                <span>Checking...</span>
                            </>
                        ) : (
                            <>
                                <RefreshCw size={16} />
                                <span>Refresh</span>
                            </>
                        )}
                    </button>
                </div>
                <div className="card-body">
                    {healthStatus && (
                        <>
                            {/* Overall Status */}
                            <div className="health-overall-status" style={{
                                padding: '16px',
                                borderRadius: '8px',
                                backgroundColor: healthStatus.overall === 'healthy' ? 'rgba(16, 185, 129, 0.1)' :
                                                healthStatus.overall === 'degraded' ? 'rgba(245, 158, 11, 0.1)' :
                                                'rgba(239, 68, 68, 0.1)',
                                border: `2px solid ${getStatusColor(healthStatus.overall)}`,
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {getStatusIcon(healthStatus.overall)}
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '1rem', color: '#111827' }}>
                                            Overall Status: <span style={{ color: getStatusColor(healthStatus.overall), textTransform: 'capitalize' }}>
                                                {healthStatus.overall}
                                            </span>
                                        </div>
                                        {healthLastChecked && (
                                            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                                                Last checked: {formatDateTime(healthLastChecked)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Services Grid */}
                            <div className="health-services-grid" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '16px'
                            }}>
                                {healthStatus.services && Object.entries(healthStatus.services).map(([key, service]) => (
                                    <div key={key} className="health-service-card" style={{
                                        padding: '16px',
                                        borderRadius: '8px',
                                        border: `2px solid ${getStatusColor(service.status)}40`,
                                        backgroundColor: service.status === 'operational' ? 'rgba(16, 185, 129, 0.05)' :
                                                        service.status === 'degraded' ? 'rgba(245, 158, 11, 0.05)' :
                                                        service.status === 'error' ? 'rgba(239, 68, 68, 0.05)' :
                                                        'rgba(107, 114, 128, 0.05)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {getServiceIcon(service.service || key)}
                                                <span style={{ fontWeight: '600', fontSize: '0.9375rem', color: '#111827' }}>
                                                    {service.service || key.charAt(0).toUpperCase() + key.slice(1)}
                                                </span>
                                            </div>
                                            {getStatusIcon(service.status)}
                                        </div>
                                        
                                        <div style={{ marginBottom: '8px' }}>
                                            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '4px' }}>Status</div>
                                            <div style={{ 
                                                fontSize: '0.875rem', 
                                                fontWeight: '600',
                                                color: getStatusColor(service.status),
                                                textTransform: 'capitalize'
                                            }}>
                                                {service.status.replace('_', ' ')}
                                            </div>
                                        </div>

                                        {service.configured !== undefined && (
                                            <div style={{ marginBottom: '8px' }}>
                                                <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginBottom: '4px' }}>Configured</div>
                                                <div style={{ 
                                                    fontSize: '0.875rem',
                                                    color: service.configured ? '#10b981' : '#6b7280',
                                                    fontWeight: '500'
                                                }}>
                                                    {service.configured ? 'Yes' : 'No'}
                                                </div>
                                            </div>
                                        )}

                                        {service.details && (
                                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                                    {service.details.message || service.details.error || 'No details available'}
                                                </div>
                                            </div>
                                        )}

                                        {service.error && (
                                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
                                                    Error: {service.error}
                                                </div>
                                            </div>
                                        )}

                                        {service.endpoint && (
                                            <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#6b7280' }}>
                                                <code style={{ backgroundColor: '#f3f4f6', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {service.endpoint}
                                                </code>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {healthStatus.error && (
                                <div style={{
                                    marginTop: '16px',
                                    padding: '12px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '8px',
                                    border: '1px solid #ef4444',
                                    color: '#ef4444'
                                }}>
                                    <strong>Error:</strong> {healthStatus.error}
                                </div>
                            )}
                        </>
                    )}

                    {!healthStatus && !healthLoading && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            Click "Refresh" to check API health status
                        </div>
                    )}
                </div>
            </div>

            {/* Browser Notifications Section */}
            <div className="card api-health-card" style={{ display: 'block' }}>
                <div className="card-header">
                    <div className="section-header">
                        <div className="section-icon">
                            <Bell size={24} />
                        </div>
                        <div>
                            <h3 className="card-title">Browser Notifications</h3>
                            <p className="card-description">Enable browser notifications to receive alerts for new notifications and important updates</p>
                        </div>
                    </div>
                </div>
                <div className="card-body">
                    <div className="webhook-connection-section">
                        <div className="webhook-connection-status-card">
                            <div className="status-header">
                                <div className="status-icon-wrapper">
                                    {notificationLoading && <RefreshCw size={24} className="spinning" />}
                                    {notificationEnabled && !notificationLoading && <CheckCircle size={24} style={{ color: '#10b981' }} />}
                                    {notificationPermission === 'denied' && !notificationLoading && <X size={24} style={{ color: '#ef4444' }} />}
                                    {notificationPermission === 'default' && !notificationLoading && <AlertCircle size={24} style={{ color: '#f59e0b' }} />}
                                    {notificationPermission === 'unsupported' && !notificationLoading && <AlertTriangle size={24} style={{ color: '#6b7280' }} />}
                                </div>
                                <div className="status-content">
                                    <span className="status-label">Notification Status</span>
                                    <span className={`status-value ${notificationEnabled ? 'connected' : notificationPermission === 'denied' ? 'error' : 'not-checked'}`}>
                                        {notificationLoading && 'Checking...'}
                                        {!notificationLoading && notificationEnabled && 'Enabled'}
                                        {!notificationLoading && notificationPermission === 'denied' && 'Denied'}
                                        {!notificationLoading && notificationPermission === 'default' && 'Not Enabled'}
                                        {!notificationLoading && notificationPermission === 'unsupported' && 'Not Supported'}
                                    </span>
                                </div>
                            </div>
                            <div className="status-meta">
                                <Clock size={14} />
                                <span>
                                    {notificationPermission === 'granted' && 'Notifications are enabled and ready'}
                                    {notificationPermission === 'denied' && 'Notifications are blocked. Please enable in browser settings.'}
                                    {notificationPermission === 'default' && 'Click "Enable Notifications" to allow browser notifications'}
                                    {notificationPermission === 'unsupported' && 'Your browser does not support notifications'}
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="webhook-connection-actions-enhanced">
                            {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
                                <button
                                    className="btn btn-primary btn-enhanced"
                                    onClick={async () => {
                                        setNotificationLoading(true);
                                        try {
                                            const permission = await requestNotificationPermission();
                                            setNotificationPermission(permission);
                                            setNotificationEnabled(permission === 'granted');
                                            
                                            if (permission === 'granted') {
                                                // Show a test notification
                                                if ('Notification' in window && Notification.permission === 'granted') {
                                                    new Notification('Notifications Enabled!', {
                                                        body: 'You will now receive browser notifications for new alerts.',
                                                        icon: '/favicon.ico',
                                                        tag: 'notification-enabled'
                                                    });
                                                }
                                            } else if (permission === 'denied') {
                                                alert('Notifications were denied. Please enable them in your browser settings:\n\nChrome/Edge: Settings → Privacy → Site Settings → Notifications\nFirefox: Preferences → Privacy & Security → Permissions → Notifications\nSafari: Preferences → Websites → Notifications');
                                            }
                                        } catch (error) {
                                            console.error('Error requesting notification permission:', error);
                                            alert('Failed to enable notifications. Please try again.');
                                        } finally {
                                            setNotificationLoading(false);
                                        }
                                    }}
                                    disabled={notificationLoading || notificationPermission === 'denied'}
                                >
                                    {notificationLoading ? (
                                        <>
                                            <RefreshCw size={18} className="spinning" />
                                            <span>Enabling...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Bell size={18} />
                                            <span>Enable Notifications</span>
                                        </>
                                    )}
                                </button>
                            )}

                            {notificationEnabled && (
                                <button
                                    className="btn btn-outline btn-enhanced"
                                    onClick={() => {
                                        setNotificationPermission(getNotificationPermission());
                                        setNotificationEnabled(isNotificationEnabled());
                                    }}
                                    disabled={notificationLoading}
                                >
                                    <RefreshCw size={18} />
                                    <span>Refresh Status</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Status Messages */}
                    {notificationEnabled && (
                        <div className="webhook-status-message success">
                            <div className="message-icon">
                                <CheckCircle size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Browser notifications are enabled!</strong>
                                <p>You will receive browser notifications for new alerts and important updates. Notifications will appear even when the app is in the background.</p>
                            </div>
                        </div>
                    )}

                    {notificationPermission === 'denied' && (
                        <div className="webhook-status-message error">
                            <div className="message-icon">
                                <X size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Notifications are blocked</strong>
                                <p>To enable notifications, please update your browser settings:</p>
                                <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '0.875rem' }}>
                                    <li><strong>Chrome/Edge:</strong> Settings → Privacy → Site Settings → Notifications</li>
                                    <li><strong>Firefox:</strong> Preferences → Privacy & Security → Permissions → Notifications</li>
                                    <li><strong>Safari:</strong> Preferences → Websites → Notifications</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {notificationPermission === 'default' && !notificationLoading && (
                        <div className="webhook-status-message warning">
                            <div className="message-icon">
                                <AlertCircle size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Notifications not enabled</strong>
                                <p>Enable browser notifications to receive real-time alerts for new notifications, campaign updates, and important system messages.</p>
                            </div>
                        </div>
                    )}

                    {notificationPermission === 'unsupported' && (
                        <div className="webhook-status-message warning">
                            <div className="message-icon">
                                <AlertTriangle size={24} />
                            </div>
                            <div className="message-content">
                                <strong>Notifications not supported</strong>
                                <p>Your browser does not support the Notifications API. Please use a modern browser like Chrome, Firefox, Safari, or Edge to enable notifications.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

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
