import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from './Dashboard';

function DashboardLayout() {
    const [activeTab, setActiveTab] = useState('certificates');

    const getPageTitle = () => {
        switch (activeTab) {
            case 'dashboard':
                return { title: 'Dashboard Overview', subtitle: 'Welcome back! Here\'s what\'s happening' };
            case 'certificates':
                return { title: 'Certificate Management', subtitle: 'Create, manage, and send certificates' };
            case 'send':
                return { title: 'Send Certificates', subtitle: 'Send certificates via WhatsApp' };
            case 'analytics':
                return { title: 'Analytics', subtitle: 'Track your certificate statistics' };
            case 'recipients':
                return { title: 'Recipients', subtitle: 'Manage your recipient list' };
            case 'settings':
                return { title: 'Settings', subtitle: 'Configure your preferences' };
            default:
                return { title: 'Certificate Sender', subtitle: 'Manage your certificates' };
        }
    };

    const pageInfo = getPageTitle();

    return (
        <div className="dashboard-layout">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            <div className="main-content">
                <Header title={pageInfo.title} subtitle={pageInfo.subtitle} />

                <div className="content-area">
                    {activeTab === 'certificates' && <Dashboard />}
                    {activeTab === 'dashboard' && (
                        <div className="placeholder-content">
                            <h2>Dashboard Overview</h2>
                            <p>Dashboard statistics and charts will appear here</p>
                        </div>
                    )}
                    {activeTab === 'send' && (
                        <div className="placeholder-content">
                            <h2>Bulk Send</h2>
                            <p>Bulk WhatsApp sending interface will appear here</p>
                        </div>
                    )}
                    {activeTab === 'analytics' && (
                        <div className="placeholder-content">
                            <h2>Analytics & Reports</h2>
                            <p>Charts and analytics will appear here</p>
                        </div>
                    )}
                    {activeTab === 'recipients' && (
                        <div className="placeholder-content">
                            <h2>Recipients Management</h2>
                            <p>Recipient list and management tools will appear here</p>
                        </div>
                    )}
                    {activeTab === 'settings' && (
                        <div className="placeholder-content">
                            <h2>Application Settings</h2>
                            <p>Settings and configuration options will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DashboardLayout;
