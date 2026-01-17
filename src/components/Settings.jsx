import { useState, useEffect, useCallback } from 'react';
import {
    Settings as SettingsIcon,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    Youtube,
    MessageCircle,
    Webhook,
    CheckCircle,
    AlertCircle,
    X,
    Clock,
    Activity,
    Zap,
    RefreshCw
} from 'lucide-react';
import SettingsView from './social-media/SettingsView';
import { healthAPI } from '../services/marketingService';
import { formatDateTime } from './marketing-views/utils';

function Settings() {
    const [loading, setLoading] = useState(false);
    const [pipelineEnabled, setPipelineEnabled] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [webhookConnectionStatus, setWebhookConnectionStatus] = useState(null); // null, 'checking', 'connected', 'disconnected', 'error'
    const [webhookLastChecked, setWebhookLastChecked] = useState(null);
    const [healthStatus, setHealthStatus] = useState(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthLastChecked, setHealthLastChecked] = useState(null);

    const platforms = [
        { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2', connected: true, charLimit: 5000, optimalLength: 250 },
        { id: 'twitter', name: 'X', icon: Twitter, color: '#000000', connected: true, charLimit: 280, optimalLength: 240 },
        { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E4405F', connected: true, charLimit: 2200, optimalLength: 150 },
        { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: '#0077B5', connected: true, charLimit: 3000, optimalLength: 150 },
        { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: '#25D366', connected: true, charLimit: 4096, optimalLength: 200 },
        { id: 'youtube', name: 'YouTube', icon: Youtube, color: '#FF0000', connected: false, charLimit: 5000, optimalLength: 200 }
    ];

    // Initialize webhook URL and secret
    useEffect(() => {
        const baseUrl = window.location.origin;
        setWebhookUrl(`${baseUrl}/api/webhooks/social-media`);
        setWebhookSecret('whsec_' + Math.random().toString(36).substring(2, 15));
    }, []);

    // Check API Health function
    const checkAPIHealth = useCallback(async () => {
        setHealthLoading(true);
        try {
            console.log('[API Health] Checking API health...');
            const response = await healthAPI.checkHealth();
            console.log('[API Health] Response:', response);
            setHealthStatus(response.data || response);
            setHealthLastChecked(new Date());
        } catch (error) {
            console.error('[API Health] Error checking API health:', error);
            setHealthStatus({
                overall: 'error',
                error: error.message || 'Failed to check API health'
            });
            setHealthLastChecked(new Date());
        } finally {
            setHealthLoading(false);
        }
    }, []);

    // Auto-check API health when Settings component mounts
    useEffect(() => {
        checkAPIHealth();
    }, [checkAPIHealth]);

    // Helper functions for API Health Status
    const getStatusIcon = (status) => {
        switch (status) {
            case 'operational':
            case 'healthy':
                return <CheckCircle size={20} style={{ color: '#10b981' }} />;
            case 'degraded':
                return <AlertCircle size={20} style={{ color: '#f59e0b' }} />;
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

    const checkWebhookConnection = async () => {
        setWebhookConnectionStatus('checking');
        setLoading(true);
        
        try {
            // TODO: Replace with actual API call to test webhook connection
            // const response = await socialMediaAPI.testWebhookConnection();
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate success (in real implementation, check actual response)
            const isConnected = pipelineEnabled; // Check if pipeline is enabled
            setWebhookConnectionStatus(isConnected ? 'connected' : 'disconnected');
            setWebhookLastChecked(new Date());
            
            if (isConnected) {
                alert('Webhook connection is active and working!');
            } else {
                alert('Webhook connection is inactive. Please enable the pipeline first.');
            }
        } catch (error) {
            console.error('Error checking webhook connection:', error);
            setWebhookConnectionStatus('error');
            setWebhookLastChecked(new Date());
            alert('Failed to check webhook connection. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const sendTestWebhook = async () => {
        if (!pipelineEnabled) {
            alert('Please enable the pipeline first before sending a test webhook.');
            return;
        }

        setLoading(true);
        try {
            // Send test property listing webhook
            const testProperty = {
                type: 'property_listing',
                property: {
                    id: 'test_property_' + Date.now(),
                    title: 'Luxury 3BHK Apartment',
                    location: 'Mumbai, Maharashtra',
                    price: '₹2.5 Crores',
                    area: '1500 sq ft',
                    bedrooms: 3,
                    bathrooms: 2,
                    description: 'Beautiful modern apartment with premium amenities in prime location. Perfect for families looking for a comfortable living space.',
                    imageUrl: null,
                    propertyUrl: 'https://example.com/property/test',
                    reraNumber: 'RERA/123/2024',
                    amenities: ['Parking', 'Gym', 'Swimming Pool', 'Security', 'Lift']
                },
                platforms: ['facebook', 'twitter', 'instagram', 'linkedin'],
                postImmediately: true
            };

            // TODO: Replace with actual API call
            // const response = await fetch(`${window.location.origin}/api/webhooks/social-media`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(testProperty)
            // });
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            alert('Test property webhook sent successfully! Check the Social Media Pipeline tab to see the property post.');
        } catch (error) {
            console.error('Error sending test webhook:', error);
            alert('Failed to send test webhook. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleConnectPlatform = (platformId) => {
        // TODO: Implement connect
        alert(`Connect ${platformId} - API integration needed`);
    };

    const handleDisconnectPlatform = (platformId) => {
        // TODO: Implement disconnect
        alert(`Disconnect ${platformId} - API integration needed`);
    };

    const handleTogglePipeline = async () => {
        const newStatus = !pipelineEnabled;
        setLoading(true);
        try {
            // TODO: Replace with actual API call
            // await socialMediaAPI.togglePipeline(newStatus);
            
            setPipelineEnabled(newStatus);
            alert(newStatus ? 'Automation Pipeline enabled successfully!' : 'Automation Pipeline disabled.');
        } catch (error) {
            console.error('Error toggling pipeline:', error);
            alert('Failed to toggle pipeline. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="card">
                <div className="card-header">
                    <div className="card-header-left">
                        <h2 className="card-title">
                            <SettingsIcon size={24} />
                            Settings
                        </h2>
                        <p className="card-description">
                            Manage your application settings and integrations
                        </p>
                    </div>
                </div>
            </div>

            <div className="settings-content">
                {/* API Health Card */}
                <div style={{ 
                    marginBottom: '24px', 
                    backgroundColor: '#ffffff', 
                    border: '2px solid #d32f2f',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    minHeight: '300px',
                    padding: '24px'
                }}>
                    <div style={{ 
                        marginBottom: '1.5rem',
                        paddingBottom: '1.5rem',
                        borderBottom: '2px solid #e5e7eb'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <h3 style={{ 
                                    fontSize: '1.75rem', 
                                    fontWeight: 700, 
                                    color: '#111827', 
                                    marginBottom: '0.5rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.75rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    <Activity size={32} style={{ color: '#d32f2f' }} />
                                    API Health Status
                                </h3>
                                <p style={{ fontSize: '1rem', color: '#6b7280', margin: 0, lineHeight: '1.5', fontWeight: 500 }}>
                                    Monitor the health and status of all integrated APIs and services
                                </p>
                            </div>
                            <button
                                className="btn btn-outline"
                                onClick={checkAPIHealth}
                                disabled={healthLoading}
                                style={{ minWidth: '120px' }}
                            >
                                {healthLoading ? (
                                    <>
                                        <RefreshCw size={18} className="spinning" />
                                        <span>Checking...</span>
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw size={18} />
                                        <span>Refresh</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {healthStatus && (
                        <>
                            {/* Overall Status */}
                            <div style={{
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
                            {healthStatus.services && Object.keys(healthStatus.services).length > 0 && (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '16px'
                                }}>
                                    {Object.entries(healthStatus.services).map(([key, service]) => (
                                        <div key={key} style={{
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
                                        </div>
                                    ))}
                                </div>
                            )}

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
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '60px 40px', 
                            color: '#6b7280',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '2px dashed #d1d5db'
                        }}>
                            <Activity size={48} style={{ marginBottom: '16px', opacity: 0.5, color: '#d32f2f' }} />
                            <p style={{ margin: '8px 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>API Health Check</p>
                            <p style={{ margin: '4px 0', fontSize: '0.875rem', color: '#6b7280' }}>Click "Refresh" to check the health status of all integrated APIs and services</p>
                            <button
                                className="btn btn-primary"
                                onClick={checkAPIHealth}
                                style={{ marginTop: '20px' }}
                            >
                                <RefreshCw size={18} />
                                Check API Health
                            </button>
                        </div>
                    )}

                    {healthLoading && (
                        <div style={{ 
                            textAlign: 'center', 
                            padding: '60px 40px', 
                            color: '#6b7280',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '2px dashed #d1d5db'
                        }}>
                            <Activity size={48} className="spinning" style={{ marginBottom: '16px', opacity: 0.5, color: '#d32f2f' }} />
                            <p style={{ margin: '8px 0', fontSize: '1.125rem', fontWeight: 600, color: '#111827' }}>Checking API Health...</p>
                            <p style={{ margin: '4px 0', fontSize: '0.875rem', color: '#6b7280' }}>Please wait while we check the status of all integrated APIs and services</p>
                        </div>
                    )}
                </div>

                <SettingsView
                    webhookConnectionStatus={webhookConnectionStatus}
                    webhookLastChecked={webhookLastChecked}
                    webhookUrl={webhookUrl}
                    pipelineEnabled={pipelineEnabled}
                    onCheckConnection={checkWebhookConnection}
                    onSendTestWebhook={sendTestWebhook}
                    platforms={platforms}
                    onConnectPlatform={handleConnectPlatform}
                    onDisconnectPlatform={handleDisconnectPlatform}
                    loading={loading}
                />
            </div>
        </div>
    );
}

export default Settings;
