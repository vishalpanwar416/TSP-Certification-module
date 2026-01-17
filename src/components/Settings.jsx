import { useState, useEffect } from 'react';
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

function Settings() {
    const [loading, setLoading] = useState(false);
    const [pipelineEnabled, setPipelineEnabled] = useState(false);
    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [webhookConnectionStatus, setWebhookConnectionStatus] = useState(null); // null, 'checking', 'connected', 'disconnected', 'error'
    const [webhookLastChecked, setWebhookLastChecked] = useState(null);

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
